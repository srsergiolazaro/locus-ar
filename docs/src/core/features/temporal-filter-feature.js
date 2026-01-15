export class TemporalFilterFeature {
    id = "temporal-filter";
    name = "Temporal Filter";
    description = "Provides warmup tolerance (to avoid false positives) and miss tolerance (to maintain tracking during brief occlusions).";
    enabled = true;
    states = [];
    warmupTolerance;
    missTolerance;
    onToggleShowing;
    constructor(warmup = 2, miss = 5, onToggleShowing) {
        this.warmupTolerance = warmup;
        this.missTolerance = miss;
        this.onToggleShowing = onToggleShowing;
    }
    getState(targetIndex) {
        if (!this.states[targetIndex]) {
            this.states[targetIndex] = {
                showing: false,
                trackCount: 0,
                trackMiss: 0,
            };
        }
        return this.states[targetIndex];
    }
    shouldShow(targetIndex, isTracking) {
        if (!this.enabled)
            return isTracking;
        const state = this.getState(targetIndex);
        if (!state.showing) {
            if (isTracking) {
                state.trackMiss = 0;
                state.trackCount += 1;
                if (state.trackCount > this.warmupTolerance) {
                    state.showing = true;
                    this.onToggleShowing?.(targetIndex, true);
                }
            }
            else {
                state.trackCount = 0;
            }
        }
        else {
            if (!isTracking) {
                state.trackCount = 0;
                state.trackMiss += 1;
                if (state.trackMiss > this.missTolerance) {
                    state.showing = false;
                    this.onToggleShowing?.(targetIndex, false);
                }
            }
            else {
                state.trackMiss = 0;
            }
        }
        return state.showing;
    }
}
