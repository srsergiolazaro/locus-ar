import { BioInspiredController } from '../src/runtime/bio-inspired-controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { projectToScreen } from '../src/core/utils/projection.js';
import { AR_CONFIG } from '../src/core/constants.js';

const ASSET_URL = './assets/test-image.png';
const WIDTH = AR_CONFIG.VIEWPORT_WIDTH;
const HEIGHT = AR_CONFIG.VIEWPORT_HEIGHT;

const simCanvas = document.getElementById('simCanvas') as HTMLCanvasElement;
const arCanvas = document.getElementById('arCanvas') as HTMLCanvasElement;
const logs = document.getElementById('logs') as HTMLElement;
const overlay = document.getElementById('overlay') as HTMLElement;
const arStatus = document.getElementById('arStatus') as HTMLElement;
const arReliability = document.getElementById('arReliability') as HTMLElement;
const arStability = document.getElementById('arStability') as HTMLElement;
const simScaleEl = document.getElementById('simScale') as HTMLElement;
const simPosEl = document.getElementById('simPos') as HTMLElement;
const arContainer = document.getElementById('ar-container') as HTMLElement;

const simCtx = simCanvas.getContext('2d')!;
const arCtx = arCanvas.getContext('2d')!;

// Pre-initialize and cache dynamic canvases
const debugCanvas = document.createElement('canvas');
debugCanvas.width = WIDTH;
debugCanvas.height = HEIGHT;
debugCanvas.style.position = 'absolute';
debugCanvas.style.top = '0';
debugCanvas.style.left = '0';
debugCanvas.style.width = '100%';
debugCanvas.style.height = '100%';
debugCanvas.style.pointerEvents = 'none';
debugCanvas.style.zIndex = '3';
arContainer.appendChild(debugCanvas);
const debugCtx = debugCanvas.getContext('2d')!;

const foveaCanvas = document.createElement('canvas');
foveaCanvas.width = WIDTH;
foveaCanvas.height = HEIGHT;
foveaCanvas.style.position = 'absolute';
foveaCanvas.style.top = '0';
foveaCanvas.style.left = '0';
foveaCanvas.style.width = '100%';
foveaCanvas.style.height = '100%';
foveaCanvas.style.pointerEvents = 'none';
foveaCanvas.style.zIndex = '2';
arContainer.appendChild(foveaCanvas);
const foveaCtx = foveaCanvas.getContext('2d')!;

// Global cache for expensive lookups
class SmoothingManager {
    history: Map<number, { x: number, y: number }[]> = new Map();
    lastFiltered: Map<number, { x: number, y: number }> = new Map();

    // Config
    medianSize = 3;
    deadZone = 0.3;

    smooth(index: number, raw: { x: number, y: number }, reliability: number) {
        // 1. Median Filter (history of 3)
        if (!this.history.has(index)) this.history.set(index, []);
        const h = this.history.get(index)!;
        h.push(raw);
        if (h.length > this.medianSize) h.shift();

        // Get median
        const sortedX = [...h].map(p => p.x).sort((a, b) => a - b);
        const sortedY = [...h].map(p => p.y).sort((a, b) => a - b);
        const median = {
            x: sortedX[Math.floor(sortedX.length / 2)],
            y: sortedY[Math.floor(sortedY.length / 2)]
        };

        // 2. Adaptive Alpha (based on reliability)
        // High reliability (1.0) -> high Alpha (snappy)
        // Low reliability (0.2) -> low Alpha (stable)
        const baseAlpha = 0.1;
        const alpha = baseAlpha + (reliability * (1.0 - baseAlpha));

        const last = this.lastFiltered.get(index) || median;

        let filteredX = last.x * (1 - alpha) + median.x * alpha;
        let filteredY = last.y * (1 - alpha) + median.y * alpha;

        // 3. Dead-zone
        if (Math.abs(filteredX - last.x) < this.deadZone) filteredX = last.x;
        if (Math.abs(filteredY - last.y) < this.deadZone) filteredY = last.y;

        const result = { x: filteredX, y: filteredY };
        this.lastFiltered.set(index, result);
        return result;
    }

    reset(index?: number) {
        if (index !== undefined) {
            this.history.delete(index);
            this.lastFiltered.delete(index);
        } else {
            this.history.clear();
            this.lastFiltered.clear();
        }
    }

