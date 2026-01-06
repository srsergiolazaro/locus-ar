import { Tracker } from "./tracker/tracker.js";
import { OfflineCompiler as Compiler } from "./offline-compiler.js";
import { InputLoader } from "./input-loader.js";
import { FeatureManager } from "./features/feature-manager.js";
import { OneEuroFilterFeature } from "./features/one-euro-filter-feature.js";
import { TemporalFilterFeature } from "./features/temporal-filter-feature.js";
import { AutoRotationFeature } from "./features/auto-rotation-feature.js";
import { DetectorLite } from "./detector/detector-lite.js";

let ControllerWorker: any;

// Conditional import for worker to avoid crash in non-vite environments
const getControllerWorker = async () => {
    if (typeof Worker === 'undefined') return null;
    try {
        // @ts-ignore
        const workerModule = await import("./controller.worker.js?worker&inline");
        return workerModule.default;
    } catch (e) {
        return null;
    }
};
ControllerWorker = await getControllerWorker();

const DEFAULT_FILTER_CUTOFF = 0.5;
const DEFAULT_FILTER_BETA = 0.1;
const DEFAULT_WARMUP_TOLERANCE = 2; // Instant detection
const DEFAULT_MISS_TOLERANCE = 1;   // Immediate response to tracking loss
const WORKER_TIMEOUT_MS = 1000;    // Prevent worker hangs from killing the loop

let loopIdCounter = 0;

export interface ControllerOptions {
    inputWidth: number;
    inputHeight: number;
    onUpdate?: ((data: any) => void) | null;
    debugMode?: boolean;
    maxTrack?: number;
    warmupTolerance?: number | null;
    missTolerance?: number | null;
    filterMinCF?: number | null;
    filterBeta?: number | null;
    worker?: any;
}

class Controller {
    inputWidth: number;
    inputHeight: number;
    maxTrack: number;
    inputLoader: InputLoader;
    markerDimensions: any[] | null = null;
    onUpdate: ((data: any) => void) | null;
    debugMode: boolean;
    processingVideo: boolean = false;
    interestedTargetIndex: number = -1;
    trackingStates: any[] = [];
    worker: any;
    projectionTransform: number[][];
    projectionMatrix: number[];
    tracker: Tracker | null = null;
    matchingDataList: any;
    workerMatchDone: ((data: any) => void) | null = null;
    workerTrackDone: ((data: any) => void) | null = null;
    mainThreadMatcher: any;
    mainThreadEstimator: any;
    featureManager: FeatureManager;
    fullDetector: DetectorLite | null = null;

    constructor({
        inputWidth,
        inputHeight,
        onUpdate = null,
        debugMode = false,
        maxTrack = 1,
        warmupTolerance = null,
        missTolerance = null,
        filterMinCF = null,
        filterBeta = null,
        worker = null,
    }: ControllerOptions) {
        this.inputWidth = inputWidth;
        this.inputHeight = inputHeight;
        this.maxTrack = maxTrack;

        this.featureManager = new FeatureManager();
        this.featureManager.addFeature(new OneEuroFilterFeature(
            filterMinCF === null ? DEFAULT_FILTER_CUTOFF : filterMinCF,
            filterBeta === null ? DEFAULT_FILTER_BETA : filterBeta
        ));
        this.featureManager.addFeature(new TemporalFilterFeature(
            warmupTolerance === null ? DEFAULT_WARMUP_TOLERANCE : warmupTolerance,
            missTolerance === null ? DEFAULT_MISS_TOLERANCE : missTolerance
        ));
        this.featureManager.addFeature(new AutoRotationFeature());
        // User wants "sin recortes", so we don't add CropDetectionFeature

        this.inputLoader = new InputLoader(this.inputWidth, this.inputHeight);
        this.onUpdate = onUpdate;
        this.debugMode = debugMode;
        this.worker = worker;
        if (this.worker) this._setupWorkerListener();

        // Moonshot: Full frame detector for better sensitivity
        this.fullDetector = new DetectorLite(this.inputWidth, this.inputHeight, { useLSH: true });

        this.featureManager.init({
            inputWidth: this.inputWidth,
            inputHeight: this.inputHeight,
            projectionTransform: [], // Will be set below
            debugMode: this.debugMode
        });

        const near = 10;
        const far = 100000;
        const fovy = (45.0 * Math.PI) / 180;
        const f = this.inputHeight / 2 / Math.tan(fovy / 2);

        this.projectionTransform = [
            [f, 0, this.inputWidth / 2],
            [0, f, this.inputHeight / 2],
            [0, 0, 1],
        ];

        this.featureManager.init({
            inputWidth: this.inputWidth,
            inputHeight: this.inputHeight,
            projectionTransform: this.projectionTransform,
            debugMode: this.debugMode
        });

        this.projectionMatrix = this._glProjectionMatrix({
            projectionTransform: this.projectionTransform,
            width: this.inputWidth,
            height: this.inputHeight,
            near: near,
            far: far,
        });
    }

