/**
 * 🧬 TaptappAR Image Embeddings
 * 
 * Genera embeddings (representaciones vectoriales) de imágenes usando
 * el algoritmo de detección de features existente + Hyperdimensional Computing.
 * 
 * CASOS DE USO:
 * - Visual Search: Buscar imágenes similares en una base de datos
 * - Deduplication: Encontrar imágenes duplicadas/casi-duplicadas
 * - Clustering: Agrupar imágenes por similitud visual
 * - Recommendation: Recomendar contenido visual similar
 * - Change Detection: Detectar si dos imágenes son "la misma" escena
 * 
 * VENTAJAS vs Deep Learning (CLIP, ResNet, etc.):
 * - 50KB de código vs 100MB+ de modelos
 * - Funciona 100% offline sin GPU
 * - Embeddings binarios = 128x más eficientes en storage
 * - Comparación por Hamming distance = 1000x más rápido que cosine similarity
 */

import { DetectorLite } from '../detector/detector-lite.js';
import { generateBasis, projectDescriptor, bundle, compressToSignature, HDC_DIMENSION, HDC_WORDS } from '../matching/hdc.js';
import { HDC_SEED } from '../protocol.js';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const EMBEDDING_CONFIGS = {
    // Embedding ultra-compacto: 32 bits = 4 bytes
    // Ideal para: Deduplication masiva, pre-filtering
    micro: {
        outputBits: 32,
        maxFeatures: 100,
        pyramidOctaves: 3
    },

    // Embedding compacto: 128 bits = 16 bytes
    // Ideal para: Visual search con millones de imágenes
    compact: {
        outputBits: 128,
        maxFeatures: 200,
        pyramidOctaves: 4
    },

    // Embedding estándar: 256 bits = 32 bytes
    // Ideal para: Balance entre precisión y eficiencia
    standard: {
        outputBits: 256,
        maxFeatures: 300,
        pyramidOctaves: 5
    },

    // Embedding de alta fidelidad: 1024 bits = 128 bytes
    // Ideal para: Máxima precisión, bases de datos pequeñas
    full: {
        outputBits: 1024,
        maxFeatures: 500,
        pyramidOctaves: 6
    }
};

// Pre-generar basis HDC (se hace una sola vez)
let cachedBasis = null;

