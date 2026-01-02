import { Cumsum } from "../utils/cumsum.js";
import { gpuCompute } from "../utils/gpu-compute.js";

const SEARCH_SIZE1 = 10;
const SEARCH_SIZE2 = 2;

// Template parameters - ajustados para más puntos
const TEMPLATE_SIZE = 6;
const TEMPLATE_SD_THRESH = 4.0;  // Reducido de 5.0 para aceptar más candidatos
const MAX_SIM_THRESH = 0.95;

const MAX_THRESH = 0.9;
const MIN_THRESH = 0.2;
const SD_THRESH = 8.0;
const OCCUPANCY_SIZE = 10;  // Reducido de 16 para permitir puntos más cercanos

// GPU mode flag - set to false to use original JS implementation
let useGPU = true;

/**
 * Set GPU mode for extraction
 * @param {boolean} enabled - Whether to use GPU acceleration
 */
export const setGPUMode = (enabled) => {
  useGPU = enabled;
};

/*
 * Input image is in grey format. the imageData array size is width * height. value range from 0-255
 * pixel value at row r and c = imageData[r * width + c]
 *
 * @param {Uint8Array} options.imageData
 * @param {int} options.width image width
 * @param {int} options.height image height
 */
const extract = (image) => {
  const { data: imageData, width, height } = image;

  let dValue, isCandidate;

  if (useGPU) {
    // GPU-accelerated edge detection
    const result = gpuCompute.edgeDetection(imageData, width, height);
    dValue = result.dValue;
    isCandidate = result.isCandidate;
  } else {
    // Original JS implementation
    dValue = new Float32Array(imageData.length);
    isCandidate = new Uint8Array(imageData.length);

    for (let j = 1; j < height - 1; j++) {
      const rowOffset = j * width;
      const prevRowOffset = (j - 1) * width;
      const nextRowOffset = (j + 1) * width;

      for (let i = 1; i < width - 1; i++) {
        const pos = rowOffset + i;

        // dx/dy with tight loops
        let dx = (imageData[prevRowOffset + i + 1] - imageData[prevRowOffset + i - 1] +
          imageData[rowOffset + i + 1] - imageData[rowOffset + i - 1] +
          imageData[nextRowOffset + i + 1] - imageData[nextRowOffset + i - 1]) / 768;

        let dy = (imageData[nextRowOffset + i - 1] - imageData[prevRowOffset + i - 1] +
          imageData[nextRowOffset + i] - imageData[prevRowOffset + i] +
          imageData[nextRowOffset + i + 1] - imageData[prevRowOffset + i + 1]) / 768;

        dValue[pos] = Math.sqrt((dx * dx + dy * dy) / 2);
      }
    }

    // Step 1.2 - Local Maxima (for JS path)
    for (let j = 1; j < height - 1; j++) {
      const rowOffset = j * width;
      for (let i = 1; i < width - 1; i++) {
        const pos = rowOffset + i;
        const val = dValue[pos];
        if (val > 0 &&
          val >= dValue[pos - 1] && val >= dValue[pos + 1] &&
          val >= dValue[pos - width] && val >= dValue[pos + width]) {
          isCandidate[pos] = 1;
        }
      }
    }
  }

  // Step 1.2 - Build Histogram from detected candidates
  const dValueHist = new Uint32Array(1000);
  let allCount = 0;
  for (let j = 1; j < height - 1; j++) {
    const rowOffset = j * width;
    for (let i = 1; i < width - 1; i++) {
      const pos = rowOffset + i;
      if (isCandidate[pos]) {
        const val = dValue[pos];
        let k = Math.floor(val * 1000);
        if (k > 999) k = 999;
        dValueHist[k]++;
        allCount++;
      }
    }
  }

  // Determine dValue threshold for top 5% (aumentado de 2% para más candidatos)
  const maxPoints = 0.05 * width * height;
  let kThresh = 999;
  let filteredCount = 0;
  while (kThresh >= 0) {
    filteredCount += dValueHist[kThresh];
    if (filteredCount > maxPoints) break;
    kThresh--;
  }
  const minDValue = kThresh / 1000;

  // Step 2
  const imageDataSqr = new Float32Array(imageData.length);
  for (let i = 0; i < imageData.length; i++) {
    imageDataSqr[i] = imageData[i] * imageData[i];
  }
  const imageDataCumsum = new Cumsum(imageData, width, height);
  const imageDataSqrCumsum = new Cumsum(imageDataSqr, width, height);

  // Collect candidates above threshold
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
  // Sort by dValue DESCENDING
  candidates.sort((a, b) => b.dval - a.dval);

  // Step 3 - On-Demand Feature Selection (The 10x Win)
  const divSize = (TEMPLATE_SIZE * 2 + 1) * 3;
  const maxFeatureNum = Math.floor(width / OCCUPANCY_SIZE) * Math.floor(height / OCCUPANCY_SIZE) +
    Math.floor(width / divSize) * Math.floor(height / divSize);

  const coords = [];
  const invalidated = new Uint8Array(width * height);
  const templateWidth = 2 * TEMPLATE_SIZE + 1;
  const nPixels = templateWidth * templateWidth;

  const actualOccSize = Math.floor(Math.min(width, height) / 12);  // Reducido de 10 para más densidad

  for (let i = 0; i < candidates.length; i++) {
    const { x, y, pos } = candidates[i];
    if (invalidated[pos]) continue;

    // Boundary safety for template
    if (x < TEMPLATE_SIZE + SEARCH_SIZE1 || x >= width - TEMPLATE_SIZE - SEARCH_SIZE1 ||
      y < TEMPLATE_SIZE + SEARCH_SIZE1 || y >= height - TEMPLATE_SIZE - SEARCH_SIZE1) {
      continue;
    }

    const vlen = _templateVar({
      image,
      cx: x,
      cy: y,
      sdThresh: TEMPLATE_SD_THRESH,
      imageDataCumsum,
      imageDataSqrCumsum,
    });
    if (vlen === null) continue;

    const templateAvg = imageDataCumsum.query(
      x - TEMPLATE_SIZE,
      y - TEMPLATE_SIZE,
      x + TEMPLATE_SIZE,
      y + TEMPLATE_SIZE,
    ) / nPixels;

    // Optimization: Cache template once per candidate
    const templateData = new Uint8Array(templateWidth * templateWidth);
    let tidx = 0;
    const tStart = (y - TEMPLATE_SIZE) * width + (x - TEMPLATE_SIZE);
    for (let tj = 0; tj < templateWidth; tj++) {
      const rowOffset = tStart + tj * width;
      for (let ti = 0; ti < templateWidth; ti++) {
        templateData[tidx++] = imageData[rowOffset + ti];
      }
    }

    // Step 2.1: Find max similarity in search area (On demand!)
    let max = -1.0;
    for (let jj = -SEARCH_SIZE1; jj <= SEARCH_SIZE1; jj++) {
      for (let ii = -SEARCH_SIZE1; ii <= SEARCH_SIZE1; ii++) {
        if (ii * ii + jj * jj <= SEARCH_SIZE2 * SEARCH_SIZE2) continue;

        const sim = _getSimilarityOptimized({
          image,
          cx: x + ii,
          cy: y + jj,
          vlen: vlen,
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

    // Now decide if we select it
    if (max < MAX_THRESH) {
      // Uniqueness check (Step 2.2 sub-loop)
      let minUnique = 1.0;
      let maxUnique = -1.0;
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
        // Invalidate neighbors
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

// compute variances of the pixels, centered at (cx, cy)
const _templateVar = ({ image, cx, cy, sdThresh, imageDataCumsum, imageDataSqrCumsum }) => {
  if (cx - TEMPLATE_SIZE < 0 || cx + TEMPLATE_SIZE >= image.width) return null;
  if (cy - TEMPLATE_SIZE < 0 || cy + TEMPLATE_SIZE >= image.height) return null;

  const templateWidth = 2 * TEMPLATE_SIZE + 1;
  const nPixels = templateWidth * templateWidth;

  let average = imageDataCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE,
  );
  average /= nPixels;

  //v = sum((pixel_i - avg)^2) for all pixel i within the template
  //  = sum(pixel_i^2) - sum(2 * avg * pixel_i) + sum(avg^avg)

  let vlen = imageDataSqrCumsum.query(
    cx - TEMPLATE_SIZE,
    cy - TEMPLATE_SIZE,
    cx + TEMPLATE_SIZE,
    cy + TEMPLATE_SIZE,
  );
  vlen -=
    2 *
    average *
    imageDataCumsum.query(
      cx - TEMPLATE_SIZE,
      cy - TEMPLATE_SIZE,
      cx + TEMPLATE_SIZE,
      cy + TEMPLATE_SIZE,
    );
  vlen += nPixels * average * average;

  if (vlen / nPixels < sdThresh * sdThresh) return null;
  vlen = Math.sqrt(vlen);
  return vlen;
};

const _getSimilarityOptimized = (options) => {
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
    cy + templateSize,
  );
  const sxx = imageDataSqrCumsum.query(
    cx - templateSize,
    cy - templateSize,
    cx + templateSize,
    cy + templateSize,
  );

  // Full calculation
  let sxy = 0;
  let p1 = (cy - templateSize) * width + (cx - templateSize);
  let p2 = 0;
  const nextRowOffset = width - templateWidth;

  for (let j = 0; j < templateWidth; j++) {
    for (let i = 0; i < templateWidth; i++) {
      sxy += imageData[p1++] * templateData[p2++];
    }
    p1 += nextRowOffset;
  }

  // Covariance check
  // E[(X-EX)(Y-EY)] = E[XY] - EX*EY
  // sum((Xi - avgX)(Yi - avgY)) = sum(XiYi) - avgY * sum(Xi)
  const sxy_final = sxy - templateAvg * sx;

  let vlen2 = sxx - (sx * sx) / (nP);
  if (vlen2 <= 0) return null;
  vlen2 = Math.sqrt(vlen2);

  return (1.0 * sxy_final) / (vlen * vlen2);
};

export { extract };
