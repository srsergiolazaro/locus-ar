import { Controller } from "./controller.js";
import { OneEuroFilter } from "../libs/one-euro-filter.js";

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
    }) {
        this.container = container;
        this.targetSrc = targetSrc;
        this.overlay = overlay;
        this.scaleMultiplier = scale;
        this.onFound = onFound;
        this.onLost = onLost;
        this.onUpdateCallback = onUpdate;
        this.cameraConfig = cameraConfig;

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
            onUpdate: (data) => this._handleUpdate(data)
        });
    }

    _handleUpdate(data) {
        if (data.type !== 'updateMatrix') return;

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

            // Flatten mVT for filtering (3x4 matrix = 12 values)
            const flatMVT = [
                mVT[0][0], mVT[0][1], mVT[0][2], mVT[0][3],
                mVT[1][0], mVT[1][1], mVT[1][2], mVT[1][3],
                mVT[2][0], mVT[2][1], mVT[2][2], mVT[2][3]
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

        // 2. Get intrinsic projection from controller
        const proj = this.controller.projectionTransform;

        // 3. Project 3 points to determine position, scale, and rotation
        // Points in Marker Space: Center, Right-Edge, and Down-Edge
        const pMid = this._projectToScreen(markerW / 2, markerH / 2, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);
        const pRight = this._projectToScreen(markerW / 2 + 100, markerH / 2, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);

        // 4. Calculate Screen Position
        const screenX = pMid.sx;
        const screenY = pMid.sy;

        // 5. Calculate Rotation and Scale from the projected X-axis vector
        const dx = pRight.sx - pMid.sx;
        const dy = pRight.sy - pMid.sy;

        const rotation = Math.atan2(dy, dx);
        const pixelDistance100 = Math.sqrt(dx * dx + dy * dy);

        // Since we projected 100 units, the scale for the whole markerW is:
        const finalScale = (pixelDistance100 / 100) * this.scaleMultiplier;

        // DEBUG LOGS
        if (window.AR_DEBUG) {
            console.log('--- AR POSITION DEBUG (Point Projection) ---');
            console.log('Container:', containerRect.width.toFixed(0), 'x', containerRect.height.toFixed(0));
            console.log('Video:', videoW, 'x', videoH, 'needsRotation:', needsRotation);
            console.log('Screen Pos:', screenX.toFixed(1), screenY.toFixed(1));
            console.log('Rotated Angle:', (rotation * 180 / Math.PI).toFixed(1), 'deg');
            console.log('Final Scale:', finalScale.toFixed(4));
        }

        // Apply styles to prevent CSS interference (like max-width: 100%)
        this.overlay.style.maxWidth = 'none';
        this.overlay.style.maxHeight = 'none';
        this.overlay.style.width = `${markerW}px`;
        this.overlay.style.height = 'auto'; // Maintain aspect ratio if user has a custom overlay
        this.overlay.style.position = 'absolute';
        this.overlay.style.transformOrigin = 'center center';
        this.overlay.style.display = 'block';
        this.overlay.style.margin = '0';
        this.overlay.style.left = '0';
        this.overlay.style.top = '0';

        // Apply final transform
        // We use translate to move the center of the elements to 0,0 
        // Then apply our calculated screen position
        this.overlay.style.transform = `
            translate(${screenX}px, ${screenY}px)
            translate(-50%, -50%)
            rotate(${rotation}rad)
            scale(${finalScale})
        `;
    }

    /**
     * Projects a 3D marker-space point all the way to 2D screen CSS pixels
     */
    _projectToScreen(x, y, z, mVT, proj, videoW, videoH, containerRect, needsRotation) {
        // Marker -> Camera Space
        const tx = mVT[0][0] * x + mVT[0][1] * y + mVT[0][2] * z + mVT[0][3];
        const ty = mVT[1][0] * x + mVT[1][1] * y + mVT[1][2] * z + mVT[1][3];
        const tz = mVT[2][0] * x + mVT[2][1] * y + mVT[2][2] * z + mVT[2][3];

        // Camera -> Buffer Pixels (e.g. 1280x720)
        const bx = (proj[0][0] * tx / tz) + proj[0][2];
        const by = (proj[1][1] * ty / tz) + proj[1][2];

        // Buffer -> Screen CSS Pixels
        const vW = needsRotation ? videoH : videoW;
        const vH = needsRotation ? videoW : videoH;
        const perspectiveScale = Math.max(containerRect.width / vW, containerRect.height / vH);

        const displayW = vW * perspectiveScale;
        const displayH = vH * perspectiveScale;
        const offsetX = (containerRect.width - displayW) / 2;
        const offsetY = (containerRect.height - displayH) / 2;

        let sx, sy;
        if (needsRotation) {
            // Mapping: Camera +X (Right) -> Screen +Y (Down), Camera +Y (Down) -> Screen -X (Left)
            sx = offsetX + (displayW / 2) - (by - proj[1][2]) * perspectiveScale;
            sy = offsetY + (displayH / 2) + (bx - proj[0][2]) * perspectiveScale;
        } else {
            sx = offsetX + (displayW / 2) + (bx - proj[0][2]) * perspectiveScale;
            sy = offsetY + (displayH / 2) + (by - proj[1][2]) * perspectiveScale;
        }

        return { sx, sy };
    }
}

export { SimpleAR };
