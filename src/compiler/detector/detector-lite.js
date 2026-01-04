/**
 * Detector Lite - Pure JavaScript Feature Detector
 * 
 * Un detector de características simplificado que no depende de TensorFlow.
 * Optimizado para velocidad en compilación offline.
 * 
 * Implementa:
 * - Construcción de pirámide gaussiana (con aceleración GPU opcional)
 * - Diferencia de Gaussianas (DoG) para detección de extremos
 * - Descriptores FREAK simplificados
 */

import { FREAKPOINTS } from "./freak.js";
import { gpuCompute } from "../utils/gpu-compute.js";
import { binarizeFREAK32 } from "../utils/lsh-binarizer.js";

const PYRAMID_MIN_SIZE = 4; // Reducido de 8 a 4 para exprimir al máximo la resolución
// PYRAMID_MAX_OCTAVE ya no es necesario, el límite lo da PYRAMID_MIN_SIZE


const NUM_BUCKETS_PER_DIMENSION = 8;
const MAX_FEATURES_PER_BUCKET = 12; // Ajustado para un equilibrio óptimo entre densidad y estabilidad


const ORIENTATION_NUM_BINS = 36;
const FREAK_EXPANSION_FACTOR = 7.0;

// Global GPU mode flag
let globalUseGPU = true;

/**
 * Set global GPU mode for all DetectorLite instances
 * @param {boolean} enabled - Whether to use GPU acceleration
 */
export const setDetectorGPUMode = (enabled) => {
    globalUseGPU = enabled;
};

/**
 * Detector de características sin TensorFlow
 */
export class DetectorLite {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.useGPU = options.useGPU !== undefined ? options.useGPU : globalUseGPU;
        // Protocol V5: LSH is enabled by default
        this.useLSH = options.useLSH !== undefined ? options.useLSH : true;

        let numOctaves = 0;
        let w = width, h = height;
        while (w >= PYRAMID_MIN_SIZE && h >= PYRAMID_MIN_SIZE) {
            w = Math.floor(w / 2);
            h = Math.floor(h / 2);
            numOctaves++;
            // Límite de seguridad razonable para evitar bucles infinitos en imágenes gigantes
            if (numOctaves === 10) break;
        }

