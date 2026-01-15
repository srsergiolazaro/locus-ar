import { solvePosePnP } from "./pnp-solver.js";
/**
 * 🚀 MOONSHOT: Direct PnP Solver for AR
 *
 * Instead of estimating a 2D Homography and decomposing it,
 * we solve for the 3D Pose [R|t] directly using the
 * Perspective-n-Point algorithm.
 */
const estimate = ({ screenCoords, worldCoords, projectionTransform }) => {
    return solvePosePnP({
        screenCoords,
        worldCoords,
        projectionTransform
    });
};
export { estimate };
