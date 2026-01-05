import { describe, it, expect } from 'vitest';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { Matcher } from '../src/compiler/matching/matcher.js';
import { DetectorLite } from '../src/compiler/detector/detector-lite.js';
import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('End-to-End Detection (Protocol V5.1)', () => {
    it('should compile an image, export/import it, and detect it with high confidence', async () => {
        const imagePath = path.join(__dirname, 'assets/test-image.png');
        const image = await Jimp.read(imagePath);
        const { width, height } = image.bitmap;

        // 1. Compile with Protocol V5.1 (LSH 128-bit)
        const compiler = new OfflineCompiler();
        const targetImages = [{
            width,
            height,
            data: image.bitmap.data
        }];

        console.log('🔨 Compiling target...');
        await compiler.compileImageTargets(targetImages, () => { });

        // 2. Export and Import data (simulating network/storage)
        console.log('📂 Exporting and importing .taar data...');
        const exportedBuffer = compiler.exportData();
        const { dataList: importedData } = compiler.importData(exportedBuffer);

        expect(importedData.length).toBe(1);
        const matchingData = importedData[0].matchingData;

        // 3. Prepare query image (the same image, converted to grayscale)
        image.greyscale();
        const greyData = new Uint8Array(width * height);
        const rgbaData = image.bitmap.data;
        for (let i = 0; i < width * height; i++) {
            greyData[i] = rgbaData[i * 4];
        }

        // 4. Detect features in query image using LSH 128-bit
        console.log('🔍 Detecting features in query image...');
        const detector = new DetectorLite(width, height, { useLSH: true });
        const { featurePoints } = detector.detect(greyData);

        // 5. Perform Matching
        console.log('🎯 Matching query features against imported target...');
        const matcher = new Matcher(width, height, true);
        const result = matcher.matchDetection(matchingData, featurePoints);

        console.log(`✅ Result: KeyframeIndex=${result.keyframeIndex}, Inliers=${result.screenCoords?.length}`);

        // ASSERTIONS
        // Keyframe index 0 (our only image)
        expect(result.keyframeIndex).toBe(0);

        // Inliers should be high for the same image (usually > 100 for a well-featured image)
        // Protocol V5.1 with 128-bit LSH should maintain high inlier count
        expect(result.screenCoords.length).toBeGreaterThanOrEqual(50);

        // Verify world coordinates are present
        expect(result.worldCoords.length).toBe(result.screenCoords.length);
        expect(result.worldCoords[0]).toHaveProperty('x');
        expect(result.worldCoords[0]).toHaveProperty('y');
        expect(result.worldCoords[0]).toHaveProperty('z');
    }, 40000);
});
