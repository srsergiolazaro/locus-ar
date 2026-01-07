/**
 * InputLoader - Maneja la carga de imágenes y video sin TensorFlow
 */
class InputLoader {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grayscaleBuffer = new Uint8Array(width * height);

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      this.context = canvas.getContext("2d", { willReadFrequently: true, alpha: false });
    }
  }

  /**
   * Carga una imagen o video y devuelve los datos en escala de grises
   * @param {HTMLVideoElement|HTMLImageElement|ImageData|Uint8Array} input - La fuente de entrada
   * @returns {Uint8Array} Datos de imagen en escala de grises (width * height)
   */
  loadInput(input) {
    // Si ya es un Uint8Array de escala de grises, lo devolvemos
    if (input instanceof Uint8Array && input.length === this.width * this.height) {
      return input;
    }

    // Si es ImageData, convertimos a escala de grises directamente
    if (typeof ImageData !== "undefined" && input instanceof ImageData) {
      this._convertToGrayscale(input.data, input.width, input.height);
      return this.grayscaleBuffer;
    }

    // En el navegador, usamos canvas para procesar video/imágenes
    if (this.context) {
      this.context.clearRect(0, 0, this.width, this.height);

      const isInputRotated = input.width === this.height && input.height === this.width;

      if (isInputRotated) {
        this.context.save();
        this.context.translate(this.width / 2, this.height / 2);
        this.context.rotate(Math.PI / 2);
        this.context.drawImage(input, -input.width / 2, -input.height / 2);
        this.context.restore();
      } else {
        this.context.drawImage(input, 0, 0, this.width, this.height);
      }

      const imageData = this.context.getImageData(0, 0, this.width, this.height);
      this._convertToGrayscale(imageData.data, this.width, this.height);
      return this.grayscaleBuffer;
    }

    // Fallback para Node.js o entornos sin DOM
    if (input.data && input.data instanceof Uint8Array) {
      this._convertToGrayscale(input.data, input.width || this.width, input.height || this.height);
      return this.grayscaleBuffer;
    }

    throw new Error("Input no soportado o entorno sin Canvas");
  }

  /**
   * Convierte datos RGBA a escala de grises optimizada (reutilizando buffer)
   */
  _convertToGrayscale(rgbaData, width, height) {
    const grayscale = this.grayscaleBuffer;
    const len = (width * height);

    // Optimized loop with bitwise ops
    for (let i = 0; i < len; i++) {
      const offset = i << 2;
      // Formula de luminosidad estándar: 0.299R + 0.587G + 0.114B (scaled by 256)
      grayscale[i] = (rgbaData[offset] * 77 + rgbaData[offset + 1] * 150 + rgbaData[offset + 2] * 29) >> 8;
    }
  }
}

export { InputLoader };
