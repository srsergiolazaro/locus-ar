import { readFileSync } from 'fs';
import { Jimp } from 'jimp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Viridis color palette implementation
function getViridisColor(v) {
    const colors = [
        [68, 1, 84],   // 0.0
        [59, 82, 139],  // 0.25
        [33, 145, 140], // 0.5
        [94, 201, 98],  // 0.75
        [253, 231, 37]  // 1.0
    ];

    let idx = v * (colors.length - 1);
    let i = Math.floor(idx);
    let f = idx - i;

    if (i >= colors.length - 1) {
        const c = colors[colors.length - 1];
        return ((c[0] << 24) | (c[1] << 16) | (c[2] << 8) | 255) >>> 0;
    }

    const r = Math.round(colors[i][0] + f * (colors[i + 1][0] - colors[i][0]));
    const g = Math.round(colors[i][1] + f * (colors[i + 1][1] - colors[i][1]));
    const b = Math.round(colors[i][2] + f * (colors[i + 1][2] - colors[i][2]));

    // Manual RGBA to Int (r << 24 | g << 16 | b << 8 | a)
    return ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
}

async function generateMatrixImage() {
    try {
        const dataPath = join(__dirname, 'similarity_data.json');
        const data = JSON.parse(readFileSync(dataPath, 'utf8'));
        const { matrix, labels } = data;
        const n = labels.length;

        // Cada celda será de 8x8 píxeles para que la imagen sea de 800x800
        const cellSize = 8;
        const imgSize = n * cellSize;

        const image = new Jimp({
            width: imgSize,
            height: imgSize,
            color: 0x000000ff
        });

        console.log(`--- Generando imagen de la matriz ${n}x${n} ---`);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const color = getViridisColor(matrix[i][j]);

                // Dibujar bloque de píxeles
                for (let dy = 0; dy < cellSize; dy++) {
                    for (let dx = 0; dx < cellSize; dx++) {
                        image.setPixelColor(color, j * cellSize + dx, i * cellSize + dy);
                    }
                }
            }
        }

        const outputPath = join(__dirname, 'similarity_matrix.png');
        await image.write(outputPath);

        console.log(`✓ Imagen guardada exitosamente en: ${outputPath}`);
        console.log(`Tamaño final: ${imgSize}x${imgSize} píxeles.`);
    } catch (err) {
        console.error('Error al generar la imagen:', err.message);
        console.error(err.stack);
    }
}

generateMatrixImage();
