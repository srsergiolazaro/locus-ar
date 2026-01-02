import { parentPort, workerData } from 'node:worker_threads';
import { extractTrackingFeatures } from './tracker/extract-utils.js';
import { buildTrackingImageList, buildImageList } from './image-list.js';
import { Detector } from './detector/detector.js';
import { build as hierarchicalClusteringBuild } from './matching/hierarchical-clustering.js';
import { tf } from './tensorflow-setup.js';

if (!parentPort) {
    throw new Error('This file must be run as a worker thread.');
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
                error: error.message
            });
        }
    } else if (msg.type === 'match') {
        const { targetImage, percentPerImage, basePercent } = msg;

        try {
            const imageList = buildImageList(targetImage);
            const percentPerAction = percentPerImage / imageList.length;
            let localPercent = 0;

            const keyframes = [];
            for (let i = 0; i < imageList.length; i++) {
                const image = imageList[i];
                const detector = new Detector(image.width, image.height);

                await tf.nextFrame();
                tf.tidy(() => {
                    const inputT = tf
                        .tensor(image.data, [image.data.length], "float32")
                        .reshape([image.height, image.width]);

                    const { featurePoints: ps } = detector.detect(inputT);

                    const maximaPoints = ps.filter((p) => p.maxima);
                    const minimaPoints = ps.filter((p) => !p.maxima);
                    const maximaPointsCluster = hierarchicalClusteringBuild({ points: maximaPoints });
                    const minimaPointsCluster = hierarchicalClusteringBuild({ points: minimaPoints });

                    keyframes.push({
                        maximaPoints,
                        minimaPoints,
                        maximaPointsCluster,
                        minimaPointsCluster,
                        width: image.width,
                        height: image.height,
                        scale: image.scale,
                    });
                });

                localPercent += percentPerAction;
                parentPort.postMessage({
                    type: 'progress',
                    percent: basePercent + localPercent
                });
            }

            parentPort.postMessage({
                type: 'matchDone',
                matchingData: keyframes
            });
        } catch (error) {
            parentPort.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }
});
