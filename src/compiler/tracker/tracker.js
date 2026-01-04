import { buildModelViewProjectionTransform, computeScreenCoordiate } from "../estimation/utils.js";

const AR2_DEFAULT_TS = 6;
const AR2_DEFAULT_TS_GAP = 1;
const AR2_SEARCH_SIZE = 18;
const AR2_SEARCH_GAP = 1;
const AR2_SIM_THRESH = 0.6;

const TRACKING_KEYFRAME = 0; // 0: 128px (optimized)

class Tracker {
  constructor(
    markerDimensions,
    trackingDataList,
    projectionTransform,
    inputWidth,
    inputHeight,
    debugMode = false,
  ) {
    this.markerDimensions = markerDimensions;
    this.trackingDataList = trackingDataList;
    this.projectionTransform = projectionTransform;
    this.inputWidth = inputWidth;
    this.inputHeight = inputHeight;
    this.debugMode = debugMode;

    this.trackingKeyframeList = [];
    for (let i = 0; i < trackingDataList.length; i++) {
      this.trackingKeyframeList.push(trackingDataList[i][TRACKING_KEYFRAME]);
    }

    // Prebuild TypedArrays for features and pixels
    this.prebuiltData = [];
    for (let i = 0; i < this.trackingKeyframeList.length; i++) {
      const keyframe = this.trackingKeyframeList[i];
      this.prebuiltData[i] = {
        px: new Float32Array(keyframe.px),
        py: new Float32Array(keyframe.py),
        data: new Uint8Array(keyframe.d),
        width: keyframe.w,
        height: keyframe.h,
        scale: keyframe.s,
        // Recyclable projected image buffer
        projectedImage: new Float32Array(keyframe.w * keyframe.h)
      };
    }

    // Pre-allocate template data buffer to avoid garbage collection
    const templateOneSize = AR2_DEFAULT_TS;
    const templateSize = templateOneSize * 2 + 1;
    this.templateBuffer = new Float32Array(templateSize * templateSize);
  }

