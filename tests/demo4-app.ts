import { BioInspiredController } from '../src/runtime/bio-inspired-controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';
import { AR_CONFIG } from '../src/core/constants.js';

// DOM Elements
const setupPanel = document.getElementById('setup-panel') as HTMLDivElement;
const arContainer = document.getElementById('ar-container') as HTMLDivElement;
const captureVideoContainer = document.getElementById('capture-video-container') as HTMLDivElement;
const captureVideo = document.getElementById('capture-video') as HTMLVideoElement;
const targetList = document.getElementById('targetList') as HTMLDivElement;
const btnCaptureTarget = document.getElementById('btnCaptureTarget') as HTMLButtonElement;
const btnStart = document.getElementById('btnStart') as HTMLButtonElement;
const btnStop = document.getElementById('btnStop') as HTMLButtonElement;
const controlsPanel = document.getElementById('controls-panel') as HTMLDivElement;
const statusLog = document.getElementById('statusLog') as HTMLDivElement;
const detectedMsg = document.getElementById('detectedMsg') as HTMLDivElement;
const video = document.getElementById('video') as HTMLVideoElement;
const arCanvas = document.getElementById('arCanvas') as HTMLCanvasElement;
const debugCanvas = document.getElementById('debugCanvas') as HTMLCanvasElement;
const debugCtx = debugCanvas.getContext('2d')!;
const arCtx = arCanvas.getContext('2d')!;
const emptyMsg = document.getElementById('empty-msg') as HTMLDivElement;

// Modal Elements
const textModal = document.getElementById('text-modal') as HTMLDivElement;
const modalPreview = document.getElementById('modal-preview') as HTMLImageElement;
const modalInput = document.getElementById('modal-input') as HTMLInputElement;
const modalSave = document.getElementById('modal-save') as HTMLButtonElement;
const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;

// State
interface TargetItem {
    id: string;
    imageData: ImageData;
    dataUrl: string;
    text: string;
    element: HTMLDivElement;
}

let targets: TargetItem[] = [];
let controller: BioInspiredController | null = null;
let isRunning = false;
let lastSpokenText = '';
let lastSpeakTime = 0;
const targetDetectionTimes: { [key: number]: number | null } = {};
const targetLastSpokenText: { [key: number]: string | null } = {};
const targetLastSeenTime: { [key: number]: number } = {};
const targetLastScreenCoords: { [key: number]: any[] } = {};
const LOST_GRACE_PERIOD = 300; // ms to keep target alive

// Temporary capture state
let tempCaptureData: ImageData | null = null;
let tempCaptureUrl: string | null = null;

// Config constants
const WIDTH = AR_CONFIG.VIEWPORT_WIDTH;
const HEIGHT = AR_CONFIG.VIEWPORT_HEIGHT;

// Initialize
arCanvas.width = WIDTH;
arCanvas.height = HEIGHT;

// --- Setup Phase ---

async function initSetupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        captureVideo.srcObject = stream;
    } catch (err) {
        console.error("Camera error:", err);
        alert("Error accediendo a la cámara. Asegúrate de dar permisos.");
    }
}

// Start camera immediately for setup
initSetupCamera();
loadTargets();

// Capture Handler
btnCaptureTarget.addEventListener('click', () => {
    // Capture current frame
    const cvs = document.createElement('canvas');
    cvs.width = WIDTH;
    cvs.height = HEIGHT;
    const ctx = cvs.getContext('2d')!;

    // Draw video to canvas (cover-like fit)
    drawVideoToCanvas(ctx, captureVideo, WIDTH, HEIGHT);

    tempCaptureData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    tempCaptureUrl = cvs.toDataURL('image/jpeg', 0.8);

    // Show Modal
    modalPreview.src = tempCaptureUrl;
    modalInput.value = '';
    textModal.style.display = 'flex';
    modalInput.focus();
});

// Modal Handlers
modalCancel.addEventListener('click', () => {
    textModal.style.display = 'none';
    tempCaptureData = null;
    tempCaptureUrl = null;
});

