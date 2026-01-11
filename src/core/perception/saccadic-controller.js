/**
 * Saccadic Controller
 * 
 * Mimics human eye saccades - rapid movements that redirect foveal attention
 * to areas of interest. The human eye makes 3-4 saccades per second to
 * build a complete picture of the visual scene.
 * 
 * Strategy:
 * 1. Compute saliency map to find "interesting" regions
 * 2. Use tracking state to predict where features should be
 * 3. Generate priority-ordered list of "glance" targets
 * 4. Limit saccades per frame to balance coverage vs. efficiency
 */

/**
 * A saccade target representing where attention should be directed
 * @typedef {Object} SaccadeTarget
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} priority - Priority (0 = highest)
 * @property {string} reason - Why this target was selected
 * @property {number} saliency - Saliency score at this location
 */

class SaccadicController {
    /**
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {Object} config - Configuration
     */
    constructor(width, height, config) {
        this.width = width;
        this.height = height;
        this.config = config;

        // Saccade history for inhibition of return
        this.recentTargets = [];
        this.inhibitionRadius = Math.min(width, height) * 0.1;

        // Movement prediction
        this.velocityHistory = [];
        this.lastCenter = { x: width / 2, y: height / 2 };

        // Grid for systematic coverage
        this.gridCells = this._buildCoverageGrid(3, 3);
        this.lastVisitedCell = 4; // Center

        // State
        this.lastSaccadeTime = 0;
        this.saccadeCount = 0;
    }

