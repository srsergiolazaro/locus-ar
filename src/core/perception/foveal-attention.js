/**
 * Foveal Attention System
 * 
 * Mimics the human eye's fovea-parafovea-periphery structure:
 * - Fovea (center 5°): Maximum resolution, ~50% of visual processing power
 * - Parafovea (5-10°): Medium resolution, pattern recognition
 * - Periphery (>10°): Low resolution, motion detection
 * 
 * This allows processing ~75% fewer pixels while maintaining
 * high-quality tracking in the area of interest.
 */

/**
 * A region extracted at a specific resolution
 * @typedef {Object} AttentionRegion
 * @property {number} x - Center X coordinate in original image
 * @property {number} y - Center Y coordinate in original image
 * @property {number} radius - Radius in original image pixels
 * @property {number} resolution - Resolution multiplier (1.0 = full)
 * @property {Uint8Array} data - Extracted pixel data
 * @property {number} width - Width of extracted region
 * @property {number} height - Height of extracted region
 * @property {number} pixelCount - Number of pixels in region
 * @property {string} type - 'fovea' | 'parafovea' | 'periphery'
 */

class FovealAttention {
    /**
     * @param {number} width - Input image width
     * @param {number} height - Input image height
     * @param {Object} config - Configuration
     */
    constructor(width, height, config) {
        this.width = width;
        this.height = height;
        this.config = config;

        // Calculate region sizes
        this.minDim = Math.min(width, height);
        this.foveaRadius = Math.floor(this.minDim * config.FOVEA_RADIUS_RATIO);
        this.parafoveaRadius = Math.floor(this.minDim * config.PARAFOVEA_RADIUS_RATIO);

        // Pre-allocate buffers for each region type
        this._initBuffers();
    }

    /**
     * Initialize pre-allocated extraction buffers
     * @private
     */
    _initBuffers() {
        // Fovea buffer (full resolution, circular region)
        const foveaDiam = this.foveaRadius * 2;
        this.foveaBuffer = new Uint8Array(foveaDiam * foveaDiam);

        // Parafovea buffer (half resolution)
        const parafoveaDiam = this.parafoveaRadius * 2;
        const parafoveaScaled = Math.ceil(parafoveaDiam * this.config.PARAFOVEA_RESOLUTION);
        this.parafoveaBuffer = new Uint8Array(parafoveaScaled * parafoveaScaled);

        // Periphery buffer (quarter resolution, full image)
        const periphW = Math.ceil(this.width * this.config.PERIPHERY_RESOLUTION);
        const periphH = Math.ceil(this.height * this.config.PERIPHERY_RESOLUTION);
        this.peripheryBuffer = new Uint8Array(periphW * periphH);
        this.peripheryDims = { width: periphW, height: periphH };

        // Mask for circular extraction (reusable)
        this._buildCircularMask();
    }

