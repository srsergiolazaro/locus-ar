// src/core/utils/images.js
var downsampleBilinear = ({ image }) => {
  const { data, width, height } = image;
  const dstWidth = width >>> 1;
  const dstHeight = height >>> 1;
  const temp = new Uint8Array(dstWidth * dstHeight);
  for (let j = 0; j < dstHeight; j++) {
    const row0 = j * 2 * width;
    const row1 = row0 + width;
    const dstRow = j * dstWidth;
    for (let i = 0; i < dstWidth; i++) {
      const i2 = i * 2;
      const val = data[row0 + i2] + data[row0 + i2 + 1] + data[row1 + i2] + data[row1 + i2 + 1] >> 2;
      temp[dstRow + i] = val & 255;
    }
  }
  return { data: temp, width: dstWidth, height: dstHeight };
};
var resize = ({ image, ratio }) => {
  if (ratio === 1) {
    return {
      data: new Uint8Array(image.data),
      // Copy to be safe/consistent
      width: image.width,
      height: image.height
    };
  }
  if (ratio <= 0.5) {
    return resize({
      image: downsampleBilinear({ image }),
      ratio: ratio * 2
    });
  }
  const width = Math.round(image.width * ratio) | 0;
  const height = Math.round(image.height * ratio) | 0;
  const imageData = new Uint8Array(width * height);
  const srcData = image.data;
  const srcW = image.width | 0;
  const srcH = image.height | 0;
  const srcW_1 = srcW - 1 | 0;
  const srcH_1 = srcH - 1 | 0;
  let dstIndex = 0;
  for (let j = 0; j < height; j++) {
    const srcY = j / ratio;
    const y0 = srcY | 0;
    const y1 = (y0 < srcH_1 ? y0 + 1 : srcH_1) | 0;
    const fy = srcY - y0;
    const ify = 1 - fy;
    const row0 = y0 * srcW | 0;
    const row1 = y1 * srcW | 0;
    for (let i = 0; i < width; i++) {
      const srcX = i / ratio;
      const x0 = srcX | 0;
      const x1 = (x0 < srcW_1 ? x0 + 1 : srcW_1) | 0;
      const fx = srcX - x0;
      const ifx = 1 - fx;
      const val0 = srcData[row0 + x0] * ifx + srcData[row0 + x1] * fx;
      const val1 = srcData[row1 + x0] * ifx + srcData[row1 + x1] * fx;
      const value = val0 * ify + val1 * fy;
      imageData[dstIndex++] = value | 0;
    }
  }
  return { data: imageData, width, height };
};

// src/core/constants.ts
var AR_CONFIG = {
  // Camera settings
  VIEWPORT_WIDTH: 640,
  VIEWPORT_HEIGHT: 480,
  DEFAULT_FOVY: 60,
  DEFAULT_NEAR: 1,
  DEFAULT_FAR: 1e4,
  // Detection settings
  MAX_FEATURES_PER_BUCKET: 24,
  USE_LSH: true,
  // Matching settings
  HAMMING_THRESHOLD: 0.85,
  HDC_RATIO_THRESHOLD: 0.85,
  INLIER_THRESHOLD: 15,
  MIN_NUM_INLIERS: 6,
  MAX_MATCH_QUERY_POINTS: 800,
  CLUSTER_MAX_POP: 25,
  // Tracker / NCC settings
  TRACKER_TEMPLATE_SIZE: 6,
  TRACKER_SEARCH_SIZE: 12,
  TRACKER_SIMILARITY_THRESHOLD: 0.65,
  // Image processing / Scale list
  MIN_IMAGE_PIXEL_SIZE: 32,
  SCALE_STEP_EXPONENT: 1,
  // Optimized: was 0.6, now 1.0 (reduces scales from ~7 to ~4)
  TRACKING_DOWNSCALE_LEVEL_1: 256,
  TRACKING_DOWNSCALE_LEVEL_2: 128,
  // Tracker settings
  WARMUP_TOLERANCE: 2,
  MISS_TOLERANCE: 1,
  ONE_EURO_FILTER_CUTOFF: 0.5,
  ONE_EURO_FILTER_BETA: 0.1,
  // TAAR Size Optimization
  USE_COMPACT_DESCRIPTORS: true,
  // 32-bit XOR folded descriptors vs 64-bit raw
  COMPACT_HAMMING_THRESHOLD: 8
  // Threshold for 32-bit descriptors (vs 15 for 64-bit)
};

// src/core/image-list.js
var MIN_IMAGE_PIXEL_SIZE = AR_CONFIG.MIN_IMAGE_PIXEL_SIZE;
var buildTrackingImageList = (inputImage) => {
  const minDimension = Math.min(inputImage.width, inputImage.height);
  const scaleList = [];
  const imageList = [];
  scaleList.push(AR_CONFIG.TRACKING_DOWNSCALE_LEVEL_1 / minDimension);
  scaleList.push(AR_CONFIG.TRACKING_DOWNSCALE_LEVEL_2 / minDimension);
  for (let i = 0; i < scaleList.length; i++) {
    imageList.push(
      Object.assign(resize({ image: inputImage, ratio: scaleList[i] }), { scale: scaleList[i] })
    );
  }
  return imageList;
};

// src/core/utils/cumsum.js
var Cumsum = class {
  constructor(data, width, height) {
    this.width = width;
    this.height = height;
    this.cumsum = new Int32Array(width * height);
    this.cumsum[0] = data[0];
    for (let i = 1; i < width; i++) {
      this.cumsum[i] = this.cumsum[i - 1] + data[i];
    }
    for (let j = 1; j < height; j++) {
      this.cumsum[j * width] = this.cumsum[(j - 1) * width] + data[j * width];
    }
    for (let j = 1; j < height; j++) {
      for (let i = 1; i < width; i++) {
        const pos = j * width + i;
        this.cumsum[pos] = data[pos] + this.cumsum[(j - 1) * width + i] + this.cumsum[j * width + i - 1] - this.cumsum[(j - 1) * width + i - 1];
      }
    }
  }
  query(x1, y1, x2, y2) {
    const { width } = this;
    let ret = this.cumsum[y2 * width + x2];
    if (y1 > 0) ret -= this.cumsum[(y1 - 1) * width + x2];
    if (x1 > 0) ret -= this.cumsum[y2 * width + x1 - 1];
    if (x1 > 0 && y1 > 0) ret += this.cumsum[(y1 - 1) * width + x1 - 1];
    return ret;
  }
};

// src/core/utils/gpu-compute.js
var tryInitGPU = () => {
  return null;
};
var computeGradientsJS = (imageData, width, height) => {
  const dValue = new Float32Array(width * height);
  for (let j = 1; j < height - 1; j++) {
    const rowOffset = j * width;
    const prevRowOffset = (j - 1) * width;
    const nextRowOffset = (j + 1) * width;
    for (let i = 1; i < width - 1; i++) {
      const pos = rowOffset + i;
      const dx = (imageData[prevRowOffset + i + 1] - imageData[prevRowOffset + i - 1] + imageData[rowOffset + i + 1] - imageData[rowOffset + i - 1] + imageData[nextRowOffset + i + 1] - imageData[nextRowOffset + i - 1]) / 768;
      const dy = (imageData[nextRowOffset + i - 1] - imageData[prevRowOffset + i - 1] + imageData[nextRowOffset + i] - imageData[prevRowOffset + i] + imageData[nextRowOffset + i + 1] - imageData[prevRowOffset + i + 1]) / 768;
      dValue[pos] = Math.sqrt((dx * dx + dy * dy) / 2);
    }
  }
  return dValue;
};
var findLocalMaximaJS = (gradients, width, height) => {
  const isCandidate = new Uint8Array(width * height);
  for (let j = 1; j < height - 1; j++) {
    const rowOffset = j * width;
    for (let i = 1; i < width - 1; i++) {
      const pos = rowOffset + i;
      const val = gradients[pos];
      if (val > 0 && val >= gradients[pos - 1] && val >= gradients[pos + 1] && val >= gradients[pos - width] && val >= gradients[pos + width]) {
        isCandidate[pos] = 1;
      }
    }
  }
  return isCandidate;
};
var gaussianBlurJS = (data, width, height) => {
  const output = new Float32Array(width * height);
  const temp = new Float32Array(width * height);
  const k0 = 1 / 16, k1 = 4 / 16, k2 = 6 / 16;
  const w1 = width - 1;
  const h1 = height - 1;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const x0 = x < 2 ? 0 : x - 2;
      const x1 = x < 1 ? 0 : x - 1;
      const x3 = x > w1 - 1 ? w1 : x + 1;
      const x4 = x > w1 - 2 ? w1 : x + 2;
      temp[rowOffset + x] = data[rowOffset + x0] * k0 + data[rowOffset + x1] * k1 + data[rowOffset + x] * k2 + data[rowOffset + x3] * k1 + data[rowOffset + x4] * k0;
    }
  }
  for (let y = 0; y < height; y++) {
    const y0 = (y < 2 ? 0 : y - 2) * width;
    const y1 = (y < 1 ? 0 : y - 1) * width;
    const y2 = y * width;
    const y3 = (y > h1 - 1 ? h1 : y + 1) * width;
    const y4 = (y > h1 - 2 ? h1 : y + 2) * width;
    for (let x = 0; x < width; x++) {
      output[y2 + x] = temp[y0 + x] * k0 + temp[y1 + x] * k1 + temp[y2 + x] * k2 + temp[y3 + x] * k1 + temp[y4 + x] * k0;
    }
  }
  return output;
};
var downsampleJS = (data, width, height) => {
  const newWidth = Math.floor(width / 2);
  const newHeight = Math.floor(height / 2);
  const output = new Float32Array(newWidth * newHeight);
  for (let y = 0; y < newHeight; y++) {
    const sy = y * 2;
    for (let x = 0; x < newWidth; x++) {
      const sx = x * 2;
      const pos = sy * width + sx;
      output[y * newWidth + x] = (data[pos] + data[pos + 1] + data[pos + width] + data[pos + width + 1]) / 4;
    }
  }
  return { data: output, width: newWidth, height: newHeight };
};
var GPUCompute = class {
  constructor() {
    this.gpu = null;
    this.kernelCache = /* @__PURE__ */ new Map();
    this.initialized = false;
  }
  /**
   * Initialize (tries GPU in browser, uses JS in Node)
   */
  init() {
    if (this.initialized) return;
    this.gpu = tryInitGPU();
    this.initialized = true;
  }
  /**
   * Compute edge gradients
   */
  computeGradients(imageData, width, height) {
    this.init();
    return computeGradientsJS(imageData, width, height);
  }
  /**
   * Find local maxima
   */
  findLocalMaxima(gradients, width, height) {
    this.init();
    return findLocalMaximaJS(gradients, width, height);
  }
  /**
   * Combined edge detection
   */
  edgeDetection(imageData, width, height) {
    const dValue = this.computeGradients(imageData, width, height);
    const isCandidate = this.findLocalMaxima(dValue, width, height);
    return { dValue, isCandidate };
  }
  /**
   * Gaussian blur
   */
  gaussianBlur(imageData, width, height) {
    this.init();
    return gaussianBlurJS(imageData, width, height);
  }
  /**
   * Downsample by factor of 2
   */
  downsample(imageData, width, height) {
    this.init();
    return downsampleJS(imageData, width, height);
  }
  /**
   * Build Gaussian pyramid
   */
  buildPyramid(imageData, width, height, numLevels = 5) {
    this.init();
    const pyramid = [];
    let currentData = imageData instanceof Float32Array ? imageData : Float32Array.from(imageData);
    let currentWidth = width;
    let currentHeight = height;
    for (let level = 0; level < numLevels; level++) {
      const blurred = this.gaussianBlur(currentData, currentWidth, currentHeight);
      pyramid.push({
        data: blurred,
        width: currentWidth,
        height: currentHeight,
        scale: Math.pow(2, level)
      });
      if (currentWidth > 8 && currentHeight > 8) {
        const downsampled = this.downsample(blurred, currentWidth, currentHeight);
        currentData = downsampled.data;
        currentWidth = downsampled.width;
        currentHeight = downsampled.height;
      } else {
        break;
      }
    }
    return pyramid;
  }
  /**
   * Check if GPU is available
   */
  isGPUAvailable() {
    this.init();
    return this.gpu !== null;
  }
  /**
   * Cleanup resources
   */
  destroy() {
    this.kernelCache.clear();
    if (this.gpu && this.gpu.destroy) {
      this.gpu.destroy();
    }
    this.gpu = null;
    this.initialized = false;
  }
};
var gpuCompute = new GPUCompute();

