var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/core/estimation/utils.js
var buildModelViewProjectionTransform, applyModelViewProjectionTransform, computeScreenCoordiate;
var init_utils = __esm({
  "src/core/estimation/utils.js"() {
    "use strict";
    buildModelViewProjectionTransform = (projectionTransform, modelViewTransform) => {
      const modelViewProjectionTransform = [
        [
          projectionTransform[0][0] * modelViewTransform[0][0] + projectionTransform[0][2] * modelViewTransform[2][0],
          projectionTransform[0][0] * modelViewTransform[0][1] + projectionTransform[0][2] * modelViewTransform[2][1],
          projectionTransform[0][0] * modelViewTransform[0][2] + projectionTransform[0][2] * modelViewTransform[2][2],
          projectionTransform[0][0] * modelViewTransform[0][3] + projectionTransform[0][2] * modelViewTransform[2][3]
        ],
        [
          projectionTransform[1][1] * modelViewTransform[1][0] + projectionTransform[1][2] * modelViewTransform[2][0],
          projectionTransform[1][1] * modelViewTransform[1][1] + projectionTransform[1][2] * modelViewTransform[2][1],
          projectionTransform[1][1] * modelViewTransform[1][2] + projectionTransform[1][2] * modelViewTransform[2][2],
          projectionTransform[1][1] * modelViewTransform[1][3] + projectionTransform[1][2] * modelViewTransform[2][3]
        ],
        [
          modelViewTransform[2][0],
          modelViewTransform[2][1],
          modelViewTransform[2][2],
          modelViewTransform[2][3]
        ]
      ];
      return modelViewProjectionTransform;
    };
    applyModelViewProjectionTransform = (modelViewProjectionTransform, x, y, _z) => {
      const ux = modelViewProjectionTransform[0][0] * x + modelViewProjectionTransform[0][1] * y + modelViewProjectionTransform[0][3];
      const uy = modelViewProjectionTransform[1][0] * x + modelViewProjectionTransform[1][1] * y + modelViewProjectionTransform[1][3];
      const uz = modelViewProjectionTransform[2][0] * x + modelViewProjectionTransform[2][1] * y + modelViewProjectionTransform[2][3];
      return { x: ux, y: uy, z: uz };
    };
    computeScreenCoordiate = (modelViewProjectionTransform, x, y, z) => {
      const {
        x: ux,
        y: uy,
        z: uz
      } = applyModelViewProjectionTransform(modelViewProjectionTransform, x, y, z);
      return { x: ux / uz, y: uy / uz };
    };
  }
});

// src/core/estimation/non-rigid-refine.js
function refineNonRigid({ mesh, trackedPoints, currentVertices, iterations = 5 }) {
  const { e: edges, rl: restLengths } = mesh;
  const numVertices = currentVertices.length / 2;
  const vertices = new Float32Array(currentVertices);
  const stiffness = 0.8;
  const dataFidelity = 0.5;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < restLengths.length; i++) {
      const idx1 = edges[i * 2];
      const idx2 = edges[i * 2 + 1];
      const restL = restLengths[i];
      const vx1 = vertices[idx1 * 2];
      const vy1 = vertices[idx1 * 2 + 1];
      const vx2 = vertices[idx2 * 2];
      const vy2 = vertices[idx2 * 2 + 1];
      const dx = vx2 - vx1;
      const dy = vy2 - vy1;
      const currentL = Math.sqrt(dx * dx + dy * dy);
      if (currentL < 1e-4) continue;
      const diff = (currentL - restL) / currentL;
      const moveX = dx * 0.5 * diff * stiffness;
      const moveY = dy * 0.5 * diff * stiffness;
      vertices[idx1 * 2] += moveX;
      vertices[idx1 * 2 + 1] += moveY;
      vertices[idx2 * 2] -= moveX;
      vertices[idx2 * 2 + 1] -= moveY;
    }
    for (const tp of trackedPoints) {
      const idx = tp.meshIndex;
      if (idx === void 0) continue;
      const targetX = tp.x;
      const targetY = tp.y;
      vertices[idx * 2] += (targetX - vertices[idx * 2]) * dataFidelity;
      vertices[idx * 2 + 1] += (targetY - vertices[idx * 2 + 1]) * dataFidelity;
    }
  }
  return vertices;
}
var init_non_rigid_refine = __esm({
  "src/core/estimation/non-rigid-refine.js"() {
    "use strict";
  }
});

// src/core/constants.ts
var AR_CONFIG;
var init_constants = __esm({
  "src/core/constants.ts"() {
    "use strict";
    AR_CONFIG = {
      // Camera settings
      VIEWPORT_WIDTH: 640,
      VIEWPORT_HEIGHT: 480,
      DEFAULT_FOVY: 60,
      DEFAULT_NEAR: 1,
      DEFAULT_FAR: 1e4,
      // Detection settings
      MAX_FEATURES_PER_BUCKET: 24,
      USE_LSH: true,
      // Matching settings
      HAMMING_THRESHOLD: 0.85,
      HDC_RATIO_THRESHOLD: 0.85,
      INLIER_THRESHOLD: 15,
      MIN_NUM_INLIERS: 6,
      MAX_MATCH_QUERY_POINTS: 800,
      CLUSTER_MAX_POP: 25,
      // Tracker / NCC settings
      TRACKER_TEMPLATE_SIZE: 6,
      TRACKER_SEARCH_SIZE: 12,
      TRACKER_SIMILARITY_THRESHOLD: 0.65,
      // Image processing / Scale list
      MIN_IMAGE_PIXEL_SIZE: 32,
      SCALE_STEP_EXPONENT: 1,
      // Optimized: was 0.6, now 1.0 (reduces scales from ~7 to ~4)
      TRACKING_DOWNSCALE_LEVEL_1: 256,
      TRACKING_DOWNSCALE_LEVEL_2: 128,
      // Tracker settings
      WARMUP_TOLERANCE: 2,
      MISS_TOLERANCE: 1,
      ONE_EURO_FILTER_CUTOFF: 0.5,
      ONE_EURO_FILTER_BETA: 0.1,
      // TAAR Size Optimization
      USE_COMPACT_DESCRIPTORS: true,
      // 32-bit XOR folded descriptors vs 64-bit raw
      COMPACT_HAMMING_THRESHOLD: 8
      // Threshold for 32-bit descriptors (vs 15 for 64-bit)
    };
  }
});

// src/core/tracker/tracker.js
var AR2_DEFAULT_TS, AR2_SEARCH_SIZE, AR2_SEARCH_GAP, AR2_SIM_THRESH, Tracker;
var init_tracker = __esm({
  "src/core/tracker/tracker.js"() {
    "use strict";
    init_utils();
    init_non_rigid_refine();
    init_constants();
    AR2_DEFAULT_TS = AR_CONFIG.TRACKER_TEMPLATE_SIZE;
    AR2_SEARCH_SIZE = AR_CONFIG.TRACKER_SEARCH_SIZE;
    AR2_SEARCH_GAP = 1;
    AR2_SIM_THRESH = AR_CONFIG.TRACKER_SIMILARITY_THRESHOLD;
    Tracker = class {
      constructor(markerDimensions, trackingDataList, projectionTransform, inputWidth, inputHeight, debugMode2 = false) {
        this.markerDimensions = markerDimensions;
        this.trackingDataList = trackingDataList;
        this.projectionTransform = projectionTransform;
        this.inputWidth = inputWidth;
        this.inputHeight = inputHeight;
        this.debugMode = debugMode2;
        this.trackingKeyframeList = [];
        this.prebuiltData = [];
        for (let i = 0; i < trackingDataList.length; i++) {
          const targetOctaves = trackingDataList[i];
          this.trackingKeyframeList[i] = targetOctaves;
          this.prebuiltData[i] = targetOctaves.map((keyframe) => ({
            px: new Float32Array(keyframe.px),
            py: new Float32Array(keyframe.py),
            data: new Uint8Array(keyframe.d),
            width: keyframe.w,
            height: keyframe.h,
            scale: keyframe.s,
            mesh: keyframe.mesh,
            // Recyclable projected image buffer
            projectedImage: new Float32Array(keyframe.w * keyframe.h)
          }));
        }
        this.meshVerticesState = [];
        const templateOneSize = AR2_DEFAULT_TS;
        const templateSize = templateOneSize * 2 + 1;
        this.templateBuffer = new Float32Array(templateSize * templateSize);
      }
      dummyRun(inputData) {
        let transform = [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0]
        ];
        for (let targetIndex = 0; targetIndex < this.trackingKeyframeList.length; targetIndex++) {
          this.track(inputData, transform, targetIndex);
        }
      }
      track(inputData, lastModelViewTransform, targetIndex) {
        let debugExtra = {};
        const modelViewProjectionTransform = buildModelViewProjectionTransform(
          this.projectionTransform,
          lastModelViewTransform
        );
        const [mW, mH] = this.markerDimensions[targetIndex];
        const p0 = computeScreenCoordiate(modelViewProjectionTransform, 0, 0);
        const p1 = computeScreenCoordiate(modelViewProjectionTransform, mW, 0);
        const screenW = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
        if (!this.lastOctaveIndex) this.lastOctaveIndex = [];
        let octaveIndex = this.lastOctaveIndex[targetIndex] !== void 0 ? this.lastOctaveIndex[targetIndex] : 0;
        let minDiff = Math.abs(this.prebuiltData[targetIndex][octaveIndex].width - screenW);
        const switchThreshold = 0.8;
        for (let i = 0; i < this.prebuiltData[targetIndex].length; i++) {
          const diff = Math.abs(this.prebuiltData[targetIndex][i].width - screenW);
          if (diff < minDiff * switchThreshold) {
            minDiff = diff;
            octaveIndex = i;
          }
        }
        this.lastOctaveIndex[targetIndex] = octaveIndex;
        const prebuilt = this.prebuiltData[targetIndex][octaveIndex];
        this._computeProjection(
          modelViewProjectionTransform,
          inputData,
          prebuilt
        );
        const projectedImage = prebuilt.projectedImage;
        const { matchingPoints, sim } = this._computeMatching(
          prebuilt,
          projectedImage
        );
        const trackingFrame = this.trackingKeyframeList[targetIndex][octaveIndex];
        const worldCoords = [];
        const screenCoords = [];
        const goodTrack = [];
        const { px, py, s: scale } = trackingFrame;
        const reliabilities = [];
        for (let i = 0; i < matchingPoints.length; i++) {
          const reliability = sim[i];
          if (reliability > AR2_SIM_THRESH && i < px.length) {
            goodTrack.push(i);
            const point = computeScreenCoordiate(
              modelViewProjectionTransform,
              matchingPoints[i][0],
              matchingPoints[i][1]
            );
            screenCoords.push(point);
            worldCoords.push({
              x: px[i] / scale,
              y: py[i] / scale,
              z: 0
            });
            reliabilities.push(reliability);
          }
        }
        let deformedMesh = null;
        if (prebuilt.mesh && goodTrack.length >= 4) {
          if (!this.meshVerticesState[targetIndex]) this.meshVerticesState[targetIndex] = [];
          let currentOctaveVertices = this.meshVerticesState[targetIndex][octaveIndex];
          if (!currentOctaveVertices) {
            currentOctaveVertices = new Float32Array(px.length * 2);
            for (let i = 0; i < px.length; i++) {
              currentOctaveVertices[i * 2] = px[i];
              currentOctaveVertices[i * 2 + 1] = py[i];
            }
          }
          const trackedTargets = [];
          for (let j = 0; j < goodTrack.length; j++) {
            const idx = goodTrack[j];
            trackedTargets.push({
              meshIndex: idx,
              x: matchingPoints[idx][0] * scale,
              // Convert back to octave space pixels
              y: matchingPoints[idx][1] * scale
            });
          }
          const refinedOctaveVertices = refineNonRigid({
            mesh: prebuilt.mesh,
            trackedPoints: trackedTargets,
            currentVertices: currentOctaveVertices,
            iterations: 5
          });
          this.meshVerticesState[targetIndex][octaveIndex] = refinedOctaveVertices;
          const screenMeshVertices = new Float32Array(refinedOctaveVertices.length);
          for (let i = 0; i < refinedOctaveVertices.length; i += 2) {
            const p = computeScreenCoordiate(
              modelViewProjectionTransform,
              refinedOctaveVertices[i] / scale,
              refinedOctaveVertices[i + 1] / scale
            );
            screenMeshVertices[i] = p.x;
            screenMeshVertices[i + 1] = p.y;
          }
          deformedMesh = {
            vertices: screenMeshVertices,
            triangles: prebuilt.mesh.t
          };
        }
        if (screenCoords.length >= 8) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const p of screenCoords) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
          const detectedDiagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
          if (detectedDiagonal < screenW * 0.15) {
            return { worldCoords: [], screenCoords: [], reliabilities: [], debugExtra };
          }
        }
        if (this.debugMode) {
          debugExtra = {
            octaveIndex,
            // Remove Array.from to avoid massive GC pressure
            projectedImage,
            matchingPoints,
            goodTrack,
            trackedPoints: screenCoords
          };
        }
        return { worldCoords, screenCoords, reliabilities, indices: goodTrack, octaveIndex, deformedMesh, debugExtra };
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
        const oneOverNPixels = 1 / nPixels;
        const searchOneSize = AR2_SEARCH_SIZE;
        const searchGap = AR2_SEARCH_GAP;
        const matchingPoints = [];
        const sims = new Float32Array(featureCount);
        const templateData = this.templateBuffer;
        for (let f = 0; f < featureCount; f++) {
          const sCenterX = px[f] + 0.5 | 0;
          const sCenterY = py[f] + 0.5 | 0;
          let bestSim = -1;
          let bestX = px[f] / scale;
          let bestY = py[f] / scale;
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
          const varT = Math.sqrt(Math.max(0, sumT2 - sumT * sumT * oneOverNPixels));
          if (varT < 1e-4) {
            sims[f] = -1;
            matchingPoints.push([bestX, bestY]);
            continue;
          }
          const coarseGap = 4;
          for (let sy = -searchOneSize; sy <= searchOneSize; sy += coarseGap) {
            const cy = sCenterY + sy;
            if (cy < templateOneSize || cy >= markerHeight - templateOneSize) continue;
            for (let sx = -searchOneSize; sx <= searchOneSize; sx += coarseGap) {
              const cx = sCenterX + sx;
              if (cx < templateOneSize || cx >= markerWidth - templateOneSize) continue;
              let sumI = 0, sumI2 = 0, sumIT = 0;
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
              const varI = Math.sqrt(Math.max(0, sumI2 - sumI * sumI * oneOverNPixels));
              if (varI < 1e-4) continue;
              const sim = (sumIT - sumI * sumT * oneOverNPixels) / (varI * varT);
              if (sim > bestSim) {
                bestSim = sim;
                bestX = cx / scale;
                bestY = cy / scale;
              }
            }
          }
          if (bestSim > AR2_SIM_THRESH) {
            const fineCenterX = bestX * scale | 0;
            const fineCenterY = bestY * scale | 0;
            const fineSearch = coarseGap;
            for (let sy = -fineSearch; sy <= fineSearch; sy++) {
              const cy = fineCenterY + sy;
              if (cy < templateOneSize || cy >= markerHeight - templateOneSize) continue;
              for (let sx = -fineSearch; sx <= fineSearch; sx++) {
                const cx = fineCenterX + sx;
                if (cx < templateOneSize || cx >= markerWidth - templateOneSize) continue;
                let sumI = 0, sumI2 = 0, sumIT = 0;
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
                const varI = Math.sqrt(Math.max(0, sumI2 - sumI * sumI * oneOverNPixels));
                if (varI < 1e-4) continue;
                const sim = (sumIT - sumI * sumT * oneOverNPixels) / (varI * varT);
                if (sim > bestSim) {
                  bestSim = sim;
                  bestX = cx / scale;
                  bestY = cy / scale;
                }
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
        const invScale = 1 / markerScale;
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
            const uz = x * m20 + y * m21 + m23;
            const invZ = 1 / uz;
            const ux = (x * m00 + y * m01 + m03) * invZ;
            const uy = (x * m10 + y * m11 + m13) * invZ;
            const x0 = ux | 0;
            const y0 = uy | 0;
            const x1 = x0 + 1;
            const y1 = y0 + 1;
            if (x0 >= 0 && x1 < inputW && y0 >= 0 && y1 < inputH) {
              const dx = ux - x0;
              const dy = uy - y0;
              const omDx = 1 - dx;
              const omDy = 1 - dy;
              const y0Offset = y0 * inputW;
              const y1Offset = y1 * inputW;
              const v00 = inputData[y0Offset + x0];
              const v10 = inputData[y0Offset + x1];
              const v01 = inputData[y1Offset + x0];
              const v11 = inputData[y1Offset + x1];
              projectedImage[jOffset + i] = v00 * omDx * omDy + v10 * dx * omDy + v01 * omDx * dy + v11 * dx * dy;
            } else {
              projectedImage[jOffset + i] = 0;
            }
          }
        }
      }
    };
  }
});

// src/core/detector/freak.js
var FREAK_RINGS, FREAKPOINTS;
var init_freak = __esm({
  "src/core/detector/freak.js"() {
    "use strict";
    FREAK_RINGS = [
      // ring 5
      {
        sigma: 0.55,
        points: [
          [-1, 0],
          [-0.5, -0.866025],
          [0.5, -0.866025],
          [1, -0],
          [0.5, 0.866025],
          [-0.5, 0.866025]
        ]
      },
      // ring 4
      {
        sigma: 0.475,
        points: [
          [0, 0.930969],
          [-0.806243, 0.465485],
          [-0.806243, -0.465485],
          [-0, -0.930969],
          [0.806243, -0.465485],
          [0.806243, 0.465485]
        ]
      },
      // ring 3
      {
        sigma: 0.4,
        points: [
          [0.847306, -0],
          [0.423653, 0.733789],
          [-0.423653, 0.733789],
          [-0.847306, 0],
          [-0.423653, -0.733789],
          [0.423653, -0.733789]
        ]
      },
      // ring 2
      {
        sigma: 0.325,
        points: [
          [-0, -0.741094],
          [0.641806, -0.370547],
          [0.641806, 0.370547],
          [0, 0.741094],
          [-0.641806, 0.370547],
          [-0.641806, -0.370547]
        ]
      },
      // ring 1
      {
        sigma: 0.25,
        points: [
          [-0.595502, 0],
          [-0.297751, -0.51572],
          [0.297751, -0.51572],
          [0.595502, -0],
          [0.297751, 0.51572],
          [-0.297751, 0.51572]
        ]
      },
      // ring 0
      {
        sigma: 0.175,
        points: [
          [0, 0.362783],
          [-0.314179, 0.181391],
          [-0.314179, -0.181391],
          [-0, -0.362783],
          [0.314179, -0.181391],
          [0.314179, 0.181391]
        ]
      },
      // center
      {
        sigma: 0.1,
        points: [[0, 0]]
      }
    ];
    FREAKPOINTS = [];
    for (let r = 0; r < FREAK_RINGS.length; r++) {
      const sigma = FREAK_RINGS[r].sigma;
      for (let i = 0; i < FREAK_RINGS[r].points.length; i++) {
        const point = FREAK_RINGS[r].points[i];
        FREAKPOINTS.push([sigma, point[0], point[1]]);
      }
    }
  }
});

// src/core/utils/gpu-compute.js
var tryInitGPU, computeGradientsJS, findLocalMaximaJS, gaussianBlurJS, downsampleJS, GPUCompute, gpuCompute;
var init_gpu_compute = __esm({
  "src/core/utils/gpu-compute.js"() {
    "use strict";
    tryInitGPU = () => {
      return null;
    };
    computeGradientsJS = (imageData, width, height) => {
      const dValue = new Float32Array(width * height);
      for (let j = 1; j < height - 1; j++) {
        const rowOffset = j * width;
        const prevRowOffset = (j - 1) * width;
        const nextRowOffset = (j + 1) * width;
        for (let i = 1; i < width - 1; i++) {
          const pos = rowOffset + i;
          const dx = (imageData[prevRowOffset + i + 1] - imageData[prevRowOffset + i - 1] + imageData[rowOffset + i + 1] - imageData[rowOffset + i - 1] + imageData[nextRowOffset + i + 1] - imageData[nextRowOffset + i - 1]) / 768;
          const dy = (imageData[nextRowOffset + i - 1] - imageData[prevRowOffset + i - 1] + imageData[nextRowOffset + i] - imageData[prevRowOffset + i] + imageData[nextRowOffset + i + 1] - imageData[prevRowOffset + i + 1]) / 768;
          dValue[pos] = Math.sqrt((dx * dx + dy * dy) / 2);
        }
      }
      return dValue;
    };
    findLocalMaximaJS = (gradients, width, height) => {
      const isCandidate = new Uint8Array(width * height);
      for (let j = 1; j < height - 1; j++) {
        const rowOffset = j * width;
        for (let i = 1; i < width - 1; i++) {
          const pos = rowOffset + i;
          const val = gradients[pos];
          if (val > 0 && val >= gradients[pos - 1] && val >= gradients[pos + 1] && val >= gradients[pos - width] && val >= gradients[pos + width]) {
            isCandidate[pos] = 1;
          }
        }
      }
      return isCandidate;
    };
    gaussianBlurJS = (data, width, height) => {
      const output = new Float32Array(width * height);
      const temp = new Float32Array(width * height);
      const k0 = 1 / 16, k1 = 4 / 16, k2 = 6 / 16;
      const w1 = width - 1;
      const h1 = height - 1;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const x0 = x < 2 ? 0 : x - 2;
          const x1 = x < 1 ? 0 : x - 1;
          const x3 = x > w1 - 1 ? w1 : x + 1;
          const x4 = x > w1 - 2 ? w1 : x + 2;
          temp[rowOffset + x] = data[rowOffset + x0] * k0 + data[rowOffset + x1] * k1 + data[rowOffset + x] * k2 + data[rowOffset + x3] * k1 + data[rowOffset + x4] * k0;
        }
      }
      for (let y = 0; y < height; y++) {
        const y0 = (y < 2 ? 0 : y - 2) * width;
        const y1 = (y < 1 ? 0 : y - 1) * width;
        const y2 = y * width;
        const y3 = (y > h1 - 1 ? h1 : y + 1) * width;
        const y4 = (y > h1 - 2 ? h1 : y + 2) * width;
        for (let x = 0; x < width; x++) {
          output[y2 + x] = temp[y0 + x] * k0 + temp[y1 + x] * k1 + temp[y2 + x] * k2 + temp[y3 + x] * k1 + temp[y4 + x] * k0;
        }
      }
      return output;
    };
    downsampleJS = (data, width, height) => {
      const newWidth = Math.floor(width / 2);
      const newHeight = Math.floor(height / 2);
      const output = new Float32Array(newWidth * newHeight);
      for (let y = 0; y < newHeight; y++) {
        const sy = y * 2;
        for (let x = 0; x < newWidth; x++) {
          const sx = x * 2;
          const pos = sy * width + sx;
          output[y * newWidth + x] = (data[pos] + data[pos + 1] + data[pos + width] + data[pos + width + 1]) / 4;
        }
      }
      return { data: output, width: newWidth, height: newHeight };
    };
    GPUCompute = class {
      constructor() {
        this.gpu = null;
        this.kernelCache = /* @__PURE__ */ new Map();
        this.initialized = false;
      }
      /**
       * Initialize (tries GPU in browser, uses JS in Node)
       */
      init() {
        if (this.initialized) return;
        this.gpu = tryInitGPU();
        this.initialized = true;
      }
      /**
       * Compute edge gradients
       */
      computeGradients(imageData, width, height) {
        this.init();
        return computeGradientsJS(imageData, width, height);
      }
      /**
       * Find local maxima
       */
      findLocalMaxima(gradients, width, height) {
        this.init();
        return findLocalMaximaJS(gradients, width, height);
      }
      /**
       * Combined edge detection
       */
      edgeDetection(imageData, width, height) {
        const dValue = this.computeGradients(imageData, width, height);
        const isCandidate = this.findLocalMaxima(dValue, width, height);
        return { dValue, isCandidate };
      }
      /**
       * Gaussian blur
       */
      gaussianBlur(imageData, width, height) {
        this.init();
        return gaussianBlurJS(imageData, width, height);
      }
      /**
       * Downsample by factor of 2
       */
      downsample(imageData, width, height) {
        this.init();
        return downsampleJS(imageData, width, height);
      }
      /**
       * Build Gaussian pyramid
       */
      buildPyramid(imageData, width, height, numLevels = 5) {
        this.init();
        const pyramid = [];
        let currentData = imageData instanceof Float32Array ? imageData : Float32Array.from(imageData);
        let currentWidth = width;
        let currentHeight = height;
        for (let level = 0; level < numLevels; level++) {
          const blurred = this.gaussianBlur(currentData, currentWidth, currentHeight);
          pyramid.push({
            data: blurred,
            width: currentWidth,
            height: currentHeight,
            scale: Math.pow(2, level)
          });
          if (currentWidth > 8 && currentHeight > 8) {
            const downsampled = this.downsample(blurred, currentWidth, currentHeight);
            currentData = downsampled.data;
            currentWidth = downsampled.width;
            currentHeight = downsampled.height;
          } else {
            break;
          }
        }
        return pyramid;
      }
      /**
       * Check if GPU is available
       */
      isGPUAvailable() {
        this.init();
        return this.gpu !== null;
      }
      /**
       * Cleanup resources
       */
      destroy() {
        this.kernelCache.clear();
        if (this.gpu && this.gpu.destroy) {
          this.gpu.destroy();
        }
        this.gpu = null;
        this.initialized = false;
      }
    };
    gpuCompute = new GPUCompute();
  }
});

// src/core/utils/lsh-direct.js
function computeLSH64(samples) {
  const result = new Uint32Array(2);
  for (let i = 0; i < 64; i++) {
    const p1 = LSH_PAIRS[i * 2];
    const p2 = LSH_PAIRS[i * 2 + 1];
    if (samples[p1] < samples[p2]) {
      const uintIdx = i >> 5;
      const uintBitIdx = i & 31;
      result[uintIdx] |= 1 << uintBitIdx;
    }
  }
  return result;
}
function computeFullFREAK(samples) {
  const descriptor = new Uint8Array(84);
  let bitCount = 0;
  let byteIdx = 0;
  for (let i = 0; i < FREAKPOINTS.length; i++) {
    for (let j = i + 1; j < FREAKPOINTS.length; j++) {
      if (samples[i] < samples[j]) {
        descriptor[byteIdx] |= 1 << 7 - bitCount;
      }
      bitCount++;
      if (bitCount === 8) {
        byteIdx++;
        bitCount = 0;
      }
    }
  }
  return descriptor;
}
function packLSHIntoDescriptor(lsh) {
  const desc = new Uint8Array(8);
  const view = new DataView(desc.buffer);
  view.setUint32(0, lsh[0], true);
  view.setUint32(4, lsh[1], true);
  return desc;
}
var LSH_PAIRS, SAMPLING_INDICES, currentBit, samplingIdx;
var init_lsh_direct = __esm({
  "src/core/utils/lsh-direct.js"() {
    "use strict";
    init_freak();
    LSH_PAIRS = new Int32Array(64 * 2);
    SAMPLING_INDICES = new Int32Array(64);
    for (let i = 0; i < 64; i++) {
      SAMPLING_INDICES[i] = Math.floor(i * (672 / 64));
    }
    currentBit = 0;
    samplingIdx = 0;
    for (let i = 0; i < FREAKPOINTS.length; i++) {
      for (let j = i + 1; j < FREAKPOINTS.length; j++) {
        if (samplingIdx < 64 && currentBit === SAMPLING_INDICES[samplingIdx]) {
          LSH_PAIRS[samplingIdx * 2] = i;
          LSH_PAIRS[samplingIdx * 2 + 1] = j;
          samplingIdx++;
        }
        currentBit++;
      }
    }
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/utf8.mjs
function utf8Count(str) {
  const strLength = str.length;
  let byteLength = 0;
  let pos = 0;
  while (pos < strLength) {
    let value = str.charCodeAt(pos++);
    if ((value & 4294967168) === 0) {
      byteLength++;
      continue;
    } else if ((value & 4294965248) === 0) {
      byteLength += 2;
    } else {
      if (value >= 55296 && value <= 56319) {
        if (pos < strLength) {
          const extra = str.charCodeAt(pos);
          if ((extra & 64512) === 56320) {
            ++pos;
            value = ((value & 1023) << 10) + (extra & 1023) + 65536;
          }
        }
      }
      if ((value & 4294901760) === 0) {
        byteLength += 3;
      } else {
        byteLength += 4;
      }
    }
  }
  return byteLength;
}
function utf8EncodeJs(str, output, outputOffset) {
  const strLength = str.length;
  let offset = outputOffset;
  let pos = 0;
  while (pos < strLength) {
    let value = str.charCodeAt(pos++);
    if ((value & 4294967168) === 0) {
      output[offset++] = value;
      continue;
    } else if ((value & 4294965248) === 0) {
      output[offset++] = value >> 6 & 31 | 192;
    } else {
      if (value >= 55296 && value <= 56319) {
        if (pos < strLength) {
          const extra = str.charCodeAt(pos);
          if ((extra & 64512) === 56320) {
            ++pos;
            value = ((value & 1023) << 10) + (extra & 1023) + 65536;
          }
        }
      }
      if ((value & 4294901760) === 0) {
        output[offset++] = value >> 12 & 15 | 224;
        output[offset++] = value >> 6 & 63 | 128;
      } else {
        output[offset++] = value >> 18 & 7 | 240;
        output[offset++] = value >> 12 & 63 | 128;
        output[offset++] = value >> 6 & 63 | 128;
      }
    }
    output[offset++] = value & 63 | 128;
  }
}
function utf8EncodeTE(str, output, outputOffset) {
  sharedTextEncoder.encodeInto(str, output.subarray(outputOffset));
}
function utf8Encode(str, output, outputOffset) {
  if (str.length > TEXT_ENCODER_THRESHOLD) {
    utf8EncodeTE(str, output, outputOffset);
  } else {
    utf8EncodeJs(str, output, outputOffset);
  }
}
function utf8DecodeJs(bytes, inputOffset, byteLength) {
  let offset = inputOffset;
  const end = offset + byteLength;
  const units = [];
  let result = "";
  while (offset < end) {
    const byte1 = bytes[offset++];
    if ((byte1 & 128) === 0) {
      units.push(byte1);
    } else if ((byte1 & 224) === 192) {
      const byte2 = bytes[offset++] & 63;
      units.push((byte1 & 31) << 6 | byte2);
    } else if ((byte1 & 240) === 224) {
      const byte2 = bytes[offset++] & 63;
      const byte3 = bytes[offset++] & 63;
      units.push((byte1 & 31) << 12 | byte2 << 6 | byte3);
    } else if ((byte1 & 248) === 240) {
      const byte2 = bytes[offset++] & 63;
      const byte3 = bytes[offset++] & 63;
      const byte4 = bytes[offset++] & 63;
      let unit = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
      if (unit > 65535) {
        unit -= 65536;
        units.push(unit >>> 10 & 1023 | 55296);
        unit = 56320 | unit & 1023;
      }
      units.push(unit);
    } else {
      units.push(byte1);
    }
    if (units.length >= CHUNK_SIZE) {
      result += String.fromCharCode(...units);
      units.length = 0;
    }
  }
  if (units.length > 0) {
    result += String.fromCharCode(...units);
  }
  return result;
}
function utf8DecodeTD(bytes, inputOffset, byteLength) {
  const stringBytes = bytes.subarray(inputOffset, inputOffset + byteLength);
  return sharedTextDecoder.decode(stringBytes);
}
function utf8Decode(bytes, inputOffset, byteLength) {
  if (byteLength > TEXT_DECODER_THRESHOLD) {
    return utf8DecodeTD(bytes, inputOffset, byteLength);
  } else {
    return utf8DecodeJs(bytes, inputOffset, byteLength);
  }
}
var sharedTextEncoder, TEXT_ENCODER_THRESHOLD, CHUNK_SIZE, sharedTextDecoder, TEXT_DECODER_THRESHOLD;
var init_utf8 = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/utf8.mjs"() {
    sharedTextEncoder = new TextEncoder();
    TEXT_ENCODER_THRESHOLD = 50;
    CHUNK_SIZE = 4096;
    sharedTextDecoder = new TextDecoder();
    TEXT_DECODER_THRESHOLD = 200;
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/ExtData.mjs
var ExtData;
var init_ExtData = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/ExtData.mjs"() {
    ExtData = class {
      type;
      data;
      constructor(type, data) {
        this.type = type;
        this.data = data;
      }
    };
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/DecodeError.mjs
var DecodeError;
var init_DecodeError = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/DecodeError.mjs"() {
    DecodeError = class _DecodeError extends Error {
      constructor(message) {
        super(message);
        const proto = Object.create(_DecodeError.prototype);
        Object.setPrototypeOf(this, proto);
        Object.defineProperty(this, "name", {
          configurable: true,
          enumerable: false,
          value: _DecodeError.name
        });
      }
    };
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/int.mjs
function setUint64(view, offset, value) {
  const high = value / 4294967296;
  const low = value;
  view.setUint32(offset, high);
  view.setUint32(offset + 4, low);
}
function setInt64(view, offset, value) {
  const high = Math.floor(value / 4294967296);
  const low = value;
  view.setUint32(offset, high);
  view.setUint32(offset + 4, low);
}
function getInt64(view, offset) {
  const high = view.getInt32(offset);
  const low = view.getUint32(offset + 4);
  return high * 4294967296 + low;
}
function getUint64(view, offset) {
  const high = view.getUint32(offset);
  const low = view.getUint32(offset + 4);
  return high * 4294967296 + low;
}
var UINT32_MAX;
var init_int = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/int.mjs"() {
    UINT32_MAX = 4294967295;
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/timestamp.mjs
function encodeTimeSpecToTimestamp({ sec, nsec }) {
  if (sec >= 0 && nsec >= 0 && sec <= TIMESTAMP64_MAX_SEC) {
    if (nsec === 0 && sec <= TIMESTAMP32_MAX_SEC) {
      const rv = new Uint8Array(4);
      const view = new DataView(rv.buffer);
      view.setUint32(0, sec);
      return rv;
    } else {
      const secHigh = sec / 4294967296;
      const secLow = sec & 4294967295;
      const rv = new Uint8Array(8);
      const view = new DataView(rv.buffer);
      view.setUint32(0, nsec << 2 | secHigh & 3);
      view.setUint32(4, secLow);
      return rv;
    }
  } else {
    const rv = new Uint8Array(12);
    const view = new DataView(rv.buffer);
    view.setUint32(0, nsec);
    setInt64(view, 4, sec);
    return rv;
  }
}
function encodeDateToTimeSpec(date) {
  const msec = date.getTime();
  const sec = Math.floor(msec / 1e3);
  const nsec = (msec - sec * 1e3) * 1e6;
  const nsecInSec = Math.floor(nsec / 1e9);
  return {
    sec: sec + nsecInSec,
    nsec: nsec - nsecInSec * 1e9
  };
}
function encodeTimestampExtension(object) {
  if (object instanceof Date) {
    const timeSpec = encodeDateToTimeSpec(object);
    return encodeTimeSpecToTimestamp(timeSpec);
  } else {
    return null;
  }
}
function decodeTimestampToTimeSpec(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  switch (data.byteLength) {
    case 4: {
      const sec = view.getUint32(0);
      const nsec = 0;
      return { sec, nsec };
    }
    case 8: {
      const nsec30AndSecHigh2 = view.getUint32(0);
      const secLow32 = view.getUint32(4);
      const sec = (nsec30AndSecHigh2 & 3) * 4294967296 + secLow32;
      const nsec = nsec30AndSecHigh2 >>> 2;
      return { sec, nsec };
    }
    case 12: {
      const sec = getInt64(view, 4);
      const nsec = view.getUint32(0);
      return { sec, nsec };
    }
    default:
      throw new DecodeError(`Unrecognized data size for timestamp (expected 4, 8, or 12): ${data.length}`);
  }
}
function decodeTimestampExtension(data) {
  const timeSpec = decodeTimestampToTimeSpec(data);
  return new Date(timeSpec.sec * 1e3 + timeSpec.nsec / 1e6);
}
var EXT_TIMESTAMP, TIMESTAMP32_MAX_SEC, TIMESTAMP64_MAX_SEC, timestampExtension;
var init_timestamp = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/timestamp.mjs"() {
    init_DecodeError();
    init_int();
    EXT_TIMESTAMP = -1;
    TIMESTAMP32_MAX_SEC = 4294967296 - 1;
    TIMESTAMP64_MAX_SEC = 17179869184 - 1;
    timestampExtension = {
      type: EXT_TIMESTAMP,
      encode: encodeTimestampExtension,
      decode: decodeTimestampExtension
    };
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/ExtensionCodec.mjs
var ExtensionCodec;
var init_ExtensionCodec = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/ExtensionCodec.mjs"() {
    init_ExtData();
    init_timestamp();
    ExtensionCodec = class _ExtensionCodec {
      static defaultCodec = new _ExtensionCodec();
      // ensures ExtensionCodecType<X> matches ExtensionCodec<X>
      // this will make type errors a lot more clear
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __brand;
      // built-in extensions
      builtInEncoders = [];
      builtInDecoders = [];
      // custom extensions
      encoders = [];
      decoders = [];
      constructor() {
        this.register(timestampExtension);
      }
      register({ type, encode: encode2, decode: decode2 }) {
        if (type >= 0) {
          this.encoders[type] = encode2;
          this.decoders[type] = decode2;
        } else {
          const index = -1 - type;
          this.builtInEncoders[index] = encode2;
          this.builtInDecoders[index] = decode2;
        }
      }
      tryToEncode(object, context) {
        for (let i = 0; i < this.builtInEncoders.length; i++) {
          const encodeExt = this.builtInEncoders[i];
          if (encodeExt != null) {
            const data = encodeExt(object, context);
            if (data != null) {
              const type = -1 - i;
              return new ExtData(type, data);
            }
          }
        }
        for (let i = 0; i < this.encoders.length; i++) {
          const encodeExt = this.encoders[i];
          if (encodeExt != null) {
            const data = encodeExt(object, context);
            if (data != null) {
              const type = i;
              return new ExtData(type, data);
            }
          }
        }
        if (object instanceof ExtData) {
          return object;
        }
        return null;
      }
      decode(data, type, context) {
        const decodeExt = type < 0 ? this.builtInDecoders[-1 - type] : this.decoders[type];
        if (decodeExt) {
          return decodeExt(data, type, context);
        } else {
          return new ExtData(type, data);
        }
      }
    };
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/typedArrays.mjs
function isArrayBufferLike(buffer) {
  return buffer instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && buffer instanceof SharedArrayBuffer;
}
function ensureUint8Array(buffer) {
  if (buffer instanceof Uint8Array) {
    return buffer;
  } else if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else if (isArrayBufferLike(buffer)) {
    return new Uint8Array(buffer);
  } else {
    return Uint8Array.from(buffer);
  }
}
var init_typedArrays = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/typedArrays.mjs"() {
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/Encoder.mjs
var DEFAULT_MAX_DEPTH, DEFAULT_INITIAL_BUFFER_SIZE, Encoder;
var init_Encoder = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/Encoder.mjs"() {
    init_utf8();
    init_ExtensionCodec();
    init_int();
    init_typedArrays();
    DEFAULT_MAX_DEPTH = 100;
    DEFAULT_INITIAL_BUFFER_SIZE = 2048;
    Encoder = class _Encoder {
      extensionCodec;
      context;
      useBigInt64;
      maxDepth;
      initialBufferSize;
      sortKeys;
      forceFloat32;
      ignoreUndefined;
      forceIntegerToFloat;
      pos;
      view;
      bytes;
      entered = false;
      constructor(options) {
        this.extensionCodec = options?.extensionCodec ?? ExtensionCodec.defaultCodec;
        this.context = options?.context;
        this.useBigInt64 = options?.useBigInt64 ?? false;
        this.maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
        this.initialBufferSize = options?.initialBufferSize ?? DEFAULT_INITIAL_BUFFER_SIZE;
        this.sortKeys = options?.sortKeys ?? false;
        this.forceFloat32 = options?.forceFloat32 ?? false;
        this.ignoreUndefined = options?.ignoreUndefined ?? false;
        this.forceIntegerToFloat = options?.forceIntegerToFloat ?? false;
        this.pos = 0;
        this.view = new DataView(new ArrayBuffer(this.initialBufferSize));
        this.bytes = new Uint8Array(this.view.buffer);
      }
      clone() {
        return new _Encoder({
          extensionCodec: this.extensionCodec,
          context: this.context,
          useBigInt64: this.useBigInt64,
          maxDepth: this.maxDepth,
          initialBufferSize: this.initialBufferSize,
          sortKeys: this.sortKeys,
          forceFloat32: this.forceFloat32,
          ignoreUndefined: this.ignoreUndefined,
          forceIntegerToFloat: this.forceIntegerToFloat
        });
      }
      reinitializeState() {
        this.pos = 0;
      }
      /**
       * This is almost equivalent to {@link Encoder#encode}, but it returns an reference of the encoder's internal buffer and thus much faster than {@link Encoder#encode}.
       *
       * @returns Encodes the object and returns a shared reference the encoder's internal buffer.
       */
      encodeSharedRef(object) {
        if (this.entered) {
          const instance = this.clone();
          return instance.encodeSharedRef(object);
        }
        try {
          this.entered = true;
          this.reinitializeState();
          this.doEncode(object, 1);
          return this.bytes.subarray(0, this.pos);
        } finally {
          this.entered = false;
        }
      }
      /**
       * @returns Encodes the object and returns a copy of the encoder's internal buffer.
       */
      encode(object) {
        if (this.entered) {
          const instance = this.clone();
          return instance.encode(object);
        }
        try {
          this.entered = true;
          this.reinitializeState();
          this.doEncode(object, 1);
          return this.bytes.slice(0, this.pos);
        } finally {
          this.entered = false;
        }
      }
      doEncode(object, depth) {
        if (depth > this.maxDepth) {
          throw new Error(`Too deep objects in depth ${depth}`);
        }
        if (object == null) {
          this.encodeNil();
        } else if (typeof object === "boolean") {
          this.encodeBoolean(object);
        } else if (typeof object === "number") {
          if (!this.forceIntegerToFloat) {
            this.encodeNumber(object);
          } else {
            this.encodeNumberAsFloat(object);
          }
        } else if (typeof object === "string") {
          this.encodeString(object);
        } else if (this.useBigInt64 && typeof object === "bigint") {
          this.encodeBigInt64(object);
        } else {
          this.encodeObject(object, depth);
        }
      }
      ensureBufferSizeToWrite(sizeToWrite) {
        const requiredSize = this.pos + sizeToWrite;
        if (this.view.byteLength < requiredSize) {
          this.resizeBuffer(requiredSize * 2);
        }
      }
      resizeBuffer(newSize) {
        const newBuffer = new ArrayBuffer(newSize);
        const newBytes = new Uint8Array(newBuffer);
        const newView = new DataView(newBuffer);
        newBytes.set(this.bytes);
        this.view = newView;
        this.bytes = newBytes;
      }
      encodeNil() {
        this.writeU8(192);
      }
      encodeBoolean(object) {
        if (object === false) {
          this.writeU8(194);
        } else {
          this.writeU8(195);
        }
      }
      encodeNumber(object) {
        if (!this.forceIntegerToFloat && Number.isSafeInteger(object)) {
          if (object >= 0) {
            if (object < 128) {
              this.writeU8(object);
            } else if (object < 256) {
              this.writeU8(204);
              this.writeU8(object);
            } else if (object < 65536) {
              this.writeU8(205);
              this.writeU16(object);
            } else if (object < 4294967296) {
              this.writeU8(206);
              this.writeU32(object);
            } else if (!this.useBigInt64) {
              this.writeU8(207);
              this.writeU64(object);
            } else {
              this.encodeNumberAsFloat(object);
            }
          } else {
            if (object >= -32) {
              this.writeU8(224 | object + 32);
            } else if (object >= -128) {
              this.writeU8(208);
              this.writeI8(object);
            } else if (object >= -32768) {
              this.writeU8(209);
              this.writeI16(object);
            } else if (object >= -2147483648) {
              this.writeU8(210);
              this.writeI32(object);
            } else if (!this.useBigInt64) {
              this.writeU8(211);
              this.writeI64(object);
            } else {
              this.encodeNumberAsFloat(object);
            }
          }
        } else {
          this.encodeNumberAsFloat(object);
        }
      }
      encodeNumberAsFloat(object) {
        if (this.forceFloat32) {
          this.writeU8(202);
          this.writeF32(object);
        } else {
          this.writeU8(203);
          this.writeF64(object);
        }
      }
      encodeBigInt64(object) {
        if (object >= BigInt(0)) {
          this.writeU8(207);
          this.writeBigUint64(object);
        } else {
          this.writeU8(211);
          this.writeBigInt64(object);
        }
      }
      writeStringHeader(byteLength) {
        if (byteLength < 32) {
          this.writeU8(160 + byteLength);
        } else if (byteLength < 256) {
          this.writeU8(217);
          this.writeU8(byteLength);
        } else if (byteLength < 65536) {
          this.writeU8(218);
          this.writeU16(byteLength);
        } else if (byteLength < 4294967296) {
          this.writeU8(219);
          this.writeU32(byteLength);
        } else {
          throw new Error(`Too long string: ${byteLength} bytes in UTF-8`);
        }
      }
      encodeString(object) {
        const maxHeaderSize = 1 + 4;
        const byteLength = utf8Count(object);
        this.ensureBufferSizeToWrite(maxHeaderSize + byteLength);
        this.writeStringHeader(byteLength);
        utf8Encode(object, this.bytes, this.pos);
        this.pos += byteLength;
      }
      encodeObject(object, depth) {
        const ext = this.extensionCodec.tryToEncode(object, this.context);
        if (ext != null) {
          this.encodeExtension(ext);
        } else if (Array.isArray(object)) {
          this.encodeArray(object, depth);
        } else if (ArrayBuffer.isView(object)) {
          this.encodeBinary(object);
        } else if (typeof object === "object") {
          this.encodeMap(object, depth);
        } else {
          throw new Error(`Unrecognized object: ${Object.prototype.toString.apply(object)}`);
        }
      }
      encodeBinary(object) {
        const size = object.byteLength;
        if (size < 256) {
          this.writeU8(196);
          this.writeU8(size);
        } else if (size < 65536) {
          this.writeU8(197);
          this.writeU16(size);
        } else if (size < 4294967296) {
          this.writeU8(198);
          this.writeU32(size);
        } else {
          throw new Error(`Too large binary: ${size}`);
        }
        const bytes = ensureUint8Array(object);
        this.writeU8a(bytes);
      }
      encodeArray(object, depth) {
        const size = object.length;
        if (size < 16) {
          this.writeU8(144 + size);
        } else if (size < 65536) {
          this.writeU8(220);
          this.writeU16(size);
        } else if (size < 4294967296) {
          this.writeU8(221);
          this.writeU32(size);
        } else {
          throw new Error(`Too large array: ${size}`);
        }
        for (const item of object) {
          this.doEncode(item, depth + 1);
        }
      }
      countWithoutUndefined(object, keys) {
        let count = 0;
        for (const key of keys) {
          if (object[key] !== void 0) {
            count++;
          }
        }
        return count;
      }
      encodeMap(object, depth) {
        const keys = Object.keys(object);
        if (this.sortKeys) {
          keys.sort();
        }
        const size = this.ignoreUndefined ? this.countWithoutUndefined(object, keys) : keys.length;
        if (size < 16) {
          this.writeU8(128 + size);
        } else if (size < 65536) {
          this.writeU8(222);
          this.writeU16(size);
        } else if (size < 4294967296) {
          this.writeU8(223);
          this.writeU32(size);
        } else {
          throw new Error(`Too large map object: ${size}`);
        }
        for (const key of keys) {
          const value = object[key];
          if (!(this.ignoreUndefined && value === void 0)) {
            this.encodeString(key);
            this.doEncode(value, depth + 1);
          }
        }
      }
      encodeExtension(ext) {
        if (typeof ext.data === "function") {
          const data = ext.data(this.pos + 6);
          const size2 = data.length;
          if (size2 >= 4294967296) {
            throw new Error(`Too large extension object: ${size2}`);
          }
          this.writeU8(201);
          this.writeU32(size2);
          this.writeI8(ext.type);
          this.writeU8a(data);
          return;
        }
        const size = ext.data.length;
        if (size === 1) {
          this.writeU8(212);
        } else if (size === 2) {
          this.writeU8(213);
        } else if (size === 4) {
          this.writeU8(214);
        } else if (size === 8) {
          this.writeU8(215);
        } else if (size === 16) {
          this.writeU8(216);
        } else if (size < 256) {
          this.writeU8(199);
          this.writeU8(size);
        } else if (size < 65536) {
          this.writeU8(200);
          this.writeU16(size);
        } else if (size < 4294967296) {
          this.writeU8(201);
          this.writeU32(size);
        } else {
          throw new Error(`Too large extension object: ${size}`);
        }
        this.writeI8(ext.type);
        this.writeU8a(ext.data);
      }
      writeU8(value) {
        this.ensureBufferSizeToWrite(1);
        this.view.setUint8(this.pos, value);
        this.pos++;
      }
      writeU8a(values) {
        const size = values.length;
        this.ensureBufferSizeToWrite(size);
        this.bytes.set(values, this.pos);
        this.pos += size;
      }
      writeI8(value) {
        this.ensureBufferSizeToWrite(1);
        this.view.setInt8(this.pos, value);
        this.pos++;
      }
      writeU16(value) {
        this.ensureBufferSizeToWrite(2);
        this.view.setUint16(this.pos, value);
        this.pos += 2;
      }
      writeI16(value) {
        this.ensureBufferSizeToWrite(2);
        this.view.setInt16(this.pos, value);
        this.pos += 2;
      }
      writeU32(value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setUint32(this.pos, value);
        this.pos += 4;
      }
      writeI32(value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setInt32(this.pos, value);
        this.pos += 4;
      }
      writeF32(value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setFloat32(this.pos, value);
        this.pos += 4;
      }
      writeF64(value) {
        this.ensureBufferSizeToWrite(8);
        this.view.setFloat64(this.pos, value);
        this.pos += 8;
      }
      writeU64(value) {
        this.ensureBufferSizeToWrite(8);
        setUint64(this.view, this.pos, value);
        this.pos += 8;
      }
      writeI64(value) {
        this.ensureBufferSizeToWrite(8);
        setInt64(this.view, this.pos, value);
        this.pos += 8;
      }
      writeBigUint64(value) {
        this.ensureBufferSizeToWrite(8);
        this.view.setBigUint64(this.pos, value);
        this.pos += 8;
      }
      writeBigInt64(value) {
        this.ensureBufferSizeToWrite(8);
        this.view.setBigInt64(this.pos, value);
        this.pos += 8;
      }
    };
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/encode.mjs
function encode(value, options) {
  const encoder = new Encoder(options);
  return encoder.encodeSharedRef(value);
}
var init_encode = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/encode.mjs"() {
    init_Encoder();
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/prettyByte.mjs
function prettyByte(byte) {
  return `${byte < 0 ? "-" : ""}0x${Math.abs(byte).toString(16).padStart(2, "0")}`;
}
var init_prettyByte = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/prettyByte.mjs"() {
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/CachedKeyDecoder.mjs
var DEFAULT_MAX_KEY_LENGTH, DEFAULT_MAX_LENGTH_PER_KEY, CachedKeyDecoder;
var init_CachedKeyDecoder = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/CachedKeyDecoder.mjs"() {
    init_utf8();
    DEFAULT_MAX_KEY_LENGTH = 16;
    DEFAULT_MAX_LENGTH_PER_KEY = 16;
    CachedKeyDecoder = class {
      hit = 0;
      miss = 0;
      caches;
      maxKeyLength;
      maxLengthPerKey;
      constructor(maxKeyLength = DEFAULT_MAX_KEY_LENGTH, maxLengthPerKey = DEFAULT_MAX_LENGTH_PER_KEY) {
        this.maxKeyLength = maxKeyLength;
        this.maxLengthPerKey = maxLengthPerKey;
        this.caches = [];
        for (let i = 0; i < this.maxKeyLength; i++) {
          this.caches.push([]);
        }
      }
      canBeCached(byteLength) {
        return byteLength > 0 && byteLength <= this.maxKeyLength;
      }
      find(bytes, inputOffset, byteLength) {
        const records = this.caches[byteLength - 1];
        FIND_CHUNK: for (const record of records) {
          const recordBytes = record.bytes;
          for (let j = 0; j < byteLength; j++) {
            if (recordBytes[j] !== bytes[inputOffset + j]) {
              continue FIND_CHUNK;
            }
          }
          return record.str;
        }
        return null;
      }
      store(bytes, value) {
        const records = this.caches[bytes.length - 1];
        const record = { bytes, str: value };
        if (records.length >= this.maxLengthPerKey) {
          records[Math.random() * records.length | 0] = record;
        } else {
          records.push(record);
        }
      }
      decode(bytes, inputOffset, byteLength) {
        const cachedValue = this.find(bytes, inputOffset, byteLength);
        if (cachedValue != null) {
          this.hit++;
          return cachedValue;
        }
        this.miss++;
        const str = utf8DecodeJs(bytes, inputOffset, byteLength);
        const slicedCopyOfBytes = Uint8Array.prototype.slice.call(bytes, inputOffset, inputOffset + byteLength);
        this.store(slicedCopyOfBytes, str);
        return str;
      }
    };
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/Decoder.mjs
var STATE_ARRAY, STATE_MAP_KEY, STATE_MAP_VALUE, mapKeyConverter, StackPool, HEAD_BYTE_REQUIRED, EMPTY_VIEW, EMPTY_BYTES, MORE_DATA, sharedCachedKeyDecoder, Decoder;
var init_Decoder = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/Decoder.mjs"() {
    init_prettyByte();
    init_ExtensionCodec();
    init_int();
    init_utf8();
    init_typedArrays();
    init_CachedKeyDecoder();
    init_DecodeError();
    STATE_ARRAY = "array";
    STATE_MAP_KEY = "map_key";
    STATE_MAP_VALUE = "map_value";
    mapKeyConverter = (key) => {
      if (typeof key === "string" || typeof key === "number") {
        return key;
      }
      throw new DecodeError("The type of key must be string or number but " + typeof key);
    };
    StackPool = class {
      stack = [];
      stackHeadPosition = -1;
      get length() {
        return this.stackHeadPosition + 1;
      }
      top() {
        return this.stack[this.stackHeadPosition];
      }
      pushArrayState(size) {
        const state = this.getUninitializedStateFromPool();
        state.type = STATE_ARRAY;
        state.position = 0;
        state.size = size;
        state.array = new Array(size);
      }
      pushMapState(size) {
        const state = this.getUninitializedStateFromPool();
        state.type = STATE_MAP_KEY;
        state.readCount = 0;
        state.size = size;
        state.map = {};
      }
      getUninitializedStateFromPool() {
        this.stackHeadPosition++;
        if (this.stackHeadPosition === this.stack.length) {
          const partialState = {
            type: void 0,
            size: 0,
            array: void 0,
            position: 0,
            readCount: 0,
            map: void 0,
            key: null
          };
          this.stack.push(partialState);
        }
        return this.stack[this.stackHeadPosition];
      }
      release(state) {
        const topStackState = this.stack[this.stackHeadPosition];
        if (topStackState !== state) {
          throw new Error("Invalid stack state. Released state is not on top of the stack.");
        }
        if (state.type === STATE_ARRAY) {
          const partialState = state;
          partialState.size = 0;
          partialState.array = void 0;
          partialState.position = 0;
          partialState.type = void 0;
        }
        if (state.type === STATE_MAP_KEY || state.type === STATE_MAP_VALUE) {
          const partialState = state;
          partialState.size = 0;
          partialState.map = void 0;
          partialState.readCount = 0;
          partialState.type = void 0;
        }
        this.stackHeadPosition--;
      }
      reset() {
        this.stack.length = 0;
        this.stackHeadPosition = -1;
      }
    };
    HEAD_BYTE_REQUIRED = -1;
    EMPTY_VIEW = new DataView(new ArrayBuffer(0));
    EMPTY_BYTES = new Uint8Array(EMPTY_VIEW.buffer);
    try {
      EMPTY_VIEW.getInt8(0);
    } catch (e) {
      if (!(e instanceof RangeError)) {
        throw new Error("This module is not supported in the current JavaScript engine because DataView does not throw RangeError on out-of-bounds access");
      }
    }
    MORE_DATA = new RangeError("Insufficient data");
    sharedCachedKeyDecoder = new CachedKeyDecoder();
    Decoder = class _Decoder {
      extensionCodec;
      context;
      useBigInt64;
      rawStrings;
      maxStrLength;
      maxBinLength;
      maxArrayLength;
      maxMapLength;
      maxExtLength;
      keyDecoder;
      mapKeyConverter;
      totalPos = 0;
      pos = 0;
      view = EMPTY_VIEW;
      bytes = EMPTY_BYTES;
      headByte = HEAD_BYTE_REQUIRED;
      stack = new StackPool();
      entered = false;
      constructor(options) {
        this.extensionCodec = options?.extensionCodec ?? ExtensionCodec.defaultCodec;
        this.context = options?.context;
        this.useBigInt64 = options?.useBigInt64 ?? false;
        this.rawStrings = options?.rawStrings ?? false;
        this.maxStrLength = options?.maxStrLength ?? UINT32_MAX;
        this.maxBinLength = options?.maxBinLength ?? UINT32_MAX;
        this.maxArrayLength = options?.maxArrayLength ?? UINT32_MAX;
        this.maxMapLength = options?.maxMapLength ?? UINT32_MAX;
        this.maxExtLength = options?.maxExtLength ?? UINT32_MAX;
        this.keyDecoder = options?.keyDecoder !== void 0 ? options.keyDecoder : sharedCachedKeyDecoder;
        this.mapKeyConverter = options?.mapKeyConverter ?? mapKeyConverter;
      }
      clone() {
        return new _Decoder({
          extensionCodec: this.extensionCodec,
          context: this.context,
          useBigInt64: this.useBigInt64,
          rawStrings: this.rawStrings,
          maxStrLength: this.maxStrLength,
          maxBinLength: this.maxBinLength,
          maxArrayLength: this.maxArrayLength,
          maxMapLength: this.maxMapLength,
          maxExtLength: this.maxExtLength,
          keyDecoder: this.keyDecoder
        });
      }
      reinitializeState() {
        this.totalPos = 0;
        this.headByte = HEAD_BYTE_REQUIRED;
        this.stack.reset();
      }
      setBuffer(buffer) {
        const bytes = ensureUint8Array(buffer);
        this.bytes = bytes;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this.pos = 0;
      }
      appendBuffer(buffer) {
        if (this.headByte === HEAD_BYTE_REQUIRED && !this.hasRemaining(1)) {
          this.setBuffer(buffer);
        } else {
          const remainingData = this.bytes.subarray(this.pos);
          const newData = ensureUint8Array(buffer);
          const newBuffer = new Uint8Array(remainingData.length + newData.length);
          newBuffer.set(remainingData);
          newBuffer.set(newData, remainingData.length);
          this.setBuffer(newBuffer);
        }
      }
      hasRemaining(size) {
        return this.view.byteLength - this.pos >= size;
      }
      createExtraByteError(posToShow) {
        const { view, pos } = this;
        return new RangeError(`Extra ${view.byteLength - pos} of ${view.byteLength} byte(s) found at buffer[${posToShow}]`);
      }
      /**
       * @throws {@link DecodeError}
       * @throws {@link RangeError}
       */
      decode(buffer) {
        if (this.entered) {
          const instance = this.clone();
          return instance.decode(buffer);
        }
        try {
          this.entered = true;
          this.reinitializeState();
          this.setBuffer(buffer);
          const object = this.doDecodeSync();
          if (this.hasRemaining(1)) {
            throw this.createExtraByteError(this.pos);
          }
          return object;
        } finally {
          this.entered = false;
        }
      }
      *decodeMulti(buffer) {
        if (this.entered) {
          const instance = this.clone();
          yield* instance.decodeMulti(buffer);
          return;
        }
        try {
          this.entered = true;
          this.reinitializeState();
          this.setBuffer(buffer);
          while (this.hasRemaining(1)) {
            yield this.doDecodeSync();
          }
        } finally {
          this.entered = false;
        }
      }
      async decodeAsync(stream) {
        if (this.entered) {
          const instance = this.clone();
          return instance.decodeAsync(stream);
        }
        try {
          this.entered = true;
          let decoded = false;
          let object;
          for await (const buffer of stream) {
            if (decoded) {
              this.entered = false;
              throw this.createExtraByteError(this.totalPos);
            }
            this.appendBuffer(buffer);
            try {
              object = this.doDecodeSync();
              decoded = true;
            } catch (e) {
              if (!(e instanceof RangeError)) {
                throw e;
              }
            }
            this.totalPos += this.pos;
          }
          if (decoded) {
            if (this.hasRemaining(1)) {
              throw this.createExtraByteError(this.totalPos);
            }
            return object;
          }
          const { headByte, pos, totalPos } = this;
          throw new RangeError(`Insufficient data in parsing ${prettyByte(headByte)} at ${totalPos} (${pos} in the current buffer)`);
        } finally {
          this.entered = false;
        }
      }
      decodeArrayStream(stream) {
        return this.decodeMultiAsync(stream, true);
      }
      decodeStream(stream) {
        return this.decodeMultiAsync(stream, false);
      }
      async *decodeMultiAsync(stream, isArray) {
        if (this.entered) {
          const instance = this.clone();
          yield* instance.decodeMultiAsync(stream, isArray);
          return;
        }
        try {
          this.entered = true;
          let isArrayHeaderRequired = isArray;
          let arrayItemsLeft = -1;
          for await (const buffer of stream) {
            if (isArray && arrayItemsLeft === 0) {
              throw this.createExtraByteError(this.totalPos);
            }
            this.appendBuffer(buffer);
            if (isArrayHeaderRequired) {
              arrayItemsLeft = this.readArraySize();
              isArrayHeaderRequired = false;
              this.complete();
            }
            try {
              while (true) {
                yield this.doDecodeSync();
                if (--arrayItemsLeft === 0) {
                  break;
                }
              }
            } catch (e) {
              if (!(e instanceof RangeError)) {
                throw e;
              }
            }
            this.totalPos += this.pos;
          }
        } finally {
          this.entered = false;
        }
      }
      doDecodeSync() {
        DECODE: while (true) {
          const headByte = this.readHeadByte();
          let object;
          if (headByte >= 224) {
            object = headByte - 256;
          } else if (headByte < 192) {
            if (headByte < 128) {
              object = headByte;
            } else if (headByte < 144) {
              const size = headByte - 128;
              if (size !== 0) {
                this.pushMapState(size);
                this.complete();
                continue DECODE;
              } else {
                object = {};
              }
            } else if (headByte < 160) {
              const size = headByte - 144;
              if (size !== 0) {
                this.pushArrayState(size);
                this.complete();
                continue DECODE;
              } else {
                object = [];
              }
            } else {
              const byteLength = headByte - 160;
              object = this.decodeString(byteLength, 0);
            }
          } else if (headByte === 192) {
            object = null;
          } else if (headByte === 194) {
            object = false;
          } else if (headByte === 195) {
            object = true;
          } else if (headByte === 202) {
            object = this.readF32();
          } else if (headByte === 203) {
            object = this.readF64();
          } else if (headByte === 204) {
            object = this.readU8();
          } else if (headByte === 205) {
            object = this.readU16();
          } else if (headByte === 206) {
            object = this.readU32();
          } else if (headByte === 207) {
            if (this.useBigInt64) {
              object = this.readU64AsBigInt();
            } else {
              object = this.readU64();
            }
          } else if (headByte === 208) {
            object = this.readI8();
          } else if (headByte === 209) {
            object = this.readI16();
          } else if (headByte === 210) {
            object = this.readI32();
          } else if (headByte === 211) {
            if (this.useBigInt64) {
              object = this.readI64AsBigInt();
            } else {
              object = this.readI64();
            }
          } else if (headByte === 217) {
            const byteLength = this.lookU8();
            object = this.decodeString(byteLength, 1);
          } else if (headByte === 218) {
            const byteLength = this.lookU16();
            object = this.decodeString(byteLength, 2);
          } else if (headByte === 219) {
            const byteLength = this.lookU32();
            object = this.decodeString(byteLength, 4);
          } else if (headByte === 220) {
            const size = this.readU16();
            if (size !== 0) {
              this.pushArrayState(size);
              this.complete();
              continue DECODE;
            } else {
              object = [];
            }
          } else if (headByte === 221) {
            const size = this.readU32();
            if (size !== 0) {
              this.pushArrayState(size);
              this.complete();
              continue DECODE;
            } else {
              object = [];
            }
          } else if (headByte === 222) {
            const size = this.readU16();
            if (size !== 0) {
              this.pushMapState(size);
              this.complete();
              continue DECODE;
            } else {
              object = {};
            }
          } else if (headByte === 223) {
            const size = this.readU32();
            if (size !== 0) {
              this.pushMapState(size);
              this.complete();
              continue DECODE;
            } else {
              object = {};
            }
          } else if (headByte === 196) {
            const size = this.lookU8();
            object = this.decodeBinary(size, 1);
          } else if (headByte === 197) {
            const size = this.lookU16();
            object = this.decodeBinary(size, 2);
          } else if (headByte === 198) {
            const size = this.lookU32();
            object = this.decodeBinary(size, 4);
          } else if (headByte === 212) {
            object = this.decodeExtension(1, 0);
          } else if (headByte === 213) {
            object = this.decodeExtension(2, 0);
          } else if (headByte === 214) {
            object = this.decodeExtension(4, 0);
          } else if (headByte === 215) {
            object = this.decodeExtension(8, 0);
          } else if (headByte === 216) {
            object = this.decodeExtension(16, 0);
          } else if (headByte === 199) {
            const size = this.lookU8();
            object = this.decodeExtension(size, 1);
          } else if (headByte === 200) {
            const size = this.lookU16();
            object = this.decodeExtension(size, 2);
          } else if (headByte === 201) {
            const size = this.lookU32();
            object = this.decodeExtension(size, 4);
          } else {
            throw new DecodeError(`Unrecognized type byte: ${prettyByte(headByte)}`);
          }
          this.complete();
          const stack = this.stack;
          while (stack.length > 0) {
            const state = stack.top();
            if (state.type === STATE_ARRAY) {
              state.array[state.position] = object;
              state.position++;
              if (state.position === state.size) {
                object = state.array;
                stack.release(state);
              } else {
                continue DECODE;
              }
            } else if (state.type === STATE_MAP_KEY) {
              if (object === "__proto__") {
                throw new DecodeError("The key __proto__ is not allowed");
              }
              state.key = this.mapKeyConverter(object);
              state.type = STATE_MAP_VALUE;
              continue DECODE;
            } else {
              state.map[state.key] = object;
              state.readCount++;
              if (state.readCount === state.size) {
                object = state.map;
                stack.release(state);
              } else {
                state.key = null;
                state.type = STATE_MAP_KEY;
                continue DECODE;
              }
            }
          }
          return object;
        }
      }
      readHeadByte() {
        if (this.headByte === HEAD_BYTE_REQUIRED) {
          this.headByte = this.readU8();
        }
        return this.headByte;
      }
      complete() {
        this.headByte = HEAD_BYTE_REQUIRED;
      }
      readArraySize() {
        const headByte = this.readHeadByte();
        switch (headByte) {
          case 220:
            return this.readU16();
          case 221:
            return this.readU32();
          default: {
            if (headByte < 160) {
              return headByte - 144;
            } else {
              throw new DecodeError(`Unrecognized array type byte: ${prettyByte(headByte)}`);
            }
          }
        }
      }
      pushMapState(size) {
        if (size > this.maxMapLength) {
          throw new DecodeError(`Max length exceeded: map length (${size}) > maxMapLengthLength (${this.maxMapLength})`);
        }
        this.stack.pushMapState(size);
      }
      pushArrayState(size) {
        if (size > this.maxArrayLength) {
          throw new DecodeError(`Max length exceeded: array length (${size}) > maxArrayLength (${this.maxArrayLength})`);
        }
        this.stack.pushArrayState(size);
      }
      decodeString(byteLength, headerOffset) {
        if (!this.rawStrings || this.stateIsMapKey()) {
          return this.decodeUtf8String(byteLength, headerOffset);
        }
        return this.decodeBinary(byteLength, headerOffset);
      }
      /**
       * @throws {@link RangeError}
       */
      decodeUtf8String(byteLength, headerOffset) {
        if (byteLength > this.maxStrLength) {
          throw new DecodeError(`Max length exceeded: UTF-8 byte length (${byteLength}) > maxStrLength (${this.maxStrLength})`);
        }
        if (this.bytes.byteLength < this.pos + headerOffset + byteLength) {
          throw MORE_DATA;
        }
        const offset = this.pos + headerOffset;
        let object;
        if (this.stateIsMapKey() && this.keyDecoder?.canBeCached(byteLength)) {
          object = this.keyDecoder.decode(this.bytes, offset, byteLength);
        } else {
          object = utf8Decode(this.bytes, offset, byteLength);
        }
        this.pos += headerOffset + byteLength;
        return object;
      }
      stateIsMapKey() {
        if (this.stack.length > 0) {
          const state = this.stack.top();
          return state.type === STATE_MAP_KEY;
        }
        return false;
      }
      /**
       * @throws {@link RangeError}
       */
      decodeBinary(byteLength, headOffset) {
        if (byteLength > this.maxBinLength) {
          throw new DecodeError(`Max length exceeded: bin length (${byteLength}) > maxBinLength (${this.maxBinLength})`);
        }
        if (!this.hasRemaining(byteLength + headOffset)) {
          throw MORE_DATA;
        }
        const offset = this.pos + headOffset;
        const object = this.bytes.subarray(offset, offset + byteLength);
        this.pos += headOffset + byteLength;
        return object;
      }
      decodeExtension(size, headOffset) {
        if (size > this.maxExtLength) {
          throw new DecodeError(`Max length exceeded: ext length (${size}) > maxExtLength (${this.maxExtLength})`);
        }
        const extType = this.view.getInt8(this.pos + headOffset);
        const data = this.decodeBinary(
          size,
          headOffset + 1
          /* extType */
        );
        return this.extensionCodec.decode(data, extType, this.context);
      }
      lookU8() {
        return this.view.getUint8(this.pos);
      }
      lookU16() {
        return this.view.getUint16(this.pos);
      }
      lookU32() {
        return this.view.getUint32(this.pos);
      }
      readU8() {
        const value = this.view.getUint8(this.pos);
        this.pos++;
        return value;
      }
      readI8() {
        const value = this.view.getInt8(this.pos);
        this.pos++;
        return value;
      }
      readU16() {
        const value = this.view.getUint16(this.pos);
        this.pos += 2;
        return value;
      }
      readI16() {
        const value = this.view.getInt16(this.pos);
        this.pos += 2;
        return value;
      }
      readU32() {
        const value = this.view.getUint32(this.pos);
        this.pos += 4;
        return value;
      }
      readI32() {
        const value = this.view.getInt32(this.pos);
        this.pos += 4;
        return value;
      }
      readU64() {
        const value = getUint64(this.view, this.pos);
        this.pos += 8;
        return value;
      }
      readI64() {
        const value = getInt64(this.view, this.pos);
        this.pos += 8;
        return value;
      }
      readU64AsBigInt() {
        const value = this.view.getBigUint64(this.pos);
        this.pos += 8;
        return value;
      }
      readI64AsBigInt() {
        const value = this.view.getBigInt64(this.pos);
        this.pos += 8;
        return value;
      }
      readF32() {
        const value = this.view.getFloat32(this.pos);
        this.pos += 4;
        return value;
      }
      readF64() {
        const value = this.view.getFloat64(this.pos);
        this.pos += 8;
        return value;
      }
    };
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/decode.mjs
function decode(buffer, options) {
  const decoder = new Decoder(options);
  return decoder.decode(buffer);
}
var init_decode = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/decode.mjs"() {
    init_Decoder();
  }
});

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/index.mjs
var init_dist = __esm({
  "node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/index.mjs"() {
    init_encode();
    init_decode();
  }
});

// src/core/protocol.ts
function unpack4Bit(packed, width, height) {
  const length = width * height;
  const data = new Uint8Array(length);
  for (let i = 0; i < packed.length; i++) {
    const byte = packed[i];
    const p1 = byte & 240;
    const p2 = (byte & 15) << 4;
    data[i * 2] = p1;
    data[i * 2 + 1] = p2;
  }
  return data;
}
function columnarize(points, tree, width, height, useHDC = false) {
  const count = points.length;
  const x = new Uint16Array(count);
  const y = new Uint16Array(count);
  const angle = new Int16Array(count);
  const scale = new Uint8Array(count);
  let descriptors;
  if (useHDC) {
    descriptors = new Uint32Array(count);
  } else {
    descriptors = new Uint32Array(count * 2);
  }
  for (let i = 0; i < count; i++) {
    x[i] = Math.round(points[i].x / width * 65535);
    y[i] = Math.round(points[i].y / height * 65535);
    angle[i] = Math.round(points[i].angle / Math.PI * 32767);
    scale[i] = Math.round(Math.log2(points[i].scale || 1));
    if (points[i].descriptors && points[i].descriptors.length >= 2) {
      if (useHDC) {
        descriptors[i] = points[i].hdcSignature || 0;
      } else {
        descriptors[i * 2] = points[i].descriptors[0];
        descriptors[i * 2 + 1] = points[i].descriptors[1];
      }
    }
  }
  return {
    x,
    y,
    a: angle,
    s: scale,
    d: descriptors,
    hdc: useHDC ? 1 : 0,
    // HDC Flag (renamed from h to avoid collision with height)
    t: compactTree(tree.rootNode)
  };
}
function columnarizeCompact(points, tree, width, height) {
  const count = points.length;
  const x = new Uint16Array(count);
  const y = new Uint16Array(count);
  const angle = new Int16Array(count);
  const scale = new Uint8Array(count);
  const descriptors = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    x[i] = Math.round(points[i].x / width * 65535);
    y[i] = Math.round(points[i].y / height * 65535);
    angle[i] = Math.round(points[i].angle / Math.PI * 32767);
    scale[i] = Math.round(Math.log2(points[i].scale || 1));
    if (points[i].descriptors && points[i].descriptors.length >= 2) {
      descriptors[i] = (points[i].descriptors[0] ^ points[i].descriptors[1]) >>> 0;
    }
  }
  return {
    x,
    y,
    a: angle,
    s: scale,
    d: descriptors,
    compact: 1,
    // Flag to indicate compact 32-bit descriptors
    t: compactTree(tree.rootNode)
  };
}
function compactTree(node) {
  if (node.leaf) {
    return [1, node.centerPointIndex || 0, node.pointIndexes];
  }
  return [0, node.centerPointIndex || 0, node.children.map((c) => compactTree(c))];
}
function decodeTaar(buffer) {
  const content = decode(new Uint8Array(buffer));
  const version = content.v || 0;
  if (version < 5 || version > CURRENT_VERSION) {
    console.warn(`Potential incompatible .taar version: ${version}. Standard is ${CURRENT_VERSION}.`);
  }
  const dataList = content.dataList;
  for (let i = 0; i < dataList.length; i++) {
    const item = dataList[i];
    for (const td of item.trackingData) {
      const normalizeBuffer = (arr, Type) => {
        if (arr instanceof Uint8Array && Type !== Uint8Array) {
          return new Type(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength));
        }
        return arr;
      };
      td.px = normalizeBuffer(td.px, Float32Array);
      td.py = normalizeBuffer(td.py, Float32Array);
      const rawData = td.data || td.d;
      const w = td.width || td.w;
      const h = td.height || td.h;
      if (rawData && rawData.length === w * h / 2) {
        const unpacked = unpack4Bit(rawData, w, h);
        if (td.data) td.data = unpacked;
        if (td.d) td.d = unpacked;
      }
      if (td.mesh) {
        td.mesh.t = normalizeBuffer(td.mesh.t, Uint16Array);
        td.mesh.e = normalizeBuffer(td.mesh.e, Uint16Array);
        td.mesh.rl = normalizeBuffer(td.mesh.rl, Float32Array);
      }
    }
    for (const kf of item.matchingData) {
      for (const col of [kf.max, kf.min]) {
        if (!col) continue;
        let xRaw = col.x;
        let yRaw = col.y;
        if (xRaw instanceof Uint8Array) {
          xRaw = new Uint16Array(xRaw.buffer.slice(xRaw.byteOffset, xRaw.byteOffset + xRaw.byteLength));
        }
        if (yRaw instanceof Uint8Array) {
          yRaw = new Uint16Array(yRaw.buffer.slice(yRaw.byteOffset, yRaw.byteOffset + yRaw.byteLength));
        }
        const count = xRaw.length;
        const x = new Float32Array(count);
        const y = new Float32Array(count);
        for (let k = 0; k < count; k++) {
          x[k] = xRaw[k] / 65535 * kf.w;
          y[k] = yRaw[k] / 65535 * kf.h;
        }
        col.x = x;
        col.y = y;
        if (col.a instanceof Uint8Array) {
          const aRaw = new Int16Array(col.a.buffer.slice(col.a.byteOffset, col.a.byteOffset + col.a.byteLength));
          const a = new Float32Array(count);
          for (let k = 0; k < count; k++) {
            a[k] = aRaw[k] / 32767 * Math.PI;
          }
          col.a = a;
        }
        if (col.s instanceof Uint8Array) {
          const sRaw = col.s;
          const s = new Float32Array(count);
          for (let k = 0; k < count; k++) {
            s[k] = Math.pow(2, sRaw[k]);
          }
          col.s = s;
        }
        if (col.d instanceof Uint8Array) {
          if (col.hdc === 1) {
            col.d = new Uint32Array(col.d.buffer.slice(col.d.byteOffset, col.d.byteOffset + col.d.byteLength));
          } else {
            col.d = new Uint32Array(col.d.buffer.slice(col.d.byteOffset, col.d.byteOffset + col.d.byteLength));
          }
        }
      }
    }
  }
  return { version, dataList };
}
function encodeTaar(dataList) {
  return encode({
    v: CURRENT_VERSION,
    dataList
  });
}
var CURRENT_VERSION;
var init_protocol = __esm({
  "src/core/protocol.ts"() {
    "use strict";
    init_dist();
    CURRENT_VERSION = 11;
  }
});

// src/core/detector/detector-lite.js
var PYRAMID_MIN_SIZE, NUM_BUCKETS_PER_DIMENSION, DEFAULT_MAX_FEATURES_PER_BUCKET, ORIENTATION_NUM_BINS, FREAK_EXPANSION_FACTOR, globalUseGPU, DetectorLite;
var init_detector_lite = __esm({
  "src/core/detector/detector-lite.js"() {
    "use strict";
    init_freak();
    init_gpu_compute();
    init_lsh_direct();
    init_protocol();
    PYRAMID_MIN_SIZE = 4;
    NUM_BUCKETS_PER_DIMENSION = 15;
    DEFAULT_MAX_FEATURES_PER_BUCKET = 12;
    ORIENTATION_NUM_BINS = 36;
    FREAK_EXPANSION_FACTOR = 7;
    globalUseGPU = true;
    DetectorLite = class {
      constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.useGPU = options.useGPU !== void 0 ? options.useGPU : globalUseGPU;
        this.useLSH = options.useLSH !== void 0 ? options.useLSH : true;
        this.useHDC = options.useHDC !== void 0 ? options.useHDC : true;
        this.maxFeaturesPerBucket = options.maxFeaturesPerBucket !== void 0 ? options.maxFeaturesPerBucket : DEFAULT_MAX_FEATURES_PER_BUCKET;
        let numOctaves = 0;
        let w = width, h = height;
        while (w >= PYRAMID_MIN_SIZE && h >= PYRAMID_MIN_SIZE) {
          w = Math.floor(w / 2);
          h = Math.floor(h / 2);
          numOctaves++;
          if (numOctaves === 10) break;
        }
        this.numOctaves = options.maxOctaves !== void 0 ? Math.min(numOctaves, options.maxOctaves) : numOctaves;
      }
      /**
       * Detecta características en una imagen en escala de grises
       * @param {Float32Array|Uint8Array} imageData - Datos de imagen (width * height)
       * @param {Object} options - Opciones de detección (ej. octavesToProcess)
       * @returns {{featurePoints: Array}} Puntos de características detectados
       */
      detect(imageData, options = {}) {
        const octavesToProcess = options.octavesToProcess || Array.from({ length: this.numOctaves }, (_, i) => i);
        let data;
        if (imageData instanceof Float32Array) {
          data = imageData;
        } else {
          data = new Float32Array(imageData.length);
          for (let i = 0; i < imageData.length; i++) {
            data[i] = imageData[i];
          }
        }
        const pyramidImages = this._buildGaussianPyramid(data, this.width, this.height, octavesToProcess);
        const dogPyramid = this._buildDogPyramid(pyramidImages, octavesToProcess);
        const extremas = this._findExtremas(dogPyramid, pyramidImages);
        const prunedExtremas = this._applyPrune(extremas);
        this._computeOrientations(prunedExtremas, pyramidImages);
        this._computeFreakDescriptors(prunedExtremas, pyramidImages);
        const featurePoints = prunedExtremas.map((ext) => {
          const scale = Math.pow(2, ext.octave);
          return {
            maxima: ext.score > 0,
            x: ext.x * scale + scale * 0.5 - 0.5,
            y: ext.y * scale + scale * 0.5 - 0.5,
            scale,
            angle: ext.angle || 0,
            score: ext.absScore,
            // Pass through score for sorting in Matcher
            descriptors: this.useLSH && ext.lsh ? ext.lsh : ext.descriptors || [],
            imageData: data
            // Pass source image for refinement
          };
        });
        return { featurePoints, pyramid: pyramidImages };
      }
      /**
       * Construye una pirámide gaussiana
       */
      _buildGaussianPyramid(data, width, height, octavesToProcess = null) {
        if (this.useGPU) {
          try {
            const gpuPyramid = gpuCompute.buildPyramid(data, width, height, this.numOctaves);
            const pyramid2 = [];
            for (let i = 0; i < gpuPyramid.length && i < this.numOctaves; i++) {
              if (octavesToProcess && !octavesToProcess.includes(i)) {
                pyramid2.push(null);
                continue;
              }
              const level = gpuPyramid[i];
              const img2 = this._applyGaussianFilter(level.data, level.width, level.height);
              pyramid2.push([
                { data: level.data, width: level.width, height: level.height },
                { data: img2.data, width: level.width, height: level.height }
              ]);
            }
            return pyramid2;
          } catch (e) {
            console.warn("GPU pyramid failed, falling back to CPU:", e.message);
          }
        }
        if (!this._pyramidBuffers || this._pyramidBuffers.width !== width || this._pyramidBuffers.height !== height) {
          this._pyramidBuffers = { width, height, temp: new Float32Array(width * height) };
        }
        const pyramid = [];
        let currentData = data;
        let currentWidth = width;
        let currentHeight = height;
        for (let i = 0; i < this.numOctaves; i++) {
          const shouldProcess = !octavesToProcess || octavesToProcess.includes(i);
          if (shouldProcess) {
            const img1 = this._applyGaussianFilter(currentData, currentWidth, currentHeight);
            const img2 = this._applyGaussianFilter(img1.data, currentWidth, currentHeight);
            pyramid.push([
              { data: img1.data, width: currentWidth, height: currentHeight },
              { data: img2.data, width: currentWidth, height: currentHeight }
            ]);
          } else {
            pyramid.push(null);
          }
          if (i < this.numOctaves - 1) {
            const needsDownsample = !octavesToProcess || octavesToProcess.some((o) => o > i);
            if (needsDownsample) {
              const sourceData = shouldProcess ? pyramid[i][0].data : currentData;
              const downsampled = this._downsample(sourceData, currentWidth, currentHeight);
              currentData = downsampled.data;
              currentWidth = downsampled.width;
              currentHeight = downsampled.height;
            } else {
              break;
            }
          }
        }
        return pyramid;
      }
      /**
       * Aplica un filtro gaussiano binomial [1,4,6,4,1] - Optimizado
       */
      _applyGaussianFilter(data, width, height) {
        const output = new Float32Array(width * height);
        const temp = this._pyramidBuffers?.temp || new Float32Array(width * height);
        const k0 = 0.0625, k1 = 0.25, k2 = 0.375;
        const w1 = width - 1;
        for (let y = 0; y < height; y++) {
          const rowOffset = y * width;
          const sumL0 = k0 + k1 + k2 + k1 + k0;
          temp[rowOffset] = (data[rowOffset] * (k0 + k1 + k2) + data[rowOffset + 1] * k1 + data[rowOffset + 2] * k0) * (1 / (k0 + k1 + k2));
          temp[rowOffset + 1] = (data[rowOffset] * k1 + data[rowOffset + 1] * k2 + data[rowOffset + 2] * k1 + data[rowOffset + 3] * k0) * (1 / (k1 + k2 + k1 + k0));
          for (let x = 2; x < width - 2; x++) {
            const pos = rowOffset + x;
            temp[pos] = data[pos - 2] * k0 + data[pos - 1] * k1 + data[pos] * k2 + data[pos + 1] * k1 + data[pos + 2] * k0;
          }
          const r2 = rowOffset + width - 2;
          const r1 = rowOffset + width - 1;
          temp[r2] = (data[r2 - 2] * k0 + data[r2 - 1] * k1 + data[r2] * k2 + data[r1] * k1) * (1 / (k0 + k1 + k2 + k1));
          temp[r1] = (data[r1 - 2] * k0 + data[r1 - 1] * k1 + data[r1] * (k2 + k1 + k0)) * (1 / (k0 + k1 + k2));
        }
        for (let x = 0; x < width; x++) {
          output[x] = (temp[x] * (k0 + k1 + k2) + temp[x + width] * k1 + temp[x + width * 2] * k0) * (1 / (k0 + k1 + k2));
          output[x + width] = (temp[x] * k1 + temp[x + width] * k2 + temp[x + width * 2] * k1 + temp[x + width * 3] * k0) * (1 / (k1 + k2 + k1 + k0));
          for (let y = 2; y < height - 2; y++) {
            const p = y * width + x;
            output[p] = temp[p - width * 2] * k0 + temp[p - width] * k1 + temp[p] * k2 + temp[p + width] * k1 + temp[p + width * 2] * k0;
          }
          const b2 = (height - 2) * width + x;
          const b1 = (height - 1) * width + x;
          output[b2] = (temp[b2 - width * 2] * k0 + temp[b2 - width] * k1 + temp[b2] * k2 + temp[b1] * k1) * (1 / (k0 + k1 + k2 + k1));
          output[b1] = (temp[b1 - width * 2] * k0 + temp[b1 - width] * k1 + temp[b1] * (k2 + k1 + k0)) * (1 / (k0 + k1 + k2));
        }
        return { data: output, width, height };
      }
      /**
       * Downsample imagen por factor de 2
       */
      _downsample(data, width, height) {
        const newWidth = width >> 1;
        const newHeight = height >> 1;
        const output = new Float32Array(newWidth * newHeight);
        for (let y = 0; y < newHeight; y++) {
          const r0 = y * 2 * width;
          const r1 = r0 + width;
          const dr = y * newWidth;
          for (let x = 0; x < newWidth; x++) {
            const i2 = x * 2;
            output[dr + x] = (data[r0 + i2] + data[r0 + i2 + 1] + data[r1 + i2] + data[r1 + i2 + 1]) * 0.25;
          }
        }
        return { data: output, width: newWidth, height: newHeight };
      }
      /**
       * Construye pirámide de diferencia de gaussianas
       */
      _buildDogPyramid(pyramidImages, octavesToProcess = null) {
        const dogPyramid = [];
        for (let i = 0; i < pyramidImages.length; i++) {
          if (!pyramidImages[i]) {
            dogPyramid.push(null);
            continue;
          }
          const img1 = pyramidImages[i][0];
          const img2 = pyramidImages[i][1];
          const width = img1.width;
          const height = img1.height;
          const dog = new Float32Array(width * height);
          for (let j = 0; j < dog.length; j++) {
            dog[j] = img2.data[j] - img1.data[j];
          }
          dogPyramid.push({ data: dog, width, height });
        }
        return dogPyramid;
      }
      /**
       * Encuentra extremos locales en la pirámide DoG
       */
      _findExtremas(dogPyramid, pyramidImages) {
        const extremas = [];
        for (let octave = 0; octave < dogPyramid.length; octave++) {
          const curr = dogPyramid[octave];
          if (!curr) continue;
          const prev = octave > 0 ? dogPyramid[octave - 1] : null;
          const next = octave < dogPyramid.length - 1 ? dogPyramid[octave + 1] : null;
          const width = curr.width;
          const height = curr.height;
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const val = curr.data[y * width + x];
              if (Math.abs(val) < 3e-3) continue;
              let isMaxima = true;
              let isMinima = true;
              for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
                for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const neighbor = curr.data[(y + dy) * width + (x + dx)];
                  if (neighbor >= val) isMaxima = false;
                  if (neighbor <= val) isMinima = false;
                }
              }
              if ((isMaxima || isMinima) && prev) {
                const px = x << 1;
                const py = y << 1;
                const prevWidth = prev.width;
                for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
                  for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                    const xx = Math.max(0, Math.min(prevWidth - 1, px + dx));
                    const yy = Math.max(0, Math.min(prev.height - 1, py + dy));
                    const neighbor = prev.data[yy * prevWidth + xx];
                    if (neighbor >= val) isMaxima = false;
                    if (neighbor <= val) isMinima = false;
                  }
                }
              }
              if ((isMaxima || isMinima) && next) {
                const nx = x >> 1;
                const ny = y >> 1;
                const nextWidth = next.width;
                for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
                  for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                    const xx = Math.max(0, Math.min(nextWidth - 1, nx + dx));
                    const yy = Math.max(0, Math.min(next.height - 1, ny + dy));
                    const neighbor = next.data[yy * nextWidth + xx];
                    if (neighbor >= val) isMaxima = false;
                    if (neighbor <= val) isMinima = false;
                  }
                }
              }
              if (isMaxima || isMinima) {
                extremas.push({
                  score: isMaxima ? Math.abs(val) : -Math.abs(val),
                  octave,
                  x,
                  y,
                  absScore: Math.abs(val)
                });
              }
            }
          }
        }
        return extremas;
      }
      /**
       * Aplica pruning para mantener solo los mejores features por bucket
       */
      _applyPrune(extremas) {
        const nBuckets = NUM_BUCKETS_PER_DIMENSION;
        const nFeatures = this.maxFeaturesPerBucket;
        const buckets = [];
        for (let i = 0; i < nBuckets * nBuckets; i++) {
          buckets.push([]);
        }
        for (const ext of extremas) {
          const bucketX = Math.min(nBuckets - 1, Math.floor(ext.x / (this.width / Math.pow(2, ext.octave)) * nBuckets));
          const bucketY = Math.min(nBuckets - 1, Math.floor(ext.y / (this.height / Math.pow(2, ext.octave)) * nBuckets));
          const bucketIdx = bucketY * nBuckets + bucketX;
          if (bucketIdx >= 0 && bucketIdx < buckets.length) {
            buckets[bucketIdx].push(ext);
          }
        }
        const result = [];
        for (const bucket of buckets) {
          bucket.sort((a, b) => b.absScore - a.absScore);
          for (let i = 0; i < Math.min(nFeatures, bucket.length); i++) {
            result.push(bucket[i]);
          }
        }
        return result;
      }
      /**
       * Calcula la orientación de cada feature
       */
      _computeOrientations(extremas, pyramidImages) {
        for (const ext of extremas) {
          if (ext.octave < 0 || ext.octave >= pyramidImages.length) {
            ext.angle = 0;
            continue;
          }
          const img = pyramidImages[ext.octave][1];
          const width = img.width;
          const height = img.height;
          const data = img.data;
          const x = Math.floor(ext.x);
          const y = Math.floor(ext.y);
          const histogram = new Float32Array(ORIENTATION_NUM_BINS);
          const radius = 4;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const yy = y + dy;
              const xx = x + dx;
              if (yy <= 0 || yy >= height - 1 || xx <= 0 || xx >= width - 1) continue;
              const gradY = data[(yy + 1) * width + xx] - data[(yy - 1) * width + xx];
              const gradX = data[yy * width + xx + 1] - data[yy * width + xx - 1];
              const mag = Math.sqrt(gradX * gradX + gradY * gradY);
              const angle = Math.atan2(gradY, gradX) + Math.PI;
              const bin = Math.floor(angle / (2 * Math.PI) * ORIENTATION_NUM_BINS) % ORIENTATION_NUM_BINS;
              const weight = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
              histogram[bin] += mag * weight;
            }
          }
          let maxBin = 0;
          for (let i = 1; i < ORIENTATION_NUM_BINS; i++) {
            if (histogram[i] > histogram[maxBin]) {
              maxBin = i;
            }
          }
          ext.angle = (maxBin + 0.5) * 2 * Math.PI / ORIENTATION_NUM_BINS - Math.PI;
        }
      }
      /**
       * Calcula descriptores FREAK
       */
      _computeFreakDescriptors(extremas, pyramidImages) {
        for (const ext of extremas) {
          if (ext.octave < 0 || ext.octave >= pyramidImages.length) {
            ext.descriptors = new Uint8Array(8);
            continue;
          }
          const img = pyramidImages[ext.octave][1];
          const width = img.width;
          const height = img.height;
          const data = img.data;
          const cos = Math.cos(ext.angle || 0) * FREAK_EXPANSION_FACTOR;
          const sin = Math.sin(ext.angle || 0) * FREAK_EXPANSION_FACTOR;
          const samples = new Float32Array(FREAKPOINTS.length);
          for (let i = 0; i < FREAKPOINTS.length; i++) {
            const [, fx, fy] = FREAKPOINTS[i];
            const xp = ext.x + fx * cos - fy * sin;
            const yp = ext.y + fx * sin + fy * cos;
            const x0 = Math.max(0, Math.min(width - 2, Math.floor(xp)));
            const y0 = Math.max(0, Math.min(height - 2, Math.floor(yp)));
            const x1 = x0 + 1;
            const y1 = y0 + 1;
            const fracX = xp - x0;
            const fracY = yp - y0;
            samples[i] = data[y0 * width + x0] * (1 - fracX) * (1 - fracY) + data[y0 * width + x1] * fracX * (1 - fracY) + data[y1 * width + x0] * (1 - fracX) * fracY + data[y1 * width + x1] * fracX * fracY;
          }
          if (this.useLSH) {
            ext.lsh = computeLSH64(samples);
            ext.descriptors = packLSHIntoDescriptor(ext.lsh);
          } else {
            ext.descriptors = computeFullFREAK(samples);
          }
        }
      }
    };
  }
});

// node_modules/.pnpm/tinyqueue@2.0.3/node_modules/tinyqueue/index.js
function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
var TinyQueue;
var init_tinyqueue = __esm({
  "node_modules/.pnpm/tinyqueue@2.0.3/node_modules/tinyqueue/index.js"() {
    TinyQueue = class {
      constructor(data = [], compare = defaultCompare) {
        this.data = data;
        this.length = this.data.length;
        this.compare = compare;
        if (this.length > 0) {
          for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
        }
      }
      push(item) {
        this.data.push(item);
        this.length++;
        this._up(this.length - 1);
      }
      pop() {
        if (this.length === 0) return void 0;
        const top = this.data[0];
        const bottom = this.data.pop();
        this.length--;
        if (this.length > 0) {
          this.data[0] = bottom;
          this._down(0);
        }
        return top;
      }
      peek() {
        return this.data[0];
      }
      _up(pos) {
        const { data, compare } = this;
        const item = data[pos];
        while (pos > 0) {
          const parent = pos - 1 >> 1;
          const current = data[parent];
          if (compare(item, current) >= 0) break;
          data[pos] = current;
          pos = parent;
        }
        data[pos] = item;
      }
      _down(pos) {
        const { data, compare } = this;
        const halfLength = this.length >> 1;
        const item = data[pos];
        while (pos < halfLength) {
          let left = (pos << 1) + 1;
          let best = data[left];
          const right = left + 1;
          if (right < this.length && compare(data[right], best) < 0) {
            left = right;
            best = data[right];
          }
          if (compare(best, item) >= 0) break;
          data[pos] = best;
          pos = left;
        }
        data[pos] = item;
      }
    };
  }
});

// src/core/matching/hamming-distance.js
function popcount32(n) {
  n = n >>> 0;
  n -= n >>> 1 & 1431655765;
  n = (n & 858993459) + (n >>> 2 & 858993459);
  return (n + (n >>> 4) & 252645135) * 16843009 >>> 24;
}
var BIT_COUNT_8, compute64, compute;
var init_hamming_distance = __esm({
  "src/core/matching/hamming-distance.js"() {
    "use strict";
    BIT_COUNT_8 = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let c = 0, n = i;
      while (n > 0) {
        n &= n - 1;
        c++;
      }
      BIT_COUNT_8[i] = c;
    }
    compute64 = (v1, v1Idx, v2, v2Idx) => {
      let x1 = (v1[v1Idx] ^ v2[v2Idx]) >>> 0;
      let x2 = (v1[v1Idx + 1] ^ v2[v2Idx + 1]) >>> 0;
      x1 -= x1 >>> 1 & 1431655765;
      x1 = (x1 & 858993459) + (x1 >>> 2 & 858993459);
      const count1 = (x1 + (x1 >>> 4) & 252645135) * 16843009 >>> 24;
      x2 -= x2 >>> 1 & 1431655765;
      x2 = (x2 & 858993459) + (x2 >>> 2 & 858993459);
      const count2 = (x2 + (x2 >>> 4) & 252645135) * 16843009 >>> 24;
      return count1 + count2;
    };
    compute = (options) => {
      const { v1, v2, v1Offset = 0, v2Offset = 0 } = options;
      const v2Len = v2.length - v2Offset;
      if (v2Len === 2) {
        return compute64(v1, v1Offset, v2, v2Offset);
      }
      if (v2Len === 84) {
        let d = 0;
        for (let i = 0; i < 84; i++) {
          d += BIT_COUNT_8[v1[v1Offset + i] ^ v2[v2Offset + i]];
        }
        return d;
      }
      if (v2Len === 4) {
        return popcount32(v1[v1Offset] ^ v2[v2Offset]) + popcount32(v1[v1Offset + 1] ^ v2[v2Offset + 1]) + popcount32(v1[v1Offset + 2] ^ v2[v2Offset + 2]) + popcount32(v1[v1Offset + 3] ^ v2[v2Offset + 3]);
      }
      return popcount32(v1[v1Offset] ^ v2[v2Offset]) + popcount32(v1[v1Offset + 1] ^ v2[v2Offset + 1]);
    };
  }
});

// src/core/matching/hough.js
var computeHoughMatches, _mapCorrespondence;
var init_hough = __esm({
  "src/core/matching/hough.js"() {
    "use strict";
    computeHoughMatches = (options) => {
      const { keywidth, keyheight, querywidth, queryheight, matches } = options;
      const maxX = querywidth * 1.2;
      const minX = -maxX;
      const maxY = queryheight * 1.2;
      const minY = -maxY;
      const numAngleBins = 12;
      const numScaleBins = 12;
      const minScale = -2;
      const maxScale = 1;
      const scaleK = 10;
      const scaleOneOverLogK = 1 / Math.log(scaleK);
      const maxDim = Math.max(keywidth, keyheight);
      const keycenterX = Math.floor(keywidth / 2);
      const keycenterY = Math.floor(keyheight / 2);
      const projectedDims = [];
      for (let i = 0; i < matches.length; i++) {
        const queryscale = matches[i].querypoint.scale;
        const keyscale = matches[i].keypoint.scale;
        if (keyscale == 0) console.log("ERROR divide zero");
        const scale = queryscale / keyscale;
        projectedDims.push(scale * maxDim);
      }
      projectedDims.sort((a1, a2) => {
        return a1 - a2;
      });
      const medianProjectedDim = projectedDims[Math.floor(projectedDims.length / 2) - (projectedDims.length % 2 == 0 ? 1 : 0) - 1];
      const binSize = Math.max(20, 0.25 * medianProjectedDim);
      const numXBins = Math.max(5, Math.min(40, Math.ceil((maxX - minX) / binSize)));
      const numYBins = Math.max(5, Math.min(40, Math.ceil((maxY - minY) / binSize)));
      const numXYBins = numXBins * numYBins;
      const numXYAngleBins = numXYBins * numAngleBins;
      const querypointValids = [];
      const querypointBinLocations = [];
      const votes = {};
      for (let i = 0; i < matches.length; i++) {
        const querypoint = matches[i].querypoint;
        const keypoint = matches[i].keypoint;
        const { x, y, scale, angle } = _mapCorrespondence({
          querypoint,
          keypoint,
          keycenterX,
          keycenterY,
          scaleOneOverLogK
        });
        if (x < minX || x >= maxX || y < minY || y >= maxY || angle <= -Math.PI || angle > Math.PI || scale < minScale || scale >= maxScale) {
          querypointValids[i] = false;
          continue;
        }
        let fbinX = numXBins * (x - minX) / (maxX - minX);
        let fbinY = numYBins * (y - minY) / (maxY - minY);
        let fbinAngle = numAngleBins * (angle + Math.PI) / (2 * Math.PI);
        let fbinScale = numScaleBins * (scale - minScale) / (maxScale - minScale);
        querypointBinLocations[i] = {
          binX: fbinX,
          binY: fbinY,
          binAngle: fbinAngle,
          binScale: fbinScale
        };
        let binX2 = Math.floor(fbinX - 0.5);
        let binY2 = Math.floor(fbinY - 0.5);
        let binScale2 = Math.floor(fbinScale - 0.5);
        let binAngle2 = (Math.floor(fbinAngle - 0.5) + numAngleBins) % numAngleBins;
        if (binX2 < 0 || binX2 + 1 >= numXBins || binY2 < 0 || binY2 + 1 >= numYBins || binScale2 < 0 || binScale2 + 1 >= numScaleBins) {
          querypointValids[i] = false;
          continue;
        }
        for (let dx = 0; dx < 2; dx++) {
          let binX22 = binX2 + dx;
          for (let dy = 0; dy < 2; dy++) {
            let binY22 = binY2 + dy;
            for (let dangle = 0; dangle < 2; dangle++) {
              let binAngle22 = (binAngle2 + dangle) % numAngleBins;
              for (let dscale = 0; dscale < 2; dscale++) {
                let binScale22 = binScale2 + dscale;
                const binIndex = binX22 + binY22 * numXBins + binAngle22 * numXYBins + binScale22 * numXYAngleBins;
                if (votes[binIndex] === void 0) votes[binIndex] = 0;
                votes[binIndex] += 1;
              }
            }
          }
        }
        querypointValids[i] = true;
      }
      let maxVotes = 0;
      let maxVoteIndex = -1;
      Object.keys(votes).forEach((index) => {
        if (votes[index] > maxVotes) {
          maxVotes = votes[index];
          maxVoteIndex = index;
        }
      });
      if (maxVotes < 3) return [];
      const binX = Math.floor(maxVoteIndex % numXYAngleBins % numXYBins % numXBins);
      const binY = Math.floor((maxVoteIndex - binX) % numXYAngleBins % numXYBins / numXBins);
      const binAngle = Math.floor(
        (maxVoteIndex - binX - binY * numXBins) % numXYAngleBins / numXYBins
      );
      const binScale = Math.floor(
        (maxVoteIndex - binX - binY * numXBins - binAngle * numXYBins) / numXYAngleBins
      );
      const houghMatches = [];
      const relaxedDelta = 2;
      for (let i = 0; i < matches.length; i++) {
        if (!querypointValids[i]) continue;
        const queryBins = querypointBinLocations[i];
        const distBinX = Math.abs(queryBins.binX - (binX + 0.5));
        if (distBinX >= relaxedDelta) continue;
        const distBinY = Math.abs(queryBins.binY - (binY + 0.5));
        if (distBinY >= relaxedDelta) continue;
        const distBinScale = Math.abs(queryBins.binScale - (binScale + 0.5));
        if (distBinScale >= relaxedDelta) continue;
        const temp = Math.abs(queryBins.binAngle - (binAngle + 0.5));
        const distBinAngle = Math.min(temp, numAngleBins - temp);
        if (distBinAngle >= relaxedDelta) continue;
        houghMatches.push(matches[i]);
      }
      return houghMatches;
    };
    _mapCorrespondence = ({ querypoint, keypoint, keycenterX, keycenterY, scaleOneOverLogK }) => {
      let angle = querypoint.angle - keypoint.angle;
      if (angle <= -Math.PI) angle += 2 * Math.PI;
      else if (angle > Math.PI) angle -= 2 * Math.PI;
      const scale = querypoint.scale / keypoint.scale;
      const cos = scale * Math.cos(angle);
      const sin = scale * Math.sin(angle);
      const S = [cos, -sin, sin, cos];
      const tp = [S[0] * keypoint.x + S[1] * keypoint.y, S[2] * keypoint.x + S[3] * keypoint.y];
      const tx = querypoint.x - tp[0];
      const ty = querypoint.y - tp[1];
      return {
        x: S[0] * keycenterX + S[1] * keycenterY + tx,
        y: S[2] * keycenterX + S[3] * keycenterY + ty,
        angle,
        scale: Math.log(scale) * scaleOneOverLogK
      };
    };
  }
});

// src/core/utils/randomizer.js
var mRandSeed, createRandomizer;
var init_randomizer = __esm({
  "src/core/utils/randomizer.js"() {
    "use strict";
    mRandSeed = 1234;
    createRandomizer = () => {
      const randomizer = {
        seed: mRandSeed,
        arrayShuffle(options) {
          const { arr, sampleSize } = options;
          for (let i = 0; i < sampleSize; i++) {
            this.seed = (214013 * this.seed + 2531011) % (1 << 31);
            let k = this.seed >> 16 & 32767;
            k = k % arr.length;
            let tmp = arr[i];
            arr[i] = arr[k];
            arr[k] = tmp;
          }
        },
        nextInt(maxValue) {
          this.seed = (214013 * this.seed + 2531011) % (1 << 31);
          let k = this.seed >> 16 & 32767;
          k = k % maxValue;
          return k;
        }
      };
      return randomizer;
    };
  }
});

// src/core/utils/geometry.js
var linePointSide, checkFourPointsConsistent, checkThreePointsConsistent, determinant, matrixInverse33, multiplyPointHomographyInhomogenous, smallestTriangleArea, quadrilateralConvex, _vector, _areaOfTriangle;
var init_geometry = __esm({
  "src/core/utils/geometry.js"() {
    "use strict";
    linePointSide = (A, B, C) => {
      return (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    };
    checkFourPointsConsistent = (x1, x2, x3, x4, x1p, x2p, x3p, x4p) => {
      if (linePointSide(x1, x2, x3) > 0 !== linePointSide(x1p, x2p, x3p) > 0) return false;
      if (linePointSide(x2, x3, x4) > 0 !== linePointSide(x2p, x3p, x4p) > 0) return false;
      if (linePointSide(x3, x4, x1) > 0 !== linePointSide(x3p, x4p, x1p) > 0) return false;
      if (linePointSide(x4, x1, x2) > 0 !== linePointSide(x4p, x1p, x2p) > 0) return false;
      return true;
    };
    checkThreePointsConsistent = (x1, x2, x3, x1p, x2p, x3p) => {
      if (linePointSide(x1, x2, x3) > 0 !== linePointSide(x1p, x2p, x3p) > 0) return false;
      return true;
    };
    determinant = (A) => {
      const C1 = A[4] * A[8] - A[5] * A[7];
      const C2 = A[3] * A[8] - A[5] * A[6];
      const C3 = A[3] * A[7] - A[4] * A[6];
      return A[0] * C1 - A[1] * C2 + A[2] * C3;
    };
    matrixInverse33 = (A, threshold) => {
      const det = determinant(A);
      if (Math.abs(det) <= threshold) return null;
      const oneOver = 1 / det;
      const B = [
        (A[4] * A[8] - A[5] * A[7]) * oneOver,
        (A[2] * A[7] - A[1] * A[8]) * oneOver,
        (A[1] * A[5] - A[2] * A[4]) * oneOver,
        (A[5] * A[6] - A[3] * A[8]) * oneOver,
        (A[0] * A[8] - A[2] * A[6]) * oneOver,
        (A[2] * A[3] - A[0] * A[5]) * oneOver,
        (A[3] * A[7] - A[4] * A[6]) * oneOver,
        (A[1] * A[6] - A[0] * A[7]) * oneOver,
        (A[0] * A[4] - A[1] * A[3]) * oneOver
      ];
      return B;
    };
    multiplyPointHomographyInhomogenous = (x, H) => {
      const w = H[6] * x[0] + H[7] * x[1] + H[8];
      const xp = [];
      xp[0] = (H[0] * x[0] + H[1] * x[1] + H[2]) / w;
      xp[1] = (H[3] * x[0] + H[4] * x[1] + H[5]) / w;
      return xp;
    };
    smallestTriangleArea = (x1, x2, x3, x4) => {
      const v12 = _vector(x2, x1);
      const v13 = _vector(x3, x1);
      const v14 = _vector(x4, x1);
      const v32 = _vector(x2, x3);
      const v34 = _vector(x4, x3);
      const a1 = _areaOfTriangle(v12, v13);
      const a2 = _areaOfTriangle(v13, v14);
      const a3 = _areaOfTriangle(v12, v14);
      const a4 = _areaOfTriangle(v32, v34);
      return Math.min(Math.min(Math.min(a1, a2), a3), a4);
    };
    quadrilateralConvex = (x1, x2, x3, x4) => {
      const first = linePointSide(x1, x2, x3) <= 0;
      if (linePointSide(x2, x3, x4) <= 0 !== first) return false;
      if (linePointSide(x3, x4, x1) <= 0 !== first) return false;
      if (linePointSide(x4, x1, x2) <= 0 !== first) return false;
      return true;
    };
    _vector = (a, b) => {
      return [a[0] - b[0], a[1] - b[1]];
    };
    _areaOfTriangle = (u, v) => {
      const a = u[0] * v[1] - u[1] * v[0];
      return Math.abs(a) * 0.5;
    };
  }
});

// node_modules/.pnpm/is-any-array@2.0.1/node_modules/is-any-array/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/is-any-array@2.0.1/node_modules/is-any-array/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isAnyArray = void 0;
    var toString = Object.prototype.toString;
    function isAnyArray(value) {
      const tag = toString.call(value);
      return tag.endsWith("Array]") && !tag.includes("Big");
    }
    exports.isAnyArray = isAnyArray;
  }
});

// node_modules/.pnpm/ml-array-max@1.2.4/node_modules/ml-array-max/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/.pnpm/ml-array-max@1.2.4/node_modules/ml-array-max/lib/index.js"(exports, module) {
    "use strict";
    var isAnyArray = require_lib();
    function max(input, options = {}) {
      if (!isAnyArray.isAnyArray(input)) {
        throw new TypeError("input must be an array");
      }
      if (input.length === 0) {
        throw new TypeError("input must not be empty");
      }
      const { fromIndex = 0, toIndex = input.length } = options;
      if (fromIndex < 0 || fromIndex >= input.length || !Number.isInteger(fromIndex)) {
        throw new Error("fromIndex must be a positive integer smaller than length");
      }
      if (toIndex <= fromIndex || toIndex > input.length || !Number.isInteger(toIndex)) {
        throw new Error(
          "toIndex must be an integer greater than fromIndex and at most equal to length"
        );
      }
      let maxValue = input[fromIndex];
      for (let i = fromIndex + 1; i < toIndex; i++) {
        if (input[i] > maxValue) maxValue = input[i];
      }
      return maxValue;
    }
    module.exports = max;
  }
});

// node_modules/.pnpm/ml-array-min@1.2.3/node_modules/ml-array-min/lib/index.js
var require_lib3 = __commonJS({
  "node_modules/.pnpm/ml-array-min@1.2.3/node_modules/ml-array-min/lib/index.js"(exports, module) {
    "use strict";
    var isAnyArray = require_lib();
    function min(input, options = {}) {
      if (!isAnyArray.isAnyArray(input)) {
        throw new TypeError("input must be an array");
      }
      if (input.length === 0) {
        throw new TypeError("input must not be empty");
      }
      const { fromIndex = 0, toIndex = input.length } = options;
      if (fromIndex < 0 || fromIndex >= input.length || !Number.isInteger(fromIndex)) {
        throw new Error("fromIndex must be a positive integer smaller than length");
      }
      if (toIndex <= fromIndex || toIndex > input.length || !Number.isInteger(toIndex)) {
        throw new Error(
          "toIndex must be an integer greater than fromIndex and at most equal to length"
        );
      }
      let minValue = input[fromIndex];
      for (let i = fromIndex + 1; i < toIndex; i++) {
        if (input[i] < minValue) minValue = input[i];
      }
      return minValue;
    }
    module.exports = min;
  }
});

// node_modules/.pnpm/ml-array-rescale@1.3.7/node_modules/ml-array-rescale/lib/index.js
var require_lib4 = __commonJS({
  "node_modules/.pnpm/ml-array-rescale@1.3.7/node_modules/ml-array-rescale/lib/index.js"(exports, module) {
    "use strict";
    var isAnyArray = require_lib();
    var max = require_lib2();
    var min = require_lib3();
    function _interopDefaultLegacy(e) {
      return e && typeof e === "object" && "default" in e ? e : { "default": e };
    }
    var max__default = /* @__PURE__ */ _interopDefaultLegacy(max);
    var min__default = /* @__PURE__ */ _interopDefaultLegacy(min);
    function rescale(input, options = {}) {
      if (!isAnyArray.isAnyArray(input)) {
        throw new TypeError("input must be an array");
      } else if (input.length === 0) {
        throw new TypeError("input must not be empty");
      }
      let output;
      if (options.output !== void 0) {
        if (!isAnyArray.isAnyArray(options.output)) {
          throw new TypeError("output option must be an array if specified");
        }
        output = options.output;
      } else {
        output = new Array(input.length);
      }
      const currentMin = min__default["default"](input);
      const currentMax = max__default["default"](input);
      if (currentMin === currentMax) {
        throw new RangeError(
          "minimum and maximum input values are equal. Cannot rescale a constant array"
        );
      }
      const {
        min: minValue = options.autoMinMax ? currentMin : 0,
        max: maxValue = options.autoMinMax ? currentMax : 1
      } = options;
      if (minValue >= maxValue) {
        throw new RangeError("min option must be smaller than max option");
      }
      const factor = (maxValue - minValue) / (currentMax - currentMin);
      for (let i = 0; i < input.length; i++) {
        output[i] = (input[i] - currentMin) * factor + minValue;
      }
      return output;
    }
    module.exports = rescale;
  }
});

// node_modules/.pnpm/ml-matrix@6.12.1/node_modules/ml-matrix/matrix.js
var require_matrix = __commonJS({
  "node_modules/.pnpm/ml-matrix@6.12.1/node_modules/ml-matrix/matrix.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var isAnyArray = require_lib();
    var rescale = require_lib4();
    var indent = " ".repeat(2);
    var indentData = " ".repeat(4);
    function inspectMatrix() {
      return inspectMatrixWithOptions(this);
    }
    function inspectMatrixWithOptions(matrix2, options = {}) {
      const {
        maxRows = 15,
        maxColumns = 10,
        maxNumSize = 8,
        padMinus = "auto"
      } = options;
      return `${matrix2.constructor.name} {
${indent}[
${indentData}${inspectData(matrix2, maxRows, maxColumns, maxNumSize, padMinus)}
${indent}]
${indent}rows: ${matrix2.rows}
${indent}columns: ${matrix2.columns}
}`;
    }
    function inspectData(matrix2, maxRows, maxColumns, maxNumSize, padMinus) {
      const { rows, columns } = matrix2;
      const maxI = Math.min(rows, maxRows);
      const maxJ = Math.min(columns, maxColumns);
      const result = [];
      if (padMinus === "auto") {
        padMinus = false;
        loop: for (let i = 0; i < maxI; i++) {
          for (let j = 0; j < maxJ; j++) {
            if (matrix2.get(i, j) < 0) {
              padMinus = true;
              break loop;
            }
          }
        }
      }
      for (let i = 0; i < maxI; i++) {
        let line = [];
        for (let j = 0; j < maxJ; j++) {
          line.push(formatNumber(matrix2.get(i, j), maxNumSize, padMinus));
        }
        result.push(`${line.join(" ")}`);
      }
      if (maxJ !== columns) {
        result[result.length - 1] += ` ... ${columns - maxColumns} more columns`;
      }
      if (maxI !== rows) {
        result.push(`... ${rows - maxRows} more rows`);
      }
      return result.join(`
${indentData}`);
    }
    function formatNumber(num, maxNumSize, padMinus) {
      return (num >= 0 && padMinus ? ` ${formatNumber2(num, maxNumSize - 1)}` : formatNumber2(num, maxNumSize)).padEnd(maxNumSize);
    }
    function formatNumber2(num, len) {
      let str = num.toString();
      if (str.length <= len) return str;
      let fix = num.toFixed(len);
      if (fix.length > len) {
        fix = num.toFixed(Math.max(0, len - (fix.length - len)));
      }
      if (fix.length <= len && !fix.startsWith("0.000") && !fix.startsWith("-0.000")) {
        return fix;
      }
      let exp = num.toExponential(len);
      if (exp.length > len) {
        exp = num.toExponential(Math.max(0, len - (exp.length - len)));
      }
      return exp.slice(0);
    }
    function installMathOperations(AbstractMatrix3, Matrix4) {
      AbstractMatrix3.prototype.add = function add(value) {
        if (typeof value === "number") return this.addS(value);
        return this.addM(value);
      };
      AbstractMatrix3.prototype.addS = function addS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) + value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.addM = function addM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) + matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.add = function add(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.add(value);
      };
      AbstractMatrix3.prototype.sub = function sub(value) {
        if (typeof value === "number") return this.subS(value);
        return this.subM(value);
      };
      AbstractMatrix3.prototype.subS = function subS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) - value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.subM = function subM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) - matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.sub = function sub(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.sub(value);
      };
      AbstractMatrix3.prototype.subtract = AbstractMatrix3.prototype.sub;
      AbstractMatrix3.prototype.subtractS = AbstractMatrix3.prototype.subS;
      AbstractMatrix3.prototype.subtractM = AbstractMatrix3.prototype.subM;
      AbstractMatrix3.subtract = AbstractMatrix3.sub;
      AbstractMatrix3.prototype.mul = function mul(value) {
        if (typeof value === "number") return this.mulS(value);
        return this.mulM(value);
      };
      AbstractMatrix3.prototype.mulS = function mulS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) * value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.mulM = function mulM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) * matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.mul = function mul(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.mul(value);
      };
      AbstractMatrix3.prototype.multiply = AbstractMatrix3.prototype.mul;
      AbstractMatrix3.prototype.multiplyS = AbstractMatrix3.prototype.mulS;
      AbstractMatrix3.prototype.multiplyM = AbstractMatrix3.prototype.mulM;
      AbstractMatrix3.multiply = AbstractMatrix3.mul;
      AbstractMatrix3.prototype.div = function div(value) {
        if (typeof value === "number") return this.divS(value);
        return this.divM(value);
      };
      AbstractMatrix3.prototype.divS = function divS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) / value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.divM = function divM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) / matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.div = function div(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.div(value);
      };
      AbstractMatrix3.prototype.divide = AbstractMatrix3.prototype.div;
      AbstractMatrix3.prototype.divideS = AbstractMatrix3.prototype.divS;
      AbstractMatrix3.prototype.divideM = AbstractMatrix3.prototype.divM;
      AbstractMatrix3.divide = AbstractMatrix3.div;
      AbstractMatrix3.prototype.mod = function mod(value) {
        if (typeof value === "number") return this.modS(value);
        return this.modM(value);
      };
      AbstractMatrix3.prototype.modS = function modS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) % value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.modM = function modM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) % matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.mod = function mod(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.mod(value);
      };
      AbstractMatrix3.prototype.modulus = AbstractMatrix3.prototype.mod;
      AbstractMatrix3.prototype.modulusS = AbstractMatrix3.prototype.modS;
      AbstractMatrix3.prototype.modulusM = AbstractMatrix3.prototype.modM;
      AbstractMatrix3.modulus = AbstractMatrix3.mod;
      AbstractMatrix3.prototype.and = function and(value) {
        if (typeof value === "number") return this.andS(value);
        return this.andM(value);
      };
      AbstractMatrix3.prototype.andS = function andS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) & value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.andM = function andM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) & matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.and = function and(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.and(value);
      };
      AbstractMatrix3.prototype.or = function or(value) {
        if (typeof value === "number") return this.orS(value);
        return this.orM(value);
      };
      AbstractMatrix3.prototype.orS = function orS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) | value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.orM = function orM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) | matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.or = function or(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.or(value);
      };
      AbstractMatrix3.prototype.xor = function xor(value) {
        if (typeof value === "number") return this.xorS(value);
        return this.xorM(value);
      };
      AbstractMatrix3.prototype.xorS = function xorS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) ^ value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.xorM = function xorM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) ^ matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.xor = function xor(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.xor(value);
      };
      AbstractMatrix3.prototype.leftShift = function leftShift(value) {
        if (typeof value === "number") return this.leftShiftS(value);
        return this.leftShiftM(value);
      };
      AbstractMatrix3.prototype.leftShiftS = function leftShiftS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) << value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.leftShiftM = function leftShiftM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) << matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.leftShift = function leftShift(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.leftShift(value);
      };
      AbstractMatrix3.prototype.signPropagatingRightShift = function signPropagatingRightShift(value) {
        if (typeof value === "number") return this.signPropagatingRightShiftS(value);
        return this.signPropagatingRightShiftM(value);
      };
      AbstractMatrix3.prototype.signPropagatingRightShiftS = function signPropagatingRightShiftS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) >> value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.signPropagatingRightShiftM = function signPropagatingRightShiftM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) >> matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.signPropagatingRightShift = function signPropagatingRightShift(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.signPropagatingRightShift(value);
      };
      AbstractMatrix3.prototype.rightShift = function rightShift(value) {
        if (typeof value === "number") return this.rightShiftS(value);
        return this.rightShiftM(value);
      };
      AbstractMatrix3.prototype.rightShiftS = function rightShiftS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) >>> value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.rightShiftM = function rightShiftM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) >>> matrix2.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.rightShift = function rightShift(matrix2, value) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.rightShift(value);
      };
      AbstractMatrix3.prototype.zeroFillRightShift = AbstractMatrix3.prototype.rightShift;
      AbstractMatrix3.prototype.zeroFillRightShiftS = AbstractMatrix3.prototype.rightShiftS;
      AbstractMatrix3.prototype.zeroFillRightShiftM = AbstractMatrix3.prototype.rightShiftM;
      AbstractMatrix3.zeroFillRightShift = AbstractMatrix3.rightShift;
      AbstractMatrix3.prototype.not = function not() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, ~this.get(i, j));
          }
        }
        return this;
      };
      AbstractMatrix3.not = function not(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.not();
      };
      AbstractMatrix3.prototype.abs = function abs() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.abs(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.abs = function abs(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.abs();
      };
      AbstractMatrix3.prototype.acos = function acos() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.acos(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.acos = function acos(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.acos();
      };
      AbstractMatrix3.prototype.acosh = function acosh() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.acosh(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.acosh = function acosh(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.acosh();
      };
      AbstractMatrix3.prototype.asin = function asin() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.asin(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.asin = function asin(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.asin();
      };
      AbstractMatrix3.prototype.asinh = function asinh() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.asinh(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.asinh = function asinh(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.asinh();
      };
      AbstractMatrix3.prototype.atan = function atan() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.atan(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.atan = function atan(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.atan();
      };
      AbstractMatrix3.prototype.atanh = function atanh() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.atanh(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.atanh = function atanh(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.atanh();
      };
      AbstractMatrix3.prototype.cbrt = function cbrt() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.cbrt(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.cbrt = function cbrt(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.cbrt();
      };
      AbstractMatrix3.prototype.ceil = function ceil() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.ceil(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.ceil = function ceil(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.ceil();
      };
      AbstractMatrix3.prototype.clz32 = function clz32() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.clz32(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.clz32 = function clz32(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.clz32();
      };
      AbstractMatrix3.prototype.cos = function cos() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.cos(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.cos = function cos(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.cos();
      };
      AbstractMatrix3.prototype.cosh = function cosh() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.cosh(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.cosh = function cosh(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.cosh();
      };
      AbstractMatrix3.prototype.exp = function exp() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.exp(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.exp = function exp(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.exp();
      };
      AbstractMatrix3.prototype.expm1 = function expm1() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.expm1(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.expm1 = function expm1(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.expm1();
      };
      AbstractMatrix3.prototype.floor = function floor() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.floor(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.floor = function floor(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.floor();
      };
      AbstractMatrix3.prototype.fround = function fround() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.fround(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.fround = function fround(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.fround();
      };
      AbstractMatrix3.prototype.log = function log() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.log(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.log = function log(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.log();
      };
      AbstractMatrix3.prototype.log1p = function log1p() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.log1p(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.log1p = function log1p(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.log1p();
      };
      AbstractMatrix3.prototype.log10 = function log10() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.log10(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.log10 = function log10(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.log10();
      };
      AbstractMatrix3.prototype.log2 = function log2() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.log2(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.log2 = function log2(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.log2();
      };
      AbstractMatrix3.prototype.round = function round() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.round(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.round = function round(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.round();
      };
      AbstractMatrix3.prototype.sign = function sign() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.sign(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.sign = function sign(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.sign();
      };
      AbstractMatrix3.prototype.sin = function sin() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.sin(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.sin = function sin(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.sin();
      };
      AbstractMatrix3.prototype.sinh = function sinh() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.sinh(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.sinh = function sinh(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.sinh();
      };
      AbstractMatrix3.prototype.sqrt = function sqrt() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.sqrt(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.sqrt = function sqrt(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.sqrt();
      };
      AbstractMatrix3.prototype.tan = function tan() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.tan(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.tan = function tan(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.tan();
      };
      AbstractMatrix3.prototype.tanh = function tanh() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.tanh(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.tanh = function tanh(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.tanh();
      };
      AbstractMatrix3.prototype.trunc = function trunc() {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, Math.trunc(this.get(i, j)));
          }
        }
        return this;
      };
      AbstractMatrix3.trunc = function trunc(matrix2) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.trunc();
      };
      AbstractMatrix3.pow = function pow(matrix2, arg0) {
        const newMatrix = new Matrix4(matrix2);
        return newMatrix.pow(arg0);
      };
      AbstractMatrix3.prototype.pow = function pow(value) {
        if (typeof value === "number") return this.powS(value);
        return this.powM(value);
      };
      AbstractMatrix3.prototype.powS = function powS(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) ** value);
          }
        }
        return this;
      };
      AbstractMatrix3.prototype.powM = function powM(matrix2) {
        matrix2 = Matrix4.checkMatrix(matrix2);
        if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
          throw new RangeError("Matrices dimensions must be equal");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) ** matrix2.get(i, j));
          }
        }
        return this;
      };
    }
    function checkRowIndex(matrix2, index, outer) {
      let max = outer ? matrix2.rows : matrix2.rows - 1;
      if (index < 0 || index > max) {
        throw new RangeError("Row index out of range");
      }
    }
    function checkColumnIndex(matrix2, index, outer) {
      let max = outer ? matrix2.columns : matrix2.columns - 1;
      if (index < 0 || index > max) {
        throw new RangeError("Column index out of range");
      }
    }
    function checkRowVector(matrix2, vector) {
      if (vector.to1DArray) {
        vector = vector.to1DArray();
      }
      if (vector.length !== matrix2.columns) {
        throw new RangeError(
          "vector size must be the same as the number of columns"
        );
      }
      return vector;
    }
    function checkColumnVector(matrix2, vector) {
      if (vector.to1DArray) {
        vector = vector.to1DArray();
      }
      if (vector.length !== matrix2.rows) {
        throw new RangeError("vector size must be the same as the number of rows");
      }
      return vector;
    }
    function checkRowIndices(matrix2, rowIndices) {
      if (!isAnyArray.isAnyArray(rowIndices)) {
        throw new TypeError("row indices must be an array");
      }
      for (let i = 0; i < rowIndices.length; i++) {
        if (rowIndices[i] < 0 || rowIndices[i] >= matrix2.rows) {
          throw new RangeError("row indices are out of range");
        }
      }
    }
    function checkColumnIndices(matrix2, columnIndices) {
      if (!isAnyArray.isAnyArray(columnIndices)) {
        throw new TypeError("column indices must be an array");
      }
      for (let i = 0; i < columnIndices.length; i++) {
        if (columnIndices[i] < 0 || columnIndices[i] >= matrix2.columns) {
          throw new RangeError("column indices are out of range");
        }
      }
    }
    function checkRange(matrix2, startRow, endRow, startColumn, endColumn) {
      if (arguments.length !== 5) {
        throw new RangeError("expected 4 arguments");
      }
      checkNumber("startRow", startRow);
      checkNumber("endRow", endRow);
      checkNumber("startColumn", startColumn);
      checkNumber("endColumn", endColumn);
      if (startRow > endRow || startColumn > endColumn || startRow < 0 || startRow >= matrix2.rows || endRow < 0 || endRow >= matrix2.rows || startColumn < 0 || startColumn >= matrix2.columns || endColumn < 0 || endColumn >= matrix2.columns) {
        throw new RangeError("Submatrix indices are out of range");
      }
    }
    function newArray(length, value = 0) {
      let array = [];
      for (let i = 0; i < length; i++) {
        array.push(value);
      }
      return array;
    }
    function checkNumber(name, value) {
      if (typeof value !== "number") {
        throw new TypeError(`${name} must be a number`);
      }
    }
    function checkNonEmpty(matrix2) {
      if (matrix2.isEmpty()) {
        throw new Error("Empty matrix has no elements to index");
      }
    }
    function sumByRow(matrix2) {
      let sum = newArray(matrix2.rows);
      for (let i = 0; i < matrix2.rows; ++i) {
        for (let j = 0; j < matrix2.columns; ++j) {
          sum[i] += matrix2.get(i, j);
        }
      }
      return sum;
    }
    function sumByColumn(matrix2) {
      let sum = newArray(matrix2.columns);
      for (let i = 0; i < matrix2.rows; ++i) {
        for (let j = 0; j < matrix2.columns; ++j) {
          sum[j] += matrix2.get(i, j);
        }
      }
      return sum;
    }
    function sumAll(matrix2) {
      let v = 0;
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          v += matrix2.get(i, j);
        }
      }
      return v;
    }
    function productByRow(matrix2) {
      let sum = newArray(matrix2.rows, 1);
      for (let i = 0; i < matrix2.rows; ++i) {
        for (let j = 0; j < matrix2.columns; ++j) {
          sum[i] *= matrix2.get(i, j);
        }
      }
      return sum;
    }
    function productByColumn(matrix2) {
      let sum = newArray(matrix2.columns, 1);
      for (let i = 0; i < matrix2.rows; ++i) {
        for (let j = 0; j < matrix2.columns; ++j) {
          sum[j] *= matrix2.get(i, j);
        }
      }
      return sum;
    }
    function productAll(matrix2) {
      let v = 1;
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          v *= matrix2.get(i, j);
        }
      }
      return v;
    }
    function varianceByRow(matrix2, unbiased, mean) {
      const rows = matrix2.rows;
      const cols = matrix2.columns;
      const variance = [];
      for (let i = 0; i < rows; i++) {
        let sum1 = 0;
        let sum2 = 0;
        let x = 0;
        for (let j = 0; j < cols; j++) {
          x = matrix2.get(i, j) - mean[i];
          sum1 += x;
          sum2 += x * x;
        }
        if (unbiased) {
          variance.push((sum2 - sum1 * sum1 / cols) / (cols - 1));
        } else {
          variance.push((sum2 - sum1 * sum1 / cols) / cols);
        }
      }
      return variance;
    }
    function varianceByColumn(matrix2, unbiased, mean) {
      const rows = matrix2.rows;
      const cols = matrix2.columns;
      const variance = [];
      for (let j = 0; j < cols; j++) {
        let sum1 = 0;
        let sum2 = 0;
        let x = 0;
        for (let i = 0; i < rows; i++) {
          x = matrix2.get(i, j) - mean[j];
          sum1 += x;
          sum2 += x * x;
        }
        if (unbiased) {
          variance.push((sum2 - sum1 * sum1 / rows) / (rows - 1));
        } else {
          variance.push((sum2 - sum1 * sum1 / rows) / rows);
        }
      }
      return variance;
    }
    function varianceAll(matrix2, unbiased, mean) {
      const rows = matrix2.rows;
      const cols = matrix2.columns;
      const size = rows * cols;
      let sum1 = 0;
      let sum2 = 0;
      let x = 0;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          x = matrix2.get(i, j) - mean;
          sum1 += x;
          sum2 += x * x;
        }
      }
      if (unbiased) {
        return (sum2 - sum1 * sum1 / size) / (size - 1);
      } else {
        return (sum2 - sum1 * sum1 / size) / size;
      }
    }
    function centerByRow(matrix2, mean) {
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          matrix2.set(i, j, matrix2.get(i, j) - mean[i]);
        }
      }
    }
    function centerByColumn(matrix2, mean) {
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          matrix2.set(i, j, matrix2.get(i, j) - mean[j]);
        }
      }
    }
    function centerAll(matrix2, mean) {
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          matrix2.set(i, j, matrix2.get(i, j) - mean);
        }
      }
    }
    function getScaleByRow(matrix2) {
      const scale = [];
      for (let i = 0; i < matrix2.rows; i++) {
        let sum = 0;
        for (let j = 0; j < matrix2.columns; j++) {
          sum += matrix2.get(i, j) ** 2 / (matrix2.columns - 1);
        }
        scale.push(Math.sqrt(sum));
      }
      return scale;
    }
    function scaleByRow(matrix2, scale) {
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          matrix2.set(i, j, matrix2.get(i, j) / scale[i]);
        }
      }
    }
    function getScaleByColumn(matrix2) {
      const scale = [];
      for (let j = 0; j < matrix2.columns; j++) {
        let sum = 0;
        for (let i = 0; i < matrix2.rows; i++) {
          sum += matrix2.get(i, j) ** 2 / (matrix2.rows - 1);
        }
        scale.push(Math.sqrt(sum));
      }
      return scale;
    }
    function scaleByColumn(matrix2, scale) {
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          matrix2.set(i, j, matrix2.get(i, j) / scale[j]);
        }
      }
    }
    function getScaleAll(matrix2) {
      const divider = matrix2.size - 1;
      let sum = 0;
      for (let j = 0; j < matrix2.columns; j++) {
        for (let i = 0; i < matrix2.rows; i++) {
          sum += matrix2.get(i, j) ** 2 / divider;
        }
      }
      return Math.sqrt(sum);
    }
    function scaleAll(matrix2, scale) {
      for (let i = 0; i < matrix2.rows; i++) {
        for (let j = 0; j < matrix2.columns; j++) {
          matrix2.set(i, j, matrix2.get(i, j) / scale);
        }
      }
    }
    var AbstractMatrix2 = class _AbstractMatrix {
      static from1DArray(newRows, newColumns, newData) {
        let length = newRows * newColumns;
        if (length !== newData.length) {
          throw new RangeError("data length does not match given dimensions");
        }
        let newMatrix = new Matrix3(newRows, newColumns);
        for (let row = 0; row < newRows; row++) {
          for (let column = 0; column < newColumns; column++) {
            newMatrix.set(row, column, newData[row * newColumns + column]);
          }
        }
        return newMatrix;
      }
      static rowVector(newData) {
        let vector = new Matrix3(1, newData.length);
        for (let i = 0; i < newData.length; i++) {
          vector.set(0, i, newData[i]);
        }
        return vector;
      }
      static columnVector(newData) {
        let vector = new Matrix3(newData.length, 1);
        for (let i = 0; i < newData.length; i++) {
          vector.set(i, 0, newData[i]);
        }
        return vector;
      }
      static zeros(rows, columns) {
        return new Matrix3(rows, columns);
      }
      static ones(rows, columns) {
        return new Matrix3(rows, columns).fill(1);
      }
      static rand(rows, columns, options = {}) {
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        const { random = Math.random } = options;
        let matrix2 = new Matrix3(rows, columns);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < columns; j++) {
            matrix2.set(i, j, random());
          }
        }
        return matrix2;
      }
      static randInt(rows, columns, options = {}) {
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        const { min = 0, max = 1e3, random = Math.random } = options;
        if (!Number.isInteger(min)) throw new TypeError("min must be an integer");
        if (!Number.isInteger(max)) throw new TypeError("max must be an integer");
        if (min >= max) throw new RangeError("min must be smaller than max");
        let interval = max - min;
        let matrix2 = new Matrix3(rows, columns);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < columns; j++) {
            let value = min + Math.round(random() * interval);
            matrix2.set(i, j, value);
          }
        }
        return matrix2;
      }
      static eye(rows, columns, value) {
        if (columns === void 0) columns = rows;
        if (value === void 0) value = 1;
        let min = Math.min(rows, columns);
        let matrix2 = this.zeros(rows, columns);
        for (let i = 0; i < min; i++) {
          matrix2.set(i, i, value);
        }
        return matrix2;
      }
      static diag(data, rows, columns) {
        let l = data.length;
        if (rows === void 0) rows = l;
        if (columns === void 0) columns = rows;
        let min = Math.min(l, rows, columns);
        let matrix2 = this.zeros(rows, columns);
        for (let i = 0; i < min; i++) {
          matrix2.set(i, i, data[i]);
        }
        return matrix2;
      }
      static min(matrix1, matrix2) {
        matrix1 = this.checkMatrix(matrix1);
        matrix2 = this.checkMatrix(matrix2);
        let rows = matrix1.rows;
        let columns = matrix1.columns;
        let result = new Matrix3(rows, columns);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < columns; j++) {
            result.set(i, j, Math.min(matrix1.get(i, j), matrix2.get(i, j)));
          }
        }
        return result;
      }
      static max(matrix1, matrix2) {
        matrix1 = this.checkMatrix(matrix1);
        matrix2 = this.checkMatrix(matrix2);
        let rows = matrix1.rows;
        let columns = matrix1.columns;
        let result = new this(rows, columns);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < columns; j++) {
            result.set(i, j, Math.max(matrix1.get(i, j), matrix2.get(i, j)));
          }
        }
        return result;
      }
      static checkMatrix(value) {
        return _AbstractMatrix.isMatrix(value) ? value : new Matrix3(value);
      }
      static isMatrix(value) {
        return value != null && value.klass === "Matrix";
      }
      get size() {
        return this.rows * this.columns;
      }
      apply(callback) {
        if (typeof callback !== "function") {
          throw new TypeError("callback must be a function");
        }
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            callback.call(this, i, j);
          }
        }
        return this;
      }
      to1DArray() {
        let array = [];
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            array.push(this.get(i, j));
          }
        }
        return array;
      }
      to2DArray() {
        let copy = [];
        for (let i = 0; i < this.rows; i++) {
          copy.push([]);
          for (let j = 0; j < this.columns; j++) {
            copy[i].push(this.get(i, j));
          }
        }
        return copy;
      }
      toJSON() {
        return this.to2DArray();
      }
      isRowVector() {
        return this.rows === 1;
      }
      isColumnVector() {
        return this.columns === 1;
      }
      isVector() {
        return this.rows === 1 || this.columns === 1;
      }
      isSquare() {
        return this.rows === this.columns;
      }
      isEmpty() {
        return this.rows === 0 || this.columns === 0;
      }
      isSymmetric() {
        if (this.isSquare()) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j <= i; j++) {
              if (this.get(i, j) !== this.get(j, i)) {
                return false;
              }
            }
          }
          return true;
        }
        return false;
      }
      isDistance() {
        if (!this.isSymmetric()) return false;
        for (let i = 0; i < this.rows; i++) {
          if (this.get(i, i) !== 0) return false;
        }
        return true;
      }
      isEchelonForm() {
        let i = 0;
        let j = 0;
        let previousColumn = -1;
        let isEchelonForm = true;
        let checked = false;
        while (i < this.rows && isEchelonForm) {
          j = 0;
          checked = false;
          while (j < this.columns && checked === false) {
            if (this.get(i, j) === 0) {
              j++;
            } else if (this.get(i, j) === 1 && j > previousColumn) {
              checked = true;
              previousColumn = j;
            } else {
              isEchelonForm = false;
              checked = true;
            }
          }
          i++;
        }
        return isEchelonForm;
      }
      isReducedEchelonForm() {
        let i = 0;
        let j = 0;
        let previousColumn = -1;
        let isReducedEchelonForm = true;
        let checked = false;
        while (i < this.rows && isReducedEchelonForm) {
          j = 0;
          checked = false;
          while (j < this.columns && checked === false) {
            if (this.get(i, j) === 0) {
              j++;
            } else if (this.get(i, j) === 1 && j > previousColumn) {
              checked = true;
              previousColumn = j;
            } else {
              isReducedEchelonForm = false;
              checked = true;
            }
          }
          for (let k = j + 1; k < this.rows; k++) {
            if (this.get(i, k) !== 0) {
              isReducedEchelonForm = false;
            }
          }
          i++;
        }
        return isReducedEchelonForm;
      }
      echelonForm() {
        let result = this.clone();
        let h = 0;
        let k = 0;
        while (h < result.rows && k < result.columns) {
          let iMax = h;
          for (let i = h; i < result.rows; i++) {
            if (result.get(i, k) > result.get(iMax, k)) {
              iMax = i;
            }
          }
          if (result.get(iMax, k) === 0) {
            k++;
          } else {
            result.swapRows(h, iMax);
            let tmp = result.get(h, k);
            for (let j = k; j < result.columns; j++) {
              result.set(h, j, result.get(h, j) / tmp);
            }
            for (let i = h + 1; i < result.rows; i++) {
              let factor = result.get(i, k) / result.get(h, k);
              result.set(i, k, 0);
              for (let j = k + 1; j < result.columns; j++) {
                result.set(i, j, result.get(i, j) - result.get(h, j) * factor);
              }
            }
            h++;
            k++;
          }
        }
        return result;
      }
      reducedEchelonForm() {
        let result = this.echelonForm();
        let m = result.columns;
        let n = result.rows;
        let h = n - 1;
        while (h >= 0) {
          if (result.maxRow(h) === 0) {
            h--;
          } else {
            let p = 0;
            let pivot = false;
            while (p < n && pivot === false) {
              if (result.get(h, p) === 1) {
                pivot = true;
              } else {
                p++;
              }
            }
            for (let i = 0; i < h; i++) {
              let factor = result.get(i, p);
              for (let j = p; j < m; j++) {
                let tmp = result.get(i, j) - factor * result.get(h, j);
                result.set(i, j, tmp);
              }
            }
            h--;
          }
        }
        return result;
      }
      set() {
        throw new Error("set method is unimplemented");
      }
      get() {
        throw new Error("get method is unimplemented");
      }
      repeat(options = {}) {
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        const { rows = 1, columns = 1 } = options;
        if (!Number.isInteger(rows) || rows <= 0) {
          throw new TypeError("rows must be a positive integer");
        }
        if (!Number.isInteger(columns) || columns <= 0) {
          throw new TypeError("columns must be a positive integer");
        }
        let matrix2 = new Matrix3(this.rows * rows, this.columns * columns);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < columns; j++) {
            matrix2.setSubMatrix(this, this.rows * i, this.columns * j);
          }
        }
        return matrix2;
      }
      fill(value) {
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, value);
          }
        }
        return this;
      }
      neg() {
        return this.mulS(-1);
      }
      getRow(index) {
        checkRowIndex(this, index);
        let row = [];
        for (let i = 0; i < this.columns; i++) {
          row.push(this.get(index, i));
        }
        return row;
      }
      getRowVector(index) {
        return Matrix3.rowVector(this.getRow(index));
      }
      setRow(index, array) {
        checkRowIndex(this, index);
        array = checkRowVector(this, array);
        for (let i = 0; i < this.columns; i++) {
          this.set(index, i, array[i]);
        }
        return this;
      }
      swapRows(row1, row2) {
        checkRowIndex(this, row1);
        checkRowIndex(this, row2);
        for (let i = 0; i < this.columns; i++) {
          let temp = this.get(row1, i);
          this.set(row1, i, this.get(row2, i));
          this.set(row2, i, temp);
        }
        return this;
      }
      getColumn(index) {
        checkColumnIndex(this, index);
        let column = [];
        for (let i = 0; i < this.rows; i++) {
          column.push(this.get(i, index));
        }
        return column;
      }
      getColumnVector(index) {
        return Matrix3.columnVector(this.getColumn(index));
      }
      setColumn(index, array) {
        checkColumnIndex(this, index);
        array = checkColumnVector(this, array);
        for (let i = 0; i < this.rows; i++) {
          this.set(i, index, array[i]);
        }
        return this;
      }
      swapColumns(column1, column2) {
        checkColumnIndex(this, column1);
        checkColumnIndex(this, column2);
        for (let i = 0; i < this.rows; i++) {
          let temp = this.get(i, column1);
          this.set(i, column1, this.get(i, column2));
          this.set(i, column2, temp);
        }
        return this;
      }
      addRowVector(vector) {
        vector = checkRowVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) + vector[j]);
          }
        }
        return this;
      }
      subRowVector(vector) {
        vector = checkRowVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) - vector[j]);
          }
        }
        return this;
      }
      mulRowVector(vector) {
        vector = checkRowVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) * vector[j]);
          }
        }
        return this;
      }
      divRowVector(vector) {
        vector = checkRowVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) / vector[j]);
          }
        }
        return this;
      }
      addColumnVector(vector) {
        vector = checkColumnVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) + vector[i]);
          }
        }
        return this;
      }
      subColumnVector(vector) {
        vector = checkColumnVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) - vector[i]);
          }
        }
        return this;
      }
      mulColumnVector(vector) {
        vector = checkColumnVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) * vector[i]);
          }
        }
        return this;
      }
      divColumnVector(vector) {
        vector = checkColumnVector(this, vector);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            this.set(i, j, this.get(i, j) / vector[i]);
          }
        }
        return this;
      }
      mulRow(index, value) {
        checkRowIndex(this, index);
        for (let i = 0; i < this.columns; i++) {
          this.set(index, i, this.get(index, i) * value);
        }
        return this;
      }
      mulColumn(index, value) {
        checkColumnIndex(this, index);
        for (let i = 0; i < this.rows; i++) {
          this.set(i, index, this.get(i, index) * value);
        }
        return this;
      }
      max(by) {
        if (this.isEmpty()) {
          return NaN;
        }
        switch (by) {
          case "row": {
            const max = new Array(this.rows).fill(Number.NEGATIVE_INFINITY);
            for (let row = 0; row < this.rows; row++) {
              for (let column = 0; column < this.columns; column++) {
                if (this.get(row, column) > max[row]) {
                  max[row] = this.get(row, column);
                }
              }
            }
            return max;
          }
          case "column": {
            const max = new Array(this.columns).fill(Number.NEGATIVE_INFINITY);
            for (let row = 0; row < this.rows; row++) {
              for (let column = 0; column < this.columns; column++) {
                if (this.get(row, column) > max[column]) {
                  max[column] = this.get(row, column);
                }
              }
            }
            return max;
          }
          case void 0: {
            let max = this.get(0, 0);
            for (let row = 0; row < this.rows; row++) {
              for (let column = 0; column < this.columns; column++) {
                if (this.get(row, column) > max) {
                  max = this.get(row, column);
                }
              }
            }
            return max;
          }
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      maxIndex() {
        checkNonEmpty(this);
        let v = this.get(0, 0);
        let idx = [0, 0];
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            if (this.get(i, j) > v) {
              v = this.get(i, j);
              idx[0] = i;
              idx[1] = j;
            }
          }
        }
        return idx;
      }
      min(by) {
        if (this.isEmpty()) {
          return NaN;
        }
        switch (by) {
          case "row": {
            const min = new Array(this.rows).fill(Number.POSITIVE_INFINITY);
            for (let row = 0; row < this.rows; row++) {
              for (let column = 0; column < this.columns; column++) {
                if (this.get(row, column) < min[row]) {
                  min[row] = this.get(row, column);
                }
              }
            }
            return min;
          }
          case "column": {
            const min = new Array(this.columns).fill(Number.POSITIVE_INFINITY);
            for (let row = 0; row < this.rows; row++) {
              for (let column = 0; column < this.columns; column++) {
                if (this.get(row, column) < min[column]) {
                  min[column] = this.get(row, column);
                }
              }
            }
            return min;
          }
          case void 0: {
            let min = this.get(0, 0);
            for (let row = 0; row < this.rows; row++) {
              for (let column = 0; column < this.columns; column++) {
                if (this.get(row, column) < min) {
                  min = this.get(row, column);
                }
              }
            }
            return min;
          }
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      minIndex() {
        checkNonEmpty(this);
        let v = this.get(0, 0);
        let idx = [0, 0];
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            if (this.get(i, j) < v) {
              v = this.get(i, j);
              idx[0] = i;
              idx[1] = j;
            }
          }
        }
        return idx;
      }
      maxRow(row) {
        checkRowIndex(this, row);
        if (this.isEmpty()) {
          return NaN;
        }
        let v = this.get(row, 0);
        for (let i = 1; i < this.columns; i++) {
          if (this.get(row, i) > v) {
            v = this.get(row, i);
          }
        }
        return v;
      }
      maxRowIndex(row) {
        checkRowIndex(this, row);
        checkNonEmpty(this);
        let v = this.get(row, 0);
        let idx = [row, 0];
        for (let i = 1; i < this.columns; i++) {
          if (this.get(row, i) > v) {
            v = this.get(row, i);
            idx[1] = i;
          }
        }
        return idx;
      }
      minRow(row) {
        checkRowIndex(this, row);
        if (this.isEmpty()) {
          return NaN;
        }
        let v = this.get(row, 0);
        for (let i = 1; i < this.columns; i++) {
          if (this.get(row, i) < v) {
            v = this.get(row, i);
          }
        }
        return v;
      }
      minRowIndex(row) {
        checkRowIndex(this, row);
        checkNonEmpty(this);
        let v = this.get(row, 0);
        let idx = [row, 0];
        for (let i = 1; i < this.columns; i++) {
          if (this.get(row, i) < v) {
            v = this.get(row, i);
            idx[1] = i;
          }
        }
        return idx;
      }
      maxColumn(column) {
        checkColumnIndex(this, column);
        if (this.isEmpty()) {
          return NaN;
        }
        let v = this.get(0, column);
        for (let i = 1; i < this.rows; i++) {
          if (this.get(i, column) > v) {
            v = this.get(i, column);
          }
        }
        return v;
      }
      maxColumnIndex(column) {
        checkColumnIndex(this, column);
        checkNonEmpty(this);
        let v = this.get(0, column);
        let idx = [0, column];
        for (let i = 1; i < this.rows; i++) {
          if (this.get(i, column) > v) {
            v = this.get(i, column);
            idx[0] = i;
          }
        }
        return idx;
      }
      minColumn(column) {
        checkColumnIndex(this, column);
        if (this.isEmpty()) {
          return NaN;
        }
        let v = this.get(0, column);
        for (let i = 1; i < this.rows; i++) {
          if (this.get(i, column) < v) {
            v = this.get(i, column);
          }
        }
        return v;
      }
      minColumnIndex(column) {
        checkColumnIndex(this, column);
        checkNonEmpty(this);
        let v = this.get(0, column);
        let idx = [0, column];
        for (let i = 1; i < this.rows; i++) {
          if (this.get(i, column) < v) {
            v = this.get(i, column);
            idx[0] = i;
          }
        }
        return idx;
      }
      diag() {
        let min = Math.min(this.rows, this.columns);
        let diag = [];
        for (let i = 0; i < min; i++) {
          diag.push(this.get(i, i));
        }
        return diag;
      }
      norm(type = "frobenius") {
        switch (type) {
          case "max":
            return this.max();
          case "frobenius":
            return Math.sqrt(this.dot(this));
          default:
            throw new RangeError(`unknown norm type: ${type}`);
        }
      }
      cumulativeSum() {
        let sum = 0;
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            sum += this.get(i, j);
            this.set(i, j, sum);
          }
        }
        return this;
      }
      dot(vector2) {
        if (_AbstractMatrix.isMatrix(vector2)) vector2 = vector2.to1DArray();
        let vector1 = this.to1DArray();
        if (vector1.length !== vector2.length) {
          throw new RangeError("vectors do not have the same size");
        }
        let dot = 0;
        for (let i = 0; i < vector1.length; i++) {
          dot += vector1[i] * vector2[i];
        }
        return dot;
      }
      mmul(other) {
        other = Matrix3.checkMatrix(other);
        let m = this.rows;
        let n = this.columns;
        let p = other.columns;
        let result = new Matrix3(m, p);
        let Bcolj = new Float64Array(n);
        for (let j = 0; j < p; j++) {
          for (let k = 0; k < n; k++) {
            Bcolj[k] = other.get(k, j);
          }
          for (let i = 0; i < m; i++) {
            let s = 0;
            for (let k = 0; k < n; k++) {
              s += this.get(i, k) * Bcolj[k];
            }
            result.set(i, j, s);
          }
        }
        return result;
      }
      mpow(scalar) {
        if (!this.isSquare()) {
          throw new RangeError("Matrix must be square");
        }
        if (!Number.isInteger(scalar) || scalar < 0) {
          throw new RangeError("Exponent must be a non-negative integer");
        }
        let result = Matrix3.eye(this.rows);
        let bb = this;
        for (let e = scalar; e >= 1; e /= 2) {
          if ((e & 1) !== 0) {
            result = result.mmul(bb);
          }
          bb = bb.mmul(bb);
        }
        return result;
      }
      strassen2x2(other) {
        other = Matrix3.checkMatrix(other);
        let result = new Matrix3(2, 2);
        const a11 = this.get(0, 0);
        const b11 = other.get(0, 0);
        const a12 = this.get(0, 1);
        const b12 = other.get(0, 1);
        const a21 = this.get(1, 0);
        const b21 = other.get(1, 0);
        const a22 = this.get(1, 1);
        const b22 = other.get(1, 1);
        const m1 = (a11 + a22) * (b11 + b22);
        const m2 = (a21 + a22) * b11;
        const m3 = a11 * (b12 - b22);
        const m4 = a22 * (b21 - b11);
        const m5 = (a11 + a12) * b22;
        const m6 = (a21 - a11) * (b11 + b12);
        const m7 = (a12 - a22) * (b21 + b22);
        const c00 = m1 + m4 - m5 + m7;
        const c01 = m3 + m5;
        const c10 = m2 + m4;
        const c11 = m1 - m2 + m3 + m6;
        result.set(0, 0, c00);
        result.set(0, 1, c01);
        result.set(1, 0, c10);
        result.set(1, 1, c11);
        return result;
      }
      strassen3x3(other) {
        other = Matrix3.checkMatrix(other);
        let result = new Matrix3(3, 3);
        const a00 = this.get(0, 0);
        const a01 = this.get(0, 1);
        const a02 = this.get(0, 2);
        const a10 = this.get(1, 0);
        const a11 = this.get(1, 1);
        const a12 = this.get(1, 2);
        const a20 = this.get(2, 0);
        const a21 = this.get(2, 1);
        const a22 = this.get(2, 2);
        const b00 = other.get(0, 0);
        const b01 = other.get(0, 1);
        const b02 = other.get(0, 2);
        const b10 = other.get(1, 0);
        const b11 = other.get(1, 1);
        const b12 = other.get(1, 2);
        const b20 = other.get(2, 0);
        const b21 = other.get(2, 1);
        const b22 = other.get(2, 2);
        const m1 = (a00 + a01 + a02 - a10 - a11 - a21 - a22) * b11;
        const m2 = (a00 - a10) * (-b01 + b11);
        const m3 = a11 * (-b00 + b01 + b10 - b11 - b12 - b20 + b22);
        const m4 = (-a00 + a10 + a11) * (b00 - b01 + b11);
        const m5 = (a10 + a11) * (-b00 + b01);
        const m6 = a00 * b00;
        const m7 = (-a00 + a20 + a21) * (b00 - b02 + b12);
        const m8 = (-a00 + a20) * (b02 - b12);
        const m9 = (a20 + a21) * (-b00 + b02);
        const m10 = (a00 + a01 + a02 - a11 - a12 - a20 - a21) * b12;
        const m11 = a21 * (-b00 + b02 + b10 - b11 - b12 - b20 + b21);
        const m12 = (-a02 + a21 + a22) * (b11 + b20 - b21);
        const m13 = (a02 - a22) * (b11 - b21);
        const m14 = a02 * b20;
        const m15 = (a21 + a22) * (-b20 + b21);
        const m16 = (-a02 + a11 + a12) * (b12 + b20 - b22);
        const m17 = (a02 - a12) * (b12 - b22);
        const m18 = (a11 + a12) * (-b20 + b22);
        const m19 = a01 * b10;
        const m20 = a12 * b21;
        const m21 = a10 * b02;
        const m22 = a20 * b01;
        const m23 = a22 * b22;
        const c00 = m6 + m14 + m19;
        const c01 = m1 + m4 + m5 + m6 + m12 + m14 + m15;
        const c02 = m6 + m7 + m9 + m10 + m14 + m16 + m18;
        const c10 = m2 + m3 + m4 + m6 + m14 + m16 + m17;
        const c11 = m2 + m4 + m5 + m6 + m20;
        const c12 = m14 + m16 + m17 + m18 + m21;
        const c20 = m6 + m7 + m8 + m11 + m12 + m13 + m14;
        const c21 = m12 + m13 + m14 + m15 + m22;
        const c22 = m6 + m7 + m8 + m9 + m23;
        result.set(0, 0, c00);
        result.set(0, 1, c01);
        result.set(0, 2, c02);
        result.set(1, 0, c10);
        result.set(1, 1, c11);
        result.set(1, 2, c12);
        result.set(2, 0, c20);
        result.set(2, 1, c21);
        result.set(2, 2, c22);
        return result;
      }
      mmulStrassen(y) {
        y = Matrix3.checkMatrix(y);
        let x = this.clone();
        let r1 = x.rows;
        let c1 = x.columns;
        let r2 = y.rows;
        let c2 = y.columns;
        if (c1 !== r2) {
          console.warn(
            `Multiplying ${r1} x ${c1} and ${r2} x ${c2} matrix: dimensions do not match.`
          );
        }
        function embed(mat2, rows, cols) {
          let r3 = mat2.rows;
          let c3 = mat2.columns;
          if (r3 === rows && c3 === cols) {
            return mat2;
          } else {
            let resultat = _AbstractMatrix.zeros(rows, cols);
            resultat = resultat.setSubMatrix(mat2, 0, 0);
            return resultat;
          }
        }
        let r = Math.max(r1, r2);
        let c = Math.max(c1, c2);
        x = embed(x, r, c);
        y = embed(y, r, c);
        function blockMult(a, b, rows, cols) {
          if (rows <= 512 || cols <= 512) {
            return a.mmul(b);
          }
          if (rows % 2 === 1 && cols % 2 === 1) {
            a = embed(a, rows + 1, cols + 1);
            b = embed(b, rows + 1, cols + 1);
          } else if (rows % 2 === 1) {
            a = embed(a, rows + 1, cols);
            b = embed(b, rows + 1, cols);
          } else if (cols % 2 === 1) {
            a = embed(a, rows, cols + 1);
            b = embed(b, rows, cols + 1);
          }
          let halfRows = parseInt(a.rows / 2, 10);
          let halfCols = parseInt(a.columns / 2, 10);
          let a11 = a.subMatrix(0, halfRows - 1, 0, halfCols - 1);
          let b11 = b.subMatrix(0, halfRows - 1, 0, halfCols - 1);
          let a12 = a.subMatrix(0, halfRows - 1, halfCols, a.columns - 1);
          let b12 = b.subMatrix(0, halfRows - 1, halfCols, b.columns - 1);
          let a21 = a.subMatrix(halfRows, a.rows - 1, 0, halfCols - 1);
          let b21 = b.subMatrix(halfRows, b.rows - 1, 0, halfCols - 1);
          let a22 = a.subMatrix(halfRows, a.rows - 1, halfCols, a.columns - 1);
          let b22 = b.subMatrix(halfRows, b.rows - 1, halfCols, b.columns - 1);
          let m1 = blockMult(
            _AbstractMatrix.add(a11, a22),
            _AbstractMatrix.add(b11, b22),
            halfRows,
            halfCols
          );
          let m2 = blockMult(_AbstractMatrix.add(a21, a22), b11, halfRows, halfCols);
          let m3 = blockMult(a11, _AbstractMatrix.sub(b12, b22), halfRows, halfCols);
          let m4 = blockMult(a22, _AbstractMatrix.sub(b21, b11), halfRows, halfCols);
          let m5 = blockMult(_AbstractMatrix.add(a11, a12), b22, halfRows, halfCols);
          let m6 = blockMult(
            _AbstractMatrix.sub(a21, a11),
            _AbstractMatrix.add(b11, b12),
            halfRows,
            halfCols
          );
          let m7 = blockMult(
            _AbstractMatrix.sub(a12, a22),
            _AbstractMatrix.add(b21, b22),
            halfRows,
            halfCols
          );
          let c11 = _AbstractMatrix.add(m1, m4);
          c11.sub(m5);
          c11.add(m7);
          let c12 = _AbstractMatrix.add(m3, m5);
          let c21 = _AbstractMatrix.add(m2, m4);
          let c22 = _AbstractMatrix.sub(m1, m2);
          c22.add(m3);
          c22.add(m6);
          let result = _AbstractMatrix.zeros(2 * c11.rows, 2 * c11.columns);
          result = result.setSubMatrix(c11, 0, 0);
          result = result.setSubMatrix(c12, c11.rows, 0);
          result = result.setSubMatrix(c21, 0, c11.columns);
          result = result.setSubMatrix(c22, c11.rows, c11.columns);
          return result.subMatrix(0, rows - 1, 0, cols - 1);
        }
        return blockMult(x, y, r, c);
      }
      scaleRows(options = {}) {
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        const { min = 0, max = 1 } = options;
        if (!Number.isFinite(min)) throw new TypeError("min must be a number");
        if (!Number.isFinite(max)) throw new TypeError("max must be a number");
        if (min >= max) throw new RangeError("min must be smaller than max");
        let newMatrix = new Matrix3(this.rows, this.columns);
        for (let i = 0; i < this.rows; i++) {
          const row = this.getRow(i);
          if (row.length > 0) {
            rescale(row, { min, max, output: row });
          }
          newMatrix.setRow(i, row);
        }
        return newMatrix;
      }
      scaleColumns(options = {}) {
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        const { min = 0, max = 1 } = options;
        if (!Number.isFinite(min)) throw new TypeError("min must be a number");
        if (!Number.isFinite(max)) throw new TypeError("max must be a number");
        if (min >= max) throw new RangeError("min must be smaller than max");
        let newMatrix = new Matrix3(this.rows, this.columns);
        for (let i = 0; i < this.columns; i++) {
          const column = this.getColumn(i);
          if (column.length) {
            rescale(column, {
              min,
              max,
              output: column
            });
          }
          newMatrix.setColumn(i, column);
        }
        return newMatrix;
      }
      flipRows() {
        const middle = Math.ceil(this.columns / 2);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < middle; j++) {
            let first = this.get(i, j);
            let last = this.get(i, this.columns - 1 - j);
            this.set(i, j, last);
            this.set(i, this.columns - 1 - j, first);
          }
        }
        return this;
      }
      flipColumns() {
        const middle = Math.ceil(this.rows / 2);
        for (let j = 0; j < this.columns; j++) {
          for (let i = 0; i < middle; i++) {
            let first = this.get(i, j);
            let last = this.get(this.rows - 1 - i, j);
            this.set(i, j, last);
            this.set(this.rows - 1 - i, j, first);
          }
        }
        return this;
      }
      kroneckerProduct(other) {
        other = Matrix3.checkMatrix(other);
        let m = this.rows;
        let n = this.columns;
        let p = other.rows;
        let q = other.columns;
        let result = new Matrix3(m * p, n * q);
        for (let i = 0; i < m; i++) {
          for (let j = 0; j < n; j++) {
            for (let k = 0; k < p; k++) {
              for (let l = 0; l < q; l++) {
                result.set(p * i + k, q * j + l, this.get(i, j) * other.get(k, l));
              }
            }
          }
        }
        return result;
      }
      kroneckerSum(other) {
        other = Matrix3.checkMatrix(other);
        if (!this.isSquare() || !other.isSquare()) {
          throw new Error("Kronecker Sum needs two Square Matrices");
        }
        let m = this.rows;
        let n = other.rows;
        let AxI = this.kroneckerProduct(Matrix3.eye(n, n));
        let IxB = Matrix3.eye(m, m).kroneckerProduct(other);
        return AxI.add(IxB);
      }
      transpose() {
        let result = new Matrix3(this.columns, this.rows);
        for (let i = 0; i < this.rows; i++) {
          for (let j = 0; j < this.columns; j++) {
            result.set(j, i, this.get(i, j));
          }
        }
        return result;
      }
      sortRows(compareFunction = compareNumbers) {
        for (let i = 0; i < this.rows; i++) {
          this.setRow(i, this.getRow(i).sort(compareFunction));
        }
        return this;
      }
      sortColumns(compareFunction = compareNumbers) {
        for (let i = 0; i < this.columns; i++) {
          this.setColumn(i, this.getColumn(i).sort(compareFunction));
        }
        return this;
      }
      subMatrix(startRow, endRow, startColumn, endColumn) {
        checkRange(this, startRow, endRow, startColumn, endColumn);
        let newMatrix = new Matrix3(
          endRow - startRow + 1,
          endColumn - startColumn + 1
        );
        for (let i = startRow; i <= endRow; i++) {
          for (let j = startColumn; j <= endColumn; j++) {
            newMatrix.set(i - startRow, j - startColumn, this.get(i, j));
          }
        }
        return newMatrix;
      }
      subMatrixRow(indices, startColumn, endColumn) {
        if (startColumn === void 0) startColumn = 0;
        if (endColumn === void 0) endColumn = this.columns - 1;
        if (startColumn > endColumn || startColumn < 0 || startColumn >= this.columns || endColumn < 0 || endColumn >= this.columns) {
          throw new RangeError("Argument out of range");
        }
        let newMatrix = new Matrix3(indices.length, endColumn - startColumn + 1);
        for (let i = 0; i < indices.length; i++) {
          for (let j = startColumn; j <= endColumn; j++) {
            if (indices[i] < 0 || indices[i] >= this.rows) {
              throw new RangeError(`Row index out of range: ${indices[i]}`);
            }
            newMatrix.set(i, j - startColumn, this.get(indices[i], j));
          }
        }
        return newMatrix;
      }
      subMatrixColumn(indices, startRow, endRow) {
        if (startRow === void 0) startRow = 0;
        if (endRow === void 0) endRow = this.rows - 1;
        if (startRow > endRow || startRow < 0 || startRow >= this.rows || endRow < 0 || endRow >= this.rows) {
          throw new RangeError("Argument out of range");
        }
        let newMatrix = new Matrix3(endRow - startRow + 1, indices.length);
        for (let i = 0; i < indices.length; i++) {
          for (let j = startRow; j <= endRow; j++) {
            if (indices[i] < 0 || indices[i] >= this.columns) {
              throw new RangeError(`Column index out of range: ${indices[i]}`);
            }
            newMatrix.set(j - startRow, i, this.get(j, indices[i]));
          }
        }
        return newMatrix;
      }
      setSubMatrix(matrix2, startRow, startColumn) {
        matrix2 = Matrix3.checkMatrix(matrix2);
        if (matrix2.isEmpty()) {
          return this;
        }
        let endRow = startRow + matrix2.rows - 1;
        let endColumn = startColumn + matrix2.columns - 1;
        checkRange(this, startRow, endRow, startColumn, endColumn);
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            this.set(startRow + i, startColumn + j, matrix2.get(i, j));
          }
        }
        return this;
      }
      selection(rowIndices, columnIndices) {
        checkRowIndices(this, rowIndices);
        checkColumnIndices(this, columnIndices);
        let newMatrix = new Matrix3(rowIndices.length, columnIndices.length);
        for (let i = 0; i < rowIndices.length; i++) {
          let rowIndex = rowIndices[i];
          for (let j = 0; j < columnIndices.length; j++) {
            let columnIndex = columnIndices[j];
            newMatrix.set(i, j, this.get(rowIndex, columnIndex));
          }
        }
        return newMatrix;
      }
      trace() {
        let min = Math.min(this.rows, this.columns);
        let trace = 0;
        for (let i = 0; i < min; i++) {
          trace += this.get(i, i);
        }
        return trace;
      }
      clone() {
        return this.constructor.copy(this, new Matrix3(this.rows, this.columns));
      }
      /**
       * @template {AbstractMatrix} M
       * @param {AbstractMatrix} from
       * @param {M} to
       * @return {M}
       */
      static copy(from, to) {
        for (const [row, column, value] of from.entries()) {
          to.set(row, column, value);
        }
        return to;
      }
      sum(by) {
        switch (by) {
          case "row":
            return sumByRow(this);
          case "column":
            return sumByColumn(this);
          case void 0:
            return sumAll(this);
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      product(by) {
        switch (by) {
          case "row":
            return productByRow(this);
          case "column":
            return productByColumn(this);
          case void 0:
            return productAll(this);
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      mean(by) {
        const sum = this.sum(by);
        switch (by) {
          case "row": {
            for (let i = 0; i < this.rows; i++) {
              sum[i] /= this.columns;
            }
            return sum;
          }
          case "column": {
            for (let i = 0; i < this.columns; i++) {
              sum[i] /= this.rows;
            }
            return sum;
          }
          case void 0:
            return sum / this.size;
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      variance(by, options = {}) {
        if (typeof by === "object") {
          options = by;
          by = void 0;
        }
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        const { unbiased = true, mean = this.mean(by) } = options;
        if (typeof unbiased !== "boolean") {
          throw new TypeError("unbiased must be a boolean");
        }
        switch (by) {
          case "row": {
            if (!isAnyArray.isAnyArray(mean)) {
              throw new TypeError("mean must be an array");
            }
            return varianceByRow(this, unbiased, mean);
          }
          case "column": {
            if (!isAnyArray.isAnyArray(mean)) {
              throw new TypeError("mean must be an array");
            }
            return varianceByColumn(this, unbiased, mean);
          }
          case void 0: {
            if (typeof mean !== "number") {
              throw new TypeError("mean must be a number");
            }
            return varianceAll(this, unbiased, mean);
          }
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      standardDeviation(by, options) {
        if (typeof by === "object") {
          options = by;
          by = void 0;
        }
        const variance = this.variance(by, options);
        if (by === void 0) {
          return Math.sqrt(variance);
        } else {
          for (let i = 0; i < variance.length; i++) {
            variance[i] = Math.sqrt(variance[i]);
          }
          return variance;
        }
      }
      center(by, options = {}) {
        if (typeof by === "object") {
          options = by;
          by = void 0;
        }
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        const { center = this.mean(by) } = options;
        switch (by) {
          case "row": {
            if (!isAnyArray.isAnyArray(center)) {
              throw new TypeError("center must be an array");
            }
            centerByRow(this, center);
            return this;
          }
          case "column": {
            if (!isAnyArray.isAnyArray(center)) {
              throw new TypeError("center must be an array");
            }
            centerByColumn(this, center);
            return this;
          }
          case void 0: {
            if (typeof center !== "number") {
              throw new TypeError("center must be a number");
            }
            centerAll(this, center);
            return this;
          }
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      scale(by, options = {}) {
        if (typeof by === "object") {
          options = by;
          by = void 0;
        }
        if (typeof options !== "object") {
          throw new TypeError("options must be an object");
        }
        let scale = options.scale;
        switch (by) {
          case "row": {
            if (scale === void 0) {
              scale = getScaleByRow(this);
            } else if (!isAnyArray.isAnyArray(scale)) {
              throw new TypeError("scale must be an array");
            }
            scaleByRow(this, scale);
            return this;
          }
          case "column": {
            if (scale === void 0) {
              scale = getScaleByColumn(this);
            } else if (!isAnyArray.isAnyArray(scale)) {
              throw new TypeError("scale must be an array");
            }
            scaleByColumn(this, scale);
            return this;
          }
          case void 0: {
            if (scale === void 0) {
              scale = getScaleAll(this);
            } else if (typeof scale !== "number") {
              throw new TypeError("scale must be a number");
            }
            scaleAll(this, scale);
            return this;
          }
          default:
            throw new Error(`invalid option: ${by}`);
        }
      }
      toString(options) {
        return inspectMatrixWithOptions(this, options);
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      /**
       * iterator from left to right, from top to bottom
       * yield [row, column, value]
       * @returns {Generator<[number, number, number], void, void>}
       */
      *entries() {
        for (let row = 0; row < this.rows; row++) {
          for (let col = 0; col < this.columns; col++) {
            yield [row, col, this.get(row, col)];
          }
        }
      }
      /**
       * iterator from left to right, from top to bottom
       * yield value
       * @returns {Generator<number, void, void>}
       */
      *values() {
        for (let row = 0; row < this.rows; row++) {
          for (let col = 0; col < this.columns; col++) {
            yield this.get(row, col);
          }
        }
      }
    };
    AbstractMatrix2.prototype.klass = "Matrix";
    if (typeof Symbol !== "undefined") {
      AbstractMatrix2.prototype[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = inspectMatrix;
    }
    function compareNumbers(a, b) {
      return a - b;
    }
    function isArrayOfNumbers(array) {
      return array.every((element) => {
        return typeof element === "number";
      });
    }
    AbstractMatrix2.random = AbstractMatrix2.rand;
    AbstractMatrix2.randomInt = AbstractMatrix2.randInt;
    AbstractMatrix2.diagonal = AbstractMatrix2.diag;
    AbstractMatrix2.prototype.diagonal = AbstractMatrix2.prototype.diag;
    AbstractMatrix2.identity = AbstractMatrix2.eye;
    AbstractMatrix2.prototype.negate = AbstractMatrix2.prototype.neg;
    AbstractMatrix2.prototype.tensorProduct = AbstractMatrix2.prototype.kroneckerProduct;
    var Matrix3 = class _Matrix extends AbstractMatrix2 {
      /**
       * @type {Float64Array[]}
       */
      data;
      /**
       * Init an empty matrix
       * @param {number} nRows
       * @param {number} nColumns
       */
      #initData(nRows, nColumns) {
        this.data = [];
        if (Number.isInteger(nColumns) && nColumns >= 0) {
          for (let i = 0; i < nRows; i++) {
            this.data.push(new Float64Array(nColumns));
          }
        } else {
          throw new TypeError("nColumns must be a positive integer");
        }
        this.rows = nRows;
        this.columns = nColumns;
      }
      constructor(nRows, nColumns) {
        super();
        if (_Matrix.isMatrix(nRows)) {
          this.#initData(nRows.rows, nRows.columns);
          _Matrix.copy(nRows, this);
        } else if (Number.isInteger(nRows) && nRows >= 0) {
          this.#initData(nRows, nColumns);
        } else if (isAnyArray.isAnyArray(nRows)) {
          const arrayData = nRows;
          nRows = arrayData.length;
          nColumns = nRows ? arrayData[0].length : 0;
          if (typeof nColumns !== "number") {
            throw new TypeError(
              "Data must be a 2D array with at least one element"
            );
          }
          this.data = [];
          for (let i = 0; i < nRows; i++) {
            if (arrayData[i].length !== nColumns) {
              throw new RangeError("Inconsistent array dimensions");
            }
            if (!isArrayOfNumbers(arrayData[i])) {
              throw new TypeError("Input data contains non-numeric values");
            }
            this.data.push(Float64Array.from(arrayData[i]));
          }
          this.rows = nRows;
          this.columns = nColumns;
        } else {
          throw new TypeError(
            "First argument must be a positive number or an array"
          );
        }
      }
      set(rowIndex, columnIndex, value) {
        this.data[rowIndex][columnIndex] = value;
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.data[rowIndex][columnIndex];
      }
      removeRow(index) {
        checkRowIndex(this, index);
        this.data.splice(index, 1);
        this.rows -= 1;
        return this;
      }
      addRow(index, array) {
        if (array === void 0) {
          array = index;
          index = this.rows;
        }
        checkRowIndex(this, index, true);
        array = Float64Array.from(checkRowVector(this, array));
        this.data.splice(index, 0, array);
        this.rows += 1;
        return this;
      }
      removeColumn(index) {
        checkColumnIndex(this, index);
        for (let i = 0; i < this.rows; i++) {
          const newRow = new Float64Array(this.columns - 1);
          for (let j = 0; j < index; j++) {
            newRow[j] = this.data[i][j];
          }
          for (let j = index + 1; j < this.columns; j++) {
            newRow[j - 1] = this.data[i][j];
          }
          this.data[i] = newRow;
        }
        this.columns -= 1;
        return this;
      }
      addColumn(index, array) {
        if (typeof array === "undefined") {
          array = index;
          index = this.columns;
        }
        checkColumnIndex(this, index, true);
        array = checkColumnVector(this, array);
        for (let i = 0; i < this.rows; i++) {
          const newRow = new Float64Array(this.columns + 1);
          let j = 0;
          for (; j < index; j++) {
            newRow[j] = this.data[i][j];
          }
          newRow[j++] = array[i];
          for (; j < this.columns + 1; j++) {
            newRow[j] = this.data[i][j - 1];
          }
          this.data[i] = newRow;
        }
        this.columns += 1;
        return this;
      }
    };
    installMathOperations(AbstractMatrix2, Matrix3);
    var SymmetricMatrix2 = class _SymmetricMatrix extends AbstractMatrix2 {
      /** @type {Matrix} */
      #matrix;
      get size() {
        return this.#matrix.size;
      }
      get rows() {
        return this.#matrix.rows;
      }
      get columns() {
        return this.#matrix.columns;
      }
      get diagonalSize() {
        return this.rows;
      }
      /**
       * not the same as matrix.isSymmetric()
       * Here is to check if it's instanceof SymmetricMatrix without bundling issues
       *
       * @param value
       * @returns {boolean}
       */
      static isSymmetricMatrix(value) {
        return Matrix3.isMatrix(value) && value.klassType === "SymmetricMatrix";
      }
      /**
       * @param diagonalSize
       * @return {SymmetricMatrix}
       */
      static zeros(diagonalSize) {
        return new this(diagonalSize);
      }
      /**
       * @param diagonalSize
       * @return {SymmetricMatrix}
       */
      static ones(diagonalSize) {
        return new this(diagonalSize).fill(1);
      }
      /**
       * @param {number | AbstractMatrix | ArrayLike<ArrayLike<number>>} diagonalSize
       * @return {this}
       */
      constructor(diagonalSize) {
        super();
        if (Matrix3.isMatrix(diagonalSize)) {
          if (!diagonalSize.isSymmetric()) {
            throw new TypeError("not symmetric data");
          }
          this.#matrix = Matrix3.copy(
            diagonalSize,
            new Matrix3(diagonalSize.rows, diagonalSize.rows)
          );
        } else if (Number.isInteger(diagonalSize) && diagonalSize >= 0) {
          this.#matrix = new Matrix3(diagonalSize, diagonalSize);
        } else {
          this.#matrix = new Matrix3(diagonalSize);
          if (!this.isSymmetric()) {
            throw new TypeError("not symmetric data");
          }
        }
      }
      clone() {
        const matrix2 = new _SymmetricMatrix(this.diagonalSize);
        for (const [row, col, value] of this.upperRightEntries()) {
          matrix2.set(row, col, value);
        }
        return matrix2;
      }
      toMatrix() {
        return new Matrix3(this);
      }
      get(rowIndex, columnIndex) {
        return this.#matrix.get(rowIndex, columnIndex);
      }
      set(rowIndex, columnIndex, value) {
        this.#matrix.set(rowIndex, columnIndex, value);
        this.#matrix.set(columnIndex, rowIndex, value);
        return this;
      }
      removeCross(index) {
        this.#matrix.removeRow(index);
        this.#matrix.removeColumn(index);
        return this;
      }
      addCross(index, array) {
        if (array === void 0) {
          array = index;
          index = this.diagonalSize;
        }
        const row = array.slice();
        row.splice(index, 1);
        this.#matrix.addRow(index, row);
        this.#matrix.addColumn(index, array);
        return this;
      }
      /**
       * @param {Mask[]} mask
       */
      applyMask(mask) {
        if (mask.length !== this.diagonalSize) {
          throw new RangeError("Mask size do not match with matrix size");
        }
        const sidesToRemove = [];
        for (const [index, passthroughs] of mask.entries()) {
          if (passthroughs) continue;
          sidesToRemove.push(index);
        }
        sidesToRemove.reverse();
        for (const sideIndex of sidesToRemove) {
          this.removeCross(sideIndex);
        }
        return this;
      }
      /**
       * Compact format upper-right corner of matrix
       * iterate from left to right, from top to bottom.
       *
       * ```
       *   A B C D
       * A 1 2 3 4
       * B 2 5 6 7
       * C 3 6 8 9
       * D 4 7 9 10
       * ```
       *
       * will return compact 1D array `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
       *
       * length is S(i=0, n=sideSize) => 10 for a 4 sideSized matrix
       *
       * @returns {number[]}
       */
      toCompact() {
        const { diagonalSize } = this;
        const compact = new Array(diagonalSize * (diagonalSize + 1) / 2);
        for (let col = 0, row = 0, index = 0; index < compact.length; index++) {
          compact[index] = this.get(row, col);
          if (++col >= diagonalSize) col = ++row;
        }
        return compact;
      }
      /**
       * @param {number[]} compact
       * @return {SymmetricMatrix}
       */
      static fromCompact(compact) {
        const compactSize = compact.length;
        const diagonalSize = (Math.sqrt(8 * compactSize + 1) - 1) / 2;
        if (!Number.isInteger(diagonalSize)) {
          throw new TypeError(
            `This array is not a compact representation of a Symmetric Matrix, ${JSON.stringify(
              compact
            )}`
          );
        }
        const matrix2 = new _SymmetricMatrix(diagonalSize);
        for (let col = 0, row = 0, index = 0; index < compactSize; index++) {
          matrix2.set(col, row, compact[index]);
          if (++col >= diagonalSize) col = ++row;
        }
        return matrix2;
      }
      /**
       * half iterator upper-right-corner from left to right, from top to bottom
       * yield [row, column, value]
       *
       * @returns {Generator<[number, number, number], void, void>}
       */
      *upperRightEntries() {
        for (let row = 0, col = 0; row < this.diagonalSize; void 0) {
          const value = this.get(row, col);
          yield [row, col, value];
          if (++col >= this.diagonalSize) col = ++row;
        }
      }
      /**
       * half iterator upper-right-corner from left to right, from top to bottom
       * yield value
       *
       * @returns {Generator<[number, number, number], void, void>}
       */
      *upperRightValues() {
        for (let row = 0, col = 0; row < this.diagonalSize; void 0) {
          const value = this.get(row, col);
          yield value;
          if (++col >= this.diagonalSize) col = ++row;
        }
      }
    };
    SymmetricMatrix2.prototype.klassType = "SymmetricMatrix";
    var DistanceMatrix2 = class _DistanceMatrix extends SymmetricMatrix2 {
      /**
       * not the same as matrix.isSymmetric()
       * Here is to check if it's instanceof SymmetricMatrix without bundling issues
       *
       * @param value
       * @returns {boolean}
       */
      static isDistanceMatrix(value) {
        return SymmetricMatrix2.isSymmetricMatrix(value) && value.klassSubType === "DistanceMatrix";
      }
      constructor(sideSize) {
        super(sideSize);
        if (!this.isDistance()) {
          throw new TypeError("Provided arguments do no produce a distance matrix");
        }
      }
      set(rowIndex, columnIndex, value) {
        if (rowIndex === columnIndex) value = 0;
        return super.set(rowIndex, columnIndex, value);
      }
      addCross(index, array) {
        if (array === void 0) {
          array = index;
          index = this.diagonalSize;
        }
        array = array.slice();
        array[index] = 0;
        return super.addCross(index, array);
      }
      toSymmetricMatrix() {
        return new SymmetricMatrix2(this);
      }
      clone() {
        const matrix2 = new _DistanceMatrix(this.diagonalSize);
        for (const [row, col, value] of this.upperRightEntries()) {
          if (row === col) continue;
          matrix2.set(row, col, value);
        }
        return matrix2;
      }
      /**
       * Compact format upper-right corner of matrix
       * no diagonal (only zeros)
       * iterable from left to right, from top to bottom.
       *
       * ```
       *   A B C D
       * A 0 1 2 3
       * B 1 0 4 5
       * C 2 4 0 6
       * D 3 5 6 0
       * ```
       *
       * will return compact 1D array `[1, 2, 3, 4, 5, 6]`
       *
       * length is S(i=0, n=sideSize-1) => 6 for a 4 side sized matrix
       *
       * @returns {number[]}
       */
      toCompact() {
        const { diagonalSize } = this;
        const compactLength = (diagonalSize - 1) * diagonalSize / 2;
        const compact = new Array(compactLength);
        for (let col = 1, row = 0, index = 0; index < compact.length; index++) {
          compact[index] = this.get(row, col);
          if (++col >= diagonalSize) col = ++row + 1;
        }
        return compact;
      }
      /**
       * @param {number[]} compact
       */
      static fromCompact(compact) {
        const compactSize = compact.length;
        if (compactSize === 0) {
          return new this(0);
        }
        const diagonalSize = (Math.sqrt(8 * compactSize + 1) + 1) / 2;
        if (!Number.isInteger(diagonalSize)) {
          throw new TypeError(
            `This array is not a compact representation of a DistanceMatrix, ${JSON.stringify(
              compact
            )}`
          );
        }
        const matrix2 = new this(diagonalSize);
        for (let col = 1, row = 0, index = 0; index < compactSize; index++) {
          matrix2.set(col, row, compact[index]);
          if (++col >= diagonalSize) col = ++row + 1;
        }
        return matrix2;
      }
    };
    DistanceMatrix2.prototype.klassSubType = "DistanceMatrix";
    var BaseView = class extends AbstractMatrix2 {
      constructor(matrix2, rows, columns) {
        super();
        this.matrix = matrix2;
        this.rows = rows;
        this.columns = columns;
      }
    };
    var MatrixColumnView2 = class extends BaseView {
      constructor(matrix2, column) {
        checkColumnIndex(matrix2, column);
        super(matrix2, matrix2.rows, 1);
        this.column = column;
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(rowIndex, this.column, value);
        return this;
      }
      get(rowIndex) {
        return this.matrix.get(rowIndex, this.column);
      }
    };
    var MatrixColumnSelectionView2 = class extends BaseView {
      constructor(matrix2, columnIndices) {
        checkColumnIndices(matrix2, columnIndices);
        super(matrix2, matrix2.rows, columnIndices.length);
        this.columnIndices = columnIndices;
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(rowIndex, this.columnIndices[columnIndex], value);
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(rowIndex, this.columnIndices[columnIndex]);
      }
    };
    var MatrixFlipColumnView2 = class extends BaseView {
      constructor(matrix2) {
        super(matrix2, matrix2.rows, matrix2.columns);
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(rowIndex, this.columns - columnIndex - 1, value);
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(rowIndex, this.columns - columnIndex - 1);
      }
    };
    var MatrixFlipRowView2 = class extends BaseView {
      constructor(matrix2) {
        super(matrix2, matrix2.rows, matrix2.columns);
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(this.rows - rowIndex - 1, columnIndex, value);
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(this.rows - rowIndex - 1, columnIndex);
      }
    };
    var MatrixRowView2 = class extends BaseView {
      constructor(matrix2, row) {
        checkRowIndex(matrix2, row);
        super(matrix2, 1, matrix2.columns);
        this.row = row;
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(this.row, columnIndex, value);
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(this.row, columnIndex);
      }
    };
    var MatrixRowSelectionView2 = class extends BaseView {
      constructor(matrix2, rowIndices) {
        checkRowIndices(matrix2, rowIndices);
        super(matrix2, rowIndices.length, matrix2.columns);
        this.rowIndices = rowIndices;
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(this.rowIndices[rowIndex], columnIndex, value);
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(this.rowIndices[rowIndex], columnIndex);
      }
    };
    var MatrixSelectionView2 = class extends BaseView {
      constructor(matrix2, rowIndices, columnIndices) {
        checkRowIndices(matrix2, rowIndices);
        checkColumnIndices(matrix2, columnIndices);
        super(matrix2, rowIndices.length, columnIndices.length);
        this.rowIndices = rowIndices;
        this.columnIndices = columnIndices;
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(
          this.rowIndices[rowIndex],
          this.columnIndices[columnIndex],
          value
        );
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(
          this.rowIndices[rowIndex],
          this.columnIndices[columnIndex]
        );
      }
    };
    var MatrixSubView2 = class extends BaseView {
      constructor(matrix2, startRow, endRow, startColumn, endColumn) {
        checkRange(matrix2, startRow, endRow, startColumn, endColumn);
        super(matrix2, endRow - startRow + 1, endColumn - startColumn + 1);
        this.startRow = startRow;
        this.startColumn = startColumn;
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(
          this.startRow + rowIndex,
          this.startColumn + columnIndex,
          value
        );
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(
          this.startRow + rowIndex,
          this.startColumn + columnIndex
        );
      }
    };
    var MatrixTransposeView2 = class extends BaseView {
      constructor(matrix2) {
        super(matrix2, matrix2.columns, matrix2.rows);
      }
      set(rowIndex, columnIndex, value) {
        this.matrix.set(columnIndex, rowIndex, value);
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.matrix.get(columnIndex, rowIndex);
      }
    };
    var WrapperMatrix1D2 = class extends AbstractMatrix2 {
      constructor(data, options = {}) {
        const { rows = 1 } = options;
        if (data.length % rows !== 0) {
          throw new Error("the data length is not divisible by the number of rows");
        }
        super();
        this.rows = rows;
        this.columns = data.length / rows;
        this.data = data;
      }
      set(rowIndex, columnIndex, value) {
        let index = this._calculateIndex(rowIndex, columnIndex);
        this.data[index] = value;
        return this;
      }
      get(rowIndex, columnIndex) {
        let index = this._calculateIndex(rowIndex, columnIndex);
        return this.data[index];
      }
      _calculateIndex(row, column) {
        return row * this.columns + column;
      }
    };
    var WrapperMatrix2D2 = class extends AbstractMatrix2 {
      constructor(data) {
        super();
        this.data = data;
        this.rows = data.length;
        this.columns = data[0].length;
      }
      set(rowIndex, columnIndex, value) {
        this.data[rowIndex][columnIndex] = value;
        return this;
      }
      get(rowIndex, columnIndex) {
        return this.data[rowIndex][columnIndex];
      }
    };
    function wrap2(array, options) {
      if (isAnyArray.isAnyArray(array)) {
        if (array[0] && isAnyArray.isAnyArray(array[0])) {
          return new WrapperMatrix2D2(array);
        } else {
          return new WrapperMatrix1D2(array, options);
        }
      } else {
        throw new Error("the argument is not an array");
      }
    }
    var LuDecomposition2 = class {
      constructor(matrix2) {
        matrix2 = WrapperMatrix2D2.checkMatrix(matrix2);
        let lu = matrix2.clone();
        let rows = lu.rows;
        let columns = lu.columns;
        let pivotVector = new Float64Array(rows);
        let pivotSign = 1;
        let i, j, k, p, s, t, v;
        let LUcolj, kmax;
        for (i = 0; i < rows; i++) {
          pivotVector[i] = i;
        }
        LUcolj = new Float64Array(rows);
        for (j = 0; j < columns; j++) {
          for (i = 0; i < rows; i++) {
            LUcolj[i] = lu.get(i, j);
          }
          for (i = 0; i < rows; i++) {
            kmax = Math.min(i, j);
            s = 0;
            for (k = 0; k < kmax; k++) {
              s += lu.get(i, k) * LUcolj[k];
            }
            LUcolj[i] -= s;
            lu.set(i, j, LUcolj[i]);
          }
          p = j;
          for (i = j + 1; i < rows; i++) {
            if (Math.abs(LUcolj[i]) > Math.abs(LUcolj[p])) {
              p = i;
            }
          }
          if (p !== j) {
            for (k = 0; k < columns; k++) {
              t = lu.get(p, k);
              lu.set(p, k, lu.get(j, k));
              lu.set(j, k, t);
            }
            v = pivotVector[p];
            pivotVector[p] = pivotVector[j];
            pivotVector[j] = v;
            pivotSign = -pivotSign;
          }
          if (j < rows && lu.get(j, j) !== 0) {
            for (i = j + 1; i < rows; i++) {
              lu.set(i, j, lu.get(i, j) / lu.get(j, j));
            }
          }
        }
        this.LU = lu;
        this.pivotVector = pivotVector;
        this.pivotSign = pivotSign;
      }
      isSingular() {
        let data = this.LU;
        let col = data.columns;
        for (let j = 0; j < col; j++) {
          if (data.get(j, j) === 0) {
            return true;
          }
        }
        return false;
      }
      solve(value) {
        value = Matrix3.checkMatrix(value);
        let lu = this.LU;
        let rows = lu.rows;
        if (rows !== value.rows) {
          throw new Error("Invalid matrix dimensions");
        }
        if (this.isSingular()) {
          throw new Error("LU matrix is singular");
        }
        let count = value.columns;
        let X = value.subMatrixRow(this.pivotVector, 0, count - 1);
        let columns = lu.columns;
        let i, j, k;
        for (k = 0; k < columns; k++) {
          for (i = k + 1; i < columns; i++) {
            for (j = 0; j < count; j++) {
              X.set(i, j, X.get(i, j) - X.get(k, j) * lu.get(i, k));
            }
          }
        }
        for (k = columns - 1; k >= 0; k--) {
          for (j = 0; j < count; j++) {
            X.set(k, j, X.get(k, j) / lu.get(k, k));
          }
          for (i = 0; i < k; i++) {
            for (j = 0; j < count; j++) {
              X.set(i, j, X.get(i, j) - X.get(k, j) * lu.get(i, k));
            }
          }
        }
        return X;
      }
      get determinant() {
        let data = this.LU;
        if (!data.isSquare()) {
          throw new Error("Matrix must be square");
        }
        let determinant4 = this.pivotSign;
        let col = data.columns;
        for (let j = 0; j < col; j++) {
          determinant4 *= data.get(j, j);
        }
        return determinant4;
      }
      get lowerTriangularMatrix() {
        let data = this.LU;
        let rows = data.rows;
        let columns = data.columns;
        let X = new Matrix3(rows, columns);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < columns; j++) {
            if (i > j) {
              X.set(i, j, data.get(i, j));
            } else if (i === j) {
              X.set(i, j, 1);
            } else {
              X.set(i, j, 0);
            }
          }
        }
        return X;
      }
      get upperTriangularMatrix() {
        let data = this.LU;
        let rows = data.rows;
        let columns = data.columns;
        let X = new Matrix3(rows, columns);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < columns; j++) {
            if (i <= j) {
              X.set(i, j, data.get(i, j));
            } else {
              X.set(i, j, 0);
            }
          }
        }
        return X;
      }
      get pivotPermutationVector() {
        return Array.from(this.pivotVector);
      }
    };
    function hypotenuse(a, b) {
      let r = 0;
      if (Math.abs(a) > Math.abs(b)) {
        r = b / a;
        return Math.abs(a) * Math.sqrt(1 + r * r);
      }
      if (b !== 0) {
        r = a / b;
        return Math.abs(b) * Math.sqrt(1 + r * r);
      }
      return 0;
    }
    var QrDecomposition2 = class {
      constructor(value) {
        value = WrapperMatrix2D2.checkMatrix(value);
        let qr = value.clone();
        let m = value.rows;
        let n = value.columns;
        let rdiag = new Float64Array(n);
        let i, j, k, s;
        for (k = 0; k < n; k++) {
          let nrm = 0;
          for (i = k; i < m; i++) {
            nrm = hypotenuse(nrm, qr.get(i, k));
          }
          if (nrm !== 0) {
            if (qr.get(k, k) < 0) {
              nrm = -nrm;
            }
            for (i = k; i < m; i++) {
              qr.set(i, k, qr.get(i, k) / nrm);
            }
            qr.set(k, k, qr.get(k, k) + 1);
            for (j = k + 1; j < n; j++) {
              s = 0;
              for (i = k; i < m; i++) {
                s += qr.get(i, k) * qr.get(i, j);
              }
              s = -s / qr.get(k, k);
              for (i = k; i < m; i++) {
                qr.set(i, j, qr.get(i, j) + s * qr.get(i, k));
              }
            }
          }
          rdiag[k] = -nrm;
        }
        this.QR = qr;
        this.Rdiag = rdiag;
      }
      solve(value) {
        value = Matrix3.checkMatrix(value);
        let qr = this.QR;
        let m = qr.rows;
        if (value.rows !== m) {
          throw new Error("Matrix row dimensions must agree");
        }
        if (!this.isFullRank()) {
          throw new Error("Matrix is rank deficient");
        }
        let count = value.columns;
        let X = value.clone();
        let n = qr.columns;
        let i, j, k, s;
        for (k = 0; k < n; k++) {
          for (j = 0; j < count; j++) {
            s = 0;
            for (i = k; i < m; i++) {
              s += qr.get(i, k) * X.get(i, j);
            }
            s = -s / qr.get(k, k);
            for (i = k; i < m; i++) {
              X.set(i, j, X.get(i, j) + s * qr.get(i, k));
            }
          }
        }
        for (k = n - 1; k >= 0; k--) {
          for (j = 0; j < count; j++) {
            X.set(k, j, X.get(k, j) / this.Rdiag[k]);
          }
          for (i = 0; i < k; i++) {
            for (j = 0; j < count; j++) {
              X.set(i, j, X.get(i, j) - X.get(k, j) * qr.get(i, k));
            }
          }
        }
        return X.subMatrix(0, n - 1, 0, count - 1);
      }
      isFullRank() {
        let columns = this.QR.columns;
        for (let i = 0; i < columns; i++) {
          if (this.Rdiag[i] === 0) {
            return false;
          }
        }
        return true;
      }
      get upperTriangularMatrix() {
        let qr = this.QR;
        let n = qr.columns;
        let X = new Matrix3(n, n);
        let i, j;
        for (i = 0; i < n; i++) {
          for (j = 0; j < n; j++) {
            if (i < j) {
              X.set(i, j, qr.get(i, j));
            } else if (i === j) {
              X.set(i, j, this.Rdiag[i]);
            } else {
              X.set(i, j, 0);
            }
          }
        }
        return X;
      }
      get orthogonalMatrix() {
        let qr = this.QR;
        let rows = qr.rows;
        let columns = qr.columns;
        let X = new Matrix3(rows, columns);
        let i, j, k, s;
        for (k = columns - 1; k >= 0; k--) {
          for (i = 0; i < rows; i++) {
            X.set(i, k, 0);
          }
          X.set(k, k, 1);
          for (j = k; j < columns; j++) {
            if (qr.get(k, k) !== 0) {
              s = 0;
              for (i = k; i < rows; i++) {
                s += qr.get(i, k) * X.get(i, j);
              }
              s = -s / qr.get(k, k);
              for (i = k; i < rows; i++) {
                X.set(i, j, X.get(i, j) + s * qr.get(i, k));
              }
            }
          }
        }
        return X;
      }
    };
    var SingularValueDecomposition3 = class {
      constructor(value, options = {}) {
        value = WrapperMatrix2D2.checkMatrix(value);
        if (value.isEmpty()) {
          throw new Error("Matrix must be non-empty");
        }
        let m = value.rows;
        let n = value.columns;
        const {
          computeLeftSingularVectors = true,
          computeRightSingularVectors = true,
          autoTranspose = false
        } = options;
        let wantu = Boolean(computeLeftSingularVectors);
        let wantv = Boolean(computeRightSingularVectors);
        let swapped = false;
        let a;
        if (m < n) {
          if (!autoTranspose) {
            a = value.clone();
            console.warn(
              "Computing SVD on a matrix with more columns than rows. Consider enabling autoTranspose"
            );
          } else {
            a = value.transpose();
            m = a.rows;
            n = a.columns;
            swapped = true;
            let aux = wantu;
            wantu = wantv;
            wantv = aux;
          }
        } else {
          a = value.clone();
        }
        let nu = Math.min(m, n);
        let ni = Math.min(m + 1, n);
        let s = new Float64Array(ni);
        let U = new Matrix3(m, nu);
        let V = new Matrix3(n, n);
        let e = new Float64Array(n);
        let work = new Float64Array(m);
        let si = new Float64Array(ni);
        for (let i = 0; i < ni; i++) si[i] = i;
        let nct = Math.min(m - 1, n);
        let nrt = Math.max(0, Math.min(n - 2, m));
        let mrc = Math.max(nct, nrt);
        for (let k = 0; k < mrc; k++) {
          if (k < nct) {
            s[k] = 0;
            for (let i = k; i < m; i++) {
              s[k] = hypotenuse(s[k], a.get(i, k));
            }
            if (s[k] !== 0) {
              if (a.get(k, k) < 0) {
                s[k] = -s[k];
              }
              for (let i = k; i < m; i++) {
                a.set(i, k, a.get(i, k) / s[k]);
              }
              a.set(k, k, a.get(k, k) + 1);
            }
            s[k] = -s[k];
          }
          for (let j = k + 1; j < n; j++) {
            if (k < nct && s[k] !== 0) {
              let t = 0;
              for (let i = k; i < m; i++) {
                t += a.get(i, k) * a.get(i, j);
              }
              t = -t / a.get(k, k);
              for (let i = k; i < m; i++) {
                a.set(i, j, a.get(i, j) + t * a.get(i, k));
              }
            }
            e[j] = a.get(k, j);
          }
          if (wantu && k < nct) {
            for (let i = k; i < m; i++) {
              U.set(i, k, a.get(i, k));
            }
          }
          if (k < nrt) {
            e[k] = 0;
            for (let i = k + 1; i < n; i++) {
              e[k] = hypotenuse(e[k], e[i]);
            }
            if (e[k] !== 0) {
              if (e[k + 1] < 0) {
                e[k] = 0 - e[k];
              }
              for (let i = k + 1; i < n; i++) {
                e[i] /= e[k];
              }
              e[k + 1] += 1;
            }
            e[k] = -e[k];
            if (k + 1 < m && e[k] !== 0) {
              for (let i = k + 1; i < m; i++) {
                work[i] = 0;
              }
              for (let i = k + 1; i < m; i++) {
                for (let j = k + 1; j < n; j++) {
                  work[i] += e[j] * a.get(i, j);
                }
              }
              for (let j = k + 1; j < n; j++) {
                let t = -e[j] / e[k + 1];
                for (let i = k + 1; i < m; i++) {
                  a.set(i, j, a.get(i, j) + t * work[i]);
                }
              }
            }
            if (wantv) {
              for (let i = k + 1; i < n; i++) {
                V.set(i, k, e[i]);
              }
            }
          }
        }
        let p = Math.min(n, m + 1);
        if (nct < n) {
          s[nct] = a.get(nct, nct);
        }
        if (m < p) {
          s[p - 1] = 0;
        }
        if (nrt + 1 < p) {
          e[nrt] = a.get(nrt, p - 1);
        }
        e[p - 1] = 0;
        if (wantu) {
          for (let j = nct; j < nu; j++) {
            for (let i = 0; i < m; i++) {
              U.set(i, j, 0);
            }
            U.set(j, j, 1);
          }
          for (let k = nct - 1; k >= 0; k--) {
            if (s[k] !== 0) {
              for (let j = k + 1; j < nu; j++) {
                let t = 0;
                for (let i = k; i < m; i++) {
                  t += U.get(i, k) * U.get(i, j);
                }
                t = -t / U.get(k, k);
                for (let i = k; i < m; i++) {
                  U.set(i, j, U.get(i, j) + t * U.get(i, k));
                }
              }
              for (let i = k; i < m; i++) {
                U.set(i, k, -U.get(i, k));
              }
              U.set(k, k, 1 + U.get(k, k));
              for (let i = 0; i < k - 1; i++) {
                U.set(i, k, 0);
              }
            } else {
              for (let i = 0; i < m; i++) {
                U.set(i, k, 0);
              }
              U.set(k, k, 1);
            }
          }
        }
        if (wantv) {
          for (let k = n - 1; k >= 0; k--) {
            if (k < nrt && e[k] !== 0) {
              for (let j = k + 1; j < n; j++) {
                let t = 0;
                for (let i = k + 1; i < n; i++) {
                  t += V.get(i, k) * V.get(i, j);
                }
                t = -t / V.get(k + 1, k);
                for (let i = k + 1; i < n; i++) {
                  V.set(i, j, V.get(i, j) + t * V.get(i, k));
                }
              }
            }
            for (let i = 0; i < n; i++) {
              V.set(i, k, 0);
            }
            V.set(k, k, 1);
          }
        }
        let pp = p - 1;
        let eps = Number.EPSILON;
        while (p > 0) {
          let k, kase;
          for (k = p - 2; k >= -1; k--) {
            if (k === -1) {
              break;
            }
            const alpha = Number.MIN_VALUE + eps * Math.abs(s[k] + Math.abs(s[k + 1]));
            if (Math.abs(e[k]) <= alpha || Number.isNaN(e[k])) {
              e[k] = 0;
              break;
            }
          }
          if (k === p - 2) {
            kase = 4;
          } else {
            let ks;
            for (ks = p - 1; ks >= k; ks--) {
              if (ks === k) {
                break;
              }
              let t = (ks !== p ? Math.abs(e[ks]) : 0) + (ks !== k + 1 ? Math.abs(e[ks - 1]) : 0);
              if (Math.abs(s[ks]) <= eps * t) {
                s[ks] = 0;
                break;
              }
            }
            if (ks === k) {
              kase = 3;
            } else if (ks === p - 1) {
              kase = 1;
            } else {
              kase = 2;
              k = ks;
            }
          }
          k++;
          switch (kase) {
            case 1: {
              let f = e[p - 2];
              e[p - 2] = 0;
              for (let j = p - 2; j >= k; j--) {
                let t = hypotenuse(s[j], f);
                let cs = s[j] / t;
                let sn = f / t;
                s[j] = t;
                if (j !== k) {
                  f = -sn * e[j - 1];
                  e[j - 1] = cs * e[j - 1];
                }
                if (wantv) {
                  for (let i = 0; i < n; i++) {
                    t = cs * V.get(i, j) + sn * V.get(i, p - 1);
                    V.set(i, p - 1, -sn * V.get(i, j) + cs * V.get(i, p - 1));
                    V.set(i, j, t);
                  }
                }
              }
              break;
            }
            case 2: {
              let f = e[k - 1];
              e[k - 1] = 0;
              for (let j = k; j < p; j++) {
                let t = hypotenuse(s[j], f);
                let cs = s[j] / t;
                let sn = f / t;
                s[j] = t;
                f = -sn * e[j];
                e[j] = cs * e[j];
                if (wantu) {
                  for (let i = 0; i < m; i++) {
                    t = cs * U.get(i, j) + sn * U.get(i, k - 1);
                    U.set(i, k - 1, -sn * U.get(i, j) + cs * U.get(i, k - 1));
                    U.set(i, j, t);
                  }
                }
              }
              break;
            }
            case 3: {
              const scale = Math.max(
                Math.abs(s[p - 1]),
                Math.abs(s[p - 2]),
                Math.abs(e[p - 2]),
                Math.abs(s[k]),
                Math.abs(e[k])
              );
              const sp = s[p - 1] / scale;
              const spm1 = s[p - 2] / scale;
              const epm1 = e[p - 2] / scale;
              const sk = s[k] / scale;
              const ek = e[k] / scale;
              const b = ((spm1 + sp) * (spm1 - sp) + epm1 * epm1) / 2;
              const c = sp * epm1 * (sp * epm1);
              let shift = 0;
              if (b !== 0 || c !== 0) {
                if (b < 0) {
                  shift = 0 - Math.sqrt(b * b + c);
                } else {
                  shift = Math.sqrt(b * b + c);
                }
                shift = c / (b + shift);
              }
              let f = (sk + sp) * (sk - sp) + shift;
              let g = sk * ek;
              for (let j = k; j < p - 1; j++) {
                let t = hypotenuse(f, g);
                if (t === 0) t = Number.MIN_VALUE;
                let cs = f / t;
                let sn = g / t;
                if (j !== k) {
                  e[j - 1] = t;
                }
                f = cs * s[j] + sn * e[j];
                e[j] = cs * e[j] - sn * s[j];
                g = sn * s[j + 1];
                s[j + 1] = cs * s[j + 1];
                if (wantv) {
                  for (let i = 0; i < n; i++) {
                    t = cs * V.get(i, j) + sn * V.get(i, j + 1);
                    V.set(i, j + 1, -sn * V.get(i, j) + cs * V.get(i, j + 1));
                    V.set(i, j, t);
                  }
                }
                t = hypotenuse(f, g);
                if (t === 0) t = Number.MIN_VALUE;
                cs = f / t;
                sn = g / t;
                s[j] = t;
                f = cs * e[j] + sn * s[j + 1];
                s[j + 1] = -sn * e[j] + cs * s[j + 1];
                g = sn * e[j + 1];
                e[j + 1] = cs * e[j + 1];
                if (wantu && j < m - 1) {
                  for (let i = 0; i < m; i++) {
                    t = cs * U.get(i, j) + sn * U.get(i, j + 1);
                    U.set(i, j + 1, -sn * U.get(i, j) + cs * U.get(i, j + 1));
                    U.set(i, j, t);
                  }
                }
              }
              e[p - 2] = f;
              break;
            }
            case 4: {
              if (s[k] <= 0) {
                s[k] = s[k] < 0 ? -s[k] : 0;
                if (wantv) {
                  for (let i = 0; i <= pp; i++) {
                    V.set(i, k, -V.get(i, k));
                  }
                }
              }
              while (k < pp) {
                if (s[k] >= s[k + 1]) {
                  break;
                }
                let t = s[k];
                s[k] = s[k + 1];
                s[k + 1] = t;
                if (wantv && k < n - 1) {
                  for (let i = 0; i < n; i++) {
                    t = V.get(i, k + 1);
                    V.set(i, k + 1, V.get(i, k));
                    V.set(i, k, t);
                  }
                }
                if (wantu && k < m - 1) {
                  for (let i = 0; i < m; i++) {
                    t = U.get(i, k + 1);
                    U.set(i, k + 1, U.get(i, k));
                    U.set(i, k, t);
                  }
                }
                k++;
              }
              p--;
              break;
            }
          }
        }
        if (swapped) {
          let tmp = V;
          V = U;
          U = tmp;
        }
        this.m = m;
        this.n = n;
        this.s = s;
        this.U = U;
        this.V = V;
      }
      solve(value) {
        let Y = value;
        let e = this.threshold;
        let scols = this.s.length;
        let Ls = Matrix3.zeros(scols, scols);
        for (let i = 0; i < scols; i++) {
          if (Math.abs(this.s[i]) <= e) {
            Ls.set(i, i, 0);
          } else {
            Ls.set(i, i, 1 / this.s[i]);
          }
        }
        let U = this.U;
        let V = this.rightSingularVectors;
        let VL = V.mmul(Ls);
        let vrows = V.rows;
        let urows = U.rows;
        let VLU = Matrix3.zeros(vrows, urows);
        for (let i = 0; i < vrows; i++) {
          for (let j = 0; j < urows; j++) {
            let sum = 0;
            for (let k = 0; k < scols; k++) {
              sum += VL.get(i, k) * U.get(j, k);
            }
            VLU.set(i, j, sum);
          }
        }
        return VLU.mmul(Y);
      }
      solveForDiagonal(value) {
        return this.solve(Matrix3.diag(value));
      }
      inverse() {
        let V = this.V;
        let e = this.threshold;
        let vrows = V.rows;
        let vcols = V.columns;
        let X = new Matrix3(vrows, this.s.length);
        for (let i = 0; i < vrows; i++) {
          for (let j = 0; j < vcols; j++) {
            if (Math.abs(this.s[j]) > e) {
              X.set(i, j, V.get(i, j) / this.s[j]);
            }
          }
        }
        let U = this.U;
        let urows = U.rows;
        let ucols = U.columns;
        let Y = new Matrix3(vrows, urows);
        for (let i = 0; i < vrows; i++) {
          for (let j = 0; j < urows; j++) {
            let sum = 0;
            for (let k = 0; k < ucols; k++) {
              sum += X.get(i, k) * U.get(j, k);
            }
            Y.set(i, j, sum);
          }
        }
        return Y;
      }
      get condition() {
        return this.s[0] / this.s[Math.min(this.m, this.n) - 1];
      }
      get norm2() {
        return this.s[0];
      }
      get rank() {
        let tol = Math.max(this.m, this.n) * this.s[0] * Number.EPSILON;
        let r = 0;
        let s = this.s;
        for (let i = 0, ii = s.length; i < ii; i++) {
          if (s[i] > tol) {
            r++;
          }
        }
        return r;
      }
      get diagonal() {
        return Array.from(this.s);
      }
      get threshold() {
        return Number.EPSILON / 2 * Math.max(this.m, this.n) * this.s[0];
      }
      get leftSingularVectors() {
        return this.U;
      }
      get rightSingularVectors() {
        return this.V;
      }
      get diagonalMatrix() {
        return Matrix3.diag(this.s);
      }
    };
    function inverse3(matrix2, useSVD = false) {
      matrix2 = WrapperMatrix2D2.checkMatrix(matrix2);
      if (useSVD) {
        return new SingularValueDecomposition3(matrix2).inverse();
      } else {
        return solve2(matrix2, Matrix3.eye(matrix2.rows));
      }
    }
    function solve2(leftHandSide, rightHandSide, useSVD = false) {
      leftHandSide = WrapperMatrix2D2.checkMatrix(leftHandSide);
      rightHandSide = WrapperMatrix2D2.checkMatrix(rightHandSide);
      if (useSVD) {
        return new SingularValueDecomposition3(leftHandSide).solve(rightHandSide);
      } else {
        return leftHandSide.isSquare() ? new LuDecomposition2(leftHandSide).solve(rightHandSide) : new QrDecomposition2(leftHandSide).solve(rightHandSide);
      }
    }
    function determinant3(matrix2) {
      matrix2 = Matrix3.checkMatrix(matrix2);
      if (matrix2.isSquare()) {
        if (matrix2.columns === 0) {
          return 1;
        }
        let a, b, c, d;
        if (matrix2.columns === 2) {
          a = matrix2.get(0, 0);
          b = matrix2.get(0, 1);
          c = matrix2.get(1, 0);
          d = matrix2.get(1, 1);
          return a * d - b * c;
        } else if (matrix2.columns === 3) {
          let subMatrix0, subMatrix1, subMatrix2;
          subMatrix0 = new MatrixSelectionView2(matrix2, [1, 2], [1, 2]);
          subMatrix1 = new MatrixSelectionView2(matrix2, [1, 2], [0, 2]);
          subMatrix2 = new MatrixSelectionView2(matrix2, [1, 2], [0, 1]);
          a = matrix2.get(0, 0);
          b = matrix2.get(0, 1);
          c = matrix2.get(0, 2);
          return a * determinant3(subMatrix0) - b * determinant3(subMatrix1) + c * determinant3(subMatrix2);
        } else {
          return new LuDecomposition2(matrix2).determinant;
        }
      } else {
        throw Error("determinant can only be calculated for a square matrix");
      }
    }
    function xrange(n, exception) {
      let range = [];
      for (let i = 0; i < n; i++) {
        if (i !== exception) {
          range.push(i);
        }
      }
      return range;
    }
    function dependenciesOneRow(error, matrix2, index, thresholdValue = 1e-9, thresholdError = 1e-9) {
      if (error > thresholdError) {
        return new Array(matrix2.rows + 1).fill(0);
      } else {
        let returnArray = matrix2.addRow(index, [0]);
        for (let i = 0; i < returnArray.rows; i++) {
          if (Math.abs(returnArray.get(i, 0)) < thresholdValue) {
            returnArray.set(i, 0, 0);
          }
        }
        return returnArray.to1DArray();
      }
    }
    function linearDependencies2(matrix2, options = {}) {
      const { thresholdValue = 1e-9, thresholdError = 1e-9 } = options;
      matrix2 = Matrix3.checkMatrix(matrix2);
      let n = matrix2.rows;
      let results = new Matrix3(n, n);
      for (let i = 0; i < n; i++) {
        let b = Matrix3.columnVector(matrix2.getRow(i));
        let Abis = matrix2.subMatrixRow(xrange(n, i)).transpose();
        let svd = new SingularValueDecomposition3(Abis);
        let x = svd.solve(b);
        let error = Matrix3.sub(b, Abis.mmul(x)).abs().max();
        results.setRow(
          i,
          dependenciesOneRow(error, x, i, thresholdValue, thresholdError)
        );
      }
      return results;
    }
    function pseudoInverse2(matrix2, threshold = Number.EPSILON) {
      matrix2 = Matrix3.checkMatrix(matrix2);
      if (matrix2.isEmpty()) {
        return matrix2.transpose();
      }
      let svdSolution = new SingularValueDecomposition3(matrix2, { autoTranspose: true });
      let U = svdSolution.leftSingularVectors;
      let V = svdSolution.rightSingularVectors;
      let s = svdSolution.diagonal;
      for (let i = 0; i < s.length; i++) {
        if (Math.abs(s[i]) > threshold) {
          s[i] = 1 / s[i];
        } else {
          s[i] = 0;
        }
      }
      return V.mmul(Matrix3.diag(s).mmul(U.transpose()));
    }
    function covariance2(xMatrix, yMatrix = xMatrix, options = {}) {
      xMatrix = new Matrix3(xMatrix);
      let yIsSame = false;
      if (typeof yMatrix === "object" && !Matrix3.isMatrix(yMatrix) && !isAnyArray.isAnyArray(yMatrix)) {
        options = yMatrix;
        yMatrix = xMatrix;
        yIsSame = true;
      } else {
        yMatrix = new Matrix3(yMatrix);
      }
      if (xMatrix.rows !== yMatrix.rows) {
        throw new TypeError("Both matrices must have the same number of rows");
      }
      const { center = true } = options;
      if (center) {
        xMatrix = xMatrix.center("column");
        if (!yIsSame) {
          yMatrix = yMatrix.center("column");
        }
      }
      const cov = xMatrix.transpose().mmul(yMatrix);
      for (let i = 0; i < cov.rows; i++) {
        for (let j = 0; j < cov.columns; j++) {
          cov.set(i, j, cov.get(i, j) * (1 / (xMatrix.rows - 1)));
        }
      }
      return cov;
    }
    function correlation2(xMatrix, yMatrix = xMatrix, options = {}) {
      xMatrix = new Matrix3(xMatrix);
      let yIsSame = false;
      if (typeof yMatrix === "object" && !Matrix3.isMatrix(yMatrix) && !isAnyArray.isAnyArray(yMatrix)) {
        options = yMatrix;
        yMatrix = xMatrix;
        yIsSame = true;
      } else {
        yMatrix = new Matrix3(yMatrix);
      }
      if (xMatrix.rows !== yMatrix.rows) {
        throw new TypeError("Both matrices must have the same number of rows");
      }
      const { center = true, scale = true } = options;
      if (center) {
        xMatrix.center("column");
        if (!yIsSame) {
          yMatrix.center("column");
        }
      }
      if (scale) {
        xMatrix.scale("column");
        if (!yIsSame) {
          yMatrix.scale("column");
        }
      }
      const sdx = xMatrix.standardDeviation("column", { unbiased: true });
      const sdy = yIsSame ? sdx : yMatrix.standardDeviation("column", { unbiased: true });
      const corr = xMatrix.transpose().mmul(yMatrix);
      for (let i = 0; i < corr.rows; i++) {
        for (let j = 0; j < corr.columns; j++) {
          corr.set(
            i,
            j,
            corr.get(i, j) * (1 / (sdx[i] * sdy[j])) * (1 / (xMatrix.rows - 1))
          );
        }
      }
      return corr;
    }
    var EigenvalueDecomposition2 = class {
      constructor(matrix2, options = {}) {
        const { assumeSymmetric = false } = options;
        matrix2 = WrapperMatrix2D2.checkMatrix(matrix2);
        if (!matrix2.isSquare()) {
          throw new Error("Matrix is not a square matrix");
        }
        if (matrix2.isEmpty()) {
          throw new Error("Matrix must be non-empty");
        }
        let n = matrix2.columns;
        let V = new Matrix3(n, n);
        let d = new Float64Array(n);
        let e = new Float64Array(n);
        let value = matrix2;
        let i, j;
        let isSymmetric = false;
        if (assumeSymmetric) {
          isSymmetric = true;
        } else {
          isSymmetric = matrix2.isSymmetric();
        }
        if (isSymmetric) {
          for (i = 0; i < n; i++) {
            for (j = 0; j < n; j++) {
              V.set(i, j, value.get(i, j));
            }
          }
          tred2(n, e, d, V);
          tql2(n, e, d, V);
        } else {
          let H = new Matrix3(n, n);
          let ort = new Float64Array(n);
          for (j = 0; j < n; j++) {
            for (i = 0; i < n; i++) {
              H.set(i, j, value.get(i, j));
            }
          }
          orthes(n, H, ort, V);
          hqr2(n, e, d, V, H);
        }
        this.n = n;
        this.e = e;
        this.d = d;
        this.V = V;
      }
      get realEigenvalues() {
        return Array.from(this.d);
      }
      get imaginaryEigenvalues() {
        return Array.from(this.e);
      }
      get eigenvectorMatrix() {
        return this.V;
      }
      get diagonalMatrix() {
        let n = this.n;
        let e = this.e;
        let d = this.d;
        let X = new Matrix3(n, n);
        let i, j;
        for (i = 0; i < n; i++) {
          for (j = 0; j < n; j++) {
            X.set(i, j, 0);
          }
          X.set(i, i, d[i]);
          if (e[i] > 0) {
            X.set(i, i + 1, e[i]);
          } else if (e[i] < 0) {
            X.set(i, i - 1, e[i]);
          }
        }
        return X;
      }
    };
    function tred2(n, e, d, V) {
      let f, g, h, i, j, k, hh, scale;
      for (j = 0; j < n; j++) {
        d[j] = V.get(n - 1, j);
      }
      for (i = n - 1; i > 0; i--) {
        scale = 0;
        h = 0;
        for (k = 0; k < i; k++) {
          scale = scale + Math.abs(d[k]);
        }
        if (scale === 0) {
          e[i] = d[i - 1];
          for (j = 0; j < i; j++) {
            d[j] = V.get(i - 1, j);
            V.set(i, j, 0);
            V.set(j, i, 0);
          }
        } else {
          for (k = 0; k < i; k++) {
            d[k] /= scale;
            h += d[k] * d[k];
          }
          f = d[i - 1];
          g = Math.sqrt(h);
          if (f > 0) {
            g = -g;
          }
          e[i] = scale * g;
          h = h - f * g;
          d[i - 1] = f - g;
          for (j = 0; j < i; j++) {
            e[j] = 0;
          }
          for (j = 0; j < i; j++) {
            f = d[j];
            V.set(j, i, f);
            g = e[j] + V.get(j, j) * f;
            for (k = j + 1; k <= i - 1; k++) {
              g += V.get(k, j) * d[k];
              e[k] += V.get(k, j) * f;
            }
            e[j] = g;
          }
          f = 0;
          for (j = 0; j < i; j++) {
            e[j] /= h;
            f += e[j] * d[j];
          }
          hh = f / (h + h);
          for (j = 0; j < i; j++) {
            e[j] -= hh * d[j];
          }
          for (j = 0; j < i; j++) {
            f = d[j];
            g = e[j];
            for (k = j; k <= i - 1; k++) {
              V.set(k, j, V.get(k, j) - (f * e[k] + g * d[k]));
            }
            d[j] = V.get(i - 1, j);
            V.set(i, j, 0);
          }
        }
        d[i] = h;
      }
      for (i = 0; i < n - 1; i++) {
        V.set(n - 1, i, V.get(i, i));
        V.set(i, i, 1);
        h = d[i + 1];
        if (h !== 0) {
          for (k = 0; k <= i; k++) {
            d[k] = V.get(k, i + 1) / h;
          }
          for (j = 0; j <= i; j++) {
            g = 0;
            for (k = 0; k <= i; k++) {
              g += V.get(k, i + 1) * V.get(k, j);
            }
            for (k = 0; k <= i; k++) {
              V.set(k, j, V.get(k, j) - g * d[k]);
            }
          }
        }
        for (k = 0; k <= i; k++) {
          V.set(k, i + 1, 0);
        }
      }
      for (j = 0; j < n; j++) {
        d[j] = V.get(n - 1, j);
        V.set(n - 1, j, 0);
      }
      V.set(n - 1, n - 1, 1);
      e[0] = 0;
    }
    function tql2(n, e, d, V) {
      let g, h, i, j, k, l, m, p, r, dl1, c, c2, c3, el1, s, s2;
      for (i = 1; i < n; i++) {
        e[i - 1] = e[i];
      }
      e[n - 1] = 0;
      let f = 0;
      let tst1 = 0;
      let eps = Number.EPSILON;
      for (l = 0; l < n; l++) {
        tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
        m = l;
        while (m < n) {
          if (Math.abs(e[m]) <= eps * tst1) {
            break;
          }
          m++;
        }
        if (m > l) {
          do {
            g = d[l];
            p = (d[l + 1] - g) / (2 * e[l]);
            r = hypotenuse(p, 1);
            if (p < 0) {
              r = -r;
            }
            d[l] = e[l] / (p + r);
            d[l + 1] = e[l] * (p + r);
            dl1 = d[l + 1];
            h = g - d[l];
            for (i = l + 2; i < n; i++) {
              d[i] -= h;
            }
            f = f + h;
            p = d[m];
            c = 1;
            c2 = c;
            c3 = c;
            el1 = e[l + 1];
            s = 0;
            s2 = 0;
            for (i = m - 1; i >= l; i--) {
              c3 = c2;
              c2 = c;
              s2 = s;
              g = c * e[i];
              h = c * p;
              r = hypotenuse(p, e[i]);
              e[i + 1] = s * r;
              s = e[i] / r;
              c = p / r;
              p = c * d[i] - s * g;
              d[i + 1] = h + s * (c * g + s * d[i]);
              for (k = 0; k < n; k++) {
                h = V.get(k, i + 1);
                V.set(k, i + 1, s * V.get(k, i) + c * h);
                V.set(k, i, c * V.get(k, i) - s * h);
              }
            }
            p = -s * s2 * c3 * el1 * e[l] / dl1;
            e[l] = s * p;
            d[l] = c * p;
          } while (Math.abs(e[l]) > eps * tst1);
        }
        d[l] = d[l] + f;
        e[l] = 0;
      }
      for (i = 0; i < n - 1; i++) {
        k = i;
        p = d[i];
        for (j = i + 1; j < n; j++) {
          if (d[j] < p) {
            k = j;
            p = d[j];
          }
        }
        if (k !== i) {
          d[k] = d[i];
          d[i] = p;
          for (j = 0; j < n; j++) {
            p = V.get(j, i);
            V.set(j, i, V.get(j, k));
            V.set(j, k, p);
          }
        }
      }
    }
    function orthes(n, H, ort, V) {
      let low = 0;
      let high = n - 1;
      let f, g, h, i, j, m;
      let scale;
      for (m = low + 1; m <= high - 1; m++) {
        scale = 0;
        for (i = m; i <= high; i++) {
          scale = scale + Math.abs(H.get(i, m - 1));
        }
        if (scale !== 0) {
          h = 0;
          for (i = high; i >= m; i--) {
            ort[i] = H.get(i, m - 1) / scale;
            h += ort[i] * ort[i];
          }
          g = Math.sqrt(h);
          if (ort[m] > 0) {
            g = -g;
          }
          h = h - ort[m] * g;
          ort[m] = ort[m] - g;
          for (j = m; j < n; j++) {
            f = 0;
            for (i = high; i >= m; i--) {
              f += ort[i] * H.get(i, j);
            }
            f = f / h;
            for (i = m; i <= high; i++) {
              H.set(i, j, H.get(i, j) - f * ort[i]);
            }
          }
          for (i = 0; i <= high; i++) {
            f = 0;
            for (j = high; j >= m; j--) {
              f += ort[j] * H.get(i, j);
            }
            f = f / h;
            for (j = m; j <= high; j++) {
              H.set(i, j, H.get(i, j) - f * ort[j]);
            }
          }
          ort[m] = scale * ort[m];
          H.set(m, m - 1, scale * g);
        }
      }
      for (i = 0; i < n; i++) {
        for (j = 0; j < n; j++) {
          V.set(i, j, i === j ? 1 : 0);
        }
      }
      for (m = high - 1; m >= low + 1; m--) {
        if (H.get(m, m - 1) !== 0) {
          for (i = m + 1; i <= high; i++) {
            ort[i] = H.get(i, m - 1);
          }
          for (j = m; j <= high; j++) {
            g = 0;
            for (i = m; i <= high; i++) {
              g += ort[i] * V.get(i, j);
            }
            g = g / ort[m] / H.get(m, m - 1);
            for (i = m; i <= high; i++) {
              V.set(i, j, V.get(i, j) + g * ort[i]);
            }
          }
        }
      }
    }
    function hqr2(nn, e, d, V, H) {
      let n = nn - 1;
      let low = 0;
      let high = nn - 1;
      let eps = Number.EPSILON;
      let exshift = 0;
      let norm = 0;
      let p = 0;
      let q = 0;
      let r = 0;
      let s = 0;
      let z = 0;
      let iter = 0;
      let i, j, k, l, m, t, w, x, y;
      let ra, sa, vr, vi;
      let notlast, cdivres;
      for (i = 0; i < nn; i++) {
        if (i < low || i > high) {
          d[i] = H.get(i, i);
          e[i] = 0;
        }
        for (j = Math.max(i - 1, 0); j < nn; j++) {
          norm = norm + Math.abs(H.get(i, j));
        }
      }
      while (n >= low) {
        l = n;
        while (l > low) {
          s = Math.abs(H.get(l - 1, l - 1)) + Math.abs(H.get(l, l));
          if (s === 0) {
            s = norm;
          }
          if (Math.abs(H.get(l, l - 1)) < eps * s) {
            break;
          }
          l--;
        }
        if (l === n) {
          H.set(n, n, H.get(n, n) + exshift);
          d[n] = H.get(n, n);
          e[n] = 0;
          n--;
          iter = 0;
        } else if (l === n - 1) {
          w = H.get(n, n - 1) * H.get(n - 1, n);
          p = (H.get(n - 1, n - 1) - H.get(n, n)) / 2;
          q = p * p + w;
          z = Math.sqrt(Math.abs(q));
          H.set(n, n, H.get(n, n) + exshift);
          H.set(n - 1, n - 1, H.get(n - 1, n - 1) + exshift);
          x = H.get(n, n);
          if (q >= 0) {
            z = p >= 0 ? p + z : p - z;
            d[n - 1] = x + z;
            d[n] = d[n - 1];
            if (z !== 0) {
              d[n] = x - w / z;
            }
            e[n - 1] = 0;
            e[n] = 0;
            x = H.get(n, n - 1);
            s = Math.abs(x) + Math.abs(z);
            p = x / s;
            q = z / s;
            r = Math.sqrt(p * p + q * q);
            p = p / r;
            q = q / r;
            for (j = n - 1; j < nn; j++) {
              z = H.get(n - 1, j);
              H.set(n - 1, j, q * z + p * H.get(n, j));
              H.set(n, j, q * H.get(n, j) - p * z);
            }
            for (i = 0; i <= n; i++) {
              z = H.get(i, n - 1);
              H.set(i, n - 1, q * z + p * H.get(i, n));
              H.set(i, n, q * H.get(i, n) - p * z);
            }
            for (i = low; i <= high; i++) {
              z = V.get(i, n - 1);
              V.set(i, n - 1, q * z + p * V.get(i, n));
              V.set(i, n, q * V.get(i, n) - p * z);
            }
          } else {
            d[n - 1] = x + p;
            d[n] = x + p;
            e[n - 1] = z;
            e[n] = -z;
          }
          n = n - 2;
          iter = 0;
        } else {
          x = H.get(n, n);
          y = 0;
          w = 0;
          if (l < n) {
            y = H.get(n - 1, n - 1);
            w = H.get(n, n - 1) * H.get(n - 1, n);
          }
          if (iter === 10) {
            exshift += x;
            for (i = low; i <= n; i++) {
              H.set(i, i, H.get(i, i) - x);
            }
            s = Math.abs(H.get(n, n - 1)) + Math.abs(H.get(n - 1, n - 2));
            x = y = 0.75 * s;
            w = -0.4375 * s * s;
          }
          if (iter === 30) {
            s = (y - x) / 2;
            s = s * s + w;
            if (s > 0) {
              s = Math.sqrt(s);
              if (y < x) {
                s = -s;
              }
              s = x - w / ((y - x) / 2 + s);
              for (i = low; i <= n; i++) {
                H.set(i, i, H.get(i, i) - s);
              }
              exshift += s;
              x = y = w = 0.964;
            }
          }
          iter = iter + 1;
          m = n - 2;
          while (m >= l) {
            z = H.get(m, m);
            r = x - z;
            s = y - z;
            p = (r * s - w) / H.get(m + 1, m) + H.get(m, m + 1);
            q = H.get(m + 1, m + 1) - z - r - s;
            r = H.get(m + 2, m + 1);
            s = Math.abs(p) + Math.abs(q) + Math.abs(r);
            p = p / s;
            q = q / s;
            r = r / s;
            if (m === l) {
              break;
            }
            if (Math.abs(H.get(m, m - 1)) * (Math.abs(q) + Math.abs(r)) < eps * (Math.abs(p) * (Math.abs(H.get(m - 1, m - 1)) + Math.abs(z) + Math.abs(H.get(m + 1, m + 1))))) {
              break;
            }
            m--;
          }
          for (i = m + 2; i <= n; i++) {
            H.set(i, i - 2, 0);
            if (i > m + 2) {
              H.set(i, i - 3, 0);
            }
          }
          for (k = m; k <= n - 1; k++) {
            notlast = k !== n - 1;
            if (k !== m) {
              p = H.get(k, k - 1);
              q = H.get(k + 1, k - 1);
              r = notlast ? H.get(k + 2, k - 1) : 0;
              x = Math.abs(p) + Math.abs(q) + Math.abs(r);
              if (x !== 0) {
                p = p / x;
                q = q / x;
                r = r / x;
              }
            }
            if (x === 0) {
              break;
            }
            s = Math.sqrt(p * p + q * q + r * r);
            if (p < 0) {
              s = -s;
            }
            if (s !== 0) {
              if (k !== m) {
                H.set(k, k - 1, -s * x);
              } else if (l !== m) {
                H.set(k, k - 1, -H.get(k, k - 1));
              }
              p = p + s;
              x = p / s;
              y = q / s;
              z = r / s;
              q = q / p;
              r = r / p;
              for (j = k; j < nn; j++) {
                p = H.get(k, j) + q * H.get(k + 1, j);
                if (notlast) {
                  p = p + r * H.get(k + 2, j);
                  H.set(k + 2, j, H.get(k + 2, j) - p * z);
                }
                H.set(k, j, H.get(k, j) - p * x);
                H.set(k + 1, j, H.get(k + 1, j) - p * y);
              }
              for (i = 0; i <= Math.min(n, k + 3); i++) {
                p = x * H.get(i, k) + y * H.get(i, k + 1);
                if (notlast) {
                  p = p + z * H.get(i, k + 2);
                  H.set(i, k + 2, H.get(i, k + 2) - p * r);
                }
                H.set(i, k, H.get(i, k) - p);
                H.set(i, k + 1, H.get(i, k + 1) - p * q);
              }
              for (i = low; i <= high; i++) {
                p = x * V.get(i, k) + y * V.get(i, k + 1);
                if (notlast) {
                  p = p + z * V.get(i, k + 2);
                  V.set(i, k + 2, V.get(i, k + 2) - p * r);
                }
                V.set(i, k, V.get(i, k) - p);
                V.set(i, k + 1, V.get(i, k + 1) - p * q);
              }
            }
          }
        }
      }
      if (norm === 0) {
        return;
      }
      for (n = nn - 1; n >= 0; n--) {
        p = d[n];
        q = e[n];
        if (q === 0) {
          l = n;
          H.set(n, n, 1);
          for (i = n - 1; i >= 0; i--) {
            w = H.get(i, i) - p;
            r = 0;
            for (j = l; j <= n; j++) {
              r = r + H.get(i, j) * H.get(j, n);
            }
            if (e[i] < 0) {
              z = w;
              s = r;
            } else {
              l = i;
              if (e[i] === 0) {
                H.set(i, n, w !== 0 ? -r / w : -r / (eps * norm));
              } else {
                x = H.get(i, i + 1);
                y = H.get(i + 1, i);
                q = (d[i] - p) * (d[i] - p) + e[i] * e[i];
                t = (x * s - z * r) / q;
                H.set(i, n, t);
                H.set(
                  i + 1,
                  n,
                  Math.abs(x) > Math.abs(z) ? (-r - w * t) / x : (-s - y * t) / z
                );
              }
              t = Math.abs(H.get(i, n));
              if (eps * t * t > 1) {
                for (j = i; j <= n; j++) {
                  H.set(j, n, H.get(j, n) / t);
                }
              }
            }
          }
        } else if (q < 0) {
          l = n - 1;
          if (Math.abs(H.get(n, n - 1)) > Math.abs(H.get(n - 1, n))) {
            H.set(n - 1, n - 1, q / H.get(n, n - 1));
            H.set(n - 1, n, -(H.get(n, n) - p) / H.get(n, n - 1));
          } else {
            cdivres = cdiv(0, -H.get(n - 1, n), H.get(n - 1, n - 1) - p, q);
            H.set(n - 1, n - 1, cdivres[0]);
            H.set(n - 1, n, cdivres[1]);
          }
          H.set(n, n - 1, 0);
          H.set(n, n, 1);
          for (i = n - 2; i >= 0; i--) {
            ra = 0;
            sa = 0;
            for (j = l; j <= n; j++) {
              ra = ra + H.get(i, j) * H.get(j, n - 1);
              sa = sa + H.get(i, j) * H.get(j, n);
            }
            w = H.get(i, i) - p;
            if (e[i] < 0) {
              z = w;
              r = ra;
              s = sa;
            } else {
              l = i;
              if (e[i] === 0) {
                cdivres = cdiv(-ra, -sa, w, q);
                H.set(i, n - 1, cdivres[0]);
                H.set(i, n, cdivres[1]);
              } else {
                x = H.get(i, i + 1);
                y = H.get(i + 1, i);
                vr = (d[i] - p) * (d[i] - p) + e[i] * e[i] - q * q;
                vi = (d[i] - p) * 2 * q;
                if (vr === 0 && vi === 0) {
                  vr = eps * norm * (Math.abs(w) + Math.abs(q) + Math.abs(x) + Math.abs(y) + Math.abs(z));
                }
                cdivres = cdiv(
                  x * r - z * ra + q * sa,
                  x * s - z * sa - q * ra,
                  vr,
                  vi
                );
                H.set(i, n - 1, cdivres[0]);
                H.set(i, n, cdivres[1]);
                if (Math.abs(x) > Math.abs(z) + Math.abs(q)) {
                  H.set(
                    i + 1,
                    n - 1,
                    (-ra - w * H.get(i, n - 1) + q * H.get(i, n)) / x
                  );
                  H.set(
                    i + 1,
                    n,
                    (-sa - w * H.get(i, n) - q * H.get(i, n - 1)) / x
                  );
                } else {
                  cdivres = cdiv(
                    -r - y * H.get(i, n - 1),
                    -s - y * H.get(i, n),
                    z,
                    q
                  );
                  H.set(i + 1, n - 1, cdivres[0]);
                  H.set(i + 1, n, cdivres[1]);
                }
              }
              t = Math.max(Math.abs(H.get(i, n - 1)), Math.abs(H.get(i, n)));
              if (eps * t * t > 1) {
                for (j = i; j <= n; j++) {
                  H.set(j, n - 1, H.get(j, n - 1) / t);
                  H.set(j, n, H.get(j, n) / t);
                }
              }
            }
          }
        }
      }
      for (i = 0; i < nn; i++) {
        if (i < low || i > high) {
          for (j = i; j < nn; j++) {
            V.set(i, j, H.get(i, j));
          }
        }
      }
      for (j = nn - 1; j >= low; j--) {
        for (i = low; i <= high; i++) {
          z = 0;
          for (k = low; k <= Math.min(j, high); k++) {
            z = z + V.get(i, k) * H.get(k, j);
          }
          V.set(i, j, z);
        }
      }
    }
    function cdiv(xr, xi, yr, yi) {
      let r, d;
      if (Math.abs(yr) > Math.abs(yi)) {
        r = yi / yr;
        d = yr + r * yi;
        return [(xr + r * xi) / d, (xi - r * xr) / d];
      } else {
        r = yr / yi;
        d = yi + r * yr;
        return [(r * xr + xi) / d, (r * xi - xr) / d];
      }
    }
    var CholeskyDecomposition2 = class {
      constructor(value) {
        value = WrapperMatrix2D2.checkMatrix(value);
        if (!value.isSymmetric()) {
          throw new Error("Matrix is not symmetric");
        }
        let a = value;
        let dimension = a.rows;
        let l = new Matrix3(dimension, dimension);
        let positiveDefinite = true;
        let i, j, k;
        for (j = 0; j < dimension; j++) {
          let d = 0;
          for (k = 0; k < j; k++) {
            let s = 0;
            for (i = 0; i < k; i++) {
              s += l.get(k, i) * l.get(j, i);
            }
            s = (a.get(j, k) - s) / l.get(k, k);
            l.set(j, k, s);
            d = d + s * s;
          }
          d = a.get(j, j) - d;
          positiveDefinite &&= d > 0;
          l.set(j, j, Math.sqrt(Math.max(d, 0)));
          for (k = j + 1; k < dimension; k++) {
            l.set(j, k, 0);
          }
        }
        this.L = l;
        this.positiveDefinite = positiveDefinite;
      }
      isPositiveDefinite() {
        return this.positiveDefinite;
      }
      solve(value) {
        value = WrapperMatrix2D2.checkMatrix(value);
        let l = this.L;
        let dimension = l.rows;
        if (value.rows !== dimension) {
          throw new Error("Matrix dimensions do not match");
        }
        if (this.isPositiveDefinite() === false) {
          throw new Error("Matrix is not positive definite");
        }
        let count = value.columns;
        let B = value.clone();
        let i, j, k;
        for (k = 0; k < dimension; k++) {
          for (j = 0; j < count; j++) {
            for (i = 0; i < k; i++) {
              B.set(k, j, B.get(k, j) - B.get(i, j) * l.get(k, i));
            }
            B.set(k, j, B.get(k, j) / l.get(k, k));
          }
        }
        for (k = dimension - 1; k >= 0; k--) {
          for (j = 0; j < count; j++) {
            for (i = k + 1; i < dimension; i++) {
              B.set(k, j, B.get(k, j) - B.get(i, j) * l.get(i, k));
            }
            B.set(k, j, B.get(k, j) / l.get(k, k));
          }
        }
        return B;
      }
      get lowerTriangularMatrix() {
        return this.L;
      }
    };
    var nipals = class {
      constructor(X, options = {}) {
        X = WrapperMatrix2D2.checkMatrix(X);
        let { Y } = options;
        const {
          scaleScores = false,
          maxIterations = 1e3,
          terminationCriteria = 1e-10
        } = options;
        let u;
        if (Y) {
          if (isAnyArray.isAnyArray(Y) && typeof Y[0] === "number") {
            Y = Matrix3.columnVector(Y);
          } else {
            Y = WrapperMatrix2D2.checkMatrix(Y);
          }
          if (Y.rows !== X.rows) {
            throw new Error("Y should have the same number of rows as X");
          }
          u = Y.getColumnVector(0);
        } else {
          u = X.getColumnVector(0);
        }
        let diff = 1;
        let t, q, w, tOld;
        for (let counter = 0; counter < maxIterations && diff > terminationCriteria; counter++) {
          w = X.transpose().mmul(u).div(u.transpose().mmul(u).get(0, 0));
          w = w.div(w.norm());
          t = X.mmul(w).div(w.transpose().mmul(w).get(0, 0));
          if (counter > 0) {
            diff = t.clone().sub(tOld).pow(2).sum();
          }
          tOld = t.clone();
          if (Y) {
            q = Y.transpose().mmul(t).div(t.transpose().mmul(t).get(0, 0));
            q = q.div(q.norm());
            u = Y.mmul(q).div(q.transpose().mmul(q).get(0, 0));
          } else {
            u = t;
          }
        }
        if (Y) {
          let p = X.transpose().mmul(t).div(t.transpose().mmul(t).get(0, 0));
          p = p.div(p.norm());
          let xResidual = X.clone().sub(t.clone().mmul(p.transpose()));
          let residual = u.transpose().mmul(t).div(t.transpose().mmul(t).get(0, 0));
          let yResidual = Y.clone().sub(
            t.clone().mulS(residual.get(0, 0)).mmul(q.transpose())
          );
          this.t = t;
          this.p = p.transpose();
          this.w = w.transpose();
          this.q = q;
          this.u = u;
          this.s = t.transpose().mmul(t);
          this.xResidual = xResidual;
          this.yResidual = yResidual;
          this.betas = residual;
        } else {
          this.w = w.transpose();
          this.s = t.transpose().mmul(t).sqrt();
          if (scaleScores) {
            this.t = t.clone().div(this.s.get(0, 0));
          } else {
            this.t = t;
          }
          this.xResidual = X.sub(t.mmul(w.transpose()));
        }
      }
    };
    exports.AbstractMatrix = AbstractMatrix2;
    exports.CHO = CholeskyDecomposition2;
    exports.CholeskyDecomposition = CholeskyDecomposition2;
    exports.DistanceMatrix = DistanceMatrix2;
    exports.EVD = EigenvalueDecomposition2;
    exports.EigenvalueDecomposition = EigenvalueDecomposition2;
    exports.LU = LuDecomposition2;
    exports.LuDecomposition = LuDecomposition2;
    exports.Matrix = Matrix3;
    exports.MatrixColumnSelectionView = MatrixColumnSelectionView2;
    exports.MatrixColumnView = MatrixColumnView2;
    exports.MatrixFlipColumnView = MatrixFlipColumnView2;
    exports.MatrixFlipRowView = MatrixFlipRowView2;
    exports.MatrixRowSelectionView = MatrixRowSelectionView2;
    exports.MatrixRowView = MatrixRowView2;
    exports.MatrixSelectionView = MatrixSelectionView2;
    exports.MatrixSubView = MatrixSubView2;
    exports.MatrixTransposeView = MatrixTransposeView2;
    exports.NIPALS = nipals;
    exports.Nipals = nipals;
    exports.QR = QrDecomposition2;
    exports.QrDecomposition = QrDecomposition2;
    exports.SVD = SingularValueDecomposition3;
    exports.SingularValueDecomposition = SingularValueDecomposition3;
    exports.SymmetricMatrix = SymmetricMatrix2;
    exports.WrapperMatrix1D = WrapperMatrix1D2;
    exports.WrapperMatrix2D = WrapperMatrix2D2;
    exports.correlation = correlation2;
    exports.covariance = covariance2;
    exports.default = Matrix3;
    exports.determinant = determinant3;
    exports.inverse = inverse3;
    exports.linearDependencies = linearDependencies2;
    exports.pseudoInverse = pseudoInverse2;
    exports.solve = solve2;
    exports.wrap = wrap2;
  }
});

// node_modules/.pnpm/ml-matrix@6.12.1/node_modules/ml-matrix/matrix.mjs
var matrix, Matrix2, SingularValueDecomposition2, matrix_default, inverse2;
var init_matrix = __esm({
  "node_modules/.pnpm/ml-matrix@6.12.1/node_modules/ml-matrix/matrix.mjs"() {
    matrix = __toESM(require_matrix(), 1);
    Matrix2 = matrix.Matrix;
    SingularValueDecomposition2 = matrix.SingularValueDecomposition;
    matrix_default = matrix.default.Matrix ? matrix.default.Matrix : matrix.Matrix;
    inverse2 = matrix.inverse;
  }
});

// src/core/utils/homography.js
var solveHomography, _normalizePoints, _denormalizeHomography;
var init_homography = __esm({
  "src/core/utils/homography.js"() {
    "use strict";
    init_matrix();
    solveHomography = (srcPoints, dstPoints) => {
      const { normPoints: normSrcPoints, param: srcParam } = _normalizePoints(srcPoints);
      const { normPoints: normDstPoints, param: dstParam } = _normalizePoints(dstPoints);
      const num = normDstPoints.length;
      const AData = [];
      const BData = [];
      for (let j = 0; j < num; j++) {
        const row1 = [
          normSrcPoints[j][0],
          normSrcPoints[j][1],
          1,
          0,
          0,
          0,
          -(normSrcPoints[j][0] * normDstPoints[j][0]),
          -(normSrcPoints[j][1] * normDstPoints[j][0])
        ];
        const row2 = [
          0,
          0,
          0,
          normSrcPoints[j][0],
          normSrcPoints[j][1],
          1,
          -(normSrcPoints[j][0] * normDstPoints[j][1]),
          -(normSrcPoints[j][1] * normDstPoints[j][1])
        ];
        AData.push(row1);
        AData.push(row2);
        BData.push([normDstPoints[j][0]]);
        BData.push([normDstPoints[j][1]]);
      }
      try {
        const A = new Matrix2(AData);
        const B = new Matrix2(BData);
        const AT = A.transpose();
        const ATA = AT.mmul(A);
        const ATB = AT.mmul(B);
        const ATAInv = inverse2(ATA);
        const C = ATAInv.mmul(ATB).to1DArray();
        const H = _denormalizeHomography(C, srcParam, dstParam);
        return H;
      } catch (e) {
        return null;
      }
    };
    _normalizePoints = (coords) => {
      let sumX = 0;
      let sumY = 0;
      for (let i = 0; i < coords.length; i++) {
        sumX += coords[i][0];
        sumY += coords[i][1];
      }
      let meanX = sumX / coords.length;
      let meanY = sumY / coords.length;
      let sumDiff = 0;
      for (let i = 0; i < coords.length; i++) {
        const diffX = coords[i][0] - meanX;
        const diffY = coords[i][1] - meanY;
        sumDiff += Math.sqrt(diffX * diffX + diffY * diffY);
      }
      let s = Math.sqrt(2) * coords.length / sumDiff;
      const normPoints = [];
      for (let i = 0; i < coords.length; i++) {
        normPoints.push([(coords[i][0] - meanX) * s, (coords[i][1] - meanY) * s]);
      }
      return { normPoints, param: { meanX, meanY, s } };
    };
    _denormalizeHomography = (nH, srcParam, dstParam) => {
      const sMeanX = dstParam.s * dstParam.meanX;
      const sMeanY = dstParam.s * dstParam.meanY;
      const H = [
        nH[0] + sMeanX * nH[6],
        nH[1] + sMeanX * nH[7],
        (nH[0] + sMeanX * nH[6]) * -srcParam.meanX + (nH[1] + sMeanX * nH[7]) * -srcParam.meanY + (nH[2] + sMeanX) / srcParam.s,
        nH[3] + sMeanY * nH[6],
        nH[4] + sMeanY * nH[7],
        (nH[3] + sMeanY * nH[6]) * -srcParam.meanX + (nH[4] + sMeanY * nH[7]) * -srcParam.meanY + (nH[5] + sMeanY) / srcParam.s,
        dstParam.s * nH[6],
        dstParam.s * nH[7],
        dstParam.s * nH[6] * -srcParam.meanX + dstParam.s * nH[7] * -srcParam.meanY + dstParam.s / srcParam.s
      ];
      for (let i = 0; i < 9; i++) {
        H[i] = H[i] / H[8];
      }
      return H;
    };
  }
});

// src/core/matching/ransacHomography.js
var CAUCHY_SCALE, CHUNK_SIZE2, NUM_HYPOTHESES, NUM_HYPOTHESES_QUICK, computeHomography, _checkHeuristics, _normalizeHomography, _cauchyProjectiveReprojectionCost, _checkHomographyPointsGeometricallyConsistent;
var init_ransacHomography = __esm({
  "src/core/matching/ransacHomography.js"() {
    "use strict";
    init_randomizer();
    init_geometry();
    init_homography();
    CAUCHY_SCALE = 0.01;
    CHUNK_SIZE2 = 10;
    NUM_HYPOTHESES = 100;
    NUM_HYPOTHESES_QUICK = 50;
    computeHomography = (options) => {
      const { srcPoints, dstPoints, keyframe, quickMode } = options;
      const testPoints = [
        [0, 0],
        [keyframe.width, 0],
        [keyframe.width, keyframe.height],
        [0, keyframe.height]
      ];
      const sampleSize = 4;
      if (srcPoints.length < sampleSize) return null;
      const scale = CAUCHY_SCALE;
      const oneOverScale2 = 1 / (scale * scale);
      const chuckSize = Math.min(CHUNK_SIZE2, srcPoints.length);
      const randomizer = createRandomizer();
      const perm = [];
      for (let i = 0; i < srcPoints.length; i++) {
        perm[i] = i;
      }
      randomizer.arrayShuffle({ arr: perm, sampleSize: perm.length });
      const numHypothesis = quickMode ? NUM_HYPOTHESES_QUICK : NUM_HYPOTHESES;
      const maxTrials = numHypothesis * 2;
      let trial = 0;
      const Hs = [];
      while (trial < maxTrials && Hs.length < numHypothesis) {
        trial += 1;
        randomizer.arrayShuffle({ arr: perm, sampleSize });
        if (!checkFourPointsConsistent(
          srcPoints[perm[0]],
          srcPoints[perm[1]],
          srcPoints[perm[2]],
          srcPoints[perm[3]],
          dstPoints[perm[0]],
          dstPoints[perm[1]],
          dstPoints[perm[2]],
          dstPoints[perm[3]]
        )) {
          continue;
        }
        const H = solveHomography(
          [srcPoints[perm[0]], srcPoints[perm[1]], srcPoints[perm[2]], srcPoints[perm[3]]],
          [dstPoints[perm[0]], dstPoints[perm[1]], dstPoints[perm[2]], dstPoints[perm[3]]]
        );
        if (H === null) continue;
        if (!_checkHomographyPointsGeometricallyConsistent({ H, testPoints })) {
          continue;
        }
        Hs.push(H);
      }
      if (Hs.length === 0) return null;
      const hypotheses = [];
      for (let i = 0; i < Hs.length; i++) {
        hypotheses.push({
          H: Hs[i],
          cost: 0
        });
      }
      let curChuckSize = chuckSize;
      for (let i = 0; i < srcPoints.length && hypotheses.length > 2; i += curChuckSize) {
        curChuckSize = Math.min(chuckSize, srcPoints.length - i);
        let chuckEnd = i + curChuckSize;
        for (let j = 0; j < hypotheses.length; j++) {
          for (let k = i; k < chuckEnd; k++) {
            const cost = _cauchyProjectiveReprojectionCost({
              H: hypotheses[j].H,
              srcPoint: srcPoints[k],
              dstPoint: dstPoints[k],
              oneOverScale2
            });
            hypotheses[j].cost += cost;
          }
        }
        hypotheses.sort((h1, h2) => {
          return h1.cost - h2.cost;
        });
        hypotheses.splice(-Math.floor((hypotheses.length + 1) / 2));
      }
      let finalH = null;
      for (let i = 0; i < hypotheses.length; i++) {
        const H = _normalizeHomography({ inH: hypotheses[i].H });
        if (_checkHeuristics({ H, testPoints, keyframe })) {
          finalH = H;
          break;
        }
      }
      return finalH;
    };
    _checkHeuristics = ({ H, testPoints, keyframe }) => {
      const mp = [];
      for (let i = 0; i < testPoints.length; i++) {
        mp.push(multiplyPointHomographyInhomogenous(testPoints[i], H));
      }
      const smallArea = smallestTriangleArea(mp[0], mp[1], mp[2], mp[3]);
      if (smallArea < keyframe.width * keyframe.height * 1e-4) return false;
      if (!quadrilateralConvex(mp[0], mp[1], mp[2], mp[3])) return false;
      return true;
    };
    _normalizeHomography = ({ inH }) => {
      const oneOver = 1 / inH[8];
      const H = [];
      for (let i = 0; i < 8; i++) {
        H[i] = inH[i] * oneOver;
      }
      H[8] = 1;
      return H;
    };
    _cauchyProjectiveReprojectionCost = ({ H, srcPoint, dstPoint, oneOverScale2 }) => {
      const x = multiplyPointHomographyInhomogenous(srcPoint, H);
      const f = [x[0] - dstPoint[0], x[1] - dstPoint[1]];
      return Math.log(1 + (f[0] * f[0] + f[1] * f[1]) * oneOverScale2);
    };
    _checkHomographyPointsGeometricallyConsistent = ({ H, testPoints }) => {
      const mappedPoints = [];
      for (let i = 0; i < testPoints.length; i++) {
        mappedPoints[i] = multiplyPointHomographyInhomogenous(testPoints[i], H);
      }
      for (let i = 0; i < testPoints.length; i++) {
        const i1 = i;
        const i2 = (i + 1) % testPoints.length;
        const i3 = (i + 2) % testPoints.length;
        if (!checkThreePointsConsistent(
          testPoints[i1],
          testPoints[i2],
          testPoints[i3],
          mappedPoints[i1],
          mappedPoints[i2],
          mappedPoints[i3]
        ))
          return false;
      }
      return true;
    };
  }
});

// src/core/estimation/morph-refinement.js
function refineWithMorphology({
  imageData,
  width,
  height,
  targetData,
  initialH,
  iterations = 3
}) {
  let currentH = [...initialH];
  const boundaryPoints = [];
  const step = 0.05;
  for (let i = 0; i <= 1; i += step) {
    boundaryPoints.push({ x: i * targetData.w, y: 0 });
    boundaryPoints.push({ x: i * targetData.w, y: targetData.h });
    boundaryPoints.push({ x: 0, y: i * targetData.h });
    boundaryPoints.push({ x: targetData.w, y: i * targetData.h });
  }
  for (let iter = 0; iter < iterations; iter++) {
    const correspondences = [];
    for (const pt of boundaryPoints) {
      const w = currentH[6] * pt.x + currentH[7] * pt.y + currentH[8];
      const sx = (currentH[0] * pt.x + currentH[1] * pt.y + currentH[2]) / w;
      const sy = (currentH[3] * pt.x + currentH[4] * pt.y + currentH[5]) / w;
      if (sx < 2 || sx >= width - 2 || sy < 2 || sy >= height - 2) continue;
      const searchDist = 10;
      let bestX = sx;
      let bestY = sy;
      let maxGrad = -1;
      for (let dy = -searchDist; dy <= searchDist; dy += 2) {
        for (let dx = -searchDist; dx <= searchDist; dx += 2) {
          const nx = Math.floor(sx + dx);
          const ny = Math.floor(sy + dy);
          const idx = ny * width + nx;
          const gx = imageData[idx + 1] - imageData[idx - 1];
          const gy = imageData[idx + width] - imageData[idx - width];
          const grad = gx * gx + gy * gy;
          if (grad > maxGrad) {
            maxGrad = grad;
            bestX = nx;
            bestY = ny;
          }
        }
      }
      if (maxGrad > 500) {
        correspondences.push({
          src: pt,
          dst: { x: bestX, y: bestY },
          weight: Math.min(1, maxGrad / 15e3)
        });
      }
    }
    if (correspondences.length < 10) break;
    const nextH = solveDLTWeight(correspondences);
    if (nextH) {
      for (let i = 0; i < 9; i++) {
        currentH[i] = currentH[i] * 0.5 + nextH[i] * 0.5;
      }
    }
  }
  return currentH;
}
function solveDLTWeight(pairs) {
  const n = pairs.length;
  const A = new Matrix2(n * 2, 9);
  for (let i = 0; i < n; i++) {
    const { src, dst, weight: w } = pairs[i];
    const x = src.x;
    const y = src.y;
    const xp = dst.x;
    const yp = dst.y;
    A.set(i * 2, 0, 0);
    A.set(i * 2, 1, 0);
    A.set(i * 2, 2, 0);
    A.set(i * 2, 3, -x * w);
    A.set(i * 2, 4, -y * w);
    A.set(i * 2, 5, -w);
    A.set(i * 2, 6, yp * x * w);
    A.set(i * 2, 7, yp * y * w);
    A.set(i * 2, 8, yp * w);
    A.set(i * 2 + 1, 0, x * w);
    A.set(i * 2 + 1, 1, y * w);
    A.set(i * 2 + 1, 2, w);
    A.set(i * 2 + 1, 3, 0);
    A.set(i * 2 + 1, 4, 0);
    A.set(i * 2 + 1, 5, 0);
    A.set(i * 2 + 1, 6, -xp * x * w);
    A.set(i * 2 + 1, 7, -xp * y * w);
    A.set(i * 2 + 1, 8, -xp * w);
  }
  try {
    const svd = new SingularValueDecomposition2(A);
    const V = svd.rightSingularVectors;
    const h = V.getColumn(8);
    const scale = 1 / h[8];
    return h.map((v) => v * scale);
  } catch (e) {
    return null;
  }
}
var init_morph_refinement = __esm({
  "src/core/estimation/morph-refinement.js"() {
    "use strict";
    init_matrix();
  }
});

// src/core/matching/hierarchical-clustering.js
function popcount322(n) {
  n = n - (n >> 1 & 1431655765);
  n = (n & 858993459) + (n >> 2 & 858993459);
  return (n + (n >> 4) & 252645135) * 16843009 >> 24;
}
var MIN_FEATURE_PER_NODE, NUM_ASSIGNMENT_HYPOTHESES, NUM_CENTERS, _computeKMedoids, build, _build;
var init_hierarchical_clustering = __esm({
  "src/core/matching/hierarchical-clustering.js"() {
    "use strict";
    init_hamming_distance();
    init_randomizer();
    MIN_FEATURE_PER_NODE = 32;
    NUM_ASSIGNMENT_HYPOTHESES = 12;
    NUM_CENTERS = 8;
    _computeKMedoids = (options) => {
      const { descriptors, pointIndexes, randomizer, useHDC } = options;
      const numPointIndexes = pointIndexes.length;
      const randomPointIndexes = new Int32Array(numPointIndexes);
      for (let i = 0; i < numPointIndexes; i++) {
        randomPointIndexes[i] = i;
      }
      let bestSumD = Number.MAX_SAFE_INTEGER;
      let bestAssignment = null;
      const centerPointIndices = new Int32Array(NUM_CENTERS);
      for (let i = 0; i < NUM_ASSIGNMENT_HYPOTHESES; i++) {
        randomizer.arrayShuffle({ arr: randomPointIndexes, sampleSize: NUM_CENTERS });
        for (let k = 0; k < NUM_CENTERS; k++) {
          centerPointIndices[k] = pointIndexes[randomPointIndexes[k]];
        }
        let sumD = 0;
        const currentAssignment = new Int32Array(numPointIndexes);
        for (let j = 0; j < numPointIndexes; j++) {
          const pIdx = pointIndexes[j];
          let bestD = 255;
          let bestCenterIdx = -1;
          for (let k = 0; k < NUM_CENTERS; k++) {
            const cIdx = centerPointIndices[k];
            let d;
            if (useHDC) {
              d = popcount322(descriptors[pIdx] ^ descriptors[cIdx]);
            } else {
              d = compute64(descriptors, pIdx * 2, descriptors, cIdx * 2);
            }
            if (d < bestD) {
              bestCenterIdx = randomPointIndexes[k];
              bestD = d;
            }
          }
          currentAssignment[j] = bestCenterIdx;
          sumD += bestD;
        }
        if (sumD < bestSumD) {
          bestSumD = sumD;
          bestAssignment = currentAssignment;
        }
      }
      return bestAssignment;
    };
    build = ({ points }) => {
      const numPoints = points.length;
      if (numPoints === 0) return { rootNode: { leaf: true, pointIndexes: [], centerPointIndex: null } };
      const useHDC = points[0] && points[0].hdcSignature !== void 0;
      const descriptors = new Uint32Array(useHDC ? numPoints : numPoints * 2);
      for (let i = 0; i < numPoints; i++) {
        if (useHDC) {
          descriptors[i] = points[i].hdcSignature;
        } else {
          const d = points[i].descriptors;
          descriptors[i * 2] = d[0];
          descriptors[i * 2 + 1] = d[1];
        }
      }
      const pointIndexes = new Int32Array(numPoints);
      for (let i = 0; i < numPoints; i++) {
        pointIndexes[i] = i;
      }
      const randomizer = createRandomizer();
      const rootNode = _build({
        descriptors,
        pointIndexes,
        centerPointIndex: null,
        randomizer,
        useHDC
      });
      return { rootNode };
    };
    _build = (options) => {
      const { descriptors, pointIndexes, centerPointIndex, randomizer, useHDC } = options;
      const numPoints = pointIndexes.length;
      let isLeaf = false;
      if (numPoints <= NUM_CENTERS || numPoints <= MIN_FEATURE_PER_NODE) {
        isLeaf = true;
      }
      const clusters = /* @__PURE__ */ new Map();
      if (!isLeaf) {
        const assignment = _computeKMedoids({ descriptors, pointIndexes, randomizer, useHDC });
        for (let i = 0; i < assignment.length; i++) {
          const centerIdx = pointIndexes[assignment[i]];
          let cluster = clusters.get(centerIdx);
          if (cluster === void 0) {
            cluster = [];
            clusters.set(centerIdx, cluster);
          }
          cluster.push(pointIndexes[i]);
        }
        if (clusters.size === 1) {
          isLeaf = true;
        }
      }
      const node = {
        centerPointIndex
      };
      if (isLeaf) {
        node.leaf = true;
        node.pointIndexes = new Int32Array(pointIndexes);
        return node;
      }
      node.leaf = false;
      node.children = [];
      for (const [cIdx, clusterPoints] of clusters) {
        node.children.push(
          _build({
            descriptors,
            pointIndexes: new Int32Array(clusterPoints),
            centerPointIndex: cIdx,
            randomizer,
            useHDC
          })
        );
      }
      return node;
    };
  }
});

// src/core/matching/matching.js
var INLIER_THRESHOLD, MIN_NUM_INLIERS, CLUSTER_MAX_POP, HAMMING_THRESHOLD, HDC_RATIO_THRESHOLD, MAX_MATCH_QUERY_POINTS, match, _query, _findInlierMatches;
var init_matching = __esm({
  "src/core/matching/matching.js"() {
    "use strict";
    init_tinyqueue();
    init_hamming_distance();
    init_hough();
    init_ransacHomography();
    init_geometry();
    init_morph_refinement();
    init_hierarchical_clustering();
    init_constants();
    INLIER_THRESHOLD = AR_CONFIG.INLIER_THRESHOLD;
    MIN_NUM_INLIERS = AR_CONFIG.MIN_NUM_INLIERS;
    CLUSTER_MAX_POP = AR_CONFIG.CLUSTER_MAX_POP;
    HAMMING_THRESHOLD = AR_CONFIG.HAMMING_THRESHOLD;
    HDC_RATIO_THRESHOLD = AR_CONFIG.HDC_RATIO_THRESHOLD;
    MAX_MATCH_QUERY_POINTS = AR_CONFIG.MAX_MATCH_QUERY_POINTS;
    match = ({ keyframe, querypoints: rawQuerypoints, querywidth, queryheight, debugMode: debugMode2, expectedScale }) => {
      let debugExtra = {};
      const querypoints = rawQuerypoints.length > MAX_MATCH_QUERY_POINTS ? [...rawQuerypoints].sort((a, b) => (b.score || b.response || 0) - (a.score || a.response || 0)).slice(0, MAX_MATCH_QUERY_POINTS) : rawQuerypoints;
      const matches = [];
      const qlen = querypoints.length;
      const kmax = keyframe.max;
      const kmin = keyframe.min;
      const isHDC = keyframe.hdc === true || kmax && kmax.hdc === 1;
      const isCompact = kmax && kmax.compact === 1 || kmin && kmin.compact === 1;
      const descSize = isHDC || isCompact ? 1 : 2;
      const currentRatioThreshold = isHDC ? HDC_RATIO_THRESHOLD : HAMMING_THRESHOLD;
      for (let j = 0; j < qlen; j++) {
        const querypoint = querypoints[j];
        const col = querypoint.maxima ? kmax : kmin;
        if (!col || col.x.length === 0) continue;
        const rootNode = col.t;
        const keypointIndexes = [];
        const queue = new TinyQueue([], (a1, a2) => a1.d - a2.d);
        _query({
          node: rootNode,
          descriptors: col.d,
          querypoint,
          queue,
          keypointIndexes,
          numPop: 0,
          isHDC,
          descSize,
          isCompact
        });
        let bestIndex = -1;
        let bestD1 = Number.MAX_SAFE_INTEGER;
        let bestD2 = Number.MAX_SAFE_INTEGER;
        const qDesc = querypoint.descriptors;
        const cDesc = col.d;
        const qDescCompact = isCompact && qDesc && qDesc.length >= 2 ? (qDesc[0] ^ qDesc[1]) >>> 0 : 0;
        for (let k = 0; k < keypointIndexes.length; k++) {
          const idx = keypointIndexes[k];
          if (expectedScale !== void 0 && col.s) {
            const featureScale = col.s[idx];
            const idealKeyScale = (querypoint.scale || 1) / expectedScale;
            if (featureScale < idealKeyScale * 0.4 || featureScale > idealKeyScale * 2.5) {
              continue;
            }
          }
          let d;
          if (isHDC) {
            d = popcount322(cDesc[idx] ^ querypoint.hdcSignature);
          } else if (isCompact) {
            d = popcount322(cDesc[idx] ^ qDescCompact);
          } else {
            d = compute({ v1: cDesc, v1Offset: idx * descSize, v2: qDesc });
          }
          if (d < bestD1) {
            bestD2 = bestD1;
            bestD1 = d;
            bestIndex = idx;
          } else if (d < bestD2) {
            bestD2 = d;
          }
        }
        if (bestIndex !== -1) {
          if (bestD2 === Number.MAX_SAFE_INTEGER || bestD1 / bestD2 < currentRatioThreshold) {
            matches.push({
              querypoint,
              keypoint: {
                x: col.x[bestIndex],
                y: col.y[bestIndex],
                angle: col.a[bestIndex],
                scale: col.s ? col.s[bestIndex] : keyframe.s
              },
              d: bestD1
            });
          }
        }
      }
      if (matches.length < MIN_NUM_INLIERS) {
        return { debugExtra };
      }
      const constellationMatches = matches;
      if (debugMode2) debugExtra.constellationMatches = constellationMatches;
      const houghMatches = computeHoughMatches({
        keywidth: keyframe.w || keyframe.width,
        keyheight: keyframe.h || keyframe.height,
        querywidth,
        queryheight,
        matches: constellationMatches
      });
      if (debugMode2) {
        debugExtra.houghMatches = houghMatches;
      }
      if (houghMatches.length < MIN_NUM_INLIERS) {
        return { debugExtra };
      }
      const H = computeHomography({
        srcPoints: houghMatches.map((m) => [m.keypoint.x, m.keypoint.y]),
        dstPoints: houghMatches.map((m) => [m.querypoint.x, m.querypoint.y]),
        keyframe: { width: keyframe.w || keyframe.width, height: keyframe.h || keyframe.height }
      });
      if (H === null) {
        return { debugExtra };
      }
      const inlierMatches = _findInlierMatches({
        H,
        matches: houghMatches,
        threshold: INLIER_THRESHOLD
      });
      if (debugMode2) debugExtra.inlierMatches = inlierMatches;
      if (inlierMatches.length < MIN_NUM_INLIERS) {
        return { debugExtra };
      }
      if (debugMode2 && Math.random() < 0.02) {
        console.log(`MATCH: Homography success with ${inlierMatches.length} inliers`);
      }
      const HInv = matrixInverse33(H, 1e-5);
      const dThreshold2 = 100;
      const matches2 = [];
      const hi00 = HInv[0], hi01 = HInv[1], hi02 = HInv[2];
      const hi10 = HInv[3], hi11 = HInv[4], hi12 = HInv[5];
      const hi20 = HInv[6], hi21 = HInv[7], hi22 = HInv[8];
      for (let j = 0; j < qlen; j++) {
        const querypoint = querypoints[j];
        const qx = querypoint.x, qy = querypoint.y;
        const uz = qx * hi20 + qy * hi21 + hi22;
        const invZ = 1 / uz;
        const mapX = (qx * hi00 + qy * hi01 + hi02) * invZ;
        const mapY = (qx * hi10 + qy * hi11 + hi12) * invZ;
        let bestIndex = -1;
        let bestD1 = Number.MAX_SAFE_INTEGER;
        let bestD2 = Number.MAX_SAFE_INTEGER;
        const col = querypoint.maxima ? kmax : kmin;
        if (!col) continue;
        const cx = col.x, cy = col.y, cd = col.d;
        const qDesc = querypoint.descriptors;
        const qDescCompact = isCompact && qDesc && qDesc.length >= 2 ? (qDesc[0] ^ qDesc[1]) >>> 0 : 0;
        for (let k = 0, clen = cx.length; k < clen; k++) {
          const dx = cx[k] - mapX;
          const dy = cy[k] - mapY;
          const d2 = dx * dx + dy * dy;
          if (d2 > dThreshold2) continue;
          let d;
          if (isHDC) {
            d = popcount322(cd[k] ^ querypoint.hdcSignature);
          } else if (isCompact) {
            d = popcount322(cd[k] ^ qDescCompact);
          } else {
            d = compute({ v1: cd, v1Offset: k * descSize, v2: qDesc });
          }
          if (d < bestD1) {
            bestD2 = bestD1;
            bestD1 = d;
            bestIndex = k;
          } else if (d < bestD2) {
            bestD2 = d;
          }
        }
        if (bestIndex !== -1 && (bestD2 === Number.MAX_SAFE_INTEGER || bestD1 / bestD2 < currentRatioThreshold)) {
          matches2.push({
            querypoint,
            keypoint: {
              x: col.x[bestIndex],
              y: col.y[bestIndex],
              angle: col.a[bestIndex],
              scale: col.s ? col.s[bestIndex] : keyframe.s
            }
          });
        }
      }
      if (debugMode2) debugExtra.matches2 = matches2;
      const houghMatches2 = computeHoughMatches({
        keywidth: keyframe.w || keyframe.width,
        keyheight: keyframe.h || keyframe.height,
        querywidth,
        queryheight,
        matches: matches2
      });
      if (debugMode2) debugExtra.houghMatches2 = houghMatches2;
      const H2 = computeHomography({
        srcPoints: houghMatches2.map((m) => [m.keypoint.x, m.keypoint.y]),
        dstPoints: houghMatches2.map((m) => [m.querypoint.x, m.querypoint.y]),
        keyframe: { width: keyframe.w || keyframe.width, height: keyframe.h || keyframe.height }
      });
      if (H2 === null) return { debugExtra };
      const inlierMatches2 = _findInlierMatches({
        H: H2,
        matches: houghMatches2,
        threshold: INLIER_THRESHOLD
      });
      if (debugMode2) debugExtra.inlierMatches2 = inlierMatches2;
      const refinedH = refineWithMorphology({
        imageData: rawQuerypoints[0].imageData,
        width: querywidth,
        height: queryheight,
        targetData: { w: keyframe.w || keyframe.width, h: keyframe.h || keyframe.height },
        initialH: H2,
        iterations: 3
      });
      return { H: refinedH || H2, matches: inlierMatches2, debugExtra };
    };
    _query = ({ node, descriptors, querypoint, queue, keypointIndexes, numPop, isHDC, descSize, isCompact }) => {
      const isLeaf = node[0] === 1;
      const childrenOrIndices = node[2];
      if (isLeaf) {
        for (let i = 0; i < childrenOrIndices.length; i++) {
          keypointIndexes.push(childrenOrIndices[i]);
        }
        return;
      }
      const qDesc = querypoint.descriptors;
      const qDescCompact = isCompact && qDesc && qDesc.length >= 2 ? (qDesc[0] ^ qDesc[1]) >>> 0 : 0;
      let minD = Number.MAX_SAFE_INTEGER;
      const clen = childrenOrIndices.length;
      const distances = new Int32Array(clen);
      for (let i = 0; i < clen; i++) {
        const childNode = childrenOrIndices[i];
        const cIdx = childNode[1];
        let d;
        if (isHDC) {
          d = popcount322(descriptors[cIdx] ^ querypoint.hdcSignature);
        } else if (isCompact) {
          d = popcount322(descriptors[cIdx] ^ qDescCompact);
        } else {
          d = compute({
            v1: descriptors,
            v1Offset: cIdx * descSize,
            v2: qDesc
          });
        }
        distances[i] = d;
        if (d < minD) minD = d;
      }
      for (let i = 0; i < clen; i++) {
        const dist = distances[i];
        if (dist <= minD) {
          _query({ node: childrenOrIndices[i], descriptors, querypoint, queue, keypointIndexes, numPop: numPop + 1, isHDC, descSize, isCompact });
        } else {
          queue.push({ node: childrenOrIndices[i], d: dist });
        }
      }
      if (numPop < CLUSTER_MAX_POP && queue.length > 0) {
        const { node: node2 } = queue.pop();
        _query({ node: node2, descriptors, querypoint, queue, keypointIndexes, numPop: numPop + 1, isHDC, descSize, isCompact });
      }
    };
    _findInlierMatches = (options) => {
      const { H, matches, threshold } = options;
      const threshold2 = threshold * threshold;
      const h00 = H[0], h01 = H[1], h02 = H[2];
      const h10 = H[3], h11 = H[4], h12 = H[5];
      const h20 = H[6], h21 = H[7], h22 = H[8];
      const goodMatches = [];
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const qp = m.querypoint;
        const kp = m.keypoint;
        const uz = kp.x * h20 + kp.y * h21 + h22;
        const invZ = 1 / uz;
        const mx = (kp.x * h00 + kp.y * h01 + h02) * invZ;
        const my = (kp.x * h10 + kp.y * h11 + h12) * invZ;
        const dx = mx - qp.x;
        const dy = my - qp.y;
        if (dx * dx + dy * dy <= threshold2) {
          goodMatches.push(m);
        }
      }
      return goodMatches;
    };
  }
});

// src/core/matching/matcher.js
var matcher_exports = {};
__export(matcher_exports, {
  Matcher: () => Matcher
});
var Matcher;
var init_matcher = __esm({
  "src/core/matching/matcher.js"() {
    "use strict";
    init_matching();
    Matcher = class {
      constructor(queryWidth, queryHeight, debugMode2 = false) {
        this.queryWidth = queryWidth;
        this.queryHeight = queryHeight;
        this.debugMode = debugMode2;
      }
      matchDetection(keyframes, featurePoints, expectedScale) {
        let debugExtra = { frames: [] };
        let bestResult = null;
        if (!keyframes || !Array.isArray(keyframes)) {
          return { targetIndex: -1, keyframeIndex: -1, debugExtra };
        }
        for (let j = 0; j < keyframes.length; j++) {
          const {
            H,
            matches,
            debugExtra: frameDebugExtra
          } = match({
            keyframe: keyframes[j],
            querypoints: featurePoints,
            querywidth: this.queryWidth,
            queryheight: this.queryHeight,
            debugMode: this.debugMode,
            expectedScale
          });
          if (frameDebugExtra) {
            frameDebugExtra.keyframeIndex = j;
            debugExtra.frames.push(frameDebugExtra);
          }
          if (H) {
            if (bestResult === null || bestResult.matches.length < matches.length) {
              bestResult = { keyframeIndex: j, H, matches };
            }
          }
        }
        if (bestResult === null) {
          return { targetIndex: -1, keyframeIndex: -1, debugExtra };
        }
        const screenCoords = [];
        const worldCoords = [];
        const keyframe = keyframes[bestResult.keyframeIndex];
        const kfScale = keyframe.s || keyframe.scale || 1;
        for (let i = 0; i < bestResult.matches.length; i++) {
          const querypoint = bestResult.matches[i].querypoint;
          const keypoint = bestResult.matches[i].keypoint;
          const pointScale = keypoint.scale || kfScale;
          screenCoords.push({
            x: querypoint.x,
            y: querypoint.y
          });
          worldCoords.push({
            x: (keypoint.x + 0.5) / kfScale,
            y: (keypoint.y + 0.5) / kfScale,
            z: 0
          });
        }
        return {
          screenCoords,
          worldCoords,
          targetIndex: -1,
          // Caller knows the targetIndex
          keyframeIndex: bestResult.keyframeIndex,
          H: bestResult.H,
          debugExtra
        };
      }
    };
  }
});

// src/core/estimation/pnp-solver.js
function solvePosePnP({
  screenCoords,
  worldCoords,
  projectionTransform
}) {
  const K = new Matrix2(projectionTransform);
  const n = screenCoords.length;
  const KI = Inverse3x3(projectionTransform);
  const A = new Matrix2(n * 2, 9);
  for (let i = 0; i < n; i++) {
    const sci = screenCoords[i];
    const wci = worldCoords[i];
    const nx = KI[0] * sci.x + KI[1] * sci.y + KI[2];
    const ny = KI[3] * sci.x + KI[4] * sci.y + KI[5];
    const nz = KI[6] * sci.x + KI[7] * sci.y + KI[8];
    const unx = nx / nz;
    const uny = ny / nz;
    const X = wci.x;
    const Y = wci.y;
    A.set(i * 2, 0, X);
    A.set(i * 2, 1, Y);
    A.set(i * 2, 2, 1);
    A.set(i * 2, 3, 0);
    A.set(i * 2, 4, 0);
    A.set(i * 2, 5, 0);
    A.set(i * 2, 6, -unx * X);
    A.set(i * 2, 7, -unx * Y);
    A.set(i * 2, 8, -unx);
    A.set(i * 2 + 1, 0, 0);
    A.set(i * 2 + 1, 1, 0);
    A.set(i * 2 + 1, 2, 0);
    A.set(i * 2 + 1, 3, X);
    A.set(i * 2 + 1, 4, Y);
    A.set(i * 2 + 1, 5, 1);
    A.set(i * 2 + 1, 6, -uny * X);
    A.set(i * 2 + 1, 7, -uny * Y);
    A.set(i * 2 + 1, 8, -uny);
  }
  const svd = new SingularValueDecomposition2(A);
  const V = svd.rightSingularVectors;
  const sol = V.getColumn(8);
  if (sol[8] < 0) {
    for (let i = 0; i < 9; i++) sol[i] = -sol[i];
  }
  const r1_raw = [sol[0], sol[3], sol[6]];
  const r2_raw = [sol[1], sol[4], sol[7]];
  const t_raw = [sol[2], sol[5], sol[8]];
  const scale1 = Math.sqrt(r1_raw[0] ** 2 + r1_raw[1] ** 2 + r1_raw[2] ** 2);
  const scale2 = Math.sqrt(r2_raw[0] ** 2 + r2_raw[1] ** 2 + r2_raw[2] ** 2);
  const scale = (scale1 + scale2) / 2;
  const R_approx = new Matrix2([
    [r1_raw[0] / scale1, r2_raw[0] / scale2, 0],
    [r1_raw[1] / scale1, r2_raw[1] / scale2, 0],
    [r1_raw[2] / scale1, r2_raw[2] / scale2, 0]
  ]);
  R_approx.set(0, 2, R_approx.get(1, 0) * R_approx.get(2, 1) - R_approx.get(2, 0) * R_approx.get(1, 1));
  R_approx.set(1, 2, R_approx.get(2, 0) * R_approx.get(0, 1) - R_approx.get(0, 0) * R_approx.get(2, 1));
  R_approx.set(2, 2, R_approx.get(0, 0) * R_approx.get(1, 1) - R_approx.get(1, 0) * R_approx.get(0, 1));
  const svdRot = new SingularValueDecomposition2(R_approx);
  const U = svdRot.leftSingularVectors;
  const Vrot = svdRot.rightSingularVectors;
  let R = U.mmul(Vrot.transpose());
  const getDet3 = (m) => {
    return m.get(0, 0) * (m.get(1, 1) * m.get(2, 2) - m.get(1, 2) * m.get(2, 1)) - m.get(0, 1) * (m.get(1, 0) * m.get(2, 2) - m.get(1, 2) * m.get(2, 0)) + m.get(0, 2) * (m.get(1, 0) * m.get(2, 1) - m.get(1, 1) * m.get(2, 0));
  };
  if (getDet3(R) < 0) {
    const U_mat = U.clone();
    for (let i = 0; i < 3; i++) U_mat.set(i, 2, -U_mat.get(i, 2));
    R = U_mat.mmul(Vrot.transpose());
  }
  return [
    [R.get(0, 0), R.get(0, 1), R.get(0, 2), t_raw[0] / scale],
    [R.get(1, 0), R.get(1, 1), R.get(1, 2), t_raw[1] / scale],
    [R.get(2, 0), R.get(2, 1), R.get(2, 2), t_raw[2] / scale]
  ];
}
function Inverse3x3(m) {
  const k00 = m[0][0], k01 = m[0][1], k02 = m[0][2];
  const k10 = m[1][0], k11 = m[1][1], k12 = m[1][2];
  const k20 = m[2][0], k21 = m[2][1], k22 = m[2][2];
  const det = k00 * (k11 * k22 - k21 * k12) - k01 * (k10 * k22 - k12 * k20) + k02 * (k10 * k21 - k11 * k20);
  const invDet = 1 / det;
  return [
    (k11 * k22 - k12 * k21) * invDet,
    (k02 * k21 - k01 * k22) * invDet,
    (k01 * k12 - k02 * k11) * invDet,
    (k12 * k20 - k10 * k22) * invDet,
    (k00 * k22 - k02 * k20) * invDet,
    (k10 * k02 - k00 * k12) * invDet,
    (k10 * k21 - k11 * k20) * invDet,
    (k20 * k01 - k21 * k00) * invDet,
    (k00 * k11 - k10 * k01) * invDet
  ];
}
var init_pnp_solver = __esm({
  "src/core/estimation/pnp-solver.js"() {
    "use strict";
    init_matrix();
  }
});

// src/core/estimation/estimate.js
var estimate;
var init_estimate = __esm({
  "src/core/estimation/estimate.js"() {
    "use strict";
    init_pnp_solver();
    estimate = ({ screenCoords, worldCoords, projectionTransform }) => {
      return solvePosePnP({
        screenCoords,
        worldCoords,
        projectionTransform
      });
    };
  }
});

// src/core/estimation/refine-estimate.js
var TRACKING_THRESH, K2_FACTOR, ICP_MAX_LOOP, ICP_BREAK_LOOP_ERROR_THRESH, ICP_BREAK_LOOP_ERROR_RATIO_THRESH, mat, J_U_Xc, J_Xc_S, refineEstimate, _doICP, _updateModelViewTransform, _getDeltaS, _getJ_U_S;
var init_refine_estimate = __esm({
  "src/core/estimation/refine-estimate.js"() {
    "use strict";
    init_matrix();
    init_utils();
    TRACKING_THRESH = 5;
    K2_FACTOR = 4;
    ICP_MAX_LOOP = 10;
    ICP_BREAK_LOOP_ERROR_THRESH = 0.1;
    ICP_BREAK_LOOP_ERROR_RATIO_THRESH = 0.99;
    mat = [[], [], []];
    J_U_Xc = [[], []];
    J_Xc_S = [[], [], []];
    refineEstimate = ({
      initialModelViewTransform,
      projectionTransform,
      worldCoords,
      screenCoords,
      stabilities
      // Stability-based weighting
    }) => {
      let dx = 0;
      let dy = 0;
      for (let i = 0; i < worldCoords.length; i++) {
        dx += worldCoords[i].x;
        dy += worldCoords[i].y;
      }
      dx /= worldCoords.length;
      dy /= worldCoords.length;
      const normalizedWorldCoords = [];
      for (let i = 0; i < worldCoords.length; i++) {
        normalizedWorldCoords.push({
          x: worldCoords[i].x - dx,
          y: worldCoords[i].y - dy,
          z: worldCoords[i].z
        });
      }
      const diffModelViewTransform = [[], [], []];
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          diffModelViewTransform[j][i] = initialModelViewTransform[j][i];
        }
      }
      diffModelViewTransform[0][3] = initialModelViewTransform[0][0] * dx + initialModelViewTransform[0][1] * dy + initialModelViewTransform[0][3];
      diffModelViewTransform[1][3] = initialModelViewTransform[1][0] * dx + initialModelViewTransform[1][1] * dy + initialModelViewTransform[1][3];
      diffModelViewTransform[2][3] = initialModelViewTransform[2][0] * dx + initialModelViewTransform[2][1] * dy + initialModelViewTransform[2][3];
      const inlierProbs = [1, 0.8, 0.6, 0.4, 0];
      let updatedModelViewTransform = diffModelViewTransform;
      let finalModelViewTransform = null;
      for (let i = 0; i < inlierProbs.length; i++) {
        const ret = _doICP({
          initialModelViewTransform: updatedModelViewTransform,
          projectionTransform,
          worldCoords: normalizedWorldCoords,
          screenCoords,
          stabilities,
          // Pass weights to ICP
          inlierProb: inlierProbs[i]
        });
        updatedModelViewTransform = ret.modelViewTransform;
        if (ret.err < TRACKING_THRESH) {
          finalModelViewTransform = updatedModelViewTransform;
          break;
        }
      }
      if (finalModelViewTransform === null) return null;
      finalModelViewTransform[0][3] = finalModelViewTransform[0][3] - finalModelViewTransform[0][0] * dx - finalModelViewTransform[0][1] * dy;
      finalModelViewTransform[1][3] = finalModelViewTransform[1][3] - finalModelViewTransform[1][0] * dx - finalModelViewTransform[1][1] * dy;
      finalModelViewTransform[2][3] = finalModelViewTransform[2][3] - finalModelViewTransform[2][0] * dx - finalModelViewTransform[2][1] * dy;
      return finalModelViewTransform;
    };
    _doICP = ({
      initialModelViewTransform,
      projectionTransform,
      worldCoords,
      screenCoords,
      stabilities,
      inlierProb
    }) => {
      const isRobustMode = inlierProb < 1;
      let modelViewTransform = initialModelViewTransform;
      let err0 = 0;
      let err1 = 0;
      let E = new Array(worldCoords.length);
      let E2 = new Array(worldCoords.length);
      let dxs = new Array(worldCoords.length);
      let dys = new Array(worldCoords.length);
      for (let l = 0; l <= ICP_MAX_LOOP; l++) {
        const modelViewProjectionTransform = buildModelViewProjectionTransform(
          projectionTransform,
          modelViewTransform
        );
        for (let n = 0; n < worldCoords.length; n++) {
          const u = computeScreenCoordiate(
            modelViewProjectionTransform,
            worldCoords[n].x,
            worldCoords[n].y,
            worldCoords[n].z
          );
          const dx = screenCoords[n].x - u.x;
          const dy = screenCoords[n].y - u.y;
          dxs[n] = dx;
          dys[n] = dy;
          E[n] = dx * dx + dy * dy;
        }
        let K2;
        err1 = 0;
        if (isRobustMode) {
          const inlierNum = Math.max(3, Math.floor(worldCoords.length * inlierProb) - 1);
          for (let n = 0; n < worldCoords.length; n++) {
            E2[n] = E[n];
          }
          E2.sort((a, b) => {
            return a - b;
          });
          K2 = Math.max(E2[inlierNum] * K2_FACTOR, 16);
          for (let n = 0; n < worldCoords.length; n++) {
            if (E2[n] > K2) err1 += K2 / 6;
            else
              err1 += K2 / 6 * (1 - (1 - E2[n] / K2) * (1 - E2[n] / K2) * (1 - E2[n] / K2));
          }
        } else {
          for (let n = 0; n < worldCoords.length; n++) {
            err1 += E[n];
          }
        }
        err1 /= worldCoords.length;
        if (err1 < ICP_BREAK_LOOP_ERROR_THRESH) break;
        if (l > 0 && err1 / err0 > ICP_BREAK_LOOP_ERROR_RATIO_THRESH) break;
        if (l === ICP_MAX_LOOP) break;
        err0 = err1;
        const dU = [];
        const allJ_U_S = [];
        for (let n = 0; n < worldCoords.length; n++) {
          if (isRobustMode && E[n] > K2) {
            continue;
          }
          const J_U_S = _getJ_U_S({
            modelViewProjectionTransform,
            modelViewTransform,
            projectionTransform,
            worldCoord: worldCoords[n]
          });
          if (isRobustMode) {
            const robustW = (1 - E[n] / K2) * (1 - E[n] / K2);
            const s = stabilities ? stabilities[n] : 1;
            const stabilityW = s * Math.log10(9 * s + 1);
            const W = robustW * stabilityW;
            for (let j = 0; j < 2; j++) {
              for (let i = 0; i < 6; i++) {
                J_U_S[j][i] *= W;
              }
            }
            dU.push([dxs[n] * W]);
            dU.push([dys[n] * W]);
          } else {
            const s = stabilities ? stabilities[n] : 1;
            const W = s * Math.log10(9 * s + 1);
            for (let j = 0; j < 2; j++) {
              for (let i = 0; i < 6; i++) {
                J_U_S[j][i] *= W;
              }
            }
            dU.push([dxs[n] * W]);
            dU.push([dys[n] * W]);
          }
          for (let i = 0; i < J_U_S.length; i++) {
            allJ_U_S.push(J_U_S[i]);
          }
        }
        const dS = _getDeltaS({ dU, J_U_S: allJ_U_S });
        if (dS === null) break;
        modelViewTransform = _updateModelViewTransform({ modelViewTransform, dS });
      }
      return { modelViewTransform, err: err1 };
    };
    _updateModelViewTransform = ({ modelViewTransform, dS }) => {
      let ra = dS[0] * dS[0] + dS[1] * dS[1] + dS[2] * dS[2];
      let q0, q1, q2;
      if (ra < 1e-6) {
        q0 = 1;
        q1 = 0;
        q2 = 0;
        ra = 0;
      } else {
        ra = Math.sqrt(ra);
        q0 = dS[0] / ra;
        q1 = dS[1] / ra;
        q2 = dS[2] / ra;
      }
      const cra = Math.cos(ra);
      const sra = Math.sin(ra);
      const one_cra = 1 - cra;
      mat[0][0] = q0 * q0 * one_cra + cra;
      mat[0][1] = q0 * q1 * one_cra - q2 * sra;
      mat[0][2] = q0 * q2 * one_cra + q1 * sra;
      mat[0][3] = dS[3];
      mat[1][0] = q1 * q0 * one_cra + q2 * sra;
      mat[1][1] = q1 * q1 * one_cra + cra;
      mat[1][2] = q1 * q2 * one_cra - q0 * sra;
      mat[1][3] = dS[4];
      mat[2][0] = q2 * q0 * one_cra - q1 * sra;
      mat[2][1] = q2 * q1 * one_cra + q0 * sra;
      mat[2][2] = q2 * q2 * one_cra + cra;
      mat[2][3] = dS[5];
      const mat2 = [[], [], []];
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 4; i++) {
          mat2[j][i] = modelViewTransform[j][0] * mat[0][i] + modelViewTransform[j][1] * mat[1][i] + modelViewTransform[j][2] * mat[2][i];
        }
        mat2[j][3] += modelViewTransform[j][3];
      }
      return mat2;
    };
    _getDeltaS = ({ dU, J_U_S }) => {
      const J = new Matrix2(J_U_S);
      const U = new Matrix2(dU);
      const JT = J.transpose();
      const JTJ = JT.mmul(J);
      const JTU = JT.mmul(U);
      let JTJInv;
      try {
        JTJInv = inverse2(JTJ);
      } catch (e) {
        return null;
      }
      const S = JTJInv.mmul(JTU);
      return S.to1DArray();
    };
    _getJ_U_S = ({
      modelViewProjectionTransform,
      modelViewTransform,
      projectionTransform,
      worldCoord
    }) => {
      const T = modelViewTransform;
      const { x, y, z } = worldCoord;
      const u = applyModelViewProjectionTransform(modelViewProjectionTransform, x, y, z);
      const z2 = u.z * u.z;
      J_U_Xc[0][0] = projectionTransform[0][0] * u.z / z2;
      J_U_Xc[0][1] = projectionTransform[0][1] * u.z / z2;
      J_U_Xc[0][2] = (projectionTransform[0][2] * u.z - projectionTransform[2][2] * u.x) / z2;
      J_U_Xc[1][0] = projectionTransform[1][0] * u.z / z2;
      J_U_Xc[1][1] = projectionTransform[1][1] * u.z / z2;
      J_U_Xc[1][2] = (projectionTransform[1][2] * u.z - projectionTransform[2][2] * u.y) / z2;
      J_Xc_S[0][0] = T[0][2] * y;
      J_Xc_S[0][1] = -T[0][2] * x;
      J_Xc_S[0][2] = T[0][1] * x - T[0][0] * y;
      J_Xc_S[0][3] = T[0][0];
      J_Xc_S[0][4] = T[0][1];
      J_Xc_S[0][5] = T[0][2];
      J_Xc_S[1][0] = T[1][2] * y;
      J_Xc_S[1][1] = -T[1][2] * x;
      J_Xc_S[1][2] = T[1][1] * x - T[1][0] * y;
      J_Xc_S[1][3] = T[1][0];
      J_Xc_S[1][4] = T[1][1];
      J_Xc_S[1][5] = T[1][2];
      J_Xc_S[2][0] = T[2][2] * y;
      J_Xc_S[2][1] = -T[2][2] * x;
      J_Xc_S[2][2] = T[2][1] * x - T[2][0] * y;
      J_Xc_S[2][3] = T[2][0];
      J_Xc_S[2][4] = T[2][1];
      J_Xc_S[2][5] = T[2][2];
      const J_U_S = [[], []];
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 6; i++) {
          J_U_S[j][i] = 0;
          for (let k = 0; k < 3; k++) {
            J_U_S[j][i] += J_U_Xc[j][k] * J_Xc_S[k][i];
          }
        }
      }
      return J_U_S;
    };
  }
});

// src/core/estimation/estimator.js
var estimator_exports = {};
__export(estimator_exports, {
  Estimator: () => Estimator
});
var Estimator;
var init_estimator = __esm({
  "src/core/estimation/estimator.js"() {
    "use strict";
    init_estimate();
    init_refine_estimate();
    Estimator = class {
      constructor(projectionTransform) {
        this.projectionTransform = projectionTransform;
      }
      // Solve homography between screen points and world points using Direct Linear Transformation
      // then decompose homography into rotation and translation matrix (i.e. modelViewTransform)
      estimate({ screenCoords, worldCoords }) {
        const modelViewTransform = estimate({
          screenCoords,
          worldCoords,
          projectionTransform: this.projectionTransform
        });
        return modelViewTransform;
      }
      // Given an initial guess of the modelViewTransform and new pairs of screen-world coordinates,
      // use Iterative Closest Point to refine the transformation
      //refineEstimate({initialModelViewTransform, screenCoords, worldCoords}) {
      refineEstimate({ initialModelViewTransform, worldCoords, screenCoords }) {
        const updatedModelViewTransform = refineEstimate({
          initialModelViewTransform,
          worldCoords,
          screenCoords,
          projectionTransform: this.projectionTransform
        });
        return updatedModelViewTransform;
      }
    };
  }
});

// src/runtime/controller.worker.js?worker&inline
var controller_worker_exports = {};
var matchingDataList, debugMode, matcher, estimator, tracker, detector;
var init_controller_worker = __esm({
  "src/runtime/controller.worker.js?worker&inline"() {
    "use strict";
    init_matcher();
    init_estimator();
    init_tracker();
    init_detector_lite();
    matchingDataList = null;
    debugMode = false;
    matcher = null;
    estimator = null;
    tracker = null;
    detector = null;
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
          let featurePoints = data.featurePoints;
          if (data.inputData) {
            const detectionResult = detector.detect(data.inputData, { octavesToProcess: data.octavesToProcess });
            featurePoints = detectionResult.featurePoints;
          }
          for (let i = 0; i < interestedTargetIndexes.length; i++) {
            const matchingIndex = interestedTargetIndexes[i];
            const { keyframeIndex, screenCoords: screenCoords2, worldCoords: worldCoords2, debugExtra } = matcher.matchDetection(
              matchingDataList[matchingIndex],
              featurePoints,
              data.expectedScale
            );
            matchedDebugExtra = debugExtra;
            if (keyframeIndex !== -1) {
              const modelViewTransform2 = estimator.estimate({ screenCoords: screenCoords2, worldCoords: worldCoords2 });
              if (modelViewTransform2) {
                matchedTargetIndex = matchingIndex;
                matchedModelViewTransform = modelViewTransform2;
                matchedScreenCoords = screenCoords2;
                matchedWorldCoords = worldCoords2;
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
            featurePoints,
            debugExtra: matchedDebugExtra
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
            stabilities
            // Stability-based weights
          });
          postMessage({
            type: "trackUpdateDone",
            modelViewTransform: finalModelViewTransform
          });
          break;
        case "dispose":
          close();
          break;
        default:
          throw new Error(`Invalid message type '${data.type}'`);
      }
    };
  }
});

// src/runtime/controller.ts
init_tracker();

// src/core/input-loader.js
var InputLoader = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grayscaleBuffer = new Uint8Array(width * height);
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      this.context = canvas.getContext("2d", { willReadFrequently: true, alpha: false });
    }
  }
  /**
   * Carga una imagen o video y devuelve los datos en escala de grises
   * @param {HTMLVideoElement|HTMLImageElement|ImageData|Uint8Array} input - La fuente de entrada
   * @returns {Uint8Array} Datos de imagen en escala de grises (width * height)
   */
  loadInput(input) {
    if (input instanceof Uint8Array && input.length === this.width * this.height) {
      return input;
    }
    if (typeof ImageData !== "undefined" && input instanceof ImageData) {
      this._convertToGrayscale(input.data, input.width, input.height);
      return this.grayscaleBuffer;
    }
    if (this.context) {
      this.context.clearRect(0, 0, this.width, this.height);
      const isInputRotated = input.width === this.height && input.height === this.width;
      const inputW = isInputRotated ? input.height : input.width;
      const inputH = isInputRotated ? input.width : input.height;
      const inputAspect = inputW / inputH;
      const canvasAspect = this.width / this.height;
      let sx = 0, sy = 0, sw = inputW, sh = inputH;
      if (inputAspect > canvasAspect) {
        sw = inputH * canvasAspect;
        sx = (inputW - sw) / 2;
      } else if (inputAspect < canvasAspect) {
        sh = inputW / canvasAspect;
        sy = (inputH - sh) / 2;
      }
      if (isInputRotated) {
        this.context.save();
        this.context.translate(this.width / 2, this.height / 2);
        this.context.rotate(Math.PI / 2);
        this.context.drawImage(input, sx, sy, sw, sh, -this.height / 2, -this.width / 2, this.height, this.width);
        this.context.restore();
      } else {
        this.context.drawImage(input, sx, sy, sw, sh, 0, 0, this.width, this.height);
      }
      const imageData = this.context.getImageData(0, 0, this.width, this.height);
      this._convertToGrayscale(imageData.data, this.width, this.height);
      return this.grayscaleBuffer;
    }
    if (input.data && input.data instanceof Uint8Array) {
      this._convertToGrayscale(input.data, input.width || this.width, input.height || this.height);
      return this.grayscaleBuffer;
    }
    throw new Error("Input no soportado o entorno sin Canvas");
  }
  /**
   * Convierte datos RGBA a escala de grises optimizada (reutilizando buffer)
   */
  _convertToGrayscale(rgbaData, width, height) {
    const grayscale = this.grayscaleBuffer;
    const len = width * height;
    for (let i = 0; i < len; i++) {
      const offset = i << 2;
      grayscale[i] = rgbaData[offset] * 77 + rgbaData[offset + 1] * 150 + rgbaData[offset + 2] * 29 >> 8;
    }
  }
};

// src/core/features/feature-manager.ts
var FeatureManager = class {
  features = [];
  addFeature(feature) {
    this.features.push(feature);
  }
  getFeature(id) {
    return this.features.find((f) => f.id === id);
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
};

// src/libs/one-euro-filter.js
var LowPassFilter = class {
  constructor(alpha, initval = 0) {
    this.y = initval;
    this.s = initval;
    this.alpha = alpha;
  }
  setAlpha(alpha) {
    if (alpha <= 0 || alpha > 1) {
      return;
    }
    this.alpha = alpha;
  }
  filter(value) {
    this.y = value;
    this.s = this.alpha * value + (1 - this.alpha) * this.s;
    return this.s;
  }
  filterWithAlpha(value, alpha) {
    this.setAlpha(alpha);
    return this.filter(value);
  }
  lastValue() {
    return this.y;
  }
};
var OneEuroFilter = class {
  constructor({ minCutOff = 1, beta = 0, dCutOff = 1 }) {
    this.minCutOff = minCutOff;
    this.beta = beta;
    this.dCutOff = dCutOff;
    this.x = null;
    this.dx = null;
    this.lastTime = null;
  }
  _alpha(cutoff, te) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / te);
  }
  reset() {
    this.lastTime = null;
    this.x = null;
    this.dx = null;
  }
  filter(time, value) {
    if (this.lastTime === null || this.x === null) {
      this.lastTime = time;
      this.x = value.map((v) => new LowPassFilter(this._alpha(this.minCutOff, 1), v));
      this.dx = value.map((v) => new LowPassFilter(this._alpha(this.dCutOff, 1), 0));
      return value;
    }
    const te = (time - this.lastTime) / 1e3;
    if (te <= 0) return value;
    this.lastTime = time;
    const filteredValue = [];
    for (let i = 0; i < value.length; i++) {
      const edvalue = (value[i] - this.x[i].lastValue()) / te;
      const alpha_d = this._alpha(this.dCutOff, te);
      const edvalue_filtered = this.dx[i].filterWithAlpha(edvalue, alpha_d);
      const cutoff = this.minCutOff + this.beta * Math.abs(edvalue_filtered);
      const alpha = this._alpha(cutoff, te);
      filteredValue[i] = this.x[i].filterWithAlpha(value[i], alpha);
    }
    return filteredValue;
  }
};

// src/core/features/one-euro-filter-feature.ts
var OneEuroFilterFeature = class {
  id = "one-euro-filter";
  name = "One Euro Filter";
  description = "Smooths the tracking matrix to reduce jitter using a One Euro Filter.";
  enabled = true;
  filters = [];
  minCutOff;
  beta;
  constructor(minCutOff = 0.5, beta = 0.1) {
    this.minCutOff = minCutOff;
    this.beta = beta;
  }
  init(context) {
  }
  getFilter(targetIndex) {
    if (!this.filters[targetIndex]) {
      this.filters[targetIndex] = new OneEuroFilter({
        minCutOff: this.minCutOff,
        beta: this.beta
      });
    }
    return this.filters[targetIndex];
  }
  filterWorldMatrix(targetIndex, worldMatrix, context) {
    if (!this.enabled) return worldMatrix;
    const filter = this.getFilter(targetIndex);
    const stability = context?.stability ?? 1;
    const dynamicMinCutOff = this.minCutOff * (0.05 + Math.pow(stability, 2) * 0.95);
    filter.minCutOff = dynamicMinCutOff;
    filter.beta = this.beta;
    return filter.filter(Date.now(), worldMatrix);
  }
  onUpdate(data) {
    if (data.type === "reset" && data.targetIndex !== void 0) {
      this.filters[data.targetIndex]?.reset();
    }
  }
};

// src/core/features/temporal-filter-feature.ts
var TemporalFilterFeature = class {
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
        trackMiss: 0
      };
    }
    return this.states[targetIndex];
  }
  shouldShow(targetIndex, isTracking) {
    if (!this.enabled) return isTracking;
    const state = this.getState(targetIndex);
    if (!state.showing) {
      if (isTracking) {
        state.trackMiss = 0;
        state.trackCount += 1;
        if (state.trackCount > this.warmupTolerance) {
          state.showing = true;
          this.onToggleShowing?.(targetIndex, true);
        }
      } else {
        state.trackCount = 0;
      }
    } else {
      if (!isTracking) {
        state.trackCount = 0;
        state.trackMiss += 1;
        if (state.trackMiss > this.missTolerance) {
          state.showing = false;
          this.onToggleShowing?.(targetIndex, false);
        }
      } else {
        state.trackMiss = 0;
      }
    }
    return state.showing;
  }
};

// src/core/features/auto-rotation-feature.ts
var AutoRotationFeature = class {
  id = "auto-rotation";
  name = "Auto Rotation Matrix";
  description = "Automatically adjusts the world matrix if the input video is rotated (e.g. portrait mode).";
  enabled = true;
  inputWidth = 0;
  inputHeight = 0;
  init(context) {
    this.inputWidth = context.inputWidth;
    this.inputHeight = context.inputHeight;
  }
  filterWorldMatrix(targetIndex, worldMatrix) {
    if (!this.enabled) return worldMatrix;
    return worldMatrix;
  }
  // We might need a way to pass the 'currentInput' to the feature.
  // Actually, the controller can just call this if it detects rotation.
  rotate(m) {
    return [
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
      m[15]
    ];
  }
};

// src/runtime/controller.ts
init_detector_lite();
init_protocol();
init_constants();
var ControllerWorker;
var getControllerWorker = async () => {
  if (typeof Worker === "undefined") return null;
  try {
    const workerModule = await Promise.resolve().then(() => (init_controller_worker(), controller_worker_exports));
    return workerModule.default;
  } catch (e) {
    return null;
  }
};
ControllerWorker = await getControllerWorker();
var DEFAULT_FILTER_CUTOFF = AR_CONFIG.ONE_EURO_FILTER_CUTOFF;
var DEFAULT_FILTER_BETA = AR_CONFIG.ONE_EURO_FILTER_BETA;
var DEFAULT_WARMUP_TOLERANCE = AR_CONFIG.WARMUP_TOLERANCE;
var DEFAULT_MISS_TOLERANCE = AR_CONFIG.MISS_TOLERANCE;
var WORKER_TIMEOUT_MS = 1e3;
var loopIdCounter = 0;
var Controller = class {
  inputWidth;
  inputHeight;
  maxTrack = 1;
  inputLoader;
  markerDimensions = null;
  onUpdate;
  debugMode;
  processingVideo = false;
  interestedTargetIndex = -1;
  trackingStates = [];
  worker;
  projectionTransform;
  projectionMatrix;
  tracker = null;
  matchingDataList;
  workerMatchDone = null;
  workerTrackDone = null;
  workerFullTrackDone = null;
  mainThreadMatcher;
  mainThreadEstimator;
  featureManager;
  fullDetector = null;
  constructor({
    inputWidth,
    inputHeight,
    onUpdate = null,
    debugMode: debugMode2 = false,
    maxTrack,
    warmupTolerance = null,
    missTolerance = null,
    filterMinCF = null,
    filterBeta = null,
    worker = null
  }) {
    this.inputWidth = inputWidth;
    this.inputHeight = inputHeight;
    if (maxTrack !== void 0) {
      this.maxTrack = maxTrack;
    }
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
    this.inputLoader = new InputLoader(this.inputWidth, this.inputHeight);
    this.onUpdate = onUpdate;
    this.debugMode = debugMode2;
    this.worker = worker;
    if (this.worker) this._setupWorkerListener();
    this.fullDetector = new DetectorLite(this.inputWidth, this.inputHeight, {
      useLSH: AR_CONFIG.USE_LSH,
      maxFeaturesPerBucket: AR_CONFIG.MAX_FEATURES_PER_BUCKET
    });
    this.featureManager.init({
      inputWidth: this.inputWidth,
      inputHeight: this.inputHeight,
      projectionTransform: [],
      // Will be set below
      debugMode: this.debugMode
    });
    const near = AR_CONFIG.DEFAULT_NEAR;
    const far = AR_CONFIG.DEFAULT_FAR;
    const fovy = AR_CONFIG.DEFAULT_FOVY * Math.PI / 180;
    const f = this.inputHeight / 2 / Math.tan(fovy / 2);
    this.projectionTransform = [
      [f, 0, this.inputWidth / 2],
      [0, f, this.inputHeight / 2],
      [0, 0, 1]
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
      near,
      far
    });
  }
  _setupWorkerListener() {
    if (!this.worker) return;
    this.worker.onmessage = (e) => {
      if (e.data.type === "matchDone" && this.workerMatchDone !== null) {
        this.workerMatchDone(e.data);
      }
      if (e.data.type === "trackDone" && this.workerFullTrackDone !== null) {
        this.workerFullTrackDone(e.data);
      }
      if (e.data.type === "trackUpdateDone" && this.workerTrackDone !== null) {
        this.workerTrackDone(e.data);
      }
    };
  }
  _ensureWorker() {
    if (this.worker) return;
    if (ControllerWorker && typeof Worker !== "undefined") {
      this.worker = new ControllerWorker();
      this._setupWorkerListener();
    }
  }
  async addImageTargets(fileURLs) {
    const urls = Array.isArray(fileURLs) ? fileURLs : [fileURLs];
    const buffers = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url);
        return response.arrayBuffer();
      })
    );
    return this.addImageTargetsFromBuffers(buffers);
  }
  addImageTargetsFromBuffers(buffers) {
    const allTrackingData = [];
    const allMatchingData = [];
    const allDimensions = [];
    for (const buffer of buffers) {
      const result = decodeTaar(buffer);
      const dataList = result.dataList || [];
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
      this.debugMode
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
        trackingDataList: allTrackingData,
        markerDimensions: allDimensions
      });
    }
    this.markerDimensions = allDimensions;
    this.matchingDataList = allMatchingData;
    this.maxTrack = allDimensions.length;
    return { dimensions: allDimensions, matchingDataList: allMatchingData, trackingDataList: allTrackingData };
  }
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
    this.fullDetector?.detect(inputData);
    this.tracker.dummyRun(inputData);
  }
  getProjectionMatrix() {
    return this.projectionMatrix;
  }
  getRotatedZ90Matrix(m) {
    return [
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
      m[15]
    ];
  }
  getWorldMatrix(modelViewTransform, targetIndex) {
    return this._glModelViewMatrix(modelViewTransform, targetIndex);
  }
  async _detectAndMatch(inputData, targetIndexes) {
    let predictedScale = void 0;
    for (const state of this.trackingStates) {
      if (state.isTracking && state.currentModelViewTransform) {
        const m = state.currentModelViewTransform;
        predictedScale = Math.sqrt(m[0][0] ** 2 + m[1][0] ** 2 + m[2][0] ** 2);
        break;
      }
    }
    const { targetIndex, modelViewTransform, screenCoords, worldCoords, featurePoints } = await this._workerMatch(
      null,
      // No feature points, worker will detect from inputData
      targetIndexes,
      inputData,
      predictedScale
    );
    return { targetIndex, modelViewTransform, screenCoords, worldCoords, featurePoints };
  }
  async _trackAndUpdate(inputData, lastModelViewTransform, targetIndex) {
    const { worldCoords, screenCoords, reliabilities, indices = [], octaveIndex = 0, deformedMesh } = await this._workerTrack(
      inputData,
      lastModelViewTransform,
      targetIndex
    );
    if (!worldCoords || worldCoords.length === 0) {
      return { modelViewTransform: null, screenCoords: [], reliabilities: [], stabilities: [], deformedMesh: null };
    }
    const state = this.trackingStates[targetIndex];
    if (!state.pointStabilities) state.pointStabilities = [];
    if (!state.lastScreenCoords) state.lastScreenCoords = [];
    if (!state.pointStabilities[octaveIndex]) {
      const numPoints = this.tracker.prebuiltData[targetIndex][octaveIndex].px.length;
      state.pointStabilities[octaveIndex] = new Float32Array(numPoints).fill(0);
      state.lastScreenCoords[octaveIndex] = new Array(numPoints).fill(null);
    }
    const stabilities = state.pointStabilities[octaveIndex];
    const lastCoords = state.lastScreenCoords[octaveIndex];
    for (let i = 0; i < stabilities.length; i++) {
      const isCurrentlyTracked = indices.includes(i);
      if (isCurrentlyTracked) {
        const idxInResult = indices.indexOf(i);
        stabilities[i] = Math.min(1, stabilities[i] + 0.4);
        lastCoords[i] = screenCoords[idxInResult];
      } else {
        stabilities[i] = Math.max(0, stabilities[i] - 0.08);
      }
    }
    const finalScreenCoords = [];
    const finalReliabilities = [];
    const finalStabilities = [];
    const finalWorldCoords = [];
    for (let i = 0; i < stabilities.length; i++) {
      if (stabilities[i] > 0) {
        const isCurrentlyTracked = indices.includes(i);
        finalScreenCoords.push({
          x: lastCoords[i].x,
          y: lastCoords[i].y,
          id: i
          // Unique index from tracker
        });
        finalStabilities.push(stabilities[i]);
        if (isCurrentlyTracked) {
          const idxInResult = indices.indexOf(i);
          finalReliabilities.push(reliabilities[idxInResult]);
          finalWorldCoords.push(worldCoords[idxInResult]);
        } else {
          finalReliabilities.push(0);
        }
      }
    }
    const isWarmup = state.trackCount < 15;
    const numTracked = finalWorldCoords.length;
    const minPoints = isWarmup ? 4 : 5;
    if (numTracked < minPoints) {
      return {
        modelViewTransform: null,
        screenCoords: finalScreenCoords,
        reliabilities: finalReliabilities,
        stabilities: finalStabilities
      };
    }
    state.trackCount++;
    const modelViewTransform = await this._workerTrackUpdate(lastModelViewTransform, {
      worldCoords: finalWorldCoords,
      screenCoords: finalWorldCoords.map((_, i) => {
        const globalIdx = indices[i];
        return lastCoords[globalIdx];
      }),
      stabilities: finalWorldCoords.map((_, i) => {
        const globalIdx = indices[i];
        return stabilities[globalIdx];
      }),
      deformedMesh
    });
    return {
      modelViewTransform,
      screenCoords: finalScreenCoords,
      reliabilities: finalReliabilities,
      stabilities: finalStabilities,
      deformedMesh,
      octaveIndex
      // Pass this up for the orchestrator
    };
  }
  processVideo(input) {
    if (this.processingVideo) return;
    this.processingVideo = true;
    const currentLoopId = ++loopIdCounter;
    this.trackingStates = [];
    for (let i = 0; i < (this.markerDimensions?.length || 0); i++) {
      this.trackingStates.push({
        showing: false,
        isTracking: false,
        currentModelViewTransform: null,
        trackCount: 0,
        trackMiss: 0
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
          const { targetIndex: matchedTargetIndex, modelViewTransform, featurePoints } = await this._detectAndMatch(inputData, matchingIndexes);
          if (matchedTargetIndex !== -1) {
            this.trackingStates[matchedTargetIndex].isTracking = true;
            this.trackingStates[matchedTargetIndex].currentModelViewTransform = modelViewTransform;
          }
          this.onUpdate && this.onUpdate({ type: "featurePoints", featurePoints });
        }
        for (let i = 0; i < this.trackingStates.length; i++) {
          const trackingState = this.trackingStates[i];
          if (trackingState.isTracking) {
            const result = await this._trackAndUpdate(
              inputData,
              trackingState.currentModelViewTransform,
              i
            );
            if (result === null || result.modelViewTransform === null) {
              trackingState.isTracking = false;
              trackingState.screenCoords = result?.screenCoords || [];
              trackingState.reliabilities = result?.reliabilities || [];
              trackingState.stabilities = result?.stabilities || [];
            } else {
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
            this.featureManager.notifyUpdate({ type: "reset", targetIndex: i });
          }
          if (trackingState.showing || trackingState.screenCoords && trackingState.screenCoords.length > 0 || wasShowing && !trackingState.showing) {
            const worldMatrix = trackingState.showing ? this._glModelViewMatrix(trackingState.currentModelViewTransform, i) : null;
            let finalMatrix = null;
            if (worldMatrix) {
              const stabilities = trackingState.stabilities || [];
              const avgStability = stabilities.length > 0 ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length : 0;
              const filteredMatrix = this.featureManager.applyWorldMatrixFilters(i, worldMatrix, { stability: avgStability });
              trackingState.trackingMatrix = filteredMatrix;
              finalMatrix = [...filteredMatrix];
              const isInputRotated = input.width === this.inputHeight && input.height === this.inputWidth;
              if (isInputRotated) {
                const rotationFeature = this.featureManager.getFeature("auto-rotation");
                if (rotationFeature) {
                  finalMatrix = rotationFeature.rotate(finalMatrix);
                }
              }
            }
            this.onUpdate && this.onUpdate({
              type: "updateMatrix",
              targetIndex: i,
              worldMatrix: finalMatrix,
              modelViewTransform: trackingState.currentModelViewTransform,
              screenCoords: trackingState.screenCoords,
              reliabilities: trackingState.reliabilities,
              stabilities: trackingState.stabilities,
              deformedMesh: trackingState.deformedMesh
            });
          }
        }
        this.onUpdate && this.onUpdate({ type: "processDone" });
        if (typeof requestAnimationFrame !== "undefined") {
          await new Promise(requestAnimationFrame);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 16));
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
    const { featurePoints } = this.fullDetector.detect(inputData);
    return { featurePoints, debugExtra: {} };
  }
  async match(featurePoints, targetIndex) {
    const { targetIndex: matchedTargetIndex, modelViewTransform, screenCoords, worldCoords, debugExtra } = await this._workerMatch(featurePoints, [
      targetIndex
    ]);
    return { targetIndex: matchedTargetIndex, modelViewTransform, screenCoords, worldCoords, debugExtra };
  }
  async track(input, modelViewTransform, targetIndex) {
    const inputData = this.inputLoader.loadInput(input);
    return this.tracker.track(inputData, modelViewTransform, targetIndex);
  }
  async trackUpdate(modelViewTransform, trackFeatures) {
    if (trackFeatures.worldCoords.length < 4) return null;
    return this._workerTrackUpdate(modelViewTransform, trackFeatures);
  }
  _workerMatch(featurePoints, targetIndexes, inputData = null, expectedScale) {
    return new Promise((resolve) => {
      if (!this.worker) {
        let fpPromise;
        if (!featurePoints && inputData) {
          fpPromise = Promise.resolve(this.fullDetector.detect(inputData).featurePoints);
        } else {
          fpPromise = Promise.resolve(featurePoints);
        }
        fpPromise.then((fp) => {
          this._matchOnMainThread(fp, targetIndexes, expectedScale).then(resolve);
        }).catch(() => resolve({ targetIndex: -1 }));
        return;
      }
      const timeout = setTimeout(() => {
        this.workerMatchDone = null;
        resolve({ targetIndex: -1 });
      }, WORKER_TIMEOUT_MS);
      this.workerMatchDone = (data) => {
        clearTimeout(timeout);
        this.workerMatchDone = null;
        resolve({
          targetIndex: data.targetIndex,
          modelViewTransform: data.modelViewTransform,
          screenCoords: data.screenCoords,
          worldCoords: data.worldCoords,
          featurePoints: data.featurePoints,
          debugExtra: data.debugExtra
        });
      };
      if (inputData) {
        this.worker.postMessage({ type: "match", inputData, targetIndexes, expectedScale });
      } else {
        this.worker.postMessage({ type: "match", featurePoints, targetIndexes, expectedScale });
      }
    });
  }
  _workerTrack(inputData, lastModelViewTransform, targetIndex) {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(this.tracker.track(inputData, lastModelViewTransform, targetIndex));
        return;
      }
      const timeout = setTimeout(() => {
        this.workerFullTrackDone = null;
        resolve({ worldCoords: [], screenCoords: [], reliabilities: [] });
      }, WORKER_TIMEOUT_MS);
      this.workerFullTrackDone = (data) => {
        clearTimeout(timeout);
        this.workerFullTrackDone = null;
        resolve(data);
      };
      this.worker.postMessage({
        type: "track",
        inputData,
        lastModelViewTransform,
        targetIndex
      });
    });
  }
  async _matchOnMainThread(featurePoints, targetIndexes, expectedScale) {
    if (!this.mainThreadMatcher) {
      const { Matcher: Matcher2 } = await Promise.resolve().then(() => (init_matcher(), matcher_exports));
      const { Estimator: Estimator2 } = await Promise.resolve().then(() => (init_estimator(), estimator_exports));
      this.mainThreadMatcher = new Matcher2(this.inputWidth, this.inputHeight, this.debugMode);
      this.mainThreadEstimator = new Estimator2(this.projectionTransform);
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
        expectedScale
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
      debugExtra: matchedDebugExtra
    };
  }
  _workerTrackUpdate(modelViewTransform, trackingFeatures) {
    return new Promise((resolve) => {
      if (!this.worker) {
        this._trackUpdateOnMainThread(modelViewTransform, trackingFeatures).then(resolve).catch(() => resolve(null));
        return;
      }
      const timeout = setTimeout(() => {
        this.workerTrackDone = null;
        resolve(null);
      }, WORKER_TIMEOUT_MS);
      this.workerTrackDone = (data) => {
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
  async _trackUpdateOnMainThread(modelViewTransform, trackingFeatures) {
    if (!this.mainThreadEstimator) {
      const { Estimator: Estimator2 } = await Promise.resolve().then(() => (init_estimator(), estimator_exports));
      this.mainThreadEstimator = new Estimator2(this.projectionTransform);
    }
    const { worldCoords, screenCoords, stabilities } = trackingFeatures;
    return this.mainThreadEstimator.refineEstimate({
      initialModelViewTransform: modelViewTransform,
      worldCoords,
      screenCoords,
      stabilities
    });
  }
  _glModelViewMatrix(modelViewTransform, targetIndex) {
    return [
      modelViewTransform[0][0],
      -modelViewTransform[1][0],
      -modelViewTransform[2][0],
      0,
      modelViewTransform[0][1],
      -modelViewTransform[1][1],
      -modelViewTransform[2][1],
      0,
      modelViewTransform[0][2],
      -modelViewTransform[1][2],
      -modelViewTransform[2][2],
      0,
      modelViewTransform[0][3],
      -modelViewTransform[1][3],
      -modelViewTransform[2][3],
      1
    ];
  }
  _glProjectionMatrix({ projectionTransform, width, height, near, far }) {
    const proj = [
      [2 * projectionTransform[0][0] / width, 0, -(2 * projectionTransform[0][2] / width - 1), 0],
      [0, 2 * projectionTransform[1][1] / height, -(2 * projectionTransform[1][2] / height - 1), 0],
      [0, 0, -(far + near) / (far - near), -2 * far * near / (far - near)],
      [0, 0, -1, 0]
    ];
    const projMatrix = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        projMatrix.push(proj[j][i]);
      }
    }
    return projMatrix;
  }
};

// src/core/perception/foveal-attention.js
var FovealAttention = class {
  /**
   * @param {number} width - Input image width
   * @param {number} height - Input image height
   * @param {Object} config - Configuration
   */
  constructor(width, height, config) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.minDim = Math.min(width, height);
    this.foveaRadius = Math.floor(this.minDim * config.FOVEA_RADIUS_RATIO);
    this.parafoveaRadius = Math.floor(this.minDim * config.PARAFOVEA_RADIUS_RATIO);
    this._initBuffers();
  }
  /**
   * Initialize pre-allocated extraction buffers
   * @private
   */
  _initBuffers() {
    const foveaDiam = this.foveaRadius * 2;
    this.foveaBuffer = new Uint8Array(foveaDiam * foveaDiam);
    const parafoveaDiam = this.parafoveaRadius * 2;
    const parafoveaScaled = Math.ceil(parafoveaDiam * this.config.PARAFOVEA_RESOLUTION);
    this.parafoveaBuffer = new Uint8Array(parafoveaScaled * parafoveaScaled);
    const periphW = Math.ceil(this.width * this.config.PERIPHERY_RESOLUTION);
    const periphH = Math.ceil(this.height * this.config.PERIPHERY_RESOLUTION);
    this.peripheryBuffer = new Uint8Array(periphW * periphH);
    this.peripheryDims = { width: periphW, height: periphH };
    this._buildCircularMask();
  }
  /**
   * Build a circular mask for foveal extraction
   * @private
   */
  _buildCircularMask() {
    const r = this.foveaRadius;
    const size = r * 2;
    this.circularMask = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - r;
        const dy = y - r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.circularMask[y * size + x] = dist <= r ? 1 : 0;
      }
    }
  }
  /**
   * Extract attention region at specified center
   * 
   * @param {Uint8Array} inputData - Grayscale input image
   * @param {number} centerX - X coordinate of attention center
   * @param {number} centerY - Y coordinate of attention center
   * @param {number} priority - Priority level (0=highest)
   * @returns {AttentionRegion} Extracted region
   */
  extract(inputData, centerX, centerY, priority = 0) {
    centerX = Math.max(this.foveaRadius, Math.min(this.width - this.foveaRadius - 1, centerX));
    centerY = Math.max(this.foveaRadius, Math.min(this.height - this.foveaRadius - 1, centerY));
    if (priority === 0) {
      return this._extractFovea(inputData, centerX, centerY);
    } else if (priority === 1) {
      return this._extractParafovea(inputData, centerX, centerY);
    } else {
      return this._extractPeriphery(inputData);
    }
  }
  /**
   * Extract foveal region at full resolution
   * @private
   */
  _extractFovea(inputData, cx, cy) {
    const r = this.foveaRadius;
    const diam = r * 2;
    const buffer = this.foveaBuffer;
    let idx = 0;
    let validPixels = 0;
    for (let dy = -r; dy < r; dy++) {
      const y = cy + dy;
      const rowStart = y * this.width;
      for (let dx = -r; dx < r; dx++) {
        const maskIdx = (dy + r) * diam + (dx + r);
        if (this.circularMask[maskIdx]) {
          const x = cx + dx;
          buffer[idx] = inputData[rowStart + x];
          validPixels++;
        } else {
          buffer[idx] = 0;
        }
        idx++;
      }
    }
    return {
      x: cx,
      y: cy,
      radius: r,
      resolution: this.config.FOVEA_RESOLUTION,
      data: buffer,
      width: diam,
      height: diam,
      pixelCount: validPixels,
      type: "fovea",
      // Transform helpers
      toOriginalCoord: (localX, localY) => ({
        x: cx - r + localX,
        y: cy - r + localY
      }),
      toLocalCoord: (origX, origY) => ({
        x: origX - (cx - r),
        y: origY - (cy - r)
      })
    };
  }
  /**
   * Extract parafoveal region at half resolution
   * @private
   */
  _extractParafovea(inputData, cx, cy) {
    const r = this.parafoveaRadius;
    const res = this.config.PARAFOVEA_RESOLUTION;
    const scaledR = Math.ceil(r * res);
    const scaledDiam = scaledR * 2;
    const buffer = this.parafoveaBuffer;
    const step = Math.round(1 / res);
    let idx = 0;
    let validPixels = 0;
    for (let sy = 0; sy < scaledDiam; sy++) {
      const y = cy - r + Math.floor(sy / res);
      if (y < 0 || y >= this.height) continue;
      const rowStart = y * this.width;
      for (let sx = 0; sx < scaledDiam; sx++) {
        const x = cx - r + Math.floor(sx / res);
        if (x < 0 || x >= this.width) {
          buffer[idx++] = 0;
          continue;
        }
        buffer[idx++] = inputData[rowStart + x];
        validPixels++;
      }
    }
    return {
      x: cx,
      y: cy,
      radius: r,
      resolution: res,
      data: buffer,
      width: scaledDiam,
      height: scaledDiam,
      pixelCount: validPixels,
      type: "parafovea",
      toOriginalCoord: (localX, localY) => ({
        x: cx - r + localX / res,
        y: cy - r + localY / res
      }),
      toLocalCoord: (origX, origY) => ({
        x: (origX - (cx - r)) * res,
        y: (origY - (cy - r)) * res
      })
    };
  }
  /**
   * Extract periphery at quarter resolution (motion detection only)
   * @private
   */
  _extractPeriphery(inputData) {
    const res = this.config.PERIPHERY_RESOLUTION;
    const outW = this.peripheryDims.width;
    const outH = this.peripheryDims.height;
    const buffer = this.peripheryBuffer;
    const step = Math.round(1 / res);
    let idx = 0;
    for (let y = 0; y < this.height; y += step) {
      const rowStart = y * this.width;
      for (let x = 0; x < this.width; x += step) {
        if (idx < buffer.length) {
          buffer[idx++] = inputData[rowStart + x];
        }
      }
    }
    return {
      x: this.width / 2,
      y: this.height / 2,
      radius: Math.max(this.width, this.height) / 2,
      resolution: res,
      data: buffer,
      width: outW,
      height: outH,
      pixelCount: outW * outH,
      type: "periphery",
      toOriginalCoord: (localX, localY) => ({
        x: localX / res,
        y: localY / res
      }),
      toLocalCoord: (origX, origY) => ({
        x: origX * res,
        y: origY * res
      })
    };
  }
  /**
   * Get combined multi-resolution representation
   * Uses fovea at center, parafovea around it, periphery for the rest
   * 
   * @param {Uint8Array} inputData - Input image
   * @param {number} cx - Fovea center X
   * @param {number} cy - Fovea center Y
   * @returns {Object} Multi-resolution representation
   */
  extractMultiResolution(inputData, cx, cy) {
    return {
      fovea: this._extractFovea(inputData, cx, cy),
      parafovea: this._extractParafovea(inputData, cx, cy),
      periphery: this._extractPeriphery(inputData),
      center: { x: cx, y: cy },
      totalPixels: this._computeTotalPixels(),
      originalPixels: this.width * this.height
    };
  }
  /**
   * Compute total pixels in multi-resolution representation
   * @private
   */
  _computeTotalPixels() {
    const foveaPixels = Math.PI * this.foveaRadius ** 2;
    const parafoveaPixels = Math.PI * this.parafoveaRadius ** 2 * this.config.PARAFOVEA_RESOLUTION ** 2;
    const peripheryPixels = this.peripheryDims.width * this.peripheryDims.height;
    return Math.ceil(foveaPixels + parafoveaPixels + peripheryPixels);
  }
  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    this.foveaRadius = Math.floor(this.minDim * config.FOVEA_RADIUS_RATIO);
    this.parafoveaRadius = Math.floor(this.minDim * config.PARAFOVEA_RADIUS_RATIO);
    this._initBuffers();
  }
};

// src/core/perception/saccadic-controller.js
var SaccadicController = class {
  /**
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {Object} config - Configuration
   */
  constructor(width, height, config) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.recentTargets = [];
    this.inhibitionRadius = Math.min(width, height) * 0.1;
    this.velocityHistory = [];
    this.lastCenter = { x: width / 2, y: height / 2 };
    this.gridCells = this._buildCoverageGrid(3, 3);
    this.lastVisitedCell = 4;
    this.lastSaccadeTime = 0;
    this.saccadeCount = 0;
  }
  /**
   * Build a grid for systematic coverage during tracking loss
   * @private
   */
  _buildCoverageGrid(rows, cols) {
    const cells = [];
    const cellW = this.width / cols;
    const cellH = this.height / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          x: cellW * (c + 0.5),
          y: cellH * (r + 0.5),
          index: r * cols + c,
          lastVisit: 0
        });
      }
    }
    return cells;
  }
  /**
   * Compute saccade targets based on current state
   * 
   * @param {Object} saliency - Saliency map result
   * @param {Object} currentFovea - Current fovea center {x, y}
   * @param {Object} trackingState - Current tracking state (optional)
   * @returns {SaccadeTarget[]} Priority-ordered list of targets
   */
  computeTargets(saliency, currentFovea, trackingState = null) {
    const targets2 = [];
    const maxTargets = this.config.MAX_SACCADES_PER_FRAME;
    if (trackingState && trackingState.isTracking) {
      const predicted = this._predictTrackingCenter(trackingState);
      if (predicted) {
        targets2.push({
          x: predicted.x,
          y: predicted.y,
          priority: 0,
          reason: "tracking_prediction",
          saliency: 1
        });
      }
    }
    if (saliency && saliency.peaks) {
      for (const peak of saliency.peaks) {
        if (targets2.length >= maxTargets) break;
        if (this._isInhibited(peak.x, peak.y, targets2)) continue;
        if (peak.value > this.config.SALIENCY_THRESHOLD) {
          targets2.push({
            x: peak.x,
            y: peak.y,
            priority: targets2.length,
            reason: "saliency_peak",
            saliency: peak.value
          });
        }
      }
    }
    if (!trackingState?.isTracking && targets2.length < maxTargets) {
      const gridTarget = this._getNextGridCell();
      if (gridTarget && !this._isInhibited(gridTarget.x, gridTarget.y, targets2)) {
        targets2.push({
          x: gridTarget.x,
          y: gridTarget.y,
          priority: targets2.length,
          reason: "grid_search",
          saliency: 0.5
        });
      }
    }
    if (targets2.length === 0) {
      targets2.push({
        x: currentFovea.x,
        y: currentFovea.y,
        priority: 0,
        reason: "maintain_position",
        saliency: 0.3
      });
    }
    this._updateHistory(targets2);
    return targets2;
  }
  /**
   * Predict center of tracking based on current state and velocity
   * @private
   */
  _predictTrackingCenter(trackingState) {
    if (!trackingState.worldMatrix) return null;
    const matrix2 = trackingState.worldMatrix;
    const cx = matrix2[12] || this.width / 2;
    const cy = matrix2[13] || this.height / 2;
    if (this.velocityHistory.length >= 2) {
      const vx = this._computeAverageVelocity("x");
      const vy = this._computeAverageVelocity("y");
      return {
        x: Math.max(0, Math.min(this.width - 1, cx + vx)),
        y: Math.max(0, Math.min(this.height - 1, cy + vy))
      };
    }
    return { x: cx, y: cy };
  }
  /**
   * Compute average velocity from history
   * @private
   */
  _computeAverageVelocity(axis) {
    if (this.velocityHistory.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < this.velocityHistory.length; i++) {
      sum += this.velocityHistory[i][axis] - this.velocityHistory[i - 1][axis];
    }
    return sum / (this.velocityHistory.length - 1);
  }
  /**
   * Check if a location is inhibited (too close to recent targets)
   * @private
   */
  _isInhibited(x, y, currentTargets) {
    const r2 = this.inhibitionRadius ** 2;
    for (const t of currentTargets) {
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy < r2) return true;
    }
    for (const t of this.recentTargets) {
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy < r2) return true;
    }
    return false;
  }
  /**
   * Get next grid cell for systematic search
   * @private
   */
  _getNextGridCell() {
    let oldest = this.gridCells[0];
    let oldestTime = Infinity;
    for (const cell of this.gridCells) {
      if (cell.lastVisit < oldestTime) {
        oldestTime = cell.lastVisit;
        oldest = cell;
      }
    }
    oldest.lastVisit = Date.now();
    return oldest;
  }
  /**
   * Update history with new targets
   * @private
   */
  _updateHistory(targets2) {
    this.recentTargets.push(...targets2);
    const maxHistory = this.config.MOTION_HISTORY_FRAMES * this.config.MAX_SACCADES_PER_FRAME;
    while (this.recentTargets.length > maxHistory) {
      this.recentTargets.shift();
    }
    if (targets2.length > 0) {
      this.velocityHistory.push({ x: targets2[0].x, y: targets2[0].y });
      while (this.velocityHistory.length > this.config.MOTION_HISTORY_FRAMES) {
        this.velocityHistory.shift();
      }
      this.lastCenter = { x: targets2[0].x, y: targets2[0].y };
    }
    this.saccadeCount += targets2.length;
    this.lastSaccadeTime = Date.now();
  }
  /**
   * Get the most likely location of interest based on history
   * @returns {Object} {x, y} of predicted location
   */
  getPredictedLocation() {
    if (this.velocityHistory.length >= 2) {
      const vx = this._computeAverageVelocity("x");
      const vy = this._computeAverageVelocity("y");
      return {
        x: Math.max(0, Math.min(this.width - 1, this.lastCenter.x + vx)),
        y: Math.max(0, Math.min(this.height - 1, this.lastCenter.y + vy))
      };
    }
    return this.lastCenter;
  }
  /**
   * Reset controller state
   */
  reset() {
    this.recentTargets = [];
    this.velocityHistory = [];
    this.lastCenter = { x: this.width / 2, y: this.height / 2 };
    this.saccadeCount = 0;
    for (const cell of this.gridCells) {
      cell.lastVisit = 0;
    }
  }
  /**
   * Update configuration
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    this.inhibitionRadius = Math.min(this.width, this.height) * 0.1;
  }
};

// src/core/perception/predictive-coding.js
var PredictiveCoding = class {
  /**
   * @param {number} width - Image width
   * @param {number} height - Image height  
   * @param {Object} config - Configuration
   */
  constructor(width, height, config) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.frameHistory = [];
    this.stateHistory = [];
    this.motionModel = {
      vx: 0,
      // Velocity X
      vy: 0,
      // Velocity Y
      vtheta: 0,
      // Angular velocity
      vscale: 0,
      // Scale velocity
      confidence: 0
      // Model confidence
    };
    this.blockSize = 8;
    this.blocksX = Math.ceil(width / this.blockSize);
    this.blocksY = Math.ceil(height / this.blockSize);
    this.blockMeans = new Float32Array(this.blocksX * this.blocksY);
    this.prevBlockMeans = new Float32Array(this.blocksX * this.blocksY);
    this.consecutiveSkips = 0;
    this.maxConsecutiveSkips = 10;
  }
  /**
   * Predict whether current frame can be skipped
   * 
   * @param {Uint8Array} inputData - Current frame grayscale data
   * @param {Object} trackingState - Current tracking state
   * @returns {Object} Prediction result
   */
  predict(inputData, trackingState) {
    if (this.frameHistory.length < 2) {
      return { canSkip: false, confidence: 0, reason: "insufficient_history" };
    }
    if (this.consecutiveSkips >= this.maxConsecutiveSkips) {
      return { canSkip: false, confidence: 0, reason: "forced_refresh" };
    }
    const changeLevel = this.getChangeLevel(inputData);
    const threshold = trackingState?.isTracking ? this.config.CHANGE_THRESHOLD : this.config.CHANGE_THRESHOLD * 0.5;
    const canSkip = changeLevel < threshold;
    const confidence = canSkip ? Math.min(1, (threshold - changeLevel) / threshold) : 0;
    let predictedState = null;
    if (canSkip && trackingState) {
      predictedState = this._predictState(trackingState);
    }
    if (canSkip) {
      this.consecutiveSkips++;
    }
    return {
      canSkip,
      confidence,
      changeLevel,
      predictedState,
      reason: canSkip ? "low_change" : "significant_change"
    };
  }
  /**
   * Compute change level between current and previous frame
   * Uses block-based comparison for efficiency
   * 
   * @param {Uint8Array} inputData - Current frame
   * @returns {number} Change level (0-1)
   */
  getChangeLevel(inputData) {
    if (this.frameHistory.length === 0) {
      return 1;
    }
    this._computeBlockMeans(inputData, this.blockMeans);
    let totalDiff = 0;
    let maxDiff = 0;
    const numBlocks = this.blocksX * this.blocksY;
    for (let i = 0; i < numBlocks; i++) {
      const diff = Math.abs(this.blockMeans[i] - this.prevBlockMeans[i]) / 255;
      totalDiff += diff;
      maxDiff = Math.max(maxDiff, diff);
    }
    const avgDiff = totalDiff / numBlocks;
    const changeLevel = avgDiff * 0.7 + maxDiff * 0.3;
    return Math.min(1, changeLevel);
  }
  /**
   * Compute mean intensity for each block
   * @private
   */
  _computeBlockMeans(data, output) {
    const bs = this.blockSize;
    const w = this.width;
    for (let by = 0; by < this.blocksY; by++) {
      const yStart = by * bs;
      const yEnd = Math.min(yStart + bs, this.height);
      for (let bx = 0; bx < this.blocksX; bx++) {
        const xStart = bx * bs;
        const xEnd = Math.min(xStart + bs, this.width);
        let sum = 0;
        let count = 0;
        for (let y = yStart; y < yEnd; y++) {
          const rowOffset = y * w;
          for (let x = xStart; x < xEnd; x++) {
            sum += data[rowOffset + x];
            count++;
          }
        }
        output[by * this.blocksX + bx] = sum / count;
      }
    }
  }
  /**
   * Predict next tracking state based on motion model
   * @private
   */
  _predictState(currentState) {
    if (!currentState.worldMatrix) return null;
    const matrix2 = currentState.worldMatrix;
    const predictedMatrix = new Float32Array(16);
    for (let i = 0; i < 16; i++) {
      predictedMatrix[i] = matrix2[i];
    }
    predictedMatrix[12] += this.motionModel.vx;
    predictedMatrix[13] += this.motionModel.vy;
    const scaleFactor = 1 + this.motionModel.vscale;
    predictedMatrix[0] *= scaleFactor;
    predictedMatrix[5] *= scaleFactor;
    predictedMatrix[10] *= scaleFactor;
    return {
      worldMatrix: predictedMatrix,
      isTracking: true,
      isPredicted: true,
      predictionConfidence: this.motionModel.confidence
    };
  }
  /**
   * Store frame for future prediction
   * 
   * @param {Uint8Array} inputData - Frame data
   * @param {Object} trackingState - Tracking state
   */
  storeFrame(inputData, trackingState) {
    for (let i = 0; i < this.blockMeans.length; i++) {
      this.prevBlockMeans[i] = this.blockMeans[i];
    }
    this._computeBlockMeans(inputData, this.blockMeans);
    if (trackingState?.worldMatrix) {
      this.stateHistory.push({
        timestamp: Date.now(),
        matrix: new Float32Array(trackingState.worldMatrix)
      });
      this._updateMotionModel();
      while (this.stateHistory.length > this.config.MOTION_HISTORY_FRAMES) {
        this.stateHistory.shift();
      }
    }
    this.consecutiveSkips = 0;
    this.frameHistory.push(Date.now());
    while (this.frameHistory.length > this.config.MOTION_HISTORY_FRAMES) {
      this.frameHistory.shift();
    }
  }
  /**
   * Update motion model from state history
   * @private
   */
  _updateMotionModel() {
    const history = this.stateHistory;
    if (history.length < 2) {
      this.motionModel.confidence = 0;
      return;
    }
    const n = history.length;
    const latest = history[n - 1].matrix;
    const prev = history[n - 2].matrix;
    const dt = (history[n - 1].timestamp - history[n - 2].timestamp) / 1e3;
    if (dt > 0) {
      this.motionModel.vx = (latest[12] - prev[12]) / dt * 0.016;
      this.motionModel.vy = (latest[13] - prev[13]) / dt * 0.016;
      const prevScale = (Math.abs(prev[0]) + Math.abs(prev[5])) / 2;
      const currScale = (Math.abs(latest[0]) + Math.abs(latest[5])) / 2;
      this.motionModel.vscale = (currScale - prevScale) / prevScale / dt * 0.016;
      if (history.length >= 3) {
        const older = history[n - 3].matrix;
        const expectedVx = (prev[12] - older[12]) / dt * 0.016;
        const expectedVy = (prev[13] - older[13]) / dt * 0.016;
        const errorX = Math.abs(this.motionModel.vx - expectedVx);
        const errorY = Math.abs(this.motionModel.vy - expectedVy);
        const error = Math.sqrt(errorX * errorX + errorY * errorY);
        this.motionModel.confidence = Math.max(0, 1 - error / 10);
      } else {
        this.motionModel.confidence = 0.5;
      }
    }
  }
  /**
   * Check if we're in a static scene (good candidate for aggressive skipping)
   * @returns {boolean} True if scene appears static
   */
  isStaticScene() {
    if (this.stateHistory.length < 3) return false;
    const velocity = Math.sqrt(
      this.motionModel.vx ** 2 + this.motionModel.vy ** 2
    );
    return velocity < 0.5 && Math.abs(this.motionModel.vscale) < 0.01;
  }
  /**
   * Reset prediction state
   */
  reset() {
    this.frameHistory = [];
    this.stateHistory = [];
    this.consecutiveSkips = 0;
    this.motionModel = {
      vx: 0,
      vy: 0,
      vtheta: 0,
      vscale: 0,
      confidence: 0
    };
    this.blockMeans.fill(0);
    this.prevBlockMeans.fill(0);
  }
  /**
   * Update configuration
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }
};

// src/core/perception/saliency-map.js
var SaliencyMap = class {
  /**
   * @param {number} width - Image width
   * @param {number} height - Image height
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.scale = 8;
    this.scaledW = Math.ceil(width / this.scale);
    this.scaledH = Math.ceil(height / this.scale);
    this.intensityMap = new Float32Array(this.scaledW * this.scaledH);
    this.contrastMap = new Float32Array(this.scaledW * this.scaledH);
    this.edgeMap = new Float32Array(this.scaledW * this.scaledH);
    this.saliencyBuffer = new Float32Array(this.scaledW * this.scaledH);
    this.maxPeaks = 5;
    this.suppressionRadius = Math.max(this.scaledW, this.scaledH) * 0.15;
  }
  /**
   * Compute saliency map for input image
   * 
   * @param {Uint8Array} inputData - Grayscale input image
   * @returns {Object} Saliency result with peaks
   */
  compute(inputData) {
    this._downsample(inputData);
    this._computeContrast();
    this._computeEdges();
    this._combineSaliency();
    const peaks = this._findPeaks();
    return {
      map: this.saliencyBuffer,
      width: this.scaledW,
      height: this.scaledH,
      peaks,
      maxSaliency: peaks.length > 0 ? peaks[0].value : 0
    };
  }
  /**
   * Downsample input to working resolution
   * @private
   */
  _downsample(inputData) {
    const s = this.scale;
    const w = this.width;
    for (let sy = 0; sy < this.scaledH; sy++) {
      const yStart = sy * s;
      const yEnd = Math.min(yStart + s, this.height);
      for (let sx = 0; sx < this.scaledW; sx++) {
        const xStart = sx * s;
        const xEnd = Math.min(xStart + s, this.width);
        let sum = 0;
        let count = 0;
        for (let y = yStart; y < yEnd; y++) {
          const rowOffset = y * w;
          for (let x = xStart; x < xEnd; x++) {
            sum += inputData[rowOffset + x];
            count++;
          }
        }
        this.intensityMap[sy * this.scaledW + sx] = sum / count / 255;
      }
    }
  }
  /**
   * Compute local contrast map
   * @private
   */
  _computeContrast() {
    const w = this.scaledW;
    const h = this.scaledH;
    const intensity = this.intensityMap;
    const contrast = this.contrastMap;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const center = intensity[idx];
        let surround = 0;
        surround += intensity[(y - 1) * w + (x - 1)];
        surround += intensity[(y - 1) * w + x];
        surround += intensity[(y - 1) * w + (x + 1)];
        surround += intensity[y * w + (x - 1)];
        surround += intensity[y * w + (x + 1)];
        surround += intensity[(y + 1) * w + (x - 1)];
        surround += intensity[(y + 1) * w + x];
        surround += intensity[(y + 1) * w + (x + 1)];
        surround /= 8;
        contrast[idx] = Math.abs(center - surround);
      }
    }
    for (let y = 0; y < h; y++) {
      contrast[y * w] = 0;
      contrast[y * w + w - 1] = 0;
    }
    for (let x = 0; x < w; x++) {
      contrast[x] = 0;
      contrast[(h - 1) * w + x] = 0;
    }
  }
  /**
   * Compute edge density map using Sobel-like operator
   * @private
   */
  _computeEdges() {
    const w = this.scaledW;
    const h = this.scaledH;
    const intensity = this.intensityMap;
    const edges = this.edgeMap;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx = -intensity[(y - 1) * w + (x - 1)] + intensity[(y - 1) * w + (x + 1)] + -2 * intensity[y * w + (x - 1)] + 2 * intensity[y * w + (x + 1)] + -intensity[(y + 1) * w + (x - 1)] + intensity[(y + 1) * w + (x + 1)];
        const gy = -intensity[(y - 1) * w + (x - 1)] - 2 * intensity[(y - 1) * w + x] - intensity[(y - 1) * w + (x + 1)] + intensity[(y + 1) * w + (x - 1)] + 2 * intensity[(y + 1) * w + x] + intensity[(y + 1) * w + (x + 1)];
        edges[y * w + x] = Math.sqrt(gx * gx + gy * gy) / 4;
      }
    }
    for (let y = 0; y < h; y++) {
      edges[y * w] = 0;
      edges[y * w + w - 1] = 0;
    }
    for (let x = 0; x < w; x++) {
      edges[x] = 0;
      edges[(h - 1) * w + x] = 0;
    }
  }
  /**
   * Combine features into final saliency map
   * @private
   */
  _combineSaliency() {
    const n = this.saliencyBuffer.length;
    const contrast = this.contrastMap;
    const edges = this.edgeMap;
    const saliency = this.saliencyBuffer;
    for (let i = 0; i < n; i++) {
      saliency[i] = contrast[i] * 0.6 + edges[i] * 0.4;
    }
    let max = 0;
    for (let i = 0; i < n; i++) {
      max = Math.max(max, saliency[i]);
    }
    if (max > 0) {
      for (let i = 0; i < n; i++) {
        saliency[i] /= max;
      }
    }
  }
  /**
   * Find peaks in saliency map using non-maximum suppression
   * @private
   */
  _findPeaks() {
    const w = this.scaledW;
    const h = this.scaledH;
    const saliency = this.saliencyBuffer;
    const peaks = [];
    const r = this.suppressionRadius;
    const r2 = r * r;
    const candidates = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const val = saliency[idx];
        if (val > saliency[(y - 1) * w + (x - 1)] && val > saliency[(y - 1) * w + x] && val > saliency[(y - 1) * w + (x + 1)] && val > saliency[y * w + (x - 1)] && val > saliency[y * w + (x + 1)] && val > saliency[(y + 1) * w + (x - 1)] && val > saliency[(y + 1) * w + x] && val > saliency[(y + 1) * w + (x + 1)]) {
          candidates.push({ x, y, value: val });
        }
      }
    }
    candidates.sort((a, b) => b.value - a.value);
    for (const cand of candidates) {
      if (peaks.length >= this.maxPeaks) break;
      let suppress = false;
      for (const peak of peaks) {
        const dx = cand.x - peak.x;
        const dy = cand.y - peak.y;
        if (dx * dx + dy * dy < r2) {
          suppress = true;
          break;
        }
      }
      if (!suppress) {
        peaks.push({
          x: (cand.x + 0.5) * this.scale,
          y: (cand.y + 0.5) * this.scale,
          value: cand.value
        });
      }
    }
    return peaks;
  }
  /**
   * Get saliency value at a specific location
   * 
   * @param {number} x - X coordinate in original image
   * @param {number} y - Y coordinate in original image
   * @returns {number} Saliency value (0-1)
   */
  getSaliencyAt(x, y) {
    const sx = Math.floor(x / this.scale);
    const sy = Math.floor(y / this.scale);
    if (sx < 0 || sx >= this.scaledW || sy < 0 || sy >= this.scaledH) {
      return 0;
    }
    return this.saliencyBuffer[sy * this.scaledW + sx];
  }
};

// src/core/perception/scale-orchestrator.js
var ScaleOrchestrator = class {
  constructor(numOctaves, options = {}) {
    this.numOctaves = numOctaves;
    this.options = {
      interleaveInterval: 10,
      hysteresis: 1,
      // Number of adjacent octaves to keep
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
    if (!trackingState || !trackingState.isTracking || trackingState.activeOctave === void 0) {
      this.lastActiveOctave = -1;
      return Array.from({ length: this.numOctaves }, (_, i) => i);
    }
    const activeScale = trackingState.activeOctave;
    this.lastActiveOctave = activeScale;
    const octaves = /* @__PURE__ */ new Set();
    for (let i = -this.options.hysteresis; i <= this.options.hysteresis; i++) {
      const octave = activeScale + i;
      if (octave >= 0 && octave < this.numOctaves) {
        octaves.add(octave);
      }
    }
    if (this.frameCount % this.options.interleaveInterval === 0) {
      this.interleaveOctave = (this.interleaveOctave + 1) % this.numOctaves;
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
      console.log(`[ScaleOrchestrator] Active: ${activeScale}, Processing: [${result.join(", ")}]`);
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
};

// src/core/perception/bio-inspired-engine.js
var BIO_CONFIG = {
  // Foveal region (high resolution center)
  FOVEA_RADIUS_RATIO: 0.15,
  // 15% of image dimension
  PARAFOVEA_RADIUS_RATIO: 0.3,
  // 30% of image dimension
  // Resolution multipliers
  FOVEA_RESOLUTION: 1,
  // Full resolution
  PARAFOVEA_RESOLUTION: 0.5,
  // Half resolution
  PERIPHERY_RESOLUTION: 0.25,
  // Quarter resolution
  // Saccadic behavior
  MAX_SACCADES_PER_FRAME: 3,
  // Maximum "glances" per frame
  SACCADE_COOLDOWN_MS: 50,
  // Minimum time between saccades
  SALIENCY_THRESHOLD: 0.3,
  // Threshold for triggering saccade
  // Predictive coding
  CHANGE_THRESHOLD: 0.05,
  // 5% pixel difference to trigger processing
  PREDICTION_CONFIDENCE: 0.8,
  // Confidence to skip processing
  MOTION_HISTORY_FRAMES: 3,
  // Frames to consider for motion prediction
  // Performance
  ENABLE_SKIP_FRAMES: true,
  // Skip processing if nothing changed
  MIN_PROCESSING_INTERVAL_MS: 8,
  // Minimum 8ms (~120fps cap)
  NUM_OCTAVES: 5
  // Default number of octaves
};
var BioInspiredEngine = class {
  /**
   * @param {number} width - Input image width
   * @param {number} height - Input image height
   * @param {Object} options - Configuration options
   */
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.config = { ...BIO_CONFIG, ...options };
    this.fovealAttention = new FovealAttention(width, height, this.config);
    this.saccadicController = new SaccadicController(width, height, this.config);
    this.predictiveCoding = new PredictiveCoding(width, height, this.config);
    this.saliencyMap = new SaliencyMap(width, height);
    this.scaleOrchestrator = new ScaleOrchestrator(this.config.NUM_OCTAVES, {
      debug: options.debugMode
    });
    this.currentFoveaCenter = { x: width / 2, y: height / 2 };
    this.frameCount = 0;
    this.lastProcessTime = 0;
    this.skipCount = 0;
    this.metrics = {
      totalFrames: 0,
      skippedFrames: 0,
      avgPixelsProcessed: 0,
      avgLatency: 0,
      saccadeCount: 0
    };
    this._initBuffers();
  }
  /**
   * Initialize pre-allocated buffers for efficient processing
   * @private
   */
  _initBuffers() {
    const fullSize = this.width * this.height;
    const foveaSize = Math.ceil(fullSize * this.config.FOVEA_RADIUS_RATIO ** 2 * Math.PI);
    this.outputBuffer = {
      fovea: new Uint8Array(foveaSize),
      parafovea: new Uint8Array(Math.ceil(foveaSize * 4)),
      periphery: new Uint8Array(Math.ceil(fullSize * 0.25))
    };
    this.changeBuffer = new Float32Array(Math.ceil(fullSize / 64));
  }
  /**
   * Process an input frame using bio-inspired techniques
   * 
   * @param {Uint8Array} inputData - Grayscale input image
   * @param {Object} trackingState - Current tracking state (optional)
   * @returns {Object} Processed result with attention regions
   */
  process(inputData, trackingState = null) {
    const startTime = performance.now();
    this.frameCount++;
    this.metrics.totalFrames++;
    const prediction = this.predictiveCoding.predict(inputData, trackingState);
    if (prediction.canSkip && this.config.ENABLE_SKIP_FRAMES) {
      this.metrics.skippedFrames++;
      this.skipCount++;
      return {
        skipped: true,
        prediction: prediction.predictedState,
        confidence: prediction.confidence,
        pixelsProcessed: 0,
        latency: performance.now() - startTime
      };
    }
    this.skipCount = 0;
    const saliency = this.saliencyMap.compute(inputData);
    const saccadeTargets = this.saccadicController.computeTargets(
      saliency,
      this.currentFoveaCenter,
      trackingState
    );
    const attentionRegions = [];
    let totalPixelsProcessed = 0;
    for (const target of saccadeTargets) {
      const region = this.fovealAttention.extract(
        inputData,
        target.x,
        target.y,
        target.priority
      );
      attentionRegions.push(region);
      totalPixelsProcessed += region.pixelCount;
      this.metrics.saccadeCount++;
    }
    if (saccadeTargets.length > 0) {
      const primary = saccadeTargets[0];
      this.currentFoveaCenter = { x: primary.x, y: primary.y };
    }
    const octavesToProcess = this.scaleOrchestrator.getOctavesToProcess(trackingState);
    this.predictiveCoding.storeFrame(inputData, trackingState);
    const latency = performance.now() - startTime;
    this._updateMetrics(totalPixelsProcessed, latency);
    return {
      skipped: false,
      attentionRegions,
      foveaCenter: this.currentFoveaCenter,
      saliencyPeaks: saliency.peaks,
      octavesToProcess,
      pixelsProcessed: totalPixelsProcessed,
      pixelsSaved: this.width * this.height - totalPixelsProcessed,
      savingsPercent: ((1 - totalPixelsProcessed / (this.width * this.height)) * 100).toFixed(1),
      latency
    };
  }
  /**
   * Get the primary attention region (highest resolution)
   * This is the region that should be used for feature detection
   * 
   * @param {Object} processResult - Result from process()
   * @returns {Object} Primary attention region with data
   */
  getPrimaryRegion(processResult) {
    if (processResult.skipped || !processResult.attentionRegions?.length) {
      return null;
    }
    return processResult.attentionRegions[0];
  }
  /**
   * Suggest optimal processing based on change detection
   * 
   * @param {Uint8Array} inputData - Current frame
   * @returns {Object} Processing suggestion
   */
  suggestProcessing(inputData) {
    const changeLevel = this.predictiveCoding.getChangeLevel(inputData);
    return {
      shouldProcessFull: changeLevel > 0.3,
      shouldProcessPartial: changeLevel > 0.05,
      canSkip: changeLevel < 0.02,
      changeLevel,
      recommendedSaccades: Math.ceil(changeLevel * this.config.MAX_SACCADES_PER_FRAME)
    };
  }
  /**
   * Update performance metrics
   * @private
   */
  _updateMetrics(pixelsProcessed, latency) {
    const alpha = 0.1;
    this.metrics.avgPixelsProcessed = this.metrics.avgPixelsProcessed * (1 - alpha) + pixelsProcessed * alpha;
    this.metrics.avgLatency = this.metrics.avgLatency * (1 - alpha) + latency * alpha;
  }
  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      skipRate: (this.metrics.skippedFrames / this.metrics.totalFrames * 100).toFixed(1) + "%",
      avgSavings: ((1 - this.metrics.avgPixelsProcessed / (this.width * this.height)) * 100).toFixed(1) + "%",
      currentFovea: this.currentFoveaCenter
    };
  }
  /**
   * Reset engine state (e.g., when target changes)
   */
  reset() {
    this.currentFoveaCenter = { x: this.width / 2, y: this.height / 2 };
    this.frameCount = 0;
    this.skipCount = 0;
    this.predictiveCoding.reset();
    this.saccadicController.reset();
  }
  /**
   * Configure engine at runtime
   * @param {Object} options - Configuration options to update
   */
  configure(options) {
    this.config = { ...this.config, ...options };
    this.fovealAttention.configure(this.config);
    this.saccadicController.configure(this.config);
    this.predictiveCoding.configure(this.config);
  }
};

// src/runtime/bio-inspired-controller.ts
var BioInspiredController = class extends Controller {
  bioEngine = null;
  bioEnabled = true;
  bioMetricsInterval = null;
  lastBioResult = null;
  constructor(options) {
    super(options);
    const bioOptions = options.bioInspired || {};
    this.bioEnabled = bioOptions.enabled !== false;
    if (this.bioEnabled) {
      const bioConfig = {};
      if (bioOptions.foveaRadiusRatio !== void 0) {
        bioConfig.FOVEA_RADIUS_RATIO = bioOptions.foveaRadiusRatio;
      }
      if (bioOptions.maxSaccades !== void 0) {
        bioConfig.MAX_SACCADES_PER_FRAME = bioOptions.maxSaccades;
      }
      if (bioOptions.aggressiveSkipping !== void 0) {
        bioConfig.ENABLE_SKIP_FRAMES = bioOptions.aggressiveSkipping;
        if (bioOptions.aggressiveSkipping) {
          bioConfig.CHANGE_THRESHOLD = 0.03;
        }
      }
      this.bioEngine = new BioInspiredEngine(
        options.inputWidth,
        options.inputHeight,
        bioConfig
      );
    }
  }
  /**
   * Override processVideo to add bio-inspired perception
   */
  processVideo(input) {
    if (!this.bioEnabled || !this.bioEngine) {
      return super.processVideo(input);
    }
    if (this.processingVideo) return;
    this.processingVideo = true;
    this.trackingStates = [];
    for (let i = 0; i < (this.markerDimensions?.length || 0); i++) {
      this.trackingStates.push({
        showing: false,
        isTracking: false,
        currentModelViewTransform: null,
        trackCount: 0,
        trackMiss: 0
      });
    }
    const startProcessing = async () => {
      while (this.processingVideo) {
        const inputData = this.inputLoader.loadInput(input);
        const activeTrackings = this.trackingStates.filter((s) => s.isTracking);
        const trackingState = activeTrackings.length === 1 ? {
          isTracking: true,
          activeOctave: activeTrackings[0].lastOctaveIndex,
          // Tracked octave index
          worldMatrix: activeTrackings[0].currentModelViewTransform ? this._flattenMatrix(activeTrackings[0].currentModelViewTransform) : null
        } : null;
        const bioResult = this.bioEngine.process(inputData, trackingState || void 0);
        this.lastBioResult = bioResult;
        if (bioResult.skipped && activeTrackings.length > 0) {
          this._handleSkippedFrame(activeTrackings, bioResult);
        } else {
          await this._processWithAttention(input, inputData, bioResult);
        }
        if (typeof requestAnimationFrame !== "undefined") {
          await new Promise(requestAnimationFrame);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
      }
    };
    startProcessing();
  }
  /**
   * Handle a skipped frame using prediction
   * @private
   */
  _handleSkippedFrame(trackingStates, bioResult) {
    const hasPrediction = bioResult.prediction && bioResult.prediction.worldMatrix;
    for (const state of trackingStates) {
      if (hasPrediction && trackingStates.length === 1) {
        state.currentModelViewTransform = this._unflattenMatrix(bioResult.prediction.worldMatrix);
      }
      const targetIndex = this.trackingStates.indexOf(state);
      if (targetIndex !== -1) {
        const worldMatrix = state.currentModelViewTransform ? this._glModelViewMatrix(state.currentModelViewTransform, targetIndex) : null;
        this.onUpdate?.({
          type: "updateMatrix",
          targetIndex,
          worldMatrix: worldMatrix ? this.featureManager.applyWorldMatrixFilters(targetIndex, worldMatrix, { stability: 0.9 }) : null,
          skipped: true,
          bioMetrics: this.bioEngine?.getMetrics()
        });
      }
    }
    this.onUpdate?.({ type: "processDone" });
  }
  /**
   * Process frame using bio-inspired attention regions
   * @private
   */
  async _processWithAttention(input, inputData, bioResult) {
    const nTracking = this.trackingStates.reduce((acc, s) => acc + (s.isTracking ? 1 : 0), 0);
    if (nTracking < this.maxTrack) {
      const matchingIndexes = this.trackingStates.map((s, i) => ({ state: s, index: i })).filter(
        ({ state, index }) => !state.isTracking && (this.interestedTargetIndex === -1 || this.interestedTargetIndex === index)
      ).map(({ index }) => index);
      if (matchingIndexes.length > 0) {
        const { targetIndex: matchedTargetIndex, modelViewTransform, featurePoints } = await this._detectAndMatch(inputData, matchingIndexes, bioResult.octavesToProcess || null);
        if (matchedTargetIndex !== -1) {
          this.trackingStates[matchedTargetIndex].isTracking = true;
          this.trackingStates[matchedTargetIndex].currentModelViewTransform = modelViewTransform;
          if (bioResult.attentionRegions?.[0]) {
            this.bioEngine?.reset();
          }
        }
        this.onUpdate?.({ type: "featurePoints", featurePoints });
      }
    }
    for (let i = 0; i < this.trackingStates.length; i++) {
      const trackingState = this.trackingStates[i];
      if (trackingState.isTracking) {
        const result = await this._trackAndUpdate(
          inputData,
          trackingState.currentModelViewTransform,
          i
        );
        if (!result || !result.modelViewTransform) {
          trackingState.isTracking = false;
          trackingState.screenCoords = result?.screenCoords || [];
          trackingState.reliabilities = result?.reliabilities || [];
          trackingState.stabilities = result?.stabilities || [];
        } else {
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
        this.featureManager.notifyUpdate({ type: "reset", targetIndex: i });
      }
      if (trackingState.showing || trackingState.screenCoords?.length > 0 || wasShowing && !trackingState.showing) {
        const worldMatrix = trackingState.showing ? this._glModelViewMatrix(trackingState.currentModelViewTransform, i) : null;
        let finalMatrix = null;
        if (worldMatrix) {
          const stabilities = trackingState.stabilities || [];
          const avgStability = stabilities.length > 0 ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length : 0;
          finalMatrix = this.featureManager.applyWorldMatrixFilters(i, worldMatrix, { stability: avgStability });
          trackingState.trackingMatrix = finalMatrix;
          const isInputRotated = input.width === this.inputHeight && input.height === this.inputWidth;
          if (isInputRotated) {
            const rotationFeature = this.featureManager.getFeature("auto-rotation");
            if (rotationFeature) {
              finalMatrix = rotationFeature.rotate(finalMatrix);
            }
          }
        }
        this.onUpdate?.({
          type: "updateMatrix",
          targetIndex: i,
          worldMatrix: finalMatrix,
          modelViewTransform: trackingState.currentModelViewTransform,
          screenCoords: trackingState.screenCoords,
          reliabilities: trackingState.reliabilities,
          stabilities: trackingState.stabilities,
          deformedMesh: trackingState.deformedMesh,
          bioMetrics: this.bioEngine?.getMetrics(),
          foveaCenter: bioResult.foveaCenter,
          pixelsSaved: bioResult.pixelsSaved
        });
      }
    }
    this.onUpdate?.({ type: "processDone" });
  }
  /**
   * Detect and match features, optionally limited to specific octaves
   */
  async _detectAndMatch(inputData, targetIndexes, octavesToProcess = null) {
    let predictedScale = void 0;
    for (const state of this.trackingStates) {
      if (state.isTracking && state.currentModelViewTransform) {
        const m = state.currentModelViewTransform;
        predictedScale = Math.sqrt(m[0][0] ** 2 + m[1][0] ** 2 + m[2][0] ** 2);
        break;
      }
    }
    const { targetIndex, modelViewTransform, screenCoords, worldCoords, featurePoints } = await this._workerMatch(
      null,
      // No feature points, worker will detect from inputData
      targetIndexes,
      inputData,
      predictedScale,
      octavesToProcess
    );
    return { targetIndex, modelViewTransform, screenCoords, worldCoords, featurePoints };
  }
  /**
   * Communicate with worker for matching phase
   */
  _workerMatch(featurePoints, targetIndexes, inputData = null, expectedScale, octavesToProcess = null) {
    return new Promise((resolve) => {
      if (!this.worker) {
        let fpPromise;
        if (!featurePoints && inputData) {
          fpPromise = Promise.resolve(this.fullDetector.detect(inputData, { octavesToProcess }).featurePoints);
        } else {
          fpPromise = Promise.resolve(featurePoints);
        }
        fpPromise.then((fp) => {
          this._matchOnMainThread(fp, targetIndexes, expectedScale).then(resolve);
        }).catch(() => resolve({ targetIndex: -1 }));
        return;
      }
      const timeout = setTimeout(() => {
        this.workerMatchDone = null;
        resolve({ targetIndex: -1 });
      }, 1e3);
      this.workerMatchDone = (data) => {
        clearTimeout(timeout);
        this.workerMatchDone = null;
        resolve(data);
      };
      if (inputData) {
        this.worker.postMessage({ type: "match", inputData, targetIndexes, octavesToProcess, expectedScale });
      } else {
        this.worker.postMessage({ type: "match", featurePoints, targetIndexes, expectedScale });
      }
    });
  }
  /**
   * Override _trackAndUpdate to capture active octave for the next frame's orchestration
   */
  async _trackAndUpdate(inputData, lastModelViewTransform, targetIndex) {
    const result = await super._trackAndUpdate(inputData, lastModelViewTransform, targetIndex);
    if (result && result.octaveIndex !== void 0) {
      this.trackingStates[targetIndex].lastOctaveIndex = result.octaveIndex;
    }
    return result;
  }
  /**
   * Flatten a 3x4 matrix to Float32Array
   * @private
   */
  _flattenMatrix(matrix2) {
    const result = new Float32Array(16);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = matrix2[i][j];
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
      [flat[8], flat[9], flat[10], flat[11]]
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
};

// src/core/utils/images.js
var downsampleBilinear = ({ image }) => {
  const { data, width, height } = image;
  const dstWidth = width >>> 1;
  const dstHeight = height >>> 1;
  const temp = new Uint8Array(dstWidth * dstHeight);
  for (let j = 0; j < dstHeight; j++) {
    const row0 = j * 2 * width;
    const row1 = row0 + width;
    const dstRow = j * dstWidth;
    for (let i = 0; i < dstWidth; i++) {
      const i2 = i * 2;
      const val = data[row0 + i2] + data[row0 + i2 + 1] + data[row1 + i2] + data[row1 + i2 + 1] >> 2;
      temp[dstRow + i] = val & 255;
    }
  }
  return { data: temp, width: dstWidth, height: dstHeight };
};
var resize = ({ image, ratio }) => {
  if (ratio === 1) {
    return {
      data: new Uint8Array(image.data),
      // Copy to be safe/consistent
      width: image.width,
      height: image.height
    };
  }
  if (ratio <= 0.5) {
    return resize({
      image: downsampleBilinear({ image }),
      ratio: ratio * 2
    });
  }
  const width = Math.round(image.width * ratio) | 0;
  const height = Math.round(image.height * ratio) | 0;
  const imageData = new Uint8Array(width * height);
  const srcData = image.data;
  const srcW = image.width | 0;
  const srcH = image.height | 0;
  const srcW_1 = srcW - 1 | 0;
  const srcH_1 = srcH - 1 | 0;
  let dstIndex = 0;
  for (let j = 0; j < height; j++) {
    const srcY = j / ratio;
    const y0 = srcY | 0;
    const y1 = (y0 < srcH_1 ? y0 + 1 : srcH_1) | 0;
    const fy = srcY - y0;
    const ify = 1 - fy;
    const row0 = y0 * srcW | 0;
    const row1 = y1 * srcW | 0;
    for (let i = 0; i < width; i++) {
      const srcX = i / ratio;
      const x0 = srcX | 0;
      const x1 = (x0 < srcW_1 ? x0 + 1 : srcW_1) | 0;
      const fx = srcX - x0;
      const ifx = 1 - fx;
      const val0 = srcData[row0 + x0] * ifx + srcData[row0 + x1] * fx;
      const val1 = srcData[row1 + x0] * ifx + srcData[row1 + x1] * fx;
      const value = val0 * ify + val1 * fy;
      imageData[dstIndex++] = value | 0;
    }
  }
  return { data: imageData, width, height };
};

// src/core/image-list.js
init_constants();
var MIN_IMAGE_PIXEL_SIZE = AR_CONFIG.MIN_IMAGE_PIXEL_SIZE;
var buildTrackingImageList = (inputImage) => {
  const minDimension = Math.min(inputImage.width, inputImage.height);
  const scaleList = [];
  const imageList = [];
  scaleList.push(AR_CONFIG.TRACKING_DOWNSCALE_LEVEL_1 / minDimension);
  scaleList.push(AR_CONFIG.TRACKING_DOWNSCALE_LEVEL_2 / minDimension);
  for (let i = 0; i < scaleList.length; i++) {
    imageList.push(
      Object.assign(resize({ image: inputImage, ratio: scaleList[i] }), { scale: scaleList[i] })
    );
  }
  return imageList;
};

// src/core/utils/cumsum.js
var Cumsum = class {
  constructor(data, width, height) {
    this.width = width;
    this.height = height;
    this.cumsum = new Int32Array(width * height);
    this.cumsum[0] = data[0];
    for (let i = 1; i < width; i++) {
      this.cumsum[i] = this.cumsum[i - 1] + data[i];
    }
    for (let j = 1; j < height; j++) {
      this.cumsum[j * width] = this.cumsum[(j - 1) * width] + data[j * width];
    }
    for (let j = 1; j < height; j++) {
      for (let i = 1; i < width; i++) {
        const pos = j * width + i;
        this.cumsum[pos] = data[pos] + this.cumsum[(j - 1) * width + i] + this.cumsum[j * width + i - 1] - this.cumsum[(j - 1) * width + i - 1];
      }
    }
  }
  query(x1, y1, x2, y2) {
    const { width } = this;
    let ret = this.cumsum[y2 * width + x2];
    if (y1 > 0) ret -= this.cumsum[(y1 - 1) * width + x2];
    if (x1 > 0) ret -= this.cumsum[y2 * width + x1 - 1];
    if (x1 > 0 && y1 > 0) ret += this.cumsum[(y1 - 1) * width + x1 - 1];
    return ret;
  }
};

// src/core/tracker/extract.js
init_gpu_compute();
var SEARCH_SIZE1 = 10;
var SEARCH_SIZE2 = 2;
var TEMPLATE_SIZE = 6;
var TEMPLATE_SD_THRESH = 4;
var MAX_THRESH = 0.9;
var MIN_THRESH = 0.2;
var OCCUPANCY_SIZE = 8;
var useGPU = true;
var extract = (image) => {
  const { data: imageData, width, height } = image;
  let dValue, isCandidate;
  if (useGPU) {
    const result = gpuCompute.edgeDetection(imageData, width, height);
    dValue = result.dValue;
    isCandidate = result.isCandidate;
  } else {
    dValue = new Float32Array(imageData.length);
    isCandidate = new Uint8Array(imageData.length);
    for (let j = 1; j < height - 1; j++) {
      const rowOffset = j * width;
      const prevRowOffset = (j - 1) * width;
      const nextRowOffset = (j + 1) * width;
      for (let i = 1; i < width - 1; i++) {
        const pos = rowOffset + i;
        let dx = (imageData[prevRowOffset + i + 1] - imageData[prevRowOffset + i - 1] + imageData[rowOffset + i + 1] - imageData[rowOffset + i - 1] + imageData[nextRowOffset + i + 1] - imageData[nextRowOffset + i - 1]) / 768;
        let dy = (imageData[nextRowOffset + i - 1] - imageData[prevRowOffset + i - 1] + imageData[nextRowOffset + i] - imageData[prevRowOffset + i] + imageData[nextRowOffset + i + 1] - imageData[prevRowOffset + i + 1]) / 768;
        dValue[pos] = Math.sqrt((dx * dx + dy * dy) / 2);
      }
    }
    for (let j = 1; j < height - 1; j++) {
      const rowOffset = j * width;
      for (let i = 1; i < width - 1; i++) {
        const pos = rowOffset + i;
        const val = dValue[pos];
        if (val > 0 && val >= dValue[pos - 1] && val >= dValue[pos + 1] && val >= dValue[pos - width] && val >= dValue[pos + width]) {
          isCandidate[pos] = 1;
        }
      }
    }
  }
  const dValueHist = new Uint32Array(1e3);
  let allCount = 0;
  for (let j = 1; j < height - 1; j++) {
    const rowOffset = j * width;
    for (let i = 1; i < width - 1; i++) {
      const pos = rowOffset + i;
      if (isCandidate[pos]) {
        const val = dValue[pos];
        let k = Math.floor(val * 1e3);
        if (k > 999) k = 999;
        dValueHist[k]++;
        allCount++;
      }
    }
  }
  const maxPoints = 0.1 * width * height;
  let kThresh = 999;
  let filteredCount = 0;
  while (kThresh >= 0) {
    filteredCount += dValueHist[kThresh];
    if (filteredCount > maxPoints) break;
    kThresh--;
  }
  const minDValue = kThresh / 1e3;
  const imageDataSqr = new Float32Array(imageData.length);
  for (let i = 0; i < imageData.length; i++) {
    imageDataSqr[i] = imageData[i] * imageData[i];
  }
  const imageDataCumsum = new Cumsum(imageData, width, height);
  const imageDataSqrCumsum = new Cumsum(imageDataSqr, width, height);
  const candidates = [];
  for (let i = 0; i < imageData.length; i++) {
    if (isCandidate[i] && dValue[i] >= minDValue) {
      candidates.push({
        pos: i,
        dval: dValue[i],
        x: i % width,
        y: Math.floor(i / width)
      });
    }
  }
  candidates.sort((a, b) => b.dval - a.dval);
  const divSize = (TEMPLATE_SIZE * 2 + 1) * 3;
  const maxFeatureNum = Math.floor(width / OCCUPANCY_SIZE) * Math.floor(height / OCCUPANCY_SIZE) + Math.floor(width / divSize) * Math.floor(height / divSize);
  const coords = [];
  const invalidated = new Uint8Array(width * height);
  const templateWidth = 2 * TEMPLATE_SIZE + 1;
  const nPixels = templateWidth * templateWidth;
  const actualOccSize = Math.floor(Math.min(width, height) / 12);
  for (let i = 0; i < candidates.length; i++) {
    const { x, y, pos } = candidates[i];
    if (invalidated[pos]) continue;
    if (x < TEMPLATE_SIZE + SEARCH_SIZE1 || x >= width - TEMPLATE_SIZE - SEARCH_SIZE1 || y < TEMPLATE_SIZE + SEARCH_SIZE1 || y >= height - TEMPLATE_SIZE - SEARCH_SIZE1) {
      continue;
    }
    const vlen = _templateVar({
      image,
      cx: x,
      cy: y,
      sdThresh: TEMPLATE_SD_THRESH,
      imageDataCumsum,
      imageDataSqrCumsum
    });
    if (vlen === null) continue;
    const templateAvg = imageDataCumsum.query(
      x - TEMPLATE_SIZE,
      y - TEMPLATE_SIZE,
      x + TEMPLATE_SIZE,
      y + TEMPLATE_SIZE
    ) / nPixels;
    const templateData = new Uint8Array(templateWidth * templateWidth);
    let tidx = 0;
    const tStart = (y - TEMPLATE_SIZE) * width + (x - TEMPLATE_SIZE);
    for (let tj = 0; tj < templateWidth; tj++) {
      const rowOffset = tStart + tj * width;
      for (let ti = 0; ti < templateWidth; ti++) {
        templateData[tidx++] = imageData[rowOffset + ti];
      }
    }
    let max = -1;
    for (let jj = -SEARCH_SIZE1; jj <= SEARCH_SIZE1; jj++) {
      for (let ii = -SEARCH_SIZE1; ii <= SEARCH_SIZE1; ii++) {
        if (ii * ii + jj * jj <= SEARCH_SIZE2 * SEARCH_SIZE2) continue;
        const sim = _getSimilarityOptimized({
          image,
          cx: x + ii,
          cy: y + jj,
          vlen,
          templateData,
          templateAvg,
          templateWidth,
          imageDataCumsum,
          imageDataSqrCumsum,
          width,
          height
        });
        if (sim !== null && sim > max) {
          max = sim;
          if (max > MAX_THRESH) break;
        }
      }
      if (max > MAX_THRESH) break;
    }
    if (max < MAX_THRESH) {
      let minUnique = 1;
      let maxUnique = -1;
      let failedUnique = false;
      for (let jj = -SEARCH_SIZE2; jj <= SEARCH_SIZE2; jj++) {
        for (let ii = -SEARCH_SIZE2; ii <= SEARCH_SIZE2; ii++) {
          if (ii * ii + jj * jj > SEARCH_SIZE2 * SEARCH_SIZE2) continue;
          if (ii === 0 && jj === 0) continue;
          const sim = _getSimilarityOptimized({
            image,
            vlen,
            cx: x + ii,
            cy: y + jj,
            templateData,
            templateAvg,
            templateWidth,
            imageDataCumsum,
            imageDataSqrCumsum,
            width,
            height
          });
          if (sim === null) continue;
          if (sim < minUnique) minUnique = sim;
          if (sim > maxUnique) maxUnique = sim;
          if (minUnique < MIN_THRESH || maxUnique > 0.99) {
            failedUnique = true;
            break;
          }
        }
        if (failedUnique) break;
      }
      if (!failedUnique) {
        coords.push({ x, y });
        for (let jj = -actualOccSize; jj <= actualOccSize; jj++) {
          const yy = y + jj;
          if (yy < 0 || yy >= height) continue;
          const rowStart = yy * width;
          for (let ii = -actualOccSize; ii <= actualOccSize; ii++) {
            const xx = x + ii;
            if (xx < 0 || xx >= width) continue;
            invalidated[rowStart + xx] = 1;
          }
        }
      }
    }
    if (coords.length >= maxFeatureNum) break;
  }
  return coords;
};
var _templateVar = ({ image, cx, cy, sdThresh, imageDataCumsum, imageDataSqrCumsum }) => {
  if (cx - TEMPLATE_SIZE < 0 || cx + TEMPLATE_SIZE >= image.width) return null;
  if (cy - TEMPLATE_SIZE < 0 || cy + TEMPLATE_SIZE >= image.height) return null;
  const templateWidth = 2 * TEMPLATE_SIZE + 1;
  const nPixels = templateWidth * templateWidth;
  let average = imageDataCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE
  );
  average /= nPixels;
  let vlen = imageDataSqrCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE
  );
  vlen -= 2 * average * imageDataCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE
  );
  vlen += nPixels * average * average;
  if (vlen / nPixels < sdThresh * sdThresh) return null;
  vlen = Math.sqrt(vlen);
  return vlen;
};
var _getSimilarityOptimized = (options) => {
  const { cx, cy, vlen, templateData, templateAvg, templateWidth, imageDataCumsum, imageDataSqrCumsum, width, height } = options;
  const imageData = options.image.data;
  const templateSize = (templateWidth - 1) / 2;
  if (cx - templateSize < 0 || cx + templateSize >= width) return null;
  if (cy - templateSize < 0 || cy + templateSize >= height) return null;
  const nP = templateWidth * templateWidth;
  const sx = imageDataCumsum.query(
    cx - templateSize,
    cy - templateSize,
    cx + templateSize,
    cy + templateSize
  );
  const sxx = imageDataSqrCumsum.query(
    cx - templateSize,
    cy - templateSize,
    cx + templateSize,
    cy + templateSize
  );
  let vlen2 = sxx - sx * sx / nP;
  if (vlen2 <= 0) return null;
  vlen2 = Math.sqrt(vlen2);
  let sxy = 0;
  const p1_start = (cy - templateSize) * width + (cx - templateSize);
  for (let j = 0; j < templateWidth; j++) {
    const rowOffset1 = p1_start + j * width;
    const rowOffset2 = j * templateWidth;
    for (let i = 0; i < templateWidth; i++) {
      sxy += imageData[rowOffset1 + i] * templateData[rowOffset2 + i];
    }
  }
  const sampledCount = templateWidth * templateWidth;
  const totalCount = templateWidth * templateWidth;
  sxy *= totalCount / sampledCount;
  const sxy_final = sxy - templateAvg * sx;
  return 1 * sxy_final / (vlen * vlen2);
};

// src/core/tracker/extract-utils.js
var extractTrackingFeatures = (imageList, doneCallback) => {
  const featureSets = [];
  for (let i = 0; i < imageList.length; i++) {
    const image = imageList[i];
    const points = extract(image);
    const featureSet = {
      data: image.data,
      scale: image.scale,
      width: image.width,
      height: image.height,
      points
    };
    featureSets.push(featureSet);
    doneCallback(i);
  }
  return featureSets;
};

// src/compiler/offline-compiler.ts
init_detector_lite();
init_hierarchical_clustering();
init_protocol();

// src/core/utils/delaunay.js
function triangulate(points) {
  if (points.length < 3) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const deltaMax = Math.max(dx, dy);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const p1 = { x: midX - 20 * deltaMax, y: midY - deltaMax };
  const p2 = { x: midX, y: midY + 20 * deltaMax };
  const p3 = { x: midX + 20 * deltaMax, y: midY - deltaMax };
  let triangles = [
    { p1, p2, p3, indices: [-1, -2, -3] }
  ];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const badTriangles = [];
    for (const t of triangles) {
      if (isInCircumcircle(p, t)) {
        badTriangles.push(t);
      }
    }
    const polygon = [];
    for (const t of badTriangles) {
      const edges = [
        { a: t.p1, b: t.p2, i1: t.indices[0], i2: t.indices[1] },
        { a: t.p2, b: t.p3, i1: t.indices[1], i2: t.indices[2] },
        { a: t.p3, b: t.p1, i1: t.indices[2], i2: t.indices[0] }
      ];
      for (const edge of edges) {
        let isShared = false;
        for (const t2 of badTriangles) {
          if (t === t2) continue;
          if (isSameEdge(edge, t2)) {
            isShared = true;
            break;
          }
        }
        if (!isShared) {
          polygon.push(edge);
        }
      }
    }
    triangles = triangles.filter((t) => !badTriangles.includes(t));
    for (const edge of polygon) {
      triangles.push({
        p1: edge.a,
        p2: edge.b,
        p3: p,
        indices: [edge.i1, edge.i2, i]
      });
    }
  }
  return triangles.filter((t) => {
    return t.indices[0] >= 0 && t.indices[1] >= 0 && t.indices[2] >= 0;
  }).map((t) => t.indices);
}
function isInCircumcircle(p, t) {
  const x1 = t.p1.x, y1 = t.p1.y;
  const x2 = t.p2.x, y2 = t.p2.y;
  const x3 = t.p3.x, y3 = t.p3.y;
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const centerX = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
  const centerY = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
  const radiusSq = (x1 - centerX) * (x1 - centerX) + (y1 - centerY) * (y1 - centerY);
  const distSq = (p.x - centerX) * (p.x - centerX) + (p.y - centerY) * (p.y - centerY);
  return distSq <= radiusSq;
}
function isSameEdge(edge, triangle) {
  const tEdges = [
    [triangle.indices[0], triangle.indices[1]],
    [triangle.indices[1], triangle.indices[2]],
    [triangle.indices[2], triangle.indices[0]]
  ];
  for (const te of tEdges) {
    if (edge.i1 === te[0] && edge.i2 === te[1] || edge.i1 === te[1] && edge.i2 === te[0]) {
      return true;
    }
  }
  return false;
}
function getEdges(triangles) {
  const edgeSet = /* @__PURE__ */ new Set();
  const edges = [];
  for (const t of triangles) {
    const pairs = [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];
    for (const pair of pairs) {
      const low = Math.min(pair[0], pair[1]);
      const high = Math.max(pair[0], pair[1]);
      const key = `${low}-${high}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([low, high]);
      }
    }
  }
  return edges;
}

// src/compiler/offline-compiler.ts
init_constants();
var isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
var OfflineCompiler = class {
  data = null;
  constructor() {
    console.log("\u26A1 OfflineCompiler: Main thread mode (no workers)");
  }
  async compileImageTargets(images, progressCallback) {
    console.time("\u23F1\uFE0F Compilaci\xF3n total");
    const targetImages = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img || !img.width || !img.height || !img.data) {
        throw new Error(
          `Imagen inv\xE1lida en posici\xF3n ${i}. Debe tener propiedades width, height y data.`
        );
      }
      const greyImageData = new Uint8Array(img.width * img.height);
      if (img.data.length === img.width * img.height) {
        greyImageData.set(img.data);
      } else if (img.data.length === img.width * img.height * 4) {
        for (let j = 0; j < greyImageData.length; j++) {
          const offset = j * 4;
          greyImageData[j] = Math.floor(
            (img.data[offset] + img.data[offset + 1] + img.data[offset + 2]) / 3
          );
        }
      } else {
        throw new Error(`Formato de datos de imagen no soportado en posici\xF3n ${i}`);
      }
      targetImages.push({
        data: greyImageData,
        width: img.width,
        height: img.height
      });
    }
    const results = await this._compileTarget(targetImages, progressCallback);
    this.data = targetImages.map((img, i) => ({
      targetImage: img,
      matchingData: results[i].matchingData,
      trackingData: results[i].trackingData
    }));
    console.timeEnd("\u23F1\uFE0F Compilaci\xF3n total");
    return this.data;
  }
  async _compileTarget(targetImages, progressCallback) {
    const matchingResults = await this._compileMatch(targetImages, (p) => progressCallback(p * 0.5));
    const trackingResults = await this._compileTrack(targetImages, (p) => progressCallback(50 + p * 0.5));
    return targetImages.map((_, i) => ({
      matchingData: matchingResults[i],
      trackingData: trackingResults[i]
    }));
  }
  async _compileMatch(targetImages, progressCallback) {
    const percentPerImage = 100 / targetImages.length;
    let currentPercent = 0;
    const results = [];
    for (let i = 0; i < targetImages.length; i++) {
      const targetImage = targetImages[i];
      const detector2 = new DetectorLite(targetImage.width, targetImage.height, {
        useLSH: AR_CONFIG.USE_LSH,
        maxFeaturesPerBucket: AR_CONFIG.MAX_FEATURES_PER_BUCKET
      });
      const { featurePoints: rawPs } = detector2.detect(targetImage.data);
      const octaves = [0, 1, 2, 3, 4, 5];
      const ps = [];
      const featuresPerOctave = 300;
      for (const oct of octaves) {
        const octScale = Math.pow(2, oct);
        const octFeatures = rawPs.filter((p) => Math.abs(p.scale - octScale) < 0.1).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, featuresPerOctave);
        ps.push(...octFeatures);
      }
      const maximaPoints = ps.filter((p) => p.maxima);
      const minimaPoints = ps.filter((p) => !p.maxima);
      const maximaPointsCluster = build({ points: maximaPoints });
      const minimaPointsCluster = build({ points: minimaPoints });
      const keyframe = {
        maximaPoints,
        minimaPoints,
        maximaPointsCluster,
        minimaPointsCluster,
        width: targetImage.width,
        height: targetImage.height,
        scale: 1
      };
      results.push([keyframe]);
      currentPercent += percentPerImage;
      progressCallback(currentPercent);
    }
    return results;
  }
  async _compileTrack(targetImages, progressCallback) {
    const percentPerImage = 100 / targetImages.length;
    let currentPercent = 0;
    const results = [];
    for (let i = 0; i < targetImages.length; i++) {
      const targetImage = targetImages[i];
      const imageList = buildTrackingImageList(targetImage);
      const percentPerScale = percentPerImage / imageList.length;
      const trackingData = extractTrackingFeatures(imageList, () => {
        currentPercent += percentPerScale;
        progressCallback(currentPercent);
      });
      results.push(trackingData);
    }
    return results;
  }
  async compileTrack({ progressCallback, targetImages, basePercent = 0 }) {
    return this._compileTrack(targetImages, (percent) => {
      progressCallback(basePercent + percent * (100 - basePercent) / 100);
    });
  }
  async compileMatch({ progressCallback, targetImages, basePercent = 0 }) {
    return this._compileMatch(targetImages, (percent) => {
      progressCallback(basePercent + percent * (50 - basePercent) / 100);
    });
  }
  exportData() {
    if (!this.data) {
      throw new Error("No hay datos compilados para exportar");
    }
    const dataList = this.data.map((item) => {
      return {
        targetImage: {
          width: item.targetImage.width,
          height: item.targetImage.height
        },
        trackingData: item.trackingData.map((td) => {
          const count = td.points.length;
          const px = new Float32Array(count);
          const py = new Float32Array(count);
          for (let i = 0; i < count; i++) {
            px[i] = td.points[i].x;
            py[i] = td.points[i].y;
          }
          const triangles = triangulate(td.points);
          const edges = getEdges(triangles);
          const restLengths = new Float32Array(edges.length);
          for (let j = 0; j < edges.length; j++) {
            const p1 = td.points[edges[j][0]];
            const p2 = td.points[edges[j][1]];
            restLengths[j] = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          }
          return {
            w: td.width,
            h: td.height,
            s: td.scale,
            px,
            py,
            d: td.data,
            mesh: {
              t: new Uint16Array(triangles.flat()),
              e: new Uint16Array(edges.flat()),
              rl: restLengths
            }
          };
        }),
        matchingData: item.matchingData.map((kf) => {
          const useCompact = AR_CONFIG.USE_COMPACT_DESCRIPTORS;
          const columnarizeFn = useCompact ? columnarizeCompact : columnarize;
          return {
            w: kf.width,
            h: kf.height,
            s: kf.scale,
            hdc: false,
            max: columnarizeFn(kf.maximaPoints, kf.maximaPointsCluster, kf.width, kf.height),
            min: columnarizeFn(kf.minimaPoints, kf.minimaPointsCluster, kf.width, kf.height)
          };
        })
      };
    });
    return encodeTaar(dataList);
  }
  importData(buffer) {
    const result = decodeTaar(buffer);
    this.data = result.dataList;
    return result;
  }
  async destroy() {
  }
};

// tests/demo4-app.ts
init_constants();
var setupPanel = document.getElementById("setup-panel");
var arContainer = document.getElementById("ar-container");
var captureVideoContainer = document.getElementById("capture-video-container");
var captureVideo = document.getElementById("capture-video");
var targetList = document.getElementById("targetList");
var btnCaptureTarget = document.getElementById("btnCaptureTarget");
var btnStart = document.getElementById("btnStart");
var btnStop = document.getElementById("btnStop");
var controlsPanel = document.getElementById("controls-panel");
var statusLog = document.getElementById("statusLog");
var detectedMsg = document.getElementById("detectedMsg");
var video = document.getElementById("video");
var arCanvas = document.getElementById("arCanvas");
var debugCanvas = document.getElementById("debugCanvas");
var debugCtx = debugCanvas.getContext("2d");
var arCtx = arCanvas.getContext("2d");
var emptyMsg = document.getElementById("empty-msg");
var persistentText = document.getElementById("persistent-text");
var textModal = document.getElementById("text-modal");
var modalPreview = document.getElementById("modal-preview");
var modalInput = document.getElementById("modal-input");
var modalSave = document.getElementById("modal-save");
var modalCancel = document.getElementById("modal-cancel");
var targets = [];
var controller = null;
var isRunning = false;
var lastSpokenText = "";
var lastSpeakTime = 0;
var targetDetectionTimes = {};
var targetLastSpokenText = {};
var targetLastSeenTime = {};
var targetLastScreenCoords = {};
var LOST_GRACE_PERIOD = 300;
var tempCaptureData = null;
var tempCaptureUrl = null;
var WIDTH = AR_CONFIG.VIEWPORT_WIDTH;
var HEIGHT = AR_CONFIG.VIEWPORT_HEIGHT;
arCanvas.width = WIDTH;
arCanvas.height = HEIGHT;
async function initSetupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    captureVideo.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
    alert("Error accediendo a la c\xE1mara. Aseg\xFArate de dar permisos.");
  }
}
initSetupCamera();
loadTargets();
btnCaptureTarget.addEventListener("click", () => {
  const cvs = document.createElement("canvas");
  cvs.width = WIDTH;
  cvs.height = HEIGHT;
  const ctx = cvs.getContext("2d");
  drawVideoToCanvas(ctx, captureVideo, WIDTH, HEIGHT);
  tempCaptureData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  tempCaptureUrl = cvs.toDataURL("image/jpeg", 0.8);
  modalPreview.src = tempCaptureUrl;
  modalInput.value = "";
  textModal.style.display = "flex";
  modalInput.focus();
});
modalCancel.addEventListener("click", () => {
  textModal.style.display = "none";
  tempCaptureData = null;
  tempCaptureUrl = null;
});
modalSave.addEventListener("click", () => {
  const text = modalInput.value.trim();
  if (!text) {
    alert("Por favor escribe un texto para el TTS.");
    return;
  }
  if (tempCaptureData && tempCaptureUrl) {
    addTarget(tempCaptureData, tempCaptureUrl, text);
    textModal.style.display = "none";
    tempCaptureData = null;
    tempCaptureUrl = null;
  }
});
function addTarget(imageData, dataUrl, text, shouldSave = true) {
  emptyMsg.style.display = "none";
  btnStart.disabled = false;
  const id = Date.now().toString() + Math.random().toString().slice(2);
  const div = document.createElement("div");
  div.className = "target-item";
  div.innerHTML = `
        <img class="target-preview" src="${dataUrl}">
        <div class="target-inputs">
            <div style="font-weight: bold; color: white;">Target #${targets.length + 1}</div>
            <div style="color: var(--locus-gray); font-size: 0.9rem;">TTS: "${text}"</div>
        </div>
        <button class="remove-btn" data-id="${id}">\u{1F5D1}\uFE0F</button>
    `;
  targetList.appendChild(div);
  const item = {
    id,
    imageData,
    dataUrl,
    text,
    element: div
  };
  targets.push(item);
  if (shouldSave) {
    saveTargets();
  }
  div.querySelector(".remove-btn")?.addEventListener("click", () => {
    const idx = targets.findIndex((t) => t.id === id);
    if (idx > -1) {
      targets.splice(idx, 1);
      div.remove();
      if (targets.length === 0) {
        emptyMsg.style.display = "block";
        btnStart.disabled = true;
      }
      saveTargets();
    }
  });
}
function saveTargets() {
  const data = targets.map((t) => ({
    dataUrl: t.dataUrl,
    text: t.text
  }));
  localStorage.setItem("taptapp_demo4_targets", JSON.stringify(data));
}
async function loadTargets() {
  const json = localStorage.getItem("taptapp_demo4_targets");
  if (!json) return;
  try {
    const stored = JSON.parse(json);
    if (!Array.isArray(stored)) return;
    for (const item of stored) {
      if (item.dataUrl && item.text) {
        const img = new Image();
        img.src = item.dataUrl;
        await new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        const cvs = document.createElement("canvas");
        cvs.width = img.width;
        cvs.height = img.height;
        const ctx = cvs.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          addTarget(imageData, item.dataUrl, item.text, false);
        }
      }
    }
  } catch (e) {
    console.error("Error loading targets", e);
  }
}
btnStart.addEventListener("click", async () => {
  if (targets.length === 0) return;
  const unlockUtterance = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(unlockUtterance);
  btnStart.disabled = true;
  btnStart.textContent = "\u23F3 Compilando...";
  const stream = captureVideo.srcObject;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  try {
    await startExperience(targets);
  } catch (err) {
    console.error(err);
    alert("Error al iniciar: " + err);
    btnStart.disabled = false;
    btnStart.textContent = "\u{1F680} Iniciar Experiencia AR";
    initSetupCamera();
  }
});
btnStop.addEventListener("click", () => {
  stopExperience();
});
async function startExperience(validTargets) {
  const compiler = new OfflineCompiler();
  const imagesToCompile = [];
  const texts = [];
  for (const t of validTargets) {
    imagesToCompile.push({
      data: new Uint8Array(t.imageData.data.buffer),
      width: t.imageData.width,
      height: t.imageData.height
    });
    texts.push(t.text);
  }
  const compiledDataList = await compiler.compileImageTargets(imagesToCompile, (p) => {
    btnStart.textContent = `\u23F3 Compilando ${Math.round(p)}%...`;
  });
  const buffer = compiler.exportData();
  const cleanBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  controller = new BioInspiredController({
    inputWidth: WIDTH,
    inputHeight: HEIGHT,
    debugMode: true,
    maxTrack: 5,
    bioInspired: { enabled: true },
    onUpdate: (data) => handleARUpdate(data, texts)
  });
  await controller.addImageTargetsFromBuffer(cleanBuffer);
  await startCamera();
  setupPanel.style.display = "none";
  arContainer.style.display = "block";
  controlsPanel.style.display = "block";
  captureVideoContainer.style.display = "none";
  const rect = arContainer.getBoundingClientRect();
  debugCanvas.width = rect.width;
  debugCanvas.height = rect.height;
  isRunning = true;
  startLoop();
}
function stopExperience() {
  isRunning = false;
  if (controller) {
    controller = null;
  }
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  video.srcObject = null;
  arContainer.style.display = "none";
  controlsPanel.style.display = "none";
  setupPanel.style.display = "block";
  captureVideoContainer.style.display = "block";
  btnStart.disabled = false;
  btnStart.textContent = "\u{1F680} Iniciar Experiencia AR";
  initSetupCamera();
}
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
  });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });
}
function startLoop() {
  if (!isRunning) return;
  drawVideoToCanvas(arCtx, video, WIDTH, HEIGHT);
  debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
  if (controller) {
    controller.processVideo(arCanvas);
  }
  requestAnimationFrame(startLoop);
}
function handleARUpdate(data, texts) {
  if (!isRunning) return;
  const scaleX = debugCanvas.width / WIDTH;
  const scaleY = debugCanvas.height / HEIGHT;
  if (data.type === "processDone") {
    const now = Date.now();
    let activeFound = false;
    let bestStatus = "Buscando...";
    let maxPriority = -1;
    for (const key in targetLastSeenTime) {
      const idx = parseInt(key);
      const timeSinceSeen = now - targetLastSeenTime[idx];
      if (timeSinceSeen < 200) {
        if (maxPriority < 2) {
          bestStatus = `Target ${idx + 1} Detectado`;
          maxPriority = 2;
        }
        activeFound = true;
      } else if (timeSinceSeen < LOST_GRACE_PERIOD) {
        if (maxPriority < 1) {
          bestStatus = `Target ${idx + 1} (Holding...)`;
          maxPriority = 1;
        }
        activeFound = true;
      }
    }
    statusLog.textContent = bestStatus;
    if (!activeFound) {
      detectedMsg.classList.remove("visible");
      if (persistentText) {
        persistentText.textContent = "Esperando detecci\xF3n...";
        persistentText.style.borderColor = "rgba(255, 255, 255, 0.1)";
        persistentText.style.background = "rgba(255, 255, 255, 0.05)";
      }
    }
    return;
  }
  if (data.type === "updateMatrix") {
    const { targetIndex, worldMatrix, screenCoords } = data;
    const now = Date.now();
    if (targetIndex !== void 0 && targetIndex >= 0 && worldMatrix) {
      targetLastSeenTime[targetIndex] = now;
      targetLastScreenCoords[targetIndex] = screenCoords;
      drawTrackingPoints(screenCoords, scaleX, scaleY);
      if (targetDetectionTimes[targetIndex] === null) {
        targetDetectionTimes[targetIndex] = now;
        targetLastSpokenText[targetIndex] = texts[targetIndex];
      }
      if (persistentText) {
        persistentText.textContent = texts[targetIndex];
        persistentText.style.borderColor = "var(--locus-success)";
        persistentText.style.background = "rgba(16, 185, 129, 0.1)";
      }
      if (now - targetDetectionTimes[targetIndex] >= 1e3 && targetLastSpokenText[targetIndex] === texts[targetIndex]) {
        const textToSpeak = texts[targetIndex];
        console.log(`[Demo4] Triggering TTS for target ${targetIndex}: "${textToSpeak}"`);
        triggerTTS(textToSpeak);
        detectedMsg.textContent = textToSpeak;
        detectedMsg.classList.add("visible");
        setTimeout(() => detectedMsg.classList.remove("visible"), 2e3);
      }
      return;
    }
    if (targetIndex !== void 0 && targetIndex >= 0) {
      if (now - targetLastSeenTime[targetIndex] < LOST_GRACE_PERIOD) {
        const lastCoords = targetLastScreenCoords[targetIndex];
        if (lastCoords) {
          drawTrackingPoints(lastCoords, scaleX, scaleY, true);
        }
      }
    }
  }
}
function triggerTTS(text) {
  if (!text) return;
  const now = Date.now();
  if (text === lastSpokenText && now - lastSpeakTime < 5e3) {
    console.log("[Demo4] TTS ignored (debounce same text)");
    return;
  }
  if (now - lastSpeakTime < 2e3) {
    console.log("[Demo4] TTS ignored (debounce fast switch)");
    return;
  }
  console.log("[Demo4] Speaking:", text);
  lastSpokenText = text;
  lastSpeakTime = now;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const esVoice = voices.find((v) => v.lang.startsWith("es"));
  if (esVoice) {
    utterance.voice = esVoice;
    utterance.lang = esVoice.lang;
  } else {
    utterance.lang = "es-ES";
  }
  utterance.onend = () => console.log("[Demo4] TTS finished");
  utterance.onerror = (e) => console.error("[Demo4] TTS error:", e);
  window.speechSynthesis.speak(utterance);
}
function drawVideoToCanvas(ctx, videoElement, targetWidth, targetHeight) {
  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;
  const videoRatio = videoWidth / videoHeight;
  const targetRatio = targetWidth / targetHeight;
  let sx, sy, sw, sh;
  if (videoRatio > targetRatio) {
    sh = videoHeight;
    sw = sh * targetRatio;
    sx = (videoWidth - sw) / 2;
    sy = 0;
  } else {
    sw = videoWidth;
    sh = sw / targetRatio;
    sx = 0;
    sy = (videoHeight - sh) / 2;
  }
  ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}
function drawTrackingPoints(coords, sx, sy, isHolding = false) {
  if (!coords) return;
  debugCtx.fillStyle = isHolding ? "rgba(255, 165, 0, 0.5)" : "rgba(0, 255, 0, 0.8)";
  debugCtx.strokeStyle = isHolding ? "rgba(255, 165, 0, 0.8)" : "rgba(0, 255, 0, 0.8)";
  debugCtx.lineWidth = 2;
  if (isHolding) {
    debugCtx.setLineDash([5, 5]);
  } else {
    debugCtx.setLineDash([]);
  }
  if (coords.length >= 4) {
    debugCtx.beginPath();
    debugCtx.moveTo(coords[0].x * sx, coords[0].y * sy);
    debugCtx.lineTo(coords[1].x * sx, coords[1].y * sy);
    debugCtx.lineTo(coords[3].x * sx, coords[3].y * sy);
    debugCtx.lineTo(coords[2].x * sx, coords[2].y * sy);
    debugCtx.closePath();
    debugCtx.stroke();
  }
}
