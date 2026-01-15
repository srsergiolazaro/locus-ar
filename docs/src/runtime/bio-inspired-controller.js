/**
 * Bio-Inspired Controller Adapter
 *
 * Wraps the standard Controller with Bio-Inspired Perception capabilities.
 * Provides significant performance improvements while maintaining API compatibility.
 *
 * Key features:
 * - Foveal attention: Processes only regions of interest at full resolution
 * - Predictive coding: Skips processing when scene is static
 * - Saccadic sampling: Strategic "glances" at high-saliency regions
 *
 * Usage:
 * ```javascript
 * import { BioInspiredController } from './bio-inspired-controller.js';
 *
 * const controller = new BioInspiredController({
 *   inputWidth: 640,
 *   inputHeight: 480,
 *   onUpdate: (data) => console.log(data),
 *   bioInspired: {
 *     enabled: true,
 *     aggressiveSkipping: true,
 *   }
 * });
 * ```
 */
import { Controller } from './controller.js';
import { BioInspiredEngine } from '../core/perception/index.js';
/**
 * Bio-Inspired Controller
 *
 * Extends the standard Controller with bio-inspired perception capabilities.
 */
class BioInspiredController extends Controller {
    bioEngine = null;
    bioEnabled = true;
    bioMetricsInterval = null;
    lastBioResult = null;
    constructor(options) {
        super(options);
        const bioOptions = options.bioInspired || {};
        this.bioEnabled = bioOptions.enabled !== false;
        if (this.bioEnabled) {
            // Initialize Bio-Inspired Engine
            const bioConfig = {};
            if (bioOptions.foveaRadiusRatio !== undefined) {
                bioConfig.FOVEA_RADIUS_RATIO = bioOptions.foveaRadiusRatio;
            }
            if (bioOptions.maxSaccades !== undefined) {
                bioConfig.MAX_SACCADES_PER_FRAME = bioOptions.maxSaccades;
            }
            if (bioOptions.aggressiveSkipping !== undefined) {
                bioConfig.ENABLE_SKIP_FRAMES = bioOptions.aggressiveSkipping;
                if (bioOptions.aggressiveSkipping) {
                    bioConfig.CHANGE_THRESHOLD = 0.03; // More aggressive
                }
            }
            this.bioEngine = new BioInspiredEngine(options.inputWidth, options.inputHeight, bioConfig);
        }
    }
    /**
     * Override processVideo to add bio-inspired perception
     */
    processVideo(input) {
        if (!this.bioEnabled || !this.bioEngine) {
            return super.processVideo(input);
        }
        if (this.processingVideo)
            return;
        this.processingVideo = true;
        // Reset tracking states
        this.trackingStates = [];
        for (let i = 0; i < (this.markerDimensions?.length || 0); i++) {
            this.trackingStates.push({
                showing: false,
                isTracking: false,
                currentModelViewTransform: null,
                trackCount: 0,
                trackMiss: 0,
            });
        }
        const startProcessing = async () => {
            while (this.processingVideo) {
                const inputData = this.inputLoader.loadInput(input);
                // Get current tracking state for bio engine
                const activeTracking = this.trackingStates.find(s => s.isTracking);
                const trackingState = activeTracking ? {
                    isTracking: true,
                    activeOctave: activeTracking.lastOctaveIndex, // Tracked octave index
                    worldMatrix: activeTracking.currentModelViewTransform
                        ? this._flattenMatrix(activeTracking.currentModelViewTransform)
                        : null
                } : null;
                // Process through bio-inspired engine
                const bioResult = this.bioEngine.process(inputData, trackingState || undefined);
                this.lastBioResult = bioResult;
                // If bio engine says we can skip, use prediction
                if (bioResult.skipped && activeTracking?.isTracking) {
                    // Use predicted state
                    this._handleSkippedFrame(activeTracking, bioResult);
                }
                else {
                    // Normal processing with attention regions
                    await this._processWithAttention(input, inputData, bioResult);
                }
                // Wait for next frame
                if (typeof requestAnimationFrame !== 'undefined') {
                    await new Promise(requestAnimationFrame);
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, 16));
                }
            }
        };
        startProcessing();
    }
    /**
     * Handle a skipped frame using prediction
     * @private
     */
    _handleSkippedFrame(trackingState, bioResult) {
        // Use predicted matrix
        if (bioResult.prediction && bioResult.prediction.worldMatrix) {
            trackingState.currentModelViewTransform = this._unflattenMatrix(bioResult.prediction.worldMatrix);
        }
        // Notify with skipped status
        const worldMatrix = trackingState.currentModelViewTransform
            ? this._glModelViewMatrix(trackingState.currentModelViewTransform, 0)
            : null;
        this.onUpdate?.({
            type: 'updateMatrix',
            targetIndex: 0,
            worldMatrix: worldMatrix ? this.featureManager.applyWorldMatrixFilters(0, worldMatrix, { stability: 0.9 }) : null,
            skipped: true,
            bioMetrics: this.bioEngine?.getMetrics(),
        });
        this.onUpdate?.({ type: 'processDone' });
    }
    /**
     * Process frame using bio-inspired attention regions
     * @private
     */
    async _processWithAttention(input, inputData, bioResult) {
        const nTracking = this.trackingStates.reduce((acc, s) => acc + (s.isTracking ? 1 : 0), 0);
        // Detection phase - use primary attention region for efficiency
        if (nTracking < this.maxTrack) {
            const matchingIndexes = this.trackingStates
                .map((s, i) => ({ state: s, index: i }))
                .filter(({ state, index }) => !state.isTracking &&
                (this.interestedTargetIndex === -1 || this.interestedTargetIndex === index))
                .map(({ index }) => index);
            if (matchingIndexes.length > 0) {
                // Use full input for detection (bio engine already optimized upstream processing)
                const { targetIndex: matchedTargetIndex, modelViewTransform, featurePoints } = await this._detectAndMatch(inputData, matchingIndexes, bioResult.octavesToProcess || null);
                if (matchedTargetIndex !== -1) {
                    this.trackingStates[matchedTargetIndex].isTracking = true;
                    this.trackingStates[matchedTargetIndex].currentModelViewTransform = modelViewTransform;
                    // Update bio engine fovea to focus on detected target
                    if (bioResult.attentionRegions?.[0]) {
                        this.bioEngine?.reset();
                    }
                }
                this.onUpdate?.({ type: 'featurePoints', featurePoints });
            }
        }
        // Tracking phase
        for (let i = 0; i < this.trackingStates.length; i++) {
            const trackingState = this.trackingStates[i];
            if (trackingState.isTracking) {
                const result = await this._trackAndUpdate(inputData, trackingState.currentModelViewTransform, i);
                if (!result || !result.modelViewTransform) {
                    trackingState.isTracking = false;
                    trackingState.screenCoords = result?.screenCoords || [];
                    trackingState.reliabilities = result?.reliabilities || [];
                    trackingState.stabilities = result?.stabilities || [];
                }
                else {
                    trackingState.currentModelViewTransform = result.modelViewTransform;
                    trackingState.screenCoords = result.screenCoords;
                    trackingState.reliabilities = result.reliabilities;
                    trackingState.stabilities = result.stabilities;
                    trackingState.deformedMesh = result.deformedMesh;
                }
            }
            const wasShowing = trackingState.showing;
            trackingState.showing = this.featureManager.shouldShow(i, trackingState.isTracking);
            if (wasShowing && !trackingState.showing) {
                trackingState.trackingMatrix = null;
                this.featureManager.notifyUpdate({ type: 'reset', targetIndex: i });
            }
            // Emit update
            if (trackingState.showing || trackingState.screenCoords?.length > 0 || (wasShowing && !trackingState.showing)) {
                const worldMatrix = trackingState.showing
                    ? this._glModelViewMatrix(trackingState.currentModelViewTransform, i)
                    : null;
                let finalMatrix = null;
                if (worldMatrix) {
                    const stabilities = trackingState.stabilities || [];
                    const avgStability = stabilities.length > 0
                        ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length
                        : 0;
                    finalMatrix = this.featureManager.applyWorldMatrixFilters(i, worldMatrix, { stability: avgStability });
                    trackingState.trackingMatrix = finalMatrix;
                    const isInputRotated = input.width === this.inputHeight && input.height === this.inputWidth;
                    if (isInputRotated) {
                        const rotationFeature = this.featureManager.getFeature('auto-rotation');
                        if (rotationFeature) {
                            finalMatrix = rotationFeature.rotate(finalMatrix);
                        }
                    }
                }
                this.onUpdate?.({
                    type: 'updateMatrix',
                    targetIndex: i,
                    worldMatrix: finalMatrix,
                    modelViewTransform: trackingState.currentModelViewTransform,
                    screenCoords: trackingState.screenCoords,
                    reliabilities: trackingState.reliabilities,
                    stabilities: trackingState.stabilities,
                    deformedMesh: trackingState.deformedMesh,
                    bioMetrics: this.bioEngine?.getMetrics(),
                    foveaCenter: bioResult.foveaCenter,
                    pixelsSaved: bioResult.pixelsSaved,
                });
            }
        }
        this.onUpdate?.({ type: 'processDone' });
    }
    /**
     * Detect and match features, optionally limited to specific octaves
     */
    async _detectAndMatch(inputData, targetIndexes, octavesToProcess = null) {
        // 🚀 NANITE-STYLE: Estimate scale for filtered matching
        let predictedScale = undefined;
        for (const state of this.trackingStates) {
            if (state.isTracking && state.currentModelViewTransform) {
                const m = state.currentModelViewTransform;
                predictedScale = Math.sqrt(m[0][0] ** 2 + m[1][0] ** 2 + m[2][0] ** 2);
                break;
            }
        }
        const { targetIndex, modelViewTransform, screenCoords, worldCoords, featurePoints } = await this._workerMatch(null, // No feature points, worker will detect from inputData
        targetIndexes, inputData, predictedScale, octavesToProcess);
        return { targetIndex, modelViewTransform, screenCoords, worldCoords, featurePoints };
    }
    /**
     * Communicate with worker for matching phase
     */
    _workerMatch(featurePoints, targetIndexes, inputData = null, expectedScale, octavesToProcess = null) {
        return new Promise((resolve) => {
            if (!this.worker) {
                // If no feature points but we have input data, detect first
                let fpPromise;
                if (!featurePoints && inputData) {
                    fpPromise = Promise.resolve(this.fullDetector.detect(inputData, { octavesToProcess }).featurePoints);
                }
                else {
                    fpPromise = Promise.resolve(featurePoints);
                }
                fpPromise.then(fp => {
                    this._matchOnMainThread(fp, targetIndexes, expectedScale).then(resolve);
                }).catch(() => resolve({ targetIndex: -1 }));
                return;
            }
            const timeout = setTimeout(() => {
                this.workerMatchDone = null;
                resolve({ targetIndex: -1 });
            }, 1000);
            this.workerMatchDone = (data) => {
                clearTimeout(timeout);
                this.workerMatchDone = null;
                resolve(data);
            };
            if (inputData) {
                this.worker.postMessage({ type: "match", inputData, targetIndexes, octavesToProcess, expectedScale });
            }
            else {
                this.worker.postMessage({ type: "match", featurePoints: featurePoints, targetIndexes, expectedScale });
            }
        });
    }
    /**
     * Override _trackAndUpdate to capture active octave for the next frame's orchestration
     */
    async _trackAndUpdate(inputData, lastModelViewTransform, targetIndex) {
        const result = await super._trackAndUpdate(inputData, lastModelViewTransform, targetIndex);
        if (result && result.octaveIndex !== undefined) {
            this.trackingStates[targetIndex].lastOctaveIndex = result.octaveIndex;
        }
        return result;
    }
    /**
     * Flatten a 3x4 matrix to Float32Array
     * @private
     */
    _flattenMatrix(matrix) {
        const result = new Float32Array(16);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = matrix[i][j];
            }
        }
        result[12] = 0;
        result[13] = 0;
        result[14] = 0;
        result[15] = 1;
        return result;
    }
    /**
     * Unflatten Float32Array to 3x4 matrix
     * @private
     */
    _unflattenMatrix(flat) {
        return [
            [flat[0], flat[1], flat[2], flat[3]],
            [flat[4], flat[5], flat[6], flat[7]],
            [flat[8], flat[9], flat[10], flat[11]],
        ];
    }
    /**
     * Get bio-inspired engine metrics
     */
    getBioMetrics() {
        return this.bioEngine?.getMetrics() || null;
    }
    /**
     * Get last bio processing result
     */
    getLastBioResult() {
        return this.lastBioResult;
    }
    /**
     * Enable/disable bio-inspired processing dynamically
     */
    setBioEnabled(enabled) {
        this.bioEnabled = enabled;
        if (enabled && !this.bioEngine) {
            this.bioEngine = new BioInspiredEngine(this.inputWidth, this.inputHeight);
        }
    }
    /**
     * Configure bio-inspired engine at runtime
     */
    configureBio(options) {
        this.bioEngine?.configure(options);
    }
    /**
     * Override dispose to clean up bio engine
     */
    dispose() {
        super.dispose();
        this.bioEngine = null;
        if (this.bioMetricsInterval) {
            clearInterval(this.bioMetricsInterval);
        }
    }
}
export { BioInspiredController };
