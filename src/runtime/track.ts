/**
 * TapTapp AR - Easy Tracking Configuration
 * 
 * Simple API for configuring image target tracking with minimal setup.
 * Based on the reliable configuration from reliability-test.html.
 * 
 * @example
 * ```typescript
 * import { createTracker } from 'taptapp-ar';
 * 
 * const tracker = await createTracker({
 *   targetSrc: './my-target.png',
 *   container: document.getElementById('ar-container')!,
 *   overlay: document.getElementById('overlay')!,
 *   callbacks: {
 *     onFound: () => console.log('Target found!'),
 *     onLost: () => console.log('Target lost'),
 *     onUpdate: (data) => console.log('Update:', data)
 *   }
 * });
 * 
 * // Start tracking from camera
 * tracker.startCamera();
 * 
 * // Or track from a video/canvas element
 * tracker.startVideo(videoElement);
 * 
 * // Stop tracking
 * tracker.stop();
 * ```
 */

import { BioInspiredController } from './bio-inspired-controller.js';
import { OfflineCompiler } from '../compiler/offline-compiler.js';
import { projectToScreen } from '../core/utils/projection.js';
import { AR_CONFIG } from '../core/constants.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Tracking update data passed to onUpdate callback
 */
export interface TrackingUpdate {
    /** Whether the target is currently being tracked */
    isTracking: boolean;

    /** 4x4 world transformation matrix (column-major, for WebGL/Three.js) */
    worldMatrix: number[] | null;

    /** 3x4 model-view transform matrix */
    modelViewTransform: number[][] | null;

    /** Screen coordinates of tracked feature points */
    screenCoords: Array<{ x: number; y: number; id: number }>;

    /** Reliability scores (0-1) for each tracked point */
    reliabilities: number[];

    /** Stability scores (0-1) for each tracked point */
    stabilities: number[];

    /** Average reliability across all points */
    avgReliability: number;

    /** Average stability across all points */
    avgStability: number;

    /** Reference to the controller for advanced usage */
    controller: BioInspiredController;

    /** Index of the tracked target (for multi-target tracking) */
    targetIndex: number;

    /** Target dimensions [width, height] */
    targetDimensions: [number, number];
}

/**
 * Tracking event callbacks
 */
export interface TrackingCallbacks {
    /**
     * Called when the target is first detected
     * @param data Initial tracking data
     */
    onFound?: (data: TrackingUpdate) => void;

    /**
     * Called when tracking is lost
     * @param data Last known tracking data
     */
    onLost?: (data: TrackingUpdate) => void;

    /**
     * Called on every frame update while tracking
     * @param data Current tracking data
     */
    onUpdate?: (data: TrackingUpdate) => void;

    /**
     * Called during target compilation
     * @param progress Progress percentage (0-100)
     */
    onCompileProgress?: (progress: number) => void;
}

/**
 * Configuration options for the tracker
 */
export interface TrackerConfig {
    /**
     * Source of the target image to track.
     * Can be a URL string, HTMLImageElement, ImageData, or ArrayBuffer (pre-compiled .taar)
     */
    targetSrc: string | HTMLImageElement | ImageData | ArrayBuffer;

    /**
     * Container element for the video/canvas display
     */
    container: HTMLElement;

    /**
     * Optional overlay element to position over the tracked target
     */
    overlay?: HTMLElement;

    /**
     * Tracking event callbacks
     */
    callbacks?: TrackingCallbacks;

    /**
     * Camera configuration (MediaStreamConstraints['video'])
     * @default { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
     */
    cameraConfig?: MediaStreamConstraints['video'];

    /**
     * Viewport width for processing
     * @default 1280
     */
    viewportWidth?: number;

    /**
     * Viewport height for processing
     * @default 960
     */
    viewportHeight?: number;

    /**
     * Enable debug mode for additional logging
     * @default false
     */
    debugMode?: boolean;

    /**
     * Enable bio-inspired perception optimizations
     * @default true
     */
    bioInspiredEnabled?: boolean;

