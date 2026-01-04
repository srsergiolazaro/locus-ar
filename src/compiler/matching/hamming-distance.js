// Precomputed bit count lookup table for Uint8Array
const BIT_COUNT_8 = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let c = 0, n = i;
  while (n > 0) { n &= (n - 1); c++; }
  BIT_COUNT_8[i] = c;
}

/**
 * Optimized popcount for 32-bit integers
 */
function popcount32(n) {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}

const compute = (options) => {
  const { v1, v2, v1Offset = 0, v2Offset = 0 } = options;

  // Protocol V5 Path: 64-bit LSH (two Uint32)
  if (v1.length === v2.length && (v1.length / (v1.buffer.byteLength / v1.length)) === 2) {
    // This is a bit hacky check, better if we know the version. 
    // Assuming if it's not 84 bytes, it's the new 8-byte format.
  }

  // If descriptors are 84 bytes (Protocol V4)
  if (v1.length >= v1Offset + 84 && v2.length >= v2Offset + 84 && v1[v1Offset + 83] !== undefined) {
    let d = 0;
    for (let i = 0; i < 84; i++) {
      d += BIT_COUNT_8[v1[v1Offset + i] ^ v2[v2Offset + i]];
    }
    return d;
  }

  // Protocol V5.1 Path: LSH 128-bit (4 x 32-bit)
  // We expect v1 and v2 to be slices or offsets of Uint32Array
  if (v1.length >= v1Offset + 4 && v2.length >= v2Offset + 4 && v1[v1Offset + 3] !== undefined) {
    return popcount32(v1[v1Offset] ^ v2[v2Offset]) +
      popcount32(v1[v1Offset + 1] ^ v2[v2Offset + 1]) +
      popcount32(v1[v1Offset + 2] ^ v2[v2Offset + 2]) +
      popcount32(v1[v1Offset + 3] ^ v2[v2Offset + 3]);
  }

  // Protocol V5 Path: LSH 64-bit (2 x 32-bit)
  // We expect v1 and v2 to be slices or offsets of Uint32Array
  return popcount32(v1[v1Offset] ^ v2[v2Offset]) +
    popcount32(v1[v1Offset + 1] ^ v2[v2Offset + 1]);
};

export { compute };