// src/core/tracker/extract.js
var SEARCH_SIZE1 = 10;
var SEARCH_SIZE2 = 2;
var TEMPLATE_SIZE = 6;
var TEMPLATE_SD_THRESH = 4;
var MAX_THRESH = 0.9;
var MIN_THRESH = 0.2;
var OCCUPANCY_SIZE = 8;
var useGPU = true;
var extract = (image) => {
  const { data: imageData, width, height } = image;
  let dValue, isCandidate;
  if (useGPU) {
    const result = gpuCompute.edgeDetection(imageData, width, height);
    dValue = result.dValue;
    isCandidate = result.isCandidate;
  } else {
    dValue = new Float32Array(imageData.length);
    isCandidate = new Uint8Array(imageData.length);
    for (let j = 1; j < height - 1; j++) {
      const rowOffset = j * width;
      const prevRowOffset = (j - 1) * width;
      const nextRowOffset = (j + 1) * width;
      for (let i = 1; i < width - 1; i++) {
        const pos = rowOffset + i;
        let dx = (imageData[prevRowOffset + i + 1] - imageData[prevRowOffset + i - 1] + imageData[rowOffset + i + 1] - imageData[rowOffset + i - 1] + imageData[nextRowOffset + i + 1] - imageData[nextRowOffset + i - 1]) / 768;
        let dy = (imageData[nextRowOffset + i - 1] - imageData[prevRowOffset + i - 1] + imageData[nextRowOffset + i] - imageData[prevRowOffset + i] + imageData[nextRowOffset + i + 1] - imageData[prevRowOffset + i + 1]) / 768;
        dValue[pos] = Math.sqrt((dx * dx + dy * dy) / 2);
      }
    }
    for (let j = 1; j < height - 1; j++) {
      const rowOffset = j * width;
      for (let i = 1; i < width - 1; i++) {
        const pos = rowOffset + i;
        const val = dValue[pos];
        if (val > 0 && val >= dValue[pos - 1] && val >= dValue[pos + 1] && val >= dValue[pos - width] && val >= dValue[pos + width]) {
          isCandidate[pos] = 1;
        }
      }
    }
  }
  const dValueHist = new Uint32Array(1e3);
  let allCount = 0;
  for (let j = 1; j < height - 1; j++) {
    const rowOffset = j * width;
    for (let i = 1; i < width - 1; i++) {
      const pos = rowOffset + i;
      if (isCandidate[pos]) {
        const val = dValue[pos];
        let k = Math.floor(val * 1e3);
        if (k > 999) k = 999;
        dValueHist[k]++;
        allCount++;
      }
    }
  }
  const maxPoints = 0.1 * width * height;
  let kThresh = 999;
  let filteredCount = 0;
  while (kThresh >= 0) {
    filteredCount += dValueHist[kThresh];
    if (filteredCount > maxPoints) break;
    kThresh--;
  }
  const minDValue = kThresh / 1e3;
  const imageDataSqr = new Float32Array(imageData.length);
  for (let i = 0; i < imageData.length; i++) {
    imageDataSqr[i] = imageData[i] * imageData[i];
  }
  const imageDataCumsum = new Cumsum(imageData, width, height);
  const imageDataSqrCumsum = new Cumsum(imageDataSqr, width, height);
  const candidates = [];
  for (let i = 0; i < imageData.length; i++) {
    if (isCandidate[i] && dValue[i] >= minDValue) {
      candidates.push({
        pos: i,
        dval: dValue[i],
        x: i % width,
        y: Math.floor(i / width)
      });
    }
  }
  candidates.sort((a, b) => b.dval - a.dval);
  const divSize = (TEMPLATE_SIZE * 2 + 1) * 3;
  const maxFeatureNum = Math.floor(width / OCCUPANCY_SIZE) * Math.floor(height / OCCUPANCY_SIZE) + Math.floor(width / divSize) * Math.floor(height / divSize);
  const coords = [];
  const invalidated = new Uint8Array(width * height);
  const templateWidth = 2 * TEMPLATE_SIZE + 1;
  const nPixels = templateWidth * templateWidth;
  const actualOccSize = Math.floor(Math.min(width, height) / 12);
  for (let i = 0; i < candidates.length; i++) {
    const { x, y, pos } = candidates[i];
    if (invalidated[pos]) continue;
    if (x < TEMPLATE_SIZE + SEARCH_SIZE1 || x >= width - TEMPLATE_SIZE - SEARCH_SIZE1 || y < TEMPLATE_SIZE + SEARCH_SIZE1 || y >= height - TEMPLATE_SIZE - SEARCH_SIZE1) {
      continue;
    }
    const vlen = _templateVar({
      image,
      cx: x,
      cy: y,
      sdThresh: TEMPLATE_SD_THRESH,
      imageDataCumsum,
      imageDataSqrCumsum
    });
    if (vlen === null) continue;
    const templateAvg = imageDataCumsum.query(
      x - TEMPLATE_SIZE,
      y - TEMPLATE_SIZE,
      x + TEMPLATE_SIZE,
      y + TEMPLATE_SIZE
    ) / nPixels;
    const templateData = new Uint8Array(templateWidth * templateWidth);
    let tidx = 0;
    const tStart = (y - TEMPLATE_SIZE) * width + (x - TEMPLATE_SIZE);
    for (let tj = 0; tj < templateWidth; tj++) {
      const rowOffset = tStart + tj * width;
      for (let ti = 0; ti < templateWidth; ti++) {
        templateData[tidx++] = imageData[rowOffset + ti];
      }
    }
    let max = -1;
    for (let jj = -SEARCH_SIZE1; jj <= SEARCH_SIZE1; jj++) {
      for (let ii = -SEARCH_SIZE1; ii <= SEARCH_SIZE1; ii++) {
        if (ii * ii + jj * jj <= SEARCH_SIZE2 * SEARCH_SIZE2) continue;
        const sim = _getSimilarityOptimized({
          image,
          cx: x + ii,
          cy: y + jj,
          vlen,
          templateData,
          templateAvg,
          templateWidth,
          imageDataCumsum,
          imageDataSqrCumsum,
          width,
          height
        });
        if (sim !== null && sim > max) {
          max = sim;
          if (max > MAX_THRESH) break;
        }
      }
      if (max > MAX_THRESH) break;
    }
    if (max < MAX_THRESH) {
      let minUnique = 1;
      let maxUnique = -1;
      let failedUnique = false;
      for (let jj = -SEARCH_SIZE2; jj <= SEARCH_SIZE2; jj++) {
        for (let ii = -SEARCH_SIZE2; ii <= SEARCH_SIZE2; ii++) {
          if (ii * ii + jj * jj > SEARCH_SIZE2 * SEARCH_SIZE2) continue;
          if (ii === 0 && jj === 0) continue;
          const sim = _getSimilarityOptimized({
            image,
            vlen,
            cx: x + ii,
            cy: y + jj,
            templateData,
            templateAvg,
            templateWidth,
            imageDataCumsum,
            imageDataSqrCumsum,
            width,
            height
          });
          if (sim === null) continue;
          if (sim < minUnique) minUnique = sim;
          if (sim > maxUnique) maxUnique = sim;
          if (minUnique < MIN_THRESH || maxUnique > 0.99) {
            failedUnique = true;
            break;
          }
        }
        if (failedUnique) break;
      }
      if (!failedUnique) {
        coords.push({ x, y });
        for (let jj = -actualOccSize; jj <= actualOccSize; jj++) {
          const yy = y + jj;
          if (yy < 0 || yy >= height) continue;
          const rowStart = yy * width;
          for (let ii = -actualOccSize; ii <= actualOccSize; ii++) {
            const xx = x + ii;
            if (xx < 0 || xx >= width) continue;
            invalidated[rowStart + xx] = 1;
          }
        }
      }
    }
    if (coords.length >= maxFeatureNum) break;
  }
  return coords;
};
var _templateVar = ({ image, cx, cy, sdThresh, imageDataCumsum, imageDataSqrCumsum }) => {
  if (cx - TEMPLATE_SIZE < 0 || cx + TEMPLATE_SIZE >= image.width) return null;
  if (cy - TEMPLATE_SIZE < 0 || cy + TEMPLATE_SIZE >= image.height) return null;
  const templateWidth = 2 * TEMPLATE_SIZE + 1;
  const nPixels = templateWidth * templateWidth;
  let average = imageDataCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE
  );
  average /= nPixels;
  let vlen = imageDataSqrCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE
  );
  vlen -= 2 * average * imageDataCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE
  );
  vlen += nPixels * average * average;
  if (vlen / nPixels < sdThresh * sdThresh) return null;
  vlen = Math.sqrt(vlen);
  return vlen;
};
var _getSimilarityOptimized = (options) => {
  const { cx, cy, vlen, templateData, templateAvg, templateWidth, imageDataCumsum, imageDataSqrCumsum, width, height } = options;
  const imageData = options.image.data;
  const templateSize = (templateWidth - 1) / 2;
  if (cx - templateSize < 0 || cx + templateSize >= width) return null;
  if (cy - templateSize < 0 || cy + templateSize >= height) return null;
  const nP = templateWidth * templateWidth;
  const sx = imageDataCumsum.query(
    cx - templateSize,
    cy - templateSize,
    cx + templateSize,
    cy + templateSize
  );
  const sxx = imageDataSqrCumsum.query(
    cx - templateSize,
    cy - templateSize,
    cx + templateSize,
    cy + templateSize
  );
  let vlen2 = sxx - sx * sx / nP;
  if (vlen2 <= 0) return null;
  vlen2 = Math.sqrt(vlen2);
  let sxy = 0;
  const p1_start = (cy - templateSize) * width + (cx - templateSize);
  for (let j = 0; j < templateWidth; j++) {
    const rowOffset1 = p1_start + j * width;
    const rowOffset2 = j * templateWidth;
    for (let i = 0; i < templateWidth; i++) {
      sxy += imageData[rowOffset1 + i] * templateData[rowOffset2 + i];
    }
  }
  const sampledCount = templateWidth * templateWidth;
  const totalCount = templateWidth * templateWidth;
  sxy *= totalCount / sampledCount;
  const sxy_final = sxy - templateAvg * sx;
  return 1 * sxy_final / (vlen * vlen2);
};

// src/core/tracker/extract-utils.js
var extractTrackingFeatures = (imageList, doneCallback) => {
  const featureSets = [];
  for (let i = 0; i < imageList.length; i++) {
    const image = imageList[i];
    const points = extract(image);
    const featureSet = {
      data: image.data,
      scale: image.scale,
      width: image.width,
      height: image.height,
      points
    };
    featureSets.push(featureSet);
    doneCallback(i);
  }
  return featureSets;
};

// src/core/detector/freak.js
var FREAK_RINGS = [
  // ring 5
  {
    sigma: 0.55,
    points: [
      [-1, 0],
      [-0.5, -0.866025],
      [0.5, -0.866025],
      [1, -0],
      [0.5, 0.866025],
      [-0.5, 0.866025]
    ]
  },
  // ring 4
  {
    sigma: 0.475,
    points: [
      [0, 0.930969],
      [-0.806243, 0.465485],
      [-0.806243, -0.465485],
      [-0, -0.930969],
      [0.806243, -0.465485],
      [0.806243, 0.465485]
    ]
  },
  // ring 3
  {
    sigma: 0.4,
    points: [
      [0.847306, -0],
      [0.423653, 0.733789],
      [-0.423653, 0.733789],
      [-0.847306, 0],
      [-0.423653, -0.733789],
      [0.423653, -0.733789]
    ]
  },
  // ring 2
  {
    sigma: 0.325,
    points: [
      [-0, -0.741094],
      [0.641806, -0.370547],
      [0.641806, 0.370547],
      [0, 0.741094],
      [-0.641806, 0.370547],
      [-0.641806, -0.370547]
    ]
  },
  // ring 1
  {
    sigma: 0.25,
    points: [
      [-0.595502, 0],
      [-0.297751, -0.51572],
      [0.297751, -0.51572],
      [0.595502, -0],
      [0.297751, 0.51572],
      [-0.297751, 0.51572]
    ]
  },
  // ring 0
  {
    sigma: 0.175,
    points: [
      [0, 0.362783],
      [-0.314179, 0.181391],
      [-0.314179, -0.181391],
      [-0, -0.362783],
      [0.314179, -0.181391],
      [0.314179, 0.181391]
    ]
  },
  // center
  {
    sigma: 0.1,
    points: [[0, 0]]
  }
];
var FREAKPOINTS = [];
for (let r = 0; r < FREAK_RINGS.length; r++) {
  const sigma = FREAK_RINGS[r].sigma;
  for (let i = 0; i < FREAK_RINGS[r].points.length; i++) {
    const point = FREAK_RINGS[r].points[i];
    FREAKPOINTS.push([sigma, point[0], point[1]]);
  }
}

