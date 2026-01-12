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
 * Convierte un objeto Jimp a grayscale Float32Array
 */
function jimpToGrayscale(image) {
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

/**
 * Carga una imagen real usando Jimp
 */
async function loadJimpImage(filename) {
    const imagePath = join(__dirname, '../assets', filename);
    const image = await Jimp.read(imagePath);
    image.resize({ w: 512, h: 512 });
    return image;
}

describe('Image Embeddings - Variaciones Reales', () => {
    let baseJimp;
    let baseEmb;
    let embedder;

    beforeAll(async () => {
        baseJimp = await loadJimpImage('test-image.png');
        embedder = new ImageEmbedder('standard');
        const baseData = jimpToGrayscale(baseJimp);
        baseEmb = embedder.embed(baseData.data, baseData.width, baseData.height);
        console.log(`✓ Base image loaded and indexed`);
    });

    it('Variación: Rotación (90°)', async () => {
        const rotated = baseJimp.clone().rotate(90);
        const data = jimpToGrayscale(rotated);
        const emb = embedder.embed(data.data, data.width, data.height);

        const similarity = embedder.compare(baseEmb, emb);
        console.log(`[Rotación 90°] Similitud: ${(similarity * 100).toFixed(1)}%`);

        // El detector es parcialmente invariante a rotación (orientaciones FREAK)
        // pero la organización global de bits en el embedding puede cambiar.
        // Grid Encoding hace el embedding sensible a rotación. 
        // Esto es esperado: un coche volcado no es igual a un coche normal.
        expect(similarity).toBeGreaterThan(0.2);
    });

    it('Variación: Brillo (+50%)', async () => {
        const bright = baseJimp.clone().brightness(0.5);
        const data = jimpToGrayscale(bright);
        const emb = embedder.embed(data.data, data.width, data.height);

        const similarity = embedder.compare(baseEmb, emb);
        console.log(`[Brillo +50%] Similitud: ${(similarity * 100).toFixed(1)}%`);

        // DoG detector es robusto a cambios de iluminación
        expect(similarity).toBeGreaterThan(0.7);
    });

    it('Variación: Contraste (+50%)', async () => {
        const contrast = baseJimp.clone().contrast(0.5);
        const data = jimpToGrayscale(contrast);
        const emb = embedder.embed(data.data, data.width, data.height);

        const similarity = embedder.compare(baseEmb, emb);
        console.log(`[Contraste +50%] Similitud: ${(similarity * 100).toFixed(1)}%`);

        expect(similarity).toBeGreaterThan(0.5);
    });

    it('Variación: Blur (Desenfoque leve)', async () => {
        const blurred = baseJimp.clone().blur(1); // Blur suave
        const data = jimpToGrayscale(blurred);
        const emb = embedder.embed(data.data, data.width, data.height);

        const similarity = embedder.compare(baseEmb, emb);
        console.log(`[Blur leve] Similitud: ${(similarity * 100).toFixed(1)}%`);

        // Blur leve mantiene estructura pero puede afectar features de alta frecuencia
        expect(similarity).toBeGreaterThan(0.3);
    });

    it('Variación: Compresión JPEG (Calidad 10%)', async () => {
        const jpegBuffer = await baseJimp.getBuffer('image/jpeg', { quality: 10 });
        const compressed = await Jimp.read(jpegBuffer);
        const data = jimpToGrayscale(compressed);
        const emb = embedder.embed(data.data, data.width, data.height);

        const similarity = embedder.compare(baseEmb, emb);
        console.log(`[JPEG Calidad 10%] Similitud: ${(similarity * 100).toFixed(1)}%`);

        expect(similarity).toBeGreaterThan(0.5);
    });

    it('Variación: Corte (Crop central 50%)', async () => {
        const width = baseJimp.bitmap.width;
        const height = baseJimp.bitmap.height;
        const cropped = baseJimp.clone().crop({
            x: width / 4,
            y: height / 4,
            w: width / 2,
            h: height / 2
        });
        const data = jimpToGrayscale(cropped);
        const emb = embedder.embed(data.data, data.width, data.height);

        const similarity = embedder.compare(baseEmb, emb);
        console.log(`[Crop 50%] Similitud: ${(similarity * 100).toFixed(1)}%`);

        // HDC Embeddings son locales-agregados, por lo que retienen algo de información parcial
        // Grid Encoding es sensible al crop (cambia la posición relativa en la cuadrícula)
        expect(similarity).toBeGreaterThan(0.1);
    });

    it('Variación: Escala (Miniatura 128px)', async () => {
        const scaled = baseJimp.clone().resize({ w: 128, h: 128 });
        const data = jimpToGrayscale(scaled);
        const emb = embedder.embed(data.data, data.width, data.height);

        const similarity = embedder.compare(baseEmb, emb);
        console.log(`[Escala 128px] Similitud: ${(similarity * 100).toFixed(1)}%`);

        expect(similarity).toBeGreaterThan(0.3); // Miniatura tiene menos features
    });
});
