import { FREAKPOINTS } from "../detector/freak.js";

/**
 * 🚀 Moonshot: LSH-Direct Descriptor
 * 
 * Instead of computing 672 bits of FREAK and then sampling 64 bits for LSH,
 * we directly compute only the 64 bits we need.
 * 
 * Speedup: >10x in descriptor generation.
 */

// 1. Pre-calculate the 64 pairs of indices (i, j) that correspond to our LSH sampling
const LSH_PAIRS = new Int32Array(64 * 2);
const SAMPLING_INDICES = new Int32Array(64);
for (let i = 0; i < 64; i++) {
    SAMPLING_INDICES[i] = Math.floor(i * (672 / 64));
}

// Map bit indices to FREAK point pairs
let currentBit = 0;
let samplingIdx = 0;
for (let i = 0; i < FREAKPOINTS.length; i++) {
    for (let j = i + 1; j < FREAKPOINTS.length; j++) {
        if (samplingIdx < 64 && currentBit === SAMPLING_INDICES[samplingIdx]) {
            LSH_PAIRS[samplingIdx * 2] = i;
            LSH_PAIRS[samplingIdx * 2 + 1] = j;
            samplingIdx++;
        }
        currentBit++;
    }
}

/**
 * Directly compute 64-bit LSH from FREAK samples
 * @param {Float32Array} samples - Pre-sampled intensities at FREAK positions
 * @returns {Uint32Array} 2-element array (64 bits)
 */
export function computeLSH64(samples) {
    const result = new Uint32Array(2);

    for (let i = 0; i < 64; i++) {
        const p1 = LSH_PAIRS[i * 2];
        const p2 = LSH_PAIRS[i * 2 + 1];

        if (samples[p1] < samples[p2]) {
            const uintIdx = i >> 5; // i / 32
            const uintBitIdx = i & 31; // i % 32
            result[uintIdx] |= (1 << uintBitIdx);
        }
    }

    return result;
}

// For backward compatibility if any 84-byte descriptor is still needed
export function computeFullFREAK(samples) {
    const descriptor = new Uint8Array(84);
    let bitCount = 0;
    let byteIdx = 0;

    for (let i = 0; i < FREAKPOINTS.length; i++) {
        for (let j = i + 1; j < FREAKPOINTS.length; j++) {
            if (samples[i] < samples[j]) {
                descriptor[byteIdx] |= (1 << (7 - bitCount));
            }
            bitCount++;
            if (bitCount === 8) {
                byteIdx++;
                bitCount = 0;
            }
        }
    }
    return descriptor;
}

/**
 * Super-fast 8-byte (64-bit) dummy descriptor for Protocol V6 compatibility
 * when full descriptors are not required but an object is expected.
 */
export function packLSHIntoDescriptor(lsh) {
    const desc = new Uint8Array(8);
    const view = new DataView(desc.buffer);
    view.setUint32(0, lsh[0], true);
    view.setUint32(4, lsh[1], true);
    return desc;
}