    // New: Prevent memory leaks by cleaning old IDs
    prune(activeIds: Set<number>) {
        for (const id of this.history.keys()) {
            if (!activeIds.has(id) && Math.random() < 0.05) { // Probabilistic cleanup
                this.history.delete(id);
                this.lastFiltered.delete(id);
            }
        }
    }
}

const smoother = new SmoothingManager();

const logQueue: string[] = [];
function log(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    console.log(`[AR-TEST] ${msg}`);

    // Only update DOM every 500ms or for critical errors to save performance
    logQueue.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (logQueue.length > 50) logQueue.shift();

    if (type === 'error' || type === 'success' || Math.random() < 0.1) {
        logs.innerHTML = logQueue.slice().reverse().map(m => `<div>${m}</div>`).join('');
    }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

async function init() {
    log('Loading target image...');
    let targetImg: HTMLImageElement;
    try {
        targetImg = await loadImage(ASSET_URL);
        log('Target image loaded successfully', 'success');
    } catch (e) {
        log('Failed to load target image from ' + ASSET_URL, 'error');
        return;
    }

    // 1. Compile target
    log('Compiling target image (OfflineCompiler)...');
    const compiler = new OfflineCompiler();

    // Draw to temp canvas to get pixels
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetImg.width;
    tempCanvas.height = targetImg.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(targetImg, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, targetImg.width, targetImg.height);

    const startTime = performance.now();
    const compiledData = await compiler.compileImageTargets([
        {
            width: targetImg.width,
            height: targetImg.height,
            data: imageData.data
        }
    ], (p) => {
        if (Math.floor(p) % 25 === 0) log(`Compilation progress: ${Math.round(p)}%`);
    });
    const compileTime = performance.now() - startTime;
    log(`Compilation finished in ${Math.round(compileTime)}ms`, 'success');

    // Style arCanvas to be the base layer
    arCanvas.style.position = 'absolute';
    arCanvas.style.top = '0';
    arCanvas.style.left = '0';
    arCanvas.style.width = '100%';
    arCanvas.style.height = '100%';
    arCanvas.style.objectFit = 'cover';
    arCanvas.style.zIndex = '1';

    // 2. Export and Setup Controller
    const buffer = compiler.exportData();
    log(`Exported data size: ${Math.round(buffer.byteLength / 1024)}KB`);

    const controller = new BioInspiredController({
        inputWidth: WIDTH,
        inputHeight: HEIGHT,
        debugMode: true,
        bioInspired: {
            enabled: true,
            aggressiveSkipping: false // Keeping it realistic for motion
        },
        onUpdate: (data) => handleARUpdate(data, targetImg.width, targetImg.height, controller)
    });

    // We must slice the buffer to avoid passing trailing bytes from MsgPack encoding
    const cleanBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    await controller.addImageTargetsFromBuffer(cleanBuffer);
    log('Controller initialized with compiled targets', 'success');

    // 3. Simulation Variables
    let angle = 0;
    let scale = 0.5;
    let posX = WIDTH / 2;
    let posY = HEIGHT / 2;
    let targetMarkerWidth = targetImg.width;
    let targetMarkerHeight = targetImg.height;

    // Simulation Loop
    function step() {
        angle += 0.015;
        scale = 0.4 + Math.sin(angle * 0.3) * 0.2;
        posX = WIDTH / 2 + Math.cos(angle * 0.5) * 110;
        posY = HEIGHT / 2 + Math.sin(angle * 0.4) * 70;

        // Blur frequency is different (0.1 vs 0.3/0.5/0.4)
        const blurAmount = Math.max(0, Math.sin(angle * 0.1) * 3);

        // Draw Simulation (Ground Truth)
        simCtx.fillStyle = '#222';
        simCtx.fillRect(0, 0, WIDTH, HEIGHT);

        simCtx.save();
        // Apply blur only if significant to save processing
        if (blurAmount > 0.3) {
            simCtx.filter = `blur(${blurAmount}px)`;
        }

        simCtx.translate(posX, posY);
        simCtx.scale(scale, scale);
        simCtx.drawImage(targetImg, -targetImg.width / 2, -targetImg.height / 2);
        simCtx.restore();
        simCtx.filter = 'none'; // Reset filter for next operations

        // UI Updates
        simScaleEl.textContent = scale.toFixed(2);
        simPosEl.textContent = `${Math.round(posX)}, ${Math.round(posY)}`;

        // Draw for AR Engine (what it "sees")
        arCtx.drawImage(simCanvas, 0, 0);

        // Note: Controller.processVideo(arCanvas) is already running and polling arCanvas

        requestAnimationFrame(step);
    }

    // Start Controller processing (it will poll the canvas)
    controller.processVideo(arCanvas);

    step();
}

function handleARUpdate(data: any, markerW: number, markerH: number, controller: BioInspiredController) {
    if (data.type === 'processDone') return;

    if (data.type === 'featurePoints') {
        const { featurePoints } = data;
        if (featurePoints) {
            drawFeaturePoints(featurePoints);
            // Log point count every few frames to avoid flood
            if (Math.random() < 0.05) {
                log(`FEAT: Detected ${featurePoints.length} points`);
            }
        }
    }

    if (data.type === 'updateMatrix') {
        const { targetIndex, worldMatrix, modelViewTransform, reliabilities, stabilities, screenCoords, deformedMesh } = data;

        // Central clear for debug canvas is now handled in drawPoints/drawFeaturePoints
        // using the cached debugCtx

        /*
        if (deformedMesh) {
            drawMesh(deformedMesh);
        }
        */

        // Limit smoothing history and prune old points to save memory
        const activeIds = new Set<number>((screenCoords || []).map((p: any) => p.id));
        smoother.prune(activeIds);

        let smoothedCoords = screenCoords || [];
        if (screenCoords && screenCoords.length > 0) {
            smoothedCoords = screenCoords.map((p: any) => {
                const rel = reliabilities ? reliabilities[p.id] || 0.5 : 0.5;
                const smoothed = smoother.smooth(p.id, p, rel);
                return { ...smoothed, id: p.id };
            });
        }

        if (worldMatrix) {
            arStatus.textContent = 'Tracking';
            arStatus.className = 'status-tag status-tracking';
            overlay.style.display = 'block';

            // Reliability metrics
            const avgReliability = reliabilities && reliabilities.length > 0
                ? reliabilities.reduce((a: number, b: number) => a + b, 0) / reliabilities.length
                : 0;
            const avgStability = stabilities && stabilities.length > 0
                ? stabilities.reduce((a: number, b: number) => a + b, 0) / stabilities.length
                : 0;

            arReliability.textContent = avgReliability.toFixed(2);
            arStability.textContent = avgStability.toFixed(2);

            if (avgReliability < 0.5) {
                arReliability.style.color = '#f44';
            } else {
                arReliability.style.color = '#10b981';
            }

            // Pose Verification Log (Reality vs AR)
            const f = (controller as any).projectionTransform[0][0];
            const tz = modelViewTransform[2][3];
            if (Math.random() < 0.01) {
                const estScale = (f / tz);
                const simScale = parseFloat(simScaleEl.textContent || "0");
                const savings = data.pixelsSaved !== undefined
                    ? ((data.pixelsSaved / (WIDTH * HEIGHT)) * 100).toFixed(1)
                    : "0.0";
                log(`TRACK: Scale:${estScale.toFixed(3)} (ideal:${simScale.toFixed(3)}) | Savings: ${savings}% pixels`);
            }

            // Show fovea if available
            if (data.foveaCenter) {
                drawFovea(data.foveaCenter);
            }

            // Position Overlay (SimpleAR logic)
            positionOverlay(modelViewTransform, markerW, markerH, controller);
        } else {
            arStatus.textContent = 'Searching';
            arStatus.className = 'status-tag status-searching';
            overlay.style.display = 'none';
            arReliability.textContent = '0.00';
            arStability.textContent = '0.00';

            // Explicitly clear debug canvas when searching
            debugCtx.clearRect(0, 0, WIDTH, HEIGHT);

            // Log why we are searching (debugExtra might have info)
            if (Math.random() < 0.02) {
                log(`SEARCH: No target matched. Points detected: ${screenCoords?.length || 0}`);
            }
        }

        // DRAW POINTS
        if (smoothedCoords.length > 0) {
            drawPoints(smoothedCoords, stabilities || []);
        } else {
            // Clear debug canvas if no points
            debugCtx.clearRect(0, 0, WIDTH, HEIGHT);
        }
    }
}

function drawFeaturePoints(points: any[]) {
    // Only draw feature points if we ARE NOT tracking
    if (arStatus.textContent === 'Searching') {
        debugCtx.clearRect(0, 0, WIDTH, HEIGHT);
        debugCtx.fillStyle = 'rgba(255, 255, 0, 0.6)';
        const limit = Math.min(points.length, 150);

        for (let i = 0; i < limit; i++) {
            const p = points[i];
            debugCtx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
    }
}

function drawMesh(mesh: { vertices: Float32Array, triangles: Uint16Array }) {
    let debugCanvas = document.getElementById('debugCanvas') as HTMLCanvasElement;
    if (!debugCanvas) return;
    const ctx = debugCanvas.getContext('2d')!;

    // Fill triangles for better visibility
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;

    const { vertices: v, triangles: t } = mesh;
    for (let i = 0; i < t.length; i += 3) {
        const i1 = t[i], i2 = t[i + 1], i3 = t[i + 2];
        ctx.beginPath();
        ctx.moveTo(v[i1 * 2], v[i1 * 2 + 1]);
        ctx.lineTo(v[i2 * 2], v[i2 * 2 + 1]);
        ctx.lineTo(v[i3 * 2], v[i3 * 2 + 1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

function drawPoints(coords: { x: number, y: number }[], stabilities: number[]) {
    debugCtx.clearRect(0, 0, WIDTH, HEIGHT);

    const limit = Math.min(coords.length, 100);

    for (let i = 0; i < limit; i++) {
        const p = coords[i] as any;
        const s = stabilities[i] || 0;

        const size = s > 0.8 ? 3 : 2;
        debugCtx.fillStyle = `rgba(0, 255, 0, ${0.2 + s * 0.8})`;
        debugCtx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
}

function drawFovea(center: { x: number, y: number }) {
    foveaCtx.clearRect(0, 0, WIDTH, HEIGHT);
    foveaCtx.beginPath();
    foveaCtx.arc(center.x, center.y, 40, 0, Math.PI * 2);
    foveaCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    foveaCtx.setLineDash([5, 5]);
    foveaCtx.stroke();
    foveaCtx.setLineDash([]);
}

function positionOverlay(mVT: number[][], markerW: number, markerH: number, controller: BioInspiredController) {
    const proj = controller.projectionTransform;
    const containerRect = arContainer.getBoundingClientRect();

    // Get corners in screen space
    const pUL = projectToScreen(0, 0, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);
    const pUR = projectToScreen(markerW, 0, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);
    const pLL = projectToScreen(0, markerH, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);
    const pLR = projectToScreen(markerW, markerH, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);

    // Homography solver from SimpleAR
    const solveHomography = (w: number, h: number, p1: any, p2: any, p3: any, p4: any) => {
        const x1 = p1.sx, y1 = p1.sy;
        const x2 = p2.sx, y2 = p2.sy;
        const x3 = p3.sx, y3 = p3.sy;
        const x4 = p4.sx, y4 = p4.sy;

        const dx1 = x2 - x4, dx2 = x3 - x4, dx3 = x1 - x2 + x4 - x3;
        const dy1 = y2 - y4, dy2 = y3 - y4, dy3 = y1 - y2 + y4 - y3;

        let a, b, c, d, e, f, g, h_coeff;

        const det = dx1 * dy2 - dx2 * dy1;
        g = (dx3 * dy2 - dx2 * dy3) / det;
        h_coeff = (dx1 * dy3 - dx3 * dy1) / det;
        a = x2 - x1 + g * x2;
        b = x3 - x1 + h_coeff * x3;
        c = x1;
        d = y2 - y1 + g * y2;
        e = y3 - y1 + h_coeff * y3;
        f = y1;

        return [
            a / w, d / w, 0, g / w,
            b / h, e / h, 0, h_coeff / h,
            0, 0, 1, 0,
            c, f, 0, 1
        ];
    };

    const matrix = solveHomography(markerW, markerH, pUL, pUR, pLL, pLR);

    // 🕵️ Debug Log for Overlay
    if (Math.random() < 0.01) {
        console.log("OVERLAY_DEBUG:", {
            corners: { pUL, pUR, pLL, pLR },
            matrix: matrix.map(v => v.toFixed(2)).join(','),
            containerSize: { w: containerRect.width, h: containerRect.height }
        });
    }

    overlay.style.width = `${markerW}px`;
    overlay.style.height = `${markerH}px`;
    overlay.style.transformOrigin = '0 0';
    overlay.style.transform = `matrix3d(${matrix.join(',')})`;
    overlay.style.border = '2px solid #00ffff'; // Force visibility
    overlay.style.display = 'block';
}

init();
