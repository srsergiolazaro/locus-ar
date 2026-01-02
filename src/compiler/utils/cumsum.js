// fast 2D submatrix sum using cumulative sum algorithm
class Cumsum {
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
        this.cumsum[pos] =
          data[pos] +
          this.cumsum[(j - 1) * width + i] +
          this.cumsum[j * width + i - 1] -
          this.cumsum[(j - 1) * width + i - 1];
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
}

export { Cumsum };
