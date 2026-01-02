import { describe, it, expect } from 'vitest';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';

// Import TensorFlow and specifically the Node backend for performance in tests
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

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

        // We simulate a project with 4 identical images to test parallelization
        const targetImages = [targetImage, targetImage, targetImage, targetImage];

        console.log(`🧪 Compiling ${targetImages.length} images...`);
        const startTime = Date.now();

        // Testing the full process (Matching + Tracking)
        // Note: compileImageTargets calls both matching and tracking
        const results = await compiler.compileImageTargets(targetImages, (percent) => {
            process.stdout.write(`\rTotal Progress: ${percent.toFixed(2)}%`);
        });

        const totalDuration = (Date.now() - startTime) / 1000;
        console.log(`\n\n🏁 Benchmark Results:`);
        console.log(`⏱️ Total Duration for ${targetImages.length} images: ${totalDuration.toFixed(2)}s`);
        console.log(`🚀 Average time per image: ${(totalDuration / targetImages.length).toFixed(2)}s`);

        expect(results).toBeDefined();
        expect(results.length).toBe(targetImages.length);

        // Verify results structure
        results.forEach((res, i) => {
            expect(res).toHaveProperty('trackingData');
            expect(res).toHaveProperty('matchingData');
            console.log(`✅ Image ${i + 1}: Found ${res.trackingData[0].points.length} tracking points, ${res.matchingData[0].maximaPoints.length} matching points`);
        });

    }, 300000); // 5 minute timeout for safety
});