// src/core/utils/lsh-direct.js
var LSH_PAIRS = new Int32Array(64 * 2);
var SAMPLING_INDICES = new Int32Array(64);
for (let i = 0; i < 64; i++) {
  SAMPLING_INDICES[i] = Math.floor(i * (672 / 64));
}
var currentBit = 0;
var samplingIdx = 0;
for (let i = 0; i < FREAKPOINTS.length; i++) {
  for (let j = i + 1; j < FREAKPOINTS.length; j++) {
    if (samplingIdx < 64 && currentBit === SAMPLING_INDICES[samplingIdx]) {
      LSH_PAIRS[samplingIdx * 2] = i;
      LSH_PAIRS[samplingIdx * 2 + 1] = j;
      samplingIdx++;
    }
    currentBit++;
  }
}
function computeLSH64(samples) {
  const result = new Uint32Array(2);
  for (let i = 0; i < 64; i++) {
    const p1 = LSH_PAIRS[i * 2];
    const p2 = LSH_PAIRS[i * 2 + 1];
    if (samples[p1] < samples[p2]) {
      const uintIdx = i >> 5;
      const uintBitIdx = i & 31;
      result[uintIdx] |= 1 << uintBitIdx;
    }
  }
  return result;
}
function computeFullFREAK(samples) {
  const descriptor = new Uint8Array(84);
  let bitCount = 0;
  let byteIdx = 0;
  for (let i = 0; i < FREAKPOINTS.length; i++) {
    for (let j = i + 1; j < FREAKPOINTS.length; j++) {
      if (samples[i] < samples[j]) {
        descriptor[byteIdx] |= 1 << 7 - bitCount;
      }
      bitCount++;
      if (bitCount === 8) {
        byteIdx++;
        bitCount = 0;
      }
    }
  }
  return descriptor;
}
function packLSHIntoDescriptor(lsh) {
  const desc = new Uint8Array(8);
  const view = new DataView(desc.buffer);
  view.setUint32(0, lsh[0], true);
  view.setUint32(4, lsh[1], true);
  return desc;
}

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/utf8.mjs
function utf8Count(str) {
  const strLength = str.length;
  let byteLength = 0;
  let pos = 0;
  while (pos < strLength) {
    let value = str.charCodeAt(pos++);
    if ((value & 4294967168) === 0) {
      byteLength++;
      continue;
    } else if ((value & 4294965248) === 0) {
      byteLength += 2;
    } else {
      if (value >= 55296 && value <= 56319) {
        if (pos < strLength) {
          const extra = str.charCodeAt(pos);
          if ((extra & 64512) === 56320) {
            ++pos;
            value = ((value & 1023) << 10) + (extra & 1023) + 65536;
          }
        }
      }
      if ((value & 4294901760) === 0) {
        byteLength += 3;
      } else {
        byteLength += 4;
      }
    }
  }
  return byteLength;
}
function utf8EncodeJs(str, output, outputOffset) {
  const strLength = str.length;
  let offset = outputOffset;
  let pos = 0;
  while (pos < strLength) {
    let value = str.charCodeAt(pos++);
    if ((value & 4294967168) === 0) {
      output[offset++] = value;
      continue;
    } else if ((value & 4294965248) === 0) {
      output[offset++] = value >> 6 & 31 | 192;
    } else {
      if (value >= 55296 && value <= 56319) {
        if (pos < strLength) {
          const extra = str.charCodeAt(pos);
          if ((extra & 64512) === 56320) {
            ++pos;
            value = ((value & 1023) << 10) + (extra & 1023) + 65536;
          }
        }
      }
      if ((value & 4294901760) === 0) {
        output[offset++] = value >> 12 & 15 | 224;
        output[offset++] = value >> 6 & 63 | 128;
      } else {
        output[offset++] = value >> 18 & 7 | 240;
        output[offset++] = value >> 12 & 63 | 128;
        output[offset++] = value >> 6 & 63 | 128;
      }
    }
    output[offset++] = value & 63 | 128;
  }
}
var sharedTextEncoder = new TextEncoder();
var TEXT_ENCODER_THRESHOLD = 50;
function utf8EncodeTE(str, output, outputOffset) {
  sharedTextEncoder.encodeInto(str, output.subarray(outputOffset));
}
function utf8Encode(str, output, outputOffset) {
  if (str.length > TEXT_ENCODER_THRESHOLD) {
    utf8EncodeTE(str, output, outputOffset);
  } else {
    utf8EncodeJs(str, output, outputOffset);
  }
}
var CHUNK_SIZE = 4096;
function utf8DecodeJs(bytes, inputOffset, byteLength) {
  let offset = inputOffset;
  const end = offset + byteLength;
  const units = [];
  let result = "";
  while (offset < end) {
    const byte1 = bytes[offset++];
    if ((byte1 & 128) === 0) {
      units.push(byte1);
    } else if ((byte1 & 224) === 192) {
      const byte2 = bytes[offset++] & 63;
      units.push((byte1 & 31) << 6 | byte2);
    } else if ((byte1 & 240) === 224) {
      const byte2 = bytes[offset++] & 63;
      const byte3 = bytes[offset++] & 63;
      units.push((byte1 & 31) << 12 | byte2 << 6 | byte3);
    } else if ((byte1 & 248) === 240) {
      const byte2 = bytes[offset++] & 63;
      const byte3 = bytes[offset++] & 63;
      const byte4 = bytes[offset++] & 63;
      let unit = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
      if (unit > 65535) {
        unit -= 65536;
        units.push(unit >>> 10 & 1023 | 55296);
        unit = 56320 | unit & 1023;
      }
      units.push(unit);
    } else {
      units.push(byte1);
    }
    if (units.length >= CHUNK_SIZE) {
      result += String.fromCharCode(...units);
      units.length = 0;
    }
  }
  if (units.length > 0) {
    result += String.fromCharCode(...units);
  }
  return result;
}
var sharedTextDecoder = new TextDecoder();
var TEXT_DECODER_THRESHOLD = 200;
function utf8DecodeTD(bytes, inputOffset, byteLength) {
  const stringBytes = bytes.subarray(inputOffset, inputOffset + byteLength);
  return sharedTextDecoder.decode(stringBytes);
}
function utf8Decode(bytes, inputOffset, byteLength) {
  if (byteLength > TEXT_DECODER_THRESHOLD) {
    return utf8DecodeTD(bytes, inputOffset, byteLength);
  } else {
    return utf8DecodeJs(bytes, inputOffset, byteLength);
  }
}

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/ExtData.mjs
var ExtData = class {
  type;
  data;
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }
};

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/DecodeError.mjs
var DecodeError = class _DecodeError extends Error {
  constructor(message) {
    super(message);
    const proto = Object.create(_DecodeError.prototype);
    Object.setPrototypeOf(this, proto);
    Object.defineProperty(this, "name", {
      configurable: true,
      enumerable: false,
      value: _DecodeError.name
    });
  }
};

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/int.mjs
var UINT32_MAX = 4294967295;
function setUint64(view, offset, value) {
  const high = value / 4294967296;
  const low = value;
  view.setUint32(offset, high);
  view.setUint32(offset + 4, low);
}
function setInt64(view, offset, value) {
  const high = Math.floor(value / 4294967296);
  const low = value;
  view.setUint32(offset, high);
  view.setUint32(offset + 4, low);
}
function getInt64(view, offset) {
  const high = view.getInt32(offset);
  const low = view.getUint32(offset + 4);
  return high * 4294967296 + low;
}
function getUint64(view, offset) {
  const high = view.getUint32(offset);
  const low = view.getUint32(offset + 4);
  return high * 4294967296 + low;
}

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/timestamp.mjs
var EXT_TIMESTAMP = -1;
var TIMESTAMP32_MAX_SEC = 4294967296 - 1;
var TIMESTAMP64_MAX_SEC = 17179869184 - 1;
function encodeTimeSpecToTimestamp({ sec, nsec }) {
  if (sec >= 0 && nsec >= 0 && sec <= TIMESTAMP64_MAX_SEC) {
    if (nsec === 0 && sec <= TIMESTAMP32_MAX_SEC) {
      const rv = new Uint8Array(4);
      const view = new DataView(rv.buffer);
      view.setUint32(0, sec);
      return rv;
    } else {
      const secHigh = sec / 4294967296;
      const secLow = sec & 4294967295;
      const rv = new Uint8Array(8);
      const view = new DataView(rv.buffer);
      view.setUint32(0, nsec << 2 | secHigh & 3);
      view.setUint32(4, secLow);
      return rv;
    }
  } else {
    const rv = new Uint8Array(12);
    const view = new DataView(rv.buffer);
    view.setUint32(0, nsec);
    setInt64(view, 4, sec);
    return rv;
  }
}
function encodeDateToTimeSpec(date) {
  const msec = date.getTime();
  const sec = Math.floor(msec / 1e3);
  const nsec = (msec - sec * 1e3) * 1e6;
  const nsecInSec = Math.floor(nsec / 1e9);
  return {
    sec: sec + nsecInSec,
    nsec: nsec - nsecInSec * 1e9
  };
}
function encodeTimestampExtension(object) {
  if (object instanceof Date) {
    const timeSpec = encodeDateToTimeSpec(object);
    return encodeTimeSpecToTimestamp(timeSpec);
  } else {
    return null;
  }
}
function decodeTimestampToTimeSpec(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  switch (data.byteLength) {
    case 4: {
      const sec = view.getUint32(0);
      const nsec = 0;
      return { sec, nsec };
    }
    case 8: {
      const nsec30AndSecHigh2 = view.getUint32(0);
      const secLow32 = view.getUint32(4);
      const sec = (nsec30AndSecHigh2 & 3) * 4294967296 + secLow32;
      const nsec = nsec30AndSecHigh2 >>> 2;
      return { sec, nsec };
    }
    case 12: {
      const sec = getInt64(view, 4);
      const nsec = view.getUint32(0);
      return { sec, nsec };
    }
    default:
      throw new DecodeError(`Unrecognized data size for timestamp (expected 4, 8, or 12): ${data.length}`);
  }
}
function decodeTimestampExtension(data) {
  const timeSpec = decodeTimestampToTimeSpec(data);
  return new Date(timeSpec.sec * 1e3 + timeSpec.nsec / 1e6);
}
var timestampExtension = {
  type: EXT_TIMESTAMP,
  encode: encodeTimestampExtension,
  decode: decodeTimestampExtension
};

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/ExtensionCodec.mjs
var ExtensionCodec = class _ExtensionCodec {
  static defaultCodec = new _ExtensionCodec();
  // ensures ExtensionCodecType<X> matches ExtensionCodec<X>
  // this will make type errors a lot more clear
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __brand;
  // built-in extensions
  builtInEncoders = [];
  builtInDecoders = [];
  // custom extensions
  encoders = [];
  decoders = [];
  constructor() {
    this.register(timestampExtension);
  }
  register({ type, encode: encode2, decode: decode2 }) {
    if (type >= 0) {
      this.encoders[type] = encode2;
      this.decoders[type] = decode2;
    } else {
      const index = -1 - type;
      this.builtInEncoders[index] = encode2;
      this.builtInDecoders[index] = decode2;
    }
  }
  tryToEncode(object, context) {
    for (let i = 0; i < this.builtInEncoders.length; i++) {
      const encodeExt = this.builtInEncoders[i];
      if (encodeExt != null) {
        const data = encodeExt(object, context);
        if (data != null) {
          const type = -1 - i;
          return new ExtData(type, data);
        }
      }
    }
    for (let i = 0; i < this.encoders.length; i++) {
      const encodeExt = this.encoders[i];
      if (encodeExt != null) {
        const data = encodeExt(object, context);
        if (data != null) {
          const type = i;
          return new ExtData(type, data);
        }
      }
    }
    if (object instanceof ExtData) {
      return object;
    }
    return null;
  }
  decode(data, type, context) {
    const decodeExt = type < 0 ? this.builtInDecoders[-1 - type] : this.decoders[type];
    if (decodeExt) {
      return decodeExt(data, type, context);
    } else {
      return new ExtData(type, data);
    }
  }
};

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/typedArrays.mjs
function isArrayBufferLike(buffer) {
  return buffer instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && buffer instanceof SharedArrayBuffer;
}
function ensureUint8Array(buffer) {
  if (buffer instanceof Uint8Array) {
    return buffer;
  } else if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else if (isArrayBufferLike(buffer)) {
    return new Uint8Array(buffer);
  } else {
    return Uint8Array.from(buffer);
  }
}

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/Encoder.mjs
var DEFAULT_MAX_DEPTH = 100;
var DEFAULT_INITIAL_BUFFER_SIZE = 2048;
var Encoder = class _Encoder {
  extensionCodec;
  context;
  useBigInt64;
  maxDepth;
  initialBufferSize;
  sortKeys;
  forceFloat32;
  ignoreUndefined;
  forceIntegerToFloat;
  pos;
  view;
  bytes;
  entered = false;
  constructor(options) {
    this.extensionCodec = options?.extensionCodec ?? ExtensionCodec.defaultCodec;
    this.context = options?.context;
    this.useBigInt64 = options?.useBigInt64 ?? false;
    this.maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.initialBufferSize = options?.initialBufferSize ?? DEFAULT_INITIAL_BUFFER_SIZE;
    this.sortKeys = options?.sortKeys ?? false;
    this.forceFloat32 = options?.forceFloat32 ?? false;
    this.ignoreUndefined = options?.ignoreUndefined ?? false;
    this.forceIntegerToFloat = options?.forceIntegerToFloat ?? false;
    this.pos = 0;
    this.view = new DataView(new ArrayBuffer(this.initialBufferSize));
    this.bytes = new Uint8Array(this.view.buffer);
  }
  clone() {
    return new _Encoder({
      extensionCodec: this.extensionCodec,
      context: this.context,
      useBigInt64: this.useBigInt64,
      maxDepth: this.maxDepth,
      initialBufferSize: this.initialBufferSize,
      sortKeys: this.sortKeys,
      forceFloat32: this.forceFloat32,
      ignoreUndefined: this.ignoreUndefined,
      forceIntegerToFloat: this.forceIntegerToFloat
    });
  }
  reinitializeState() {
    this.pos = 0;
  }
  /**
   * This is almost equivalent to {@link Encoder#encode}, but it returns an reference of the encoder's internal buffer and thus much faster than {@link Encoder#encode}.
   *
   * @returns Encodes the object and returns a shared reference the encoder's internal buffer.
   */
  encodeSharedRef(object) {
    if (this.entered) {
      const instance = this.clone();
      return instance.encodeSharedRef(object);
    }
    try {
      this.entered = true;
      this.reinitializeState();
      this.doEncode(object, 1);
      return this.bytes.subarray(0, this.pos);
    } finally {
      this.entered = false;
    }
  }
  /**
   * @returns Encodes the object and returns a copy of the encoder's internal buffer.
   */
  encode(object) {
    if (this.entered) {
      const instance = this.clone();
      return instance.encode(object);
    }
    try {
      this.entered = true;
      this.reinitializeState();
      this.doEncode(object, 1);
      return this.bytes.slice(0, this.pos);
    } finally {
      this.entered = false;
    }
  }
  doEncode(object, depth) {
    if (depth > this.maxDepth) {
      throw new Error(`Too deep objects in depth ${depth}`);
    }
    if (object == null) {
      this.encodeNil();
    } else if (typeof object === "boolean") {
      this.encodeBoolean(object);
    } else if (typeof object === "number") {
      if (!this.forceIntegerToFloat) {
        this.encodeNumber(object);
      } else {
        this.encodeNumberAsFloat(object);
      }
    } else if (typeof object === "string") {
      this.encodeString(object);
    } else if (this.useBigInt64 && typeof object === "bigint") {
      this.encodeBigInt64(object);
    } else {
      this.encodeObject(object, depth);
    }
  }
  ensureBufferSizeToWrite(sizeToWrite) {
    const requiredSize = this.pos + sizeToWrite;
    if (this.view.byteLength < requiredSize) {
      this.resizeBuffer(requiredSize * 2);
    }
  }
  resizeBuffer(newSize) {
    const newBuffer = new ArrayBuffer(newSize);
    const newBytes = new Uint8Array(newBuffer);
    const newView = new DataView(newBuffer);
    newBytes.set(this.bytes);
    this.view = newView;
    this.bytes = newBytes;
  }
  encodeNil() {
    this.writeU8(192);
  }
  encodeBoolean(object) {
    if (object === false) {
      this.writeU8(194);
    } else {
      this.writeU8(195);
    }
  }
  encodeNumber(object) {
    if (!this.forceIntegerToFloat && Number.isSafeInteger(object)) {
      if (object >= 0) {
        if (object < 128) {
          this.writeU8(object);
        } else if (object < 256) {
          this.writeU8(204);
          this.writeU8(object);
        } else if (object < 65536) {
          this.writeU8(205);
          this.writeU16(object);
        } else if (object < 4294967296) {
          this.writeU8(206);
          this.writeU32(object);
        } else if (!this.useBigInt64) {
          this.writeU8(207);
          this.writeU64(object);
        } else {
          this.encodeNumberAsFloat(object);
        }
      } else {
        if (object >= -32) {
          this.writeU8(224 | object + 32);
        } else if (object >= -128) {
          this.writeU8(208);
          this.writeI8(object);
        } else if (object >= -32768) {
          this.writeU8(209);
          this.writeI16(object);
        } else if (object >= -2147483648) {
          this.writeU8(210);
          this.writeI32(object);
        } else if (!this.useBigInt64) {
          this.writeU8(211);
          this.writeI64(object);
        } else {
          this.encodeNumberAsFloat(object);
        }
      }
    } else {
      this.encodeNumberAsFloat(object);
    }
  }
  encodeNumberAsFloat(object) {
    if (this.forceFloat32) {
      this.writeU8(202);
      this.writeF32(object);
    } else {
      this.writeU8(203);
      this.writeF64(object);
    }
  }
  encodeBigInt64(object) {
    if (object >= BigInt(0)) {
      this.writeU8(207);
      this.writeBigUint64(object);
    } else {
      this.writeU8(211);
      this.writeBigInt64(object);
    }
  }
  writeStringHeader(byteLength) {
    if (byteLength < 32) {
      this.writeU8(160 + byteLength);
    } else if (byteLength < 256) {
      this.writeU8(217);
      this.writeU8(byteLength);
    } else if (byteLength < 65536) {
      this.writeU8(218);
      this.writeU16(byteLength);
    } else if (byteLength < 4294967296) {
      this.writeU8(219);
      this.writeU32(byteLength);
    } else {
      throw new Error(`Too long string: ${byteLength} bytes in UTF-8`);
    }
  }
  encodeString(object) {
    const maxHeaderSize = 1 + 4;
    const byteLength = utf8Count(object);
    this.ensureBufferSizeToWrite(maxHeaderSize + byteLength);
    this.writeStringHeader(byteLength);
    utf8Encode(object, this.bytes, this.pos);
    this.pos += byteLength;
  }
  encodeObject(object, depth) {
    const ext = this.extensionCodec.tryToEncode(object, this.context);
    if (ext != null) {
      this.encodeExtension(ext);
    } else if (Array.isArray(object)) {
      this.encodeArray(object, depth);
    } else if (ArrayBuffer.isView(object)) {
      this.encodeBinary(object);
    } else if (typeof object === "object") {
      this.encodeMap(object, depth);
    } else {
      throw new Error(`Unrecognized object: ${Object.prototype.toString.apply(object)}`);
    }
  }
  encodeBinary(object) {
    const size = object.byteLength;
    if (size < 256) {
      this.writeU8(196);
      this.writeU8(size);
    } else if (size < 65536) {
      this.writeU8(197);
      this.writeU16(size);
    } else if (size < 4294967296) {
      this.writeU8(198);
      this.writeU32(size);
    } else {
      throw new Error(`Too large binary: ${size}`);
    }
    const bytes = ensureUint8Array(object);
    this.writeU8a(bytes);
  }
  encodeArray(object, depth) {
    const size = object.length;
    if (size < 16) {
      this.writeU8(144 + size);
    } else if (size < 65536) {
      this.writeU8(220);
      this.writeU16(size);
    } else if (size < 4294967296) {
      this.writeU8(221);
      this.writeU32(size);
    } else {
      throw new Error(`Too large array: ${size}`);
    }
    for (const item of object) {
      this.doEncode(item, depth + 1);
    }
  }
  countWithoutUndefined(object, keys) {
    let count = 0;
    for (const key of keys) {
      if (object[key] !== void 0) {
        count++;
      }
    }
    return count;
  }
  encodeMap(object, depth) {
    const keys = Object.keys(object);
    if (this.sortKeys) {
      keys.sort();
    }
    const size = this.ignoreUndefined ? this.countWithoutUndefined(object, keys) : keys.length;
    if (size < 16) {
      this.writeU8(128 + size);
    } else if (size < 65536) {
      this.writeU8(222);
      this.writeU16(size);
    } else if (size < 4294967296) {
      this.writeU8(223);
      this.writeU32(size);
    } else {
      throw new Error(`Too large map object: ${size}`);
    }
    for (const key of keys) {
      const value = object[key];
      if (!(this.ignoreUndefined && value === void 0)) {
        this.encodeString(key);
        this.doEncode(value, depth + 1);
      }
    }
  }
  encodeExtension(ext) {
    if (typeof ext.data === "function") {
      const data = ext.data(this.pos + 6);
      const size2 = data.length;
      if (size2 >= 4294967296) {
        throw new Error(`Too large extension object: ${size2}`);
      }
      this.writeU8(201);
      this.writeU32(size2);
      this.writeI8(ext.type);
      this.writeU8a(data);
      return;
    }
    const size = ext.data.length;
    if (size === 1) {
      this.writeU8(212);
    } else if (size === 2) {
      this.writeU8(213);
    } else if (size === 4) {
      this.writeU8(214);
    } else if (size === 8) {
      this.writeU8(215);
    } else if (size === 16) {
      this.writeU8(216);
    } else if (size < 256) {
      this.writeU8(199);
      this.writeU8(size);
    } else if (size < 65536) {
      this.writeU8(200);
      this.writeU16(size);
    } else if (size < 4294967296) {
      this.writeU8(201);
      this.writeU32(size);
    } else {
      throw new Error(`Too large extension object: ${size}`);
    }
    this.writeI8(ext.type);
    this.writeU8a(ext.data);
  }
  writeU8(value) {
    this.ensureBufferSizeToWrite(1);
    this.view.setUint8(this.pos, value);
    this.pos++;
  }
  writeU8a(values) {
    const size = values.length;
    this.ensureBufferSizeToWrite(size);
    this.bytes.set(values, this.pos);
    this.pos += size;
  }
  writeI8(value) {
    this.ensureBufferSizeToWrite(1);
    this.view.setInt8(this.pos, value);
    this.pos++;
  }
  writeU16(value) {
    this.ensureBufferSizeToWrite(2);
    this.view.setUint16(this.pos, value);
    this.pos += 2;
  }
  writeI16(value) {
    this.ensureBufferSizeToWrite(2);
    this.view.setInt16(this.pos, value);
    this.pos += 2;
  }
  writeU32(value) {
    this.ensureBufferSizeToWrite(4);
    this.view.setUint32(this.pos, value);
    this.pos += 4;
  }
  writeI32(value) {
    this.ensureBufferSizeToWrite(4);
    this.view.setInt32(this.pos, value);
    this.pos += 4;
  }
  writeF32(value) {
    this.ensureBufferSizeToWrite(4);
    this.view.setFloat32(this.pos, value);
    this.pos += 4;
  }
  writeF64(value) {
    this.ensureBufferSizeToWrite(8);
    this.view.setFloat64(this.pos, value);
    this.pos += 8;
  }
  writeU64(value) {
    this.ensureBufferSizeToWrite(8);
    setUint64(this.view, this.pos, value);
    this.pos += 8;
  }
  writeI64(value) {
    this.ensureBufferSizeToWrite(8);
    setInt64(this.view, this.pos, value);
    this.pos += 8;
  }
  writeBigUint64(value) {
    this.ensureBufferSizeToWrite(8);
    this.view.setBigUint64(this.pos, value);
    this.pos += 8;
  }
  writeBigInt64(value) {
    this.ensureBufferSizeToWrite(8);
    this.view.setBigInt64(this.pos, value);
    this.pos += 8;
  }
};

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/encode.mjs
function encode(value, options) {
  const encoder = new Encoder(options);
  return encoder.encodeSharedRef(value);
}

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/utils/prettyByte.mjs
function prettyByte(byte) {
  return `${byte < 0 ? "-" : ""}0x${Math.abs(byte).toString(16).padStart(2, "0")}`;
}

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/CachedKeyDecoder.mjs
var DEFAULT_MAX_KEY_LENGTH = 16;
var DEFAULT_MAX_LENGTH_PER_KEY = 16;
var CachedKeyDecoder = class {
  hit = 0;
  miss = 0;
  caches;
  maxKeyLength;
  maxLengthPerKey;
  constructor(maxKeyLength = DEFAULT_MAX_KEY_LENGTH, maxLengthPerKey = DEFAULT_MAX_LENGTH_PER_KEY) {
    this.maxKeyLength = maxKeyLength;
    this.maxLengthPerKey = maxLengthPerKey;
    this.caches = [];
    for (let i = 0; i < this.maxKeyLength; i++) {
      this.caches.push([]);
    }
  }
  canBeCached(byteLength) {
    return byteLength > 0 && byteLength <= this.maxKeyLength;
  }
  find(bytes, inputOffset, byteLength) {
    const records = this.caches[byteLength - 1];
    FIND_CHUNK: for (const record of records) {
      const recordBytes = record.bytes;
      for (let j = 0; j < byteLength; j++) {
        if (recordBytes[j] !== bytes[inputOffset + j]) {
          continue FIND_CHUNK;
        }
      }
      return record.str;
    }
    return null;
  }
  store(bytes, value) {
    const records = this.caches[bytes.length - 1];
    const record = { bytes, str: value };
    if (records.length >= this.maxLengthPerKey) {
      records[Math.random() * records.length | 0] = record;
    } else {
      records.push(record);
    }
  }
  decode(bytes, inputOffset, byteLength) {
    const cachedValue = this.find(bytes, inputOffset, byteLength);
    if (cachedValue != null) {
      this.hit++;
      return cachedValue;
    }
    this.miss++;
    const str = utf8DecodeJs(bytes, inputOffset, byteLength);
    const slicedCopyOfBytes = Uint8Array.prototype.slice.call(bytes, inputOffset, inputOffset + byteLength);
    this.store(slicedCopyOfBytes, str);
    return str;
  }
};

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/Decoder.mjs
var STATE_ARRAY = "array";
var STATE_MAP_KEY = "map_key";
var STATE_MAP_VALUE = "map_value";
var mapKeyConverter = (key) => {
  if (typeof key === "string" || typeof key === "number") {
    return key;
  }
  throw new DecodeError("The type of key must be string or number but " + typeof key);
};
var StackPool = class {
  stack = [];
  stackHeadPosition = -1;
  get length() {
    return this.stackHeadPosition + 1;
  }
  top() {
    return this.stack[this.stackHeadPosition];
  }
  pushArrayState(size) {
    const state = this.getUninitializedStateFromPool();
    state.type = STATE_ARRAY;
    state.position = 0;
    state.size = size;
    state.array = new Array(size);
  }
  pushMapState(size) {
    const state = this.getUninitializedStateFromPool();
    state.type = STATE_MAP_KEY;
    state.readCount = 0;
    state.size = size;
    state.map = {};
  }
  getUninitializedStateFromPool() {
    this.stackHeadPosition++;
    if (this.stackHeadPosition === this.stack.length) {
      const partialState = {
        type: void 0,
        size: 0,
        array: void 0,
        position: 0,
        readCount: 0,
        map: void 0,
        key: null
      };
      this.stack.push(partialState);
    }
    return this.stack[this.stackHeadPosition];
  }
  release(state) {
    const topStackState = this.stack[this.stackHeadPosition];
    if (topStackState !== state) {
      throw new Error("Invalid stack state. Released state is not on top of the stack.");
    }
    if (state.type === STATE_ARRAY) {
      const partialState = state;
      partialState.size = 0;
      partialState.array = void 0;
      partialState.position = 0;
      partialState.type = void 0;
    }
    if (state.type === STATE_MAP_KEY || state.type === STATE_MAP_VALUE) {
      const partialState = state;
      partialState.size = 0;
      partialState.map = void 0;
      partialState.readCount = 0;
      partialState.type = void 0;
    }
    this.stackHeadPosition--;
  }
  reset() {
    this.stack.length = 0;
    this.stackHeadPosition = -1;
  }
};
var HEAD_BYTE_REQUIRED = -1;
var EMPTY_VIEW = new DataView(new ArrayBuffer(0));
var EMPTY_BYTES = new Uint8Array(EMPTY_VIEW.buffer);
try {
  EMPTY_VIEW.getInt8(0);
} catch (e) {
  if (!(e instanceof RangeError)) {
    throw new Error("This module is not supported in the current JavaScript engine because DataView does not throw RangeError on out-of-bounds access");
  }
}
var MORE_DATA = new RangeError("Insufficient data");
var sharedCachedKeyDecoder = new CachedKeyDecoder();
var Decoder = class _Decoder {
  extensionCodec;
  context;
  useBigInt64;
  rawStrings;
  maxStrLength;
  maxBinLength;
  maxArrayLength;
  maxMapLength;
  maxExtLength;
  keyDecoder;
  mapKeyConverter;
  totalPos = 0;
  pos = 0;
  view = EMPTY_VIEW;
  bytes = EMPTY_BYTES;
  headByte = HEAD_BYTE_REQUIRED;
  stack = new StackPool();
  entered = false;
  constructor(options) {
    this.extensionCodec = options?.extensionCodec ?? ExtensionCodec.defaultCodec;
    this.context = options?.context;
    this.useBigInt64 = options?.useBigInt64 ?? false;
    this.rawStrings = options?.rawStrings ?? false;
    this.maxStrLength = options?.maxStrLength ?? UINT32_MAX;
    this.maxBinLength = options?.maxBinLength ?? UINT32_MAX;
    this.maxArrayLength = options?.maxArrayLength ?? UINT32_MAX;
    this.maxMapLength = options?.maxMapLength ?? UINT32_MAX;
    this.maxExtLength = options?.maxExtLength ?? UINT32_MAX;
    this.keyDecoder = options?.keyDecoder !== void 0 ? options.keyDecoder : sharedCachedKeyDecoder;
    this.mapKeyConverter = options?.mapKeyConverter ?? mapKeyConverter;
  }
  clone() {
    return new _Decoder({
      extensionCodec: this.extensionCodec,
      context: this.context,
      useBigInt64: this.useBigInt64,
      rawStrings: this.rawStrings,
      maxStrLength: this.maxStrLength,
      maxBinLength: this.maxBinLength,
      maxArrayLength: this.maxArrayLength,
      maxMapLength: this.maxMapLength,
      maxExtLength: this.maxExtLength,
      keyDecoder: this.keyDecoder
    });
  }
  reinitializeState() {
    this.totalPos = 0;
    this.headByte = HEAD_BYTE_REQUIRED;
    this.stack.reset();
  }
  setBuffer(buffer) {
    const bytes = ensureUint8Array(buffer);
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.pos = 0;
  }
  appendBuffer(buffer) {
    if (this.headByte === HEAD_BYTE_REQUIRED && !this.hasRemaining(1)) {
      this.setBuffer(buffer);
    } else {
      const remainingData = this.bytes.subarray(this.pos);
      const newData = ensureUint8Array(buffer);
      const newBuffer = new Uint8Array(remainingData.length + newData.length);
      newBuffer.set(remainingData);
      newBuffer.set(newData, remainingData.length);
      this.setBuffer(newBuffer);
    }
  }
  hasRemaining(size) {
    return this.view.byteLength - this.pos >= size;
  }
  createExtraByteError(posToShow) {
    const { view, pos } = this;
    return new RangeError(`Extra ${view.byteLength - pos} of ${view.byteLength} byte(s) found at buffer[${posToShow}]`);
  }
  /**
   * @throws {@link DecodeError}
   * @throws {@link RangeError}
   */
  decode(buffer) {
    if (this.entered) {
      const instance = this.clone();
      return instance.decode(buffer);
    }
    try {
      this.entered = true;
      this.reinitializeState();
      this.setBuffer(buffer);
      const object = this.doDecodeSync();
      if (this.hasRemaining(1)) {
        throw this.createExtraByteError(this.pos);
      }
      return object;
    } finally {
      this.entered = false;
    }
  }
  *decodeMulti(buffer) {
    if (this.entered) {
      const instance = this.clone();
      yield* instance.decodeMulti(buffer);
      return;
    }
    try {
      this.entered = true;
      this.reinitializeState();
      this.setBuffer(buffer);
      while (this.hasRemaining(1)) {
        yield this.doDecodeSync();
      }
    } finally {
      this.entered = false;
    }
  }
  async decodeAsync(stream) {
    if (this.entered) {
      const instance = this.clone();
      return instance.decodeAsync(stream);
    }
    try {
      this.entered = true;
      let decoded = false;
      let object;
      for await (const buffer of stream) {
        if (decoded) {
          this.entered = false;
          throw this.createExtraByteError(this.totalPos);
        }
        this.appendBuffer(buffer);
        try {
          object = this.doDecodeSync();
          decoded = true;
        } catch (e) {
          if (!(e instanceof RangeError)) {
            throw e;
          }
        }
        this.totalPos += this.pos;
      }
      if (decoded) {
        if (this.hasRemaining(1)) {
          throw this.createExtraByteError(this.totalPos);
        }
        return object;
      }
      const { headByte, pos, totalPos } = this;
      throw new RangeError(`Insufficient data in parsing ${prettyByte(headByte)} at ${totalPos} (${pos} in the current buffer)`);
    } finally {
      this.entered = false;
    }
  }
  decodeArrayStream(stream) {
    return this.decodeMultiAsync(stream, true);
  }
  decodeStream(stream) {
    return this.decodeMultiAsync(stream, false);
  }
  async *decodeMultiAsync(stream, isArray) {
    if (this.entered) {
      const instance = this.clone();
      yield* instance.decodeMultiAsync(stream, isArray);
      return;
    }
    try {
      this.entered = true;
      let isArrayHeaderRequired = isArray;
      let arrayItemsLeft = -1;
      for await (const buffer of stream) {
        if (isArray && arrayItemsLeft === 0) {
          throw this.createExtraByteError(this.totalPos);
        }
        this.appendBuffer(buffer);
        if (isArrayHeaderRequired) {
          arrayItemsLeft = this.readArraySize();
          isArrayHeaderRequired = false;
          this.complete();
        }
        try {
          while (true) {
            yield this.doDecodeSync();
            if (--arrayItemsLeft === 0) {
              break;
            }
          }
        } catch (e) {
          if (!(e instanceof RangeError)) {
            throw e;
          }
        }
        this.totalPos += this.pos;
      }
    } finally {
      this.entered = false;
    }
  }
  doDecodeSync() {
    DECODE: while (true) {
      const headByte = this.readHeadByte();
      let object;
      if (headByte >= 224) {
        object = headByte - 256;
      } else if (headByte < 192) {
        if (headByte < 128) {
          object = headByte;
        } else if (headByte < 144) {
          const size = headByte - 128;
          if (size !== 0) {
            this.pushMapState(size);
            this.complete();
            continue DECODE;
          } else {
            object = {};
          }
        } else if (headByte < 160) {
          const size = headByte - 144;
          if (size !== 0) {
            this.pushArrayState(size);
            this.complete();
            continue DECODE;
          } else {
            object = [];
          }
        } else {
          const byteLength = headByte - 160;
          object = this.decodeString(byteLength, 0);
        }
      } else if (headByte === 192) {
        object = null;
      } else if (headByte === 194) {
        object = false;
      } else if (headByte === 195) {
        object = true;
      } else if (headByte === 202) {
        object = this.readF32();
      } else if (headByte === 203) {
        object = this.readF64();
      } else if (headByte === 204) {
        object = this.readU8();
      } else if (headByte === 205) {
        object = this.readU16();
      } else if (headByte === 206) {
        object = this.readU32();
      } else if (headByte === 207) {
        if (this.useBigInt64) {
          object = this.readU64AsBigInt();
        } else {
          object = this.readU64();
        }
      } else if (headByte === 208) {
        object = this.readI8();
      } else if (headByte === 209) {
        object = this.readI16();
      } else if (headByte === 210) {
        object = this.readI32();
      } else if (headByte === 211) {
        if (this.useBigInt64) {
          object = this.readI64AsBigInt();
        } else {
          object = this.readI64();
        }
      } else if (headByte === 217) {
        const byteLength = this.lookU8();
        object = this.decodeString(byteLength, 1);
      } else if (headByte === 218) {
        const byteLength = this.lookU16();
        object = this.decodeString(byteLength, 2);
      } else if (headByte === 219) {
        const byteLength = this.lookU32();
        object = this.decodeString(byteLength, 4);
      } else if (headByte === 220) {
        const size = this.readU16();
        if (size !== 0) {
          this.pushArrayState(size);
          this.complete();
          continue DECODE;
        } else {
          object = [];
        }
      } else if (headByte === 221) {
        const size = this.readU32();
        if (size !== 0) {
          this.pushArrayState(size);
          this.complete();
          continue DECODE;
        } else {
          object = [];
        }
      } else if (headByte === 222) {
        const size = this.readU16();
        if (size !== 0) {
          this.pushMapState(size);
          this.complete();
          continue DECODE;
        } else {
          object = {};
        }
      } else if (headByte === 223) {
        const size = this.readU32();
        if (size !== 0) {
          this.pushMapState(size);
          this.complete();
          continue DECODE;
        } else {
          object = {};
        }
      } else if (headByte === 196) {
        const size = this.lookU8();
        object = this.decodeBinary(size, 1);
      } else if (headByte === 197) {
        const size = this.lookU16();
        object = this.decodeBinary(size, 2);
      } else if (headByte === 198) {
        const size = this.lookU32();
        object = this.decodeBinary(size, 4);
      } else if (headByte === 212) {
        object = this.decodeExtension(1, 0);
      } else if (headByte === 213) {
        object = this.decodeExtension(2, 0);
      } else if (headByte === 214) {
        object = this.decodeExtension(4, 0);
      } else if (headByte === 215) {
        object = this.decodeExtension(8, 0);
      } else if (headByte === 216) {
        object = this.decodeExtension(16, 0);
      } else if (headByte === 199) {
        const size = this.lookU8();
        object = this.decodeExtension(size, 1);
      } else if (headByte === 200) {
        const size = this.lookU16();
        object = this.decodeExtension(size, 2);
      } else if (headByte === 201) {
        const size = this.lookU32();
        object = this.decodeExtension(size, 4);
      } else {
        throw new DecodeError(`Unrecognized type byte: ${prettyByte(headByte)}`);
      }
      this.complete();
      const stack = this.stack;
      while (stack.length > 0) {
        const state = stack.top();
        if (state.type === STATE_ARRAY) {
          state.array[state.position] = object;
          state.position++;
          if (state.position === state.size) {
            object = state.array;
            stack.release(state);
          } else {
            continue DECODE;
          }
        } else if (state.type === STATE_MAP_KEY) {
          if (object === "__proto__") {
            throw new DecodeError("The key __proto__ is not allowed");
          }
          state.key = this.mapKeyConverter(object);
          state.type = STATE_MAP_VALUE;
          continue DECODE;
        } else {
          state.map[state.key] = object;
          state.readCount++;
          if (state.readCount === state.size) {
            object = state.map;
            stack.release(state);
          } else {
            state.key = null;
            state.type = STATE_MAP_KEY;
            continue DECODE;
          }
        }
      }
      return object;
    }
  }
  readHeadByte() {
    if (this.headByte === HEAD_BYTE_REQUIRED) {
      this.headByte = this.readU8();
    }
    return this.headByte;
  }
  complete() {
    this.headByte = HEAD_BYTE_REQUIRED;
  }
  readArraySize() {
    const headByte = this.readHeadByte();
    switch (headByte) {
      case 220:
        return this.readU16();
      case 221:
        return this.readU32();
      default: {
        if (headByte < 160) {
          return headByte - 144;
        } else {
          throw new DecodeError(`Unrecognized array type byte: ${prettyByte(headByte)}`);
        }
      }
    }
  }
  pushMapState(size) {
    if (size > this.maxMapLength) {
      throw new DecodeError(`Max length exceeded: map length (${size}) > maxMapLengthLength (${this.maxMapLength})`);
    }
    this.stack.pushMapState(size);
  }
  pushArrayState(size) {
    if (size > this.maxArrayLength) {
      throw new DecodeError(`Max length exceeded: array length (${size}) > maxArrayLength (${this.maxArrayLength})`);
    }
    this.stack.pushArrayState(size);
  }
  decodeString(byteLength, headerOffset) {
    if (!this.rawStrings || this.stateIsMapKey()) {
      return this.decodeUtf8String(byteLength, headerOffset);
    }
    return this.decodeBinary(byteLength, headerOffset);
  }
  /**
   * @throws {@link RangeError}
   */
  decodeUtf8String(byteLength, headerOffset) {
    if (byteLength > this.maxStrLength) {
      throw new DecodeError(`Max length exceeded: UTF-8 byte length (${byteLength}) > maxStrLength (${this.maxStrLength})`);
    }
    if (this.bytes.byteLength < this.pos + headerOffset + byteLength) {
      throw MORE_DATA;
    }
    const offset = this.pos + headerOffset;
    let object;
    if (this.stateIsMapKey() && this.keyDecoder?.canBeCached(byteLength)) {
      object = this.keyDecoder.decode(this.bytes, offset, byteLength);
    } else {
      object = utf8Decode(this.bytes, offset, byteLength);
    }
    this.pos += headerOffset + byteLength;
    return object;
  }
  stateIsMapKey() {
    if (this.stack.length > 0) {
      const state = this.stack.top();
      return state.type === STATE_MAP_KEY;
    }
    return false;
  }
  /**
   * @throws {@link RangeError}
   */
  decodeBinary(byteLength, headOffset) {
    if (byteLength > this.maxBinLength) {
      throw new DecodeError(`Max length exceeded: bin length (${byteLength}) > maxBinLength (${this.maxBinLength})`);
    }
    if (!this.hasRemaining(byteLength + headOffset)) {
      throw MORE_DATA;
    }
    const offset = this.pos + headOffset;
    const object = this.bytes.subarray(offset, offset + byteLength);
    this.pos += headOffset + byteLength;
    return object;
  }
  decodeExtension(size, headOffset) {
    if (size > this.maxExtLength) {
      throw new DecodeError(`Max length exceeded: ext length (${size}) > maxExtLength (${this.maxExtLength})`);
    }
    const extType = this.view.getInt8(this.pos + headOffset);
    const data = this.decodeBinary(
      size,
      headOffset + 1
      /* extType */
    );
    return this.extensionCodec.decode(data, extType, this.context);
  }
  lookU8() {
    return this.view.getUint8(this.pos);
  }
  lookU16() {
    return this.view.getUint16(this.pos);
  }
  lookU32() {
    return this.view.getUint32(this.pos);
  }
  readU8() {
    const value = this.view.getUint8(this.pos);
    this.pos++;
    return value;
  }
  readI8() {
    const value = this.view.getInt8(this.pos);
    this.pos++;
    return value;
  }
  readU16() {
    const value = this.view.getUint16(this.pos);
    this.pos += 2;
    return value;
  }
  readI16() {
    const value = this.view.getInt16(this.pos);
    this.pos += 2;
    return value;
  }
  readU32() {
    const value = this.view.getUint32(this.pos);
    this.pos += 4;
    return value;
  }
  readI32() {
    const value = this.view.getInt32(this.pos);
    this.pos += 4;
    return value;
  }
  readU64() {
    const value = getUint64(this.view, this.pos);
    this.pos += 8;
    return value;
  }
  readI64() {
    const value = getInt64(this.view, this.pos);
    this.pos += 8;
    return value;
  }
  readU64AsBigInt() {
    const value = this.view.getBigUint64(this.pos);
    this.pos += 8;
    return value;
  }
  readI64AsBigInt() {
    const value = this.view.getBigInt64(this.pos);
    this.pos += 8;
    return value;
  }
  readF32() {
    const value = this.view.getFloat32(this.pos);
    this.pos += 4;
    return value;
  }
  readF64() {
    const value = this.view.getFloat64(this.pos);
    this.pos += 8;
    return value;
  }
};

