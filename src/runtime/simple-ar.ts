import { Controller } from "./controller.js";
import { OneEuroFilter } from "../libs/one-euro-filter.js";
import { projectToScreen } from "../core/utils/projection.js";

/**
 * 🍦 SimpleAR - Dead-simple vanilla AR for image overlays
 */

export interface SimpleAROptions {
    container: HTMLElement;
    targetSrc: string | string[];
    overlay: HTMLElement;
    scale?: number;
    onFound?: ((data: { targetIndex: number }) => void | Promise<void>) | null;
    onLost?: ((data: { targetIndex: number }) => void | Promise<void>) | null;
    onUpdate?: ((data: {
        targetIndex: number,
        worldMatrix: number[],
        screenCoords?: { x: number, y: number }[],
        reliabilities?: number[],
        stabilities?: number[],
        detectionPoints?: { x: number, y: number }[]
    }) => void) | null;
    cameraConfig?: MediaStreamConstraints['video'];
    debug?: boolean;
}

class SimpleAR {
    container: HTMLElement;
    targetSrc: string | string[];
    overlay: HTMLElement;
    scaleMultiplier: number;
    onFound: ((data: { targetIndex: number }) => void | Promise<void>) | null;
    onLost: ((data: { targetIndex: number }) => void | Promise<void>) | null;
    onUpdateCallback: ((data: {
        targetIndex: number,
        worldMatrix: number[],
        screenCoords?: { x: number, y: number }[],
        reliabilities?: number[],
        stabilities?: number[],
        detectionPoints?: { x: number, y: number }[]
    }) => void) | null;
    cameraConfig: MediaStreamConstraints['video'];
    debug: boolean;

    lastTime: number;
    frameCount: number;
    fps: number;
    debugPanel: HTMLElement | null = null;
    video: HTMLVideoElement | null = null;
    controller: Controller | null = null;
    isTracking: boolean = false;
    lastMatrix: number[] | null = null;
    filters: OneEuroFilter[] = [];
    markerDimensions: number[][] = [];

    constructor({
        container,
        targetSrc,
        overlay,
        scale = 1.0,
        onFound = null,
        onLost = null,
        onUpdate = null,
        cameraConfig = { facingMode: 'environment', width: 1280, height: 720 },
        debug = false,
    }: SimpleAROptions) {
        this.container = container;
        this.targetSrc = targetSrc;
        this.overlay = overlay;
        this.scaleMultiplier = scale;
        this.onFound = onFound;
        this.onLost = onLost;
        this.onUpdateCallback = onUpdate;
        this.cameraConfig = cameraConfig;
        this.debug = debug;
        // @ts-ignore
        if (this.debug) window.AR_DEBUG = true;

        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
    }

    async start() {
        this._createVideo();
        await this._startCamera();
        this._initController();

        if (this.debug) this._createDebugPanel();

        const targets = Array.isArray(this.targetSrc) ? this.targetSrc : [this.targetSrc];
        const result = await this.controller!.addImageTargets(targets);
        this.markerDimensions = result.dimensions;
        console.log("Targets loaded. Dimensions:", this.markerDimensions);

        this.controller!.processVideo(this.video);
        return this;
    }

