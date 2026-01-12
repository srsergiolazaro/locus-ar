import { describe, it, beforeAll, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';
import { ImageEmbedder } from '../../src/core/embeddings/image-embedding.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadAndProcessImage(filename, transformFn = null) {
    const imagePath = join(__dirname, '../assets', 'stock', filename);
    let image = await Jimp.read(imagePath);
    image.resize({ w: 512, h: 512 });

    if (transformFn) {
        image = transformFn(image);
    }

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const grayscale = new Float32Array(width * height);
    const buffer = image.bitmap.data;

    for (let i = 0; i < width * height; i++) {
        const r = buffer[i * 4];
        const g = buffer[i * 4 + 1];
        const b = buffer[i * 4 + 2];
        grayscale[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    return { data: grayscale, width, height, name: filename };
}

describe('All-vs-All Robustness Challenge', () => {
    let originals = [];
    let modifieds = [];
    let embedder;

    beforeAll(async () => {
        embedder = new ImageEmbedder('standard');
        console.log('--- Preparing 20 images (10 Originals + 10 Modified) ---');

        const transforms = [
            (img) => img.rotate(90),             // 1: Rotation
            (img) => img.brightness(0.5),        // 2: Brighter
            (img) => img.contrast(0.5),          // 3: More contrast
            (img) => img.blur(1),                // 4: Slight blur
            (img) => img.flip({ horizontal: true }),      // 5: Horizontal flip
            (img) => img.greyscale(),            // 6: Pure grayscale
            (img) => img.pixelate({ size: 4 }),          // 7: Pixelation
            (img) => img.opacity(0.8),           // 8: Transparency
            (img) => img.resize({ w: 256, h: 256 }).resize({ w: 512, h: 512 }), // 9: Rescale
            (img) => img.sepia()                 // 10: Color shift
        ];

        for (let i = 1; i <= 10; i++) {
            const filename = `stock-${i}.jpg`;
            const orig = await loadAndProcessImage(filename);
            const mod = await loadAndProcessImage(filename, transforms[i - 1]);

            originals.push({ ...orig, emb: embedder.embed(orig.data, orig.width, orig.height) });
            modifieds.push({ ...mod, emb: embedder.embed(mod.data, mod.width, mod.height) });

            console.log(`Prepared Pair ${i}: Original vs ${transforms[i - 1].toString().split('=>')[1].trim()}`);
        }
    });

    it('Matrix Challenge: Each original must match its modified version best', () => {
        console.log('\n--- Matrix Verification (Similarity Matrix) ---');
        const summary = [];
        let successCount = 0;

        for (let i = 0; i < 10; i++) {
            const queryEmb = originals[i].emb;
            let bestMatchIdx = -1;
            let maxSimilarity = -1;

            for (let j = 0; j < 10; j++) {
                const sim = embedder.compare(queryEmb, modifieds[j].emb);

                if (sim > maxSimilarity) {
                    maxSimilarity = sim;
                    bestMatchIdx = j;
                }
            }

            const isCorrect = bestMatchIdx === i;
            if (isCorrect) successCount++;

            summary.push({
                orig: i + 1,
                bestIdx: bestMatchIdx + 1,
                sim: maxSimilarity,
                correct: isCorrect
            });
        }

        console.table(summary.map(s => ({
            Original: s.orig,
            'Best Match': s.bestIdx,
            Similitud: (s.sim * 100).toFixed(1) + '%',
            Estado: s.correct ? '✅ OK' : '❌ FAIL'
        })));

        console.log(`\nRobustness Score: ${successCount}/10 Correct Identifications`);

        // Exigir al menos un 60% de aciertos para transformaciones drásticas
        expect(successCount).toBeGreaterThanOrEqual(6);
    });

    it('Cross-Category Distinción', () => {
        // Measure similarity between two different originals
        const sim12 = embedder.compare(originals[0].emb, originals[1].emb);
        const sim58 = embedder.compare(originals[4].emb, originals[7].emb);

        console.log(`\nCross-Sim (1 vs 2): ${(sim12 * 100).toFixed(2)}%`);
        console.log(`Cross-Sim (5 vs 8): ${(sim58 * 100).toFixed(2)}%`);

        expect(sim12).toBeLessThan(0.4);
        expect(sim58).toBeLessThan(0.4);
    });
});
