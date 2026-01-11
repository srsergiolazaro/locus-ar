# @srsergio/taptapp-ar

[![npm version](https://img.shields.io/npm/v/@srsergio/taptapp-ar.svg?style=flat-square)](https://www.npmjs.com/package/@srsergio/taptapp-ar)
[![npm downloads](https://img.shields.io/npm/dm/@srsergio/taptapp-ar.svg?style=flat-square)](https://www.npmjs.com/package/@srsergio/taptapp-ar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@srsergio/taptapp-ar?style=flat-square)](https://bundlephobia.com/package/@srsergio/taptapp-ar)

🚀 **TapTapp AR** is a high-performance Augmented Reality (AR) toolkit for **Node.js** and **Browser** environments. It provides an ultra-fast offline compiler and a lightweight runtime for image tracking.

**100% Pure JavaScript**: This package is now completely independent of **TensorFlow.js** for both compilation and real-time tracking, resulting in massive performance gains and zero-latency initialization.

---

## 📖 Table of Contents
- [🌟 Key Features](#-key-features)
- [🛠 Installation](#-installation)
- [📊 Industry-Leading Benchmarks](#-industry-leading-benchmarks-v7-moonshot)
- [🛡️ Robustness & Stability](#️-robustness--stability-stress-tested)
- [🖼️ Compiler Usage](#️-compiler-usage-nodejs--web)
- [🎥 Runtime Usage](#-runtime-usage-ar-tracking)
  - [A-Frame Integration](#1-simple-a-frame-integration)
  - [Three.js Wrapper](#2-high-performance-threejs-wrapper)
  - [Raw Controller](#3-raw-controller-advanced--custom-engines)
  - [Vanilla JS (SimpleAR)](#4-vanilla-js-no-framework-)
- [🏗️ Protocol V7](#️-protocol-v7-moonshot-packed-format)
- [📄 License & Credits](#-license--credits)

---

## 🌟 Key Features

- 🎭 **Non-Rigid Surface Tracking**: Supports curved and deformable surfaces using **Delaunay Meshes** and **Mass-Spring Relaxation**.
- 🚀 **Nanite-style Virtualized Features**: Single-pass multi-octave detection with stratified sampling.
- ⚡ **No TensorFlow Dependency**: No TFJS at all. Works natively in any JS environment (Node, Browser, Workers).
- 🧬 **Fourier Positional Encoding**: Uses high-frequency sine/cosine mappings (GPT-style) for neural-like spatial consistency.
- 🚀 **Protocol V11 (Nanite)**: 
  - **Stratified Multi-Octave Sampling**: 300 reliable features per octave, capped at 1,200 total per target.
  - **Dynamic Scale Filtering (LOD)**: Runtime matching engine skips irrelevant octaves based on estimated scale.
  - **4-bit Packed Tracking Data**: Grayscale images are compressed to 4-bit depth, slashing file size.
  - **64-bit LSH Descriptors**: Optimized Locality Sensitive Hashing with XOR folding support.
- 🧵 **HD Precision Tracking**: Default resolution upgraded to **1280x960 (HD)** for superior sharpness on modern displays.
- ⚡ **Zero-Config JIT Compilation**: No need for offline tools. Just pass an image URL and the engine compiles it on the fly.
- 📏 **Virtualized Scale Range**: Stable tracking from **20% (distant targets)** to **1000% (close-up)** using a single high-res keyframe.
- ⚡ **Immediate AR Detection**: Optimized "warm-up" period (15 frames) with relaxed inlier thresholds (6 pts) for instant tracking lock.
- 📦 **Framework Agnostic**: Includes wrappers for **React**, **A-Frame**, **Three.js**, and a raw **Controller**.
- 📉 **Ultra-Compact Files**: Output `.taar` files are now **~100KB** (vs ~380KB+ previously).

---

## 🛠 Installation

```bash
npm install @srsergio/taptapp-ar
```

---

## 📊 Industry-Leading Benchmarks (v7 Moonshot)

| Metric | Official MindAR | TapTapp AR V11 | Improvement |
| :--- | :--- | :--- | :--- |
| **Compilation Time** | ~23.50s | **~1.15s** | 🚀 **~20x Faster** |
| **Output Size (.taar)** | ~770 KB | **~103 KB** | 📉 **86% Smaller** |
| **Matching Logic** | Brute-force | **Nanite LOD (Scale-Filtered)** | 🧠 **Smart Extraction** |
| **Tracking Data** | 8-bit Gray | **4-bit Packed** | 📦 **50% Data Saving** |
| **Dependency Size** | ~20MB (TFJS) | **< 100KB** | 📦 **99% Smaller Bundle** |

---

## 🛡️ Robustness & Stability (Stress Tested)

The latest version has been rigorously tested with an adaptive stress test (`robustness-check.js`) covering diverse resolutions (VGA to FHD), rotations (X/Y/Z), and scales.

| Metric | Result | Description |
| :--- | :--- | :--- |
| **Pass Rate** | **96.8%** | High success rate across resolutions (209/216). |
| **Drift Tolerance** | **< 2%** | Validated via sub-pixel coordinate system restoration. |
| **Tracking Precision** | **Double-Precision Fix** | Corrected coordinate scaling for all image octaves. |
| **Detection Time** | **< 10ms** | Ultra-fast initial detection on standard CPU. |
| **Total Pipeline** | **~35ms** | Complete loop (Detect + Match + Track + Validate). |

---

## 🖼️ Compiler Usage (Automatic / JIT)

The new **TapTapp AR** engine handles compilation automatically in the browser (Just-In-Time). You likely **don't need** to use the offline compiler manually anymore.

Simply pass your image URL to the tracker, and it will compile it on the fly:

```typescript
// No compilation step needed!
const tracker = await startTracking({
  targetSrc: './my-image.jpg' // Using a JPG/PNG directly
});
```

However, if you still want to pre-compile for faster startup on low-end devices:

```javascript
import { OfflineCompiler } from '@srsergio/taptapp-ar';
// ... same compiler code as before ...
```

---

## 🎥 Runtime Usage (AR Tracking)

### 1. The Easy Way: React Component ⚛️

The simplest, zero-config way to add AR to your app:

```tsx
import { TaptappAR } from '@srsergio/taptapp-ar/react';

export const MyARScene = () => (
  <TaptappAR 
    config={{
      targetImageSrc: "https://example.com/target.jpg", // Direct Image URL
      videoSrc: "https://example.com/overlay.mp4",     // Content to show
      scale: 1.2
    }} 
  />
);
```

### 2. The Powerful Way: `startTracking` API

For vanilla JS or custom integrations, use the new high-level API:

```typescript
import { startTracking } from '@srsergio/taptapp-ar';

const tracker = await startTracking({
    targetSrc: './assets/target.jpg', // No .taar needed!
    container: document.getElementById('ar-container'),
    overlay: document.getElementById('overlay-element'),
    
    // Optional callbacks
    callbacks: {
        onFound: () => console.log("Target Found! 🎯"),
        onLost: () => console.log("Target Lost 👋"),
        onUpdate: (data) => {
             console.log("Stability:", data.avgStability);
        }
    }
});

// Stop later
// tracker.stop();
```

### 3. Advanced Integration (Three.js / A-Frame)

We still provide wrappers for 3D engines if you need to render complex 3D models instead of DOM overlays.

#### Three.js Adapter
```javascript
import { TaarThree } from '@srsergio/taptapp-ar';
// ... (standard Three.js integration)
```

---

## 🏗️ Protocol V11 (Nanite Virtualized Format)
TapTapp AR uses a proprietary **Nanite-style Vision Codec** that is significantly more efficient than standard AR formats.

- **Virtualized Multi-Octave Features**: Instead of storing redundant images for each scale, V11 stores a single high-res keyframe with features stratified across 6 octaves.
- **Dynamic Scale Filtering**: The tracking engine estimates the target's current scale and dynamically filters the matching search space, reducing Hamming distance ops by up to 90%.
- **Non-Rigid Surface Tracking**: Replaces the standard rigid homography with a dynamic **Delaunay Mesh**. This allows the tracker to follow the curvature of posters on cylinders, t-shirts, or slightly bent magazines.
- **Mass-Spring Relaxation**: The tracking mesh is optimized using physical relaxation, minimizing L2 distance between predicted and tracked points while maintaining topological rigidity.
- **Fourier Positional Encoding**: Maps 2D coordinates into a 16-dimensional frequency space. This creates a "Neural Consistency Check" that filters out noise and motion blur by checking for harmonic spatial agreement.
- **4-bit Packed Tracking Data**: Image data used for optical flow is compressed to 4-bit depth.
- **64-bit LSH Fingerprinting**: Feature descriptors are compressed to just 8 bytes using LSH.
- **Binary Matching Engine**: Uses hardware-accelerated population count (`popcount`) and `XOR` for near-instant point matching.
- **Zero-Copy Restoration**: Binary buffers are mapped directly to TypedArrays (Uint32 for descriptors, Float32 for tracking coordinates, Int8 for Fourier signatures).

---

## 📄 License & Credits

MIT © [srsergiolazaro](https://github.com/srsergiolazaro)

Based on the core research of MindAR, but completely re-written for high-performance binary processing and JS-only execution.

