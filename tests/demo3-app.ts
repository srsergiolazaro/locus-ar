import { OfflineCompiler } from '../src/compiler/offline-compiler.js';

// Elements
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const fileNameDisplay = document.getElementById('fileName') as HTMLSpanElement;
const previewContainer = document.getElementById('previewContainer') as HTMLDivElement;
const compileBtn = document.getElementById('compileBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const progressContainer = document.getElementById('progressContainer') as HTMLDivElement;
const progressBar = document.getElementById('progressBar') as HTMLDivElement;
const logsEl = document.getElementById('logs') as HTMLDivElement;
const timeStat = document.getElementById('timeStat') as HTMLDivElement;
const featuresStat = document.getElementById('featuresStat') as HTMLDivElement;
const sizeStat = document.getElementById('sizeStat') as HTMLDivElement;

let selectedImage: HTMLImageElement | null = null;
let compiledBuffer: Uint8Array | null = null;
let compiler: OfflineCompiler | null = null;

// Logger
function log(msg: string) {
    const time = new Date().toLocaleTimeString();
    logsEl.textContent += `[${time}] ${msg}
`;
    logsEl.scrollTop = logsEl.scrollHeight;
}

// Clear logs
function clearLogs() {
    logsEl.textContent = '';
}

// Format bytes
function formatBytes(bytes: number, decimals: number = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Handle File Selection
imageInput.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    if (!file) return;

    fileNameDisplay.textContent = file.name;
    compileBtn.disabled = true;
    downloadBtn.style.display = 'none';
    timeStat.textContent = '-';
    featuresStat.textContent = '-';
    sizeStat.textContent = '-';
    clearLogs();
    log(`Imagen seleccionada: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            selectedImage = img;
            previewContainer.innerHTML = '';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '400px';
            previewContainer.appendChild(img);
            compileBtn.disabled = false;
            log(`Imagen cargada: ${img.naturalWidth}x${img.naturalHeight}px`);
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
});

// Handle Compilation
compileBtn.addEventListener('click', async () => {
    if (!selectedImage) return;

    compileBtn.disabled = true;
    imageInput.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    downloadBtn.style.display = 'none';
    
    try {
        log('Iniciando compilación...');
        
        // Prepare image data
        const canvas = document.createElement('canvas');
        canvas.width = selectedImage.naturalWidth;
        canvas.height = selectedImage.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(selectedImage, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Init Compiler
        if (!compiler) {
            compiler = new OfflineCompiler();
        }

        const startTime = performance.now();

        // Compile
        const images = [{
            data: new Uint8Array(imageData.data.buffer), // RGBA
            width: imageData.width,
            height: imageData.height
        }];

        const result = await compiler.compileImageTargets(images, (progress: number) => {
            progressBar.style.width = `${progress}%`;
            // Log progress occasionally to avoid spam
            if (Math.floor(progress) % 25 === 0) {
                 log(`Progreso: ${Math.floor(progress)}%`);
            }
        });

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        // Export Data
        compiledBuffer = compiler.exportData();

        // Update Stats
        timeStat.textContent = `${duration}ms`;
        sizeStat.textContent = formatBytes(compiledBuffer.byteLength);
        
        // Count total features
        let totalFeatures = 0;
        if (result && result[0]) {
             // result[0].trackingData is an array of levels.
             // Sum points in all levels
             // @ts-ignore
             result[0].trackingData.forEach(level => {
                 totalFeatures += level.points.length;
             });
        }
        featuresStat.textContent = totalFeatures.toString();

        log(`✅ Compilación completada en ${duration}ms`);
        log(`📦 Tamaño del archivo: ${formatBytes(compiledBuffer.byteLength)}`);
        log(`🔢 Features rastreados: ${totalFeatures}`);

        // Enable Download
        downloadBtn.style.display = 'inline-flex';

    } catch (err: any) {
        console.error(err);
        log(`❌ Error: ${err.message}`);
    } finally {
        compileBtn.disabled = false;
        imageInput.disabled = false;
    }
});

// Handle Download
downloadBtn.addEventListener('click', () => {
    if (!compiledBuffer) return;

    const blob = new Blob([compiledBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'target.taar'; // Default name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log('⬇️ Archivo descargado');
});
