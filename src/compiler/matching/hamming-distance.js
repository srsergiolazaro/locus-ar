// Precomputed bit count lookup table for Uint8Array
const BIT_COUNT_8 = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let c = 0, n = i;
  while (n > 0) { n &= (n - 1); c++; }
  BIT_COUNT_8[i] = c;
}

/**
 * 🚀 Moonshot Optimized Popcount
 * Uses a slightly faster bitwise sequence for 32-bit integers
 */
function popcount32(n) {
  n = n >>> 0; // Force unsigned
  n -= (n >>> 1) & 0x55555555;
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
}

/**
 * Super-optimized Hamming distance for 64-bit LSH (2x Uint32)
 * NO OBJECTS, NO OPTIONS, JUST PURE SPEED.
 */
const compute64 = (v1, v1Idx, v2, v2Idx) => {
  // Inline XOR and popcount for maximum speed
  let x1 = (v1[v1Idx] ^ v2[v2Idx]) >>> 0;
  let x2 = (v1[v1Idx + 1] ^ v2[v2Idx + 1]) >>> 0;

  // Popcount 1
  x1 -= (x1 >>> 1) & 0x55555555;
  x1 = (x1 & 0x33333333) + ((x1 >>> 2) & 0x33333333);
  const count1 = (((x1 + (x1 >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;

  // Popcount 2
  x2 -= (x2 >>> 1) & 0x55555555;
  x2 = (x2 & 0x33333333) + ((x2 >>> 2) & 0x33333333);
  const count2 = (((x2 + (x2 >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;

  return count1 + count2;
};

/**
 * Generic compute for backward compatibility
 */
const compute = (options) => {
  const { v1, v2, v1Offset = 0, v2Offset = 0 } = options;
  const v2Len = v2.length - v2Offset;

  if (v2Len === 2) {
    return compute64(v1, v1Offset, v2, v2Offset);
  }

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

  return popcount32(v1[v1Offset] ^ v2[v2Offset]) +
    popcount32(v1[v1Offset + 1] ^ v2[v2Offset + 1]);
};

export { compute, compute64 };