    _setupWorkerListener() {
        if (!this.worker) return;
        this.worker.onmessage = (e: any) => {
            if (e.data.type === "matchDone" && this.workerMatchDone !== null) {
                this.workerMatchDone(e.data);
            }
            if (e.data.type === "trackUpdateDone" && this.workerTrackDone !== null) {
                this.workerTrackDone(e.data);
            }
        };
    }

    _ensureWorker() {
        if (this.worker) return;
        if (ControllerWorker && typeof Worker !== 'undefined') {
            this.worker = new ControllerWorker();
            this._setupWorkerListener();
        }
    }

    async addImageTargets(fileURLs: string | string[]) {
        const urls = Array.isArray(fileURLs) ? fileURLs : [fileURLs];
        const buffers = await Promise.all(
            urls.map(async (url) => {
                const response = await fetch(url);
                return response.arrayBuffer();
            })
        );
        return this.addImageTargetsFromBuffers(buffers);
    }

    addImageTargetsFromBuffers(buffers: ArrayBuffer[]) {
        const allTrackingData: any[] = [];
        const allMatchingData: any[] = [];
        const allDimensions: any[] = [];

        for (const buffer of buffers) {
            const compiler = new Compiler();
            const result = compiler.importData(buffer);
            const dataList = (result as any).dataList || [];

            for (const item of dataList) {
                allMatchingData.push(item.matchingData);
                allTrackingData.push(item.trackingData);
                allDimensions.push([item.targetImage.width, item.targetImage.height]);
            }
        }

        this.tracker = new Tracker(
            allDimensions,
            allTrackingData,
            this.projectionTransform,
            this.inputWidth,
            this.inputHeight,
            this.debugMode,
        );

        this._ensureWorker();
        if (this.worker) {
            this.worker.postMessage({
                type: "setup",
                inputWidth: this.inputWidth,
                inputHeight: this.inputHeight,
                projectionTransform: this.projectionTransform,
                debugMode: this.debugMode,
                matchingDataList: allMatchingData,
            });
        }

        this.markerDimensions = allDimensions;
        this.matchingDataList = allMatchingData;
        return { dimensions: allDimensions, matchingDataList: allMatchingData, trackingDataList: allTrackingData };
    }

    addImageTargetsFromBuffer(buffer: ArrayBuffer) {
        return this.addImageTargetsFromBuffers([buffer]);
    }

    dispose() {
        this.stopProcessVideo();
        if (this.worker) {
            this.worker.postMessage({ type: "dispose" });
            this.worker = null;
        }
    }

    dummyRun(input: any) {
        const inputData = this.inputLoader.loadInput(input);
        this.fullDetector?.detect(inputData);
        this.tracker!.dummyRun(inputData);
    }

    getProjectionMatrix() {
        return this.projectionMatrix;
    }

    getRotatedZ90Matrix(m: number[]) {
        return [
            -m[1], m[0], m[2], m[3],
            -m[5], m[4], m[6], m[7],
            -m[9], m[8], m[10], m[11],
            -m[13], m[12], m[14], m[15],
        ];
    }

    getWorldMatrix(modelViewTransform: number[][], targetIndex: number) {
        return this._glModelViewMatrix(modelViewTransform, targetIndex);
    }

    async _detectAndMatch(inputData: any, targetIndexes: number[]) {
        const { featurePoints } = this.fullDetector!.detect(inputData);
        const { targetIndex: matchedTargetIndex, modelViewTransform } = await this._workerMatch(
            featurePoints,
            targetIndexes,
        );
        return { targetIndex: matchedTargetIndex, modelViewTransform };
    }

