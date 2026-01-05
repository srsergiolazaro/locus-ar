/**
 * Worker Node.js para compilación de imágenes AR
 * 
 * OPTIMIZADO: Sin TensorFlow para evitar bloqueos de inicialización.
 * Usa JavaScript puro para máxima velocidad.
 */
import { parentPort } from 'node:worker_threads';
import { extractTrackingFeatures } from './tracker/extract-utils.js';
import { buildTrackingImageList } from './image-list.js';
import { DetectorLite } from './detector/detector-lite.js';
import { build as hierarchicalClusteringBuild } from './matching/hierarchical-clustering.js';

if (!parentPort) {
    throw new Error('This file must be run as a worker thread.');
}

// Helper for Morton Order sorting inside worker
function getMorton(x, y) {
    let x_int = x | 0;
    let y_int = y | 0;
    x_int = (x_int | (x_int << 8)) & 0x00FF00FF;
    x_int = (x_int | (x_int << 4)) & 0x0F0F0F0F;
    x_int = (x_int | (x_int << 2)) & 0x33333333;
    x_int = (x_int | (x_int << 1)) & 0x55555555;
    y_int = (y_int | (y_int << 8)) & 0x00FF00FF;
    y_int = (y_int | (y_int << 4)) & 0x0F0F0F0F;
    y_int = (y_int | (y_int << 2)) & 0x33333333;
    y_int = (y_int | (y_int << 1)) & 0x55555555;
    return x_int | (y_int << 1);
}

const mortonCache = new Int32Array(2048); // Cache for sorting stability

function sortPoints(points) {
    if (points.length <= 1) return points;

    // Sort in-place to avoid allocations
    return points.sort((a, b) => {
        return getMorton(a.x, a.y) - getMorton(b.x, b.y);
    });
}

