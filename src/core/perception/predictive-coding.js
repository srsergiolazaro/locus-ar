/**
 * Predictive Coding System
 * 
 * Inspired by the brain's predictive processing theory:
 * - The brain constantly predicts incoming sensory data
 * - Only "prediction errors" (unexpected changes) are processed fully
 * - If prediction matches reality, minimal processing is needed
 * 
 * For AR tracking:
 * - Predict next frame based on motion model
 * - Compare prediction to actual frame
 * - Skip or minimize processing if difference is below threshold
 * - In static scenes, ~90% of frames can be skipped
 */

class PredictiveCoding {
    /**
     * @param {number} width - Image width
     * @param {number} height - Image height  
     * @param {Object} config - Configuration
     */
    constructor(width, height, config) {
        this.width = width;
        this.height = height;
        this.config = config;

        // Frame history for prediction
        this.frameHistory = [];
        this.stateHistory = [];

        // Motion model parameters
        this.motionModel = {
            vx: 0,           // Velocity X
            vy: 0,           // Velocity Y
            vtheta: 0,       // Angular velocity
            vscale: 0,       // Scale velocity
            confidence: 0,   // Model confidence
        };

        // Block-based change detection (8x8 blocks)
        this.blockSize = 8;
        this.blocksX = Math.ceil(width / this.blockSize);
        this.blocksY = Math.ceil(height / this.blockSize);
        this.blockMeans = new Float32Array(this.blocksX * this.blocksY);
        this.prevBlockMeans = new Float32Array(this.blocksX * this.blocksY);

        // Statistics
        this.consecutiveSkips = 0;
        this.maxConsecutiveSkips = 10; // Force processing every N frames
    }

    /**
     * Predict whether current frame can be skipped
     * 
     * @param {Uint8Array} inputData - Current frame grayscale data
     * @param {Object} trackingState - Current tracking state
     * @returns {Object} Prediction result
     */
    predict(inputData, trackingState) {
        // Always process first few frames
        if (this.frameHistory.length < 2) {
            return { canSkip: false, confidence: 0, reason: 'insufficient_history' };
        }

        // Force processing periodically
        if (this.consecutiveSkips >= this.maxConsecutiveSkips) {
            return { canSkip: false, confidence: 0, reason: 'forced_refresh' };
        }

        // Compute change level
        const changeLevel = this.getChangeLevel(inputData);

        // If not tracking, be more conservative
        const threshold = trackingState?.isTracking
            ? this.config.CHANGE_THRESHOLD
            : this.config.CHANGE_THRESHOLD * 0.5;

        // Decision
        const canSkip = changeLevel < threshold;
        const confidence = canSkip
            ? Math.min(1, (threshold - changeLevel) / threshold)
            : 0;

        // Predict state if skipping
        let predictedState = null;
        if (canSkip && trackingState) {
            predictedState = this._predictState(trackingState);
        }

        if (canSkip) {
            this.consecutiveSkips++;
        }

        return {
            canSkip,
            confidence,
            changeLevel,
            predictedState,
            reason: canSkip ? 'low_change' : 'significant_change',
        };
    }

    /**
     * Compute change level between current and previous frame
     * Uses block-based comparison for efficiency
     * 
     * @param {Uint8Array} inputData - Current frame
     * @returns {number} Change level (0-1)
     */
    getChangeLevel(inputData) {
        if (this.frameHistory.length === 0) {
            return 1.0; // Assume maximum change for first frame
        }

        // Compute block means for current frame
        this._computeBlockMeans(inputData, this.blockMeans);

        // Compare with previous block means
        let totalDiff = 0;
        let maxDiff = 0;
        const numBlocks = this.blocksX * this.blocksY;

        for (let i = 0; i < numBlocks; i++) {
            const diff = Math.abs(this.blockMeans[i] - this.prevBlockMeans[i]) / 255;
            totalDiff += diff;
            maxDiff = Math.max(maxDiff, diff);
        }

        // Combine average and max differences
        const avgDiff = totalDiff / numBlocks;
        const changeLevel = avgDiff * 0.7 + maxDiff * 0.3;

        return Math.min(1, changeLevel);
    }

    /**
     * Compute mean intensity for each block
     * @private
     */
    _computeBlockMeans(data, output) {
        const bs = this.blockSize;
        const w = this.width;

        for (let by = 0; by < this.blocksY; by++) {
            const yStart = by * bs;
            const yEnd = Math.min(yStart + bs, this.height);

            for (let bx = 0; bx < this.blocksX; bx++) {
                const xStart = bx * bs;
                const xEnd = Math.min(xStart + bs, this.width);

                let sum = 0;
                let count = 0;

                for (let y = yStart; y < yEnd; y++) {
                    const rowOffset = y * w;
                    for (let x = xStart; x < xEnd; x++) {
                        sum += data[rowOffset + x];
                        count++;
                    }
                }

                output[by * this.blocksX + bx] = sum / count;
            }
        }
    }

