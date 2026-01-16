console.log('[AR] Script demo2-app.ts iniciado');
import { BioInspiredController } from '../src/runtime/bio-inspired-controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { projectToScreen } from '../src/core/utils/projection.js';
import { AR_CONFIG } from '../src/core/constants.js';

const WIDTH = AR_CONFIG.VIEWPORT_WIDTH;
const HEIGHT = AR_CONFIG.VIEWPORT_HEIGHT;

const video = document.getElementById('video') as HTMLVideoElement;
const arCanvas = document.getElementById('arCanvas') as HTMLCanvasElement;
const debugCanvas = document.getElementById('debugCanvas') as HTMLCanvasElement;
const arCtx = arCanvas.getContext('2d')!;
const debugCtx = debugCanvas.getContext('2d')!;
const btnCapture = document.getElementById('btn-capture') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const scanLine = document.getElementById('scan-line')!;
const overlayImg = document.getElementById('overlay-img') as HTMLImageElement;
const capturePreview = document.getElementById('capture-preview') as HTMLImageElement;
const arContainer = document.getElementById('ar-container')!;
const ttsInput = document.getElementById('tts-input') as HTMLInputElement;

let lastSpokenText = '';
let lastSpeakTime = 0;
let lastDetectedTime: number | null = null;
let currentDetectedText: string | null = null;

/*
// stats.js integration
let stats: any = null;
try {
    if ((window as any).Stats) {
        stats = new (window as any).Stats();
        stats.showPanel(0);
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '20px';
        stats.dom.style.right = '20px';
        stats.dom.style.left = 'auto';
        stats.dom.style.zIndex = '10000';
        document.body.appendChild(stats.dom);
        console.log('[AR] stats.js inicializado correctamente');
    } else {
        console.warn('[AR] stats.js no encontrado en window');
    }
} catch (e) {
    console.error('[AR] Error inicializando stats.js:', e);
}
*/
let stats: any = null;

// Initialize canvas sizes
arCanvas.width = WIDTH;
arCanvas.height = HEIGHT;

let controller: BioInspiredController | null = null;
let captureCanvas: HTMLCanvasElement | null = null;
let isTesting = false;

function log(msg: string) {
    // Silenced for a cleaner UI
    console.log(`[AR LOG] ${msg}`);
}

const instructionText = document.getElementById('instruction-text')!;

video.onloadedmetadata = () => {
    log(`Cámara: ${video.videoWidth}x${video.videoHeight}`);

    // Adjust debug canvas to match container's physical size for high-res drawing
    const dpr = window.devicePixelRatio || 1;
    const rect = arContainer.getBoundingClientRect();
    debugCanvas.width = rect.width * dpr;
    debugCanvas.height = rect.height * dpr;

    // Direct transition to capture-ready state
    btnCapture.style.display = 'block'; // Ensure capture button is visible
    btnCapture.classList.add('btn-pulse'); // Add pulse animation
    scanLine.style.display = 'block'; // Show scan line
    instructionText.textContent = 'Paso 1: Enmarca el objeto y haz clic en "Capturar"';
};

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        video.srcObject = stream;
        log('Cámara iniciada correctamente.');
    } catch (err) {
        log('Error al acceder a la cámara: ' + err);
    }
}

function drawVideoToCanvas(ctx: CanvasRenderingContext2D, videoElement: HTMLVideoElement, targetWidth: number, targetHeight: number) {
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    const videoRatio = videoWidth / videoHeight;
    const targetRatio = targetWidth / targetHeight;

    let sx, sy, sw, sh;

    if (videoRatio > targetRatio) {
        // Video is wider than canvas (landscape vs portrait-ish)
        sh = videoHeight;
        sw = sh * targetRatio;
        sx = (videoWidth - sw) / 2;
        sy = 0;
    } else {
        // Video is taller than canvas (portrait vs landscape-ish)
        sw = videoWidth;
        sh = sw / targetRatio;
        sx = 0;
        sy = (videoHeight - sh) / 2;
    }

    ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}