parentPort.on('message', async (msg) => {
    if (msg.type === 'compile') {
        const { targetImage, percentPerImage, basePercent } = msg;

        try {
            const imageList = buildTrackingImageList(targetImage);
            const percentPerAction = percentPerImage / imageList.length;
            let localPercent = 0;

            const trackingData = extractTrackingFeatures(imageList, (index) => {
                localPercent += percentPerAction;
                parentPort.postMessage({
                    type: 'progress',
                    percent: basePercent + localPercent
                });
            });

            parentPort.postMessage({
                type: 'compileDone',
                trackingData
            });
        } catch (error) {
            parentPort.postMessage({
                type: 'error',
                error: error.message + '\n' + error.stack
            });
        }
    } else if (msg.type === 'match') {
        const { targetImage, percentPerImage, basePercent } = msg;

        try {
            // 🚀 MOONSHOT: Only run detector ONCE on full-res image.
            // DetectorLite internally builds a pyramid (octaves 1.0, 0.5, 0.25, etc.)
            const detector = new DetectorLite(targetImage.width, targetImage.height, {
                useLSH: true
            });

            parentPort.postMessage({ type: 'progress', percent: basePercent + percentPerImage * 0.1 });

            const { featurePoints: allPoints } = detector.detect(targetImage.data);

            parentPort.postMessage({ type: 'progress', percent: basePercent + percentPerImage * 0.5 });

            // Group points by their scale (octave)
            const scalesMap = new Map();
            for (const p of allPoints) {
                const octaveScale = p.scale;
                let list = scalesMap.get(octaveScale);
                if (!list) {
                    list = [];
                    scalesMap.set(octaveScale, list);
                }

                // Coordinates in p are already full-res. 
                // We need them relative to the scaled image for the keyframe.
                list.push({
                    ...p,
                    x: p.x / octaveScale,
                    y: p.y / octaveScale,
                    scale: 1.0 // Keypoint scale is always 1.0 relative to its own keyframe image
                });
            }

            // Optional: Run another detector pass at an intermediate scale to improve coverage
            // (e.g. at 1/1.41 ratio) if tracking robustness suffers. 
            // For now, let's stick to octaves for MAXIMUM speed.

            const keyframes = [];
            const sortedScales = Array.from(scalesMap.keys()).sort((a, b) => a - b);

            const percentPerScale = (percentPerImage * 0.4) / sortedScales.length;

            for (const s of sortedScales) {
                const ps = scalesMap.get(s);
                const sortedPs = sortPoints(ps);
                const maximaPoints = sortedPs.filter((p) => p.maxima);
                const minimaPoints = sortedPs.filter((p) => !p.maxima);

                const maximaPointsCluster = hierarchicalClusteringBuild({ points: maximaPoints });
                const minimaPointsCluster = hierarchicalClusteringBuild({ points: minimaPoints });

                keyframes.push({
                    maximaPoints,
                    minimaPoints,
                    maximaPointsCluster,
                    minimaPointsCluster,
                    width: Math.round(targetImage.width / s),
                    height: Math.round(targetImage.height / s),
                    scale: 1.0 / s, // keyframe.scale is relative to full target image
                });

                parentPort.postMessage({
                    type: 'progress',
                    percent: basePercent + percentPerImage * 0.6 + keyframes.length * percentPerScale
                });
            }

            parentPort.postMessage({
                type: 'matchDone',
                matchingData: keyframes
            });
        } catch (error) {
            parentPort.postMessage({
                type: 'error',
                error: error.message + '\n' + error.stack
            });
        }
    } else if (msg.type === 'compile-all') {
        const { targetImage } = msg;

        try {
            // 1. Single Pass Detection + Pyramid Generation
            const detector = new DetectorLite(targetImage.width, targetImage.height, { useLSH: true });
            parentPort.postMessage({ type: 'progress', percent: 10 });

            const { featurePoints, pyramid } = detector.detect(targetImage.data);
            parentPort.postMessage({ type: 'progress', percent: 40 });

            // 2. Extract Tracking Data using the ALREADY BLURRED pyramid
            // We need 2 levels closest to 256 and 128
            const trackingImageList = [];

            // Octave 0 is Original blured. Octave 1 is 0.5x. Octave 2 is 0.25x.
            // We'll pick the best ones.
            const targetSizes = [256, 128];
            for (const targetSize of targetSizes) {
                let bestLevel = 0;
                let minDiff = Math.abs(Math.min(targetImage.width, targetImage.height) - targetSize);

                for (let l = 1; l < pyramid.length; l++) {
                    const img = pyramid[l][0];
                    const diff = Math.abs(Math.min(img.width, img.height) - targetSize);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestLevel = l;
                    }
                }

                const levelImg = pyramid[bestLevel][0];
                trackingImageList.push({
                    data: levelImg.data,
                    width: levelImg.width,
                    height: levelImg.height,
                    scale: levelImg.width / targetImage.width
                });
            }

            const trackingData = extractTrackingFeatures(trackingImageList, () => { });
            parentPort.postMessage({ type: 'progress', percent: 60 });

            // 3. Build Keyframes for Matching
            const scalesMap = new Map();
            for (const p of featurePoints) {
                const s = p.scale;
                let list = scalesMap.get(s);
                if (!list) {
                    list = [];
                    scalesMap.set(s, list);
                }
                list.push({ ...p, x: p.x / s, y: p.y / s, scale: 1.0 });
            }

            const keyframes = [];
            const sortedScales = Array.from(scalesMap.keys()).sort((a, b) => a - b);
            for (const s of sortedScales) {
                const ps = scalesMap.get(s);
                const sortedPs = sortPoints(ps);
                const maximaPoints = sortedPs.filter((p) => p.maxima);
                const minimaPoints = sortedPs.filter((p) => !p.maxima);
                const maximaPointsCluster = hierarchicalClusteringBuild({ points: maximaPoints });
                const minimaPointsCluster = hierarchicalClusteringBuild({ points: minimaPoints });

                keyframes.push({
                    maximaPoints,
                    minimaPoints,
                    maximaPointsCluster,
                    minimaPointsCluster,
                    width: Math.round(targetImage.width / s),
                    height: Math.round(targetImage.height / s),
                    scale: 1.0 / s,
                });
            }

            parentPort.postMessage({
                type: 'compileDone', // Reusing message type for compatibility with WorkerPool
                matchingData: keyframes,
                trackingData: trackingData
            });
        } catch (error) {
            parentPort.postMessage({
                type: 'error',
                error: error.message + '\n' + error.stack
            });
        }
    }
});
