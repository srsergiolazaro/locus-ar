import { describe, it, expect, vi } from 'vitest';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper: Load an image and compile it to a .taar buffer
 */
async function compileImageToBuffer(imagePath) {
    const compiler = new OfflineCompiler();
    const image = await Jimp.read(imagePath);
    const { width, height } = image.bitmap;

    image.greyscale();
    const grayscaleData = new Uint8Array(width * height);
    const rgbaData = image.bitmap.data;
    for (let i = 0; i < width * height; i++) {
        grayscaleData[i] = rgbaData[i * 4];
    }

    await compiler.compileImageTargets(
        [{ width, height, data: grayscaleData }],
        () => { } // silent progress
    );

    return compiler.exportData();
}

describe('Multi-Target Support', () => {
    const testImagePath = path.join(__dirname, 'assets/test-image.png');

    it('should compile the test image to a .taar buffer', async () => {
        console.log('📦 Compiling test image to buffer...');
        const buffer = await compileImageToBuffer(testImagePath);

        // exportData returns Uint8Array, which has a buffer property
        expect(buffer).toBeDefined();
        expect(buffer.length || buffer.byteLength).toBeGreaterThan(0);
        console.log(`✅ Buffer created: ${buffer.length || buffer.byteLength} bytes`);
    }, 60000);

    it('OfflineCompiler should import data from exported buffer', async () => {
        console.log('📦 Testing export/import cycle...');

        const buffer = await compileImageToBuffer(testImagePath);

        // Import the exported data
        const compiler = new OfflineCompiler();
        const { dataList } = compiler.importData(buffer);

        expect(dataList).toBeDefined();
        expect(Array.isArray(dataList)).toBe(true);
        expect(dataList.length).toBe(1); // 1 image compiled

        const item = dataList[0];
        expect(item).toHaveProperty('targetImage');
        expect(item).toHaveProperty('matchingData');
        expect(item).toHaveProperty('trackingData');

        console.log(`✅ Imported ${dataList.length} target(s)`);
        console.log(`   Target dimensions: ${item.targetImage.width}x${item.targetImage.height}`);
    }, 60000);

    it('should be able to combine multiple compiled buffers', async () => {
        console.log('📦 Testing multi-buffer combination...');

        // Compile the same image twice (simulating 2 different targets)
        const buffer1 = await compileImageToBuffer(testImagePath);
        const buffer2 = await compileImageToBuffer(testImagePath);

        // Import and combine
        const compiler = new OfflineCompiler();
        const { dataList: dataList1 } = compiler.importData(buffer1);
        const { dataList: dataList2 } = compiler.importData(buffer2);

        const combined = [...dataList1, ...dataList2];

        expect(combined).toHaveLength(2);
        expect(combined[0].targetImage).toBeDefined();
        expect(combined[1].targetImage).toBeDefined();

        console.log(`✅ Combined ${combined.length} targets from 2 buffers`);
    }, 120000);

    it('should validate target indexing with multiple targets', async () => {
        console.log('📦 Testing target indexing...');

        const buffer1 = await compileImageToBuffer(testImagePath);
        const buffer2 = await compileImageToBuffer(testImagePath);

        const compiler = new OfflineCompiler();
        const { dataList: dataList1 } = compiler.importData(buffer1);
        const { dataList: dataList2 } = compiler.importData(buffer2);

        // Simulate what Controller.addImageTargetsFromBuffers does
        const allTrackingData = [];
        const allMatchingData = [];
        const allDimensions = [];

        for (const item of dataList1) {
            allMatchingData.push(item.matchingData);
            allTrackingData.push(item.trackingData);
            allDimensions.push([item.targetImage.width, item.targetImage.height]);
        }

        for (const item of dataList2) {
            allMatchingData.push(item.matchingData);
            allTrackingData.push(item.trackingData);
            allDimensions.push([item.targetImage.width, item.targetImage.height]);
        }

        expect(allDimensions).toHaveLength(2);
        expect(allMatchingData).toHaveLength(2);
        expect(allTrackingData).toHaveLength(2);

        // Target indexes should be 0 and 1
        console.log(`✅ Target 0: ${allDimensions[0][0]}x${allDimensions[0][1]}`);
        console.log(`✅ Target 1: ${allDimensions[1][0]}x${allDimensions[1][1]}`);
    }, 120000);
});
