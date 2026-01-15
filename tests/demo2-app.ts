import { BioInspiredController } from '../src/runtime/bio-inspired-controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { projectToScreen } from '../src/core/utils/projection.js';
import { AR_CONFIG } from '../src/core/constants.js';

const WIDTH = AR_CONFIG.VIEWPORT_WIDTH;
const HEIGHT = AR_CONFIG.VIEWPORT_HEIGHT;

const video = document.getElementById('video') as HTMLVideoElement;
const arCanvas = document.getElementById('arCanvas') as HTMLCanvasElement;
const arCtx = arCanvas.getContext('2d')!;
const statusText = document.getElementById('status-text')!;
const statusDot = document.getElementById('status-dot')!;
const logs = document.getElementById('logs')!;
const btnRegister = document.getElementById('btn-register') as HTMLButtonElement;
const btnCapture = document.getElementById('btn-capture') as HTMLButtonElement;
const btnTest = document.getElementById('btn-test') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const scanLine = document.getElementById('scan-line')!;
const overlayImg = document.getElementById('overlay-img') as HTMLImageElement;
const arContainer = document.getElementById('ar-container')!;

let controller: BioInspiredController | null = null;
let captureCanvas: HTMLCanvasElement | null = null;
let isTesting = false;

function log(msg: string) {
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logs.insertBefore(div, logs.firstChild);
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: 640, height: 480 }
        });
        video.srcObject = stream;
        statusText.textContent = 'Cámara lista. Registra un target.';
        log('Cámara iniciada correctamente.');
    } catch (err) {
        log('Error al acceder a la cámara: ' + err);
        statusText.textContent = 'Error de cámara.';
    }
}

btnRegister.onclick = () => {
    btnRegister.style.display = 'none';
    btnCapture.style.display = 'block';
    scanLine.style.display = 'block';
    statusText.textContent = 'Enmarca el objeto y captura.';
    log('Modo registro activo.');
};

btnCapture.onclick = async () => {
    btnCapture.disabled = true;
    statusText.textContent = 'Capturando y procesando...';
    log('Capturando frame...');

    // Capture current frame
    captureCanvas = document.createElement('canvas');
    captureCanvas.width = WIDTH;
    captureCanvas.height = HEIGHT;
    const ctx = captureCanvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);

    log('Compilando target al vuelo...');
    const compiler = new OfflineCompiler();
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);

    try {
        const compiledData = await compiler.compileImageTargets([
            {
                width: WIDTH,
                height: HEIGHT,
                data: imageData.data
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

        log('Target registrado con éxito.',);
        statusText.textContent = 'Colocar imagen';
        btnCapture.style.display = 'none';
        btnTest.style.display = 'block';
        scanLine.style.display = 'none';
    } catch (e) {
        log('Error en compilación: ' + e);
        btnCapture.disabled = false;
    }
};

btnTest.onclick = () => {
    isTesting = true;
    btnTest.style.display = 'none';
    btnReset.style.display = 'block';
    statusText.textContent = 'Probando tracking...';
    overlayImg.style.display = 'block';
    log('Iniciando motor de tracking.');

    if (controller) {
        controller.processVideo(video);
    }
};

btnReset.onclick = () => {
    location.reload();
};

function handleARUpdate(data: any, markerW: number, markerH: number) {
    if (data.type === 'updateMatrix') {
        const { worldMatrix, modelViewTransform } = data;

        if (worldMatrix && isTesting) {
            statusDot.classList.add('active');
            statusText.textContent = 'TRACKING ACTIVO';
            positionOverlay(modelViewTransform, markerW, markerH);
        } else {
            statusDot.classList.remove('active');
            if (isTesting) {
                statusText.textContent = 'Buscando target...';
                overlayImg.style.display = 'none';
            }
        }
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
