import React, { useMemo } from "react";
import { useAR } from "./use-ar.js";
import type { ARConfig } from "./types.js";

export interface TaptappARProps {
    config: ARConfig;
    className?: string;
    showScanningOverlay?: boolean;
    showErrorOverlay?: boolean;
}

export const TaptappAR: React.FC<TaptappARProps> = ({
    config,
    className = "",
    showScanningOverlay = true,
    showErrorOverlay = true
}) => {
    const { containerRef, overlayRef, status, toggleVideo } = useAR(config);

    // Simple heuristic to determine if it's a video or image
    // based on the presence of videoSrc and common extensions
    const isVideo = useMemo(() => {
        if (!config.videoSrc) return false;
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
        const url = config.videoSrc.toLowerCase().split('?')[0];
        return videoExtensions.some(ext => url.endsWith(ext)) || config.videoSrc.includes('video');
    }, [config.videoSrc]);

    return (
        <div className={`taptapp-ar-wrapper ${className} ${status}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* Scanning Overlay */}
            {showScanningOverlay && status === "scanning" && (
                <div className="taptapp-ar-overlay taptapp-ar-scanning">
                    <div className="scanning-content">
                        <div className="scanning-frame">
                            <img
                                className="target-preview"
                                src={config.targetImageSrc}
                                alt="Target"
                                crossOrigin="anonymous"
                            />
                            <div className="scanning-line"></div>
                        </div>
                        <p className="scanning-text">Apunta a la imagen para comenzar</p>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {showErrorOverlay && status === "error" && (
                <div className="taptapp-ar-overlay taptapp-ar-error">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <p className="error-title">No se pudo iniciar AR</p>
                        <p className="error-text">Verifica los permisos de cámara</p>
                        <button className="retry-btn" onClick={() => window.location.reload()}>
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {/* AR Container */}
            <div
                ref={containerRef}
                className="taptapp-ar-container"
                onClick={toggleVideo}
                style={{ width: '100%', height: '100%' }}
            >
                {isVideo ? (
                    <video
                        ref={overlayRef as React.RefObject<HTMLVideoElement>}
                        className="taptapp-ar-overlay-element"
                        src={config.videoSrc}
                        preload="auto"
                        loop
                        playsInline
                        muted
                        crossOrigin="anonymous"
                    />
                ) : (
                    <img
                        ref={overlayRef as React.RefObject<HTMLImageElement>}
                        className="taptapp-ar-overlay-element"
                        src={config.videoSrc || config.targetImageSrc}
                        crossOrigin="anonymous"
                        alt="AR Overlay"
                    />
                )}
            </div>

            <style>{`
                .taptapp-ar-wrapper {
                    background: #000;
                    color: white;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                .taptapp-ar-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 20;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(4px);
                    transition: opacity 0.3s ease;
                }
                .scanning-content, .error-content {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 20px;
                }
                .scanning-frame {
                    position: relative;
                    width: 200px;
                    height: 200px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 20px;
                    overflow: hidden;
                    margin-bottom: 20px;
                }
                .target-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.6;
                }
                .scanning-line {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: #00e5ff;
                    box-shadow: 0 0 15px #00e5ff;
                    animation: scan 2s linear infinite;
                }
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
                .scanning-text {
                    font-size: 1.1rem;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                }
                .error-icon { font-size: 3rem; margin-bottom: 10px; }
                .error-title { font-size: 1.2rem; font-weight: bold; margin: 0; }
                .error-text { opacity: 0.8; margin: 5px 0 20px; }
                .retry-btn {
                    padding: 10px 25px;
                    border-radius: 30px;
                    border: none;
                    background: #fff;
                    color: #000;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .retry-btn:active { transform: scale(0.95); }
                .taptapp-ar-overlay-element {
                    display: block;
                    width: 100%;
                    height: auto;
                }
            `}</style>
        </div>
    );
};
