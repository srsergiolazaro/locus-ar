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

  const v2Len = v2.length - v2Offset;

  // Protocol V4: 84-byte descriptors (Uint8Array)
  if (v2Len === 84) {
    let d = 0;
    for (let i = 0; i < 84; i++) {
      d += BIT_COUNT_8[v1[v1Offset + i] ^ v2[v2Offset + i]];
    }
    return d;
  }

  // Protocol V5.1: 128-bit LSH (4 x Uint32)
  if (v2Len === 4) {
    return popcount32(v1[v1Offset] ^ v2[v2Offset]) +
      popcount32(v1[v1Offset + 1] ^ v2[v2Offset + 1]) +
      popcount32(v1[v1Offset + 2] ^ v2[v2Offset + 2]) +
      popcount32(v1[v1Offset + 3] ^ v2[v2Offset + 3]);
  }

  // Protocol V5/V6: 64-bit LSH (2 x Uint32)
  return popcount32(v1[v1Offset] ^ v2[v2Offset]) +
    popcount32(v1[v1Offset + 1] ^ v2[v2Offset + 1]);
};

export { compute };
