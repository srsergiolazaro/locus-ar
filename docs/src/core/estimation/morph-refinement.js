/**
 * Morphological Refinement - "Active Edge Alignment"
 *
 * This Moonshot algorithm snaps the projected target to the real image edges.
 * It solves the "Small Box / Drift" problem by maximizing alignment with
 * local image gradients using a Spring-Mass optimization system.
 */
import { Matrix, SingularValueDecomposition } from "ml-matrix";
export function refineWithMorphology({ imageData, width, height, targetData, initialH, iterations = 3 }) {
    let currentH = [...initialH];
    // 1. Boundary Points (The "Anchors" of our elastic malla)
    const boundaryPoints = [];
    const step = 0.05;
    for (let i = 0; i <= 1.0; i += step) {
        boundaryPoints.push({ x: i * targetData.w, y: 0 });
        boundaryPoints.push({ x: i * targetData.w, y: targetData.h });
        boundaryPoints.push({ x: 0, y: i * targetData.h });
        boundaryPoints.push({ x: targetData.w, y: i * targetData.h });
    }
    for (let iter = 0; iter < iterations; iter++) {
        const correspondences = [];
        for (const pt of boundaryPoints) {
            // Project
            const w = currentH[6] * pt.x + currentH[7] * pt.y + currentH[8];
            const sx = (currentH[0] * pt.x + currentH[1] * pt.y + currentH[2]) / w;
            const sy = (currentH[3] * pt.x + currentH[4] * pt.y + currentH[5]) / w;
            if (sx < 2 || sx >= width - 2 || sy < 2 || sy >= height - 2)
                continue;
            // 2. Local Gradient Search (The "Pull" of the image)
            const searchDist = 10;
            let bestX = sx;
            let bestY = sy;
            let maxGrad = -1;
            for (let dy = -searchDist; dy <= searchDist; dy += 2) {
                for (let dx = -searchDist; dx <= searchDist; dx += 2) {
                    const nx = Math.floor(sx + dx);
                    const ny = Math.floor(sy + dy);
                    const idx = ny * width + nx;
                    // Sobel-like gradient magnitude
                    const gx = imageData[idx + 1] - imageData[idx - 1];
                    const gy = imageData[idx + width] - imageData[idx - width];
                    const grad = gx * gx + gy * gy;
                    if (grad > maxGrad) {
                        maxGrad = grad;
                        bestX = nx;
                        bestY = ny;
                    }
                }
            }
            if (maxGrad > 500) {
                correspondences.push({
                    src: pt,
                    dst: { x: bestX, y: bestY },
                    weight: Math.min(1.0, maxGrad / 15000)
                });
            }
        }
        if (correspondences.length < 10)
            break;
        // 3. Solve for best Homography using SVD
        const nextH = solveDLTWeight(correspondences);
        if (nextH) {
            // Soft-Update (Momentum)
            for (let i = 0; i < 9; i++) {
                currentH[i] = currentH[i] * 0.5 + nextH[i] * 0.5;
            }
        }
    }
    return currentH;
}
/**
 * Direct Linear Transform with Weights
 */
function solveDLTWeight(pairs) {
    const n = pairs.length;
    const A = new Matrix(n * 2, 9);
    for (let i = 0; i < n; i++) {
        const { src, dst, weight: w } = pairs[i];
        const x = src.x;
        const y = src.y;
        const xp = dst.x;
        const yp = dst.y;
        // Row 1
        A.set(i * 2, 0, 0);
        A.set(i * 2, 1, 0);
        A.set(i * 2, 2, 0);
        A.set(i * 2, 3, -x * w);
        A.set(i * 2, 4, -y * w);
        A.set(i * 2, 5, -w);
        A.set(i * 2, 6, yp * x * w);
        A.set(i * 2, 7, yp * y * w);
        A.set(i * 2, 8, yp * w);
        // Row 2
        A.set(i * 2 + 1, 0, x * w);
        A.set(i * 2 + 1, 1, y * w);
        A.set(i * 2 + 1, 2, w);
        A.set(i * 2 + 1, 3, 0);
        A.set(i * 2 + 1, 4, 0);
        A.set(i * 2 + 1, 5, 0);
        A.set(i * 2 + 1, 6, -xp * x * w);
        A.set(i * 2 + 1, 7, -xp * y * w);
        A.set(i * 2 + 1, 8, -xp * w);
    }
    try {
        const svd = new SingularValueDecomposition(A);
        const V = svd.rightSingularVectors;
        // Last column of V is the solution
        const h = V.getColumn(8);
        // Normalize H[8] to 1
        const scale = 1.0 / h[8];
        return h.map(v => v * scale);
    }
    catch (e) {
        return null;
    }
}
