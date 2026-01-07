import { describe, it, expect } from 'vitest';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';

// GPU.js will run in CPU mode in Node.js (no headless-gl)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Compiler Performance Benchmark', () => {
    it('should compile multiple images in parallel and measure performance', async () => {
        console.log('🚀 Starting Multi-Image Performance Benchmark...');

        const compiler = new OfflineCompiler();
        const imagePath = path.join(__dirname, 'assets/test-image.png');

        console.log(`📸 Loading test image: ${imagePath}`);
        const image = await Jimp.read(imagePath);
        const { width, height } = image.bitmap;
        image.greyscale();

        const grayscaleData = new Uint8Array(width * height);
        const rgbaData = image.bitmap.data;
        for (let i = 0; i < width * height; i++) {
            grayscaleData[i] = rgbaData[i * 4];
        }

        const targetImage = { width, height, data: grayscaleData };

        // We focus on a single image for detailed layer analysis
        const targetImages = [targetImage];

        console.log(`🧪 Compiling ${targetImages.length} image...`);
        const startTime = Date.now();

        // Testing the full process (Matching + Tracking)
        const results = await compiler.compileImageTargets(targetImages, (percent) => {
            process.stdout.write(`\rTotal Progress: ${percent.toFixed(2)}%`);
        });

        const totalDuration = (Date.now() - startTime) / 1000;

        // Export data to measure final file size
        const exportedData = compiler.exportData();
        const sizeInMB = exportedData.length / (1024 * 1024);

        console.log(`\n\n🏁 Benchmark Results:`);
        console.log(`⏱️ Total Duration: ${totalDuration.toFixed(2)}s`);
        console.log(`📦 Exported Size: ${sizeInMB.toFixed(2)} MB (${(exportedData.length / 1024).toFixed(2)} KB)`);

        expect(results).toBeDefined();
        expect(results.length).toBe(targetImages.length);

        // Verify results structure and log detailed layer info
        results.forEach((res, i) => {
            console.log(`\n✅ Image ${i + 1} Summary:`);
            console.log(`   - Tracking points: ${res.trackingData[0].points.length}`);
            console.log(`   - Matching Layers (Keyframes):`);

            res.matchingData.forEach((kf, kfIdx) => {
                const totalPoints = kf.maximaPoints.length + kf.minimaPoints.length;
                console.log(`     Layer ${kfIdx}: Scale=${kf.scale.toFixed(4)}, Dim=${kf.width}x${kf.height}, Points=${totalPoints} (Max:${kf.maximaPoints.length}, Min:${kf.minimaPoints.length})`);
            });
        });

        // 🚀 Verification Step: Ensure the compiled data actually works!
        console.log(`\n🔍 Verifying compiled data with Controller...`);
        const { Controller } = await import('../src/runtime/controller.js');

        const controller = new Controller({
            inputWidth: width,
            inputHeight: height,
            debugMode: false
        });

        // Load the exported buffer
        const loadResult = controller.addImageTargetsFromBuffer(exportedData);
        expect(loadResult).toBeDefined();

        // Prepare input for controller (it expects specific format or Uint8Array)
        // validationData is already grayscale Uint8Array
        const validationInput = grayscaleData;

        // 1. Detect features
        const { featurePoints } = await controller.detect(validationInput);
        console.log(`   - Detected ${featurePoints.length} features in validation pass.`);
        expect(featurePoints.length).toBeGreaterThan(0);

        // 2. Match against loaded target
        const { targetIndex, modelViewTransform } = await controller.match(featurePoints, 0);
        console.log(`   - Match Result: TargetIndex=${targetIndex}`);

        if (targetIndex !== -1) {
            console.log(`   ✅ Target FOUND! Match successful.`);
        } else {
            console.log(`   ❌ Target NOT found. Verification failed.`);
        }

        expect(targetIndex).toBe(0);
        expect(modelViewTransform).toBeDefined();

        controller.dispose();

    }, 300000); // 5 minute timeout for safety
});
