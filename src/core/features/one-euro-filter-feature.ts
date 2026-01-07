import { ControllerFeature, FeatureContext } from "./feature-base.js";
import { OneEuroFilter } from "../../libs/one-euro-filter.js";

export class OneEuroFilterFeature implements ControllerFeature {
    id = "one-euro-filter";
    name = "One Euro Filter";
    description = "Smooths the tracking matrix to reduce jitter using a One Euro Filter.";
    enabled = true;

    private filters: OneEuroFilter[] = [];
    private minCutOff: number;
    private beta: number;

    constructor(minCutOff: number = 0.5, beta: number = 0.1) {
        this.minCutOff = minCutOff;
        this.beta = beta;
    }

    init(context: FeatureContext) {
        // We'll initialize filters lazily or based on target count if known
    }

    private getFilter(targetIndex: number): OneEuroFilter {
        if (!this.filters[targetIndex]) {
            this.filters[targetIndex] = new OneEuroFilter({
                minCutOff: this.minCutOff,
                beta: this.beta
            });
        }
        return this.filters[targetIndex];
    }

    filterWorldMatrix(targetIndex: number, worldMatrix: number[], context?: any): number[] {
        if (!this.enabled) return worldMatrix;

        const filter = this.getFilter(targetIndex);
        const stability = context?.stability ?? 1.0;

        // Dynamic Cutoff: If points are very stable (1.0), use higher cutoff (less responsiveness loss).
        // If points are unstable (0.3), use much lower cutoff (heavy smoothing).
        // We use a squared curve for even more aggressive suppression of jitter on unstable points.
        const dynamicMinCutOff = this.minCutOff * (0.05 + Math.pow(stability, 2) * 0.95);
        filter.minCutOff = dynamicMinCutOff;
        filter.beta = this.beta;

        return filter.filter(Date.now(), worldMatrix);
    }

    onUpdate(data: any) {
        if (data.type === "reset" && data.targetIndex !== undefined) {
            this.filters[data.targetIndex]?.reset();
        }
    }
}