  dummyRun(inputData) {
    let transform = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ];
    for (let targetIndex = 0; targetIndex < this.trackingKeyframeList.length; targetIndex++) {
      this.track(inputData, transform, targetIndex);
    }
  }

  track(inputData, lastModelViewTransform, targetIndex) {
    let debugExtra = {};

    const modelViewProjectionTransform = buildModelViewProjectionTransform(
      this.projectionTransform,
      lastModelViewTransform,
    );

    const prebuilt = this.prebuiltData[targetIndex];

    // 1. Compute Projection (Warping)
    this._computeProjection(
      modelViewProjectionTransform,
      inputData,
      prebuilt
    );

    const projectedImage = prebuilt.projectedImage;

    // 2. Compute Matching (NCC)
    const { matchingPoints, sim } = this._computeMatching(
      prebuilt,
      projectedImage
    );

    const trackingFrame = this.trackingKeyframeList[targetIndex];
    const worldCoords = [];
    const screenCoords = [];
    const goodTrack = [];

    const { px, py, s: scale } = trackingFrame;

    for (let i = 0; i < matchingPoints.length; i++) {
      if (sim[i] > AR2_SIM_THRESH && i < px.length) {
        goodTrack.push(i);
        const point = computeScreenCoordiate(
          modelViewProjectionTransform,
          matchingPoints[i][0],
          matchingPoints[i][1],
        );
        screenCoords.push(point);
        worldCoords.push({
          x: px[i] / scale,
          y: py[i] / scale,
          z: 0,
        });
      }
    }

    if (this.debugMode) {
      debugExtra = {
        projectedImage: Array.from(projectedImage),
        matchingPoints,
        goodTrack,
        trackedPoints: screenCoords,
      };
    }

    return { worldCoords, screenCoords, debugExtra };
  }

  /**
   * Pure JS implementation of NCC matching
   */
  _computeMatching(prebuilt, projectedImage) {
    const { px, py, scale, data: markerPixels, width: markerWidth, height: markerHeight } = prebuilt;
    const featureCount = px.length;

    const templateOneSize = AR2_DEFAULT_TS;
    const templateSize = templateOneSize * 2 + 1;
    const nPixels = templateSize * templateSize;
    const oneOverNPixels = 1.0 / nPixels;

    const searchOneSize = AR2_SEARCH_SIZE;
    const searchGap = AR2_SEARCH_GAP;

    const matchingPoints = [];
    const sims = new Float32Array(featureCount);

    // Reuse shared template buffer
    const templateData = this.templateBuffer;

    for (let f = 0; f < featureCount; f++) {
      const sCenterX = (px[f] + 0.5) | 0; // Faster Math.round
      const sCenterY = (py[f] + 0.5) | 0;

      let bestSim = -1.0;
      let bestX = px[f] / scale;
      let bestY = py[f] / scale;

      // Pre-calculate template stats for this feature
      let sumT = 0;
      let sumT2 = 0;
      let tidx = 0;

      for (let ty = -templateOneSize; ty <= templateOneSize; ty++) {
        const fyOffset = (sCenterY + ty) * markerWidth;
        for (let tx = -templateOneSize; tx <= templateOneSize; tx++) {
          const val = markerPixels[fyOffset + sCenterX + tx];
          templateData[tidx++] = val;
          sumT += val;
          sumT2 += val * val;
        }
      }

      const varT = Math.sqrt(Math.max(0, sumT2 - (sumT * sumT) * oneOverNPixels));
      if (varT < 0.0001) {
        sims[f] = -1.0;
        matchingPoints.push([bestX, bestY]);
        continue;
      }

      // Search in projected image
      for (let sy = -searchOneSize; sy <= searchOneSize; sy += searchGap) {
        const cy = sCenterY + sy;
        if (cy < templateOneSize || cy >= markerHeight - templateOneSize) continue;

        for (let sx = -searchOneSize; sx <= searchOneSize; sx += searchGap) {
          const cx = sCenterX + sx;
          if (cx < templateOneSize || cx >= markerWidth - templateOneSize) continue;

          let sumI = 0;
          let sumI2 = 0;
          let sumIT = 0;

          for (let ty = -templateOneSize; ty <= templateOneSize; ty++) {
            const rowOffset = (cy + ty) * markerWidth;
            const tRowOffset = (ty + templateOneSize) * templateSize;
            for (let tx = -templateOneSize; tx <= templateOneSize; tx++) {
              const valI = projectedImage[rowOffset + (cx + tx)];
              const valT = templateData[tRowOffset + (tx + templateOneSize)];

              sumI += valI;
              sumI2 += valI * valI;
              sumIT += valI * valT;
            }
          }

          const varI = Math.sqrt(Math.max(0, sumI2 - (sumI * sumI) * oneOverNPixels));
          if (varI < 0.0001) continue;

          const sim = (sumIT - (sumI * sumT) * oneOverNPixels) / (varI * varT);
          if (sim > bestSim) {
            bestSim = sim;
            bestX = cx / scale;
            bestY = cy / scale;
          }
        }
      }

      sims[f] = bestSim;
      matchingPoints.push([bestX, bestY]);
    }

    return { matchingPoints, sim: sims };
  }

  /**
   * Pure JS implementation of Bilinear Warping
   */
  _computeProjection(M, inputData, prebuilt) {
    const { width: markerWidth, height: markerHeight, scale: markerScale, projectedImage } = prebuilt;
    const invScale = 1.0 / markerScale;

    const inputW = this.inputWidth;
    const inputH = this.inputHeight;

    const m00 = M[0][0];
    const m01 = M[0][1];
    const m03 = M[0][3];
    const m10 = M[1][0];
    const m11 = M[1][1];
    const m13 = M[1][3];
    const m20 = M[2][0];
    const m21 = M[2][1];
    const m23 = M[2][3];

    for (let j = 0; j < markerHeight; j++) {
      const y = j * invScale;
      const jOffset = j * markerWidth;

      for (let i = 0; i < markerWidth; i++) {
        const x = i * invScale;

        const uz = (x * m20) + (y * m21) + m23;
        const invZ = 1.0 / uz;

        const ux = ((x * m00) + (y * m01) + m03) * invZ;
        const uy = ((x * m10) + (y * m11) + m13) * invZ;

        // Bilinear interpolation
        const x0 = ux | 0; // Faster Math.floor
        const y0 = uy | 0;
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        if (x0 >= 0 && x1 < inputW && y0 >= 0 && y1 < inputH) {
          const dx = ux - x0;
          const dy = uy - y0;
          const omDx = 1.0 - dx;
          const omDy = 1.0 - dy;

          const y0Offset = y0 * inputW;
          const y1Offset = y1 * inputW;

          const v00 = inputData[y0Offset + x0];
          const v10 = inputData[y0Offset + x1];
          const v01 = inputData[y1Offset + x0];
          const v11 = inputData[y1Offset + x1];

          projectedImage[jOffset + i] =
            v00 * omDx * omDy +
            v10 * dx * omDy +
            v01 * omDx * dy +
            v11 * dx * dy;
        } else {
          projectedImage[jOffset + i] = 0;
        }
      }
    }
  }
}

export { Tracker };
