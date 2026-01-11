/**
 * Scale Orchestrator
 * 
 * Manages which octaves should be processed based on the current tracking state.
 * Implements temporal consistency and interleave strategies to optimize performance.
 */
export class ScaleOrchestrator {
    constructor(numOctaves, options = {}) {
        this.numOctaves = numOctaves;
        this.options = {
            interleaveInterval: 10,
            hysteresis: 1, // Number of adjacent octaves to keep
            ...options
        };

        this.frameCount = 0;
        this.lastActiveOctave = -1;
        this.interleaveOctave = 0;
    }

    /**
     * Determine which octaves should be processed in the current frame
     * 
     * @param {Object} trackingState - Current state of tracking
     * @returns {number[]} Array of octave indices to process
     */
    getOctavesToProcess(trackingState = null) {
        this.frameCount++;

        // Case 1: No tracking or lost tracking -> Process all octaves
        if (!trackingState || !trackingState.isTracking || trackingState.activeOctave === undefined) {
            this.lastActiveOctave = -1;
            return Array.from({ length: this.numOctaves }, (_, i) => i);
        }

        const activeScale = trackingState.activeOctave;
        this.lastActiveOctave = activeScale;

        // Case 2: Active tracking -> Focus on current scale and neighbors
        const octaves = new Set();

        // Add current and adjacent scales (Hysteresis)
        for (let i = -this.options.hysteresis; i <= this.options.hysteresis; i++) {
            const octave = activeScale + i;
            if (octave >= 0 && octave < this.numOctaves) {
                octaves.add(octave);
            }
        }

        // Case 3: Interleave - Periodically check a distant octave to ensure we don't "drift"
        if (this.frameCount % this.options.interleaveInterval === 0) {
            this.interleaveOctave = (this.interleaveOctave + 1) % this.numOctaves;
            // If the interleave octave is already being processed, pick the next one
            if (octaves.has(this.interleaveOctave)) {
                this.interleaveOctave = (this.interleaveOctave + 1) % this.numOctaves;
            }
            octaves.add(this.interleaveOctave);

            if (this.options.debug) {
                console.log(`[ScaleOrchestrator] Interleave check on octave ${this.interleaveOctave}`);
            }
        }

        const result = Array.from(octaves).sort((a, b) => a - b);

        if (this.options.debug) {
            console.log(`[ScaleOrchestrator] Active: ${activeScale}, Processing: [${result.join(', ')}]`);
        }

        return result;
    }

    /**
     * Reset orchestrator state
     */
    reset() {
        this.frameCount = 0;
        this.lastActiveOctave = -1;
    }
}