function getBasis() {
    if (!cachedBasis) {
        cachedBasis = generateBasis(HDC_SEED, HDC_DIMENSION);
    }
    return cachedBasis;
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

/**
 * Generador de Image Embeddings
 * 
 * @example
 * const embedder = new ImageEmbedder('standard');
 * 
 * // Generar embedding de una imagen
 * const embedding = embedder.embed(imageData, width, height);
 * 
 * // Comparar dos imágenes
 * const similarity = embedder.compare(embedding1, embedding2);
 * 
 * // Buscar en base de datos
 * const results = embedder.search(queryEmbedding, database, topK=10);
 */
export class ImageEmbedder {
    constructor(mode = 'standard') {
        this.config = EMBEDDING_CONFIGS[mode] || EMBEDDING_CONFIGS.standard;
        this.basis = getBasis();
        this.mode = mode;
    }

    /**
     * Genera un embedding de una imagen en escala de grises
     * 
     * @param {Float32Array|Uint8Array} imageData - Datos de imagen (grayscale)
     * @param {number} width - Ancho de la imagen
     * @param {number} height - Alto de la imagen
     * @returns {ImageEmbedding} Objeto embedding
     */
    embed(imageData, width, height) {
        const startTime = performance.now();

        // 1. Detectar features
        const detector = new DetectorLite(width, height, {
            useGPU: true,
            useLSH: true,
            maxFeaturesPerBucket: Math.ceil(this.config.maxFeatures / 100),
            maxOctaves: this.config.pyramidOctaves
        });

        const { featurePoints } = detector.detect(imageData);

        // 2. Ordenar por score y tomar los mejores
        const sortedFeatures = featurePoints
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, this.config.maxFeatures);

        if (sortedFeatures.length === 0) {
            // Imagen sin features detectables (sólido, muy borrosa, etc.)
            return new ImageEmbedding(
                new Uint32Array(this.config.outputBits / 32),
                { featureCount: 0, mode: this.mode, timeMs: performance.now() - startTime }
            );
        }

        // 3. Proyectar cada descriptor al espacio HDC
        const hypervectors = [];

        for (const feature of sortedFeatures) {
            if (!feature.descriptors || feature.descriptors.length < 2) continue;

            // Convertir descriptors a Uint32Array si es necesario
            const desc = feature.descriptors instanceof Uint32Array
                ? feature.descriptors
                : new Uint32Array([
                    feature.descriptors[0] | (feature.descriptors[1] << 8) |
                    (feature.descriptors[2] << 16) | (feature.descriptors[3] << 24),
                    feature.descriptors[4] | (feature.descriptors[5] << 8) |
                    (feature.descriptors[6] << 16) | (feature.descriptors[7] << 24)
                ]);

            // Proyectar descriptor al espacio HDC
            const hv = projectDescriptor(desc, this.basis);

            // === GRID SPATIAL ENCODING (3x3) ===
            // Asignar feature a una celda de la cuadrícula
            const gridX = Math.floor((feature.x / width) * 3);
            const gridY = Math.floor((feature.y / height) * 3);
            const cellIndex = Math.min(8, Math.max(0, gridY * 3 + gridX));

            // Generar máscara espacial determinista basada en la celda
            // Binding mediante XOR: HV * Space
            const cellSeed = (cellIndex + 1) * 0x9E3779B9;

            for (let i = 0; i < hv.length; i++) {
                // Generar patrón pseudo-aleatorio rápido
                let pattern = (cellSeed + i * 0x85EBCA6B) | 0;
                pattern = Math.imul(pattern ^ (pattern >>> 16), 0x226c0e1);
                pattern = Math.imul(pattern ^ (pattern >>> 13), 0xc2b2ae35);
                pattern = (pattern ^ (pattern >>> 16)) >>> 0;

                hv[i] ^= pattern;
            }

            hypervectors.push(hv);
        }

        // 4. Bundle: Combinar todos los hypervectors (majority voting)
        const globalHV = hypervectors.length > 0
            ? bundle(hypervectors)
            : new Uint32Array(HDC_WORDS);

        // 5. Comprimir al tamaño deseado
        const embedding = this._compressToSize(globalHV, this.config.outputBits);

        const timeMs = performance.now() - startTime;

        return new ImageEmbedding(embedding, {
            featureCount: sortedFeatures.length,
            mode: this.mode,
            timeMs,
            width,
            height
        });
    }

    /**
     * Compara dos embeddings y retorna similitud [0, 1]
     * 
     * Usa una métrica ajustada donde:
     * - Idénticos = 1.0
     * - Aleatorios (50% hamming) = 0.0
     * - Completamente opuestos = -1.0 (pero clampeamos a 0)
     * 
     * @param {ImageEmbedding} emb1 
     * @param {ImageEmbedding} emb2 
     * @returns {number} Similitud entre 0 (diferente/random) y 1 (idéntico)
     */
    compare(emb1, emb2) {
        const v1 = emb1.vector || emb1;
        const v2 = emb2.vector || emb2;

        if (v1.length !== v2.length) {
            throw new Error('Embeddings must have same dimension');
        }

        // Hamming distance 
        let hammingDistance = 0;
        const totalBits = v1.length * 32;

        for (let i = 0; i < v1.length; i++) {
            hammingDistance += popcount32(v1[i] ^ v2[i]);
        }

        // Similitud ajustada:
        // hammingDistance = 0 => similarity = 1.0
        // hammingDistance = totalBits/2 (random) => similarity = 0.0
        // hammingDistance = totalBits => similarity = -1.0 (clamped to 0)
        const normalizedDist = hammingDistance / (totalBits / 2);
        const similarity = Math.max(0, 1 - normalizedDist);

        return similarity;
    }

    /**
     * Busca los embeddings más similares en una base de datos
     * 
     * @param {ImageEmbedding} query - Embedding a buscar
     * @param {ImageEmbedding[]} database - Array de embeddings
     * @param {number} topK - Número de resultados a retornar
     * @returns {Array<{index: number, similarity: number}>} Resultados ordenados
     */
    search(query, database, topK = 10) {
        const results = [];

        for (let i = 0; i < database.length; i++) {
            const similarity = this.compare(query, database[i]);
            results.push({ index: i, similarity });
        }

        // Ordenar por similitud descendente
        results.sort((a, b) => b.similarity - a.similarity);

        return results.slice(0, topK);
    }

    /**
     * Agrupa embeddings por similitud (clustering)
     * 
     * @param {ImageEmbedding[]} embeddings 
     * @param {number} threshold - Umbral de similitud para agrupar (0-1)
     * @returns {number[]} Array de cluster IDs para cada embedding
     */
    cluster(embeddings, threshold = 0.7) {
        const n = embeddings.length;
        const clusterIds = new Array(n).fill(-1);
        let nextClusterId = 0;

        for (let i = 0; i < n; i++) {
            if (clusterIds[i] !== -1) continue;

            // Crear nuevo cluster con este elemento
            clusterIds[i] = nextClusterId;

            // Buscar todos los elementos similares
            for (let j = i + 1; j < n; j++) {
                if (clusterIds[j] !== -1) continue;

                const sim = this.compare(embeddings[i], embeddings[j]);
                if (sim >= threshold) {
                    clusterIds[j] = nextClusterId;
                }
            }

            nextClusterId++;
        }

        return clusterIds;
    }

    /**
     * Comprime el hypervector HDC al tamaño de salida deseado
     */
    _compressToSize(hv, targetBits) {
        const targetWords = targetBits / 32;

        if (targetWords >= HDC_WORDS) {
            // Si el target es mayor o igual, retornar el HV completo (truncado si es necesario)
            return new Uint32Array(hv.buffer, 0, targetWords);
        }

        // Comprimir usando XOR folding + hash
        const result = new Uint32Array(targetWords);

        if (targetBits === 32) {
            // Para 32 bits, usar la firma comprimida FNV-1a
            result[0] = compressToSignature(hv);
        } else {
            // Para otros tamaños, usar XOR folding por bloques
            const blocksPerOutput = Math.ceil(HDC_WORDS / targetWords);

            for (let i = 0; i < targetWords; i++) {
                let acc = 0;
                for (let j = 0; j < blocksPerOutput; j++) {
                    const srcIdx = i * blocksPerOutput + j;
                    if (srcIdx < HDC_WORDS) {
                        acc ^= hv[srcIdx];
                    }
                }
                // Rotar bits para mejor distribución
                result[i] = ((acc << (i % 32)) | (acc >>> (32 - (i % 32)))) >>> 0;
            }
        }

        return result;
    }

    /**
     * Weighted Bundle: Combina hypervectors con pesos
     * Features con mayor score contribuyen más al resultado final
     */
    _weightedBundle(hvs, weights) {
        const result = new Uint32Array(HDC_WORDS);

        // Normalizar pesos
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);

        // Acumuladores de votos pesados por cada bit
        const counters = new Float32Array(HDC_DIMENSION);

        for (let hvIdx = 0; hvIdx < hvs.length; hvIdx++) {
            const hv = hvs[hvIdx];
            const weight = normalizedWeights[hvIdx];

            for (let i = 0; i < HDC_DIMENSION; i++) {
                if (hv[i >>> 5] & (1 << (i & 31))) {
                    counters[i] += weight;
                }
            }
        }

        // Threshold ponderado (0.5 para balance)
        for (let i = 0; i < HDC_DIMENSION; i++) {
            if (counters[i] > 0.5) {
                result[i >>> 5] |= (1 << (i & 31));
            }
        }

        return result;
    }
}

