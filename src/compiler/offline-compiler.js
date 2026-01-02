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

// Detect environment
const isNode = typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

const CURRENT_VERSION = 2;

/**
 * Compilador offline optimizado sin TensorFlow
 */
export class OfflineCompiler {
  constructor() {
    this.data = null;
    this.workerPool = null;

    // Workers solo en Node.js (no en browser)
    if (isNode) {
      this._initNodeWorkers();
    } else {
      console.log("🌐 OfflineCompiler: Browser mode (no workers)");
    }
  }

  async _initNodeWorkers() {
    try {
      const [os, path, url, workerModule] = await Promise.all([
        import("os"),
        import("path"),
        import("url"),
        import("./utils/worker-pool.js")
      ]);

      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const workerPath = path.join(__dirname, "node-worker.js");

      const numWorkers = Math.min(os.cpus().length, 4);
      this.workerPool = new workerModule.WorkerPool(workerPath, numWorkers);
      console.log(`🚀 OfflineCompiler: Node.js mode with ${numWorkers} workers`);
    } catch (e) {
      console.log("⚡ OfflineCompiler: Running without workers");
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
        height: img.height,
        width: img.width,
      });
    }

    // Fase 1: Matching (50%)
    console.time("⏱️ Fase Matching");
    const matchingDataList = await this._compileMatch(targetImages, (percent) => {
      progressCallback(percent * 0.5);
    });
    console.timeEnd("⏱️ Fase Matching");

    // Fase 2: Tracking (50%)
    console.time("⏱️ Fase Tracking");
    const trackingDataList = await this._compileTrack(targetImages, (percent) => {
      progressCallback(50 + percent * 0.5);
    });
    console.timeEnd("⏱️ Fase Tracking");

    // Compilar resultado
    this.data = targetImages.map((targetImage, i) => ({
      targetImage: { width: targetImage.width, height: targetImage.height },
      trackingData: trackingDataList[i],
      matchingData: matchingDataList[i],
    }));

    console.timeEnd("⏱️ Compilación total");

    return this.data;
  }

  /**
   * Compila datos de matching usando DetectorLite (JS puro)
   */
  async _compileMatch(targetImages, progressCallback) {
    const percentPerImage = 100 / targetImages.length;
    let currentPercent = 0;

    const results = [];

    // Procesar secuencialmente para evitar overhead de workers
    // (los workers son útiles para muchas imágenes, pero añaden latencia)
    for (let i = 0; i < targetImages.length; i++) {
      const targetImage = targetImages[i];
      const imageList = buildImageList(targetImage);
      const percentPerScale = percentPerImage / imageList.length;

      const keyframes = [];

      for (const image of imageList) {
        const detector = new DetectorLite(image.width, image.height);
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

  /**
   * Compila datos de tracking usando extractTrackingFeatures (JS puro)
   */
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

  /**
   * Método público para compilar tracking (compatibilidad con API anterior)
   * @param {Object} options - Opciones de compilación
   * @param {Function} options.progressCallback - Callback de progreso
   * @param {Array} options.targetImages - Lista de imágenes objetivo
   * @param {number} options.basePercent - Porcentaje base
   * @returns {Promise<Array>} Datos de tracking
   */
  async compileTrack({ progressCallback, targetImages, basePercent = 0 }) {
    return this._compileTrack(targetImages, (percent) => {
      progressCallback(basePercent + percent * (100 - basePercent) / 100);
    });
  }

  /**
   * Método público para compilar matching (compatibilidad con API anterior)
   */
  async compileMatch({ progressCallback, targetImages, basePercent = 0 }) {
    return this._compileMatch(targetImages, (percent) => {
      progressCallback(basePercent + percent * (50 - basePercent) / 100);
    });
  }

  /**
   * Exporta datos compilados en formato msgpack
   */
  exportData() {
    if (!this.data) {
      throw new Error("No hay datos compilados para exportar");
    }

    const dataList = this.data.map(item => ({
      targetImage: {
        width: item.targetImage.width,
        height: item.targetImage.height,
      },
      trackingData: item.trackingData,
      matchingData: item.matchingData,
    }));

    return msgpack.encode({
      v: CURRENT_VERSION,
      dataList,
    });
  }

  /**
   * Importa datos desde buffer msgpack
   */
  importData(buffer) {
    const content = msgpack.decode(new Uint8Array(buffer));

    if (!content.v || content.v !== CURRENT_VERSION) {
      console.error("Your compiled .mind might be outdated. Please recompile");
      return [];
    }

    this.data = content.dataList.map(item => ({
      targetImage: item.targetImage,
      trackingData: item.trackingData,
      matchingData: item.matchingData,
    }));

    return this.data;
  }

  /**
   * Destruye el pool de workers
   */
  async destroy() {
    if (this.workerPool) {
      await this.workerPool.destroy();
    }
  }
}