modalSave.addEventListener('click', () => {
    const text = modalInput.value.trim();
    if (!text) {
        alert("Por favor escribe un texto para el TTS.");
        return;
    }

    if (tempCaptureData && tempCaptureUrl) {
        addTarget(tempCaptureData, tempCaptureUrl, text);
        textModal.style.display = 'none';
        tempCaptureData = null;
        tempCaptureUrl = null;
    }
});

function addTarget(imageData: ImageData, dataUrl: string, text: string, shouldSave = true) {
    emptyMsg.style.display = 'none';
    btnStart.disabled = false;

    const id = Date.now().toString() + Math.random().toString().slice(2); // Ensure unique ID
    const div = document.createElement('div');
    div.className = 'target-item';
    div.innerHTML = `
        <img class="target-preview" src="${dataUrl}">
        <div class="target-inputs">
            <div style="font-weight: bold; color: white;">Target #${targets.length + 1}</div>
            <div style="color: var(--locus-gray); font-size: 0.9rem;">TTS: "${text}"</div>
        </div>
        <button class="remove-btn" data-id="${id}">🗑️</button>
    `;

    targetList.appendChild(div);

    const item: TargetItem = {
        id,
        imageData,
        dataUrl,
        text,
        element: div
    };
    targets.push(item);

    if (shouldSave) {
        saveTargets();
    }

    div.querySelector('.remove-btn')?.addEventListener('click', () => {
        const idx = targets.findIndex(t => t.id === id);
        if (idx > -1) {
            targets.splice(idx, 1);
            div.remove();
            if (targets.length === 0) {
                emptyMsg.style.display = 'block';
                btnStart.disabled = true;
            }
            saveTargets();
        }
    });
}

function saveTargets() {
    const data = targets.map(t => ({
        dataUrl: t.dataUrl,
        text: t.text
    }));
    localStorage.setItem('taptapp_demo4_targets', JSON.stringify(data));
}

async function loadTargets() {
    const json = localStorage.getItem('taptapp_demo4_targets');
    if (!json) return;

    try {
        const stored = JSON.parse(json);
        if (!Array.isArray(stored)) return;

        for (const item of stored) {
            if (item.dataUrl && item.text) {
                const img = new Image();
                img.src = item.dataUrl;
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });

                const cvs = document.createElement('canvas');
                cvs.width = img.width;
                cvs.height = img.height;
                const ctx = cvs.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    addTarget(imageData, item.dataUrl, item.text, false);
                }
            }
        }
    } catch (e) {
        console.error("Error loading targets", e);
    }
}

// Start Experience
btnStart.addEventListener('click', async () => {
    if (targets.length === 0) return;

    btnStart.disabled = true;
    btnStart.textContent = '⏳ Compilando...';

    // Stop setup camera
    const stream = captureVideo.srcObject as MediaStream;
    if (stream) stream.getTracks().forEach(t => t.stop());

    try {
        await startExperience(targets);
    } catch (err) {
        console.error(err);
        alert('Error al iniciar: ' + err);
        btnStart.disabled = false;
        btnStart.textContent = '🚀 Iniciar Experiencia AR';
        initSetupCamera(); // Restart setup camera
    }
});

btnStop.addEventListener('click', () => {
    stopExperience();
});


// --- Logic ---

async function startExperience(validTargets: TargetItem[]) {
    // 1. Compile Targets
    const compiler = new OfflineCompiler();
    const imagesToCompile = [];
    const texts: string[] = [];

    for (const t of validTargets) {
        imagesToCompile.push({
            data: new Uint8Array(t.imageData.data.buffer),
            width: t.imageData.width,
            height: t.imageData.height
        });
        texts.push(t.text);
    }

    const compiledDataList = await compiler.compileImageTargets(imagesToCompile, (p) => {
        btnStart.textContent = `⏳ Compilando ${Math.round(p)}%...`;
    });

    const buffer = compiler.exportData();
    const cleanBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    // 2. Setup AR Controller
    controller = new BioInspiredController({
        inputWidth: WIDTH,
        inputHeight: HEIGHT,
        debugMode: true,
        maxTrack: 5,
        bioInspired: { enabled: true },
        onUpdate: (data) => handleARUpdate(data, texts)
    });

    await controller.addImageTargetsFromBuffer(cleanBuffer);

    // 3. Start AR Camera
    await startCamera();

    // 4. UI Transition
    setupPanel.style.display = 'none';
    arContainer.style.display = 'block';
    controlsPanel.style.display = 'block';
    captureVideoContainer.style.display = 'none'; // Hide capture view

    // Adjust debug canvas size
    const rect = arContainer.getBoundingClientRect();
    debugCanvas.width = rect.width;
    debugCanvas.height = rect.height;

    isRunning = true;
    startLoop();
}

