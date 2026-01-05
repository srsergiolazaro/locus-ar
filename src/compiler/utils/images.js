

// artoolkit version. slower. is it necessary?
const upsampleBilinear = ({ image, padOneWidth, padOneHeight }) => {
  const { width, height, data } = image;

  const dstWidth = image.width * 2 + (padOneWidth ? 1 : 0);
  const dstHeight = image.height * 2 + (padOneHeight ? 1 : 0);

  const temp = new Float32Array(dstWidth * dstHeight);
  for (let i = 0; i < dstWidth; i++) {
    const si = 0.5 * i - 0.25;
    let si0 = Math.floor(si);
    let si1 = Math.ceil(si);
    if (si0 < 0) si0 = 0; // border
    if (si1 >= width) si1 = width - 1; // border

    for (let j = 0; j < dstHeight; j++) {
      const sj = 0.5 * j - 0.25;
      let sj0 = Math.floor(sj);
      let sj1 = Math.ceil(sj);
      if (sj0 < 0) sj0 = 0; // border
      if (sj1 >= height) sj1 = height - 1; //border

      const value =
        (si1 - si) * (sj1 - sj) * data[sj0 * width + si0] +
        (si1 - si) * (sj - sj0) * data[sj1 * width + si0] +
        (si - si0) * (sj1 - sj) * data[sj0 * width + si1] +
        (si - si0) * (sj - sj0) * data[sj1 * width + si1];

      temp[j * dstWidth + i] = value;
    }
  }

  return { data: temp, width: dstWidth, height: dstHeight };
};

const downsampleBilinear = ({ image }) => {
  const { data, width, height } = image;
  const dstWidth = width >>> 1;
  const dstHeight = height >>> 1;

  const temp = new Uint8Array(dstWidth * dstHeight);

  // Speed optimization: using Int32 views and manual indexing
  // Also using bitwise operations for color averaging
  for (let j = 0; j < dstHeight; j++) {
    const row0 = (j * 2) * width;
    const row1 = row0 + width;
    const dstRow = j * dstWidth;

    for (let i = 0; i < dstWidth; i++) {
      const i2 = i * 2;
      // Efficient Int32 math for blurring
      const val = (data[row0 + i2] + data[row0 + i2 + 1] +
        data[row1 + i2] + data[row1 + i2 + 1]) >> 2;
      temp[dstRow + i] = val & 0xFF;
    }
  }

  return { data: temp, width: dstWidth, height: dstHeight };
};

const resize = ({ image, ratio }) => {
  // Fast path for identity
  if (ratio === 1) {
    return {
      data: new Uint8Array(image.data), // Copy to be safe/consistent
      width: image.width,
      height: image.height
    };
  }

  // Recursive downsampling for better quality on large reductions
  if (ratio <= 0.5) {
    // 1024 -> 512 -> ...
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
  // Pre-calculate limits to avoid Math.min inside loop
  const srcW_1 = (srcW - 1) | 0;
  const srcH_1 = (srcH - 1) | 0;

  let dstIndex = 0;

  for (let j = 0; j < height; j++) {
    // Y coords
    const srcY = j / ratio;
    const y0 = srcY | 0; // Math.floor
    const y1 = (y0 < srcH_1 ? y0 + 1 : srcH_1) | 0;
    const fy = srcY - y0;
    const ify = 1 - fy;

    // Row offsets
    const row0 = (y0 * srcW) | 0;
    const row1 = (y1 * srcW) | 0;

    for (let i = 0; i < width; i++) {
      // X coords
      const srcX = i / ratio;
      const x0 = srcX | 0; // Math.floor
      const x1 = (x0 < srcW_1 ? x0 + 1 : srcW_1) | 0;
      const fx = srcX - x0;
      const ifx = 1 - fx;

      // Bilinear interpolation optimized
      // v = (1-fx)(1-fy)v00 + fx(1-fy)v10 + (1-fx)fy*v01 + fx*fy*v11
      // Factored: (1-fy) * ((1-fx)v00 + fx*v10) + fy * ((1-fx)v01 + fx*v11)

      const val0 = srcData[row0 + x0] * ifx + srcData[row0 + x1] * fx;
      const val1 = srcData[row1 + x0] * ifx + srcData[row1 + x1] * fx;

      const value = val0 * ify + val1 * fy;

      imageData[dstIndex++] = value | 0;
    }
  }

  return { data: imageData, width: width, height: height };
};

export { downsampleBilinear, upsampleBilinear, resize };
