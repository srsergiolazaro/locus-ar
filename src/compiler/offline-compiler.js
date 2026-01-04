/**
 * @fileoverview Compilador Offline Optimizado - Sin TensorFlow para máxima velocidad
 * 
 * Este módulo implementa un compilador de imágenes AR ultrarrápido
 * que NO depende de TensorFlow, eliminando todos los problemas de
 * inicialización, bloqueos y compatibilidad.
 * 
 * Usa JavaScript puro para:
 * - Extracción de features de tracking (extract.js)
 * - Detección de features para matching (DetectorLite)
 * - Clustering jerárquico para features
 * 
 * Funciona en:
 * - Node.js (con workers opcionales)
 * - Browser (sin workers)
 */

import { buildTrackingImageList, buildImageList } from "./image-list.js";
import { extractTrackingFeatures } from "./tracker/extract-utils.js";
import { DetectorLite } from "./detector/detector-lite.js";
import { build as hierarchicalClusteringBuild } from "./matching/hierarchical-clustering.js";
import * as msgpack from "@msgpack/msgpack";
import { WorkerPool } from "./utils/worker-pool.js";

// Detect environment
const isNode = typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

const CURRENT_VERSION = 6; // Protocol v6: Moonshot - LSH 64-bit

/**
 * Compilador offline optimizado sin TensorFlow
 */
export class OfflineCompiler {
  constructor() {
    this.data = null;
    this.workerPool = null;

    // Workers only in Node.js (no en browser)
    if (isNode) {
      // Lazy init workers only when needed
    } else {
      console.log("🌐 OfflineCompiler: Browser mode (no workers)");
    }
  }

  async _initNodeWorkers() {
    try {
      // Use variables to prevent bundlers from trying to bundle these
      const pathModule = "path";
      const urlModule = "url";
      const osModule = "os";
      const workerThreadsModule = "node:worker_threads";

      const [path, url, os, { Worker }] = await Promise.all([
        import(pathModule),
        import(urlModule),
        import(osModule),
        import(workerThreadsModule)
      ]);

      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const workerPath = path.join(__dirname, "node-worker.js");

      // Limit workers to avoid freezing system
      const numWorkers = Math.min(os.cpus().length, 4);

      this.workerPool = new WorkerPool(workerPath, numWorkers, Worker);
    } catch (e) {
      console.log("⚡ OfflineCompiler: Running without workers (initialization failed)", e);
    }
  }

  /**
   * Compila una lista de imágenes objetivo
   * @param {Array} images - Lista de imágenes {width, height, data}
   * @param {Function} progressCallback - Callback de progreso (0-100)
   * @returns {Promise<Array>} Datos compilados
   */
  async compileImageTargets(images, progressCallback) {
    console.time("⏱️ Compilación total");

    const targetImages = [];

    // Preparar imágenes
    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      if (!img || !img.width || !img.height || !img.data) {
        throw new Error(
          `Imagen inválida en posición ${i}. Debe tener propiedades width, height y data.`
        );
      }

      // Convertir a escala de grises
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
        throw new Error(`Formato de datos de imagen no soportado en posición ${i}`);
      }

