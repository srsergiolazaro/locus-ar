import { DetectorLite } from "../src/core/detector/detector-lite.js";
import { Matcher } from "../src/core/matching/matcher.js";
import { Estimator } from "../src/core/estimation/estimator.js";
import { buildModelViewProjectionTransform, computeScreenCoordiate } from "../src/core/estimation/utils.js";
import { decodeTaar } from "../src/core/protocol.js";

const WIDTH = 640;
const HEIGHT = 480;

// Standard AR Camera Intrinsics (K)
const fovy = (45.0 * Math.PI) / 180;
const f = HEIGHT / 2 / Math.tan(fovy / 2);
const K = [
    [f, 0, WIDTH / 2],
    [0, f, HEIGHT / 2],
    [0, 0, 1],
];

const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const overlayCanvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;
const logsDiv = document.getElementById('logs')!;
const runBtn = document.getElementById('runBtn')!;

mainCanvas.width = WIDTH;
mainCanvas.height = HEIGHT;
overlayCanvas.width = WIDTH;
overlayCanvas.height = HEIGHT;

const mainCtx = mainCanvas.getContext('2d')!;
const overlayCtx = overlayCanvas.getContext('2d')!;

function log(msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logsDiv.appendChild(entry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
    console.log(`[${type}] ${msg}`);
}

async function run() {
    runBtn.setAttribute('disabled', 'true');
    overlayCtx.clearRect(0, 0, WIDTH, HEIGHT);
    log('Starting automated verification...', 'info');

    try {
        // 1. Load Assets
        log('Loading test-image.png and targets.taar...', 'info');
        const [imgResponse, taarResponse] = await Promise.all([
            fetch('./assets/test-image.png'),
            fetch('./assets/targets.taar')
        ]);

        if (!imgResponse.ok || !taarResponse.ok) {
            throw new Error('Could not load assets. Ensure tests/assets/test-image.png and targets.taar exist.');
        }

        const imgBlob = await imgResponse.blob();
        const taarBuffer = await taarResponse.arrayBuffer();

        // 2. Decode TAAR
        log('Decoding TAAR data (HDC Zero-Octave)...', 'info');
        const taarData = decodeTaar(new Uint8Array(taarBuffer));
        const targetData = taarData.dataList;
        log(`TAAR Version: ${taarData.version}, Targets: ${targetData.length}`, 'success');

        // 3. Prepare Image
        const img = await createImageBitmap(imgBlob);
        mainCtx.drawImage(img, 0, 0, WIDTH, HEIGHT);
        const imageData = mainCtx.getImageData(0, 0, WIDTH, HEIGHT);
        const greyData = new Uint8Array(WIDTH * HEIGHT);
        for (let i = 0; i < greyData.length; i++) {
            greyData[i] = (imageData.data[i * 4] + imageData.data[i * 4 + 1] + imageData.data[i * 4 + 2]) / 3;
        }

        // 4. Detect
        log('Running DetectorLite...', 'info');
        const detector = new DetectorLite(WIDTH, HEIGHT, { useLSH: true });
        const { featurePoints } = detector.detect(greyData);
        log(`Features detected: ${featurePoints.length}`, 'success');

        // 5. Match
        log('Running Matcher (HDC-Based)...', 'info');
        const matcher = new Matcher(WIDTH, HEIGHT, false);
        const matchingResult = matcher.matchDetection(targetData[0].matchingData, featurePoints);

        if (matchingResult.keyframeIndex === -1 || !matchingResult.screenCoords) {
            throw new Error('Matching failed. No valid target found in image.');
        }

        log(`Match Success! Keyframe: ${matchingResult.keyframeIndex}, Inliers: ${matchingResult.screenCoords.length}`, 'success');

        // 6. Pose Estimation (PnP)
        log('Solving 3D Pose (PnP Solver)...', 'info');
        const estimator = new Estimator(K);
        const pose = estimator.estimate({
            screenCoords: matchingResult.screenCoords,
            worldCoords: matchingResult.worldCoords as any
        });

        if (!pose) {
            throw new Error('PnP Solver failed to find a valid 3D pose.');
        }

        log('Pose solving successful.', 'success');

        // 7. Visualization
        const MVP = buildModelViewProjectionTransform(K, pose);
        const trackingData = targetData[0].trackingData[0]; // Always use Master Mesh

        if (trackingData && trackingData.mesh) {
            const px = trackingData.px;
            const py = trackingData.py;
            const triangles = trackingData.mesh.t;

            const projected = [];
            for (let i = 0; i < px.length; i++) {
                const p = computeScreenCoordiate(MVP, px[i], py[i], 0);
                projected.push(p);
            }

            // Draw Mesh
            overlayCtx.strokeStyle = '#00ffff';
            overlayCtx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            overlayCtx.lineWidth = 1.5;
            for (let i = 0; i < triangles.length; i += 3) {
                const p1 = projected[triangles[i]];
                const p2 = projected[triangles[i + 1]];
                const p3 = projected[triangles[i + 2]];
                if (!p1 || !p2 || !p3) continue;
                overlayCtx.beginPath();
                overlayCtx.moveTo(p1.x, p1.y);
                overlayCtx.lineTo(p2.x, p2.y);
                overlayCtx.lineTo(p3.x, p3.y);
                overlayCtx.closePath();
                overlayCtx.fill();
                overlayCtx.stroke();
            }

            // Draw Inliers
            overlayCtx.fillStyle = '#00ff00';
            matchingResult.screenCoords.forEach((p: any) => {
                overlayCtx.beginPath();
                overlayCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                overlayCtx.fill();
            });

            log('Verification Complete. Mesh projected correctly.', 'success');
        }

    } catch (err: any) {
        log(`ERROR: ${err.message}`, 'error');
    } finally {
        runBtn.removeAttribute('disabled');
    }
}

runBtn.addEventListener('click', run);

// Auto-run on load
window.onload = () => {
    setTimeout(run, 500);
};
