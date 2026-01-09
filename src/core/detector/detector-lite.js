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
import { computeLSH64, computeFullFREAK, packLSHIntoDescriptor } from "../utils/lsh-direct.js";
import { HDC_SEED } from "../protocol.js";

const PYRAMID_MIN_SIZE = 4; // Restored to 4 for better small-scale detection
// PYRAMID_MAX_OCTAVE ya no es necesario, el límite lo da PYRAMID_MIN_SIZE


const NUM_BUCKETS_PER_DIMENSION = 15; // Increased from 10 to 15 for better local detail
const DEFAULT_MAX_FEATURES_PER_BUCKET = 12; // Increased from 8 to 12


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
        // Protocol V6 (Moonshot): 64-bit LSH is the standard descriptor format
        this.useLSH = options.useLSH !== undefined ? options.useLSH : true;
        this.useHDC = options.useHDC !== undefined ? options.useHDC : true; // Enabled by default for Moonshot
        this.maxFeaturesPerBucket = options.maxFeaturesPerBucket !== undefined ? options.maxFeaturesPerBucket : DEFAULT_MAX_FEATURES_PER_BUCKET;

        let numOctaves = 0;
        let w = width, h = height;
        while (w >= PYRAMID_MIN_SIZE && h >= PYRAMID_MIN_SIZE) {
            w = Math.floor(w / 2);
            h = Math.floor(h / 2);
            numOctaves++;
            // Límite de seguridad razonable para evitar bucles infinitos en imágenes gigantes
            if (numOctaves === 10) break;
        }

        this.numOctaves = options.maxOctaves !== undefined ? Math.min(numOctaves, options.maxOctaves) : numOctaves;
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
        const featurePoints = prunedExtremas.map(ext => {
            const scale = Math.pow(2, ext.octave);
            return {
                maxima: ext.score > 0,
                x: ext.x * scale + scale * 0.5 - 0.5,
                y: ext.y * scale + scale * 0.5 - 0.5,
                scale: scale,
                angle: ext.angle || 0,
                score: ext.absScore, // Pass through score for sorting in Matcher
                descriptors: (this.useLSH && ext.lsh) ? ext.lsh : (ext.descriptors || []),
                imageData: data // Pass source image for refinement
            };
        });

        return { featurePoints, pyramid: pyramidImages };
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

        // Buffer management: Reuse arrays if dimensions match to reduce GC
        if (!this._pyramidBuffers || this._pyramidBuffers.width !== width || this._pyramidBuffers.height !== height) {
            this._pyramidBuffers = { width, height, temp: new Float32Array(width * height) };
        }

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
        const temp = this._pyramidBuffers?.temp || new Float32Array(width * height);
        const k0 = 0.0625, k1 = 0.25, k2 = 0.375; // 1/16, 4/16, 6/16
        const w1 = width - 1;

        // Horizontal pass - Speed optimized with manual border handling
        for (let y = 0; y < height; y++) {
            const rowOffset = y * width;

            // Left border (Normalized)
            const sumL0 = k0 + k1 + k2 + k1 + k0; // Ideal sum
            temp[rowOffset] = (data[rowOffset] * (k0 + k1 + k2) + data[rowOffset + 1] * k1 + data[rowOffset + 2] * k0) * (1.0 / (k0 + k1 + k2));
            temp[rowOffset + 1] = (data[rowOffset] * k1 + data[rowOffset + 1] * k2 + data[rowOffset + 2] * k1 + data[rowOffset + 3] * k0) * (1.0 / (k1 + k2 + k1 + k0));

            // Main loop - NO boundary checks
            for (let x = 2; x < width - 2; x++) {
                const pos = rowOffset + x;
                temp[pos] = data[pos - 2] * k0 + data[pos - 1] * k1 + data[pos] * k2 + data[pos + 1] * k1 + data[pos + 2] * k0;
            }

            // Right border (Normalized)
            const r2 = rowOffset + width - 2;
            const r1 = rowOffset + width - 1;
            temp[r2] = (data[r2 - 2] * k0 + data[r2 - 1] * k1 + data[r2] * k2 + data[r1] * k1) * (1.0 / (k0 + k1 + k2 + k1));
            temp[r1] = (data[r1 - 2] * k0 + data[r1 - 1] * k1 + data[r1] * (k2 + k1 + k0)) * (1.0 / (k0 + k1 + k2));
        }

        // Vertical pass - Speed optimized
        for (let x = 0; x < width; x++) {
            // Top border (Normalized)
            output[x] = (temp[x] * (k0 + k1 + k2) + temp[x + width] * k1 + temp[x + width * 2] * k0) * (1.0 / (k0 + k1 + k2));
            output[x + width] = (temp[x] * k1 + temp[x + width] * k2 + temp[x + width * 2] * k1 + temp[x + width * 3] * k0) * (1.0 / (k1 + k2 + k1 + k0));

            // Main loop - NO boundary checks
            for (let y = 2; y < height - 2; y++) {
                const p = y * width + x;
                output[p] = temp[p - width * 2] * k0 + temp[p - width] * k1 + temp[p] * k2 + temp[p + width] * k1 + temp[p + width * 2] * k0;
            }

            // Bottom border (Normalized)
            const b2 = (height - 2) * width + x;
            const b1 = (height - 1) * width + x;
            output[b2] = (temp[b2 - width * 2] * k0 + temp[b2 - width] * k1 + temp[b2] * k2 + temp[b1] * k1) * (1.0 / (k0 + k1 + k2 + k1));
            output[b1] = (temp[b1 - width * 2] * k0 + temp[b1 - width] * k1 + temp[b1] * (k2 + k1 + k0)) * (1.0 / (k0 + k1 + k2));
        }

        return { data: output, width, height };
    }

    /**
     * Downsample imagen por factor de 2
     */
    _downsample(data, width, height) {
        const newWidth = width >> 1;
        const newHeight = height >> 1;
        const output = new Float32Array(newWidth * newHeight);

        for (let y = 0; y < newHeight; y++) {
            const r0 = (y * 2) * width;
            const r1 = r0 + width;
            const dr = y * newWidth;
            for (let x = 0; x < newWidth; x++) {
                const i2 = x * 2;
                output[dr + x] = (data[r0 + i2] + data[r0 + i2 + 1] + data[r1 + i2] + data[r1 + i2 + 1]) * 0.25;
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

        for (let octave = 0; octave < dogPyramid.length; octave++) {
            const curr = dogPyramid[octave];
            const prev = octave > 0 ? dogPyramid[octave - 1] : null;
            const next = octave < dogPyramid.length - 1 ? dogPyramid[octave + 1] : null;

            const width = curr.width;
            const height = curr.height;

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const val = curr.data[y * width + x];

                    if (Math.abs(val) < 0.003) continue; // Aggressively lowered threshold to 0.003 for max sensitivity

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

                    // Check previous scale (scaled coordinates) - skip if no prev layer
                    if ((isMaxima || isMinima) && prev) {
                        const px = x << 1;
                        const py = y << 1;
                        const prevWidth = prev.width;
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

                    // Check next scale (scaled coordinates) - skip if no next layer
                    if ((isMaxima || isMinima) && next) {
                        const nx = x >> 1;
                        const ny = y >> 1;
                        const nextWidth = next.width;
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
        const nFeatures = this.maxFeaturesPerBucket;

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
            if (ext.octave < 0 || ext.octave >= pyramidImages.length) {
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
            if (ext.octave < 0 || ext.octave >= pyramidImages.length) {
                ext.descriptors = new Uint8Array(8);
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

            // 🚀 MOONSHOT: Direct LSH computation
            // Avoids computing 672 bits of FREAK just to sample 64.
            if (this.useLSH) {
                ext.lsh = computeLSH64(samples);
                // Pack LSH into 8-byte descriptors for compatibility
                ext.descriptors = packLSHIntoDescriptor(ext.lsh);
            } else {
                ext.descriptors = computeFullFREAK(samples);
            }
        }
    }
}