// node_modules/.pnpm/@msgpack+msgpack@3.1.3/node_modules/@msgpack/msgpack/dist.esm/decode.mjs
function decode(buffer, options) {
  const decoder = new Decoder(options);
  return decoder.decode(buffer);
}

// src/core/protocol.ts
var CURRENT_VERSION = 11;
function unpack4Bit(packed, width, height) {
  const length = width * height;
  const data = new Uint8Array(length);
  for (let i = 0; i < packed.length; i++) {
    const byte = packed[i];
    const p1 = byte & 240;
    const p2 = (byte & 15) << 4;
    data[i * 2] = p1;
    data[i * 2 + 1] = p2;
  }
  return data;
}
function columnarize(points, tree, width, height, useHDC = false) {
  const count = points.length;
  const x = new Uint16Array(count);
  const y = new Uint16Array(count);
  const angle = new Int16Array(count);
  const scale = new Uint8Array(count);
  let descriptors;
  if (useHDC) {
    descriptors = new Uint32Array(count);
  } else {
    descriptors = new Uint32Array(count * 2);
  }
  for (let i = 0; i < count; i++) {
    x[i] = Math.round(points[i].x / width * 65535);
    y[i] = Math.round(points[i].y / height * 65535);
    angle[i] = Math.round(points[i].angle / Math.PI * 32767);
    scale[i] = Math.round(Math.log2(points[i].scale || 1));
    if (points[i].descriptors && points[i].descriptors.length >= 2) {
      if (useHDC) {
        descriptors[i] = points[i].hdcSignature || 0;
      } else {
        descriptors[i * 2] = points[i].descriptors[0];
        descriptors[i * 2 + 1] = points[i].descriptors[1];
      }
    }
  }
  return {
    x,
    y,
    a: angle,
    s: scale,
    d: descriptors,
    hdc: useHDC ? 1 : 0,
    // HDC Flag (renamed from h to avoid collision with height)
    t: compactTree(tree.rootNode)
  };
}
function columnarizeCompact(points, tree, width, height) {
  const count = points.length;
  const x = new Uint16Array(count);
  const y = new Uint16Array(count);
  const angle = new Int16Array(count);
  const scale = new Uint8Array(count);
  const descriptors = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    x[i] = Math.round(points[i].x / width * 65535);
    y[i] = Math.round(points[i].y / height * 65535);
    angle[i] = Math.round(points[i].angle / Math.PI * 32767);
    scale[i] = Math.round(Math.log2(points[i].scale || 1));
    if (points[i].descriptors && points[i].descriptors.length >= 2) {
      descriptors[i] = (points[i].descriptors[0] ^ points[i].descriptors[1]) >>> 0;
    }
  }
  return {
    x,
    y,
    a: angle,
    s: scale,
    d: descriptors,
    compact: 1,
    // Flag to indicate compact 32-bit descriptors
    t: compactTree(tree.rootNode)
  };
}
function compactTree(node) {
  if (node.leaf) {
    return [1, node.centerPointIndex || 0, node.pointIndexes];
  }
  return [0, node.centerPointIndex || 0, node.children.map((c) => compactTree(c))];
}
function decodeTaar(buffer) {
  const content = decode(new Uint8Array(buffer));
  const version = content.v || 0;
  if (version < 5 || version > CURRENT_VERSION) {
    console.warn(`Potential incompatible .taar version: ${version}. Standard is ${CURRENT_VERSION}.`);
  }
  const dataList = content.dataList;
  for (let i = 0; i < dataList.length; i++) {
    const item = dataList[i];
    for (const td of item.trackingData) {
      const normalizeBuffer = (arr, Type) => {
        if (arr instanceof Uint8Array && Type !== Uint8Array) {
          return new Type(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength));
        }
        return arr;
      };
      td.px = normalizeBuffer(td.px, Float32Array);
      td.py = normalizeBuffer(td.py, Float32Array);
      const rawData = td.data || td.d;
      const w = td.width || td.w;
      const h = td.height || td.h;
      if (rawData && rawData.length === w * h / 2) {
        const unpacked = unpack4Bit(rawData, w, h);
        if (td.data) td.data = unpacked;
        if (td.d) td.d = unpacked;
      }
      if (td.mesh) {
        td.mesh.t = normalizeBuffer(td.mesh.t, Uint16Array);
        td.mesh.e = normalizeBuffer(td.mesh.e, Uint16Array);
        td.mesh.rl = normalizeBuffer(td.mesh.rl, Float32Array);
      }
    }
    for (const kf of item.matchingData) {
      for (const col of [kf.max, kf.min]) {
        if (!col) continue;
        let xRaw = col.x;
        let yRaw = col.y;
        if (xRaw instanceof Uint8Array) {
          xRaw = new Uint16Array(xRaw.buffer.slice(xRaw.byteOffset, xRaw.byteOffset + xRaw.byteLength));
        }
        if (yRaw instanceof Uint8Array) {
          yRaw = new Uint16Array(yRaw.buffer.slice(yRaw.byteOffset, yRaw.byteOffset + yRaw.byteLength));
        }
        const count = xRaw.length;
        const x = new Float32Array(count);
        const y = new Float32Array(count);
        for (let k = 0; k < count; k++) {
          x[k] = xRaw[k] / 65535 * kf.w;
          y[k] = yRaw[k] / 65535 * kf.h;
        }
        col.x = x;
        col.y = y;
        if (col.a instanceof Uint8Array) {
          const aRaw = new Int16Array(col.a.buffer.slice(col.a.byteOffset, col.a.byteOffset + col.a.byteLength));
          const a = new Float32Array(count);
          for (let k = 0; k < count; k++) {
            a[k] = aRaw[k] / 32767 * Math.PI;
          }
          col.a = a;
        }
        if (col.s instanceof Uint8Array) {
          const sRaw = col.s;
          const s = new Float32Array(count);
          for (let k = 0; k < count; k++) {
            s[k] = Math.pow(2, sRaw[k]);
          }
          col.s = s;
        }
        if (col.d instanceof Uint8Array) {
          if (col.hdc === 1) {
            col.d = new Uint32Array(col.d.buffer.slice(col.d.byteOffset, col.d.byteOffset + col.d.byteLength));
          } else {
            col.d = new Uint32Array(col.d.buffer.slice(col.d.byteOffset, col.d.byteOffset + col.d.byteLength));
          }
        }
      }
    }
  }
  return { version, dataList };
}
function encodeTaar(dataList) {
  return encode({
    v: CURRENT_VERSION,
    dataList
  });
}

