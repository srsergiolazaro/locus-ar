import { useEffect, useRef, useState, useCallback } from "react";
import type { ARConfig } from "./types.js";
import type { SimpleAR as SimpleARType } from "../compiler/simple-ar.js";

export type ARStatus = "scanning" | "tracking" | "error";

export interface UseARReturn {
    containerRef: React.RefObject<HTMLDivElement>;
    overlayRef: React.RefObject<HTMLVideoElement | HTMLImageElement>;
    status: ARStatus;
    isPlaying: boolean;
    toggleVideo: () => Promise<void>;
}

export const useAR = (config: ARConfig): UseARReturn => {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
    const [status, setStatus] = useState<ARStatus>("scanning");
    const [isPlaying, setIsPlaying] = useState(false);
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
                const { SimpleAR } = await import("../compiler/simple-ar.js");
                if (!isMounted) return;

                const instance = new SimpleAR({
                    container: containerRef.current!,
                    targetSrc: config.targetTaarSrc,
                    overlay: overlayRef.current!,
                    scale: config.scale,
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
        toggleVideo
    };
};
