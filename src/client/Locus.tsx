import React, { useRef, useEffect, ReactNode } from 'react';
import { useLocus } from './useLocus.js';
import { LocusConfig, LocusTarget, LocusDetection } from './types.js';

interface LocusProps extends LocusConfig {
    /** Single target image source or array of target objects. */
    targets: string | LocusTarget | LocusTarget[];
    /** Children can be a function receiving detections or React nodes. */
    children?: ReactNode | ((detections: LocusDetection[]) => ReactNode);
    /** CSS class for the container. */
    className?: string;
    /** Inline styles for the container. */
    style?: React.CSSProperties;
    /** Auto-start when camera is ready. Default: true */
    autoStart?: boolean;
}

/**
 * Locus Component - High-level AR view for React.
 */
export const Locus: React.FC<LocusProps> = ({
    targets: targetsProp,
    children,
    className,
    style,
    autoStart = true,
    ...config
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Normalize targets
    const targets = React.useMemo(() => {
        if (typeof targetsProp === 'string') {
            return [{ image: targetsProp, id: 'default' }];
        }
        if (!Array.isArray(targetsProp)) {
            return [targetsProp];
        }
        return targetsProp;
    }, [targetsProp]);

    const { state, detections, error, start } = useLocus(targets, config);

    useEffect(() => {
        if (autoStart && videoRef.current) {
            start(videoRef.current);
        }
    }, [autoStart, start]);

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
        ...style
    };

    const videoStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    };

    const overlayContainerStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
    };

    // Helper to render children
    const renderChildren = () => {
        if (typeof children === 'function') {
            return (children as (detections: LocusDetection[]) => ReactNode)(detections);
        }

        // If it's a single target case, auto-apply transform to all children
        if (targets.length === 1 && detections.length === 1) {
            return (
                <LocusTransform
                    matrix={detections[0].worldMatrix}
                    screenCoords={detections[0].screenCoords}
                    container={containerRef.current}
                >
                    {children}
                </LocusTransform>
            );
        }

        return children;
    };

    return (
        <div ref={containerRef} className={className} style={containerStyle}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={videoStyle}
            />

            <div style={overlayContainerStyle}>
                {renderChildren()}
            </div>

            {config.debugMode && (
                <DebugOverlay detections={detections} />
            )}

            {state === 'compiling' && (
                <div className="locus-loader" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    padding: '24px 32px',
                    borderRadius: '20px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div className="spinner" style={{
                        width: '30px',
                        height: '30px',
                        border: '3px solid rgba(99, 102, 241, 0.3)',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    Compiling Target...
                    <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
                </div>
            )}

            {error && (
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '24px',
                    right: '24px',
                    background: 'rgba(220, 38, 38, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                }}>
                    <strong>Camera Error:</strong> {error}
                </div>
            )}
        </div>
    );
};

/**
 * LocusTransform - Positions children on top of a detection.
 */
export const LocusTransform: React.FC<{
    matrix: number[] | null;
    screenCoords?: { x: number; y: number }[] | null;
    container?: HTMLElement | null;
    children: ReactNode;
}> = ({ matrix, screenCoords, container, children }) => {
    if (!matrix || !screenCoords || !container) return null;

    // Use homography for more stable DOM alignment
    const homography = solveHomographyFromPoints(screenCoords, container);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100px', // Base size (matching solveHomography)
            height: '100px',
            transformOrigin: '0 0',
            transform: `matrix3d(${homography.join(',')})`,
            pointerEvents: 'auto',
            zIndex: 10
        }}>
            {children}
        </div>
    );
};

const DebugOverlay: React.FC<{ detections: LocusDetection[] }> = ({ detections }) => {
    return (
        <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            {detections.map((det, i) => {
                if (!det.screenCoords) return null;
                // Map points to 0-100 scale for SVG
                const pts = det.screenCoords.map(p => `${(p.x / 640) * 100},${(p.y / 480) * 100}`).join(' ');
                return (
                    <polygon
                        key={i}
                        points={pts}
                        fill="rgba(34, 197, 94, 0.2)"
                        stroke="#22c55e"
                        strokeWidth="0.5"
                    />
                );
            })}
        </svg>
    );
};

/**
 * Calculates a homography matrix to map a 100x100 square to the 4 screen corners.
 */
function solveHomographyFromPoints(pts: { x: number; y: number }[], container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Points come in 640x480 scale from useLocus hook
    const scaleX = w / 640;
    const scaleY = h / 480;

    const p1 = { x: pts[0].x * scaleX, y: pts[0].y * scaleY };
    const p2 = { x: pts[1].x * scaleX, y: pts[1].y * scaleY };
    const p3 = { x: pts[2].x * scaleX, y: pts[2].y * scaleY };
    const p4 = { x: pts[3].x * scaleX, y: pts[3].y * scaleY };

    return solveHomography(100, 100, p1, p2, p3, p4);
}

function solveHomography(w: number, h: number, p1: any, p2: any, p3: any, p4: any) {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const dx1 = x2 - x4, dx2 = x3 - x4, dx3 = x1 - x2 + x4 - x3;
    const dy1 = y2 - y4, dy2 = y3 - y4, dy3 = y1 - y2 + y4 - y3;

    let a, b, c, d, e, f, g, h_coeff;
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 0.000001) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    g = (dx3 * dy2 - dx2 * dy3) / det;
    h_coeff = (dx1 * dy3 - dx3 * dy1) / det;
    a = x2 - x1 + g * x2;
    b = x3 - x1 + h_coeff * x3;
    c = x1;
    d = y2 - y1 + g * y2;
    e = y3 - y1 + h_coeff * y3;
    f = y1;

    return [
        a / w, d / w, 0, g / w,
        b / h, e / h, 0, h_coeff / h,
        0, 0, 1, 0,
        c, f, 0, 1
    ];
}