// src/core/detector/detector-lite.js
var PYRAMID_MIN_SIZE = 4;
var NUM_BUCKETS_PER_DIMENSION = 15;
var DEFAULT_MAX_FEATURES_PER_BUCKET = 12;
var ORIENTATION_NUM_BINS = 36;
var FREAK_EXPANSION_FACTOR = 7;
var globalUseGPU = true;
var DetectorLite = class {
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.useGPU = options.useGPU !== void 0 ? options.useGPU : globalUseGPU;
    this.useLSH = options.useLSH !== void 0 ? options.useLSH : true;
    this.useHDC = options.useHDC !== void 0 ? options.useHDC : true;
    this.maxFeaturesPerBucket = options.maxFeaturesPerBucket !== void 0 ? options.maxFeaturesPerBucket : DEFAULT_MAX_FEATURES_PER_BUCKET;
    let numOctaves = 0;
    let w = width, h = height;
    while (w >= PYRAMID_MIN_SIZE && h >= PYRAMID_MIN_SIZE) {
      w = Math.floor(w / 2);
      h = Math.floor(h / 2);
      numOctaves++;
      if (numOctaves === 10) break;
    }
    this.numOctaves = options.maxOctaves !== void 0 ? Math.min(numOctaves, options.maxOctaves) : numOctaves;
  }
  /**
   * Detecta características en una imagen en escala de grises
   * @param {Float32Array|Uint8Array} imageData - Datos de imagen (width * height)
   * @param {Object} options - Opciones de detección (ej. octavesToProcess)
   * @returns {{featurePoints: Array}} Puntos de características detectados
   */
  detect(imageData, options = {}) {
    const octavesToProcess = options.octavesToProcess || Array.from({ length: this.numOctaves }, (_, i) => i);
    let data;
    if (imageData instanceof Float32Array) {
      data = imageData;
    } else {
      data = new Float32Array(imageData.length);
      for (let i = 0; i < imageData.length; i++) {
        data[i] = imageData[i];
      }
    }
    const pyramidImages = this._buildGaussianPyramid(data, this.width, this.height, octavesToProcess);
    const dogPyramid = this._buildDogPyramid(pyramidImages, octavesToProcess);
    const extremas = this._findExtremas(dogPyramid, pyramidImages);
    const prunedExtremas = this._applyPrune(extremas);
    this._computeOrientations(prunedExtremas, pyramidImages);
    this._computeFreakDescriptors(prunedExtremas, pyramidImages);
    const featurePoints = prunedExtremas.map((ext) => {
      const scale = Math.pow(2, ext.octave);
      return {
        maxima: ext.score > 0,
        x: ext.x * scale + scale * 0.5 - 0.5,
        y: ext.y * scale + scale * 0.5 - 0.5,
        scale,
        angle: ext.angle || 0,
        score: ext.absScore,
        // Pass through score for sorting in Matcher
        descriptors: this.useLSH && ext.lsh ? ext.lsh : ext.descriptors || [],
        imageData: data
        // Pass source image for refinement
      };
    });
    return { featurePoints, pyramid: pyramidImages };
  }
  /**
   * Construye una pirámide gaussiana
   */
  _buildGaussianPyramid(data, width, height, octavesToProcess = null) {
    if (this.useGPU) {
      try {
        const gpuPyramid = gpuCompute.buildPyramid(data, width, height, this.numOctaves);
        const pyramid2 = [];
        for (let i = 0; i < gpuPyramid.length && i < this.numOctaves; i++) {
          if (octavesToProcess && !octavesToProcess.includes(i)) {
            pyramid2.push(null);
            continue;
          }
          const level = gpuPyramid[i];
          const img2 = this._applyGaussianFilter(level.data, level.width, level.height);
          pyramid2.push([
            { data: level.data, width: level.width, height: level.height },
            { data: img2.data, width: level.width, height: level.height }
          ]);
        }
        return pyramid2;
      } catch (e) {
        console.warn("GPU pyramid failed, falling back to CPU:", e.message);
      }
    }
    if (!this._pyramidBuffers || this._pyramidBuffers.width !== width || this._pyramidBuffers.height !== height) {
      this._pyramidBuffers = { width, height, temp: new Float32Array(width * height) };
    }
    const pyramid = [];
    let currentData = data;
    let currentWidth = width;
    let currentHeight = height;
    for (let i = 0; i < this.numOctaves; i++) {
      const shouldProcess = !octavesToProcess || octavesToProcess.includes(i);
      if (shouldProcess) {
        const img1 = this._applyGaussianFilter(currentData, currentWidth, currentHeight);
        const img2 = this._applyGaussianFilter(img1.data, currentWidth, currentHeight);
        pyramid.push([
          { data: img1.data, width: currentWidth, height: currentHeight },
          { data: img2.data, width: currentWidth, height: currentHeight }
        ]);
      } else {
        pyramid.push(null);
      }
      if (i < this.numOctaves - 1) {
        const needsDownsample = !octavesToProcess || octavesToProcess.some((o) => o > i);
        if (needsDownsample) {
          const sourceData = shouldProcess ? pyramid[i][0].data : currentData;
          const downsampled = this._downsample(sourceData, currentWidth, currentHeight);
          currentData = downsampled.data;
          currentWidth = downsampled.width;
          currentHeight = downsampled.height;
        } else {
          break;
        }
      }
    }
    return pyramid;
  }
  /**
   * Aplica un filtro gaussiano binomial [1,4,6,4,1] - Optimizado
   */
  _applyGaussianFilter(data, width, height) {
    const output = new Float32Array(width * height);
    const temp = this._pyramidBuffers?.temp || new Float32Array(width * height);
    const k0 = 0.0625, k1 = 0.25, k2 = 0.375;
    const w1 = width - 1;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const sumL0 = k0 + k1 + k2 + k1 + k0;
      temp[rowOffset] = (data[rowOffset] * (k0 + k1 + k2) + data[rowOffset + 1] * k1 + data[rowOffset + 2] * k0) * (1 / (k0 + k1 + k2));
      temp[rowOffset + 1] = (data[rowOffset] * k1 + data[rowOffset + 1] * k2 + data[rowOffset + 2] * k1 + data[rowOffset + 3] * k0) * (1 / (k1 + k2 + k1 + k0));
      for (let x = 2; x < width - 2; x++) {
        const pos = rowOffset + x;
        temp[pos] = data[pos - 2] * k0 + data[pos - 1] * k1 + data[pos] * k2 + data[pos + 1] * k1 + data[pos + 2] * k0;
      }
      const r2 = rowOffset + width - 2;
      const r1 = rowOffset + width - 1;
      temp[r2] = (data[r2 - 2] * k0 + data[r2 - 1] * k1 + data[r2] * k2 + data[r1] * k1) * (1 / (k0 + k1 + k2 + k1));
      temp[r1] = (data[r1 - 2] * k0 + data[r1 - 1] * k1 + data[r1] * (k2 + k1 + k0)) * (1 / (k0 + k1 + k2));
    }
    for (let x = 0; x < width; x++) {
      output[x] = (temp[x] * (k0 + k1 + k2) + temp[x + width] * k1 + temp[x + width * 2] * k0) * (1 / (k0 + k1 + k2));
      output[x + width] = (temp[x] * k1 + temp[x + width] * k2 + temp[x + width * 2] * k1 + temp[x + width * 3] * k0) * (1 / (k1 + k2 + k1 + k0));
      for (let y = 2; y < height - 2; y++) {
        const p = y * width + x;
        output[p] = temp[p - width * 2] * k0 + temp[p - width] * k1 + temp[p] * k2 + temp[p + width] * k1 + temp[p + width * 2] * k0;
      }
      const b2 = (height - 2) * width + x;
      const b1 = (height - 1) * width + x;
      output[b2] = (temp[b2 - width * 2] * k0 + temp[b2 - width] * k1 + temp[b2] * k2 + temp[b1] * k1) * (1 / (k0 + k1 + k2 + k1));
      output[b1] = (temp[b1 - width * 2] * k0 + temp[b1 - width] * k1 + temp[b1] * (k2 + k1 + k0)) * (1 / (k0 + k1 + k2));
    }
    return { data: output, width, height };
  }
  /**
   * Downsample imagen por factor de 2
   */
  _downsample(data, width, height) {
    const newWidth = width >> 1;
    const newHeight = height >> 1;
    const output = new Float32Array(newWidth * newHeight);
    for (let y = 0; y < newHeight; y++) {
      const r0 = y * 2 * width;
      const r1 = r0 + width;
      const dr = y * newWidth;
      for (let x = 0; x < newWidth; x++) {
        const i2 = x * 2;
        output[dr + x] = (data[r0 + i2] + data[r0 + i2 + 1] + data[r1 + i2] + data[r1 + i2 + 1]) * 0.25;
      }
    }
    return { data: output, width: newWidth, height: newHeight };
  }
  /**
   * Construye pirámide de diferencia de gaussianas
   */
  _buildDogPyramid(pyramidImages, octavesToProcess = null) {
    const dogPyramid = [];
    for (let i = 0; i < pyramidImages.length; i++) {
      if (!pyramidImages[i]) {
        dogPyramid.push(null);
        continue;
      }
      const img1 = pyramidImages[i][0];
      const img2 = pyramidImages[i][1];
      const width = img1.width;
      const height = img1.height;
      const dog = new Float32Array(width * height);
      for (let j = 0; j < dog.length; j++) {
        dog[j] = img2.data[j] - img1.data[j];
      }
      dogPyramid.push({ data: dog, width, height });
    }
    return dogPyramid;
  }
  /**
   * Encuentra extremos locales en la pirámide DoG
   */
  _findExtremas(dogPyramid, pyramidImages) {
    const extremas = [];
    for (let octave = 0; octave < dogPyramid.length; octave++) {
      const curr = dogPyramid[octave];
      if (!curr) continue;
      const prev = octave > 0 ? dogPyramid[octave - 1] : null;
      const next = octave < dogPyramid.length - 1 ? dogPyramid[octave + 1] : null;
      const width = curr.width;
      const height = curr.height;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const val = curr.data[y * width + x];
          if (Math.abs(val) < 3e-3) continue;
          let isMaxima = true;
          let isMinima = true;
          for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
            for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
              if (dx === 0 && dy === 0) continue;
              const neighbor = curr.data[(y + dy) * width + (x + dx)];
              if (neighbor >= val) isMaxima = false;
              if (neighbor <= val) isMinima = false;
            }
          }
          if ((isMaxima || isMinima) && prev) {
            const px = x << 1;
            const py = y << 1;
            const prevWidth = prev.width;
            for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
              for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                const xx = Math.max(0, Math.min(prevWidth - 1, px + dx));
                const yy = Math.max(0, Math.min(prev.height - 1, py + dy));
                const neighbor = prev.data[yy * prevWidth + xx];
                if (neighbor >= val) isMaxima = false;
                if (neighbor <= val) isMinima = false;
              }
            }
          }
          if ((isMaxima || isMinima) && next) {
            const nx = x >> 1;
            const ny = y >> 1;
            const nextWidth = next.width;
            for (let dy = -1; dy <= 1 && (isMaxima || isMinima); dy++) {
              for (let dx = -1; dx <= 1 && (isMaxima || isMinima); dx++) {
                const xx = Math.max(0, Math.min(nextWidth - 1, nx + dx));
                const yy = Math.max(0, Math.min(next.height - 1, ny + dy));
                const neighbor = next.data[yy * nextWidth + xx];
                if (neighbor >= val) isMaxima = false;
                if (neighbor <= val) isMinima = false;
              }
            }
          }
          if (isMaxima || isMinima) {
            extremas.push({
              score: isMaxima ? Math.abs(val) : -Math.abs(val),
              octave,
              x,
              y,
              absScore: Math.abs(val)
            });
          }
        }
      }
    }
    return extremas;
  }
  /**
   * Aplica pruning para mantener solo los mejores features por bucket
   */
  _applyPrune(extremas) {
    const nBuckets = NUM_BUCKETS_PER_DIMENSION;
    const nFeatures = this.maxFeaturesPerBucket;
    const buckets = [];
    for (let i = 0; i < nBuckets * nBuckets; i++) {
      buckets.push([]);
    }
    for (const ext of extremas) {
      const bucketX = Math.min(nBuckets - 1, Math.floor(ext.x / (this.width / Math.pow(2, ext.octave)) * nBuckets));
      const bucketY = Math.min(nBuckets - 1, Math.floor(ext.y / (this.height / Math.pow(2, ext.octave)) * nBuckets));
      const bucketIdx = bucketY * nBuckets + bucketX;
      if (bucketIdx >= 0 && bucketIdx < buckets.length) {
        buckets[bucketIdx].push(ext);
      }
    }
    const result = [];
    for (const bucket of buckets) {
      bucket.sort((a, b) => b.absScore - a.absScore);
      for (let i = 0; i < Math.min(nFeatures, bucket.length); i++) {
        result.push(bucket[i]);
      }
    }
    return result;
  }
  /**
   * Calcula la orientación de cada feature
   */
  _computeOrientations(extremas, pyramidImages) {
    for (const ext of extremas) {
      if (ext.octave < 0 || ext.octave >= pyramidImages.length) {
        ext.angle = 0;
        continue;
      }
      const img = pyramidImages[ext.octave][1];
      const width = img.width;
      const height = img.height;
      const data = img.data;
      const x = Math.floor(ext.x);
      const y = Math.floor(ext.y);
      const histogram = new Float32Array(ORIENTATION_NUM_BINS);
      const radius = 4;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy <= 0 || yy >= height - 1 || xx <= 0 || xx >= width - 1) continue;
          const gradY = data[(yy + 1) * width + xx] - data[(yy - 1) * width + xx];
          const gradX = data[yy * width + xx + 1] - data[yy * width + xx - 1];
          const mag = Math.sqrt(gradX * gradX + gradY * gradY);
          const angle = Math.atan2(gradY, gradX) + Math.PI;
          const bin = Math.floor(angle / (2 * Math.PI) * ORIENTATION_NUM_BINS) % ORIENTATION_NUM_BINS;
          const weight = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
          histogram[bin] += mag * weight;
        }
      }
      let maxBin = 0;
      for (let i = 1; i < ORIENTATION_NUM_BINS; i++) {
        if (histogram[i] > histogram[maxBin]) {
          maxBin = i;
        }
      }
      ext.angle = (maxBin + 0.5) * 2 * Math.PI / ORIENTATION_NUM_BINS - Math.PI;
    }
  }
  /**
   * Calcula descriptores FREAK
   */
  _computeFreakDescriptors(extremas, pyramidImages) {
    for (const ext of extremas) {
      if (ext.octave < 0 || ext.octave >= pyramidImages.length) {
        ext.descriptors = new Uint8Array(8);
        continue;
      }
      const img = pyramidImages[ext.octave][1];
      const width = img.width;
      const height = img.height;
      const data = img.data;
      const cos = Math.cos(ext.angle || 0) * FREAK_EXPANSION_FACTOR;
      const sin = Math.sin(ext.angle || 0) * FREAK_EXPANSION_FACTOR;
      const samples = new Float32Array(FREAKPOINTS.length);
      for (let i = 0; i < FREAKPOINTS.length; i++) {
        const [, fx, fy] = FREAKPOINTS[i];
        const xp = ext.x + fx * cos - fy * sin;
        const yp = ext.y + fx * sin + fy * cos;
        const x0 = Math.max(0, Math.min(width - 2, Math.floor(xp)));
        const y0 = Math.max(0, Math.min(height - 2, Math.floor(yp)));
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const fracX = xp - x0;
        const fracY = yp - y0;
        samples[i] = data[y0 * width + x0] * (1 - fracX) * (1 - fracY) + data[y0 * width + x1] * fracX * (1 - fracY) + data[y1 * width + x0] * (1 - fracX) * fracY + data[y1 * width + x1] * fracX * fracY;
      }
      if (this.useLSH) {
        ext.lsh = computeLSH64(samples);
        ext.descriptors = packLSHIntoDescriptor(ext.lsh);
      } else {
        ext.descriptors = computeFullFREAK(samples);
      }
    }
  }
};

