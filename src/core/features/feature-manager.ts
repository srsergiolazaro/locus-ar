import { ControllerFeature, FeatureContext } from "./feature-base.js";

export class FeatureManager {
    private features: ControllerFeature[] = [];

    addFeature(feature: ControllerFeature) {
        this.features.push(feature);
    }

    getFeature<T extends ControllerFeature>(id: string): T | undefined {
        return this.features.find(f => f.id === id) as T;
    }

    init(context: FeatureContext) {
        for (const feature of this.features) {
            if (feature.enabled && feature.init) {
                feature.init(context);
            }
        }
    }

    beforeProcess(inputData: any) {
        for (const feature of this.features) {
            if (feature.enabled && feature.beforeProcess) {
                feature.beforeProcess(inputData);
            }
        }
    }

    applyWorldMatrixFilters(targetIndex: number, worldMatrix: number[], context?: any): number[] {
        let result = worldMatrix;
        for (const feature of this.features) {
            if (feature.enabled && feature.filterWorldMatrix) {
                result = feature.filterWorldMatrix(targetIndex, result, context);
            }
        }
        return result;
    }

    shouldShow(targetIndex: number, isTracking: boolean): boolean {
        let show = isTracking;
        for (const feature of this.features) {
            if (feature.enabled && feature.shouldShow) {
                show = feature.shouldShow(targetIndex, isTracking);
            }
        }
        return show;
    }

    notifyUpdate(data: any) {
        for (const feature of this.features) {
            if (feature.enabled && feature.onUpdate) {
                feature.onUpdate(data);
            }
        }
    }

    dispose() {
        for (const feature of this.features) {
            if (feature.dispose) {
                feature.dispose();
            }
        }
    }
}
