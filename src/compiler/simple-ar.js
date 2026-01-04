import { Controller } from "./controller.js";
import { OneEuroFilter } from "../libs/one-euro-filter.js";
import { projectToScreen } from "./utils/projection.js";

/**
 * 🍦 SimpleAR - Dead-simple vanilla AR for image overlays
 * 
 * No Three.js. No A-Frame. Just HTML, CSS, and JavaScript.
 * 
 * @example
 * const ar = new SimpleAR({
 *   container: document.getElementById('ar-container'),
 *   targetSrc: './my-target.mind',
 *   overlay: document.getElementById('my-overlay'),
 *   onFound: () => console.log('Target found!'),
 *   onLost: () => console.log('Target lost!')
 * });
 * 
 * await ar.start();
 */
class SimpleAR {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {string|string[]} options.targetSrc
     * @param {HTMLElement} options.overlay
     * @param {number} [options.scale=1.0]
     * @param {((data: {targetIndex: number}) => void | Promise<void>) | null} [options.onFound]
     * @param {((data: {targetIndex: number}) => void | Promise<void>) | null} [options.onLost]
     * @param {((data: {targetIndex: number, worldMatrix: number[]}) => void) | null} [options.onUpdate]
     * @param {Object} [options.cameraConfig]
     */
    constructor({
        container,
        targetSrc,
        overlay,
        scale = 1.0, // Multiplicador de escala personalizado
        onFound = null,
        onLost = null,
        onUpdate = null,
        cameraConfig = { facingMode: 'environment', width: 1280, height: 720 },
        debug = false,
    }) {
        this.container = container;
        this.targetSrc = targetSrc;
        this.overlay = overlay;
        this.scaleMultiplier = scale;
        this.onFound = onFound;
        this.onLost = onLost;
        this.onUpdateCallback = onUpdate;
        this.cameraConfig = cameraConfig;
        this.debug = debug;
        if (this.debug) window.AR_DEBUG = true;

        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.debugPanel = null;

        this.video = null;
        this.controller = null;
        this.isTracking = false;
        this.lastMatrix = null;
        this.filters = []; // One filter per target
    }

    /**
   * Initialize and start AR tracking
   */
    async start() {
        // 1. Create video element
        this._createVideo();

        // 2. Start camera
        await this._startCamera();

        // 3. Initialize controller
        this._initController();

        if (this.debug) this._createDebugPanel();

        // 4. Load targets (supports single URL or array of URLs)
        const targets = Array.isArray(this.targetSrc) ? this.targetSrc : [this.targetSrc];
        const result = await this.controller.addImageTargets(targets);
        this.markerDimensions = result.dimensions; // [ [w1, h1], [w2, h2], ... ]
        console.log("Targets loaded. Dimensions:", this.markerDimensions);

        this.controller.processVideo(this.video);

        return this;
    }