// src/core/matching/hamming-distance.js
var BIT_COUNT_8 = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let c = 0, n = i;
  while (n > 0) {
    n &= n - 1;
    c++;
  }
  BIT_COUNT_8[i] = c;
}
var compute64 = (v1, v1Idx, v2, v2Idx) => {
  let x1 = (v1[v1Idx] ^ v2[v2Idx]) >>> 0;
  let x2 = (v1[v1Idx + 1] ^ v2[v2Idx + 1]) >>> 0;
  x1 -= x1 >>> 1 & 1431655765;
  x1 = (x1 & 858993459) + (x1 >>> 2 & 858993459);
  const count1 = (x1 + (x1 >>> 4) & 252645135) * 16843009 >>> 24;
  x2 -= x2 >>> 1 & 1431655765;
  x2 = (x2 & 858993459) + (x2 >>> 2 & 858993459);
  const count2 = (x2 + (x2 >>> 4) & 252645135) * 16843009 >>> 24;
  return count1 + count2;
};

// src/core/utils/randomizer.js
var mRandSeed = 1234;
var createRandomizer = () => {
  const randomizer = {
    seed: mRandSeed,
    arrayShuffle(options) {
      const { arr, sampleSize } = options;
      for (let i = 0; i < sampleSize; i++) {
        this.seed = (214013 * this.seed + 2531011) % (1 << 31);
        let k = this.seed >> 16 & 32767;
        k = k % arr.length;
        let tmp = arr[i];
        arr[i] = arr[k];
        arr[k] = tmp;
      }
    },
    nextInt(maxValue) {
      this.seed = (214013 * this.seed + 2531011) % (1 << 31);
      let k = this.seed >> 16 & 32767;
      k = k % maxValue;
      return k;
    }
  };
  return randomizer;
};