function stopExperience() {
    isRunning = false;
    if (controller) {
        controller = null;
    }

    // Stop AR Camera
    const stream = video.srcObject as MediaStream;
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
    }
    video.srcObject = null;

    arContainer.style.display = 'none';
    controlsPanel.style.display = 'none';
    setupPanel.style.display = 'block';
    captureVideoContainer.style.display = 'block';

    btnStart.disabled = false;
    btnStart.textContent = '🚀 Iniciar Experiencia AR';

    // Restart Setup Camera
    initSetupCamera();
}

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = stream;
    return new Promise<void>(resolve => {
        video.onloadedmetadata = () => resolve();
    });
}

function startLoop() {
    if (!isRunning) return;

    // Draw video to low-res canvas for processing
    drawVideoToCanvas(arCtx, video, WIDTH, HEIGHT);

    // Clear debug canvas each frame (prevents clearing previous target boxes during multi-target updates)
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

    if (controller) {
        controller.processVideo(arCanvas);
    }

    requestAnimationFrame(startLoop);
}

function handleARUpdate(data: any, texts: string[]) {
    if (!isRunning) return;

    const scaleX = debugCanvas.width / WIDTH;
    const scaleY = debugCanvas.height / HEIGHT;

    if (data.type === 'processDone') {
        const now = Date.now();
        let activeFound = false;
        let bestStatus = "Buscando...";
        let maxPriority = -1; // 0 = none, 1 = holding, 2 = detected

        // Check all targets to determine global status
        for (const key in targetLastSeenTime) {
            const idx = parseInt(key);
            const timeSinceSeen = now - targetLastSeenTime[idx];
            
            if (timeSinceSeen < 200) { // Recently seen (<200ms)
                if (maxPriority < 2) {
                    bestStatus = `Target ${idx + 1} Detectado`;
                    maxPriority = 2;
                }
                activeFound = true;
            } else if (timeSinceSeen < LOST_GRACE_PERIOD) {
                if (maxPriority < 1) {
                    bestStatus = `Target ${idx + 1} (Holding...)`;
                    maxPriority = 1;
                }
                activeFound = true;
            }
        }

        statusLog.textContent = bestStatus;

        if (!activeFound) {
            detectedMsg.classList.remove('visible');
        }
        return;
    }

    // debugCtx clear moved to startLoop

    if (data.type === 'updateMatrix') {
        const { targetIndex, worldMatrix, screenCoords } = data;
        const now = Date.now();

        // If a target is detected
        if (targetIndex !== undefined && targetIndex >= 0 && worldMatrix) {
            // Update last seen
            targetLastSeenTime[targetIndex] = now;
            targetLastScreenCoords[targetIndex] = screenCoords;

            // Draw box
            drawTrackingPoints(screenCoords, scaleX, scaleY);

            // Persistent detection check for this target (TTS)
            if (targetDetectionTimes[targetIndex] === null) {
                targetDetectionTimes[targetIndex] = now;
                targetLastSpokenText[targetIndex] = texts[targetIndex];
            }

            if (now - targetDetectionTimes[targetIndex]! >= 1000 && targetLastSpokenText[targetIndex] === texts[targetIndex]) {
                // TTS Logic
                const textToSpeak = texts[targetIndex];
                triggerTTS(textToSpeak);

                // Show message
                detectedMsg.textContent = textToSpeak;
                detectedMsg.classList.add('visible');
                setTimeout(() => detectedMsg.classList.remove('visible'), 2000);
            }
            return;
        }

        // If NO target detected in this specific event, check if we should draw "holding" box
        // We only draw holding box for the specific target that sent the update (if applicable)
        // OR we iterate all. Since updateMatrix is per-target, let's just draw 'holding' for this target if valid.
        
        // Actually, we should redraw all holding targets? No, startLoop clears.
        // We need to draw for EVERY target that is valid.
        // But `updateMatrix` only fires for one target.
        // If we only draw in `updateMatrix`, we miss targets that didn't update this frame?
        // `BioInspiredController` sends `updateMatrix` for ALL tracks that are showing or have coords.
        
        // If a target is strictly "Holding" (not tracking but in grace period), Controller MIGHT NOT send updateMatrix!
        // Because `BioInspiredController` loop iterates `trackingStates`.
        // If `isTracking` is false and `showing` is false, it might skip sending update.
        
        // So we need to handle "Holding" drawing in `processDone` or ensure we remember coords?
        // `targetLastScreenCoords` remembers them.
        
        // Let's try drawing "Holding" boxes in `processDone` as well?
        // Or iterate here?
        
        // If we rely on `updateMatrix` for drawing, we only draw what the controller thinks is relevant.
        // If controller stops sending updates for a lost target, we stop drawing it.
        // That's fine for the box.
        
        // But for "Holding" status logic, we use `targetLastSeenTime`.
        
        // Let's stick to drawing only what comes in `updateMatrix` for now (plus grace period checks if we want to force draw).
        
        // Re-implementing the "Holding" box drawing if this specific target is in grace period but lost tracking
        if (targetIndex !== undefined && targetIndex >= 0) {
             if (now - targetLastSeenTime[targetIndex] < LOST_GRACE_PERIOD) {
                 const lastCoords = targetLastScreenCoords[targetIndex];
                 if (lastCoords) {
                     drawTrackingPoints(lastCoords, scaleX, scaleY, true);
                 }
             }
        }
    }
}

