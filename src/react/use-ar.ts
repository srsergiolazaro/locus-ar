import { useEffect, useRef, useState, useCallback } from "react";
import type { ARConfig } from "./types.js";
import type { Tracker } from "../runtime/track.js";

export type ARStatus = "compiling" | "scanning" | "tracking" | "error";

export interface TrackedPoint {
    x: number;
    y: number;
    reliability: number;
    stability: number;
}

export interface UseARReturn {
    containerRef: React.RefObject<HTMLDivElement>;
    overlayRef: React.RefObject<HTMLVideoElement | HTMLImageElement>;
    status: ARStatus;
    isPlaying: boolean;
    toggleVideo: () => Promise<void>;
    trackedPoints: TrackedPoint[];
    error: string | null;
}

export const useAR = (config: ARConfig): UseARReturn => {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
    const [status, setStatus] = useState<ARStatus>("scanning");
    const [isPlaying, setIsPlaying] = useState(false);
    const [trackedPoints, setTrackedPoints] = useState<TrackedPoint[]>([]);
    const [error, setError] = useState<string | null>(null);
    const arInstanceRef = useRef<Tracker | null>(null);

    const toggleVideo = useCallback(async () => {
        const overlay = overlayRef.current;
        if (!(overlay instanceof HTMLVideoElement)) return;

        try {
            if (overlay.paused) {
                await overlay.play();
                setIsPlaying(true);
            } else {
                overlay.pause();
                setIsPlaying(false);
            }
        } catch (err) {
            console.error("Error toggling video:", err);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !containerRef.current || !overlayRef.current) return;

        let isMounted = true;

        const initAR = async () => {
            try {
                // Safe hybrid import for SSR + Speed
                const { createTracker } = await import("../runtime/track.js");
                if (!isMounted) return;

                setStatus("compiling");

                const instance = await createTracker({
                    container: containerRef.current!,
                    targetSrc: config.targetTaarSrc || config.targetImageSrc,
                    overlay: overlayRef.current!,
                    scale: config.scale,
                    debugMode: false,
                    callbacks: {
                        onUpdate: (data) => {
                            const { screenCoords, reliabilities, stabilities } = data;
                            if (screenCoords && reliabilities && stabilities) {
                                const points = screenCoords.map((p, i) => ({
                                    x: p.x,
                                    y: p.y,
                                    reliability: reliabilities[i],
                                    stability: stabilities[i]
                                }));
                                setTrackedPoints(points);
                            }
                        },
                        onFound: async ({ targetIndex }) => {
                            console.log(`🎯 Target ${targetIndex} detected!`);
                            if (!isMounted) return;
                            setStatus("tracking");

                            const overlay = overlayRef.current;
                            if (overlay instanceof HTMLVideoElement) {
                                try {
                                    await overlay.play();
                                    setIsPlaying(true);
                                } catch (err) {
                                    console.warn("Auto-play blocked:", err);
                                }
                            }
                        },
                        onLost: ({ targetIndex }) => {
                            console.log(`👋 Target ${targetIndex} lost`);
                            if (!isMounted) return;
                            setStatus("scanning");
                            setTrackedPoints([]);

                            const overlay = overlayRef.current;
                            if (overlay instanceof HTMLVideoElement) {
                                overlay.pause();
                                setIsPlaying(false);
                            }
                        }
                    }
                });

                arInstanceRef.current = instance;
                await instance.startCamera();

                if (isMounted) setStatus("scanning");
            } catch (err: any) {
                console.error("❌ [TapTapp AR] Error durante la inicialización:", err);
                if (isMounted) {
                    setError(err.message || String(err));
                    setStatus("error");
                }
            }
        };

        initAR();

        return () => {
            isMounted = false;
            arInstanceRef.current?.stop();
            arInstanceRef.current = null;
        };
    }, [config.targetTaarSrc, config.targetImageSrc, config.scale]);

    return {
        containerRef,
        overlayRef,
        status,
        isPlaying,
        toggleVideo,
        trackedPoints,
        error
    };
};