// src/core/matching/hierarchical-clustering.js
var MIN_FEATURE_PER_NODE = 32;
var NUM_ASSIGNMENT_HYPOTHESES = 12;
var NUM_CENTERS = 8;
function popcount32(n) {
  n = n - (n >> 1 & 1431655765);
  n = (n & 858993459) + (n >> 2 & 858993459);
  return (n + (n >> 4) & 252645135) * 16843009 >> 24;
}
var _computeKMedoids = (options) => {
  const { descriptors, pointIndexes, randomizer, useHDC } = options;
  const numPointIndexes = pointIndexes.length;
  const randomPointIndexes = new Int32Array(numPointIndexes);
  for (let i = 0; i < numPointIndexes; i++) {
    randomPointIndexes[i] = i;
  }
  let bestSumD = Number.MAX_SAFE_INTEGER;
  let bestAssignment = null;
  const centerPointIndices = new Int32Array(NUM_CENTERS);
  for (let i = 0; i < NUM_ASSIGNMENT_HYPOTHESES; i++) {
    randomizer.arrayShuffle({ arr: randomPointIndexes, sampleSize: NUM_CENTERS });
    for (let k = 0; k < NUM_CENTERS; k++) {
      centerPointIndices[k] = pointIndexes[randomPointIndexes[k]];
    }
    let sumD = 0;
    const currentAssignment = new Int32Array(numPointIndexes);
    for (let j = 0; j < numPointIndexes; j++) {
      const pIdx = pointIndexes[j];
      let bestD = 255;
      let bestCenterIdx = -1;
      for (let k = 0; k < NUM_CENTERS; k++) {
        const cIdx = centerPointIndices[k];
        let d;
        if (useHDC) {
          d = popcount32(descriptors[pIdx] ^ descriptors[cIdx]);
        } else {
          d = compute64(descriptors, pIdx * 2, descriptors, cIdx * 2);
        }
        if (d < bestD) {
          bestCenterIdx = randomPointIndexes[k];
          bestD = d;
        }
      }
      currentAssignment[j] = bestCenterIdx;
      sumD += bestD;
    }
    if (sumD < bestSumD) {
      bestSumD = sumD;
      bestAssignment = currentAssignment;
    }
  }
  return bestAssignment;
};
var build = ({ points }) => {
  const numPoints = points.length;
  if (numPoints === 0) return { rootNode: { leaf: true, pointIndexes: [], centerPointIndex: null } };
  const useHDC = points[0] && points[0].hdcSignature !== void 0;
  const descriptors = new Uint32Array(useHDC ? numPoints : numPoints * 2);
  for (let i = 0; i < numPoints; i++) {
    if (useHDC) {
      descriptors[i] = points[i].hdcSignature;
    } else {
      const d = points[i].descriptors;
      descriptors[i * 2] = d[0];
      descriptors[i * 2 + 1] = d[1];
    }
  }
  const pointIndexes = new Int32Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    pointIndexes[i] = i;
  }
  const randomizer = createRandomizer();
  const rootNode = _build({
    descriptors,
    pointIndexes,
    centerPointIndex: null,
    randomizer,
    useHDC
  });
  return { rootNode };
};
var _build = (options) => {
  const { descriptors, pointIndexes, centerPointIndex, randomizer, useHDC } = options;
  const numPoints = pointIndexes.length;
  let isLeaf = false;
  if (numPoints <= NUM_CENTERS || numPoints <= MIN_FEATURE_PER_NODE) {
    isLeaf = true;
  }
  const clusters = /* @__PURE__ */ new Map();
  if (!isLeaf) {
    const assignment = _computeKMedoids({ descriptors, pointIndexes, randomizer, useHDC });
    for (let i = 0; i < assignment.length; i++) {
      const centerIdx = pointIndexes[assignment[i]];
      let cluster = clusters.get(centerIdx);
      if (cluster === void 0) {
        cluster = [];
        clusters.set(centerIdx, cluster);
      }
      cluster.push(pointIndexes[i]);
    }
    if (clusters.size === 1) {
      isLeaf = true;
    }
  }
  const node = {
    centerPointIndex
  };
  if (isLeaf) {
    node.leaf = true;
    node.pointIndexes = new Int32Array(pointIndexes);
    return node;
  }
  node.leaf = false;
  node.children = [];
  for (const [cIdx, clusterPoints] of clusters) {
    node.children.push(
      _build({
        descriptors,
        pointIndexes: new Int32Array(clusterPoints),
        centerPointIndex: cIdx,
        randomizer,
        useHDC
      })
    );
  }
  return node;
};