    /**
     * Stop AR tracking and release resources
     */
    stop() {
        if (this.controller) {
            this.controller.dispose();
            this.controller = null;
        }
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.remove();
            this.video = null;
        }
        this.isTracking = false;
        this.markerDimensions = [];
    }

    _createVideo() {
        this.video = document.createElement('video');
        this.video.setAttribute('autoplay', '');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('muted', '');
        this.video.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 0;
    `;
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.insertBefore(this.video, this.container.firstChild);
    }

    async _startCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: this.cameraConfig
        });
        this.video.srcObject = stream;
        await this.video.play();

        // Wait for video dimensions to be available
        await new Promise(resolve => {
            if (this.video.videoWidth > 0) return resolve();
            this.video.onloadedmetadata = resolve;
        });
    }

    _initController() {
        this.controller = new Controller({
            inputWidth: this.video.videoWidth,
            inputHeight: this.video.videoHeight,
            debugMode: this.debug,
            onUpdate: (data) => this._handleUpdate(data)
        });
    }

    _handleUpdate(data) {
        if (data.type !== 'updateMatrix') return;

        // FPS Calculation
        const now = performance.now();
        this.frameCount++;
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
            if (this.debug) this._updateDebugPanel(this.isTracking);
        }

        const { targetIndex, worldMatrix, modelViewTransform } = data;

        if (worldMatrix) {
            // Target found
            if (!this.isTracking) {
                this.isTracking = true;
                this.overlay && (this.overlay.style.opacity = '1');
                this.onFound && this.onFound({ targetIndex });
            }

            this.lastMatrix = worldMatrix;

            // Smooth the tracking data if filters are initialized
            if (!this.filters[targetIndex]) {
                this.filters[targetIndex] = new OneEuroFilter({ minCutOff: 0.1, beta: 0.01 });
            }

            // Flatten modelViewTransform for filtering (3x4 matrix = 12 values)
            const flatMVT = [
                modelViewTransform[0][0], modelViewTransform[0][1], modelViewTransform[0][2], modelViewTransform[0][3],
                modelViewTransform[1][0], modelViewTransform[1][1], modelViewTransform[1][2], modelViewTransform[1][3],
                modelViewTransform[2][0], modelViewTransform[2][1], modelViewTransform[2][2], modelViewTransform[2][3]
            ];
            const smoothedFlat = this.filters[targetIndex].filter(Date.now(), flatMVT);
            const smoothedMVT = [
                [smoothedFlat[0], smoothedFlat[1], smoothedFlat[2], smoothedFlat[3]],
                [smoothedFlat[4], smoothedFlat[5], smoothedFlat[6], smoothedFlat[7]],
                [smoothedFlat[8], smoothedFlat[9], smoothedFlat[10], smoothedFlat[11]]
            ];

            this._positionOverlay(smoothedMVT, targetIndex);
            this.onUpdateCallback && this.onUpdateCallback({ targetIndex, worldMatrix });

        } else {
            // Target lost
            if (this.isTracking) {
                this.isTracking = false;
                if (this.filters[targetIndex]) this.filters[targetIndex].reset();
                this.overlay && (this.overlay.style.opacity = '0');
                this.onLost && this.onLost({ targetIndex });
            }
        }
    }

    _positionOverlay(mVT, targetIndex) {
        if (!this.overlay || !this.markerDimensions[targetIndex]) return;

        const [markerW, markerH] = this.markerDimensions[targetIndex];
        const containerRect = this.container.getBoundingClientRect();
        const videoW = this.video.videoWidth;
        const videoH = this.video.videoHeight;

        // 1. Determine orientation needs
        const isPortrait = containerRect.height > containerRect.width;
        const isVideoLandscape = videoW > videoH;
        const needsRotation = isPortrait && isVideoLandscape;

        // 3. Get intrinsic projection from controller
        const proj = this.controller.projectionTransform;

        // 4. Position calculation via matrix3d (Support for 3D tilt/Z-rotation)
        // We convert the OpenGL World Matrix to a CSS matrix3d.
        // The OpenGL matrix is column-major. CSS matrix3d is also column-major.
        const m = this.controller.getWorldMatrix(mVT, targetIndex);

        // Map OpenGL coords to Screen Pixels using the projection logic
        const vW = needsRotation ? videoH : videoW;
        const vH = needsRotation ? videoW : videoH;
        const perspectiveScale = Math.max(containerRect.width / vW, containerRect.height / vH);
        const displayW = vW * perspectiveScale;
        const displayH = vH * perspectiveScale;
        const offsetX = (containerRect.width - displayW) / 2;
        const offsetY = (containerRect.height - displayH) / 2;

        // Adjust for centered marker and scaleMultiplier
        const s = finalScale; // We still need the base scale factor for the pixel-to-marker mapping
        // However, a cleaner way is to use the world matrix directly and map it.

        // Actually, the simpler way to do 3D in CSS while keeping my projection logic is:
        // Project the 4 corners and find the homography, OR
        // Use the OpenGL matrix directly with a perspective mapping.

        // Let's use the points projection to maintain the "needsRotation" logic compatibility
        const pMid = projectToScreen(markerW / 2, markerH / 2, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);
        const pUL = projectToScreen(0, 0, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);
        const pUR = projectToScreen(markerW, 0, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);
        const pLL = projectToScreen(0, markerH, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);

        // Using these points we can calculate the 3D rotation and perspective
        const dx = pUR.sx - pUL.sx;
        const dy = pUR.sy - pUL.sy;
        const dz = pUR.sx - pLL.sx; // Not really Z but used for slant

        const angle = Math.atan2(dy, dx);
        const scaleX = Math.sqrt(dx * dx + dy * dy) / markerW;
        const scaleY = Math.sqrt((pLL.sx - pUL.sx) ** 2 + (pLL.sy - pUL.sy) ** 2) / markerH;

        // For true 3D tilt, we'll use the projection of the axes
        const screenX = pMid.sx;
        const screenY = pMid.sy;

        // Final Transform applying 3D perspective via matrix3d derived from projected points
        // NOTE: For full 3D we'd need a homography solver, but for "tilt" we can use the 
        // original modelViewTransform if we convert it carefully.

        const openGLWorldMatrix = this.controller.getWorldMatrix(mVT, targetIndex);
        // We need to apply the same scaling and offsets as projectToScreen to the matrix

        this.overlay.style.maxWidth = 'none';
        this.overlay.style.width = `${markerW}px`;
        this.overlay.style.height = `${markerH}px`;
        this.overlay.style.position = 'absolute';
        this.overlay.style.transformOrigin = '0 0'; // Top-left based for simpler matrix mapping
        this.overlay.style.left = '0';
        this.overlay.style.top = '0';
        this.overlay.style.display = 'block';

        // Approximate 3D tilt using the projected corners to calculate a skew/scale/rotate combo
        // This is more robust than a raw matrix3d if the projection isn't a perfect pinhole
        this.overlay.style.transform = `
            translate(${pUL.sx}px, ${pUL.sy}px)
            matrix(${(pUR.sx - pUL.sx) / markerW}, ${(pUR.sy - pUL.sy) / markerW}, 
                   ${(pLL.sx - pUL.sx) / markerH}, ${(pLL.sy - pUL.sy) / markerH}, 
                   0, 0)
            scale(${this.scaleMultiplier})
        `;
    }

    // Unified projection logic moved to ./utils/projection.js

    _createDebugPanel() {
        this.debugPanel = document.createElement('div');
        this.debugPanel.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 8px;
            border-radius: 4px;
            z-index: 99999;
            pointer-events: none;
            line-height: 1.5;
        `;
        this.container.appendChild(this.debugPanel);
    }

    _updateDebugPanel(isTracking) {
        if (!this.debugPanel) return;
        const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : '?';
        const color = isTracking ? '#0f0' : '#f00';
        const status = isTracking ? 'TRACKING' : 'SEARCHING';

        this.debugPanel.innerHTML = `
            <div>HEAD-UP DISPLAY</div>
            <div>----------------</div>
            <div>FPS:    ${this.fps}</div>
            <div>STATUS: <span style="color:${color}">${status}</span></div>
            <div>MEM:    ${memory} MB</div>
        `;
    }
}

export { SimpleAR };