btnCapture.onclick = async () => {
    btnCapture.disabled = true;
    btnCapture.classList.remove('btn-pulse');
    instructionText.textContent = 'Procesando imagen... un momento';
    log('Capturando frame...');

    // Capture current frame with aspect ratio fix
    captureCanvas = document.createElement('canvas');
    captureCanvas.width = WIDTH;
    captureCanvas.height = HEIGHT;
    const ctx = captureCanvas.getContext('2d')!;

    drawVideoToCanvas(ctx, video, WIDTH, HEIGHT);

    // Show preview
    capturePreview.src = captureCanvas.toDataURL();
    capturePreview.style.display = 'block';

    log('Compilando target al vuelo...');
    const compiler = new OfflineCompiler();

    try {
        const compiledData = await compiler.compileImageTargets([
            {
                width: WIDTH,
                height: HEIGHT,
                data: ctx.getImageData(0, 0, WIDTH, HEIGHT).data
            }
        ], (p) => {
            if (Math.round(p) % 20 === 0) log(`Progreso: ${Math.round(p)}%`);
        });

        const buffer = compiler.exportData();
        const cleanBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        controller = new BioInspiredController({
            inputWidth: WIDTH,
            inputHeight: HEIGHT,
            debugMode: true,
            bioInspired: { enabled: true, aggressiveSkipping: false },
            onUpdate: (data) => handleARUpdate(data, WIDTH, HEIGHT)
        });

        await controller.addImageTargetsFromBuffer(cleanBuffer);

        log('Target registrado con éxito. Iniciando tracking automáticamente.');
        btnCapture.style.display = 'none';
        btnReset.style.display = 'block';
        scanLine.style.display = 'none';
        instructionText.style.opacity = '0';

        isTesting = true;
        overlayImg.style.display = 'block';
        startProcessingLoop();

    } catch (e) {
        log('Error en compilación: ' + e);
        btnCapture.disabled = false;
        instructionText.textContent = 'Error. Intenta capturar de nuevo.';
    }
};
function startProcessingLoop() {
    if (!controller || !isTesting) return;

    function processFrame() {
        if (!isTesting) return;
        drawVideoToCanvas(arCtx, video, WIDTH, HEIGHT);
        requestAnimationFrame(processFrame);
    }

    if (controller) {
        controller.processVideo(arCanvas);
        processFrame();
    }
}

btnReset.onclick = () => {
    location.reload();
};

function handleARUpdate(data: any, markerW: number, markerH: number) {
    // Treat processDone or updateMatrix as a "frame completed" for Stats
    if (stats && (data.type === 'processDone' || data.type === 'updateMatrix')) {
        stats.update();
    }

    if (data.type === 'processDone') return;

    const dpr = window.devicePixelRatio || 1;
    const scaleX = debugCanvas.width / WIDTH;
    const scaleY = debugCanvas.height / HEIGHT;

    // Clear debug canvas
    if (data.type === 'featurePoints' || data.type === 'updateMatrix') {
        debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    }

    if (data.type === 'featurePoints') {
        const { featurePoints } = data;
        if (featurePoints && !isTesting) {
            drawFeaturePoints(featurePoints, scaleX, scaleY);
        }
    }

    if (data.type === 'updateMatrix') {
        const { worldMatrix, modelViewTransform, screenCoords } = data;

        if (screenCoords && screenCoords.length > 0) {
            drawTrackingPoints(screenCoords, scaleX, scaleY);
        }

        if (worldMatrix && isTesting) {
            positionOverlay(modelViewTransform, markerW, markerH);
            
            // Persistent detection check
            const text = ttsInput.value;
            if (lastDetectedTime === null) {
                lastDetectedTime = Date.now();
                currentDetectedText = text;
            }

            if (Date.now() - lastDetectedTime >= 1000 && currentDetectedText === text) { // Check if text is same
                // Trigger TTS
                if (text) {
                    triggerTTS(text);
                }
            }

        } else {
            // Reset detection time if not detected
            lastDetectedTime = null;
            currentDetectedText = null;
            if (isTesting) {
                overlayImg.style.display = 'none';
            }
        }
    }
}

function triggerTTS(text: string) {
    const now = Date.now();
    // Debounce: Don't speak same text within 5 seconds
    if (text === lastSpokenText && now - lastSpeakTime < 5000) {
        return;
    }
    // Don't speak different text too fast (2 sec min gap)
    if (now - lastSpeakTime < 2000) {
        return;
    }

    lastSpokenText = text;
    lastSpeakTime = now;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; 
    window.speechSynthesis.speak(utterance);
}

function drawFeaturePoints(points: any[], sx: number, sy: number) {
    debugCtx.fillStyle = 'rgba(255, 255, 0, 0.6)';
    const limit = Math.min(points.length, 150);
    for (let i = 0; i < limit; i++) {
        const p = points[i];
        debugCtx.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2);
    }
}

function drawTrackingPoints(coords: any[], sx: number, sy: number) {
    debugCtx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    const limit = Math.min(coords.length, 100);
    for (let i = 0; i < limit; i++) {
        const p = coords[i];
        debugCtx.fillRect(p.x * sx - 1.5, p.y * sy - 1.5, 3, 3);
    }
}

function positionOverlay(mVT: number[][], markerW: number, markerH: number) {
    if (!controller) return;

    const proj = (controller as any).projectionTransform;
    const containerRect = arContainer.getBoundingClientRect();

    const pUL = projectToScreen(0, 0, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);
    const pUR = projectToScreen(markerW, 0, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);
    const pLL = projectToScreen(0, markerH, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);
    const pLR = projectToScreen(markerW, markerH, 0, mVT, proj, WIDTH, HEIGHT, containerRect, false);

    const matrix = solveHomography(markerW, markerH, pUL, pUR, pLL, pLR);

    overlayImg.style.width = `${markerW}px`;
    overlayImg.style.height = `${markerH}px`;
    overlayImg.style.transformOrigin = '0 0';
    overlayImg.style.transform = `matrix3d(${matrix.join(',')})`;
    overlayImg.style.display = 'block';
}

function solveHomography(w: number, h: number, p1: any, p2: any, p3: any, p4: any) {
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
}

startCamera();
