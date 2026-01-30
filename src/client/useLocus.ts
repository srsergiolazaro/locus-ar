import { useState, useEffect, useRef, useCallback } from 'react';
import { BioInspiredController } from '../runtime/bio-inspired-controller.js';
import { OfflineCompiler } from '../compiler/offline-compiler.js';
import { LocusConfig, LocusTarget, LocusState, LocusDetection } from './types.js';

const DEFAULT_CONFIG: Required<LocusConfig> = {
    width: 640,
    height: 480,
    maxTrack: 1,
    debugMode: false,
    bioInspired: true,
    facingMode: 'environment'
};

export function useLocus(targets: LocusTarget[], config: LocusConfig = {}) {
    const [state, setState] = useState<LocusState>('idle');
    const [detections, setDetections] = useState<LocusDetection[]>([]);
    const [compilationProgress, setCompilationProgress] = useState(0);
    const [error, setError] = useState<string | undefined>();

    const controllerRef = useRef<BioInspiredController | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>();
    const isRunningRef = useRef(false);

    // Merge config
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    const stop = useCallback(() => {
        isRunningRef.current = false;
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        controllerRef.current = null;
        setState('idle');
        setDetections([]);
    }, []);

    const start = useCallback(async (videoElement: HTMLVideoElement) => {
        if (state !== 'idle' && state !== 'error') return;

        videoRef.current = videoElement;
        setState('initializing');
        setError(undefined);

        try {
            // 1. Start Camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: fullConfig.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            videoElement.srcObject = stream;
            await new Promise<void>((resolve) => {
                videoElement.onloadedmetadata = () => resolve();
            });

            // 2. Prepare Processing Canvas
            if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas');
            }
            canvasRef.current.width = fullConfig.width;
            canvasRef.current.height = fullConfig.height;
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Could not create canvas context');

            // 3. Compile Targets
            setState('compiling');
            const compiler = new OfflineCompiler();
            const imagesToCompile = await Promise.all(targets.map(async (t) => {
                const imageData = await getImageData(t.image, fullConfig.width, fullConfig.height);
                return {
                    data: new Uint8Array(imageData.data.buffer),
                    width: imageData.width,
                    height: imageData.height
                };
            }));

            await compiler.compileImageTargets(imagesToCompile, (progress) => {
                setCompilationProgress(Math.round(progress));
            });

            const buffer = compiler.exportData();
            const cleanBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            // 4. Initialize Controller
            const activeDetections: Map<number, LocusDetection> = new Map();

            controllerRef.current = new BioInspiredController({
                inputWidth: fullConfig.width,
                inputHeight: fullConfig.height,
                debugMode: fullConfig.debugMode,
                maxTrack: fullConfig.maxTrack,
                bioInspired: { enabled: fullConfig.bioInspired },
                onUpdate: (data) => {
                    if (data.type === 'updateMatrix') {
                        const { targetIndex, worldMatrix, screenCoords } = data;
                        if (targetIndex !== undefined && worldMatrix) {
                            activeDetections.set(targetIndex, {
                                targetIndex,
                                worldMatrix,
                                screenCoords,
                                label: targets[targetIndex]?.label
                            });
                        }
                    } else if (data.type === 'processDone') {
                        setDetections((prev) => {
                            const next = Array.from(activeDetections.values());
                            activeDetections.clear();
                            return next;
                        });
                    }
                }
            });

            await controllerRef.current.addImageTargetsFromBuffer(cleanBuffer);

            // 5. Start Loop
            isRunningRef.current = true;
            setState('tracking');

            const loop = () => {
                if (!isRunningRef.current || !controllerRef.current || !canvasRef.current) return;

                // Draw video to processing canvas (Parity with demo)
                drawVideoToCanvas(ctx!, videoElement, fullConfig.width, fullConfig.height);

                // Process frame
                controllerRef.current.processVideo(canvasRef.current);

                requestRef.current = requestAnimationFrame(loop);
            };

            loop();

        } catch (err: any) {
            console.error('[Locus] Initialization error:', err);
            setError(err.message || 'Unknown error');
            setState('error');
            stop();
        }
    }, [targets, fullConfig, state, stop]);

    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    return {
        state,
        detections,
        compilationProgress,
        error,
        start,
        stop
    };
}

// Helpers
async function getImageData(image: string | HTMLImageElement | ImageData, w: number, h: number): Promise<ImageData> {
    if (image instanceof ImageData) return image;

    let img: HTMLImageElement;
    if (typeof image === 'string') {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = image;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
    } else {
        img = image;
        if (!img.complete) {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    drawVideoToCanvas(ctx, img as unknown as HTMLVideoElement, w, h);
    return ctx.getImageData(0, 0, w, h);
}

function drawVideoToCanvas(ctx: CanvasRenderingContext2D, element: HTMLVideoElement | HTMLImageElement, targetWidth: number, targetHeight: number) {
    const elementWidth = (element as HTMLVideoElement).videoWidth || (element as HTMLImageElement).naturalWidth;
    const elementHeight = (element as HTMLVideoElement).videoHeight || (element as HTMLImageElement).naturalHeight;

    if (!elementWidth || !elementHeight) return;

    const elementRatio = elementWidth / elementHeight;
    const targetRatio = targetWidth / targetHeight;

    let sx, sy, sw, sh;

    if (elementRatio > targetRatio) {
        sh = elementHeight;
        sw = sh * targetRatio;
        sx = (elementWidth - sw) / 2;
        sy = 0;
    } else {
        sw = elementWidth;
        sh = sw / targetRatio;
        sx = 0;
        sy = (elementHeight - sh) / 2;
    }

    ctx.drawImage(element, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}
