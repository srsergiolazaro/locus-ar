import { describe, it, expect, beforeAll } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';

import {
    ImageEmbedder,
    ImageEmbedding,
    embedImage,
    isDuplicate,
    EMBEDDING_CONFIGS
} from '../../src/core/embeddings/image-embedding.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Carga una imagen real usando Jimp y la convierte a grayscale Float32Array
 */
async function loadRealImage(filename) {
    const imagePath = join(__dirname, '../assets', filename);
    const image = await Jimp.read(imagePath);

    // Resize to 512x512 to keep tests fast
    image.resize({ w: 512, h: 512 });

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const grayscale = new Float32Array(width * height);

    // Convertir a escala de grises manualmente para tener control total
    // Jimp almacena los datos en RGBA
    const buffer = image.bitmap.data;
    for (let i = 0; i < width * height; i++) {
        const r = buffer[i * 4];
        const g = buffer[i * 4 + 1];
        const b = buffer[i * 4 + 2];
        // Conversión estándar ITUR BT.601
        grayscale[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    return { data: grayscale, width, height };
}

/**
 * Aplica una perturbación a la imagen (simular variaciones)
 */
function perturbImage(data, width, height, noiseLevel = 0.05) {
    const perturbed = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
        const noise = (Math.random() - 0.5) * 2 * noiseLevel;
        perturbed[i] = Math.max(0, Math.min(1, data[i] + noise));
    }
    return perturbed;
}

/**
 * Escala una imagen (resize simple)
 */
function scaleImage(data, width, height, scale) {
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);
    const scaled = new Float32Array(newWidth * newHeight);

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const srcX = Math.floor(x / scale);
            const srcY = Math.floor(y / scale);
            scaled[y * newWidth + x] = data[srcY * width + srcX];
        }
    }

    return { data: scaled, width: newWidth, height: newHeight };
}

/**
 * Genera imagen aleatoria (completamente diferente)
 */
function generateRandomImage(width, height) {
    const data = new Float32Array(width * height);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random();
    }
    return { data, width, height };
}

