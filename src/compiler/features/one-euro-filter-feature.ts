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

    filterWorldMatrix(targetIndex: number, worldMatrix: number[]): number[] {
        if (!this.enabled) return worldMatrix;
        const filter = this.getFilter(targetIndex);
        return filter.filter(Date.now(), worldMatrix);
    }

    onUpdate(data: any) {
        if (data.type === "reset" && data.targetIndex !== undefined) {
            this.filters[data.targetIndex]?.reset();
        }
    }
}
