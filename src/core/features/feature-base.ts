export interface FeatureContext {
    inputWidth: number;
    inputHeight: number;
    projectionTransform: number[][];
    debugMode: boolean;
}

export interface Feature {
    id: string;
    name: string;
    description: string;
    enabled: boolean;

    // Lifecycle hooks
    init?(context: FeatureContext): void;
    onUpdate?(data: any): void;
    dispose?(): void;
}

/**
 * Controller feature interface for processing hooks
 */
export interface ControllerFeature extends Feature {
    /**
     * Called before processing a frame
     */
    beforeProcess?(inputData: any): void;

    /**
     * Called after detection/matching
     */
    afterMatch?(result: { targetIndex: number, modelViewTransform: number[][] | null }): void;

    /**
     * Called after tracking update
     */
    afterTrack?(result: { targetIndex: number, modelViewTransform: number[][] | null }): void;

    /**
     * Hook to filter or modify the final world matrix
     */
    filterWorldMatrix?(targetIndex: number, worldMatrix: number[], context?: any): number[];

    /**
     * Hook to decide if a target should be shown
     */
    shouldShow?(targetIndex: number, isTracking: boolean): boolean;
}
