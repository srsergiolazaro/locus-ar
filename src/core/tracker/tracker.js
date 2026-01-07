import { buildModelViewProjectionTransform, computeScreenCoordiate } from "../estimation/utils.js";
import { refineNonRigid, projectMesh } from "../estimation/non-rigid-refine.js";

const AR2_DEFAULT_TS = 6;
const AR2_DEFAULT_TS_GAP = 1;
const AR2_SEARCH_SIZE = 12; // Reduced from 25 to 12 for high-speed tracking (25 is overkill)
const AR2_SEARCH_GAP = 1;
const AR2_SIM_THRESH = 0.65; // Increased from 0.6 to reduce false positives

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

    this.trackingKeyframeList = []; // All octaves for all targets: [targetIndex][octaveIndex]
    this.prebuiltData = []; // [targetIndex][octaveIndex]

    for (let i = 0; i < trackingDataList.length; i++) {
      const targetOctaves = trackingDataList[i];
      this.trackingKeyframeList[i] = targetOctaves;
      this.prebuiltData[i] = targetOctaves.map(keyframe => ({
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

    // Maintain mesh vertices state for temporal continuity
    this.meshVerticesState = []; // [targetIndex][octaveIndex]

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

    // Select the best octave based on current estimated distance/scale
    // We want the octave where the marker size is closest to its projected size on screen
    const modelViewProjectionTransform = buildModelViewProjectionTransform(
      this.projectionTransform,
      lastModelViewTransform,
    );

    // Estimate current marker width on screen
    const [mW, mH] = this.markerDimensions[targetIndex];
    const p0 = computeScreenCoordiate(modelViewProjectionTransform, 0, 0);
    const p1 = computeScreenCoordiate(modelViewProjectionTransform, mW, 0);
    const screenW = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);

    // Select octave whose image width is closest to screenW
    // Select the best octave based on current estimated distance/scale
    // Hysteresis: prevent flip-flopping between octaves
    if (!this.lastOctaveIndex) this.lastOctaveIndex = [];

    let octaveIndex = this.lastOctaveIndex[targetIndex] !== undefined ? this.lastOctaveIndex[targetIndex] : 0;
    let minDiff = Math.abs(this.prebuiltData[targetIndex][octaveIndex].width - screenW);

    // Threshold to switch: only switch if another octave is much better (20% improvement)
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
          matchingPoints[i][1],
        );
        screenCoords.push(point);
        worldCoords.push({
          x: px[i] / scale,
          y: py[i] / scale,
          z: 0,
        });
        reliabilities.push(reliability);
      }
    }

    // --- 🚀 MOONSHOT: Non-Rigid Mesh Refinement ---
    let deformedMesh = null;
    if (prebuilt.mesh && goodTrack.length >= 4) {
      if (!this.meshVerticesState[targetIndex]) this.meshVerticesState[targetIndex] = [];

      let currentOctaveVertices = this.meshVerticesState[targetIndex][octaveIndex];

      // Initial setup: If no state, use the reference points (normalized) as first guess
      if (!currentOctaveVertices) {
        currentOctaveVertices = new Float32Array(px.length * 2);
        for (let i = 0; i < px.length; i++) {
          currentOctaveVertices[i * 2] = px[i];
          currentOctaveVertices[i * 2 + 1] = py[i];
        }
      }

      // Data fidelity: Prepare tracked targets for mass-spring
      const trackedTargets = [];
      for (let j = 0; j < goodTrack.length; j++) {
        const idx = goodTrack[j];
        trackedTargets.push({
          meshIndex: idx,
          x: matchingPoints[idx][0] * scale, // Convert back to octave space pixels
          y: matchingPoints[idx][1] * scale
        });
      }

      // Relax mesh in octave space
      const refinedOctaveVertices = refineNonRigid({
        mesh: prebuilt.mesh,
        trackedPoints: trackedTargets,
        currentVertices: currentOctaveVertices,
        iterations: 5
      });

      this.meshVerticesState[targetIndex][octaveIndex] = refinedOctaveVertices;

      // Project deformed mesh to screen space
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

    // 2.1 Spatial distribution check: Avoid getting stuck in corners/noise
    if (screenCoords.length >= 8) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of screenCoords) {
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
      }
      const detectedDiagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);

      // If the points cover too little space compared to the screen size of the marker, it's a glitch
      if (detectedDiagonal < screenW * 0.15) {
        return { worldCoords: [], screenCoords: [], reliabilities: [], debugExtra };
      }
    }
    if (this.debugMode) {
      debugExtra = {
        octaveIndex,
        // Remove Array.from to avoid massive GC pressure
        projectedImage: projectedImage,
        matchingPoints,
        goodTrack,
        trackedPoints: screenCoords,
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

      // 🚀 MOONSHOT: Coarse-to-Fine Search for MAXIMUM FPS
      // Step 1: Coarse search (Gap 4)
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
              sumI += valI; sumI2 += valI * valI; sumIT += valI * valT;
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

      // Step 2: Fine refinement (Gap 1) only around the best coarse match
      if (bestSim > AR2_SIM_THRESH) {
        const fineCenterX = (bestX * scale) | 0;
        const fineCenterY = (bestY * scale) | 0;
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
                sumI += valI; sumI2 += valI * valI; sumIT += valI * valT;
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
