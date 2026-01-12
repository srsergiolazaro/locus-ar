import { describe, it } from 'vitest';
import { writeFileSync, readdirSync } from 'fs';
import { Jimp } from 'jimp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ImageEmbedder } from '../../src/core/embeddings/image-embedding.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputDir = join(__dirname, '../assets/stock-extra');
const outputPath = join(__dirname, 'visualization/similarity_data.json');

async function loadAndProcessImage(filePath) {
    let image = await Jimp.read(filePath);
    image.resize({ w: 512, h: 512 });

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

    return { data: grayscale, width, height };
}

describe('MEGA Data Generation', () => {
    it('generates the 100x100 similarity matrix', async () => {
        console.log('--- Generating MEGA Similarity Matrix (100x100) ---');
        const embedder = new ImageEmbedder('standard');

        const files = readdirSync(inputDir).filter(f => f.endsWith('.jpg')).sort();
        const embeddings = [];
        const labels = [];

        console.log(`Phase 1: Generating embeddings for ${files.length} images...`);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = join(inputDir, file);
            try {
                const img = await loadAndProcessImage(filePath);
                const emb = embedder.embed(img.data, img.width, img.height);
                embeddings.push(emb);
                labels.push(file);
                if ((i + 1) % 20 === 0) console.log(`[${i + 1}/100] Embeddings listos...`);
            } catch (err) {
                console.error(`Error en ${file}:`, err.message);
            }
        }

        console.log('Phase 2: Computing 10.000 comparisons...');
        const n = embeddings.length;
        const matrix = Array.from({ length: n }, () => new Array(n));
        let totalNoise = 0;
        let comparisons = 0;

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const sim = embedder.compare(embeddings[i], embeddings[j]);
                matrix[i][j] = sim;

                if (i !== j) {
                    totalNoise += sim;
                    comparisons++;
                }
            }
        }

        const avgNoise = (totalNoise / comparisons * 100).toFixed(2);
        console.log(`✓ Average Noise Floor: ${avgNoise}%`);

        const data = {
            mode: 'standard-mega (vitest)',
            bits: 256,
            labels,
            matrix,
            stats: {
                avgNoise,
                collisions: 0
            }
        };

        writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`✓ Data saved to ${outputPath}`);
    }, 60000); // 60s timeout for 100 images
});
