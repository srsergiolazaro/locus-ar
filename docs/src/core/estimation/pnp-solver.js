/**
 * Direct PnP (Perspective-n-Point) Solver for Planar Targets
 *
 * This Moonshot algorithm ignores octave-relative scales and works
 * purely in Physical World Units. It uses the Camera Matrix (K)
 * to deduce the real-world distance (Z).
 */
import { Matrix, SingularValueDecomposition } from "ml-matrix";
export function solvePosePnP({ screenCoords, worldCoords, projectionTransform }) {
    const K = new Matrix(projectionTransform);
    const n = screenCoords.length;
    // 1. Build the DLT matrix for Pose (Directly estimating [R|t])
    // We assume worldCoords are [X, Y, 0]
    // Eq: x = K * [R|t] * X
    // K^-1 * x = [r1 r2 t] * [X Y 1]^T
    const KI = Inverse3x3(projectionTransform);
    const A = new Matrix(n * 2, 9);
    for (let i = 0; i < n; i++) {
        const sci = screenCoords[i];
        const wci = worldCoords[i];
        // Normalized camera coordinates
        const nx = KI[0] * sci.x + KI[1] * sci.y + KI[2];
        const ny = KI[3] * sci.x + KI[4] * sci.y + KI[5];
        const nz = KI[6] * sci.x + KI[7] * sci.y + KI[8];
        const unx = nx / nz;
        const uny = ny / nz;
        // DLT equations for [r11 r12 r21 r22 r31 r32 t1 t2 t3]
        const X = wci.x;
        const Y = wci.y;
        // Row 1: X*r11 + Y*r12 + t1 - unx*(X*r31 + Y*r32 + t3) = 0
        A.set(i * 2, 0, X);
        A.set(i * 2, 1, Y);
        A.set(i * 2, 2, 1);
        A.set(i * 2, 3, 0);
        A.set(i * 2, 4, 0);
        A.set(i * 2, 5, 0);
        A.set(i * 2, 6, -unx * X);
        A.set(i * 2, 7, -unx * Y);
        A.set(i * 2, 8, -unx);
        // Row 2: X*r21 + Y*r22 + t2 - uny*(X*r31 + Y*r32 + t3) = 0
        A.set(i * 2 + 1, 0, 0);
        A.set(i * 2 + 1, 1, 0);
        A.set(i * 2 + 1, 2, 0);
        A.set(i * 2 + 1, 3, X);
        A.set(i * 2 + 1, 4, Y);
        A.set(i * 2 + 1, 5, 1);
        A.set(i * 2 + 1, 6, -uny * X);
        A.set(i * 2 + 1, 7, -uny * Y);
        A.set(i * 2 + 1, 8, -uny);
    }
    // Solve via SVD
    const svd = new SingularValueDecomposition(A);
    const V = svd.rightSingularVectors;
    const sol = V.getColumn(8); // last column
    // 3. Extract r1, r2 and t from the DLT solution
    // Standard DLT has an overall sign ambiguity. We force sol[8] (t3) to be positive.
    if (sol[8] < 0) {
        for (let i = 0; i < 9; i++)
            sol[i] = -sol[i];
    }
    const r1_raw = [sol[0], sol[3], sol[6]];
    const r2_raw = [sol[1], sol[4], sol[7]];
    const t_raw = [sol[2], sol[5], sol[8]];
    const scale1 = Math.sqrt(r1_raw[0] ** 2 + r1_raw[1] ** 2 + r1_raw[2] ** 2);
    const scale2 = Math.sqrt(r2_raw[0] ** 2 + r2_raw[1] ** 2 + r2_raw[2] ** 2);
    const scale = (scale1 + scale2) / 2;
    // 4. Construct Rotation Matrix and orthogonalize via SVD
    const R_approx = new Matrix([
        [r1_raw[0] / scale1, r2_raw[0] / scale2, 0],
        [r1_raw[1] / scale1, r2_raw[1] / scale2, 0],
        [r1_raw[2] / scale1, r2_raw[2] / scale2, 0]
    ]);
    // R3 = R1 x R2
    R_approx.set(0, 2, R_approx.get(1, 0) * R_approx.get(2, 1) - R_approx.get(2, 0) * R_approx.get(1, 1));
    R_approx.set(1, 2, R_approx.get(2, 0) * R_approx.get(0, 1) - R_approx.get(0, 0) * R_approx.get(2, 1));
    R_approx.set(2, 2, R_approx.get(0, 0) * R_approx.get(1, 1) - R_approx.get(1, 0) * R_approx.get(0, 1));
    const svdRot = new SingularValueDecomposition(R_approx);
    const U = svdRot.leftSingularVectors;
    const Vrot = svdRot.rightSingularVectors;
    let R = U.mmul(Vrot.transpose());
    const getDet3 = (m) => {
        return m.get(0, 0) * (m.get(1, 1) * m.get(2, 2) - m.get(1, 2) * m.get(2, 1)) -
            m.get(0, 1) * (m.get(1, 0) * m.get(2, 2) - m.get(1, 2) * m.get(2, 0)) +
            m.get(0, 2) * (m.get(1, 0) * m.get(2, 1) - m.get(1, 1) * m.get(2, 0));
    };
    if (getDet3(R) < 0) {
        const U_mat = U.clone();
        for (let i = 0; i < 3; i++)
            U_mat.set(i, 2, -U_mat.get(i, 2));
        R = U_mat.mmul(Vrot.transpose());
    }
    return [
        [R.get(0, 0), R.get(0, 1), R.get(0, 2), t_raw[0] / scale],
        [R.get(1, 0), R.get(1, 1), R.get(1, 2), t_raw[1] / scale],
        [R.get(2, 0), R.get(2, 1), R.get(2, 2), t_raw[2] / scale]
    ];
}
function Inverse3x3(m) {
    const k00 = m[0][0], k01 = m[0][1], k02 = m[0][2];
    const k10 = m[1][0], k11 = m[1][1], k12 = m[1][2];
    const k20 = m[2][0], k21 = m[2][1], k22 = m[2][2];
    const det = k00 * (k11 * k22 - k21 * k12) - k01 * (k10 * k22 - k12 * k20) + k02 * (k10 * k21 - k11 * k20);
    const invDet = 1.0 / det;
    return [
        (k11 * k22 - k12 * k21) * invDet, (k02 * k21 - k01 * k22) * invDet, (k01 * k12 - k02 * k11) * invDet,
        (k12 * k20 - k10 * k22) * invDet, (k00 * k22 - k02 * k20) * invDet, (k10 * k02 - k00 * k12) * invDet,
        (k10 * k21 - k11 * k20) * invDet, (k20 * k01 - k21 * k00) * invDet, (k00 * k11 - k10 * k01) * invDet
    ];
}
