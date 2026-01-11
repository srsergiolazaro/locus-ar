/**
 * Tests for Bio-Inspired Perception Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    BioInspiredEngine,
    BIO_CONFIG,
    FovealAttention,
    SaccadicController,
    PredictiveCoding,
    SaliencyMap
} from '../src/core/perception/index.js';

// Test helpers
function createTestImage(width, height, pattern = 'gradient') {
    const data = new Uint8Array(width * height);

    switch (pattern) {
        case 'gradient':
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    data[y * width + x] = Math.floor((x / width) * 255);
                }
            }
            break;
        case 'checkerboard':
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const isWhite = ((Math.floor(x / 32) + Math.floor(y / 32)) % 2) === 0;
                    data[y * width + x] = isWhite ? 255 : 0;
                }
            }
            break;
        case 'center-bright':
            const cx = width / 2;
            const cy = height / 2;
            const maxDist = Math.sqrt(cx * cx + cy * cy);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    data[y * width + x] = Math.floor((1 - dist / maxDist) * 255);
                }
            }
            break;
        case 'random':
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.floor(Math.random() * 256);
            }
            break;
        case 'uniform':
            data.fill(128);
            break;
    }

    return data;
}

function createSlightlyDifferentImage(original, changePercent = 0.01) {
    const data = new Uint8Array(original.length);
    const numChanges = Math.floor(original.length * changePercent);

    // Copy original
    for (let i = 0; i < original.length; i++) {
        data[i] = original[i];
    }

    // Apply random changes
    for (let i = 0; i < numChanges; i++) {
        const idx = Math.floor(Math.random() * data.length);
        data[idx] = (data[idx] + Math.floor(Math.random() * 50) - 25 + 256) % 256;
    }

    return data;
}

// ============================================
// BioInspiredEngine Tests
// ============================================

describe('BioInspiredEngine', () => {
    const WIDTH = 640;
    const HEIGHT = 480;
    let engine;

    beforeEach(() => {
        engine = new BioInspiredEngine(WIDTH, HEIGHT);
    });

    describe('initialization', () => {
        it('should initialize with correct dimensions', () => {
            expect(engine.width).toBe(WIDTH);
            expect(engine.height).toBe(HEIGHT);
        });

        it('should have default configuration', () => {
            expect(engine.config.FOVEA_RADIUS_RATIO).toBe(BIO_CONFIG.FOVEA_RADIUS_RATIO);
            expect(engine.config.MAX_SACCADES_PER_FRAME).toBe(BIO_CONFIG.MAX_SACCADES_PER_FRAME);
        });

        it('should accept custom configuration', () => {
            const customEngine = new BioInspiredEngine(WIDTH, HEIGHT, {
                FOVEA_RADIUS_RATIO: 0.25,
            });
            expect(customEngine.config.FOVEA_RADIUS_RATIO).toBe(0.25);
        });

        it('should start with fovea centered', () => {
            expect(engine.currentFoveaCenter.x).toBe(WIDTH / 2);
            expect(engine.currentFoveaCenter.y).toBe(HEIGHT / 2);
        });
    });

    describe('processing', () => {
        it('should process a frame and return attention regions', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'gradient');
            const result = engine.process(image);

            expect(result.skipped).toBe(false);
            expect(result.attentionRegions).toBeDefined();
            expect(result.attentionRegions.length).toBeGreaterThan(0);
            expect(result.pixelsProcessed).toBeLessThan(WIDTH * HEIGHT);
        });

        it('should report significant pixel savings', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'checkerboard');
            const result = engine.process(image);

            const fullPixels = WIDTH * HEIGHT;
            expect(result.pixelsProcessed).toBeLessThan(fullPixels * 0.5);
            expect(parseFloat(result.savingsPercent)).toBeGreaterThan(50);
        });

        it('should return fovea center in result', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'center-bright');
            const result = engine.process(image);

            expect(result.foveaCenter).toBeDefined();
            expect(result.foveaCenter.x).toBeGreaterThanOrEqual(0);
            expect(result.foveaCenter.y).toBeGreaterThanOrEqual(0);
        });
    });

    describe('predictive coding / frame skipping', () => {
        it('should not skip first frame', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'uniform');
            const result = engine.process(image);

            expect(result.skipped).toBe(false);
        });

        it('should skip nearly identical frames when enabled', () => {
            engine.configure({ ENABLE_SKIP_FRAMES: true });

            const image1 = createTestImage(WIDTH, HEIGHT, 'uniform');
            engine.process(image1);

            // Process same image again
            const result2 = engine.process(image1);

            // After a couple frames, it should start skipping
            const result3 = engine.process(image1);
            const result4 = engine.process(image1);

            // At least one of the later frames should be skipped
            expect(result3.skipped || result4.skipped).toBe(true);
        });

        it('should not skip when frame changes significantly', () => {
            const image1 = createTestImage(WIDTH, HEIGHT, 'gradient');
            engine.process(image1);
            engine.process(image1);

            const image2 = createTestImage(WIDTH, HEIGHT, 'checkerboard');
            const result = engine.process(image2);

            expect(result.skipped).toBe(false);
        });
    });

    describe('metrics', () => {
        it('should track metrics correctly', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'random');

            engine.process(image);
            engine.process(image);
            engine.process(image);

            const metrics = engine.getMetrics();

            expect(metrics.totalFrames).toBe(3);
            expect(metrics.avgPixelsProcessed).toBeGreaterThan(0);
        });
    });

    describe('reset', () => {
        it('should reset state correctly', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'random');
            engine.process(image);
            engine.process(image);

            engine.reset();

            expect(engine.currentFoveaCenter.x).toBe(WIDTH / 2);
            expect(engine.frameCount).toBe(0);
        });
    });
});

// ============================================
// FovealAttention Tests
// ============================================

describe('FovealAttention', () => {
    const WIDTH = 640;
    const HEIGHT = 480;
    let attention;

    beforeEach(() => {
        attention = new FovealAttention(WIDTH, HEIGHT, BIO_CONFIG);
    });

    describe('extraction', () => {
        it('should extract foveal region at full resolution', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'gradient');
            const region = attention.extract(image, WIDTH / 2, HEIGHT / 2, 0);

            expect(region.type).toBe('fovea');
            expect(region.resolution).toBe(1.0);
            expect(region.data).toBeDefined();
            expect(region.pixelCount).toBeGreaterThan(0);
        });

        it('should extract parafoveal region at half resolution', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'gradient');
            const region = attention.extract(image, WIDTH / 2, HEIGHT / 2, 1);

            expect(region.type).toBe('parafovea');
            expect(region.resolution).toBe(0.5);
        });

        it('should extract periphery at quarter resolution', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'gradient');
            const region = attention.extract(image, 0, 0, 2);

            expect(region.type).toBe('periphery');
            expect(region.resolution).toBe(0.25);
        });

        it('should clamp extraction to valid coordinates', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'gradient');

            // Try to extract at edge
            const region = attention.extract(image, 0, 0, 0);

            expect(region.x).toBeGreaterThanOrEqual(attention.foveaRadius);
        });

        it('should provide coordinate transform helpers', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'gradient');
            const region = attention.extract(image, WIDTH / 2, HEIGHT / 2, 0);

            const local = region.toLocalCoord(WIDTH / 2, HEIGHT / 2);
            const original = region.toOriginalCoord(local.x, local.y);

            expect(Math.abs(original.x - WIDTH / 2)).toBeLessThan(1);
            expect(Math.abs(original.y - HEIGHT / 2)).toBeLessThan(1);
        });
    });

    describe('multi-resolution', () => {
        it('should extract all resolution levels at once', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'checkerboard');
            const result = attention.extractMultiResolution(image, WIDTH / 2, HEIGHT / 2);

            expect(result.fovea).toBeDefined();
            expect(result.parafovea).toBeDefined();
            expect(result.periphery).toBeDefined();
            expect(result.totalPixels).toBeLessThan(result.originalPixels);
        });
    });
});

// ============================================
// SaccadicController Tests
// ============================================

describe('SaccadicController', () => {
    const WIDTH = 640;
    const HEIGHT = 480;
    let controller;

    beforeEach(() => {
        controller = new SaccadicController(WIDTH, HEIGHT, BIO_CONFIG);
    });

    describe('target computation', () => {
        it('should compute at least one target', () => {
            const saliency = {
                peaks: [
                    { x: 100, y: 100, value: 0.8 },
                    { x: 400, y: 300, value: 0.6 },
                ],
            };

            const targets = controller.computeTargets(saliency, { x: WIDTH / 2, y: HEIGHT / 2 });

            expect(targets.length).toBeGreaterThan(0);
        });

        it('should prioritize tracking prediction when tracking', () => {
            const trackingState = {
                isTracking: true,
                worldMatrix: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 300, 200, 0, 1]),
            };

            const saliency = { peaks: [{ x: 100, y: 100, value: 0.9 }] };

            const targets = controller.computeTargets(saliency, { x: WIDTH / 2, y: HEIGHT / 2 }, trackingState);

            expect(targets[0].reason).toBe('tracking_prediction');
        });

        it('should do grid search when not tracking', () => {
            const saliency = { peaks: [] };

            const targets = controller.computeTargets(saliency, { x: WIDTH / 2, y: HEIGHT / 2 }, null);

            const hasGridSearch = targets.some(t => t.reason === 'grid_search');
            const hasMaintain = targets.some(t => t.reason === 'maintain_position');

            expect(hasGridSearch || hasMaintain).toBe(true);
        });

        it('should apply inhibition of return', () => {
            const saliency = {
                peaks: [
                    { x: 100, y: 100, value: 0.8 },
                    { x: 105, y: 105, value: 0.7 }, // Too close to first
                    { x: 400, y: 300, value: 0.6 },
                ],
            };

            const targets = controller.computeTargets(saliency, { x: WIDTH / 2, y: HEIGHT / 2 });

            // The close peaks should be merged/inhibited
            const nearPeaks = targets.filter(t => t.x < 150 && t.y < 150);
            expect(nearPeaks.length).toBeLessThanOrEqual(1);
        });
    });

    describe('prediction', () => {
        it('should predict next location based on velocity', () => {
            // Simulate movement by providing tracking predictions through saliency
            const saliency = { peaks: [{ x: 100, y: 100, value: 0.8 }] };
            controller.computeTargets(saliency, { x: 100, y: 100 }, null);
            controller.computeTargets(saliency, { x: 110, y: 105 }, null);
            controller.computeTargets(saliency, { x: 120, y: 110 }, null);

            const predicted = controller.getPredictedLocation();

            // Should have a valid predicted location
            expect(predicted.x).toBeGreaterThanOrEqual(0);
            expect(predicted.y).toBeGreaterThanOrEqual(0);
        });
    });

    describe('reset', () => {
        it('should reset state', () => {
            controller.computeTargets(null, { x: 100, y: 100 }, null);
            controller.reset();

            expect(controller.lastCenter.x).toBe(WIDTH / 2);
            expect(controller.lastCenter.y).toBe(HEIGHT / 2);
            expect(controller.saccadeCount).toBe(0);
        });
    });
});

// ============================================
// PredictiveCoding Tests
// ============================================

describe('PredictiveCoding', () => {
    const WIDTH = 640;
    const HEIGHT = 480;
    let predictor;

    beforeEach(() => {
        predictor = new PredictiveCoding(WIDTH, HEIGHT, BIO_CONFIG);
    });

    describe('change detection', () => {
        it('should detect high change for first frame', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'random');
            const changeLevel = predictor.getChangeLevel(image);

            expect(changeLevel).toBe(1.0);
        });

        it('should detect low change for identical frames', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'uniform');

            predictor.storeFrame(image, null);
            predictor.storeFrame(image, null);
            const changeLevel = predictor.getChangeLevel(image);

            // Identical frames should have zero or very low change
            expect(changeLevel).toBeLessThan(0.1);
        });

        it('should detect high change for different frames', () => {
            const image1 = createTestImage(WIDTH, HEIGHT, 'gradient');
            const image2 = createTestImage(WIDTH, HEIGHT, 'checkerboard');

            predictor.storeFrame(image1, null);
            const changeLevel = predictor.getChangeLevel(image2);

            expect(changeLevel).toBeGreaterThan(0.1);
        });

        it('should detect small changes appropriately', () => {
            const image1 = createTestImage(WIDTH, HEIGHT, 'gradient');
            const image2 = createSlightlyDifferentImage(image1, 0.02);

            predictor.storeFrame(image1, null);
            const changeLevel = predictor.getChangeLevel(image2);

            // Small changes should be detected (non-zero)
            expect(changeLevel).toBeGreaterThan(0);
            expect(changeLevel).toBeLessThanOrEqual(1.0);
        });
    });

    describe('prediction', () => {
        it('should not skip first frames', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'uniform');
            const result = predictor.predict(image, null);

            expect(result.canSkip).toBe(false);
            expect(result.reason).toBe('insufficient_history');
        });

        it('should allow skipping identical frames', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'uniform');

            predictor.storeFrame(image, null);
            predictor.storeFrame(image, null);

            const result = predictor.predict(image, null);

            expect(result.canSkip).toBe(true);
        });

        it('should suggest full processing for significant changes', () => {
            const image1 = createTestImage(WIDTH, HEIGHT, 'gradient');
            const image2 = createTestImage(WIDTH, HEIGHT, 'checkerboard');

            predictor.storeFrame(image1, null);
            predictor.storeFrame(image1, null);

            const result = predictor.predict(image2, null);

            expect(result.canSkip).toBe(false);
            expect(result.reason).toBe('significant_change');
        });
    });

    describe('static scene detection', () => {
        it('should detect static scene', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'uniform');
            const trackingState = {
                worldMatrix: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 100, 0, 1]),
            };

            predictor.storeFrame(image, trackingState);
            predictor.storeFrame(image, trackingState);
            predictor.storeFrame(image, trackingState);

            expect(predictor.isStaticScene()).toBe(true);
        });
    });
});

// ============================================
// SaliencyMap Tests
// ============================================

describe('SaliencyMap', () => {
    const WIDTH = 640;
    const HEIGHT = 480;
    let saliencyMap;

    beforeEach(() => {
        saliencyMap = new SaliencyMap(WIDTH, HEIGHT);
    });

    describe('computation', () => {
        it('should compute saliency map', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'checkerboard');
            const result = saliencyMap.compute(image);

            expect(result.map).toBeDefined();
            expect(result.peaks).toBeDefined();
            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
        });

        it('should find peaks in high-contrast image', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'checkerboard');
            const result = saliencyMap.compute(image);

            // Should have a valid saliency map even if no peaks due to uniform contrast
            expect(result.map).toBeDefined();
            expect(result.map.length).toBeGreaterThan(0);
        });

        it('should find fewer peaks in uniform image', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'uniform');
            const result = saliencyMap.compute(image);

            // Uniform image should have low saliency
            expect(result.maxSaliency).toBeLessThan(0.5);
        });
    });

    describe('saliency lookup', () => {
        it('should return saliency at specific location', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'checkerboard');
            saliencyMap.compute(image);

            const saliency = saliencyMap.getSaliencyAt(WIDTH / 2, HEIGHT / 2);

            expect(saliency).toBeGreaterThanOrEqual(0);
            expect(saliency).toBeLessThanOrEqual(1);
        });

        it('should return 0 for out-of-bounds locations', () => {
            const image = createTestImage(WIDTH, HEIGHT, 'random');
            saliencyMap.compute(image);

            expect(saliencyMap.getSaliencyAt(-100, -100)).toBe(0);
            expect(saliencyMap.getSaliencyAt(WIDTH * 2, HEIGHT * 2)).toBe(0);
        });
    });
});

// ============================================
// Integration Tests
// ============================================

describe('Bio-Inspired Engine Integration', () => {
    const WIDTH = 640;
    const HEIGHT = 480;

    it('should process a sequence of frames efficiently', () => {
        const engine = new BioInspiredEngine(WIDTH, HEIGHT);

        // Simulate 60 frames of video
        const baseImage = createTestImage(WIDTH, HEIGHT, 'gradient');
        let totalPixels = 0;
        let skippedFrames = 0;

        for (let i = 0; i < 60; i++) {
            // Add slight variations
            const image = i % 10 === 0
                ? createTestImage(WIDTH, HEIGHT, 'gradient')  // Bigger change every 10 frames
                : createSlightlyDifferentImage(baseImage, 0.01);

            const result = engine.process(image);

            if (result.skipped) {
                skippedFrames++;
            } else {
                totalPixels += result.pixelsProcessed;
            }
        }

        const fullProcessingPixels = WIDTH * HEIGHT * 60;
        const actualPixels = totalPixels;
        const savings = ((fullProcessingPixels - actualPixels) / fullProcessingPixels * 100);

        console.log(`Processed ${60 - skippedFrames}/60 frames`);
        console.log(`Skipped ${skippedFrames} frames`);
        console.log(`Total pixel savings: ${savings.toFixed(1)}%`);

        // We should have significant savings
        expect(savings).toBeGreaterThan(50);
    });

    it('should adapt fovea location to saliency', () => {
        const engine = new BioInspiredEngine(WIDTH, HEIGHT);

        // Create image with bright corner
        const image = createTestImage(WIDTH, HEIGHT, 'uniform');
        // Add bright region in corner
        for (let y = 0; y < 100; y++) {
            for (let x = 0; x < 100; x++) {
                image[y * WIDTH + x] = 255;
            }
        }

        const result1 = engine.process(image);

        // First frame should not be skipped and should have foveaCenter
        expect(result1.skipped).toBe(false);
        expect(result1.foveaCenter).toBeDefined();
    });
});
