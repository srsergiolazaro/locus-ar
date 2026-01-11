/**
 * Saliency Map Computation
 * 
 * Computes visual saliency - regions that "pop out" and attract attention.
 * Used to guide saccadic attention to visually important areas.
 * 
 * Implements a simplified Itti-Koch saliency model:
 * - Intensity contrast
 * - Edge density
 * - Local complexity
 * 
 * For AR tracking, high-saliency regions often contain:
 * - Corners and edges (good for feature detection)
 * - High-contrast areas (robust to lighting changes)
 * - Texture-rich regions (distinctive for matching)
 */

class SaliencyMap {
    /**
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Downsampled dimensions for efficiency
        this.scale = 8; // Process at 1/8 resolution
        this.scaledW = Math.ceil(width / this.scale);
        this.scaledH = Math.ceil(height / this.scale);

        // Pre-allocate buffers
        this.intensityMap = new Float32Array(this.scaledW * this.scaledH);
        this.contrastMap = new Float32Array(this.scaledW * this.scaledH);
        this.edgeMap = new Float32Array(this.scaledW * this.scaledH);
        this.saliencyBuffer = new Float32Array(this.scaledW * this.scaledH);

        // Peak detection parameters
        this.maxPeaks = 5;
        this.suppressionRadius = Math.max(this.scaledW, this.scaledH) * 0.15;
    }

    /**
     * Compute saliency map for input image
     * 
     * @param {Uint8Array} inputData - Grayscale input image
     * @returns {Object} Saliency result with peaks
     */
    compute(inputData) {
        // Step 1: Downsample and compute intensity
        this._downsample(inputData);

        // Step 2: Compute features
        this._computeContrast();
        this._computeEdges();

        // Step 3: Combine into saliency map
        this._combineSaliency();

        // Step 4: Find peaks
        const peaks = this._findPeaks();

        return {
            map: this.saliencyBuffer,
            width: this.scaledW,
            height: this.scaledH,
            peaks,
            maxSaliency: peaks.length > 0 ? peaks[0].value : 0,
        };
    }

    /**
     * Downsample input to working resolution
     * @private
     */
    _downsample(inputData) {
        const s = this.scale;
        const w = this.width;

        for (let sy = 0; sy < this.scaledH; sy++) {
            const yStart = sy * s;
            const yEnd = Math.min(yStart + s, this.height);

            for (let sx = 0; sx < this.scaledW; sx++) {
                const xStart = sx * s;
                const xEnd = Math.min(xStart + s, this.width);

                let sum = 0;
                let count = 0;

                for (let y = yStart; y < yEnd; y++) {
                    const rowOffset = y * w;
                    for (let x = xStart; x < xEnd; x++) {
                        sum += inputData[rowOffset + x];
                        count++;
                    }
                }

                this.intensityMap[sy * this.scaledW + sx] = sum / count / 255;
            }
        }
    }

