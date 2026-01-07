import { extract } from "./extract.js";

/**
 * Extrae características de tracking de una lista de imágenes
 * Procesa cada imagen para obtener puntos característicos y datos de escala
 * @param {Array<Object>} imageList - Lista de imágenes a procesar
 * @param {Function} doneCallback - Función de callback para reportar progreso
 * @returns {Array<Object>} Conjunto de características extraídas
 */
export const extractTrackingFeatures = (imageList, doneCallback) => {
  const featureSets = [];

  // Procesar cada imagen en la lista
  for (let i = 0; i < imageList.length; i++) {
    const image = imageList[i];

    // Extraer puntos característicos
    const points = extract(image);

    // Construir conjunto de características
    const featureSet = {
      data: image.data,
      scale: image.scale,
      width: image.width,
      height: image.height,
      points,
    };
    featureSets.push(featureSet);

    // Reportar progreso
    doneCallback(i);
  }
  return featureSets;
};
