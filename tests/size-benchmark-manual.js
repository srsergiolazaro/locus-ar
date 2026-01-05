import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBenchmark() {
    console.log('📊 Measuring current state with Morton Z-Order...');

    const compiler = new OfflineCompiler();
    const imagePath = path.join(__dirname, 'assets/test-image.png');

    const image = await Jimp.read(imagePath);
    const { width, height } = image.bitmap;
    image.greyscale();

    const grayscaleData = new Uint8Array(width * height);
    const rgbaData = image.bitmap.data;
    for (let i = 0; i < width * height; i++) {
        grayscaleData[i] = rgbaData[i * 4];
    }

    const targetImage = { width, height, data: grayscaleData };
    const targetImages = [targetImage];

    const startTime = Date.now();
    const results = await compiler.compileImageTargets(targetImages, () => { });
    const duration = Date.now() - startTime;

    const buffer = compiler.exportData();
    const sizeKB = buffer.length / 1024;

    // Measure compressed size to show the power of Morton + XOR
    const compressed = await gzip(buffer);
    const compressedKB = compressed.length / 1024;

    console.log(`\n--- Compilation Metrics ---`);
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`📦 Final Size (Raw .taar): ${sizeKB.toFixed(2)} KB`);
    console.log(`🗜️ Compressed Size (Gzip): ${compressedKB.toFixed(2)} KB`);
    console.log(`📉 Compression Ratio: ${((1 - compressedKB / sizeKB) * 100).toFixed(1)}%`);
    console.log(`✅ Matching points: ${results[0].matchingData[0].maximaPoints.length + results[0].matchingData[0].minimaPoints.length}`);
    console.log(`✅ Tracking points: ${results[0].trackingData[0].points.length}`);
    console.log(`---------------------------\n`);
}

runBenchmark().catch(console.error);