    /**
     * Scale multiplier for the overlay
     * @default 1.0
     */
    scale?: number;
}

/**
 * Tracker instance returned by createTracker
 */
export interface Tracker {
    /** Start tracking from device camera */
    startCamera(): Promise<void>;

    /** Start tracking from a video or canvas element */
    startVideo(source: HTMLVideoElement | HTMLCanvasElement): void;

    /** Stop tracking and release resources */
    stop(): void;

    /** Whether the tracker is currently active */
    readonly isActive: boolean;

    /** Whether a target is currently being tracked */
    readonly isTracking: boolean;

    /** The underlying BioInspiredController instance */
    readonly controller: BioInspiredController;

    /** Target dimensions [width, height] */
    readonly targetDimensions: [number, number];

    /** Get the projection matrix for 3D rendering */
    getProjectionMatrix(): number[];
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Load an image from a URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}

/**
 * Get ImageData from various source types
 */
async function getImageData(
    source: string | HTMLImageElement | ImageData
): Promise<{ imageData: ImageData; width: number; height: number }> {
    let img: HTMLImageElement;

    if (typeof source === 'string') {
        img = await loadImage(source);
    } else if (source instanceof HTMLImageElement) {
        img = source;
        if (!img.complete) {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        }
    } else {
        // Already ImageData
        return { imageData: source, width: source.width, height: source.height };
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    return { imageData, width: img.width, height: img.height };
}

/**
 * Solve homography for overlay positioning (from reliability-test.html)
 */
function solveHomography(
    w: number, h: number,
    p1: { sx: number; sy: number },
    p2: { sx: number; sy: number },
    p3: { sx: number; sy: number },
    p4: { sx: number; sy: number }
): number[] {
    const x1 = p1.sx, y1 = p1.sy;
    const x2 = p2.sx, y2 = p2.sy;
    const x3 = p3.sx, y3 = p3.sy;
    const x4 = p4.sx, y4 = p4.sy;

    const dx1 = x2 - x4, dx2 = x3 - x4, dx3 = x1 - x2 + x4 - x3;
    const dy1 = y2 - y4, dy2 = y3 - y4, dy3 = y1 - y2 + y4 - y3;

    const det = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / det;
    const h_coeff = (dx1 * dy3 - dx3 * dy1) / det;
    const a = x2 - x1 + g * x2;
    const b = x3 - x1 + h_coeff * x3;
    const c = x1;
    const d = y2 - y1 + g * y2;
    const e = y3 - y1 + h_coeff * y3;
    const f = y1;

    return [
        a / w, d / w, 0, g / w,
        b / h, e / h, 0, h_coeff / h,
        0, 0, 1, 0,
        c, f, 0, 1
    ];
}

/**
 * Create and configure an AR tracker with minimal setup
 */
export async function createTracker(config: TrackerConfig): Promise<Tracker> {
    const {
        targetSrc,
        container,
        overlay,
        callbacks = {},
        cameraConfig = {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 960 }
        },
        viewportWidth = 1280,
        viewportHeight = 960,
        debugMode = false,
        bioInspiredEnabled = true,
        scale = 1.0
    } = config;

    // State
    let isActive = false;
    let wasTracking = false;
    let mediaStream: MediaStream | null = null;
    let videoElement: HTMLVideoElement | null = null;
    let targetDimensions: [number, number] = [0, 0];

    // Create video canvas for camera input
    const videoCanvas = document.createElement('canvas');
    videoCanvas.width = viewportWidth;
    videoCanvas.height = viewportHeight;
    videoCanvas.style.width = '100%';
    videoCanvas.style.height = '100%';
    videoCanvas.style.objectFit = 'cover';
    videoCanvas.style.position = 'absolute';
    videoCanvas.style.top = '0';
    videoCanvas.style.left = '0';
    videoCanvas.style.zIndex = '0';
    const videoCtx = videoCanvas.getContext('2d')!;

    // Setup overlay styles if provided
    if (overlay) {
        overlay.style.position = 'absolute';
        overlay.style.transformOrigin = '0 0';
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
    }

    // Compile target or load pre-compiled data
    let compiledBuffer: ArrayBuffer;

    if (targetSrc instanceof ArrayBuffer) {
        compiledBuffer = targetSrc;
    } else if (typeof targetSrc === 'string' && targetSrc.toLowerCase().split('?')[0].endsWith('.taar')) {
        // Pre-compiled .taar file URL
        if (debugMode) console.log(`[TapTapp AR] Fetching pre-compiled target: ${targetSrc}`);
        const response = await fetch(targetSrc);
        if (!response.ok) throw new Error(`Failed to fetch .taar file: ${response.statusText}`);
        compiledBuffer = await response.arrayBuffer();
    } else {
        // Source is an image or ImageData that needs compilation
        if (debugMode) console.log('[TapTapp AR] Compiling image target...');
        const { imageData, width, height } = await getImageData(targetSrc as any);
        targetDimensions = [width, height];

        const compiler = new OfflineCompiler();
        await compiler.compileImageTargets(
            [{ width, height, data: imageData.data }],
            (progress) => callbacks.onCompileProgress?.(progress)
        );

        const exported = compiler.exportData();
        compiledBuffer = exported.buffer.slice(
            exported.byteOffset,
            exported.byteOffset + exported.byteLength
        );
    }

    // Create controller with bio-inspired perception
    const controller = new BioInspiredController({
        inputWidth: viewportWidth,
        inputHeight: viewportHeight,
        debugMode,
        bioInspired: {
            enabled: bioInspiredEnabled,
            aggressiveSkipping: false // Keep stable for real-world conditions
        },
        onUpdate: (data) => handleControllerUpdate(data)
    });

    // Load compiled targets
    const loadResult = await controller.addImageTargetsFromBuffer(compiledBuffer);
    if (loadResult.dimensions && loadResult.dimensions[0]) {
        targetDimensions = loadResult.dimensions[0] as [number, number];
    }

    /**
     * Handle controller updates and dispatch to user callbacks
     */
    function handleControllerUpdate(data: any) {
        if (data.type === 'processDone') return;
        if (data.type !== 'updateMatrix') return;

        const {
            targetIndex,
            worldMatrix,
            modelViewTransform,
            screenCoords = [],
            reliabilities = [],
            stabilities = []
        } = data;

        const isTracking = worldMatrix !== null;

        // Calculate averages
        const avgReliability = reliabilities.length > 0
            ? reliabilities.reduce((a: number, b: number) => a + b, 0) / reliabilities.length
            : 0;
        const avgStability = stabilities.length > 0
            ? stabilities.reduce((a: number, b: number) => a + b, 0) / stabilities.length
            : 0;

        const updateData: TrackingUpdate = {
            isTracking,
            worldMatrix,
            modelViewTransform,
            screenCoords,
            reliabilities,
            stabilities,
            avgReliability,
            avgStability,
            controller,
            targetIndex,
            targetDimensions
        };

        // Dispatch state change callbacks
        if (isTracking && !wasTracking) {
            callbacks.onFound?.(updateData);
        } else if (!isTracking && wasTracking) {
            callbacks.onLost?.(updateData);
        }

        // Always call onUpdate when tracking
        if (isTracking || wasTracking) {
            callbacks.onUpdate?.(updateData);
        }

        // Update overlay position if provided
        if (overlay && modelViewTransform && worldMatrix) {
            positionOverlay(modelViewTransform);
        } else if (overlay && !isTracking) {
            overlay.style.display = 'none';
        }

        wasTracking = isTracking;
    }

    /**
     * Position the overlay element using homography transform
     */
    function positionOverlay(modelViewTransform: number[][]) {
        if (!overlay) return;

        const [markerW, markerH] = targetDimensions;
        const proj = controller.projectionTransform;
        const containerRect = container.getBoundingClientRect();

        // Get corners in screen space
        const pUL = projectToScreen(0, 0, 0, modelViewTransform, proj, viewportWidth, viewportHeight, containerRect, false);
        const pUR = projectToScreen(markerW, 0, 0, modelViewTransform, proj, viewportWidth, viewportHeight, containerRect, false);
        const pLL = projectToScreen(0, markerH, 0, modelViewTransform, proj, viewportWidth, viewportHeight, containerRect, false);
        const pLR = projectToScreen(markerW, markerH, 0, modelViewTransform, proj, viewportWidth, viewportHeight, containerRect, false);

        const matrix = solveHomography(markerW, markerH, pUL, pUR, pLL, pLR);

        overlay.style.width = `${markerW}px`;
        overlay.style.height = `${markerH}px`;

        // Apply custom scale if provided
        let matrixString = matrix.join(',');
        if (scale !== 1.0) {
            overlay.style.transform = `matrix3d(${matrixString}) scale(${scale})`;
        } else {
            overlay.style.transform = `matrix3d(${matrixString})`;
        }

        overlay.style.display = 'block';
    }

    /**
     * Draw video frame to canvas
     */
    function drawVideoToCanvas(source: HTMLVideoElement | HTMLCanvasElement) {
        if (source instanceof HTMLVideoElement) {
            videoCtx.drawImage(source, 0, 0, viewportWidth, viewportHeight);
        } else {
            videoCtx.drawImage(source, 0, 0, viewportWidth, viewportHeight);
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    const tracker: Tracker = {
        async startCamera() {
            if (isActive) return;

            try {
                // Try environment mode first (mobile back camera)
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: cameraConfig,
                        audio: false
                    });
                } catch (e) {
                    console.warn('[TapTapp AR] Failed to open environment camera, falling back to default:', e);
                    // Fallback to any camera
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                }

                videoElement = document.createElement('video');
                videoElement.srcObject = mediaStream;
                videoElement.playsInline = true;
                videoElement.muted = true;

                await videoElement.play();

                // Add video canvas to container (at the beginning to be behind)
                container.style.position = 'relative';
                if (container.firstChild) {
                    container.insertBefore(videoCanvas, container.firstChild);
                } else {
                    container.appendChild(videoCanvas);
                }

                isActive = true;

                // Start processing loop
                const processLoop = () => {
                    if (!isActive || !videoElement) return;

                    drawVideoToCanvas(videoElement);
                    requestAnimationFrame(processLoop);
                };

                processLoop();
                controller.processVideo(videoCanvas);

            } catch (error) {
                console.error('[TapTapp AR] Camera access failed:', error);
                throw error;
            }
        },

        startVideo(source: HTMLVideoElement | HTMLCanvasElement) {
            if (isActive) return;

            container.style.position = 'relative';
            container.appendChild(videoCanvas);

            isActive = true;

            // Start processing loop
            const processLoop = () => {
                if (!isActive) return;

                drawVideoToCanvas(source);
                requestAnimationFrame(processLoop);
            };

            processLoop();
            controller.processVideo(videoCanvas);
        },

        stop() {
            isActive = false;
            controller.stopProcessVideo();

            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
                mediaStream = null;
            }

            if (videoElement) {
                videoElement.srcObject = null;
                videoElement = null;
            }

            if (videoCanvas.parentNode) {
                videoCanvas.parentNode.removeChild(videoCanvas);
            }

            if (overlay) {
                overlay.style.display = 'none';
            }
        },

        get isActive() {
            return isActive;
        },

        get isTracking() {
            return wasTracking;
        },

        get controller() {
            return controller;
        },

        get targetDimensions() {
            return targetDimensions;
        },

        getProjectionMatrix() {
            return controller.getProjectionMatrix();
        }
    };

    return tracker;
}

/**
 * Convenience function to create a tracker with camera autostart
 */
export async function startTracking(config: TrackerConfig): Promise<Tracker> {
    const tracker = await createTracker(config);
    await tracker.startCamera();
    return tracker;
}

// Default export for easy importing
export default createTracker;