    /**
     * Compute local contrast map
     * @private
     */
    _computeContrast() {
        const w = this.scaledW;
        const h = this.scaledH;
        const intensity = this.intensityMap;
        const contrast = this.contrastMap;

        // 3x3 local contrast using center-surround
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                const center = intensity[idx];

                // Compute average of 8 neighbors
                let surround = 0;
                surround += intensity[(y - 1) * w + (x - 1)];
                surround += intensity[(y - 1) * w + x];
                surround += intensity[(y - 1) * w + (x + 1)];
                surround += intensity[y * w + (x - 1)];
                surround += intensity[y * w + (x + 1)];
                surround += intensity[(y + 1) * w + (x - 1)];
                surround += intensity[(y + 1) * w + x];
                surround += intensity[(y + 1) * w + (x + 1)];
                surround /= 8;

                // Contrast is absolute difference
                contrast[idx] = Math.abs(center - surround);
            }
        }

        // Handle borders
        for (let y = 0; y < h; y++) {
            contrast[y * w] = 0;
            contrast[y * w + w - 1] = 0;
        }
        for (let x = 0; x < w; x++) {
            contrast[x] = 0;
            contrast[(h - 1) * w + x] = 0;
        }
    }

    /**
     * Compute edge density map using Sobel-like operator
     * @private
     */
    _computeEdges() {
        const w = this.scaledW;
        const h = this.scaledH;
        const intensity = this.intensityMap;
        const edges = this.edgeMap;

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                // Simplified Sobel
                const gx =
                    -intensity[(y - 1) * w + (x - 1)] + intensity[(y - 1) * w + (x + 1)] +
                    -2 * intensity[y * w + (x - 1)] + 2 * intensity[y * w + (x + 1)] +
                    -intensity[(y + 1) * w + (x - 1)] + intensity[(y + 1) * w + (x + 1)];

                const gy =
                    -intensity[(y - 1) * w + (x - 1)] - 2 * intensity[(y - 1) * w + x] - intensity[(y - 1) * w + (x + 1)] +
                    intensity[(y + 1) * w + (x - 1)] + 2 * intensity[(y + 1) * w + x] + intensity[(y + 1) * w + (x + 1)];

                edges[y * w + x] = Math.sqrt(gx * gx + gy * gy) / 4; // Normalize
            }
        }

        // Handle borders
        for (let y = 0; y < h; y++) {
            edges[y * w] = 0;
            edges[y * w + w - 1] = 0;
        }
        for (let x = 0; x < w; x++) {
            edges[x] = 0;
            edges[(h - 1) * w + x] = 0;
        }
    }

    /**
     * Combine features into final saliency map
     * @private
     */
    _combineSaliency() {
        const n = this.saliencyBuffer.length;
        const contrast = this.contrastMap;
        const edges = this.edgeMap;
        const saliency = this.saliencyBuffer;

        // Weight: 60% contrast, 40% edges
        for (let i = 0; i < n; i++) {
            saliency[i] = contrast[i] * 0.6 + edges[i] * 0.4;
        }

        // Normalize to [0, 1]
        let max = 0;
        for (let i = 0; i < n; i++) {
            max = Math.max(max, saliency[i]);
        }

        if (max > 0) {
            for (let i = 0; i < n; i++) {
                saliency[i] /= max;
            }
        }
    }

    /**
     * Find peaks in saliency map using non-maximum suppression
     * @private
     */
    _findPeaks() {
        const w = this.scaledW;
        const h = this.scaledH;
        const saliency = this.saliencyBuffer;
        const peaks = [];
        const r = this.suppressionRadius;
        const r2 = r * r;

        // Find all local maxima
        const candidates = [];
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                const val = saliency[idx];

                // Check if local maximum (8-connected)
                if (val > saliency[(y - 1) * w + (x - 1)] &&
                    val > saliency[(y - 1) * w + x] &&
                    val > saliency[(y - 1) * w + (x + 1)] &&
                    val > saliency[y * w + (x - 1)] &&
                    val > saliency[y * w + (x + 1)] &&
                    val > saliency[(y + 1) * w + (x - 1)] &&
                    val > saliency[(y + 1) * w + x] &&
                    val > saliency[(y + 1) * w + (x + 1)]) {
                    candidates.push({ x, y, value: val });
                }
            }
        }

        // Sort by value descending
        candidates.sort((a, b) => b.value - a.value);

        // Non-maximum suppression
        for (const cand of candidates) {
            if (peaks.length >= this.maxPeaks) break;

            // Check if too close to existing peaks
            let suppress = false;
            for (const peak of peaks) {
                const dx = cand.x - peak.x;
                const dy = cand.y - peak.y;
                if (dx * dx + dy * dy < r2) {
                    suppress = true;
                    break;
                }
            }

            if (!suppress) {
                // Convert to original image coordinates
                peaks.push({
                    x: (cand.x + 0.5) * this.scale,
                    y: (cand.y + 0.5) * this.scale,
                    value: cand.value,
                });
            }
        }

        return peaks;
    }

    /**
     * Get saliency value at a specific location
     * 
     * @param {number} x - X coordinate in original image
     * @param {number} y - Y coordinate in original image
     * @returns {number} Saliency value (0-1)
     */
    getSaliencyAt(x, y) {
        const sx = Math.floor(x / this.scale);
        const sy = Math.floor(y / this.scale);

        if (sx < 0 || sx >= this.scaledW || sy < 0 || sy >= this.scaledH) {
            return 0;
        }

        return this.saliencyBuffer[sy * this.scaledW + sx];
    }
}

export { SaliencyMap };
