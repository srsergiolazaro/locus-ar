import { resize } from "./utils/images.js";

/**
 * Tamaño mínimo de píxeles para el procesamiento de imágenes
 * Un valor más bajo permite detectar imágenes más pequeñas pero aumenta el tiempo de procesamiento
 * @constant {number}
 */
const MIN_IMAGE_PIXEL_SIZE = 32;



/**
 * Construye una lista de imágenes con diferentes escalas para detección de características
 * @param {Object} inputImage - Imagen de entrada con propiedades width, height y data
 * @returns {Array<Object>} Lista de imágenes escaladas con propiedades data, width, height y scale
 */
const buildImageList = (inputImage) => {
  const minScale = MIN_IMAGE_PIXEL_SIZE / Math.min(inputImage.width, inputImage.height);

  const scaleList = [];
  let c = minScale;
  while (true) {
    scaleList.push(c);
    // Optimization: Paso balanceado (aprox 1.5)
    // Mejor cobertura que 2.0, pero mucho más ligero que 1.41 o 1.26
    c *= Math.pow(2.0, 0.6);
    if (c >= 0.95) {
      c = 1;
      break;
    }
  }
  scaleList.push(c);
  scaleList.reverse();

  const imageList = [];
  for (let i = 0; i < scaleList.length; i++) {
    imageList.push(
      Object.assign(resize({ image: inputImage, ratio: scaleList[i] }), { scale: scaleList[i] }),
    );
  }
  return imageList;
};

/**
 * Construye una lista optimizada de imágenes para tracking
 * Genera dos versiones escaladas (256px y 128px) para tracking eficiente
 * @param {Object} inputImage - Imagen de entrada con propiedades width, height y data
 * @returns {Array<Object>} Lista de imágenes escaladas para tracking
 */
const buildTrackingImageList = (inputImage) => {
  const minDimension = Math.min(inputImage.width, inputImage.height);
  const scaleList = [];
  const imageList = [];
  // Generamos versiones de 256px y 128px para tracking robusto a diferentes distancias
  scaleList.push(256.0 / minDimension);
  scaleList.push(128.0 / minDimension);
  for (let i = 0; i < scaleList.length; i++) {
    imageList.push(
      Object.assign(resize({ image: inputImage, ratio: scaleList[i] }), { scale: scaleList[i] }),
    );
  }
  return imageList;
};


export { buildImageList, buildTrackingImageList };
