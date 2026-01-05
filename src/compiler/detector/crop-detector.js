import { DetectorLite } from "./detector-lite.js";

class CropDetector {
  constructor(width, height, debugMode = false) {
    this.debugMode = debugMode;
    this.width = width;
    this.height = height;

    // nearest power of 2, min dimensions
    let minDimension = Math.min(width, height) / 2;
    let cropSize = Math.pow(2, Math.round(Math.log(minDimension) / Math.log(2)));
    this.cropSize = cropSize;

    this.detector = new DetectorLite(cropSize, cropSize, { useLSH: true, maxOctaves: 1 });

    this.lastRandomIndex = 4;
  }

  detect(input) {
    const imageData = input;

    // crop center
    const startY = Math.floor(this.height / 2 - this.cropSize / 2);
    const startX = Math.floor(this.width / 2 - this.cropSize / 2);
    const result = this._detect(imageData, startX, startY);

    if (this.debugMode) {
      result.debugExtra.crop = { startX, startY, cropSize: this.cropSize };
    }
    return result;
  }

  detectMoving(input) {
    const imageData = input;

    // Expanded to 5x5 grid (25 positions) for better coverage
    const gridSize = 5;
    const dx = this.lastRandomIndex % gridSize;
    const dy = Math.floor(this.lastRandomIndex / gridSize);

    // Calculate offset from center, with overlap for better detection
    const stepX = this.cropSize / 3;
    const stepY = this.cropSize / 3;

    let startY = Math.floor(this.height / 2 - this.cropSize / 2 + (dy - 2) * stepY);
    let startX = Math.floor(this.width / 2 - this.cropSize / 2 + (dx - 2) * stepX);

    // Clamp to valid bounds
    if (startX < 0) startX = 0;
    if (startY < 0) startY = 0;
    if (startX >= this.width - this.cropSize) startX = this.width - this.cropSize - 1;
    if (startY >= this.height - this.cropSize) startY = this.height - this.cropSize - 1;

    this.lastRandomIndex = (this.lastRandomIndex + 1) % (gridSize * gridSize);

    const result = this._detect(imageData, startX, startY);
    return result;
  }

  _detect(imageData, startX, startY) {
    // Crop manually since imageData is now a flat array (width * height)
    const croppedData = new Float32Array(this.cropSize * this.cropSize);
    for (let y = 0; y < this.cropSize; y++) {
      for (let x = 0; x < this.cropSize; x++) {
        croppedData[y * this.cropSize + x] = imageData[(startY + y) * this.width + (startX + x)];
      }
    }

    const { featurePoints } = this.detector.detect(croppedData);

    featurePoints.forEach((p) => {
      p.x += startX;
      p.y += startY;
    });

    return {
      featurePoints,
      debugExtra: this.debugMode ? { projectedImage: Array.from(croppedData) } : {}
    };
  }
}

export { CropDetector };
