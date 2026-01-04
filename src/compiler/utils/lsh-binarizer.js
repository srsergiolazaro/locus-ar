/**
 * LSH Binarizer for FREAK descriptors.
 * 
 * This utility implements Locality Sensitive Hashing (LSH) for binary descriptors.
 * It uses simple Bit-Sampling to reduce the 672 bits (84 bytes) of a FREAK 
 * descriptor into a 64-bit (8-byte) fingerprint.
 * 
 * Bit-sampling is chosen for maximum speed and zero memory overhead, 
 * which fits the Moonshot goal of an ultra-lightweight bundle.
 */

// For 64-bit LSH, we use a uniform sampling across the 672-bit descriptor.
const SAMPLING_INDICES = new Int32Array(64);
for (let i = 0; i < 64; i++) {
    SAMPLING_INDICES[i] = Math.floor(i * (672 / 64));
}

/**
 * Converts an 84-byte FREAK descriptor into a Uint32Array of 2 elements (64 bits).
 * @param {Uint8Array} descriptor - The 84-byte FREAK descriptor.
 * @returns {Uint32Array} Array of two 32-bit integers.
 */
export function binarizeFREAK64(descriptor) {
    const result = new Uint32Array(2);

    for (let i = 0; i < 64; i++) {
        const bitIndex = SAMPLING_INDICES[i];
        const byteIdx = bitIndex >> 3;
        const bitIdx = 7 - (bitIndex & 7);

        if ((descriptor[byteIdx] >> bitIdx) & 1) {
            const uintIdx = i >> 5; // i / 32
            const uintBitIdx = i & 31; // i % 32
            result[uintIdx] |= (1 << uintBitIdx);
        }
    }

    return result;
}

// Backward compatibility or for other uses
export const binarizeFREAK128 = binarizeFREAK64;
export const binarizeFREAK32 = binarizeFREAK64;
