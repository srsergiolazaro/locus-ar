import { Tracker } from "./tracker/tracker.js";
import { CropDetector } from "./detector/crop-detector.js";
import { OfflineCompiler as Compiler } from "./offline-compiler.js";
import { InputLoader } from "./input-loader.js";
import { OneEuroFilter } from "../libs/one-euro-filter.js";

let ControllerWorker;

// Conditional import for worker to avoid crash in non-vite environments
try {
  const workerModule = await import("./controller.worker.js?worker&inline");
  ControllerWorker = workerModule.default;
} catch (e) {
  // Fallback for tests or other environments
  ControllerWorker = null;
}

const DEFAULT_FILTER_CUTOFF = 0.1; // Menor cutoff para filtrar más ruidos cuando está quieto
const DEFAULT_FILTER_BETA = 0.01;  // Beta bajo para suavizar movimientos rápidos

const DEFAULT_WARMUP_TOLERANCE = 8; // Más frames de calentamiento para asegurar estabilidad inicial

const DEFAULT_MISS_TOLERANCE = 2; // Reducido para que el objeto desaparezca más rápido tras pérdida

class Controller {
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
    worker = null, // Allow custom worker injection
  }) {
    this.inputWidth = inputWidth;
    this.inputHeight = inputHeight;
    this.maxTrack = maxTrack;
    this.filterMinCF = filterMinCF === null ? DEFAULT_FILTER_CUTOFF : filterMinCF;
    this.filterBeta = filterBeta === null ? DEFAULT_FILTER_BETA : filterBeta;
    this.warmupTolerance = warmupTolerance === null ? DEFAULT_WARMUP_TOLERANCE : warmupTolerance;
    this.missTolerance = missTolerance === null ? DEFAULT_MISS_TOLERANCE : missTolerance;
    this.cropDetector = new CropDetector(this.inputWidth, this.inputHeight, debugMode, true);
    this.inputLoader = new InputLoader(this.inputWidth, this.inputHeight);
    this.markerDimensions = null;
    this.onUpdate = onUpdate;
    this.debugMode = debugMode;
    this.processingVideo = false;
    this.interestedTargetIndex = -1;
    this.trackingStates = [];
    this.worker = worker;
    if (this.worker) this._setupWorkerListener();

    const near = 10;
    const far = 100000;
    const fovy = (45.0 * Math.PI) / 180;
    const f = this.inputHeight / 2 / Math.tan(fovy / 2);

    this.projectionTransform = [
      [f, 0, this.inputWidth / 2],
      [0, f, this.inputHeight / 2],
      [0, 0, 1],
    ];

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
    this.worker.onmessage = (e) => {
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
    if (ControllerWorker) {
      this.worker = new ControllerWorker();
      this._setupWorkerListener();
    }
  }

  /**
   * Load image targets from one or multiple .mind files
   * @param {string|string[]} fileURLs - Single URL or array of URLs to .mind files
   * @returns {Promise<{dimensions, matchingDataList, trackingDataList}>}
   */
  async addImageTargets(fileURLs) {
    const urls = Array.isArray(fileURLs) ? fileURLs : [fileURLs];

    // Fetch all .mind files in parallel
    const buffers = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url);
        return response.arrayBuffer();
      })
    );

    // Combine all buffers into a single target list
    return this.addImageTargetsFromBuffers(buffers);
  }

  /**
   * Load image targets from multiple ArrayBuffers
   * @param {ArrayBuffer[]} buffers - Array of .mind file buffers
   */
  addImageTargetsFromBuffers(buffers) {
    const allTrackingData = [];
    const allMatchingData = [];
    const allDimensions = [];

    for (const buffer of buffers) {
      const compiler = new Compiler();
      const { dataList } = compiler.importData(buffer);

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
    this.matchingDataList = allMatchingData; // Store for main-thread fallback
    return { dimensions: allDimensions, matchingDataList: allMatchingData, trackingDataList: allTrackingData };
  }

  /**
   * Load image targets from a single ArrayBuffer (backward compatible)
   * @param {ArrayBuffer} buffer - Single .mind file buffer
   */
  addImageTargetsFromBuffer(buffer) {
    return this.addImageTargetsFromBuffers([buffer]);
  }

  dispose() {
    this.stopProcessVideo();
    if (this.worker) {
      this.worker.postMessage({ type: "dispose" });
      this.worker = null;
    }
  }

  dummyRun(input) {
    const inputData = this.inputLoader.loadInput(input);
    this.cropDetector.detect(inputData);
    this.tracker.dummyRun(inputData);
  }

  getProjectionMatrix() {
    return this.projectionMatrix;
  }

  getRotatedZ90Matrix(m) {
    // rotate 90 degree along z-axis
    // rotation matrix
    // |  0  -1  0  0 |
    // |  1   0  0  0 |
    // |  0   0  1  0 |
    // |  0   0  0  1 |
    const rotatedMatrix = [
      -m[1],
      m[0],
      m[2],
      m[3],
      -m[5],
      m[4],
      m[6],
      m[7],
      -m[9],
      m[8],
      m[10],
      m[11],
      -m[13],
      m[12],
      m[14],
      m[15],
    ];
    return rotatedMatrix;
  }

  getWorldMatrix(modelViewTransform, targetIndex) {
    return this._glModelViewMatrix(modelViewTransform, targetIndex);
  }

  async _detectAndMatch(inputData, targetIndexes) {
    const { featurePoints } = this.cropDetector.detectMoving(inputData);
    const { targetIndex: matchedTargetIndex, modelViewTransform } = await this._workerMatch(
      featurePoints,
      targetIndexes,
    );
    return { targetIndex: matchedTargetIndex, modelViewTransform };
  }
  async _trackAndUpdate(inputData, lastModelViewTransform, targetIndex) {
    const { worldCoords, screenCoords } = this.tracker.track(
      inputData,
      lastModelViewTransform,
      targetIndex,
    );
    if (worldCoords.length < 6) return null; // Umbral de puntos mínimos para mantener el seguimiento
    const modelViewTransform = await this._workerTrackUpdate(lastModelViewTransform, {
      worldCoords,
      screenCoords,
    });
    return modelViewTransform;
  }

  processVideo(input) {
    if (this.processingVideo) return;

    this.processingVideo = true;

    this.trackingStates = [];
    for (let i = 0; i < this.markerDimensions.length; i++) {
      this.trackingStates.push({
        showing: false,
        isTracking: false,
        currentModelViewTransform: null,
        trackCount: 0,
        trackMiss: 0,
        filter: new OneEuroFilter({ minCutOff: this.filterMinCF, beta: this.filterBeta }),
      });
    }

    const startProcessing = async () => {
      while (true) {
        if (!this.processingVideo) break;

        const inputData = this.inputLoader.loadInput(input);

        const nTracking = this.trackingStates.reduce((acc, s) => {
          return acc + (!!s.isTracking ? 1 : 0);
        }, 0);

        // detect and match only if less then maxTrack
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

        // tracking update
        for (let i = 0; i < this.trackingStates.length; i++) {
          const trackingState = this.trackingStates[i];

          if (trackingState.isTracking) {
            let modelViewTransform = await this._trackAndUpdate(
              inputData,
              trackingState.currentModelViewTransform,
              i,
            );
            if (modelViewTransform === null) {
              trackingState.isTracking = false;
            } else {
              trackingState.currentModelViewTransform = modelViewTransform;
            }
          }

          // if not showing, then show it once it reaches warmup number of frames
          if (!trackingState.showing) {
            if (trackingState.isTracking) {
              trackingState.trackMiss = 0;
              trackingState.trackCount += 1;
              if (trackingState.trackCount > this.warmupTolerance) {
                trackingState.showing = true;
                trackingState.trackingMatrix = null;
                trackingState.filter.reset();
              }
            }
          }

          // if showing, then count miss, and hide it when reaches tolerance
          if (trackingState.showing) {
            if (!trackingState.isTracking) {
              trackingState.trackCount = 0;
              trackingState.trackMiss += 1;

              if (trackingState.trackMiss > this.missTolerance) {
                trackingState.showing = false;
                trackingState.trackingMatrix = null;
                this.onUpdate &&
                  this.onUpdate({ type: "updateMatrix", targetIndex: i, worldMatrix: null });
              }
            } else {
              trackingState.trackMiss = 0;
            }
          }

          // if showing, then call onUpdate, with world matrix
          if (trackingState.showing) {
            const worldMatrix = this._glModelViewMatrix(trackingState.currentModelViewTransform, i);
            trackingState.trackingMatrix = trackingState.filter.filter(Date.now(), worldMatrix);

            let clone = [];
            for (let j = 0; j < trackingState.trackingMatrix.length; j++) {
              clone[j] = trackingState.trackingMatrix[j];
            }

            const isInputRotated =
              input.width === this.inputHeight && input.height === this.inputWidth;
            if (isInputRotated) {
              clone = this.getRotatedZ90Matrix(clone);
            }

            this.onUpdate &&
              this.onUpdate({ type: "updateMatrix", targetIndex: i, worldMatrix: clone, modelViewTransform: trackingState.currentModelViewTransform });
          }
        }

        this.onUpdate && this.onUpdate({ type: "processDone" });

        // Use requestAnimationFrame if available, otherwise just wait briefly
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

  async detect(input) {
    const inputData = this.inputLoader.loadInput(input);
    const { featurePoints, debugExtra } = this.cropDetector.detect(inputData);
    return { featurePoints, debugExtra };
  }

  async match(featurePoints, targetIndex) {
    const { targetIndex: matchedTargetIndex, modelViewTransform, screenCoords, worldCoords, debugExtra } = await this._workerMatch(featurePoints, [
      targetIndex,
    ]);
    return { targetIndex: matchedTargetIndex, modelViewTransform, screenCoords, worldCoords, debugExtra };
  }

  async track(input, modelViewTransform, targetIndex) {
    const inputData = this.inputLoader.loadInput(input);
    const result = this.tracker.track(inputData, modelViewTransform, targetIndex);
    return result;
  }

  async trackUpdate(modelViewTransform, trackFeatures) {
    if (trackFeatures.worldCoords.length < 4) return null;
    const modelViewTransform2 = await this._workerTrackUpdate(modelViewTransform, trackFeatures);
    return modelViewTransform2;
  }

  _workerMatch(featurePoints, targetIndexes) {
    return new Promise((resolve) => {
      // If no worker available, process on main thread
      if (!this.worker) {
        this._matchOnMainThread(featurePoints, targetIndexes).then(resolve);
        return;
      }

      this.workerMatchDone = (data) => {
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

  async _matchOnMainThread(featurePoints, targetIndexes) {
    // Lazy initialize Matcher and Estimator for main thread
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

  _workerTrackUpdate(modelViewTransform, trackingFeatures) {
    return new Promise((resolve) => {
      // If no worker available, process on main thread
      if (!this.worker) {
        this._trackUpdateOnMainThread(modelViewTransform, trackingFeatures).then(resolve);
        return;
      }

      this.workerTrackDone = (data) => {
        resolve(data.modelViewTransform);
      };
      const { worldCoords, screenCoords } = trackingFeatures;
      this.worker.postMessage({
        type: "trackUpdate",
        modelViewTransform,
        worldCoords,
        screenCoords,
      });
    });
  }

  async _trackUpdateOnMainThread(modelViewTransform, trackingFeatures) {
    // Lazy initialize Estimator for main thread
    if (!this.mainThreadEstimator) {
      const { Estimator } = await import("./estimation/estimator.js");
      this.mainThreadEstimator = new Estimator(this.projectionTransform);
    }

    const { worldCoords, screenCoords } = trackingFeatures;
    const finalModelViewTransform = this.mainThreadEstimator.refineEstimate({
      initialModelViewTransform: modelViewTransform,
      worldCoords,
      screenCoords,
    });
    return finalModelViewTransform;
  }

  _glModelViewMatrix(modelViewTransform, targetIndex) {
    const height = this.markerDimensions[targetIndex][1];

    const openGLWorldMatrix = [
      modelViewTransform[0][0],
      -modelViewTransform[1][0],
      -modelViewTransform[2][0],
      0,
      -modelViewTransform[0][1],
      modelViewTransform[1][1],
      modelViewTransform[2][1],
      0,
      -modelViewTransform[0][2],
      modelViewTransform[1][2],
      modelViewTransform[2][2],
      0,
      modelViewTransform[0][1] * height + modelViewTransform[0][3],
      -(modelViewTransform[1][1] * height + modelViewTransform[1][3]),
      -(modelViewTransform[2][1] * height + modelViewTransform[2][3]),
      1,
    ];
    return openGLWorldMatrix;
  }

  _glProjectionMatrix({ projectionTransform, width, height, near, far }) {
    const proj = [
      [
        (2 * projectionTransform[0][0]) / width,
        0,
        -((2 * projectionTransform[0][2]) / width - 1),
        0,
      ],
      [
        0,
        (2 * projectionTransform[1][1]) / height,
        -((2 * projectionTransform[1][2]) / height - 1),
        0,
      ],
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
