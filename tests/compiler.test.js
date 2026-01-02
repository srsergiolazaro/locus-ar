import { describe, it, expect } from 'vitest';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';

// GPU.js will run in CPU mode in Node.js (no headless-gl)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('OfflineCompiler', () => {
    it('should compile an image for tracking', async () => {
        console.log('🚀 Starting OfflineCompiler test with Jimp...');

        const compiler = new OfflineCompiler();
        const imagePath = path.join(__dirname, 'assets/test-image.png');

        console.log(`📸 Loading image with Jimp: ${imagePath}`);
        const image = await Jimp.read(imagePath);

        const { width, height } = image.bitmap;
        console.log(`🖼️ Loaded image: ${width}x${height}`);

        // Convert to grayscale using Jimp
        image.greyscale();

        // Extract grayscale data (R=G=B since it is greyscale)
        const grayscaleData = new Uint8Array(width * height);
        const rgbaData = image.bitmap.data;
        for (let i = 0; i < width * height; i++) {
            grayscaleData[i] = rgbaData[i * 4];
        }

        const targetImage = {
            width,
            height,
            data: grayscaleData
        };

        console.log('🧪 Running compileTrack...');
        const startTime = Date.now();

        const result = await compiler.compileTrack({
            progressCallback: (percent) => {
                process.stdout.write(`\rCompilation progress: ${percent.toFixed(2)}%`);
            },
            targetImages: [targetImage],
            basePercent: 0
        });

        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n✅ Compilation finished in ${duration.toFixed(2)}s`);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);

        const trackingData = result[0];
        expect(Array.isArray(trackingData)).toBe(true);
        expect(trackingData.length).toBeGreaterThan(0);

        console.log(`📈 Extracted ${trackingData.length} feature levels/sets`);

        const firstLevel = trackingData[0];
        expect(firstLevel).toHaveProperty('points');
        expect(Array.isArray(firstLevel.points)).toBe(true);
        expect(firstLevel.points.length).toBeGreaterThan(0);

        console.log(`📍 Found ${firstLevel.points.length} points in the first level`);
    }, 120000);
});
