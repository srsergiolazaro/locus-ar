import TinyQueue from "tinyqueue";
import { compute as hammingCompute } from "./hamming-distance.js";
import { computeHoughMatches } from "./hough.js";
import { computeHomography } from "./ransacHomography.js";
import { multiplyPointHomographyInhomogenous, matrixInverse33 } from "../utils/geometry.js";

const INLIER_THRESHOLD = 5.0; // Tightened from 10 to 5 for better precision
const MIN_NUM_INLIERS = 8;  // Restored to 8
const CLUSTER_MAX_POP = 20;
const HAMMING_THRESHOLD = 0.85; // Relaxed from 0.8 back to 0.85

// match list of querpoints against pre-built list of keyframes
const match = ({ keyframe, querypoints, querywidth, queryheight, debugMode }) => {
  let debugExtra = {};

  const matches = [];
  const qlen = querypoints.length;
  const kmax = keyframe.max;
  const kmin = keyframe.min;
  const descSize = 2; // Protocol V6: 64-bit LSH (2 x 32-bit)

  for (let j = 0; j < qlen; j++) {
    const querypoint = querypoints[j];
    const col = querypoint.maxima ? kmax : kmin;
    if (!col || col.x.length === 0) continue;

    const rootNode = col.t;
    const keypointIndexes = [];
    const queue = new TinyQueue([], (a1, a2) => a1.d - a2.d);

    // query potential candidates from the columnar tree
    _query({
      node: rootNode,
      descriptors: col.d,
      querypoint,
      queue,
      keypointIndexes,
      numPop: 0
    });

    let bestIndex = -1;
    let bestD1 = Number.MAX_SAFE_INTEGER;
    let bestD2 = Number.MAX_SAFE_INTEGER;

    const qDesc = querypoint.descriptors;
    const cDesc = col.d;

    for (let k = 0; k < keypointIndexes.length; k++) {
      const idx = keypointIndexes[k];

      // Use offsets based on detected descriptor size
      const d = hammingCompute({ v1: cDesc, v1Offset: idx * descSize, v2: qDesc });

      if (d < bestD1) {
        bestD2 = bestD1;
        bestD1 = d;
        bestIndex = idx;
      } else if (d < bestD2) {
        bestD2 = d;
      }
    }

    if (bestIndex !== -1) {
      if (bestD2 === Number.MAX_SAFE_INTEGER || (bestD1 / bestD2) < HAMMING_THRESHOLD) {
        matches.push({
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
  }

  if (matches.length < MIN_NUM_INLIERS) return { debugExtra };

  const houghMatches = computeHoughMatches({
    keywidth: keyframe.w,
    keyheight: keyframe.h,
    querywidth,
    queryheight,
    matches,
  });

  if (debugMode) debugExtra.houghMatches = houghMatches;

  const H = computeHomography({
    srcPoints: houghMatches.map((m) => [m.keypoint.x, m.keypoint.y]),
    dstPoints: houghMatches.map((m) => [m.querypoint.x, m.querypoint.y]),
    keyframe: { width: keyframe.w, height: keyframe.h },
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
  if (inlierMatches.length < MIN_NUM_INLIERS) return { debugExtra };

  // Second pass with homography guided matching
  const HInv = matrixInverse33(H, 0.00001);
  const dThreshold2 = 100; // 10 * 10
  const matches2 = [];

  const hi00 = HInv[0], hi01 = HInv[1], hi02 = HInv[2];
  const hi10 = HInv[3], hi11 = HInv[4], hi12 = HInv[5];
  const hi20 = HInv[6], hi21 = HInv[7], hi22 = HInv[8];

  for (let j = 0; j < qlen; j++) {
    const querypoint = querypoints[j];
    const qx = querypoint.x, qy = querypoint.y;

    // Inline multiplyPointHomographyInhomogenous
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

    for (let k = 0, clen = cx.length; k < clen; k++) {
      const dx = cx[k] - mapX;
      const dy = cy[k] - mapY;
      const d2 = dx * dx + dy * dy;

      if (d2 > dThreshold2) continue;

      const d = hammingCompute({ v1: cd, v1Offset: k * descSize, v2: qDesc });

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
      (bestD2 === Number.MAX_SAFE_INTEGER || (bestD1 / bestD2) < HAMMING_THRESHOLD)
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
    keywidth: keyframe.w,
    keyheight: keyframe.h,
    querywidth,
    queryheight,
    matches: matches2,
  });

  if (debugMode) debugExtra.houghMatches2 = houghMatches2;

  const H2 = computeHomography({
    srcPoints: houghMatches2.map((m) => [m.keypoint.x, m.keypoint.y]),
    dstPoints: houghMatches2.map((m) => [m.querypoint.x, m.querypoint.y]),
    keyframe: { width: keyframe.w, height: keyframe.h },
  });

  if (H2 === null) return { debugExtra };

  const inlierMatches2 = _findInlierMatches({
    H: H2,
    matches: houghMatches2,
    threshold: INLIER_THRESHOLD,
  });

  if (debugMode) debugExtra.inlierMatches2 = inlierMatches2;

  return { H: H2, matches: inlierMatches2, debugExtra };
};

const _query = ({ node, descriptors, querypoint, queue, keypointIndexes, numPop }) => {
  const descSize = 2;
  const isLeaf = node[0] === 1;
  const childrenOrIndices = node[2];

  if (isLeaf) {
    for (let i = 0; i < childrenOrIndices.length; i++) {
      keypointIndexes.push(childrenOrIndices[i]);
    }
    return;
  }

  const qDesc = querypoint.descriptors;
  let minD = Number.MAX_SAFE_INTEGER;
  const clen = childrenOrIndices.length;
  const distances = new Int32Array(clen);

  for (let i = 0; i < clen; i++) {
    const childNode = childrenOrIndices[i];
    const cIdx = childNode[1];

    const d = hammingCompute({
      v1: descriptors,
      v1Offset: cIdx * descSize,
      v2: qDesc,
    });
    distances[i] = d;
    if (d < minD) minD = d;
  }

  for (let i = 0; i < clen; i++) {
    const dist = distances[i];
    if (dist !== minD) {
      queue.push({ node: childrenOrIndices[i], d: dist });
    } else {
      _query({ node: childrenOrIndices[i], descriptors, querypoint, queue, keypointIndexes, numPop: numPop + 1 });
    }
  }

  if (numPop < CLUSTER_MAX_POP && queue.length > 0) {
    const { node } = queue.pop();
    _query({ node, descriptors, querypoint, queue, keypointIndexes, numPop: numPop + 1 });
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

    // Inline multiplyPointHomographyInhomogenous
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

export { match };
