import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Controller } from '../src/runtime/controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { Matcher } from '../src/core/matching/matcher.js';
import { Estimator } from '../src/core/estimation/estimator.js';
import { DetectorLite } from '../src/core/detector/detector-lite.js';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Worker for Node.js environment
class MockWorker {
    constructor() {
        this.onmessage = null;
        this.matcher = null;
        this.estimator = null;
        this.matchingDataList = null;
    }

    postMessage(msg) {
        if (msg.type === 'setup') {
            this.matchingDataList = msg.matchingDataList;
            this.matcher = new Matcher(msg.inputWidth, msg.inputHeight);
            this.estimator = new Estimator(msg.projectionTransform);
        }
        if (msg.type === 'match') {
            const interestedTargetIndexes = msg.targetIndexes;
            let matchedTargetIndex = -1;
            let matchedModelViewTransform = null;
            let matchedDebugExtra = null;

            for (let i = 0; i < interestedTargetIndexes.length; i++) {
                const idx = interestedTargetIndexes[i];
                if (this.matchingDataList?.[idx]) {
                    const { keyframeIndex, screenCoords, worldCoords, debugExtra } = this.matcher.matchDetection(
                        this.matchingDataList[idx],
                        msg.featurePoints
                    );

                    if (keyframeIndex !== -1) {
                        const modelViewTransform = this.estimator.estimate({ screenCoords, worldCoords });
                        if (modelViewTransform) {
                            matchedTargetIndex = idx;
                            matchedModelViewTransform = modelViewTransform;
                            matchedDebugExtra = debugExtra;
                            break;
                        }
                    }
                }
            }
            if (this.onmessage) {
                this.onmessage({
                    data: {
                        type: 'matchDone',
                        targetIndex: matchedTargetIndex,
                        modelViewTransform: matchedModelViewTransform,
                        debugExtra: matchedDebugExtra
                    }
                });
            }
        }
    }
}

describe('AR Viewer (Controller)', () => {
    let controller;
    let mockWorker;
    let testImage;
    let taarData;
    let imgWidth, imgHeight;

    beforeEach(async () => {
        const testFile = path.join(__dirname, 'assets', 'test-image.png');
        const img = await Jimp.read(testFile);
        imgWidth = img.bitmap.width;
        imgHeight = img.bitmap.height;

        testImage = new Uint8Array(imgWidth * imgHeight);
        for (let i = 0; i < imgWidth * imgHeight; i++) {
            const r = img.bitmap.data[i * 4];
            const g = img.bitmap.data[i * 4 + 1];
            const b = img.bitmap.data[i * 4 + 2];
            testImage[i] = (r + g + b) / 3;
        }

        const compiler = new OfflineCompiler();
        const targetImages = [{
            width: imgWidth,
            height: imgHeight,
            data: img.bitmap.data
        }];

        await compiler.compileImageTargets(targetImages, (p) => { });
        const buffer = compiler.exportData();
        taarData = buffer;

        mockWorker = new MockWorker();
        controller = new Controller({
            inputWidth: imgWidth,
            inputHeight: imgHeight,
            worker: mockWorker
        });

        await controller.addImageTargetsFromBuffer(taarData);
    });

    it('should match a FULL target image (no crop)', async () => {
        const detector = new DetectorLite(imgWidth, imgHeight);
        const { featurePoints } = detector.detect(testImage);

        const { targetIndex, modelViewTransform } = await controller.match(featurePoints, 0);

        expect(targetIndex).toBe(0);
        expect(modelViewTransform).toBeDefined();
    });
});
