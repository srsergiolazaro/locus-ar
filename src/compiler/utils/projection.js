/**
 * 📐 AR Projection Utilities
 * Common logic for projecting 3D marker-space points to 2D screen CSS pixels.
 */

/**
 * Projects a 3D marker-space point (x, y, z) into 2D screen coordinates.
 * 
 * @param {number} x - Marker X coordinate
 * @param {number} y - Marker Y coordinate
 * @param {number} z - Marker Z coordinate (height from surface)
 * @param {number[][]} mVT - ModelViewTransform matrix (3x4)
 * @param {number[][]} proj - Projection matrix (3x3)
 * @param {number} videoW - Internal video width
 * @param {number} videoH - Internal video height
 * @param {Object} containerRect - {width, height} of the display container
 * @param {boolean} needsRotation - Whether the feed needs 90deg rotation (e.g. portrait mobile)
 * @returns {{sx: number, sy: number}} Screen coordinates [X, Y]
 */
export function projectToScreen(x, y, z, mVT, proj, videoW, videoH, containerRect, needsRotation = false) {
    // 1. Marker Space -> Camera Space (3D)
    const tx = mVT[0][0] * x + mVT[0][1] * y + mVT[0][2] * z + mVT[0][3];
    const ty = mVT[1][0] * x + mVT[1][1] * y + mVT[1][2] * z + mVT[1][3];
    const tz = mVT[2][0] * x + mVT[2][1] * y + mVT[2][2] * z + mVT[2][3];

    // 2. Camera Space -> Buffer Pixels (2D)
    // Using intrinsic projection from controller
    const bx = (proj[0][0] * tx / tz) + proj[0][2];
    const by = (proj[1][1] * ty / tz) + proj[1][2];

    // 3. Buffer Pixels -> Screen CSS Pixels
    const vW = needsRotation ? videoH : videoW;
    const vH = needsRotation ? videoW : videoH;

    // Calculate how the video is scaled to cover (object-fit: cover) the container
    const perspectiveScale = Math.max(containerRect.width / vW, containerRect.height / vH);

    const displayW = vW * perspectiveScale;
    const displayH = vH * perspectiveScale;

    // Centering offsets
    const offsetX = (containerRect.width - displayW) / 2;
    const offsetY = (containerRect.height - displayH) / 2;

    let sx, sy;
    if (needsRotation) {
        // Rotation Mapping: 
        // Camera +X (Right) -> Screen +Y (Down)
        // Camera +Y (Down)  -> Screen -X (Left)
        sx = offsetX + (displayW / 2) - (by - proj[1][2]) * perspectiveScale;
        sy = offsetY + (displayH / 2) + (bx - proj[0][2]) * perspectiveScale;
    } else {
        sx = offsetX + (displayW / 2) + (bx - proj[0][2]) * perspectiveScale;
        sy = offsetY + (displayH / 2) + (by - proj[1][2]) * perspectiveScale;
    }

    return { sx, sy };
}
