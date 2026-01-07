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

    this.detector = new DetectorLite(cropSize, cropSize, { useLSH: true });

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
    if (!this.frameCounter) this.frameCounter = 0;
    this.frameCounter++;

    // Scan full screen every 2 frames
    if (this.frameCounter % 2 === 0) {
      return this._detectGlobal(imageData);
    }

    // Local crops: ensure we visit every single cell
    const gridSize = 5;
    const dx = this.lastRandomIndex % gridSize;
    const dy = Math.floor(this.lastRandomIndex / gridSize);

    const stepX = this.cropSize / 3;
    const stepY = this.cropSize / 3;

    let startY = Math.floor(this.height / 2 - this.cropSize / 2 + (dy - 2) * stepY);
    let startX = Math.floor(this.width / 2 - this.cropSize / 2 + (dx - 2) * stepX);

    startX = Math.max(0, Math.min(this.width - this.cropSize - 1, startX));
    startY = Math.max(0, Math.min(this.height - this.cropSize - 1, startY));

    this.lastRandomIndex = (this.lastRandomIndex + 1) % (gridSize * gridSize);
    return this._detect(imageData, startX, startY);
  }

  _detectGlobal(imageData) {
    const croppedData = new Float32Array(this.cropSize * this.cropSize);
    const scaleX = this.width / this.cropSize;
    const scaleY = this.height / this.cropSize;

    // Use sharp sampling for better descriptors
    for (let y = 0; y < this.cropSize; y++) {
      const srcY = Math.floor(y * scaleY) * this.width;
      const dstY = y * this.cropSize;
      for (let x = 0; x < this.cropSize; x++) {
        croppedData[dstY + x] = imageData[srcY + Math.floor(x * scaleX)];
      }
    }

    const { featurePoints } = this.detector.detect(croppedData);
    featurePoints.forEach((p) => {
      p.x *= scaleX;
      p.y *= scaleY;
    });

    return {
      featurePoints,
      debugExtra: this.debugMode ? { projectedImage: Array.from(croppedData), isGlobal: true } : {}
    };
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