    stop() {
        if (this.controller) {
            this.controller.dispose();
            this.controller = null;
        }
        if (this.video && this.video.srcObject) {
            (this.video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
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
        this.video!.srcObject = stream;
        await this.video!.play();

        await new Promise<void>(resolve => {
            if (this.video!.videoWidth > 0) return resolve();
            this.video!.onloadedmetadata = () => resolve();
        });
    }

    _initController() {
        this.controller = new Controller({
            inputWidth: this.video!.videoWidth,
            inputHeight: this.video!.videoHeight,
            debugMode: this.debug,
            warmupTolerance: 3, // 🚀 Faster lock than default
            missTolerance: 10,   // 🛡️ More resilient to temporary occlusion
            onUpdate: (data) => this._handleUpdate(data)
        });
    }

    _handleUpdate(data: any) {
        if (data.type !== 'updateMatrix') return;

        const now = performance.now();
        this.frameCount++;
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
            if (this.debug) this._updateDebugPanel(this.isTracking);
        }

        const { targetIndex, worldMatrix, modelViewTransform, screenCoords, reliabilities, stabilities, detectionPoints } = data;

        // Project points to screen coordinates
        let projectedPoints = [];
        if (screenCoords && screenCoords.length > 0) {
            const containerRect = this.container.getBoundingClientRect();
            const videoW = this.video!.videoWidth;
            const videoH = this.video!.videoHeight;
            const isPortrait = containerRect.height > containerRect.width;
            const isVideoLandscape = videoW > videoH;
            const needsRotation = isPortrait && isVideoLandscape;
            const proj = this.controller!.projectionTransform;

            const vW = needsRotation ? videoH : videoW;
            const vH = needsRotation ? videoW : videoH;
            const pScale = Math.max(containerRect.width / vW, containerRect.height / vH);
            const dW = vW * pScale;
            const dH = vH * pScale;
            const oX = (containerRect.width - dW) / 2;
            const oY = (containerRect.height - dH) / 2;

            projectedPoints = screenCoords.map((p: any) => {
                let sx, sy;
                if (needsRotation) {
                    sx = oX + (dW / 2) - (p.y - proj[1][2]) * pScale;
                    sy = oY + (dH / 2) + (p.x - proj[0][2]) * pScale;
                } else {
                    sx = oX + (dW / 2) + (p.x - proj[0][2]) * pScale;
                    sy = oY + (dH / 2) + (p.y - proj[1][2]) * pScale;
                }
                return { x: sx, y: sy };
            });
        }

        let projectedDetectionPoints = [];
        if (detectionPoints && detectionPoints.length > 0) {
            const containerRect = this.container.getBoundingClientRect();
            const videoW = this.video!.videoWidth;
            const videoH = this.video!.videoHeight;
            const isPortrait = containerRect.height > containerRect.width;
            const isVideoLandscape = videoW > videoH;
            const needsRotation = isPortrait && isVideoLandscape;
            const proj = this.controller!.projectionTransform;

            const vW = needsRotation ? videoH : videoW;
            const vH = needsRotation ? videoW : videoH;
            const pScale = Math.max(containerRect.width / vW, containerRect.height / vH);
            const dW = vW * pScale;
            const dH = vH * pScale;
            const oX = (containerRect.width - dW) / 2;
            const oY = (containerRect.height - dH) / 2;

            projectedDetectionPoints = detectionPoints.map((p: any) => {
                let sx, sy;
                if (needsRotation) {
                    sx = oX + (dW / 2) - (p.y - proj[1][2]) * pScale;
                    sy = oY + (dH / 2) + (p.x - proj[0][2]) * pScale;
                } else {
                    sx = oX + (dW / 2) + (p.x - proj[0][2]) * pScale;
                    sy = oY + (dH / 2) + (p.y - proj[1][2]) * pScale;
                }
                return { x: sx, y: sy };
            });
        }

        if (worldMatrix) {
            if (!this.isTracking) {
                this.isTracking = true;
                this.overlay && (this.overlay.style.opacity = '1');
                this.onFound && this.onFound({ targetIndex });
            }

            this.lastMatrix = worldMatrix;
            this._positionOverlay(modelViewTransform, targetIndex);
        } else {
            if (this.isTracking) {
                this.isTracking = false;
                this.overlay && (this.overlay.style.opacity = '0');
                this.onLost && this.onLost({ targetIndex });
            }
        }

        // Always notify the callback if we have points, or if we just lost tracking
        if (projectedPoints.length > 0 || projectedDetectionPoints.length > 0 || (worldMatrix === null && data.type === 'updateMatrix')) {
            this.onUpdateCallback && this.onUpdateCallback({
                targetIndex,
                worldMatrix,
                screenCoords: projectedPoints,
                reliabilities: reliabilities || [],
                stabilities: stabilities || [],
                detectionPoints: projectedDetectionPoints
            });
        }
    }

    _positionOverlay(mVT: number[][], targetIndex: number) {
        if (!this.overlay || !this.markerDimensions[targetIndex]) return;

        const [markerW, markerH] = this.markerDimensions[targetIndex];
        const containerRect = this.container.getBoundingClientRect();
        const videoW = this.video!.videoWidth;
        const videoH = this.video!.videoHeight;

        const isPortrait = containerRect.height > containerRect.width;
        const isVideoLandscape = videoW > videoH;
        const needsRotation = isPortrait && isVideoLandscape;

        const proj = this.controller!.projectionTransform;

        const pUL = projectToScreen(0, 0, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);
        const pUR = projectToScreen(markerW, 0, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);
        const pLL = projectToScreen(0, markerH, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);
        const pLR = projectToScreen(markerW, markerH, 0, mVT, proj, videoW, videoH, containerRect, needsRotation);

        const solveHomography = (w: number, h: number, p1: any, p2: any, p3: any, p4: any) => {
            const x1 = p1.sx, y1 = p1.sy;
            const x2 = p2.sx, y2 = p2.sy;
            const x3 = p3.sx, y3 = p3.sy;
            const x4 = p4.sx, y4 = p4.sy;

            const dx1 = x2 - x4, dx2 = x3 - x4, dx3 = x1 - x2 + x4 - x3;
            const dy1 = y2 - y4, dy2 = y3 - y4, dy3 = y1 - y2 + y4 - y3;

            let a, b, c, d, e, f, g, h_coeff;

            if (dx3 === 0 && dy3 === 0) {
                a = x2 - x1; b = x3 - x1; c = x1;
                d = y2 - y1; e = y3 - y1; f = y1;
                g = 0; h_coeff = 0;
            } else {
                const det = dx1 * dy2 - dx2 * dy1;
                g = (dx3 * dy2 - dx2 * dy3) / det;
                h_coeff = (dx1 * dy3 - dx3 * dy1) / det;
                a = x2 - x1 + g * x2;
                b = x3 - x1 + h_coeff * x3;
                c = x1;
                d = y2 - y1 + g * y2;
                e = y3 - y1 + h_coeff * y3;
                f = y1;
            }
            return [
                a / w, d / w, 0, g / w,
                b / h, e / h, 0, h_coeff / h,
                0, 0, 1, 0,
                c, f, 0, 1
            ];
        };

        const matrix = solveHomography(markerW, markerH, pUL, pUR, pLL, pLR);

        this.overlay.style.maxWidth = 'none';
        this.overlay.style.width = `${markerW}px`;
        this.overlay.style.height = `${markerH}px`;
        this.overlay.style.position = 'absolute';
        this.overlay.style.transformOrigin = '0 0';
        this.overlay.style.left = '0';
        this.overlay.style.top = '0';
        this.overlay.style.display = 'block';

        this.overlay.style.transform = `
            matrix3d(${matrix.join(',')})
            translate(${markerW / 2}px, ${markerH / 2}px)
            scale(${this.scaleMultiplier})
            translate(${-markerW / 2}px, ${-markerH / 2}px)
        `;
    }

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

    _updateDebugPanel(isTracking: boolean) {
        if (!this.debugPanel) return;
        // @ts-ignore
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