        this.numOctaves = numOctaves;
    }

    /**
     * Detecta características en una imagen en escala de grises
     * @param {Float32Array|Uint8Array} imageData - Datos de imagen (width * height)
     * @returns {{featurePoints: Array}} Puntos de características detectados
     */
    detect(imageData) {
        // Normalizar a Float32Array si es necesario
        let data;
        if (imageData instanceof Float32Array) {
            data = imageData;
        } else {
            data = new Float32Array(imageData.length);
            for (let i = 0; i < imageData.length; i++) {
                data[i] = imageData[i];
            }
        }

        // 1. Construir pirámide gaussiana
        const pyramidImages = this._buildGaussianPyramid(data, this.width, this.height);

        // 2. Construir pirámide DoG (Difference of Gaussians)
        const dogPyramid = this._buildDogPyramid(pyramidImages);

        // 3. Encontrar extremos locales
        const extremas = this._findExtremas(dogPyramid, pyramidImages);

        // 4. Aplicar pruning por buckets
        const prunedExtremas = this._applyPrune(extremas);

        // 5. Calcular orientaciones
        this._computeOrientations(prunedExtremas, pyramidImages);

        // 6. Calcular descriptores FREAK
        this._computeFreakDescriptors(prunedExtremas, pyramidImages);

        // Convertir a formato de salida
        const featurePoints = prunedExtremas.map(ext => ({
            maxima: ext.score > 0,
            x: ext.x * Math.pow(2, ext.octave) + Math.pow(2, ext.octave - 1) - 0.5,
            y: ext.y * Math.pow(2, ext.octave) + Math.pow(2, ext.octave - 1) - 0.5,
            scale: Math.pow(2, ext.octave),
            angle: ext.angle || 0,
            descriptors: (this.useLSH && ext.lsh) ? ext.lsh : (ext.descriptors || [])
        }));

        return { featurePoints };
    }

    /**
     * Construye una pirámide gaussiana
     */
    _buildGaussianPyramid(data, width, height) {
        // Use GPU-accelerated pyramid if available
        if (this.useGPU) {
            try {
                const gpuPyramid = gpuCompute.buildPyramid(data, width, height, this.numOctaves);

                // Convert GPU pyramid format to expected format
                const pyramid = [];
                for (let i = 0; i < gpuPyramid.length && i < this.numOctaves; i++) {
                    const level = gpuPyramid[i];
                    // Apply second blur for DoG computation
                    const img2 = this._applyGaussianFilter(level.data, level.width, level.height);
                    pyramid.push([
                        { data: level.data, width: level.width, height: level.height },
                        { data: img2.data, width: level.width, height: level.height }
                    ]);
                }
                return pyramid;
            } catch (e) {
                // Fall back to CPU if GPU fails
                console.warn("GPU pyramid failed, falling back to CPU:", e.message);
            }
        }

        // Original CPU implementation
        const pyramid = [];
        let currentData = data;
        let currentWidth = width;
        let currentHeight = height;

        for (let i = 0; i < this.numOctaves; i++) {
            const img1 = this._applyGaussianFilter(currentData, currentWidth, currentHeight);
            const img2 = this._applyGaussianFilter(img1.data, currentWidth, currentHeight);

            pyramid.push([
                { data: img1.data, width: currentWidth, height: currentHeight },
                { data: img2.data, width: currentWidth, height: currentHeight }
            ]);

            // Downsample para siguiente octava
            if (i < this.numOctaves - 1) {
                const downsampled = this._downsample(img2.data, currentWidth, currentHeight);
                currentData = downsampled.data;
                currentWidth = downsampled.width;
                currentHeight = downsampled.height;
            }
        }

        return pyramid;
    }

    /**
     * Aplica un filtro gaussiano binomial [1,4,6,4,1] - Optimizado
     */
    _applyGaussianFilter(data, width, height) {
        const output = new Float32Array(width * height);
        const temp = new Float32Array(width * height);
        const k0 = 1 / 16, k1 = 4 / 16, k2 = 6 / 16;
        const w1 = width - 1;
        const h1 = height - 1;

        // Horizontal pass - unrolled kernel
        for (let y = 0; y < height; y++) {
            const rowOffset = y * width;
            for (let x = 0; x < width; x++) {
                const x0 = x < 2 ? 0 : x - 2;
                const x1 = x < 1 ? 0 : x - 1;
                const x3 = x > w1 - 1 ? w1 : x + 1;
                const x4 = x > w1 - 2 ? w1 : x + 2;

                temp[rowOffset + x] =
                    data[rowOffset + x0] * k0 +
                    data[rowOffset + x1] * k1 +
                    data[rowOffset + x] * k2 +
                    data[rowOffset + x3] * k1 +
                    data[rowOffset + x4] * k0;
            }
        }

        // Vertical pass - unrolled kernel
        for (let y = 0; y < height; y++) {
            const y0 = (y < 2 ? 0 : y - 2) * width;
            const y1 = (y < 1 ? 0 : y - 1) * width;
            const y2 = y * width;
            const y3 = (y > h1 - 1 ? h1 : y + 1) * width;
            const y4 = (y > h1 - 2 ? h1 : y + 2) * width;

            for (let x = 0; x < width; x++) {
                output[y2 + x] =
                    temp[y0 + x] * k0 +
                    temp[y1 + x] * k1 +
                    temp[y2 + x] * k2 +
                    temp[y3 + x] * k1 +
                    temp[y4 + x] * k0;
            }
        }

        return { data: output, width, height };
    }

    /**
     * Downsample imagen por factor de 2
     */
    _downsample(data, width, height) {
        const newWidth = Math.floor(width / 2);
        const newHeight = Math.floor(height / 2);
        const output = new Float32Array(newWidth * newHeight);

        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                // Interpolación bilinear
                const srcX = x * 2 + 0.5;
                const srcY = y * 2 + 0.5;
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = Math.min(x0 + 1, width - 1);
                const y1 = Math.min(y0 + 1, height - 1);

                const fx = srcX - x0;
                const fy = srcY - y0;

                const v00 = data[y0 * width + x0];
                const v10 = data[y0 * width + x1];
                const v01 = data[y1 * width + x0];
                const v11 = data[y1 * width + x1];

                output[y * newWidth + x] =
                    v00 * (1 - fx) * (1 - fy) +
                    v10 * fx * (1 - fy) +
                    v01 * (1 - fx) * fy +
                    v11 * fx * fy;
            }
        }

        return { data: output, width: newWidth, height: newHeight };
    }

    /**
     * Construye pirámide de diferencia de gaussianas
     */
    _buildDogPyramid(pyramidImages) {
        const dogPyramid = [];

        for (let i = 0; i < pyramidImages.length; i++) {
            const img1 = pyramidImages[i][0];
            const img2 = pyramidImages[i][1];
            const width = img1.width;
            const height = img1.height;
            const dog = new Float32Array(width * height);

            for (let j = 0; j < dog.length; j++) {
                dog[j] = img2.data[j] - img1.data[j];
            }

            dogPyramid.push({ data: dog, width, height });
        }

        return dogPyramid;
    }

    /**
     * Encuentra extremos locales en la pirámide DoG
     */
    _findExtremas(dogPyramid, pyramidImages) {
        const extremas = [];

        for (let octave = 1; octave < dogPyramid.length - 1; octave++) {
            const curr = dogPyramid[octave];
            const prev = dogPyramid[octave - 1];
            const next = dogPyramid[octave + 1];

            const width = curr.width;
            const height = curr.height;
            const prevWidth = prev.width;
            const nextWidth = next.width;

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const val = curr.data[y * width + x];

                    if (Math.abs(val) < 0.01) continue; // Threshold reducido de 0.015 a 0.01 para mayor sensibilidad

                    let isMaxima = true;
                    let isMinima = true;

                    // Check 3x3 neighborhood in current scale
                    for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
                        for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const neighbor = curr.data[(y + dy) * width + (x + dx)];
                            if (neighbor >= val) isMaxima = false;
                            if (neighbor <= val) isMinima = false;
                        }
                    }

                    // Check previous scale (scaled coordinates)
                    if (isMaxima || isMinima) {
                        const px = Math.floor(x * 2);
                        const py = Math.floor(y * 2);
                        for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
                            for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                                const xx = Math.max(0, Math.min(prevWidth - 1, px + dx));
                                const yy = Math.max(0, Math.min(prev.height - 1, py + dy));
                                const neighbor = prev.data[yy * prevWidth + xx];
                                if (neighbor >= val) isMaxima = false;
                                if (neighbor <= val) isMinima = false;
                            }
                        }
                    }

                    // Check next scale (scaled coordinates)
                    if (isMaxima || isMinima) {
                        const nx = Math.floor(x / 2);
                        const ny = Math.floor(y / 2);
                        for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
                            for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                                const xx = Math.max(0, Math.min(nextWidth - 1, nx + dx));
                                const yy = Math.max(0, Math.min(next.height - 1, ny + dy));
                                const neighbor = next.data[yy * nextWidth + xx];
                                if (neighbor >= val) isMaxima = false;
                                if (neighbor <= val) isMinima = false;
                            }
                        }
                    }

                    if (isMaxima || isMinima) {
                        extremas.push({
                            score: isMaxima ? Math.abs(val) : -Math.abs(val),
                            octave,
                            x,
                            y,
                            absScore: Math.abs(val)
                        });
                    }
                }
            }
        }

        return extremas;
    }

    /**
     * Aplica pruning para mantener solo los mejores features por bucket
     */
    _applyPrune(extremas) {
        const nBuckets = NUM_BUCKETS_PER_DIMENSION;
        const nFeatures = MAX_FEATURES_PER_BUCKET;

        // Agrupar por buckets
        const buckets = [];
        for (let i = 0; i < nBuckets * nBuckets; i++) {
            buckets.push([]);
        }

        for (const ext of extremas) {
            const bucketX = Math.min(nBuckets - 1, Math.floor(ext.x / (this.width / Math.pow(2, ext.octave)) * nBuckets));
            const bucketY = Math.min(nBuckets - 1, Math.floor(ext.y / (this.height / Math.pow(2, ext.octave)) * nBuckets));
            const bucketIdx = bucketY * nBuckets + bucketX;
            if (bucketIdx >= 0 && bucketIdx < buckets.length) {
                buckets[bucketIdx].push(ext);
            }
        }

        // Seleccionar top features por bucket
        const result = [];
        for (const bucket of buckets) {
            bucket.sort((a, b) => b.absScore - a.absScore);
            for (let i = 0; i < Math.min(nFeatures, bucket.length); i++) {
                result.push(bucket[i]);
            }
        }

        return result;
    }

    /**
     * Calcula la orientación de cada feature
     */
    _computeOrientations(extremas, pyramidImages) {
        for (const ext of extremas) {
            if (ext.octave < 1 || ext.octave >= pyramidImages.length) {
                ext.angle = 0;
                continue;
            }

            const img = pyramidImages[ext.octave][1];
            const width = img.width;
            const height = img.height;
            const data = img.data;

            const x = Math.floor(ext.x);
            const y = Math.floor(ext.y);

            // Compute gradient histogram
            const histogram = new Float32Array(ORIENTATION_NUM_BINS);
            const radius = 4;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const yy = y + dy;
                    const xx = x + dx;

                    if (yy <= 0 || yy >= height - 1 || xx <= 0 || xx >= width - 1) continue;

                    const gradY = data[(yy + 1) * width + xx] - data[(yy - 1) * width + xx];
                    const gradX = data[yy * width + xx + 1] - data[yy * width + xx - 1];

                    const mag = Math.sqrt(gradX * gradX + gradY * gradY);
                    const angle = Math.atan2(gradY, gradX) + Math.PI; // 0 to 2*PI

                    const bin = Math.floor(angle / (2 * Math.PI) * ORIENTATION_NUM_BINS) % ORIENTATION_NUM_BINS;
                    const weight = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
                    histogram[bin] += mag * weight;
                }
            }

            // Find peak
            let maxBin = 0;
            for (let i = 1; i < ORIENTATION_NUM_BINS; i++) {
                if (histogram[i] > histogram[maxBin]) {
                    maxBin = i;
                }
            }

            ext.angle = (maxBin + 0.5) * 2 * Math.PI / ORIENTATION_NUM_BINS - Math.PI;
        }
    }

    /**
     * Calcula descriptores FREAK
     */
    _computeFreakDescriptors(extremas, pyramidImages) {
        for (const ext of extremas) {
            if (ext.octave < 1 || ext.octave >= pyramidImages.length) {
                ext.descriptors = [];
                continue;
            }

            const img = pyramidImages[ext.octave][1];
            const width = img.width;
            const height = img.height;
            const data = img.data;

            const cos = Math.cos(ext.angle || 0) * FREAK_EXPANSION_FACTOR;
            const sin = Math.sin(ext.angle || 0) * FREAK_EXPANSION_FACTOR;

            // Sample FREAK points
            const samples = new Float32Array(FREAKPOINTS.length);
            for (let i = 0; i < FREAKPOINTS.length; i++) {
                const [, fx, fy] = FREAKPOINTS[i];
                const xp = ext.x + fx * cos - fy * sin;
                const yp = ext.y + fx * sin + fy * cos;

                const x0 = Math.max(0, Math.min(width - 2, Math.floor(xp)));
                const y0 = Math.max(0, Math.min(height - 2, Math.floor(yp)));
                const x1 = x0 + 1;
                const y1 = y0 + 1;

                const fracX = xp - x0;
                const fracY = yp - y0;

                samples[i] =
                    data[y0 * width + x0] * (1 - fracX) * (1 - fracY) +
                    data[y0 * width + x1] * fracX * (1 - fracY) +
                    data[y1 * width + x0] * (1 - fracX) * fracY +
                    data[y1 * width + x1] * fracX * fracY;
            }

            // Pack pairs into Uint8Array (84 bytes per descriptor)
            const descriptor = new Uint8Array(84);
            let bitCount = 0;
            let byteIdx = 0;

            for (let i = 0; i < FREAKPOINTS.length; i++) {
                for (let j = i + 1; j < FREAKPOINTS.length; j++) {
                    if (samples[i] < samples[j]) {
                        descriptor[byteIdx] |= (1 << (7 - bitCount));
                    }
                    bitCount++;

                    if (bitCount === 8) {
                        byteIdx++;
                        bitCount = 0;
                    }
                }
            }
            if (this.useLSH) {
                ext.lsh = binarizeFREAK32(descriptor);
            }
            ext.descriptors = descriptor;
        }
    }
}