// src/core/utils/delaunay.js
function triangulate(points) {
  if (points.length < 3) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const deltaMax = Math.max(dx, dy);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const p1 = { x: midX - 20 * deltaMax, y: midY - deltaMax };
  const p2 = { x: midX, y: midY + 20 * deltaMax };
  const p3 = { x: midX + 20 * deltaMax, y: midY - deltaMax };
  let triangles = [
    { p1, p2, p3, indices: [-1, -2, -3] }
  ];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const badTriangles = [];
    for (const t of triangles) {
      if (isInCircumcircle(p, t)) {
        badTriangles.push(t);
      }
    }
    const polygon = [];
    for (const t of badTriangles) {
      const edges = [
        { a: t.p1, b: t.p2, i1: t.indices[0], i2: t.indices[1] },
        { a: t.p2, b: t.p3, i1: t.indices[1], i2: t.indices[2] },
        { a: t.p3, b: t.p1, i1: t.indices[2], i2: t.indices[0] }
      ];
      for (const edge of edges) {
        let isShared = false;
        for (const t2 of badTriangles) {
          if (t === t2) continue;
          if (isSameEdge(edge, t2)) {
            isShared = true;
            break;
          }
        }
        if (!isShared) {
          polygon.push(edge);
        }
      }
    }
    triangles = triangles.filter((t) => !badTriangles.includes(t));
    for (const edge of polygon) {
      triangles.push({
        p1: edge.a,
        p2: edge.b,
        p3: p,
        indices: [edge.i1, edge.i2, i]
      });
    }
  }
  return triangles.filter((t) => {
    return t.indices[0] >= 0 && t.indices[1] >= 0 && t.indices[2] >= 0;
  }).map((t) => t.indices);
}
function isInCircumcircle(p, t) {
  const x1 = t.p1.x, y1 = t.p1.y;
  const x2 = t.p2.x, y2 = t.p2.y;
  const x3 = t.p3.x, y3 = t.p3.y;
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const centerX = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
  const centerY = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
  const radiusSq = (x1 - centerX) * (x1 - centerX) + (y1 - centerY) * (y1 - centerY);
  const distSq = (p.x - centerX) * (p.x - centerX) + (p.y - centerY) * (p.y - centerY);
  return distSq <= radiusSq;
}
function isSameEdge(edge, triangle) {
  const tEdges = [
    [triangle.indices[0], triangle.indices[1]],
    [triangle.indices[1], triangle.indices[2]],
    [triangle.indices[2], triangle.indices[0]]
  ];
  for (const te of tEdges) {
    if (edge.i1 === te[0] && edge.i2 === te[1] || edge.i1 === te[1] && edge.i2 === te[0]) {
      return true;
    }
  }
  return false;
}
function getEdges(triangles) {
  const edgeSet = /* @__PURE__ */ new Set();
  const edges = [];
  for (const t of triangles) {
    const pairs = [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];
    for (const pair of pairs) {
      const low = Math.min(pair[0], pair[1]);
      const high = Math.max(pair[0], pair[1]);
      const key = `${low}-${high}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([low, high]);
      }
    }
  }
  return edges;
}

// src/compiler/offline-compiler.ts
var isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
var OfflineCompiler = class {
  data = null;
  constructor() {
    console.log("\u26A1 OfflineCompiler: Main thread mode (no workers)");
  }
  async compileImageTargets(images, progressCallback) {
    console.time("\u23F1\uFE0F Compilaci\xF3n total");
    const targetImages = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img || !img.width || !img.height || !img.data) {
        throw new Error(
          `Imagen inv\xE1lida en posici\xF3n ${i}. Debe tener propiedades width, height y data.`
        );
      }
      const greyImageData = new Uint8Array(img.width * img.height);
      if (img.data.length === img.width * img.height) {
        greyImageData.set(img.data);
      } else if (img.data.length === img.width * img.height * 4) {
        for (let j = 0; j < greyImageData.length; j++) {
          const offset = j * 4;
          greyImageData[j] = Math.floor(
            (img.data[offset] + img.data[offset + 1] + img.data[offset + 2]) / 3
          );
        }
      } else {
        throw new Error(`Formato de datos de imagen no soportado en posici\xF3n ${i}`);
      }
      targetImages.push({
        data: greyImageData,
        width: img.width,
        height: img.height
      });
    }
    const results = await this._compileTarget(targetImages, progressCallback);
    this.data = targetImages.map((img, i) => ({
      targetImage: img,
      matchingData: results[i].matchingData,
      trackingData: results[i].trackingData
    }));
    console.timeEnd("\u23F1\uFE0F Compilaci\xF3n total");
    return this.data;
  }
  async _compileTarget(targetImages, progressCallback) {
    const matchingResults = await this._compileMatch(targetImages, (p) => progressCallback(p * 0.5));
    const trackingResults = await this._compileTrack(targetImages, (p) => progressCallback(50 + p * 0.5));
    return targetImages.map((_, i) => ({
      matchingData: matchingResults[i],
      trackingData: trackingResults[i]
    }));
  }
  async _compileMatch(targetImages, progressCallback) {
    const percentPerImage = 100 / targetImages.length;
    let currentPercent = 0;
    const results = [];
    for (let i = 0; i < targetImages.length; i++) {
      const targetImage = targetImages[i];
      const detector = new DetectorLite(targetImage.width, targetImage.height, {
        useLSH: AR_CONFIG.USE_LSH,
        maxFeaturesPerBucket: AR_CONFIG.MAX_FEATURES_PER_BUCKET
      });
      const { featurePoints: rawPs } = detector.detect(targetImage.data);
      const octaves = [0, 1, 2, 3, 4, 5];
      const ps = [];
      const featuresPerOctave = 300;
      for (const oct of octaves) {
        const octScale = Math.pow(2, oct);
        const octFeatures = rawPs.filter((p) => Math.abs(p.scale - octScale) < 0.1).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, featuresPerOctave);
        ps.push(...octFeatures);
      }
      const maximaPoints = ps.filter((p) => p.maxima);
      const minimaPoints = ps.filter((p) => !p.maxima);
      const maximaPointsCluster = build({ points: maximaPoints });
      const minimaPointsCluster = build({ points: minimaPoints });
      const keyframe = {
        maximaPoints,
        minimaPoints,
        maximaPointsCluster,
        minimaPointsCluster,
        width: targetImage.width,
        height: targetImage.height,
        scale: 1
      };
      results.push([keyframe]);
      currentPercent += percentPerImage;
      progressCallback(currentPercent);
    }
    return results;
  }
  async _compileTrack(targetImages, progressCallback) {
    const percentPerImage = 100 / targetImages.length;
    let currentPercent = 0;
    const results = [];
    for (let i = 0; i < targetImages.length; i++) {
      const targetImage = targetImages[i];
      const imageList = buildTrackingImageList(targetImage);
      const percentPerScale = percentPerImage / imageList.length;
      const trackingData = extractTrackingFeatures(imageList, () => {
        currentPercent += percentPerScale;
        progressCallback(currentPercent);
      });
      results.push(trackingData);
    }
    return results;
  }
  async compileTrack({ progressCallback, targetImages, basePercent = 0 }) {
    return this._compileTrack(targetImages, (percent) => {
      progressCallback(basePercent + percent * (100 - basePercent) / 100);
    });
  }
  async compileMatch({ progressCallback, targetImages, basePercent = 0 }) {
    return this._compileMatch(targetImages, (percent) => {
      progressCallback(basePercent + percent * (50 - basePercent) / 100);
    });
  }
  exportData() {
    if (!this.data) {
      throw new Error("No hay datos compilados para exportar");
    }
    const dataList = this.data.map((item) => {
      return {
        targetImage: {
          width: item.targetImage.width,
          height: item.targetImage.height
        },
        trackingData: item.trackingData.map((td) => {
          const count = td.points.length;
          const px = new Float32Array(count);
          const py = new Float32Array(count);
          for (let i = 0; i < count; i++) {
            px[i] = td.points[i].x;
            py[i] = td.points[i].y;
          }
          const triangles = triangulate(td.points);
          const edges = getEdges(triangles);
          const restLengths = new Float32Array(edges.length);
          for (let j = 0; j < edges.length; j++) {
            const p1 = td.points[edges[j][0]];
            const p2 = td.points[edges[j][1]];
            restLengths[j] = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          }
          return {
            w: td.width,
            h: td.height,
            s: td.scale,
            px,
            py,
            d: td.data,
            mesh: {
              t: new Uint16Array(triangles.flat()),
              e: new Uint16Array(edges.flat()),
              rl: restLengths
            }
          };
        }),
        matchingData: item.matchingData.map((kf) => {
          const useCompact = AR_CONFIG.USE_COMPACT_DESCRIPTORS;
          const columnarizeFn = useCompact ? columnarizeCompact : columnarize;
          return {
            w: kf.width,
            h: kf.height,
            s: kf.scale,
            hdc: false,
            max: columnarizeFn(kf.maximaPoints, kf.maximaPointsCluster, kf.width, kf.height),
            min: columnarizeFn(kf.minimaPoints, kf.minimaPointsCluster, kf.width, kf.height)
          };
        })
      };
    });
    return encodeTaar(dataList);
  }
  importData(buffer) {
    const result = decodeTaar(buffer);
    this.data = result.dataList;
    return result;
  }
  async destroy() {
  }
};

// tests/demo3-app.ts
var imageInput = document.getElementById("imageInput");
var fileNameDisplay = document.getElementById("fileName");
var previewContainer = document.getElementById("previewContainer");
var compileBtn = document.getElementById("compileBtn");
var downloadBtn = document.getElementById("downloadBtn");
var progressContainer = document.getElementById("progressContainer");
var progressBar = document.getElementById("progressBar");
var logsEl = document.getElementById("logs");
var timeStat = document.getElementById("timeStat");
var featuresStat = document.getElementById("featuresStat");
var sizeStat = document.getElementById("sizeStat");
var selectedImage = null;
var compiledBuffer = null;
var compiler = null;
function log(msg) {
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  logsEl.textContent += `[${time}] ${msg}
`;
  logsEl.scrollTop = logsEl.scrollHeight;
}
function clearLogs() {
  logsEl.textContent = "";
}
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
imageInput.addEventListener("change", (e) => {
  const target = e.target;
  const file = target.files ? target.files[0] : null;
  if (!file) return;
  fileNameDisplay.textContent = file.name;
  compileBtn.disabled = true;
  downloadBtn.style.display = "none";
  timeStat.textContent = "-";
  featuresStat.textContent = "-";
  sizeStat.textContent = "-";
  clearLogs();
  log(`Imagen seleccionada: ${file.name}`);
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      selectedImage = img;
      previewContainer.innerHTML = "";
      img.style.maxWidth = "100%";
      img.style.maxHeight = "400px";
      previewContainer.appendChild(img);
      compileBtn.disabled = false;
      log(`Imagen cargada: ${img.naturalWidth}x${img.naturalHeight}px`);
    };
    img.src = event.target?.result;
  };
  reader.readAsDataURL(file);
});
compileBtn.addEventListener("click", async () => {
  if (!selectedImage) return;
  compileBtn.disabled = true;
  imageInput.disabled = true;
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";
  downloadBtn.style.display = "none";
  try {
    log("Iniciando compilaci\xF3n...");
    const canvas = document.createElement("canvas");
    canvas.width = selectedImage.naturalWidth;
    canvas.height = selectedImage.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(selectedImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!compiler) {
      compiler = new OfflineCompiler();
    }
    const startTime = performance.now();
    const images = [{
      data: new Uint8Array(imageData.data.buffer),
      // RGBA
      width: imageData.width,
      height: imageData.height
    }];
    const result = await compiler.compileImageTargets(images, (progress) => {
      progressBar.style.width = `${progress}%`;
      if (Math.floor(progress) % 25 === 0) {
        log(`Progreso: ${Math.floor(progress)}%`);
      }
    });
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    compiledBuffer = compiler.exportData();
    timeStat.textContent = `${duration}ms`;
    sizeStat.textContent = formatBytes(compiledBuffer.byteLength);
    let totalFeatures = 0;
    if (result && result[0]) {
      result[0].trackingData.forEach((level) => {
        totalFeatures += level.points.length;
      });
    }
    featuresStat.textContent = totalFeatures.toString();
    log(`\u2705 Compilaci\xF3n completada en ${duration}ms`);
    log(`\u{1F4E6} Tama\xF1o del archivo: ${formatBytes(compiledBuffer.byteLength)}`);
    log(`\u{1F522} Features rastreados: ${totalFeatures}`);
    downloadBtn.style.display = "inline-flex";
  } catch (err) {
    console.error(err);
    log(`\u274C Error: ${err.message}`);
  } finally {
    compileBtn.disabled = false;
    imageInput.disabled = false;
  }
});
downloadBtn.addEventListener("click", () => {
  if (!compiledBuffer) return;
  const blob = new Blob([compiledBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "target.taar";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log("\u2B07\uFE0F Archivo descargado");
});
