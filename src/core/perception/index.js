/**
 * Bio-Inspired Perception Module
 * 
 * Human visual system-inspired components for efficient AR processing.
 * Expected improvements over traditional frame-based processing:
 * 
 * - ~75% reduction in pixels processed per frame (foveal attention)
 * - ~80% reduction in latency for static scenes (predictive coding)
 * - ~70% reduction in energy consumption
 * - Maintains tracking accuracy through strategic attention allocation
 */

export { BioInspiredEngine, BIO_CONFIG } from './bio-inspired-engine.js';
export { FovealAttention } from './foveal-attention.js';
export { SaccadicController } from './saccadic-controller.js';
export { PredictiveCoding } from './predictive-coding.js';
export { SaliencyMap } from './saliency-map.js';
