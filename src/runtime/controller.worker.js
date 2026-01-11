import { Matcher } from "../core/matching/matcher.js";
import { Estimator } from "../core/estimation/estimator.js";
import { Tracker } from "../core/tracker/tracker.js";
import { DetectorLite } from "../core/detector/detector-lite.js";

let matchingDataList = null;
let debugMode = false;
let matcher = null;
let estimator = null;
let tracker = null;
let detector = null;

onmessage = (msg) => {
  const { data } = msg;

  switch (data.type) {
    case "setup":
      matchingDataList = data.matchingDataList;
      debugMode = data.debugMode;
      matcher = new Matcher(data.inputWidth, data.inputHeight, debugMode);
      estimator = new Estimator(data.projectionTransform);

      if (data.trackingDataList && data.markerDimensions) {
        tracker = new Tracker(
          data.markerDimensions,
          data.trackingDataList,
          data.projectionTransform,
          data.inputWidth,
          data.inputHeight,
          debugMode
        );
      }

      detector = new DetectorLite(data.inputWidth, data.inputHeight, {
        useLSH: true,
        maxFeaturesPerBucket: 24
      });
      break;

    case "match":
      const interestedTargetIndexes = data.targetIndexes;

      let matchedTargetIndex = -1;
      let matchedModelViewTransform = null;
      let matchedScreenCoords = null;
      let matchedWorldCoords = null;
      let matchedDebugExtra = null;

      // New: If the worker received image data, run detector here too
      let featurePoints = data.featurePoints;
      if (data.inputData) {
        const detectionResult = detector.detect(data.inputData, { octavesToProcess: data.octavesToProcess });
        featurePoints = detectionResult.featurePoints;
      }

      for (let i = 0; i < interestedTargetIndexes.length; i++) {
        const matchingIndex = interestedTargetIndexes[i];

        const { keyframeIndex, screenCoords, worldCoords, debugExtra } = matcher.matchDetection(
          matchingDataList[matchingIndex],
          featurePoints,
        );
        matchedDebugExtra = debugExtra;

        if (keyframeIndex !== -1) {
          const modelViewTransform = estimator.estimate({ screenCoords, worldCoords });

          if (modelViewTransform) {
            matchedTargetIndex = matchingIndex;
            matchedModelViewTransform = modelViewTransform;
            matchedScreenCoords = screenCoords;
            matchedWorldCoords = worldCoords;
          }
          break;
        }
      }

      postMessage({
        type: "matchDone",
        targetIndex: matchedTargetIndex,
        modelViewTransform: matchedModelViewTransform,
        screenCoords: matchedScreenCoords,
        worldCoords: matchedWorldCoords,
        featurePoints: featurePoints,
        debugExtra: matchedDebugExtra,
      });
      break;

    case "track":
      const { inputData: trackInput, lastModelViewTransform, targetIndex } = data;
      const trackResult = tracker.track(trackInput, lastModelViewTransform, targetIndex);

      postMessage({
        type: "trackDone",
        targetIndex,
        ...trackResult
      });
      break;

    case "trackUpdate":
      const { modelViewTransform, worldCoords, screenCoords, stabilities } = data;
      const finalModelViewTransform = estimator.refineEstimate({
        initialModelViewTransform: modelViewTransform,
        worldCoords,
        screenCoords,
        stabilities, // Stability-based weights
      });
      postMessage({
        type: "trackUpdateDone",
        modelViewTransform: finalModelViewTransform,
      });
      break;

    case "dispose":
      close();
      break;

    default:
      throw new Error(`Invalid message type '${data.type}'`);
  }
};
