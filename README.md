# @srsergio/taptapp-ar

[![npm version](https://img.shields.io/npm/v/@srsergio/taptapp-ar.svg?style=flat-square)](https://www.npmjs.com/package/@srsergio/taptapp-ar)
[![npm downloads](https://img.shields.io/npm/dm/@srsergio/taptapp-ar.svg?style=flat-square)](https://www.npmjs.com/package/@srsergio/taptapp-ar)
[![License: Fair Source-0.9](https://img.shields.io/badge/License-Fair_Source--0.9-blue.svg?style=flat-square)](./LICENSE)
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
- [🔍 Visual Search & Embeddings](#-visual-search--embeddings-new)
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
| **Compilation Time** | ~23.50s | **~1.69s (HD)** | 🚀 **~14x Faster** |
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

### 📦 Using a Pre-compiled `.taar` File

If you already have a pre-compiled `.taar` file (generated by the offline compiler or provided by another developer), you can skip the JIT compilation entirely by passing it directly to the tracker:

```typescript
// Using a pre-compiled .taar file (skips JIT compilation)
const tracker = await startTracking({
  targetSrc: './my-precompiled-target.taar' // Direct .taar file
});
```

**Benefits of using pre-compiled `.taar` files:**
- ⚡ **Instant startup**: No compilation delay on first load.
- 📱 **Better for low-end devices**: Avoids CPU-intensive compilation.
- 🔄 **Consistent results**: Same binary across all deployments.

**When to use JIT vs Pre-compiled:**
| Use Case | Recommended Approach |
| :--- | :--- |
| Development / Prototyping | JIT (just use `.jpg`/`.png`) |
| Production / Low-end devices | Pre-compiled `.taar` |
| Dynamic user-uploaded images | JIT |
| Static marketing campaigns | Pre-compiled `.taar` |

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

### 2. High-Performance React Hook: `useAR` 🪝

For more control over the AR state or custom UI overlays:

```tsx
import { useAR } from '@srsergio/taptapp-ar/react';

const MyCustomAR = () => {
  const { 
    containerRef, 
    overlayRef, 
    status, 
    trackedPoints, 
    error 
  } = useAR({
    targetImageSrc: "target.png",
    scale: 1.0
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh' }}>
      {/* Your custom 3D or 2D overlay */}
      <video ref={overlayRef} src="content.mp4" />
      
      {/* Use trackedPoints for custom visualizations */}
      {trackedPoints.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: p.x, top: p.y }} />
      ))}
    </div>
  );
};
```

### 3. Native API: `startTracking`

For vanilla JS or custom integrations:

```typescript
const tracker = await startTracking({
    targetSrc: './assets/target.jpg',
    container: document.getElementById('ar-container'),
    overlay: document.getElementById('overlay-element'),
    
    // 📸 Custom Camera Config
    cameraConfig: {
        facingMode: 'environment', // Use back camera
        width: { ideal: 1920 },    // Request Full HD
        height: { ideal: 1080 }
    },
    
    callbacks: {
        onFound: () => console.log("Target Found!"),
        onUpdate: (data) => {
             console.log(`Stability: ${data.avgStability}`);
        }
    }
});
```

### 4. Custom Overlays (Beyond Video/Images) 🧩

The `overlay` isn't limited to images or videos. You can use **any HTML element** (divs, buttons, canvas, etc.). The engine will apply the transformation matrix automatically to align it with the target.

```tsx
// Using an interactive HTML overlay in React
const InteractiveAR = () => {
  const { containerRef, overlayRef, status } = useAR({
    targetImageSrc: "map.jpg",
    scale: 1.0
  });

  return (
    <div ref={containerRef}>
      {/* 🚀 This div will be pinned and skewed to the physical target */}
      <div 
        ref={overlayRef as any} 
        style={{ background: 'white', padding: '10px', borderRadius: '8px' }}
      >
        <h4>Dynamic UI</h4>
        <button onClick={() => alert('Clicked!')}>Interacción AR</button>
      </div>
    </div>
  );
};
```

#### `TrackingUpdate` Data Object
The `onUpdate` callback provides a rich data object:
- `isTracking`: Boolean status.
- `avgReliability`: (0-1) Confidence of the match.
- `avgStability`: (0-1) Movement smoothness.
- `screenCoords`: Array of `{x, y, id}` of tracked points.
- `worldMatrix`: 4x4 matrix for WebGL/Three.js integration.
- `targetDimensions`: `[width, height]` of the source target.

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

## � Visual Search & Embeddings (NEW!) 🚀

TapTapp AR now includes a state-of-the-art **Image Embedding** system based on Hyperdimensional Computing (HDC). This allows you to convert any image into a tiny mathematical fingerprint (vector) for ultra-fast visual search, deduplication, and clustering.

### 🍱 Embedding Modes
| Mode | Size | Speed | Recommendation |
| :--- | :--- | :--- | :--- |
| `micro` | 4 Bytes | 10M+ ops/s | Extreme IoT |
| **`compact`** | **16 Bytes** | **44M+ ops/s** | 🏆 **Best for Mega-Databases** |
| `standard`| 32 Bytes | 18M+ ops/s | Balanced AR |
| `full` | 128 Bytes| 7M+ ops/s | Maximum Precision |

### 🚀 Usage Example (RAG Standard 🧠)
Create visual embeddings and compare them just like you do with Text LLMs:

```javascript
import { visualSearch } from '@srsergio/taptapp-ar';

// 1. Get a Dense Vector (Array of numbers) - LLM Standard
const embedding = await visualSearch.compute('product.jpg');
const vector = embedding.toFloatArray(); // [1.0, 0.0, 1.0, ...]

// 2. Similarity Search (Self-contained)
const score = await visualSearch.compare('item1.jpg', 'item2.jpg');
console.log(`Visual Match: ${score * 100}%`);
```

### 🗄️ Vector Database Integration
Use your favorite vector database (Pinecone, Milvus, Weaviate, or `pgvector`) with the standard array format:

```javascript
// Example: Storing in a standard Vector DB
await vectorDB.insert({
  id: 'image_42',
  vector: Array.from(embedding.toFloatArray()), 
  metadata: { name: 'Vintage Camera', category: 'Electronics' }
});

// Example: Searching in PostgreSQL (pgvector)
// SELECT * FROM items ORDER BY embedding <=> '[1,0,1,1...]' LIMIT 5;
```

---

---

## �📄 License & Credits

This project is licensed under the **Fair Source License v0.9**.

### What does this mean?
- **Small Entities & Individuals**: You can use, modify, and distribute this software for **FREE** (including commercial use).
- **Large Entities**: If your organization has **100+ employees** OR **$10,000,000+ USD in annual revenue**, you must obtain a separate commercial license from the copyright holder before using it in a commercial context.

This model allows us to keep the project open and free for the community while ensuring sustainability from large-scale corporate usage.

---
MIT © [srsergiolazaro](https://github.com/srsergiolazaro)

Based on core research from the community, but completely re-written for high-performance binary processing and JS-only execution.