// ============================================================================
// CLASE EMBEDDING (Resultado)
// ============================================================================

/**
 * Representa un embedding de imagen
 */
export class ImageEmbedding {
    constructor(vector, metadata = {}) {
        this.vector = vector;
        this.metadata = metadata;
    }

    /**
     * Serializa el embedding a bytes para storage
     * @returns {Uint8Array}
     */
    toBytes() {
        return new Uint8Array(this.vector.buffer);
    }

    /**
     * Crea un embedding desde bytes
     * @param {Uint8Array} bytes 
     * @returns {ImageEmbedding}
     */
    static fromBytes(bytes) {
        const vector = new Uint32Array(bytes.buffer);
        return new ImageEmbedding(vector);
    }

    /**
     * Serializa a Base64 para transmisión
     * @returns {string}
     */
    toBase64() {
        const bytes = this.toBytes();
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Crea un embedding desde Base64
     * @param {string} base64 
     * @returns {ImageEmbedding}
     */
    static fromBase64(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return ImageEmbedding.fromBytes(bytes);
    }

    /**
     * Serializa a hex string
     * @returns {string}
     */
    toHex() {
        return Array.from(this.vector)
            .map(n => n.toString(16).padStart(8, '0'))
            .join('');
    }

    /**
     * Convierte el vector binario a un array de floats (0.0 o 1.0)
     * Útil para compatibilidad con bases de datos vectoriales que esperan arrays de números (como LLMs)
     * 
     * @returns {Float32Array}
     */
    toFloatArray() {
        const totalBits = this.bits;
        const floats = new Float32Array(totalBits);
        for (let i = 0; i < totalBits; i++) {
            const wordIdx = i >>> 5;
            const bitIdx = i & 31;
            floats[i] = (this.vector[wordIdx] & (1 << bitIdx)) ? 1.0 : 0.0;
        }
        return floats;
    }

    /**
     * Número de bits del embedding
     */
    get bits() {
        return this.vector.length * 32;
    }

    /**
     * Número de bytes del embedding
     */
    get bytes() {
        return this.vector.length * 4;
    }
}

// ============================================================================
// FUNCIONES DE CONVENIENCIA
// ============================================================================

/**
 * Genera embedding de una imagen en un solo paso
 * 
 * @param {Float32Array|Uint8Array} imageData 
 * @param {number} width 
 * @param {number} height 
 * @param {string} mode - 'micro' | 'compact' | 'standard' | 'full'
 * @returns {ImageEmbedding}
 */
export function embedImage(imageData, width, height, mode = 'standard') {
    const embedder = new ImageEmbedder(mode);
    return embedder.embed(imageData, width, height);
}

/**
 * Compara dos imágenes directamente
 * 
 * @param {Float32Array} img1Data 
 * @param {number} img1Width 
 * @param {number} img1Height 
 * @param {Float32Array} img2Data 
 * @param {number} img2Width 
 * @param {number} img2Height 
 * @param {string} mode 
 * @returns {number} Similitud 0-1
 */
export function compareImages(img1Data, img1Width, img1Height, img2Data, img2Width, img2Height, mode = 'standard') {
    const embedder = new ImageEmbedder(mode);
    const emb1 = embedder.embed(img1Data, img1Width, img1Height);
    const emb2 = embedder.embed(img2Data, img2Width, img2Height);
    return embedder.compare(emb1, emb2);
}

/**
 * Detecta si dos imágenes son duplicados (o casi-duplicados)
 * 
 * @param {ImageEmbedding} emb1 
 * @param {ImageEmbedding} emb2 
 * @param {number} threshold - Umbral de similitud (default: 0.85)
 * @returns {boolean}
 */
export function isDuplicate(emb1, emb2, threshold = 0.85) {
    const embedder = new ImageEmbedder();
    return embedder.compare(emb1, emb2) >= threshold;
}

// ============================================================================
// HELPERS
// ============================================================================

function popcount32(n) {
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { EMBEDDING_CONFIGS };
