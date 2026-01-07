/**
 * 🚀 Moonshot: Non-Rigid Surface Refinement (Mass-Spring System)
 * 
 * Instead of a single homography, we relax a triangle mesh to match tracked points
 * while preserving edge lengths (Isometric constraint).
 */

export function refineNonRigid({ mesh, trackedPoints, currentVertices, iterations = 5 }) {
    const { e: edges, rl: restLengths } = mesh;
    const numVertices = currentVertices.length / 2;
    const vertices = new Float32Array(currentVertices); // copy

    // lambda for stiffness
    const stiffness = 0.8;
    const dataFidelity = 0.5;

    for (let iter = 0; iter < iterations; iter++) {
        // 1. Edge Length Constraints (Isometric term)
        for (let i = 0; i < restLengths.length; i++) {
            const idx1 = edges[i * 2];
            const idx2 = edges[i * 2 + 1];
            const restL = restLengths[i];

            const vx1 = vertices[idx1 * 2];
            const vy1 = vertices[idx1 * 2 + 1];
            const vx2 = vertices[idx2 * 2];
            const vy2 = vertices[idx2 * 2 + 1];

            const dx = vx2 - vx1;
            const dy = vy2 - vy1;
            const currentL = Math.sqrt(dx * dx + dy * dy);

            if (currentL < 0.0001) continue;

            const diff = (currentL - restL) / currentL;
            const moveX = dx * 0.5 * diff * stiffness;
            const moveY = dy * 0.5 * diff * stiffness;

            vertices[idx1 * 2] += moveX;
            vertices[idx1 * 2 + 1] += moveY;
            vertices[idx2 * 2] -= moveX;
            vertices[idx2 * 2 + 1] -= moveY;
        }

        // 2. Data Fidelity Constraints (Alignment with NCC tracker)
        for (const tp of trackedPoints) {
            const idx = tp.meshIndex;
            if (idx === undefined) continue;

            const targetX = tp.x;
            const targetY = tp.y;

            vertices[idx * 2] += (targetX - vertices[idx * 2]) * dataFidelity;
            vertices[idx * 2 + 1] += (targetY - vertices[idx * 2 + 1]) * dataFidelity;
        }
    }

    return vertices;
}

/**
 * Maps a mesh from reference space to screen space using a homography
 */
export function projectMesh(mesh, homography, width, height) {
    const { px, py } = mesh; // original octave points used as mesh vertices
    const numVertices = px.length;
    const projected = new Float32Array(numVertices * 2);

    const h = homography;
    const h00 = h[0][0], h01 = h[0][1], h02 = h[0][3];
    const h10 = h[1][0], h11 = h[1][1], h12 = h[1][3];
    const h20 = h[2][0], h21 = h[2][1], h22 = h[2][3];

    for (let i = 0; i < numVertices; i++) {
        const x = px[i];
        const y = py[i];

        const uz = (x * h20) + (y * h21) + h22;
        const invZ = 1.0 / uz;
        projected[i * 2] = ((x * h00) + (y * h01) + h02) * invZ;
        projected[i * 2 + 1] = ((x * h10) + (y * h11) + h12) * invZ;
    }

    return projected;
}
