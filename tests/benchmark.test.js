/**
 * Benchmark Comparativo: TaptApp AR vs MindAR Oficial
 * 
 * Este test compara el rendimiento del compilador optimizado de TaptApp AR
 * contra el compilador oficial de MindAR.
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';

// TaptApp AR (Optimizado)
import { OfflineCompiler as TaptAppCompiler } from '../src/compiler/offline-compiler.js';

// MindAR Oficial
import { OfflineCompiler as MindARCompiler } from '../mind-ar-js-benchmark/src/image-target/offline-compiler.js';

// TensorFlow para MindAR
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Benchmark: TaptApp AR vs MindAR Official', () => {
    it('should compare compilation times', async () => {
        console.log('\n🏁 BENCHMARK: TaptApp AR vs MindAR Official\n');
        console.log('='.repeat(50));

        // Load test image
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
        console.log(`🖼️ Image size: ${width}x${height}\n`);

        // =============================================
        // TEST 1: TaptApp AR (Optimizado)
        // =============================================
        console.log('--- TaptApp AR (Optimizado) ---');
        const taptappCompiler = new TaptAppCompiler();

        const taptappStart = Date.now();
        const taptappResult = await taptappCompiler.compileTrack({
            progressCallback: () => { },
            targetImages: [targetImage],
            basePercent: 0
        });
        const taptappDuration = (Date.now() - taptappStart) / 1000;

        const taptappPoints = taptappResult[0]?.[0]?.points?.length || 0;
        console.log(`⏱️  Tiempo: ${taptappDuration.toFixed(3)}s`);
        console.log(`📍 Puntos extraídos: ${taptappPoints}`);
        console.log(`🔧 TensorFlow: NO\n`);

        // =============================================
        // TEST 2: MindAR Oficial
        // =============================================
        console.log('--- MindAR Oficial ---');

        // Esperar a que TensorFlow esté listo
        await tf.ready();

        const mindARCompiler = new MindARCompiler();

        const mindARStart = Date.now();
        const mindARResult = await mindARCompiler.compileTrack({
            progressCallback: () => { },
            targetImages: [targetImage],
            basePercent: 0
        });
        const mindARDuration = (Date.now() - mindARStart) / 1000;

        const mindARPoints = mindARResult[0]?.[0]?.points?.length || 0;
        console.log(`⏱️  Tiempo: ${mindARDuration.toFixed(3)}s`);
        console.log(`📍 Puntos extraídos: ${mindARPoints}`);
        console.log(`🔧 TensorFlow: SÍ (tfjs-node)\n`);

        // =============================================
        // RESULTADOS
        // =============================================
        console.log('='.repeat(50));
        console.log('📊 RESULTADOS COMPARATIVOS\n');

        const speedup = mindARDuration / taptappDuration;

        console.log(`| Compilador    | Tiempo    | Puntos | TensorFlow |`);
        console.log(`|---------------|-----------|--------|------------|`);
        console.log(`| TaptApp AR    | ${taptappDuration.toFixed(3)}s   | ${taptappPoints}     | ❌ No      |`);
        console.log(`| MindAR        | ${mindARDuration.toFixed(3)}s   | ${mindARPoints}     | ✅ Sí      |`);
        console.log(`|---------------|-----------|--------|------------|`);
        console.log(`| Speedup       | ${speedup.toFixed(1)}x más rápido |`);
        console.log('');

        // Verificaciones básicas
        expect(taptappResult).toBeDefined();
        expect(mindARResult).toBeDefined();
        expect(taptappPoints).toBeGreaterThan(0);
        expect(mindARPoints).toBeGreaterThan(0);

    }, 120000);
});