    /**
     * Predict next tracking state based on motion model
     * @private
     */
    _predictState(currentState) {
        if (!currentState.worldMatrix) return null;

        // Extract current parameters
        const matrix = currentState.worldMatrix;

        // Apply motion model
        const predictedMatrix = new Float32Array(16);
        for (let i = 0; i < 16; i++) {
            predictedMatrix[i] = matrix[i];
        }

        // Add predicted motion
        predictedMatrix[12] += this.motionModel.vx;
        predictedMatrix[13] += this.motionModel.vy;

        // Apply scale change (to diagonal elements)
        const scaleFactor = 1 + this.motionModel.vscale;
        predictedMatrix[0] *= scaleFactor;
        predictedMatrix[5] *= scaleFactor;
        predictedMatrix[10] *= scaleFactor;

        return {
            worldMatrix: predictedMatrix,
            isTracking: true,
            isPredicted: true,
            predictionConfidence: this.motionModel.confidence,
        };
    }

    /**
     * Store frame for future prediction
     * 
     * @param {Uint8Array} inputData - Frame data
     * @param {Object} trackingState - Tracking state
     */
    storeFrame(inputData, trackingState) {
        // Copy current block means to previous before computing new
        for (let i = 0; i < this.blockMeans.length; i++) {
            this.prevBlockMeans[i] = this.blockMeans[i];
        }
        // Compute new block means
        this._computeBlockMeans(inputData, this.blockMeans);

        // Store state
        if (trackingState?.worldMatrix) {
            this.stateHistory.push({
                timestamp: Date.now(),
                matrix: new Float32Array(trackingState.worldMatrix),
            });

            // Update motion model
            this._updateMotionModel();

            // Keep history bounded
            while (this.stateHistory.length > this.config.MOTION_HISTORY_FRAMES) {
                this.stateHistory.shift();
            }
        }

        // Reset skip counter
        this.consecutiveSkips = 0;

        // Keep frame count bounded
        this.frameHistory.push(Date.now());
        while (this.frameHistory.length > this.config.MOTION_HISTORY_FRAMES) {
            this.frameHistory.shift();
        }
    }

    /**
     * Update motion model from state history
     * @private
     */
    _updateMotionModel() {
        const history = this.stateHistory;
        if (history.length < 2) {
            this.motionModel.confidence = 0;
            return;
        }

        // Compute velocity from recent frames
        const n = history.length;
        const latest = history[n - 1].matrix;
        const prev = history[n - 2].matrix;
        const dt = (history[n - 1].timestamp - history[n - 2].timestamp) / 1000;

        if (dt > 0) {
            // Position velocity
            this.motionModel.vx = (latest[12] - prev[12]) / dt * 0.016; // Normalize to ~60fps
            this.motionModel.vy = (latest[13] - prev[13]) / dt * 0.016;

            // Scale velocity (from diagonal average)
            const prevScale = (Math.abs(prev[0]) + Math.abs(prev[5])) / 2;
            const currScale = (Math.abs(latest[0]) + Math.abs(latest[5])) / 2;
            this.motionModel.vscale = (currScale - prevScale) / prevScale / dt * 0.016;

            // Compute confidence based on consistency
            if (history.length >= 3) {
                const older = history[n - 3].matrix;
                const expectedVx = (prev[12] - older[12]) / dt * 0.016;
                const expectedVy = (prev[13] - older[13]) / dt * 0.016;

                const errorX = Math.abs(this.motionModel.vx - expectedVx);
                const errorY = Math.abs(this.motionModel.vy - expectedVy);
                const error = Math.sqrt(errorX * errorX + errorY * errorY);

                this.motionModel.confidence = Math.max(0, 1 - error / 10);
            } else {
                this.motionModel.confidence = 0.5;
            }
        }
    }

    /**
     * Check if we're in a static scene (good candidate for aggressive skipping)
     * @returns {boolean} True if scene appears static
     */
    isStaticScene() {
        if (this.stateHistory.length < 3) return false;

        const velocity = Math.sqrt(
            this.motionModel.vx ** 2 +
            this.motionModel.vy ** 2
        );

        return velocity < 0.5 && Math.abs(this.motionModel.vscale) < 0.01;
    }

    /**
     * Reset prediction state
     */
    reset() {
        this.frameHistory = [];
        this.stateHistory = [];
        this.consecutiveSkips = 0;
        this.motionModel = {
            vx: 0,
            vy: 0,
            vtheta: 0,
            vscale: 0,
            confidence: 0,
        };
        this.blockMeans.fill(0);
        this.prevBlockMeans.fill(0);
    }

    /**
     * Update configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
    }
}

export { PredictiveCoding };