    async _trackAndUpdate(inputData: any, lastModelViewTransform: number[][], targetIndex: number) {
        const { worldCoords, screenCoords, reliabilities, indices = [], octaveIndex = 0 } = this.tracker!.track(
            inputData,
            lastModelViewTransform,
            targetIndex,
        );

        const state = this.trackingStates[targetIndex];
        if (!state.pointStabilities) state.pointStabilities = [];
        if (!state.pointStabilities[octaveIndex]) {
            // Initialize stabilities for this octave if not exists
            const numPoints = (this.tracker as any).prebuiltData[targetIndex][octaveIndex].px.length;
            state.pointStabilities[octaveIndex] = new Float32Array(numPoints).fill(0.5); // Start at 0.5
        }

        const stabilities = state.pointStabilities[octaveIndex];
        const currentStabilities: number[] = [];

        // Update all points in this octave
        for (let i = 0; i < stabilities.length; i++) {
            const isTracked = indices.includes(i);
            if (isTracked) {
                stabilities[i] = Math.min(1.0, stabilities[i] + 0.35); // Fast recovery (approx 3 frames)
            } else {
                stabilities[i] = Math.max(0.0, stabilities[i] - 0.12); // Slightly more forgiving loss
            }
        }

        // Collect stabilities and FILTER OUT excessive flickerers (Dead Zone)
        const filteredWorldCoords = [];
        const filteredScreenCoords = [];
        const filteredStabilities = [];

        for (let i = 0; i < indices.length; i++) {
            const s = stabilities[indices[i]];
            if (s > 0.3) { // Hard Cutoff: points with <30% stability are ignored
                filteredWorldCoords.push(worldCoords[i]);
                filteredScreenCoords.push(screenCoords[i]);
                filteredStabilities.push(s);
            }
        }

        // STRICT QUALITY CHECK: Prevent "sticky" tracking on background noise.
        // We require a minimum number of high-confidence AND STABLE points.
        const stableAndReliable = reliabilities.filter((r: number, idx: number) => r > 0.75 && stabilities[indices[idx]] > 0.5).length;

        if (stableAndReliable < 6 || filteredWorldCoords.length < 8) {
            return { modelViewTransform: null, screenCoords: [], reliabilities: [], stabilities: [] };
        }

        const modelViewTransform = await this._workerTrackUpdate(lastModelViewTransform, {
            worldCoords: filteredWorldCoords,
            screenCoords: filteredScreenCoords,
            stabilities: filteredStabilities
        });

        return {
            modelViewTransform,
            screenCoords: filteredScreenCoords,
            reliabilities: reliabilities.filter((_, idx) => stabilities[indices[idx]] > 0.3),
            stabilities: filteredStabilities
        };
    }

