
function clamp(n, min, max) {
  return Math.min(Math.max(min, n), max - 1);
}

const pruneImpl = (vals, width, height) => {
  const w = Math.floor(width / 2);
  const h = Math.floor(height / 2);
  const resultValues = new Float32Array(w * h);
  function getExtrema(x, y) {
    x = clamp(x, 0, width);
    y = clamp(y, 0, height);
    return vals[y * width + x];
  }
  function setOutput(x, y, o) {
    resultValues[y * width + x] = o;
  }

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const x2 = x * 2;
      const y2 = y * 2;

      let location = 0.0;
      let values = getExtrema(x2, y2);

      if (getExtrema(x2, y2 + 1) != 0.0) {
        location = 1.0;
        values = getExtrema(x2, y2 + 1);
      } else if (getExtrema(x2 + 1, y2) != 0.0) {
        location = 2.0;
        values = getExtrema(x2 + 1, y2);
      } else if (getExtrema(x2 + 1, y2 + 1) != 0.0) {
        location = 3.0;
        values = getExtrema(x2 + 1, y2 + 1);
      }

      if (values < 0.0) {
        setOutput(x, y, location * -1000.0 + values);
      } else {
        setOutput(x, y, location * 1000.0 + values);
      }
    }
  }
  return resultValues;
};

const prune = (args) => {
  /** @type {import('@tensorflow/tfjs').TensorInfo} */
  const x = args.inputs.x;
  /** @type {MathBackendCPU} */
  const cpuBackend = args.backend;
  const imageHeight = x.shape[0];
  const imageWidth = x.shape[1];
  /** @type {TypedArray} */
  const values = cpuBackend.data.get(x.dataId).values;

  const resultValues = pruneImpl(values, imageWidth, imageHeight);

  return cpuBackend.makeOutput(
    resultValues,
    [Math.floor(imageHeight / 2), Math.floor(imageWidth / 2)],
    "float32",
  );
};

const pruneConfig = {
  //: KernelConfig
  kernelName: "Prune",
  backendName: "cpu",
  kernelFunc: prune, // as {} as KernelFunc,
};

export {
  pruneConfig,
  prune,
  pruneImpl,
};