describe('Image Embeddings', () => {
    let testImage;

    beforeAll(async () => {
        try {
            testImage = await loadRealImage('test-image.png');
            console.log(`✓ Real test image loaded: ${testImage.width}x${testImage.height}`);
        } catch (e) {
            console.error('Failed to load real image:', e.message || e);
            throw e;
        }
    });

    describe('Basic Functionality', () => {
        it('should create an embedding from real image', () => {
            const embedder = new ImageEmbedder('standard');
            const embedding = embedder.embed(testImage.data, testImage.width, testImage.height);

            expect(embedding).toBeDefined();
            expect(embedding.vector).toBeInstanceOf(Uint32Array);
            expect(embedding.bits).toBe(256);
            expect(embedding.bytes).toBe(32);
            expect(embedding.metadata.featureCount).toBeGreaterThan(0);

            console.log(`✓ Embedding generated: ${embedding.bits} bits, ${embedding.metadata.featureCount} features, ${embedding.metadata.timeMs.toFixed(2)}ms`);
        });

        it('should support all embedding modes', () => {
            const modes = ['micro', 'compact', 'standard', 'full'];
            const expectedBits = { micro: 32, compact: 128, standard: 256, full: 1024 };

            for (const mode of modes) {
                const embedder = new ImageEmbedder(mode);
                const embedding = embedder.embed(testImage.data, testImage.width, testImage.height);

                expect(embedding.bits).toBe(expectedBits[mode]);
                console.log(`✓ Mode '${mode}': ${embedding.bits} bits, ${embedding.bytes} bytes`);
            }
        });

        it('should generate deterministic embeddings', () => {
            const embedder = new ImageEmbedder('standard');

            const emb1 = embedder.embed(testImage.data, testImage.width, testImage.height);
            const emb2 = embedder.embed(testImage.data, testImage.width, testImage.height);

            expect(emb1.vector).toEqual(emb2.vector);
            expect(emb1.toHex()).toBe(emb2.toHex());

            console.log(`✓ Deterministic: ${emb1.toHex().substring(0, 32)}...`);
        });
    });

    describe('Serialization', () => {
        it('should serialize to bytes and back', () => {
            const embedder = new ImageEmbedder('standard');
            const original = embedder.embed(testImage.data, testImage.width, testImage.height);

            const bytes = original.toBytes();
            expect(bytes).toBeInstanceOf(Uint8Array);
            expect(bytes.length).toBe(32);

            const restored = ImageEmbedding.fromBytes(bytes);
            expect(restored.vector).toEqual(original.vector);

            console.log(`✓ Bytes serialization: ${bytes.length} bytes`);
        });

        it('should serialize to Base64 and back', () => {
            const embedder = new ImageEmbedder('compact');
            const original = embedder.embed(testImage.data, testImage.width, testImage.height);

            const b64 = original.toBase64();
            expect(typeof b64).toBe('string');

            const restored = ImageEmbedding.fromBase64(b64);
            expect(restored.vector).toEqual(original.vector);

            console.log(`✓ Base64: "${b64.substring(0, 20)}..." (${b64.length} chars)`);
        });

        it('should serialize to hex', () => {
            const embedder = new ImageEmbedder('micro');
            const embedding = embedder.embed(testImage.data, testImage.width, testImage.height);

            const hex = embedding.toHex();
            expect(hex.length).toBe(8);
            expect(/^[0-9a-f]+$/.test(hex)).toBe(true);

            console.log(`✓ Hex: "${hex}"`);
        });
    });

    describe('Similarity Comparison', () => {
        it('should return similarity of 1.0 for identical images', () => {
            const embedder = new ImageEmbedder('standard');
            const emb = embedder.embed(testImage.data, testImage.width, testImage.height);

            const similarity = embedder.compare(emb, emb);
            expect(similarity).toBe(1.0);

            console.log(`✓ Self-similarity: ${similarity}`);
        });

        it('should return high similarity for slightly perturbed images', () => {
            const embedder = new ImageEmbedder('standard');

            const original = embedder.embed(testImage.data, testImage.width, testImage.height);

            const perturbedData = perturbImage(testImage.data, testImage.width, testImage.height, 0.03);
            const perturbed = embedder.embed(perturbedData, testImage.width, testImage.height);

            const similarity = embedder.compare(original, perturbed);
            // Real images are usually more robust than synthetic ones
            expect(similarity).toBeGreaterThan(0.6);

            console.log(`✓ Perturbed similarity (3% noise): ${(similarity * 100).toFixed(1)}%`);
        });

        it('should return medium-high similarity for scaled images', () => {
            const embedder = new ImageEmbedder('standard');

            const original = embedder.embed(testImage.data, testImage.width, testImage.height);

            const scaled = scaleImage(testImage.data, testImage.width, testImage.height, 0.7);
            const scaledEmb = embedder.embed(scaled.data, scaled.width, scaled.height);

            const similarity = embedder.compare(original, scaledEmb);
            expect(similarity).toBeGreaterThan(0.3); // Grid encoding es sensible a escala

            console.log(`✓ Scaled similarity (70%): ${(similarity * 100).toFixed(1)}%`);
        });

        it('should return low similarity for completely different images', () => {
            const embedder = new ImageEmbedder('standard');

            const original = embedder.embed(testImage.data, testImage.width, testImage.height);

            const random = generateRandomImage(testImage.width, testImage.height);
            const randomEmb = embedder.embed(random.data, random.width, random.height);

            const similarity = embedder.compare(original, randomEmb);
            expect(similarity).toBeLessThan(0.20); // Con nueva métrica, random está cerca de 0-20%

            console.log(`✓ Random image similarity: ${(similarity * 100).toFixed(1)}%`);
        });
    });

    describe('Search Functionality', () => {
        it('should find the most similar image in a database', () => {
            const embedder = new ImageEmbedder('compact');
            const database = [];

            const original = embedder.embed(testImage.data, testImage.width, testImage.height);
            database.push(original);

            for (let i = 0; i < 10; i++) {
                const random = generateRandomImage(testImage.width, testImage.height);
                database.push(embedder.embed(random.data, random.width, random.height));
            }

            const perturbedData = perturbImage(testImage.data, testImage.width, testImage.height, 0.05);
            const query = embedder.embed(perturbedData, testImage.width, testImage.height);

            const results = embedder.search(query, database, 3);

            expect(results[0].index).toBe(0);
            expect(results[0].similarity).toBeGreaterThan(0.25);

            console.log(`✓ Search found original at index ${results[0].index} with ${(results[0].similarity * 100).toFixed(1)}% similarity`);
        });
    });

    describe('Clustering', () => {
        it('should cluster similar images together', () => {
            const embedder = new ImageEmbedder('standard');
            const embeddings = [];

            for (let i = 0; i < 3; i++) {
                const perturbed = perturbImage(testImage.data, testImage.width, testImage.height, 0.01);
                embeddings.push(embedder.embed(perturbed, testImage.width, testImage.height));
            }

            for (let i = 0; i < 3; i++) {
                const random = generateRandomImage(200, 200);
                embeddings.push(embedder.embed(random.data, random.width, random.height));
            }

            const clusterIds = embedder.cluster(embeddings, 0.7);

            const cluster0 = clusterIds[0];
            const sim03 = embedder.compare(embeddings[0], embeddings[3]);
            console.log(`✓ Clustering result: [${clusterIds.join(', ')}]`);
            console.log(`  Similarity test-vs-random: ${(sim03 * 100).toFixed(1)}%`);

            expect(clusterIds[1]).toBe(cluster0);
            expect(clusterIds[2]).toBe(cluster0);
            expect(clusterIds[3]).not.toBe(cluster0);
        });
    });

    describe('Convenience Functions', () => {
        it('embedImage should work as standalone function', () => {
            const embedding = embedImage(testImage.data, testImage.width, testImage.height, 'compact');
            expect(embedding.bits).toBe(128);
            console.log(`✓ embedImage(): ${embedding.bits} bits`);
        });

        it('isDuplicate should detect similar images', () => {
            const emb1 = embedImage(testImage.data, testImage.width, testImage.height);
            const perturbed = perturbImage(testImage.data, testImage.width, testImage.height, 0.02);
            const emb2 = embedImage(perturbed, testImage.width, testImage.height);
            const random = generateRandomImage(testImage.width, testImage.height);
            const emb3 = embedImage(random.data, random.width, random.height);

            expect(isDuplicate(emb1, emb2, 0.55)).toBe(true);
            expect(isDuplicate(emb1, emb3, 0.15)).toBe(false); // Random cerca de 0%

            console.log(`✓ isDuplicate(): perturbed=true, random=false`);
        });
    });

    describe('Performance', () => {
        it('should generate embeddings quickly', () => {
            const embedder = new ImageEmbedder('standard');
            const iterations = 5;
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                embedder.embed(testImage.data, testImage.width, testImage.height);
            }
            const avgMs = (performance.now() - start) / iterations;
            console.log(`✓ Performance: ${avgMs.toFixed(2)}ms per embedding`);
            expect(avgMs).toBeLessThan(1000);
        });
    });
});
