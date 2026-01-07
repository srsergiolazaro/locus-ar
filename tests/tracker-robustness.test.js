import { describe, it, expect, beforeAll } from 'vitest';
import { Controller } from '../src/runtime/controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { DetectorLite } from '../src/core/detector/detector-lite.js';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.join(__dirname, 'assets');
const ROBUSTNESS_DIR = path.join(__dirname, 'robustness-images');
const TEST_IMAGE_PATH = path.join(ASSETS_DIR, 'test-image.png');

const CONFIG = {
    MIN_INLIERS_PASS: 30, // Reducido un poco para ser justo con resoluciones pequeñas
    MIN_INLIERS_LOW: 15,
};

describe('Tracker Robustness Evaluation (via Controller)', () => {
    let taarBuffer;

    beforeAll(async () => {
        console.log('🔨 Compiling reference target...');
        const baseImage = await Jimp.read(TEST_IMAGE_PATH);
        const compiler = new OfflineCompiler();
        await compiler.compileImageTargets([{
            width: baseImage.bitmap.width,
            height: baseImage.bitmap.height,
            data: baseImage.bitmap.data
        }], () => { });

        taarBuffer = compiler.exportData();
        console.log('✅ Target compiled and ready.');
    }, 60000);

    // Scan all resolutions
    if (!fs.existsSync(ROBUSTNESS_DIR)) {
        it('should have robustness images generated', () => {
            throw new Error('Robustness directory not found. Run node tests/generate-robustness-images.js first.');
        });
        return;
    }

    const resolutions = fs.readdirSync(ROBUSTNESS_DIR).filter(d =>
        fs.statSync(path.join(ROBUSTNESS_DIR, d)).isDirectory() && d !== 'custom'
    );

    resolutions.forEach(res => {
        describe(`Resolution: ${res}`, () => {
            const resPath = path.join(ROBUSTNESS_DIR, res);
            const testImages = fs.readdirSync(resPath).filter(f => f.endsWith('.png'));

            testImages.forEach(filename => {
                it(`should detect and match ${filename}`, async () => {
                    const imgPath = path.join(resPath, filename);
                    const image = await Jimp.read(imgPath);
                    const { width, height } = image.bitmap;

                    // 1. Setup Controller for this specific resolution
                    const controller = new Controller({
                        inputWidth: width,
                        inputHeight: height,
                        debugMode: true // To get inliers info
                    });

                    // 2. Load compiled target
                    controller.addImageTargetsFromBuffers([taarBuffer]);

                    // 3. Process image (Detect + Match)
                    // We use DetectorLite directly for FULL image detection (not cropped)
                    const inputData = new Uint8Array(width * height);
                    const rgbaData = image.bitmap.data;
                    image.greyscale();
                    for (let i = 0; i < width * height; i++) {
                        inputData[i] = rgbaData[i * 4];
                    }

                    // Perform FULL detection
                    const detector = new DetectorLite(width, height, { useLSH: true });
                    const { featurePoints } = detector.detect(inputData);
                    const featuresCount = featurePoints?.length || 0;
                    // Perform matching (targetIndex 0 since we only compiled one)
                    const matchResult = await controller.match(featurePoints, 0);

                    const inliers = matchResult.screenCoords?.length || 0;
                    const status = inliers >= CONFIG.MIN_INLIERS_PASS ? 'PASS' :
                        (inliers >= CONFIG.MIN_INLIERS_LOW ? 'LOW' : 'FAIL');

                    // ONLY log if it's not a clear pass or if debug is needed
                    if (status !== 'PASS') {
                        console.log(`[${res}] ${filename.padEnd(20)} | Features: ${featuresCount} | Inliers: ${inliers} | Status: ${status} ❌`);
                    } else if (featuresCount < 50) {
                        // Warn if detection is fragile even if it passed
                        console.log(`[${res}] ${filename.padEnd(20)} | Features: ${featuresCount} | Inliers: ${inliers} | Status: ${status} ⚠️ (Fragile)`);
                    }

                    // Strict expect for correctness
                    if (matchResult.targetIndex !== 0) {
                        // console.error(`FAILED MATCH: [${res}] ${filename} -> Index ${matchResult.targetIndex}`);
                    }
                    expect(matchResult.targetIndex).toBe(0);
                    expect(inliers).toBeGreaterThanOrEqual(10);
                }, 20000);
            });
        });
    });

    // Special case for custom images
    const customPath = path.join(ROBUSTNESS_DIR, 'custom');
    if (fs.existsSync(customPath)) {
        const customFiles = fs.readdirSync(customPath).filter(f => f.endsWith('.png'));
        if (customFiles.length > 0) {
            describe('Custom User Images', () => {
                customFiles.forEach(filename => {
                    it(`testing custom ${filename}`, async () => {
                        const imgPath = path.join(customPath, filename);
                        const image = await Jimp.read(imgPath);
                        const { width, height } = image.bitmap;

                        const controller = new Controller({ inputWidth: width, inputHeight: height });
                        controller.addImageTargetsFromBuffers([taarBuffer]);

                        const inputData = new Uint8Array(width * height);
                        image.greyscale();
                        for (let i = 0; i < width * height; i++) inputData[i] = image.bitmap.data[i * 4];

                        const { featurePoints } = await controller.detect(inputData);
                        const matchResult = await controller.match(featurePoints, 0);

                        console.log(`[custom] ${filename.padEnd(20)} | Matched: ${matchResult.targetIndex !== -1}`);
                        expect(matchResult.targetIndex).toBe(0);
                    });
                });
            });
        }
    }
});
