import { compute64 as hammingCompute64 } from "./hamming-distance.js";
import { createRandomizer } from "../utils/randomizer.js";

const MIN_FEATURE_PER_NODE = 32; // Increased from 16 for speed
const NUM_ASSIGNMENT_HYPOTHESES = 12; // Reduced from 16 for speed
const NUM_CENTERS = 8;

/**
 * 🚀 Moonshot Optimized K-Medoids
 * 
 * Major Optimizations:
 * 1. Flattened Memory: Operates on a single Uint32Array block instead of objects.
 * 2. Zero Property Access: Avoids .descriptors lookup in the tightest loop.
 * 3. Cache-Friendly: Accesses contiguous descriptor data.
 */
const _computeKMedoids = (options) => {
  const { descriptors, pointIndexes, randomizer } = options;
  const numPointIndexes = pointIndexes.length;

  const randomPointIndexes = new Int32Array(numPointIndexes);
  for (let i = 0; i < numPointIndexes; i++) {
    randomPointIndexes[i] = i;
  }

  let bestSumD = Number.MAX_SAFE_INTEGER;
  let bestAssignment = null;

  // Pre-fetch centers indices to avoid nested index lookups
  const centerPointIndices = new Int32Array(NUM_CENTERS);

  for (let i = 0; i < NUM_ASSIGNMENT_HYPOTHESES; i++) {
    randomizer.arrayShuffle({ arr: randomPointIndexes, sampleSize: NUM_CENTERS });

    // Set centers for this hypothesis
    for (let k = 0; k < NUM_CENTERS; k++) {
      centerPointIndices[k] = pointIndexes[randomPointIndexes[k]];
    }

    let sumD = 0;
    const currentAssignment = new Int32Array(numPointIndexes);

    for (let j = 0; j < numPointIndexes; j++) {
      const pIdx = pointIndexes[j];
      const pOffset = pIdx * 2;

      let bestD = 255; // Max possible Hamming for 64-bit is 64, but let's be safe
      let bestCenterIdx = -1;

      for (let k = 0; k < NUM_CENTERS; k++) {
        const cIdx = centerPointIndices[k];
        const cOffset = cIdx * 2;

        // DIRECT CALL TO INLINED HAMMING
        const d = hammingCompute64(descriptors, pOffset, descriptors, cOffset);

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

/**
 * Build hierarchical clusters
 */
const build = ({ points }) => {
  const numPoints = points.length;
  if (numPoints === 0) return { rootNode: { leaf: true, pointIndexes: [], centerPointIndex: null } };

  // 🚀 MOONSHOT: Flatten all descriptors into a single Uint32Array
  // This is the key to sub-second performance.
  const descriptors = new Uint32Array(numPoints * 2);
  for (let i = 0; i < numPoints; i++) {
    const d = points[i].descriptors;
    descriptors[i * 2] = d[0];
    descriptors[i * 2 + 1] = d[1];
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
  });
  return { rootNode };
};

const _build = (options) => {
  const { descriptors, pointIndexes, centerPointIndex, randomizer } = options;
  const numPoints = pointIndexes.length;

  let isLeaf = false;
  if (numPoints <= NUM_CENTERS || numPoints <= MIN_FEATURE_PER_NODE) {
    isLeaf = true;
  }

  const clusters = new Map();
  if (!isLeaf) {
    const assignment = _computeKMedoids({ descriptors, pointIndexes, randomizer });

    for (let i = 0; i < assignment.length; i++) {
      const centerIdx = pointIndexes[assignment[i]];
      let cluster = clusters.get(centerIdx);
      if (cluster === undefined) {
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
    centerPointIndex: centerPointIndex,
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
      }),
    );
  }
  return node;
};

export { build };
