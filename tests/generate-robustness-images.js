import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.join(__dirname, 'assets');
const OUTPUT_BASE_DIR = path.join(__dirname, 'robustness-images');
const TEST_IMAGE_PATH = path.join(ASSETS_DIR, 'test-image.png');

const RESOLUTIONS = [
    { name: 'vga_h', width: 320, height: 240 },
    { name: 'vga_v', width: 240, height: 320 },
    { name: 'sd_h', width: 640, height: 480 },
    { name: 'sd_v', width: 480, height: 640 },
    { name: 'hd_h', width: 1280, height: 720 },
    { name: 'hd_v', width: 720, height: 1280 },
    { name: 'fhd_h', width: 1920, height: 1080 },
    { name: 'fhd_v', width: 1080, height: 1920 },
];

const MARGIN = 10; // Pixels to avoid touching edges

async function generate() {
    if (!fs.existsSync(OUTPUT_BASE_DIR)) {
        fs.mkdirSync(OUTPUT_BASE_DIR, { recursive: true });
    }

    // Clean up old resolution folders but keep 'custom'
    const entries = fs.readdirSync(OUTPUT_BASE_DIR);
    for (const entry of entries) {
        if (entry !== 'custom') {
            const p = path.join(OUTPUT_BASE_DIR, entry);
            if (fs.statSync(p).isDirectory()) {
                fs.rmSync(p, { recursive: true, force: true });
            }
        }
    }

    // Ensure custom folder exists
    const customDir = path.join(OUTPUT_BASE_DIR, 'custom');
    if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir);
    }

    console.log(`🚀 Loading base image: ${TEST_IMAGE_PATH}`);
    const baseImage = await Jimp.read(TEST_IMAGE_PATH);

    for (const res of RESOLUTIONS) {
        const resDir = path.join(OUTPUT_BASE_DIR, res.name);
        if (!fs.existsSync(resDir)) {
            fs.mkdirSync(resDir);
        }
        console.log(`📁 Generating images for ${res.name} (${res.width}x${res.height})...`);

        // 1. POSITIONS (Normal Scale, 0 rotation)
        const posWork = async (name, x, y, img = baseImage) => {
            const canvas = new Jimp({ width: res.width, height: res.height, color: 0xFFFFFFFF });

            let scaledImg = img.clone();
            const maxW = res.width - MARGIN * 2;
            const maxH = res.height - MARGIN * 2;

            // Critical: Ensure it fits AFTER any rotation/scaling
            if (scaledImg.bitmap.width > maxW || scaledImg.bitmap.height > maxH) {
                scaledImg.scaleToFit({ w: maxW, h: maxH });
            }

            // Re-calculate x, y for centered/aligned positions based on scaled image
            const sw = scaledImg.bitmap.width;
            const sh = scaledImg.bitmap.height;

            let finalX = x;
            let finalY = y;

            if (name === 'center') {
                finalX = (res.width - sw) / 2;
                finalY = (res.height - sh) / 2;
            } else if (name === 'top') {
                finalX = (res.width - sw) / 2;
                finalY = MARGIN;
            } else if (name === 'bottom') {
                finalX = (res.width - sw) / 2;
                finalY = res.height - sh - MARGIN;
            } else if (name === 'left') {
                finalX = MARGIN;
                finalY = (res.height - sh) / 2;
            } else if (name === 'right') {
                finalX = res.width - sw - MARGIN;
                finalY = (res.height - sh) / 2;
            } else if (name === 'corner_tl') {
                finalX = MARGIN;
                finalY = MARGIN;
            } else if (name === 'corner_tr') {
                finalX = res.width - sw - MARGIN;
                finalY = MARGIN;
            } else if (name === 'corner_bl') {
                finalX = MARGIN;
                finalY = res.height - sh - MARGIN;
            } else if (name === 'corner_br') {
                finalX = res.width - sw - MARGIN;
                finalY = res.height - sh - MARGIN;
            }

            if (finalX === null || finalY === null) {
                finalX = (res.width - sw) / 2;
                finalY = (res.height - sh) / 2;
            }

            canvas.composite(scaledImg, finalX, finalY);
            await canvas.write(path.join(resDir, `${name}.png`));
        };

        await posWork('center');
        await posWork('top');
        await posWork('bottom');
        await posWork('left');
        await posWork('right');
        await posWork('corner_tl');
        await posWork('corner_tr');
        await posWork('corner_bl');
        await posWork('corner_br');

        // 2. ROTATIONS Z (Centered, Normal Scale)
        const rotationsZ = [15, -15, 30, -30, 45, -45];
        for (const deg of rotationsZ) {
            const rotated = baseImage.clone().rotate(deg);
            await posWork(`rot_z_${deg}`, null, null, rotated);
        }

        // 3. ROTATIONS X (Tilt) - Simulated by vertical squeeze + trapezoid
        const rotationsX = [15, -15, 30, -30];
        for (const deg of rotationsX) {
            const rad = deg * Math.PI / 180;
            const scaleY = Math.abs(Math.cos(rad));
            const tilted = baseImage.clone().resize({ w: baseImage.bitmap.width, h: Math.round(baseImage.bitmap.height * scaleY) });
            // Perspective approximation: squeeze top or bottom
            // (For now, just the squeeze is a good first step, real perspective warp is harder with Jimp only)
            await posWork(`rot_x_${deg}`, null, null, tilted);
        }

        // 4. ROTATIONS Y (Tilt) - Simulated by horizontal squeeze
        const rotationsY = [15, -15, 30, -30];
        for (const deg of rotationsY) {
            const rad = deg * Math.PI / 180;
            const scaleX = Math.abs(Math.cos(rad));
            const tilted = baseImage.clone().resize({ w: Math.round(baseImage.bitmap.width * scaleX), h: baseImage.bitmap.height });
            await posWork(`rot_y_${deg}`, null, null, tilted);
        }

        // 5. SCALES (Centered, 0 rotation)
        const scales = [0.5, 0.75, 1.25, 1.5]; // 1.0 is center.png
        for (const s of scales) {
            const scaled = baseImage.clone().scale(s);
            await posWork(`scale_${Math.round(s * 100)}`, null, null, scaled);
        }
    }

    console.log('✅ All images generated successfully!');
}

generate().catch(err => {
    console.error('❌ Error generating images:', err);
    process.exit(1);
});
