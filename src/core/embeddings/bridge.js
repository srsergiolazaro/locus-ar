import { ImageEmbedder } from './image-embedding.js';

/**
 * ImageSearchBridge - A high-level helper to make image embeddings 
 * extremely easy to use for developers.
 */
export class ImageSearchBridge {
    constructor(mode = 'compact') {
        this.embedder = new ImageEmbedder(mode);
    }

    /**
     * Compute an embedding from almost any source
     * @param {string|HTMLImageElement|HTMLCanvasElement|Uint8Array|Buffer} source 
     * @returns {Promise<ImageEmbedding>}
     */
    async compute(source) {
        let imageData = null;
        let width = 0;
        let height = 0;

        // 1. Handle String (URL)
        if (typeof source === 'string') {
            if (typeof document !== 'undefined') {
                source = await this._loadImageBrowser(source);
            } else {
                // In Node, we expect the user to have loaded it or use a buffer
                throw new Error("URL loading in Node requires a fetch/loading utility. Please provide a Buffer or Uint8Array.");
            }
        }

        // 2. Handle Browser Elements
        if (typeof document !== 'undefined') {
            if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement || source instanceof ImageBitmap) {
                const canvas = document.createElement('canvas');
                width = source.width || source.videoWidth;
                height = source.height || source.videoHeight;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(source, 0, 0);
                const rawData = ctx.getImageData(0, 0, width, height).data;
                imageData = this._rgbaToGrayscale(rawData, width, height);
            }
        }

        // 3. Handle Raw Data (Uint8Array / Buffer)
        if (!imageData && (source instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(source)))) {
            // If it's raw data, we assume it's already grayscale or RGBA 
            // This part is tricky without knowing dimensions. 
            // We'll assume the user provides { data, width, height } for raw buffers
            if (source.data && source.width && source.height) {
                imageData = source.data;
                width = source.width;
                height = source.height;
            } else {
                throw new Error("Raw data source must be an object { data, width, height }");
            }
        }

        if (!imageData) {
            throw new Error("Unsupported image source type");
        }

        return this.embedder.embed(imageData, width, height);
    }

    /**
     * Compare two image sources directly
     */
    async compare(sourceA, sourceB) {
        const embA = await this.compute(sourceA);
        const embB = await this.compute(sourceB);
        return this.embedder.compare(embA, embB);
    }

    // --- Private Helpers ---

    _rgbaToGrayscale(rgba, w, h) {
        const gray = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            gray[i] = (rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114) / 255;
        }
        return gray;
    }

    _loadImageBrowser(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }
}

/**
 * Easy-to-use factory for quick tasks
 */
export const visualSearch = new ImageSearchBridge('compact');
