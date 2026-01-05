import { describe, it, expect } from 'vitest';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import path from 'path';
import { Jimp } from 'jimp';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Generator', () => {
    it('should generate a .taar file in assets', async () => {
        const compiler = new OfflineCompiler();
        const imagePath = path.join(__dirname, 'assets/test-image.png');
        const outputPath = path.join(__dirname, 'assets/targets.taar');

        console.log(`📸 Loading image: ${imagePath}`);
        const image = await Jimp.read(imagePath);
        const { width, height } = image.bitmap;

        // Grayscale conversion
        image.greyscale();
        const grayscaleData = new Uint8Array(width * height);
        const rgbaData = image.bitmap.data;
        for (let i = 0; i < width * height; i++) {
            grayscaleData[i] = rgbaData[i * 4];
        }

        console.log('🧪 Compiling...');
        await compiler.compileImageTargets(
            [{ width, height, data: grayscaleData }],
            (progress) => {
                process.stdout.write(`\rProgress: ${progress.toFixed(2)}%`);
            }
        );

        const buffer = compiler.exportData();
        fs.writeFileSync(outputPath, buffer);
        console.log(`\n✅ Saved to: ${outputPath} (${(buffer.length / 1024).toFixed(2)} KB)`);

        expect(fs.existsSync(outputPath)).toBe(true);

        await compiler.destroy();
    }, 120000);
});
