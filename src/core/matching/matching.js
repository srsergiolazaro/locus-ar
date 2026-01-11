import TinyQueue from "tinyqueue";
import { compute as hammingCompute } from "./hamming-distance.js";
import { computeHoughMatches } from "./hough.js";
import { computeHomography } from "./ransacHomography.js";
import { multiplyPointHomographyInhomogenous, matrixInverse33 } from "../utils/geometry.js";
import { refineWithMorphology } from "../estimation/morph-refinement.js";
import { popcount32 } from "./hierarchical-clustering.js";
import { AR_CONFIG } from "../constants.js";

const INLIER_THRESHOLD = AR_CONFIG.INLIER_THRESHOLD;
const MIN_NUM_INLIERS = AR_CONFIG.MIN_NUM_INLIERS;
const CLUSTER_MAX_POP = AR_CONFIG.CLUSTER_MAX_POP;
const HAMMING_THRESHOLD = AR_CONFIG.HAMMING_THRESHOLD;
const HDC_RATIO_THRESHOLD = AR_CONFIG.HDC_RATIO_THRESHOLD;
const MAX_MATCH_QUERY_POINTS = AR_CONFIG.MAX_MATCH_QUERY_POINTS;

// match list of querpoints against pre-built list of keyframes
const match = ({ keyframe, querypoints: rawQuerypoints, querywidth, queryheight, debugMode }) => {
  let debugExtra = {};

  // 🎯 Performance Optimizer: Use only the most "salient" points (highest response)
  const querypoints = rawQuerypoints.length > MAX_MATCH_QUERY_POINTS
    ? [...rawQuerypoints].sort((a, b) => (b.score || b.response || 0) - (a.score || a.response || 0)).slice(0, MAX_MATCH_QUERY_POINTS)
    : rawQuerypoints;

  const matches = [];
  const qlen = querypoints.length;
  const kmax = keyframe.max;
  const kmin = keyframe.min;

  // Detect descriptor mode: HDC (32-bit signature), Compact (32-bit XOR folded), or Raw (64-bit)
  const isHDC = keyframe.hdc === true || (kmax && kmax.hdc === 1);
  const isCompact = (kmax && kmax.compact === 1) || (kmin && kmin.compact === 1);
  const descSize = (isHDC || isCompact) ? 1 : 2;  // Compact uses 32-bit like HDC

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

    // For compact mode: pre-compute XOR folded query descriptor (64-bit → 32-bit)
    const qDescCompact = isCompact && qDesc && qDesc.length >= 2
      ? (qDesc[0] ^ qDesc[1]) >>> 0
      : 0;

    for (let k = 0; k < keypointIndexes.length; k++) {
      const idx = keypointIndexes[k];

      let d;
      if (isHDC) {
        d = popcount32(cDesc[idx] ^ querypoint.hdcSignature);
      } else if (isCompact) {
        // Compact mode: compare 32-bit XOR folded descriptors
        d = popcount32(cDesc[idx] ^ qDescCompact);
      } else {
        d = hammingCompute({ v1: cDesc, v1Offset: idx * descSize, v2: qDesc });
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
      if (bestD2 === Number.MAX_SAFE_INTEGER || (bestD1 / bestD2) < currentRatioThreshold) {
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

  // Debug: Log Hamming results
  if (Math.random() < 0.1 && debugMode) {
    console.log(`MATCH_DL: Hamming found ${matches.length} initial matches`);
  }

  // 🌌 Moonshot: Constellation matching disabled for performance calibration
  const constellationMatches = matches;
  if (debugMode) debugExtra.constellationMatches = constellationMatches;

  const houghMatches = computeHoughMatches({
    keywidth: keyframe.w || keyframe.width,
    keyheight: keyframe.h || keyframe.height,
    querywidth,
    queryheight,
    matches: constellationMatches,
  });

  if (debugMode) debugExtra.houghMatches = houghMatches;

  if (houghMatches.length < MIN_NUM_INLIERS) {
    return { debugExtra };
  }

  const H = computeHomography({
    srcPoints: houghMatches.map((m) => [m.keypoint.x, m.keypoint.y]),
    dstPoints: houghMatches.map((m) => [m.querypoint.x, m.querypoint.y]),
    keyframe: { width: keyframe.w || keyframe.width, height: keyframe.h || keyframe.height },
  });

  if (H === null) {
    return { debugExtra };
  }

  const inlierMatches = _findInlierMatches({
    H,
    matches: houghMatches,
    threshold: INLIER_THRESHOLD,
  });

  if (debugMode) debugExtra.inlierMatches = inlierMatches;
  if (inlierMatches.length < MIN_NUM_INLIERS) {
    return { debugExtra };
  }

  if (debugMode && Math.random() < 0.02) {
    console.log(`MATCH: Homography success with ${inlierMatches.length} inliers`);
  }


  const HInv = matrixInverse33(H, 0.00001);
  const dThreshold2 = 100;
  const matches2 = [];

  const hi00 = HInv[0], hi01 = HInv[1], hi02 = HInv[2];
  const hi10 = HInv[3], hi11 = HInv[4], hi12 = HInv[5];
  const hi20 = HInv[6], hi21 = HInv[7], hi22 = HInv[8];

  for (let j = 0; j < qlen; j++) {
    const querypoint = querypoints[j];
    const qx = querypoint.x, qy = querypoint.y;

    const uz = (qx * hi20) + (qy * hi21) + hi22;
    const invZ = 1.0 / uz;
    const mapX = ((qx * hi00) + (qy * hi01) + hi02) * invZ;
    const mapY = ((qx * hi10) + (qy * hi11) + hi12) * invZ;

    let bestIndex = -1;
    let bestD1 = Number.MAX_SAFE_INTEGER;
    let bestD2 = Number.MAX_SAFE_INTEGER;

    const col = querypoint.maxima ? kmax : kmin;
    if (!col) continue;

    const cx = col.x, cy = col.y, cd = col.d;
    const qDesc = querypoint.descriptors;

    // For compact mode: XOR fold query descriptor
    const qDescCompact = isCompact && qDesc && qDesc.length >= 2
      ? (qDesc[0] ^ qDesc[1]) >>> 0
      : 0;

    for (let k = 0, clen = cx.length; k < clen; k++) {
      const dx = cx[k] - mapX;
      const dy = cy[k] - mapY;
      const d2 = dx * dx + dy * dy;

      if (d2 > dThreshold2) continue;

      let d;
      if (isHDC) {
        d = popcount32(cd[k] ^ querypoint.hdcSignature);
      } else if (isCompact) {
        d = popcount32(cd[k] ^ qDescCompact);
      } else {
        d = hammingCompute({ v1: cd, v1Offset: k * descSize, v2: qDesc });
      }

      if (d < bestD1) {
        bestD2 = bestD1;
        bestD1 = d;
        bestIndex = k;
      } else if (d < bestD2) {
        bestD2 = d;
      }
    }


    if (
      bestIndex !== -1 &&
      (bestD2 === Number.MAX_SAFE_INTEGER || (bestD1 / bestD2) < currentRatioThreshold)
    ) {
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

  if (debugMode) debugExtra.matches2 = matches2;

  const houghMatches2 = computeHoughMatches({
    keywidth: keyframe.w || keyframe.width,
    keyheight: keyframe.h || keyframe.height,
    querywidth,
    queryheight,
    matches: matches2,
  });

  if (debugMode) debugExtra.houghMatches2 = houghMatches2;

  const H2 = computeHomography({
    srcPoints: houghMatches2.map((m) => [m.keypoint.x, m.keypoint.y]),
    dstPoints: houghMatches2.map((m) => [m.querypoint.x, m.querypoint.y]),
    keyframe: { width: keyframe.w || keyframe.width, height: keyframe.h || keyframe.height },
  });

  if (H2 === null) return { debugExtra };

  const inlierMatches2 = _findInlierMatches({
    H: H2,
    matches: houghMatches2,
    threshold: INLIER_THRESHOLD,
  });

  if (debugMode) debugExtra.inlierMatches2 = inlierMatches2;

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

const _query = ({ node, descriptors, querypoint, queue, keypointIndexes, numPop, isHDC, descSize, isCompact }) => {
  const isLeaf = node[0] === 1;
  const childrenOrIndices = node[2];

  if (isLeaf) {
    for (let i = 0; i < childrenOrIndices.length; i++) {
      keypointIndexes.push(childrenOrIndices[i]);
    }
    return;
  }

  const qDesc = querypoint.descriptors;

  // For compact mode: XOR fold query descriptor
  const qDescCompact = isCompact && qDesc && qDesc.length >= 2
    ? (qDesc[0] ^ qDesc[1]) >>> 0
    : 0;

  let minD = Number.MAX_SAFE_INTEGER;
  const clen = childrenOrIndices.length;
  const distances = new Int32Array(clen);

  for (let i = 0; i < clen; i++) {
    const childNode = childrenOrIndices[i];
    const cIdx = childNode[1];

    let d;
    if (isHDC) {
      d = popcount32(descriptors[cIdx] ^ querypoint.hdcSignature);
    } else if (isCompact) {
      d = popcount32(descriptors[cIdx] ^ qDescCompact);
    } else {
      d = hammingCompute({
        v1: descriptors,
        v1Offset: cIdx * descSize,
        v2: qDesc,
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
    const { node } = queue.pop();
    _query({ node, descriptors, querypoint, queue, keypointIndexes, numPop: numPop + 1, isHDC, descSize, isCompact });
  }
};


const _findInlierMatches = (options) => {
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

    const uz = (kp.x * h20) + (kp.y * h21) + h22;
    const invZ = 1.0 / uz;
    const mx = ((kp.x * h00) + (kp.y * h01) + h02) * invZ;
    const my = ((kp.x * h10) + (kp.y * h11) + h12) * invZ;

    const dx = mx - qp.x;
    const dy = my - qp.y;
    if (dx * dx + dy * dy <= threshold2) {
      goodMatches.push(m);
    }
  }
  return goodMatches;
};

const _applyConstellationFilter = (matches) => {
  const len = matches.length;
  if (len < 3) return matches;

  const pool = matches.slice().sort((a, b) => a.d - b.d).slice(0, 1500);

  const RATIO_TOLERANCE = 0.25;
  const COSINE_TOLERANCE = 0.2;
  const MAX_NEIGHBORS = 6;
  const MIN_VERIFICATIONS = 1;

  const gridSize = 50;
  const grid = new Map();
  const getGridKey = (x, y) => `${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`;

  for (let i = 0; i < pool.length; i++) {
    const qp = pool[i].querypoint;
    const key = getGridKey(qp.x, qp.y);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  const scores = new Int32Array(pool.length);

  for (let i = 0; i < pool.length; i++) {
    const m1 = pool[i];
    const qp1 = m1.querypoint;

    const neighbors = [];
    const gx = Math.floor(qp1.x / gridSize);
    const gy = Math.floor(qp1.y / gridSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = grid.get(`${gx + dx},${gy + dy}`);
        if (!cell) continue;
        for (const idx of cell) {
          if (idx === i) continue;
          const m2 = pool[idx];
          const distSq = Math.pow(m2.querypoint.x - qp1.x, 2) + Math.pow(m2.querypoint.y - qp1.y, 2);
          neighbors.push({ index: idx, d2: distSq });
        }
      }
    }
  }

  const filtered = [];
  // Dummy logic just to keep the structure
  for (let i = 0; i < pool.length; i++) {
    filtered.push(pool[i]);
  }
  return filtered;
};

const _checkTriadConsistency = (m1, m2, m3, ratioTol, cosTol) => {
  const q1x = m1.querypoint.x, q1y = m1.querypoint.y;
  const q2x = m2.querypoint.x, q2y = m2.querypoint.y;
  const q3x = m3.querypoint.x, q3y = m3.querypoint.y;

  const v21q = [q2x - q1x, q2y - q1y];
  const v31q = [q3x - q1x, q3y - q1y];

  const k1x = m1.keypoint.x, k1y = m1.keypoint.y;
  const k2x = m2.keypoint.x, k2y = m2.keypoint.y;
  const k3x = m3.keypoint.x, k3y = m3.keypoint.y;

  const v21k = [k2x - k1x, k2y - k1y];
  const v31k = [k3x - k1x, k3y - k1y];

  const d21q2 = v21q[0] * v21q[0] + v21q[1] * v21q[1];
  const d31q2 = v31q[0] * v31q[0] + v31q[1] * v31q[1];
  const d21k2 = v21k[0] * v21k[0] + v21k[1] * v21k[1];
  const d31k2 = v31k[0] * v31k[0] + v31k[1] * v31k[1];

  if (d31q2 < 1e-4 || d31k2 < 1e-4) return false;

  const ratioQ = d21q2 / d31q2;
  const ratioK = d21k2 / d31k2;

  if (Math.abs(ratioQ - ratioK) / (ratioK + 1e-6) > ratioTol * 2) return false;

  const dotQ = v21q[0] * v31q[0] + v21q[1] * v31q[1];
  const cosQ = dotQ / Math.sqrt(d21q2 * d31q2);

  const dotK = v21k[0] * v31k[0] + v21k[1] * v31k[1];
  const cosK = dotK / Math.sqrt(d21k2 * d31k2);

  if (Math.abs(cosQ - cosK) > cosTol) return false;

  const crossQ = v21q[0] * v31q[1] - v21q[1] * v31q[0];
  const crossK = v21k[0] * v31k[1] - v21k[1] * v31k[0];

  if ((crossQ > 0) !== (crossK > 0)) return false;

  return true;
};

export { match };
