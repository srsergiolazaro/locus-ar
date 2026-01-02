import { Cumsum } from "../utils/cumsum.js";

const SEARCH_SIZE1 = 10;
const SEARCH_SIZE2 = 2;

//const TEMPLATE_SIZE = 22 // DEFAULT
const TEMPLATE_SIZE = 6;
const TEMPLATE_SD_THRESH = 5.0;
const MAX_SIM_THRESH = 0.95;

const MAX_THRESH = 0.9;
//const MIN_THRESH = 0.55;
const MIN_THRESH = 0.2;
const SD_THRESH = 8.0;
const OCCUPANCY_SIZE = (24 * 2) / 3;

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

  // Step 1 - filter out interesting points. Interesting points have strong pixel value changed across neighbours
  const isPixelSelected = [width * height];
  for (let i = 0; i < isPixelSelected.length; i++) isPixelSelected[i] = false;

  // Step 1.1 consider a pixel at position (x, y). compute:
  //   dx = ((data[x+1, y-1] - data[x-1, y-1]) + (data[x+1, y] - data[x-1, y]) + (data[x+1, y+1] - data[x-1, y-1])) / 256 / 3
  //   dy = ((data[x+1, y+1] - data[x+1, y-1]) + (data[x, y+1] - data[x, y-1]) + (data[x-1, y+1] - data[x-1, y-1])) / 256 / 3
  //   dValue =  sqrt(dx^2 + dy^2) / 2;
  const dValue = new Float32Array(imageData.length);
  for (let i = 0; i < width; i++) {
    dValue[i] = -1;
    dValue[width * (height - 1) + i] = -1;
  }
  for (let j = 0; j < height; j++) {
    dValue[j * width] = -1;
    dValue[j * width + width - 1] = -1;
  }

  for (let i = 1; i < width - 1; i++) {
    for (let j = 1; j < height - 1; j++) {
      let pos = i + width * j;

      let dx = 0.0;
      let dy = 0.0;
      for (let k = -1; k <= 1; k++) {
        dx += imageData[pos + width * k + 1] - imageData[pos + width * k - 1];
        dy += imageData[pos + width + k] - imageData[pos - width + k];
      }
      dx /= 3 * 256;
      dy /= 3 * 256;
      dValue[pos] = Math.sqrt((dx * dx + dy * dy) / 2);
    }
  }

  // Step 1.2 - select all pixel which is dValue largest than all its neighbour as "potential" candidate
  //  the number of selected points is still too many, so we use the value to further filter (e.g. largest the dValue, the better)
  const dValueHist = new Uint32Array(1000); // histogram of dvalue scaled to [0, 1000)
  for (let i = 0; i < 1000; i++) dValueHist[i] = 0;
  const neighbourOffsets = [-1, 1, -width, width];
  let allCount = 0;
  for (let i = 1; i < width - 1; i++) {
    for (let j = 1; j < height - 1; j++) {
      let pos = i + width * j;
      let isMax = true;
      for (let d = 0; d < neighbourOffsets.length; d++) {
        if (dValue[pos] <= dValue[pos + neighbourOffsets[d]]) {
          isMax = false;
          break;
        }
      }
      if (isMax) {
        let k = Math.floor(dValue[pos] * 1000);
        if (k > 999) k = 999; // k>999 should not happen if computaiton is correction
        if (k < 0) k = 0; // k<0 should not happen if computaiton is correction
        dValueHist[k] += 1;
        allCount += 1;
        isPixelSelected[pos] = true;
      }
    }
  }

  // reduce number of points according to dValue.
  // actually, the whole Step 1. might be better to just sort the dvalues and pick the top (0.02 * width * height) points
  const maxPoints = 0.02 * width * height;
  let k = 999;
  let filteredCount = 0;
  while (k >= 0) {
    filteredCount += dValueHist[k];
    if (filteredCount > maxPoints) break;
    k--;
  }

  //console.log("image size: ", width * height);
  //console.log("extracted featues: ", allCount);
  //console.log("filtered featues: ", filteredCount);

  for (let i = 0; i < isPixelSelected.length; i++) {
    if (isPixelSelected[i]) {
      if (dValue[i] * 1000 < k) isPixelSelected[i] = false;
    }
  }

  //console.log("selected count: ", isPixelSelected.reduce((a, b) => {return a + (b?1:0);}, 0));

  // Step 2
  // prebuild cumulative sum matrix for fast computation
  const imageDataSqr = new Float32Array(imageData.length);
  for (let i = 0; i < imageData.length; i++) {
    imageDataSqr[i] = imageData[i] * imageData[i];
  }
  const imageDataCumsum = new Cumsum(imageData, width, height);
  const imageDataSqrCumsum = new Cumsum(imageDataSqr, width, height);

  // holds the max similariliy value computed within SEARCH area of each pixel
  //   idea: if there is high simliarity with another pixel in nearby area, then it's not a good feature point
  //         next step is to find pixel with low similarity
  const featureMap = new Float32Array(imageData.length);

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const pos = j * width + i;
      if (!isPixelSelected[pos]) {
        featureMap[pos] = 1.0;
        continue;
      }

      const vlen = _templateVar({
        image,
        cx: i,
        cy: j,
        sdThresh: TEMPLATE_SD_THRESH,
        imageDataCumsum,
        imageDataSqrCumsum,
      });
      if (vlen === null) {
        featureMap[pos] = 1.0;
        continue;
      }

      const templateWidth = 2 * TEMPLATE_SIZE + 1;
      const nPixels = templateWidth * templateWidth;
      let templateAverage = imageDataCumsum.query(
        i - TEMPLATE_SIZE,
        j - TEMPLATE_SIZE,
        i + TEMPLATE_SIZE,
        j + TEMPLATE_SIZE,
      );
      templateAverage /= nPixels;

      let max = -1.0;
      for (let jj = -SEARCH_SIZE1; jj <= SEARCH_SIZE1; jj++) {
        for (let ii = -SEARCH_SIZE1; ii <= SEARCH_SIZE1; ii++) {
          if (ii * ii + jj * jj <= SEARCH_SIZE2 * SEARCH_SIZE2) continue;

          const sim = _getSimilarity({
            image,
            cx: i + ii,
            cy: j + jj,
            vlen: vlen,
            tx: i,
            ty: j,
            templateAverage, // Pass pre-calculated average
            imageDataCumsum,
            imageDataSqrCumsum,
          });

          if (sim === null) continue;

          if (sim > max) {
            max = sim;
            if (max > MAX_SIM_THRESH) break;
          }
        }
        if (max > MAX_SIM_THRESH) break;
      }
      featureMap[pos] = max;
    }
  }

  // Step 2.2 select feature
  const coords = _selectFeature({
    image,
    featureMap,
    templateSize: TEMPLATE_SIZE,
    searchSize: SEARCH_SIZE2,
    occSize: OCCUPANCY_SIZE,
    maxSimThresh: MAX_THRESH,
    minSimThresh: MIN_THRESH,
    sdThresh: SD_THRESH,
    imageDataCumsum,
    imageDataSqrCumsum,
  });

  return coords;
};