      targetImages.push({
        data: greyImageData,
        width: img.width,
        height: img.height,
      });
    }

    // Compilar Match y Track por separado
    const matchingDataList = await this._compileMatch(targetImages, (p) => {
      progressCallback(p * 0.7); // 70% Match
    });

    const trackingDataList = await this._compileTrack(targetImages, (p) => {
      progressCallback(70 + p * 0.3); // 30% Track
    });

    this.data = targetImages.map((img, i) => ({
      targetImage: img,
      matchingData: matchingDataList[i],
      trackingData: trackingDataList[i],
    }));

    console.timeEnd("⏱️ Compilación total");
    return this.data;
  }

  async _compileMatch(targetImages, progressCallback) {
    const percentPerImage = 100 / targetImages.length;
    let currentPercent = 0;

    // Use workers if available
    if (isNode) await this._initNodeWorkers();
    if (this.workerPool) {
      const progressMap = new Float32Array(targetImages.length);

      const wrappedPromises = targetImages.map((targetImage, index) => {
        return this.workerPool.runTask({
          type: 'match',
          targetImage,
          percentPerImage,
          basePercent: 0,
          onProgress: (p) => {
            progressMap[index] = p;
            const sum = progressMap.reduce((a, b) => a + b, 0);
            progressCallback(sum);
          }
        });
      });

      return Promise.all(wrappedPromises);
    }

    // Serial Fallback
    const results = [];
    for (let i = 0; i < targetImages.length; i++) {
      const targetImage = targetImages[i];
      const imageList = buildImageList(targetImage);
      const percentPerScale = percentPerImage / imageList.length;

      const keyframes = [];

      for (const image of imageList) {
        const detector = new DetectorLite(image.width, image.height, { useLSH: true });
        const { featurePoints: ps } = detector.detect(image.data);

        const maximaPoints = ps.filter((p) => p.maxima);
        const minimaPoints = ps.filter((p) => !p.maxima);
        const maximaPointsCluster = hierarchicalClusteringBuild({ points: maximaPoints });
        const minimaPointsCluster = hierarchicalClusteringBuild({ points: minimaPoints });

        keyframes.push({
          maximaPoints,
          minimaPoints,
          maximaPointsCluster,
          minimaPointsCluster,
          width: image.width,
          height: image.height,
          scale: image.scale,
        });

        currentPercent += percentPerScale;
        progressCallback(currentPercent);
      }

      results.push(keyframes);
    }

    return results;
  }

  async _compileTrack(targetImages, progressCallback) {
    const percentPerImage = 100 / targetImages.length;
    let currentPercent = 0;

    if (this.workerPool) {
      const progressMap = new Float32Array(targetImages.length);
      const wrappedPromises = targetImages.map((targetImage, index) => {
        return this.workerPool.runTask({
          type: 'compile',
          targetImage,
          percentPerImage,
          basePercent: 0,
          onProgress: (p) => {
            progressMap[index] = p;
            const sum = progressMap.reduce((a, b) => a + b, 0);
            progressCallback(sum);
          }
        });
      });
      return Promise.all(wrappedPromises);
    }

    // Serial Fallback
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
      const matchingData = item.matchingData.map((kf) => this._packKeyframe(kf));

      const trackingData = [item.trackingData[0]].map((td) => {
        const count = td.points.length;
        // Step 1: Packed Coords - Normalize width/height to 16-bit
        const px = new Uint16Array(count);
        const py = new Uint16Array(count);
        for (let i = 0; i < count; i++) {
          px[i] = Math.round((td.points[i].x / td.width) * 65535);
          py[i] = Math.round((td.points[i].y / td.height) * 65535);
        }
        return {
          w: td.width,
          h: td.height,
          s: td.scale,
          px,
          py,
          d: td.data, // Grayscale pixel data (Uint8Array)
        };
      });

      return {
        targetImage: {
          width: item.targetImage.width,
          height: item.targetImage.height,
        },
        trackingData,
        matchingData,
      };
    });

    return msgpack.encode({
      v: CURRENT_VERSION,
      dataList,
    });
  }

  _getMorton(x, y) {
    // Interleave bits of x and y
    let x_int = x | 0;
    let y_int = y | 0;

    x_int = (x_int | (x_int << 8)) & 0x00FF00FF;
    x_int = (x_int | (x_int << 4)) & 0x0F0F0F0F;
    x_int = (x_int | (x_int << 2)) & 0x33333333;
    x_int = (x_int | (x_int << 1)) & 0x55555555;

    y_int = (y_int | (y_int << 8)) & 0x00FF00FF;
    y_int = (y_int | (y_int << 4)) & 0x0F0F0F0F;
    y_int = (y_int | (y_int << 2)) & 0x33333333;
    y_int = (y_int | (y_int << 1)) & 0x55555555;

    return x_int | (y_int << 1);
  }

  _packKeyframe(kf) {
    // Step 2.1: Morton Sorting - Sort points spatially to improve Delta-Descriptor XOR
    const sortPoints = (points) => {
      return [...points].sort((a, b) => {
        return this._getMorton(a.x, a.y) - this._getMorton(b.x, b.y);
      });
    };

    const sortedMaxima = sortPoints(kf.maximaPoints);
    const sortedMinima = sortPoints(kf.minimaPoints);

    // Rebuild clusters with sorted indices
    const sortedMaximaCluster = hierarchicalClusteringBuild({ points: sortedMaxima });
    const sortedMinimaCluster = hierarchicalClusteringBuild({ points: sortedMinima });

    return {
      w: kf.width,
      h: kf.height,
      s: kf.scale,
      max: this._columnarize(sortedMaxima, sortedMaximaCluster, kf.width, kf.height),
      min: this._columnarize(sortedMinima, sortedMinimaCluster, kf.width, kf.height),
    };
  }

  _columnarize(points, tree, width, height) {
    const count = points.length;
    // Step 1: Packed Coords - Normalize to 16-bit
    const x = new Uint16Array(count);
    const y = new Uint16Array(count);
    // Step 1.1: Angle Quantization - Int16
    const angle = new Int16Array(count);
    // Step 1.2: Scale Indexing - Uint8
    const scale = new Uint8Array(count);

    // Step 3: LSH 64-bit Descriptors - Uint32Array (2 elements per point)
    const descriptors = new Uint32Array(count * 2);

    for (let i = 0; i < count; i++) {
      x[i] = Math.round((points[i].x / width) * 65535);
      y[i] = Math.round((points[i].y / height) * 65535);
      angle[i] = Math.round((points[i].angle / Math.PI) * 32767);
      scale[i] = Math.round(Math.log2(points[i].scale || 1));

      if (points[i].descriptors && points[i].descriptors.length >= 2) {
        descriptors[i * 2] = points[i].descriptors[0];
        descriptors[(i * 2) + 1] = points[i].descriptors[1];
      }
    }

    return {
      x,
      y,
      a: angle,
      s: scale,
      d: descriptors,
      t: this._compactTree(tree.rootNode),
    };
  }

  _compactTree(node) {
    if (node.leaf) {
      return [1, node.centerPointIndex || 0, node.pointIndexes];
    }
    return [0, node.centerPointIndex || 0, node.children.map((c) => this._compactTree(c))];
  }

  importData(buffer) {
    const content = msgpack.decode(new Uint8Array(buffer));

    const version = content.v || 0;
    if (version !== CURRENT_VERSION && version !== 5) {
      console.error(`Incompatible .mind version: ${version}. This engine only supports Protocol V5/V6.`);
      return [];
    }
    const descSize = version >= 6 ? 2 : 4;

    // Restore TypedArrays from Uint8Arrays returned by msgpack
    const dataList = content.dataList;
    for (let i = 0; i < dataList.length; i++) {
      const item = dataList[i];

      // Unpack Tracking Data
      for (const td of item.trackingData) {
        let pxRaw = td.px;
        let pyRaw = td.py;

        if (pxRaw instanceof Uint8Array) {
          pxRaw = new Uint16Array(pxRaw.buffer.slice(pxRaw.byteOffset, pxRaw.byteOffset + pxRaw.byteLength));
        }
        if (pyRaw instanceof Uint8Array) {
          pyRaw = new Uint16Array(pyRaw.buffer.slice(pyRaw.byteOffset, pyRaw.byteOffset + pyRaw.byteLength));
        }

        // Rescale for compatibility with Tracker
        const count = pxRaw.length;
        const px = new Float32Array(count);
        const py = new Float32Array(count);
        for (let k = 0; k < count; k++) {
          px[k] = (pxRaw[k] / 65535) * td.w;
          py[k] = (pyRaw[k] / 65535) * td.h;
        }
        td.px = px;
        td.py = py;
      }

      // Unpack Matching Data
      for (const kf of item.matchingData) {
        for (const col of [kf.max, kf.min]) {
          let xRaw = col.x;
          let yRaw = col.y;

          if (xRaw instanceof Uint8Array) {
            xRaw = new Uint16Array(xRaw.buffer.slice(xRaw.byteOffset, xRaw.byteOffset + xRaw.byteLength));
          }
          if (yRaw instanceof Uint8Array) {
            yRaw = new Uint16Array(yRaw.buffer.slice(yRaw.byteOffset, yRaw.byteOffset + yRaw.byteLength));
          }

          // Rescale for compatibility with Matcher
          const count = xRaw.length;
          const x = new Float32Array(count);
          const y = new Float32Array(count);
          for (let k = 0; k < count; k++) {
            x[k] = (xRaw[k] / 65535) * kf.w;
            y[k] = (yRaw[k] / 65535) * kf.h;
          }
          col.x = x;
          col.y = y;

          if (col.a instanceof Uint8Array) {
            const aRaw = new Int16Array(col.a.buffer.slice(col.a.byteOffset, col.a.byteOffset + col.a.byteLength));
            const a = new Float32Array(count);
            for (let k = 0; k < count; k++) {
              a[k] = (aRaw[k] / 32767) * Math.PI;
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

          // Restore LSH descriptors (Uint32Array)
          if (col.d instanceof Uint8Array) {
            col.d = new Uint32Array(col.d.buffer.slice(col.d.byteOffset, col.d.byteOffset + col.d.byteLength));
          }
        }
      }
    }

    this.data = dataList;
    return { version, dataList };
  }

  _unpackKeyframe(kf) {
    return {
      width: kf.w,
      height: kf.h,
      scale: kf.s,
      maximaPoints: this._decolumnarize(kf.max, kf.w, kf.h),
      minimaPoints: this._decolumnarize(kf.min, kf.w, kf.h),
      maximaPointsCluster: { rootNode: this._expandTree(kf.max.t) },
      minimaPointsCluster: { rootNode: this._expandTree(kf.min.t) },
    };
  }

  _decolumnarize(col, width, height) {
    const points = [];
    const count = col.x.length;
    const descSize = col.d.length / count;

    for (let i = 0; i < count; i++) {
      points.push({
        x: (col.x[i] / 65535) * width,
        y: (col.y[i] / 65535) * height,
        angle: col.a[i],
        scale: col.s ? col.s[i] : 1.0,
        descriptors: col.d.slice(i * descSize, (i + 1) * descSize),
      });
    }
    return points;
  }

  _expandTree(node) {
    const isLeaf = node[0] === 1;
    if (isLeaf) {
      return {
        leaf: true,
        centerPointIndex: node[1],
        pointIndexes: node[2],
      };
    }
    return {
      leaf: false,
      centerPointIndex: node[1],
      children: node[2].map((c) => this._expandTree(c)),
    };
  }

  async destroy() {
    if (this.workerPool) {
      await this.workerPool.destroy();
    }
  }
}
