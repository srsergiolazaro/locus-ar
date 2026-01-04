import { describe, it, expect } from 'vitest';
import { binarizeFREAK128 } from '../src/compiler/utils/lsh-binarizer.js';

describe('LSH Binarizer Accuracy', () => {
    it('should generate consistent hashes', () => {
        const descriptor = new Uint8Array(84);
        for (let i = 0; i < 84; i++) descriptor[i] = Math.floor(Math.random() * 256);

        const h1 = binarizeFREAK128(descriptor);
        const h2 = binarizeFREAK128(descriptor);

        expect(h1[0]).toBe(h2[0]);
        expect(h1[1]).toBe(h2[1]);
        expect(h1[2]).toBe(h2[2]);
        expect(h1[3]).toBe(h2[3]);
    });

    it('should distinguish between different descriptors', () => {
        const d1 = new Uint8Array(84).fill(0);
        const d2 = new Uint8Array(84).fill(255);

        const h1 = binarizeFREAK128(d1);
        const h2 = binarizeFREAK128(d2);

        expect(h1[0]).not.toBe(h2[0]);
    });

    it('should maintain relative distance (LSH property)', () => {
        const base = new Uint8Array(84);
        for (let i = 0; i < 84; i++) base[i] = 170; // 10101010

        const similar = new Uint8Array(base);
        similar[0] ^= 1; // Only 1 bit difference

        const different = new Uint8Array(84);
        for (let i = 0; i < 84; i++) different[i] = 85; // 01010101

        const hBase = binarizeFREAK128(base);
        const hSimilar = binarizeFREAK128(similar);
        const hDifferent = binarizeFREAK128(different);

        // Hamming distance for Uint32Array(4)
        const popcount32 = (n) => {
            n = n - ((n >> 1) & 0x55555555);
            n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
            return (((n + (n >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
        };

        const hamming = (a, b) => {
            return popcount32(a[0] ^ b[0]) +
                popcount32(a[1] ^ b[1]) +
                popcount32(a[2] ^ b[2]) +
                popcount32(a[3] ^ b[3]);
        };

        const dSimilar = hamming(hBase, hSimilar);
        const dDifferent = hamming(hBase, hDifferent);

        console.log(`LSH 128 Hamming Dist (Similar): ${dSimilar}`);
        console.log(`LSH 128 Hamming Dist (Different): ${dDifferent}`);

        expect(dSimilar).toBeLessThan(dDifferent);
    });
});
