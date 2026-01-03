import { Controller } from "./controller.js";

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
    constructor({
        container,
        targetSrc,
        overlay,
        onFound = null,
        onLost = null,
        onUpdate = null,
        cameraConfig = { facingMode: 'environment', width: 1280, height: 720 },
    }) {
        this.container = container;
        this.targetSrc = targetSrc;
        this.overlay = overlay;
        this.onFound = onFound;
        this.onLost = onLost;
        this.onUpdateCallback = onUpdate;
        this.cameraConfig = cameraConfig;

        this.video = null;
        this.controller = null;
        this.isTracking = false;
        this.lastMatrix = null;
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
            this._positionOverlay(modelViewTransform, targetIndex);
            this.onUpdateCallback && this.onUpdateCallback({ targetIndex, worldMatrix });

        } else {
            // Target lost
            if (this.isTracking) {
                this.isTracking = false;
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

        // Calculate display area considering object-fit: cover
        const containerAspect = containerRect.width / containerRect.height;
        const videoAspect = videoW / videoH;

        let displayW, displayH, offsetX, offsetY;

        if (containerAspect > videoAspect) {
            displayW = containerRect.width;
            displayH = containerRect.width / videoAspect;
            offsetX = 0;
            offsetY = (containerRect.height - displayH) / 2;
        } else {
            displayH = containerRect.height;
            displayW = containerRect.height * videoAspect;
            offsetX = (containerRect.width - displayW) / 2;
            offsetY = 0;
        }

        const scaleX = displayW / videoW;
        const scaleY = displayH / videoH;

        // Project the center of the marker (markerW/2, markerH/2, 0) into camera space
        // Marker coordinates are pixels from top-left.
        const tx = mVT[0][0] * (markerW / 2) + mVT[0][1] * (markerH / 2) + mVT[0][3];
        const ty = mVT[1][0] * (markerW / 2) + mVT[1][1] * (markerH / 2) + mVT[1][3];
        const tz = mVT[2][0] * (markerW / 2) + mVT[2][1] * (markerH / 2) + mVT[2][3];

        // focal length (roughly 45 degrees FOV match Controller.js)
        const f = videoH / 2 / Math.tan((45.0 * Math.PI / 180) / 2);

        // Perspective projection to screen space
        const screenX = offsetX + (videoW / 2 + (tx * f / -tz)) * scaleX;
        const screenY = offsetY + (videoH / 2 - (ty * f / -tz)) * scaleY;

        // Use the first row of mVT to determine rotation and base scale component
        // Since marker coordinates are in pixels, mVT[0][0] and mVT[0][1] are unitless scale factors
        const rotation = Math.atan2(mVT[1][0], mVT[0][0]);
        const matrixScale = Math.sqrt(mVT[0][0] ** 2 + mVT[1][0] ** 2);

        // Perspective scale: how much larger/smaller the object is based on distance (tz)
        // Correct scale should make a marker-width sized element cover the marker.
        const perspectiveScale = (f / -tz) * scaleX;

        // The overlay element has its own width in CSS pixels (e.g. 200px)
        const overlayCSSWidth = parseFloat(this.overlay.style.width) || 200;

        // Final scale = (Target Width in Pixels on screen) / (Overlay CSS Width)
        // matrixScale is usually ~1.0 if tracking is rigid
        const finalScale = (matrixScale * markerW * perspectiveScale) / overlayCSSWidth;

        // Apply transform
        this.overlay.style.position = 'absolute';
        this.overlay.style.transformOrigin = 'center center';
        this.overlay.style.left = '0';
        this.overlay.style.top = '0';
        this.overlay.style.transform = `
      translate(${screenX}px, ${screenY}px)
      translate(-50%, -50%)
      scale(${finalScale})
      rotate(${-rotation}rad)
    `;
    }
}

export { SimpleAR };