    processVideo(input: any) {
        if (this.processingVideo) return;
        this.processingVideo = true;
        const currentLoopId = ++loopIdCounter; // Added for ghost loop prevention

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
            while (true) {
                if (!this.processingVideo || currentLoopId !== loopIdCounter) break;

                const inputData = this.inputLoader.loadInput(input);
                const nTracking = this.trackingStates.reduce((acc, s) => acc + (!!s.isTracking ? 1 : 0), 0);

                if (nTracking < this.maxTrack) {
                    const matchingIndexes = [];
                    for (let i = 0; i < this.trackingStates.length; i++) {
                        const trackingState = this.trackingStates[i];
                        if (trackingState.isTracking === true) continue;
                        if (this.interestedTargetIndex !== -1 && this.interestedTargetIndex !== i) continue;
                        matchingIndexes.push(i);
                    }

                    const { targetIndex: matchedTargetIndex, modelViewTransform } =
                        await this._detectAndMatch(inputData, matchingIndexes);

                    if (matchedTargetIndex !== -1) {
                        this.trackingStates[matchedTargetIndex].isTracking = true;
                        this.trackingStates[matchedTargetIndex].currentModelViewTransform = modelViewTransform;
                    }
                }

                for (let i = 0; i < this.trackingStates.length; i++) {
                    const trackingState = this.trackingStates[i];

                    if (trackingState.isTracking) {
                        const result = await this._trackAndUpdate(
                            inputData,
                            trackingState.currentModelViewTransform,
                            i,
                        );
                        if (result === null || result.modelViewTransform === null) {
                            trackingState.isTracking = false;
                            trackingState.screenCoords = [];
                            trackingState.reliabilities = [];
                            trackingState.stabilities = [];
                        } else {
                            trackingState.currentModelViewTransform = result.modelViewTransform;
                            trackingState.screenCoords = result.screenCoords;
                            trackingState.reliabilities = result.reliabilities;
                            trackingState.stabilities = result.stabilities;
                        }
                    }

                    const wasShowing = trackingState.showing;
                    trackingState.showing = this.featureManager.shouldShow(i, trackingState.isTracking);

                    if (wasShowing && !trackingState.showing) {
                        trackingState.trackingMatrix = null;
                        this.onUpdate && this.onUpdate({ type: "updateMatrix", targetIndex: i, worldMatrix: null });
                        this.featureManager.notifyUpdate({ type: "reset", targetIndex: i });
                    }

                    if (trackingState.showing) {
                        const worldMatrix = this._glModelViewMatrix(trackingState.currentModelViewTransform, i);
                        const filteredMatrix = this.featureManager.applyWorldMatrixFilters(i, worldMatrix);
                        trackingState.trackingMatrix = filteredMatrix;

                        let finalMatrix = [...filteredMatrix];

                        const isInputRotated = input.width === this.inputHeight && input.height === this.inputWidth;
                        if (isInputRotated) {
                            const rotationFeature = this.featureManager.getFeature<AutoRotationFeature>("auto-rotation");
                            if (rotationFeature) {
                                finalMatrix = rotationFeature.rotate(finalMatrix);
                            }
                        }

                        this.onUpdate && this.onUpdate({
                            type: "updateMatrix",
                            targetIndex: i,
                            worldMatrix: finalMatrix,
                            modelViewTransform: trackingState.currentModelViewTransform,
                            screenCoords: trackingState.screenCoords,
                            reliabilities: trackingState.reliabilities,
                            stabilities: trackingState.stabilities
                        });
                    }
                }

                this.onUpdate && this.onUpdate({ type: "processDone" });

                if (typeof requestAnimationFrame !== "undefined") {
                    await new Promise(requestAnimationFrame);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 16));
                }
            }
        };
        startProcessing();
    }

    stopProcessVideo() {
        this.processingVideo = false;
    }

    async detect(input: any) {
        const inputData = this.inputLoader.loadInput(input);
        const { featurePoints } = this.fullDetector!.detect(inputData);
        return { featurePoints, debugExtra: {} };
    }

    async match(featurePoints: any, targetIndex: number) {
        const { targetIndex: matchedTargetIndex, modelViewTransform, screenCoords, worldCoords, debugExtra } = await this._workerMatch(featurePoints, [
            targetIndex,
        ]);
        return { targetIndex: matchedTargetIndex, modelViewTransform, screenCoords, worldCoords, debugExtra };
    }

    async track(input: any, modelViewTransform: number[][], targetIndex: number) {
        const inputData = this.inputLoader.loadInput(input);
        return this.tracker!.track(inputData, modelViewTransform, targetIndex);
    }

    async trackUpdate(modelViewTransform: number[][], trackFeatures: any) {
        if (trackFeatures.worldCoords.length < 4) return null;
        return this._workerTrackUpdate(modelViewTransform, trackFeatures);
    }

    _workerMatch(featurePoints: any, targetIndexes: number[]): Promise<any> {
        return new Promise((resolve) => {
            if (!this.worker) {
                this._matchOnMainThread(featurePoints, targetIndexes).then(resolve).catch(() => resolve({ targetIndex: -1 }));
                return;
            }

            const timeout = setTimeout(() => {
                this.workerMatchDone = null;
                resolve({ targetIndex: -1 });
            }, WORKER_TIMEOUT_MS);

            this.workerMatchDone = (data: any) => {
                clearTimeout(timeout);
                this.workerMatchDone = null;
                resolve({
                    targetIndex: data.targetIndex,
                    modelViewTransform: data.modelViewTransform,
                    screenCoords: data.screenCoords,
                    worldCoords: data.worldCoords,
                    debugExtra: data.debugExtra,
                });
            };
            this.worker.postMessage({ type: "match", featurePoints: featurePoints, targetIndexes });
        });
    }

    async _matchOnMainThread(featurePoints: any, targetIndexes: number[]) {
        if (!this.mainThreadMatcher) {
            const { Matcher } = await import("./matching/matcher.js");
            const { Estimator } = await import("./estimation/estimator.js");
            this.mainThreadMatcher = new Matcher(this.inputWidth, this.inputHeight, this.debugMode);
            this.mainThreadEstimator = new Estimator(this.projectionTransform);
        }

        let matchedTargetIndex = -1;
        let matchedModelViewTransform = null;
        let matchedScreenCoords = null;
        let matchedWorldCoords = null;
        let matchedDebugExtra = null;

        for (let i = 0; i < targetIndexes.length; i++) {
            const matchingIndex = targetIndexes[i];
            const { keyframeIndex, screenCoords, worldCoords, debugExtra } = this.mainThreadMatcher.matchDetection(
                this.matchingDataList[matchingIndex],
                featurePoints,
            );
            matchedDebugExtra = debugExtra;

            if (keyframeIndex !== -1) {
                const modelViewTransform = this.mainThreadEstimator.estimate({ screenCoords, worldCoords });
                if (modelViewTransform) {
                    matchedTargetIndex = matchingIndex;
                    matchedModelViewTransform = modelViewTransform;
                    matchedScreenCoords = screenCoords;
                    matchedWorldCoords = worldCoords;
                }
                break;
            }
        }

        return {
            targetIndex: matchedTargetIndex,
            modelViewTransform: matchedModelViewTransform,
            screenCoords: matchedScreenCoords,
            worldCoords: matchedWorldCoords,
            debugExtra: matchedDebugExtra,
        };
    }

    _workerTrackUpdate(modelViewTransform: number[][], trackingFeatures: any): Promise<any> {
        return new Promise((resolve) => {
            if (!this.worker) {
                this._trackUpdateOnMainThread(modelViewTransform, trackingFeatures).then(resolve).catch(() => resolve(null));
                return;
            }

            const timeout = setTimeout(() => {
                this.workerTrackDone = null;
                resolve(null);
            }, WORKER_TIMEOUT_MS);

            this.workerTrackDone = (data: any) => {
                clearTimeout(timeout);
                this.workerTrackDone = null;
                resolve(data.modelViewTransform);
            };
            const { worldCoords, screenCoords, stabilities } = trackingFeatures;
            this.worker.postMessage({
                type: "trackUpdate",
                modelViewTransform,
                worldCoords,
                screenCoords,
                stabilities
            });
        });
    }

    async _trackUpdateOnMainThread(modelViewTransform: number[][], trackingFeatures: any) {
        if (!this.mainThreadEstimator) {
            const { Estimator } = await import("./estimation/estimator.js");
            this.mainThreadEstimator = new Estimator(this.projectionTransform);
        }

        const { worldCoords, screenCoords, stabilities } = trackingFeatures;
        return this.mainThreadEstimator.refineEstimate({
            initialModelViewTransform: modelViewTransform,
            worldCoords,
            screenCoords,
            stabilities
        });
    }

    _glModelViewMatrix(modelViewTransform: number[][], targetIndex: number) {
        const height = this.markerDimensions![targetIndex][1];
        return [
            modelViewTransform[0][0], -modelViewTransform[1][0], -modelViewTransform[2][0], 0,
            -modelViewTransform[0][1], modelViewTransform[1][1], modelViewTransform[2][1], 0,
            -modelViewTransform[0][2], modelViewTransform[1][2], modelViewTransform[2][2], 0,
            modelViewTransform[0][1] * height + modelViewTransform[0][3],
            -(modelViewTransform[1][1] * height + modelViewTransform[1][3]),
            -(modelViewTransform[2][1] * height + modelViewTransform[2][3]),
            1,
        ];
    }

    _glProjectionMatrix({ projectionTransform, width, height, near, far }: any) {
        const proj = [
            [(2 * projectionTransform[0][0]) / width, 0, -((2 * projectionTransform[0][2]) / width - 1), 0],
            [0, (2 * projectionTransform[1][1]) / height, -((2 * projectionTransform[1][2]) / height - 1), 0],
            [0, 0, -(far + near) / (far - near), (-2 * far * near) / (far - near)],
            [0, 0, -1, 0],
        ];
        const projMatrix = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                projMatrix.push(proj[j][i]);
            }
        }
        return projMatrix;
    }
}

export { Controller };
