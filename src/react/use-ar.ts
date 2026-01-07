import { useEffect, useRef, useState, useCallback } from "react";
import type { ARConfig } from "./types.js";
import type { SimpleAR as SimpleARType } from "../runtime/simple-ar.js";

export type ARStatus = "scanning" | "tracking" | "error";

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
}

export const useAR = (config: ARConfig): UseARReturn => {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
    const [status, setStatus] = useState<ARStatus>("scanning");
    const [isPlaying, setIsPlaying] = useState(false);
    const [trackedPoints, setTrackedPoints] = useState<TrackedPoint[]>([]);
    const arInstanceRef = useRef<SimpleARType | null>(null);

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
                const { SimpleAR } = await import("../runtime/simple-ar.js");
                if (!isMounted) return;

                const instance = new SimpleAR({
                    container: containerRef.current!,
                    targetSrc: config.targetTaarSrc,
                    overlay: overlayRef.current!,
                    scale: config.scale,
                    debug: false,
                    onUpdate: ({ screenCoords, reliabilities, stabilities }) => {
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
                });

                arInstanceRef.current = instance;
                await instance.start();

                if (isMounted) setStatus("scanning");
            } catch (err) {
                console.error("Failed to initialize AR:", err);
                if (isMounted) setStatus("error");
            }
        };

        initAR();

        return () => {
            isMounted = false;
            arInstanceRef.current?.stop();
            arInstanceRef.current = null;
        };
    }, [config.targetTaarSrc, config.scale]);

    return {
        containerRef,
        overlayRef,
        status,
        isPlaying,
        toggleVideo,
        trackedPoints
    };
};
