import { describe, it, expect } from 'vitest';
import { Matcher } from '../src/compiler/matching/matcher.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { DetectorLite } from '../src/compiler/detector/detector-lite.js';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Matcher with Columnar Data', () => {
    it('should match features using Matcher class', async () => {

        const testFile = path.join(__dirname, 'assets', 'test-image.png');
        const img = await Jimp.read(testFile);
        const imgWidth = img.bitmap.width;
        const imgHeight = img.bitmap.height;

        const compiler = new OfflineCompiler();
        const targetImages = [{
            width: imgWidth,
            height: imgHeight,
            data: img.bitmap.data
        }];
        await compiler.compileImageTargets(targetImages, () => { });
        const mindBuffer = compiler.exportData();
        const importedData = compiler.importData(mindBuffer);
        const matchingData = importedData[0].matchingData;

        const greyData = new Uint8Array(imgWidth * imgHeight);
        for (let i = 0; i < imgWidth * imgHeight; i++) {
            const r = img.bitmap.data[i * 4];
            const g = img.bitmap.data[i * 4 + 1];
            const b = img.bitmap.data[i * 4 + 2];
            greyData[i] = (r + g + b) / 3;
        }
        const detector = new DetectorLite(imgWidth, imgHeight);
        const { featurePoints } = detector.detect(greyData);

        const matcher = new Matcher(imgWidth, imgHeight, true);
        const { keyframeIndex, screenCoords } = matcher.matchDetection(matchingData, featurePoints);

        console.log("Matched keyframe:", keyframeIndex);
        console.log("Inliers:", screenCoords?.length);

        expect(keyframeIndex).toBeGreaterThanOrEqual(0);
        expect(screenCoords.length).toBeGreaterThanOrEqual(6);
    }, 30000);

});
