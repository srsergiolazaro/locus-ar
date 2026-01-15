import { compute64 as hammingCompute64 } from "./hamming-distance.js";
import { createRandomizer } from "../utils/randomizer.js";
const MIN_FEATURE_PER_NODE = 32;
const NUM_ASSIGNMENT_HYPOTHESES = 12;
const NUM_CENTERS = 8;
export function popcount32(n) {
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}
const _computeKMedoids = (options) => {
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
                    d = popcount32(descriptors[pIdx] ^ descriptors[cIdx]);
                }
                else {
                    d = hammingCompute64(descriptors, pIdx * 2, descriptors, cIdx * 2);
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
const build = ({ points }) => {
    const numPoints = points.length;
    if (numPoints === 0)
        return { rootNode: { leaf: true, pointIndexes: [], centerPointIndex: null } };
    const useHDC = points[0] && points[0].hdcSignature !== undefined;
    const descriptors = new Uint32Array(useHDC ? numPoints : numPoints * 2);
    for (let i = 0; i < numPoints; i++) {
        if (useHDC) {
            descriptors[i] = points[i].hdcSignature;
        }
        else {
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
const _build = (options) => {
    const { descriptors, pointIndexes, centerPointIndex, randomizer, useHDC } = options;
    const numPoints = pointIndexes.length;
    let isLeaf = false;
    if (numPoints <= NUM_CENTERS || numPoints <= MIN_FEATURE_PER_NODE) {
        isLeaf = true;
    }
    const clusters = new Map();
    if (!isLeaf) {
        const assignment = _computeKMedoids({ descriptors, pointIndexes, randomizer, useHDC });
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
        node.children.push(_build({
            descriptors,
            pointIndexes: new Int32Array(clusterPoints),
            centerPointIndex: cIdx,
            randomizer,
            useHDC
        }));
    }
    return node;
};
export { build };