function triggerTTS(text: string) {
    if (!text) return;
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

// Helpers
function drawVideoToCanvas(ctx: CanvasRenderingContext2D, videoElement: HTMLVideoElement, targetWidth: number, targetHeight: number) {
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    const videoRatio = videoWidth / videoHeight;
    const targetRatio = targetWidth / targetHeight;

    let sx, sy, sw, sh;
    if (videoRatio > targetRatio) {
        sh = videoHeight;
        sw = sh * targetRatio;
        sx = (videoWidth - sw) / 2;
        sy = 0;
    } else {
        sw = videoWidth;
        sh = sw / targetRatio;
        sx = 0;
        sy = (videoHeight - sh) / 2;
    }
    ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
}

function drawTrackingPoints(coords: any[], sx: number, sy: number, isHolding: boolean = false) {
    if (!coords) return;
    debugCtx.fillStyle = isHolding ? 'rgba(255, 165, 0, 0.5)' : 'rgba(0, 255, 0, 0.8)';
    debugCtx.strokeStyle = isHolding ? 'rgba(255, 165, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
    debugCtx.lineWidth = 2;
    if (isHolding) {
        debugCtx.setLineDash([5, 5]);
    } else {
        debugCtx.setLineDash([]);
    }

    // Draw points (DISABLED)
    /*
    for (const p of coords) {
        debugCtx.fillRect(p.x * sx - 2, p.y * sy - 2, 4, 4);
    }
    */

    // Draw box if we have 4 corners
    if (coords.length >= 4) {
        debugCtx.beginPath();
        debugCtx.moveTo(coords[0].x * sx, coords[0].y * sy);
        debugCtx.lineTo(coords[1].x * sx, coords[1].y * sy);
        debugCtx.lineTo(coords[3].x * sx, coords[3].y * sy);
        debugCtx.lineTo(coords[2].x * sx, coords[2].y * sy);
        debugCtx.closePath();
        debugCtx.stroke();
    }
}