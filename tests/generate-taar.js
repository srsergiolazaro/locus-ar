import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log('🚀 Starting .taar generation...');

    const imagePath = path.join(__dirname, 'assets/test-image.png');
    const outputPath = path.join(__dirname, 'assets/targets.taar');

    console.log(`📸 Reading image: ${imagePath}`);
    const image = await Jimp.read(imagePath);
    const { width, height } = image.bitmap;

    console.log(`🖼️ Image dimensions: ${width}x${height}`);

    // Grayscale conversion
    image.greyscale();
    const grayscaleData = new Uint8Array(width * height);
    const rgbaData = image.bitmap.data;
    for (let i = 0; i < width * height; i++) {
        grayscaleData[i] = rgbaData[i * 4];
    }

    const compiler = new OfflineCompiler();

    console.log('🧪 Compiling...');
    await compiler.compileImageTargets(
        [{ width, height, data: grayscaleData }],
        (progress) => {
            process.stdout.write(`\rProgress: ${progress.toFixed(2)}%`);
        }
    );
    console.log('\n✅ Compilation complete!');

    console.log('📦 Exporting data...');
    const buffer = compiler.exportData();

    fs.writeFileSync(outputPath, buffer);
    console.log(`💾 Saved to: ${outputPath} (${(buffer.length / 1024).toFixed(2)} KB)`);

    await compiler.destroy();
}

run().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
