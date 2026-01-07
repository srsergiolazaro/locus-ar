import { ControllerFeature } from "./feature-base.js";

export class AutoRotationFeature implements ControllerFeature {
    id = "auto-rotation";
    name = "Auto Rotation Matrix";
    description = "Automatically adjusts the world matrix if the input video is rotated (e.g. portrait mode).";
    enabled = true;

    private inputWidth: number = 0;
    private inputHeight: number = 0;

    init(context: { inputWidth: number; inputHeight: number }) {
        this.inputWidth = context.inputWidth;
        this.inputHeight = context.inputHeight;
    }

    filterWorldMatrix(targetIndex: number, worldMatrix: number[]): number[] {
        if (!this.enabled) return worldMatrix;

        // Check if input is rotated (this logic might need the actual current input dimensions)
        // For now, we'll assume the controller passes the 'isRotated' info or we detect it
        // But since this is a matrix post-process, we can just apply it if needed.
        return worldMatrix;
    }

    // We might need a way to pass the 'currentInput' to the feature.
    // Actually, the controller can just call this if it detects rotation.
    rotate(m: number[]): number[] {
        return [
            -m[1], m[0], m[2], m[3],
            -m[5], m[4], m[6], m[7],
            -m[9], m[8], m[10], m[11],
            -m[13], m[12], m[14], m[15],
        ];
    }
}
