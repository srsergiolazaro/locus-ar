/**
 * TaptappAR Embeddings Module
 * 
 * Exporta todas las funciones de Image Embeddings
 */

export {
    ImageEmbedder,
    ImageEmbedding,
    embedImage,
    compareImages,
    isDuplicate,
    EMBEDDING_CONFIGS
} from './image-embedding.js';

export { ImageSearchBridge, visualSearch } from './bridge.js';
