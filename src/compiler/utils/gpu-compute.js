/**
 * @fileoverview GPU Compute Layer for AR Compiler
 *
 * Provides optimized image processing with GPU acceleration when available.
 * - In browser: Uses GPU.js with WebGL
 * - In Node.js: Uses pure JavaScript (GPU.js requires headless-gl which may not compile)
 *
 * All methods have pure JS fallbacks that work universally.
 */

// This module now uses pure JavaScript for all operations to ensure 
// zero-dependency builds and universal compatibility (Node.js & Browser).
// The pure JS implementations are highly optimized for performance.

/**
 * No-op initialization for compatibility
 */
const tryInitGPU = () => {
    return null;
};

// ============================================================================
// PURE JAVASCRIPT IMPLEMENTATIONS (Always work)
// ============================================================================

/**
 * Pure JS: Compute edge gradients
 */
const computeGradientsJS = (imageData, width, height) => {
    const dValue = new Float32Array(width * height);

    for (let j = 1; j < height - 1; j++) {
        const rowOffset = j * width;
        const prevRowOffset = (j - 1) * width;
        const nextRowOffset = (j + 1) * width;

        for (let i = 1; i < width - 1; i++) {
            const pos = rowOffset + i;

            const dx = (imageData[prevRowOffset + i + 1] - imageData[prevRowOffset + i - 1] +
                imageData[rowOffset + i + 1] - imageData[rowOffset + i - 1] +
                imageData[nextRowOffset + i + 1] - imageData[nextRowOffset + i - 1]) / 768;

            const dy = (imageData[nextRowOffset + i - 1] - imageData[prevRowOffset + i - 1] +
                imageData[nextRowOffset + i] - imageData[prevRowOffset + i] +
                imageData[nextRowOffset + i + 1] - imageData[prevRowOffset + i + 1]) / 768;

            dValue[pos] = Math.sqrt((dx * dx + dy * dy) / 2);
        }
    }

    return dValue;
};

/**
 * Pure JS: Find local maxima
 */
const findLocalMaximaJS = (gradients, width, height) => {
    const isCandidate = new Uint8Array(width * height);

    for (let j = 1; j < height - 1; j++) {
        const rowOffset = j * width;
        for (let i = 1; i < width - 1; i++) {
            const pos = rowOffset + i;
            const val = gradients[pos];
            if (val > 0 &&
                val >= gradients[pos - 1] && val >= gradients[pos + 1] &&
                val >= gradients[pos - width] && val >= gradients[pos + width]) {
                isCandidate[pos] = 1;
            }
        }
    }

    return isCandidate;
};

/**
 * Pure JS: Gaussian blur (5x5 binomial)
 */
const gaussianBlurJS = (data, width, height) => {
    const output = new Float32Array(width * height);
    const temp = new Float32Array(width * height);
    const k0 = 1 / 16, k1 = 4 / 16, k2 = 6 / 16;
    const w1 = width - 1;
    const h1 = height - 1;

    // Horizontal pass
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

    // Vertical pass
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

    return output;
};

/**
 * Pure JS: Downsample by factor of 2
 */
const downsampleJS = (data, width, height) => {
    const newWidth = Math.floor(width / 2);
    const newHeight = Math.floor(height / 2);
    const output = new Float32Array(newWidth * newHeight);

    for (let y = 0; y < newHeight; y++) {
        const sy = y * 2;
        for (let x = 0; x < newWidth; x++) {
            const sx = x * 2;
            const pos = sy * width + sx;
            output[y * newWidth + x] =
                (data[pos] + data[pos + 1] + data[pos + width] + data[pos + width + 1]) / 4;
        }
    }

    return { data: output, width: newWidth, height: newHeight };
};

// ============================================================================
// GPU COMPUTE CLASS
// ============================================================================

/**
 * GPU Compute class - provides optimized image processing
 */
export class GPUCompute {
    constructor() {
        this.gpu = null;
        this.kernelCache = new Map();
        this.initialized = false;
    }

    /**
     * Initialize (tries GPU in browser, uses JS in Node)
     */
    init() {
        if (this.initialized) return;
        this.gpu = tryInitGPU();
        this.initialized = true;
    }

    /**
     * Compute edge gradients
     */
    computeGradients(imageData, width, height) {
        this.init();
        // Always use JS implementation for reliability
        return computeGradientsJS(imageData, width, height);
    }

    /**
     * Find local maxima
     */
    findLocalMaxima(gradients, width, height) {
        this.init();
        return findLocalMaximaJS(gradients, width, height);
    }

    /**
     * Combined edge detection
     */
    edgeDetection(imageData, width, height) {
        const dValue = this.computeGradients(imageData, width, height);
        const isCandidate = this.findLocalMaxima(dValue, width, height);
        return { dValue, isCandidate };
    }

    /**
     * Gaussian blur
     */
    gaussianBlur(imageData, width, height) {
        this.init();
        return gaussianBlurJS(imageData, width, height);
    }

    /**
     * Downsample by factor of 2
     */
    downsample(imageData, width, height) {
        this.init();
        return downsampleJS(imageData, width, height);
    }

    /**
     * Build Gaussian pyramid
     */
    buildPyramid(imageData, width, height, numLevels = 5) {
        this.init();

        const pyramid = [];
        let currentData = imageData instanceof Float32Array ? imageData : Float32Array.from(imageData);
        let currentWidth = width;
        let currentHeight = height;

        for (let level = 0; level < numLevels; level++) {
            const blurred = this.gaussianBlur(currentData, currentWidth, currentHeight);

            pyramid.push({
                data: blurred,
                width: currentWidth,
                height: currentHeight,
                scale: Math.pow(2, level),
            });

            if (currentWidth > 8 && currentHeight > 8) {
                const downsampled = this.downsample(blurred, currentWidth, currentHeight);
                currentData = downsampled.data;
                currentWidth = downsampled.width;
                currentHeight = downsampled.height;
            } else {
                break;
            }
        }

        return pyramid;
    }

    /**
     * Check if GPU is available
     */
    isGPUAvailable() {
        this.init();
        return this.gpu !== null;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.kernelCache.clear();
        if (this.gpu && this.gpu.destroy) {
            this.gpu.destroy();
        }
        this.gpu = null;
        this.initialized = false;
    }
}

// Singleton instance
export const gpuCompute = new GPUCompute();