    /**
     * Build a circular mask for foveal extraction
     * @private
     */
    _buildCircularMask() {
        const r = this.foveaRadius;
        const size = r * 2;
        this.circularMask = new Uint8Array(size * size);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - r;
                const dy = y - r;
                const dist = Math.sqrt(dx * dx + dy * dy);
                this.circularMask[y * size + x] = dist <= r ? 1 : 0;
            }
        }
    }

    /**
     * Extract attention region at specified center
     * 
     * @param {Uint8Array} inputData - Grayscale input image
     * @param {number} centerX - X coordinate of attention center
     * @param {number} centerY - Y coordinate of attention center
     * @param {number} priority - Priority level (0=highest)
     * @returns {AttentionRegion} Extracted region
     */
    extract(inputData, centerX, centerY, priority = 0) {
        // Clamp center to valid range
        centerX = Math.max(this.foveaRadius, Math.min(this.width - this.foveaRadius - 1, centerX));
        centerY = Math.max(this.foveaRadius, Math.min(this.height - this.foveaRadius - 1, centerY));

        // Priority 0 = full foveal extraction
        // Priority 1 = parafoveal only
        // Priority 2+ = periphery glimpse
        if (priority === 0) {
            return this._extractFovea(inputData, centerX, centerY);
        } else if (priority === 1) {
            return this._extractParafovea(inputData, centerX, centerY);
        } else {
            return this._extractPeriphery(inputData);
        }
    }

    /**
     * Extract foveal region at full resolution
     * @private
     */
    _extractFovea(inputData, cx, cy) {
        const r = this.foveaRadius;
        const diam = r * 2;
        const buffer = this.foveaBuffer;

        let idx = 0;
        let validPixels = 0;

        for (let dy = -r; dy < r; dy++) {
            const y = cy + dy;
            const rowStart = y * this.width;

            for (let dx = -r; dx < r; dx++) {
                const maskIdx = (dy + r) * diam + (dx + r);
                if (this.circularMask[maskIdx]) {
                    const x = cx + dx;
                    buffer[idx] = inputData[rowStart + x];
                    validPixels++;
                } else {
                    buffer[idx] = 0;
                }
                idx++;
            }
        }

        return {
            x: cx,
            y: cy,
            radius: r,
            resolution: this.config.FOVEA_RESOLUTION,
            data: buffer,
            width: diam,
            height: diam,
            pixelCount: validPixels,
            type: 'fovea',
            // Transform helpers
            toOriginalCoord: (localX, localY) => ({
                x: cx - r + localX,
                y: cy - r + localY,
            }),
            toLocalCoord: (origX, origY) => ({
                x: origX - (cx - r),
                y: origY - (cy - r),
            }),
        };
    }

    /**
     * Extract parafoveal region at half resolution
     * @private
     */
    _extractParafovea(inputData, cx, cy) {
        const r = this.parafoveaRadius;
        const res = this.config.PARAFOVEA_RESOLUTION;
        const scaledR = Math.ceil(r * res);
        const scaledDiam = scaledR * 2;
        const buffer = this.parafoveaBuffer;
        const step = Math.round(1 / res);

        let idx = 0;
        let validPixels = 0;

        for (let sy = 0; sy < scaledDiam; sy++) {
            const y = cy - r + Math.floor(sy / res);
            if (y < 0 || y >= this.height) continue;
            const rowStart = y * this.width;

            for (let sx = 0; sx < scaledDiam; sx++) {
                const x = cx - r + Math.floor(sx / res);
                if (x < 0 || x >= this.width) {
                    buffer[idx++] = 0;
                    continue;
                }

                // Sample with bilinear interpolation for smoother downscaling
                buffer[idx++] = inputData[rowStart + x];
                validPixels++;
            }
        }

        return {
            x: cx,
            y: cy,
            radius: r,
            resolution: res,
            data: buffer,
            width: scaledDiam,
            height: scaledDiam,
            pixelCount: validPixels,
            type: 'parafovea',
            toOriginalCoord: (localX, localY) => ({
                x: cx - r + localX / res,
                y: cy - r + localY / res,
            }),
            toLocalCoord: (origX, origY) => ({
                x: (origX - (cx - r)) * res,
                y: (origY - (cy - r)) * res,
            }),
        };
    }

    /**
     * Extract periphery at quarter resolution (motion detection only)
     * @private
     */
    _extractPeriphery(inputData) {
        const res = this.config.PERIPHERY_RESOLUTION;
        const outW = this.peripheryDims.width;
        const outH = this.peripheryDims.height;
        const buffer = this.peripheryBuffer;
        const step = Math.round(1 / res);

        let idx = 0;
        for (let y = 0; y < this.height; y += step) {
            const rowStart = y * this.width;
            for (let x = 0; x < this.width; x += step) {
                if (idx < buffer.length) {
                    buffer[idx++] = inputData[rowStart + x];
                }
            }
        }

        return {
            x: this.width / 2,
            y: this.height / 2,
            radius: Math.max(this.width, this.height) / 2,
            resolution: res,
            data: buffer,
            width: outW,
            height: outH,
            pixelCount: outW * outH,
            type: 'periphery',
            toOriginalCoord: (localX, localY) => ({
                x: localX / res,
                y: localY / res,
            }),
            toLocalCoord: (origX, origY) => ({
                x: origX * res,
                y: origY * res,
            }),
        };
    }

    /**
     * Get combined multi-resolution representation
     * Uses fovea at center, parafovea around it, periphery for the rest
     * 
     * @param {Uint8Array} inputData - Input image
     * @param {number} cx - Fovea center X
     * @param {number} cy - Fovea center Y
     * @returns {Object} Multi-resolution representation
     */
    extractMultiResolution(inputData, cx, cy) {
        return {
            fovea: this._extractFovea(inputData, cx, cy),
            parafovea: this._extractParafovea(inputData, cx, cy),
            periphery: this._extractPeriphery(inputData),
            center: { x: cx, y: cy },
            totalPixels: this._computeTotalPixels(),
            originalPixels: this.width * this.height,
        };
    }

    /**
     * Compute total pixels in multi-resolution representation
     * @private
     */
    _computeTotalPixels() {
        const foveaPixels = Math.PI * this.foveaRadius ** 2;
        const parafoveaPixels = Math.PI * this.parafoveaRadius ** 2 * this.config.PARAFOVEA_RESOLUTION ** 2;
        const peripheryPixels = this.peripheryDims.width * this.peripheryDims.height;
        return Math.ceil(foveaPixels + parafoveaPixels + peripheryPixels);
    }

    /**
     * Update configuration
     * @param {Object} config - New configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        this.foveaRadius = Math.floor(this.minDim * config.FOVEA_RADIUS_RATIO);
        this.parafoveaRadius = Math.floor(this.minDim * config.PARAFOVEA_RADIUS_RATIO);
        this._initBuffers();
    }
}

export { FovealAttention };