const _selectFeature = (options) => {
  const {
    image,
    featureMap,
    templateSize,
    searchSize,
    occSize,
    maxSimThresh,
    minSimThresh,
    sdThresh,
    imageDataCumsum,
    imageDataSqrCumsum,
  } = options;
  const { width, height } = image;

  const divSize = (templateSize * 2 + 1) * 3;
  const xDiv = Math.floor(width / divSize);
  const yDiv = Math.floor(height / divSize);
  const maxFeatureNum = Math.floor(width / occSize) * Math.floor(height / occSize) + xDiv * yDiv;

  // Collect candidate features
  const candidates = [];
  for (let pos = 0; pos < featureMap.length; pos++) {
    if (featureMap[pos] < maxSimThresh) {
      candidates.push({
        pos,
        sim: featureMap[pos],
        x: pos % width,
        y: Math.floor(pos / width)
      });
    }
  }

  // Sort candidates by similarity (lowest first)
  candidates.sort((a, b) => a.sim - b.sim);

  const coords = [];
  const invalidated = new Uint8Array(width * height);
  const templateWidth = 2 * templateSize + 1;

  for (let k = 0; k < candidates.length; k++) {
    const { x: cx, y: cy, sim: minSim, pos } = candidates[k];

    if (invalidated[pos]) continue;

    const vlen = _templateVar({
      image,
      cx: cx,
      cy: cy,
      sdThresh: 0,
      imageDataCumsum,
      imageDataSqrCumsum,
    });

    if (vlen === null || vlen / templateWidth < sdThresh) {
      continue;
    }

    let min = 1.0;
    let max = -1.0;

    for (let j = -searchSize; j <= searchSize; j++) {
      for (let i = -searchSize; i <= searchSize; i++) {
        if (i * i + j * j > searchSize * searchSize) continue;
        if (i === 0 && j === 0) continue;

        const sim = _getSimilarity({
          image,
          vlen,
          cx: cx + i,
          cy: cy + j,
          tx: cx,
          ty: cy,
          templateAverage: null,
          imageDataCumsum,
          imageDataSqrCumsum,
        });

        if (sim === null) continue;

        if (sim < min) {
          min = sim;
          if (min < minSimThresh && min < minSim) break;
        }
        if (sim > max) {
          max = sim;
          if (max > 0.99) break;
        }
      }
      if ((min < minSimThresh && min < minSim) || max > 0.99) break;
    }

    if ((min < minSimThresh && min < minSim) || max > 0.99) {
      continue;
    }

    coords.push({ x: cx, y: cy });

    // Invalidate neighbors
    const actualOccSize = Math.floor(Math.min(width, height) / 10);
    for (let j = -actualOccSize; j <= actualOccSize; j++) {
      const yy = cy + j;
      if (yy < 0 || yy >= height) continue;
      for (let i = -actualOccSize; i <= actualOccSize; i++) {
        const xx = cx + i;
        if (xx < 0 || xx >= width) continue;
        invalidated[yy * width + xx] = 1;
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

const _getSimilarity = (options) => {
  const { image, cx, cy, vlen, tx, ty, templateAverage, imageDataCumsum, imageDataSqrCumsum } = options;
  const { data: imageData, width, height } = image;
  const templateSize = TEMPLATE_SIZE;

  if (cx - templateSize < 0 || cx + templateSize >= width) return null;
  if (cy - templateSize < 0 || cy + templateSize >= height) return null;

  const templateWidth = 2 * templateSize + 1;

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
  let sxy = 0;

  let p1 = (cy - templateSize) * width + (cx - templateSize);
  let p2 = (ty - templateSize) * width + (tx - templateSize);
  const nextRowOffset = width - templateWidth;

  // Optimization: unrolling or tight loop
  for (let j = 0; j < 13; j++) {
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];
    sxy += imageData[p1++] * imageData[p2++];

    p1 += nextRowOffset;
    p2 += nextRowOffset;
  }

  let avg;
  if (templateAverage !== null && templateAverage !== undefined) {
    avg = templateAverage;
  } else {
    avg = imageDataCumsum.query(
      tx - templateSize,
      ty - templateSize,
      tx + templateSize,
      ty + templateSize,
    ) / (templateWidth * templateWidth);
  }

  sxy -= avg * sx;

  let vlen2 = sxx - (sx * sx) / (templateWidth * templateWidth);
  if (vlen2 <= 0) return null;
  vlen2 = Math.sqrt(vlen2);

  return (1.0 * sxy) / (vlen * vlen2);
};

export { extract };
