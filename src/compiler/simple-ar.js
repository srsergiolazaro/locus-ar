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
        await this.controller.addImageTargets(targets);
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

        const { targetIndex, worldMatrix } = data;

        if (worldMatrix) {
            // Target found
            if (!this.isTracking) {
                this.isTracking = true;
                this.overlay && (this.overlay.style.opacity = '1');
                this.onFound && this.onFound({ targetIndex });
            }

            this.lastMatrix = worldMatrix;
            this._positionOverlay(worldMatrix);
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

    _positionOverlay(worldMatrix) {
        if (!this.overlay) return;

        const containerRect = this.container.getBoundingClientRect();
        const videoW = this.video.videoWidth;
        const videoH = this.video.videoHeight;

        // Calculate display area considering object-fit: cover
        const containerAspect = containerRect.width / containerRect.height;
        const videoAspect = videoW / videoH;

        let displayW, displayH, offsetX, offsetY;

        if (containerAspect > videoAspect) {
            // Container is wider - video fills width, crops height
            displayW = containerRect.width;
            displayH = containerRect.width / videoAspect;
            offsetX = 0;
            offsetY = (containerRect.height - displayH) / 2;
        } else {
            // Container is taller - video fills height, crops width  
            displayH = containerRect.height;
            displayW = containerRect.height * videoAspect;
            offsetX = (containerRect.width - displayW) / 2;
            offsetY = 0;
        }

        const scaleX = displayW / videoW;
        const scaleY = displayH / videoH;

        // Extract position and rotation from world matrix
        // Matrix is column-major: [m0,m1,m2,m3, m4,m5,m6,m7, m8,m9,m10,m11, m12,m13,m14,m15]
        const tx = worldMatrix[12];
        const ty = worldMatrix[13];
        const tz = worldMatrix[14];

        // focal length (roughly 45 degrees FOV)
        const f = videoH / 2 / Math.tan((45.0 * Math.PI / 180) / 2);

        // Standard perspective projection to screen space
        // tx, ty, tz are in marker units relative to camera
        const screenX = offsetX + (videoW / 2 + (tx * f / -tz)) * scaleX;
        const screenY = offsetY + (videoH / 2 - (ty * f / -tz)) * scaleY;

        // Calculate rotation and scale from the matrix
        const rotation = Math.atan2(worldMatrix[1], worldMatrix[0]);
        const matrixScale = Math.sqrt(worldMatrix[0] ** 2 + worldMatrix[1] ** 2);

        // Perspective scale: how much larger/smaller the object is based on distance (tz)
        const perspectiveScale = (f / -tz) * scaleX;
        const finalScale = matrixScale * perspectiveScale;

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