    /**
     * Build a grid for systematic coverage during tracking loss
     * @private
     */
    _buildCoverageGrid(rows, cols) {
        const cells = [];
        const cellW = this.width / cols;
        const cellH = this.height / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                cells.push({
                    x: cellW * (c + 0.5),
                    y: cellH * (r + 0.5),
                    index: r * cols + c,
                    lastVisit: 0,
                });
            }
        }
        return cells;
    }

    /**
     * Compute saccade targets based on current state
     * 
     * @param {Object} saliency - Saliency map result
     * @param {Object} currentFovea - Current fovea center {x, y}
     * @param {Object} trackingState - Current tracking state (optional)
     * @returns {SaccadeTarget[]} Priority-ordered list of targets
     */
    computeTargets(saliency, currentFovea, trackingState = null) {
        const targets = [];
        const maxTargets = this.config.MAX_SACCADES_PER_FRAME;

        // Strategy 1: Follow tracking prediction (highest priority)
        if (trackingState && trackingState.isTracking) {
            const predicted = this._predictTrackingCenter(trackingState);
            if (predicted) {
                targets.push({
                    x: predicted.x,
                    y: predicted.y,
                    priority: 0,
                    reason: 'tracking_prediction',
                    saliency: 1.0,
                });
            }
        }

        // Strategy 2: High saliency regions
        if (saliency && saliency.peaks) {
            for (const peak of saliency.peaks) {
                if (targets.length >= maxTargets) break;

                // Skip if too close to existing targets (inhibition of return)
                if (this._isInhibited(peak.x, peak.y, targets)) continue;

                if (peak.value > this.config.SALIENCY_THRESHOLD) {
                    targets.push({
                        x: peak.x,
                        y: peak.y,
                        priority: targets.length,
                        reason: 'saliency_peak',
                        saliency: peak.value,
                    });
                }
            }
        }

        // Strategy 3: Systematic grid search (when not tracking)
        if (!trackingState?.isTracking && targets.length < maxTargets) {
            const gridTarget = this._getNextGridCell();
            if (gridTarget && !this._isInhibited(gridTarget.x, gridTarget.y, targets)) {
                targets.push({
                    x: gridTarget.x,
                    y: gridTarget.y,
                    priority: targets.length,
                    reason: 'grid_search',
                    saliency: 0.5,
                });
            }
        }

        // Strategy 4: Stay at current center if no better options
        if (targets.length === 0) {
            targets.push({
                x: currentFovea.x,
                y: currentFovea.y,
                priority: 0,
                reason: 'maintain_position',
                saliency: 0.3,
            });
        }

        // Update history
        this._updateHistory(targets);

        return targets;
    }

    /**
     * Predict center of tracking based on current state and velocity
     * @private
     */
    _predictTrackingCenter(trackingState) {
        if (!trackingState.worldMatrix) return null;

        // Extract center from world matrix
        const matrix = trackingState.worldMatrix;
        const cx = matrix[12] || this.width / 2;
        const cy = matrix[13] || this.height / 2;

        // Apply velocity-based prediction
        if (this.velocityHistory.length >= 2) {
            const vx = this._computeAverageVelocity('x');
            const vy = this._computeAverageVelocity('y');

            // Predict 1 frame ahead
            return {
                x: Math.max(0, Math.min(this.width - 1, cx + vx)),
                y: Math.max(0, Math.min(this.height - 1, cy + vy)),
            };
        }

        return { x: cx, y: cy };
    }

    /**
     * Compute average velocity from history
     * @private
     */
    _computeAverageVelocity(axis) {
        if (this.velocityHistory.length < 2) return 0;

        let sum = 0;
        for (let i = 1; i < this.velocityHistory.length; i++) {
            sum += this.velocityHistory[i][axis] - this.velocityHistory[i - 1][axis];
        }
        return sum / (this.velocityHistory.length - 1);
    }

    /**
     * Check if a location is inhibited (too close to recent targets)
     * @private
     */
    _isInhibited(x, y, currentTargets) {
        const r2 = this.inhibitionRadius ** 2;

        // Check against current frame targets
        for (const t of currentTargets) {
            const dx = x - t.x;
            const dy = y - t.y;
            if (dx * dx + dy * dy < r2) return true;
        }

        // Check against recent history
        for (const t of this.recentTargets) {
            const dx = x - t.x;
            const dy = y - t.y;
            if (dx * dx + dy * dy < r2) return true;
        }

        return false;
    }

    /**
     * Get next grid cell for systematic search
     * @private
     */
    _getNextGridCell() {
        // Find least recently visited cell
        let oldest = this.gridCells[0];
        let oldestTime = Infinity;

        for (const cell of this.gridCells) {
            if (cell.lastVisit < oldestTime) {
                oldestTime = cell.lastVisit;
                oldest = cell;
            }
        }

        oldest.lastVisit = Date.now();
        return oldest;
    }

    /**
     * Update history with new targets
     * @private
     */
    _updateHistory(targets) {
        // Add to recent targets for inhibition of return
        this.recentTargets.push(...targets);

        // Keep only last N targets
        const maxHistory = this.config.MOTION_HISTORY_FRAMES * this.config.MAX_SACCADES_PER_FRAME;
        while (this.recentTargets.length > maxHistory) {
            this.recentTargets.shift();
        }

        // Update velocity history
        if (targets.length > 0) {
            this.velocityHistory.push({ x: targets[0].x, y: targets[0].y });
            while (this.velocityHistory.length > this.config.MOTION_HISTORY_FRAMES) {
                this.velocityHistory.shift();
            }
            this.lastCenter = { x: targets[0].x, y: targets[0].y };
        }

        this.saccadeCount += targets.length;
        this.lastSaccadeTime = Date.now();
    }

    /**
     * Get the most likely location of interest based on history
     * @returns {Object} {x, y} of predicted location
     */
    getPredictedLocation() {
        if (this.velocityHistory.length >= 2) {
            const vx = this._computeAverageVelocity('x');
            const vy = this._computeAverageVelocity('y');
            return {
                x: Math.max(0, Math.min(this.width - 1, this.lastCenter.x + vx)),
                y: Math.max(0, Math.min(this.height - 1, this.lastCenter.y + vy)),
            };
        }
        return this.lastCenter;
    }

    /**
     * Reset controller state
     */
    reset() {
        this.recentTargets = [];
        this.velocityHistory = [];
        this.lastCenter = { x: this.width / 2, y: this.height / 2 };
        this.saccadeCount = 0;

        for (const cell of this.gridCells) {
            cell.lastVisit = 0;
        }
    }

    /**
     * Update configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        this.inhibitionRadius = Math.min(this.width, this.height) * 0.1;
    }
}

export { SaccadicController };
