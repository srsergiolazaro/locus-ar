import { Controller } from '../src/runtime/controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { projectToScreen } from '../src/core/utils/projection.js';

const ASSET_URL = './assets/test-image.png';
const WIDTH = 640;
const HEIGHT = 480;

const simCanvas = document.getElementById('simCanvas') as HTMLCanvasElement;
const arCanvas = document.getElementById('arCanvas') as HTMLCanvasElement;
const logs = document.getElementById('logs') as HTMLElement;
const overlay = document.getElementById('overlay') as HTMLElement;
const arStatus = document.getElementById('arStatus') as HTMLElement;
const arReliability = document.getElementById('arReliability') as HTMLElement;
const arStability = document.getElementById('arStability') as HTMLElement;
const simScaleEl = document.getElementById('simScale') as HTMLElement;
const simPosEl = document.getElementById('simPos') as HTMLElement;

const simCtx = simCanvas.getContext('2d')!;
const arCtx = arCanvas.getContext('2d')!;

// --- Smoothing Manager ---
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
}

const smoother = new SmoothingManager();

function log(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logs.prepend(div);
    console.log(`[AR-TEST] ${msg}`);
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

    const controller = new Controller({
        inputWidth: WIDTH,
        inputHeight: HEIGHT,
        debugMode: true,
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
        angle += 0.01;
        scale = 0.25 + Math.sin(angle * 0.3) * 0.23; // Pulse scale between 0.02 and 0.48
        posX = WIDTH / 2 + Math.cos(angle * 0.7) * 80;
        posY = HEIGHT / 2 + Math.sin(angle * 0.5) * 50;

        // Draw Simulation (Ground Truth)
        simCtx.fillStyle = '#222'; // Slightly lighter background
        simCtx.fillRect(0, 0, WIDTH, HEIGHT);

        simCtx.save();
        simCtx.translate(posX, posY);
        simCtx.scale(scale, scale);
        // Draw image centered
        simCtx.drawImage(targetImg, -targetImg.width / 2, -targetImg.height / 2);
        simCtx.restore();

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

function handleARUpdate(data: any, markerW: number, markerH: number, controller: Controller) {
    if (data.type === 'processDone') return;

    if (data.type === 'featurePoints') {
        const { featurePoints } = data;
        if (featurePoints) {
            drawFeaturePoints(featurePoints);
        }
    }

    if (data.type === 'updateMatrix') {
        const { targetIndex, worldMatrix, modelViewTransform, reliabilities, stabilities, screenCoords, deformedMesh } = data;

        // Central clear for debug canvas
        const debugCanvas = document.getElementById('debugCanvas') as HTMLCanvasElement;
        if (debugCanvas) {
            const ctx = debugCanvas.getContext('2d')!;
            ctx.clearRect(0, 0, WIDTH, HEIGHT);
        }

        if (deformedMesh) {
            drawMesh(deformedMesh);
        }

        // Smooth points regardless of tracking status (they show up when asoma)
        let smoothedCoords = screenCoords || [];
        if (screenCoords && screenCoords.length > 0) {
            smoothedCoords = screenCoords.map((p: any) => {
                const rel = reliabilities ? reliabilities[p.id] || 0.5 : 0.5;
                const smoothed = smoother.smooth(p.id, p, rel);
                return { ...smoothed, id: p.id }; // Re-inject ID
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
            const f = controller.projectionTransform[0][0];
            const tz = modelViewTransform[2][3];
            const estScale = (f / tz);

            if (Math.random() < 0.02) {
                log(`VERIFICATION: SimScale: ${simScaleEl.textContent} | EstScale: ${estScale.toFixed(2)} | Rel: ${avgReliability.toFixed(2)}`);
            }

            // Position Overlay (SimpleAR logic)
            positionOverlay(modelViewTransform, markerW, markerH, controller);
        } else {
            arStatus.textContent = 'Searching';
            arStatus.className = 'status-tag status-searching';
            overlay.style.display = 'none';
            arReliability.textContent = '0.00';
            arStability.textContent = '0.00';
            // We don't reset all history immediately to allow for short "flickers"
            // but if we want to be clean:
            // smoother.reset(); 
        }

        // DRAW POINTS
        if (smoothedCoords.length > 0) {
            drawPoints(smoothedCoords, stabilities || []);
        } else {
            // Clear debug canvas if no points
            const debugCanvas = document.getElementById('debugCanvas') as HTMLCanvasElement;
            if (debugCanvas) {
                const ctx = debugCanvas.getContext('2d')!;
                ctx.clearRect(0, 0, WIDTH, HEIGHT);
            }
        }
    }
}

function drawFeaturePoints(points: any[]) {
    let debugCanvas = document.getElementById('debugCanvas') as HTMLCanvasElement;
    if (!debugCanvas) {
        debugCanvas = document.createElement('canvas');
        debugCanvas.id = 'debugCanvas';
        debugCanvas.width = WIDTH;
        debugCanvas.height = HEIGHT;
        debugCanvas.style.position = 'absolute';
        debugCanvas.style.top = '0';
        debugCanvas.style.left = '0';
        debugCanvas.style.width = '100%';
        debugCanvas.style.height = '100%';
        debugCanvas.style.objectFit = 'cover';
        debugCanvas.style.pointerEvents = 'none';
        debugCanvas.style.zIndex = '3';
        arCanvas.parentElement!.appendChild(debugCanvas);
    }
    const ctx = debugCanvas.getContext('2d')!;
    // Only clear if we are NOT tracking (tracking draws its own points)
    if (arStatus.textContent === 'Searching') {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        for (const p of points) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Yellow for searching
            ctx.fill();
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
    // Draw on top of arCanvas (which already has the image)
    // Actually, we should draw on a separate layer or just clear and redraw
    // To keep it simple, we'll draw directly on arCtx AFTER the controller has seen the frame
    // But wait, step() draws the image. If we draw points here, they will be overwritten by next step()
    // Better: let's draw them in a separate debug canvas overlay
    let debugCanvas = document.getElementById('debugCanvas') as HTMLCanvasElement;
    if (!debugCanvas) {
        debugCanvas = document.createElement('canvas');
        debugCanvas.id = 'debugCanvas';
        debugCanvas.width = WIDTH;
        debugCanvas.height = HEIGHT;
        debugCanvas.style.position = 'absolute';
        debugCanvas.style.top = '0';
        debugCanvas.style.left = '0';
        debugCanvas.style.width = '100%';
        debugCanvas.style.height = '100%';
        debugCanvas.style.objectFit = 'cover';
        debugCanvas.style.pointerEvents = 'none';
        debugCanvas.style.zIndex = '3'; // Below overlay (10), above arCanvas (1)
        arCanvas.parentElement!.appendChild(debugCanvas);
    }
    const ctx = debugCanvas.getContext('2d')!;

    for (let i = 0; i < coords.length; i++) {
        const p = coords[i] as any;
        const s = stabilities[i] || 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        // Intensity purely based on stability
        ctx.fillStyle = `rgba(0, 255, 0, ${0.1 + s * 0.9})`;
        ctx.fill();

        if (s > 0.8) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw ID for debug
        if (p.id !== undefined) {
            ctx.fillStyle = '#fff';
            ctx.font = '8px Arial';
            ctx.fillText(p.id.toString(), p.x + 4, p.y - 4);
        }
    }
}

function positionOverlay(mVT: number[][], markerW: number, markerH: number, controller: Controller) {
    const proj = controller.projectionTransform;
    const container = document.getElementById('ar-container')!;
    const containerRect = container.getBoundingClientRect();

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

    overlay.style.width = `${markerW}px`;
    overlay.style.height = `${markerH}px`;
    overlay.style.transformOrigin = '0 0';
    overlay.style.transform = `matrix3d(${matrix.join(',')})`;
}

init();
