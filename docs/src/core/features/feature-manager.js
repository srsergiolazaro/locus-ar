export class FeatureManager {
    features = [];
    addFeature(feature) {
        this.features.push(feature);
    }
    getFeature(id) {
        return this.features.find(f => f.id === id);
    }
    init(context) {
        for (const feature of this.features) {
            if (feature.enabled && feature.init) {
                feature.init(context);
            }
        }
    }
    beforeProcess(inputData) {
        for (const feature of this.features) {
            if (feature.enabled && feature.beforeProcess) {
                feature.beforeProcess(inputData);
            }
        }
    }
    applyWorldMatrixFilters(targetIndex, worldMatrix, context) {
        let result = worldMatrix;
        for (const feature of this.features) {
            if (feature.enabled && feature.filterWorldMatrix) {
                result = feature.filterWorldMatrix(targetIndex, result, context);
            }
        }
        return result;
    }
    shouldShow(targetIndex, isTracking) {
        let show = isTracking;
        for (const feature of this.features) {
            if (feature.enabled && feature.shouldShow) {
                show = feature.shouldShow(targetIndex, isTracking);
            }
        }
        return show;
    }
    notifyUpdate(data) {
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
