export interface LocusTarget {
    /** Unique identifier for the target. Generated if not provided. */
    id?: string;
    /** Image source (URL, HTMLImageElement, or ImageData). */
    image: string | HTMLImageElement | ImageData;
    /** Custom metadata or label for this target. */
    label?: string;
}

export interface LocusConfig {
    /** Processing width. Default: 640 */
    width?: number;
    /** Processing height. Default: 480 */
    height?: number;
    /** Maximum number of targets to track simultaneously. Default: 1 */
    maxTrack?: number;
    /** Enable debug mode (can draw feature points/boxes). Default: false */
    debugMode?: boolean;
    /** Enable bio-inspired performance optimizations. Default: true */
    bioInspired?: boolean;
    /** Facing mode for the camera. Default: 'environment' */
    facingMode?: 'user' | 'environment';
}

export type LocusState = 'idle' | 'initializing' | 'compiling' | 'tracking' | 'error';

export interface LocusDetection {
    /** Index of the detected target in the original targets array. */
    targetIndex: number;
    /** 4x4 matrix representing the target's position and orientation. */
    worldMatrix: number[] | null;
    /** Screen coordinates of the 4 corners of the detected target. */
    screenCoords: { x: number; y: number }[] | null;
    /** Metadata label of the target. */
    label?: string;
}

export interface LocusUpdate {
    /** Current state of the AR engine. */
    state: LocusState;
    /** List of currently detected targets. */
    detections: LocusDetection[];
    /** Progress of target compilation (0-100). */
    compilationProgress: number;
    /** Last error message if state is 'error'. */
    error?: string;
}
