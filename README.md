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

- 🖼️ **Hyper-Fast Compiler**: Pure JavaScript compiler that generates `.taar` files in **< 3s**.
- ⚡ **No TensorFlow Dependency**: No TFJS at all. Works natively in any JS environment (Node, Browser, Workers).
- 🧬 **Fourier Positional Encoding**: Uses high-frequency sine/cosine mappings (GPT-style) for neural-like spatial consistency.
- 🚀 **Protocol V7 (Moonshot)**: 
  - **16-bit Fourier Signatures**: Spatial ADN embedded in every feature for harmonic matching.
  - **4-bit Packed Tracking Data**: Grayscale images are compressed to 4-bit depth, slashing file size.
  - **64-bit LSH Descriptors**: Optimized Locality Sensitive Hashing for descriptors.
- 🧵 **High-Precision Tracking**: Now using **Float32** coordinate precision for rock-solid tracking stability.
- 📦 **Framework Agnostic**: Includes wrappers for **A-Frame**, **Three.js**, and a raw **Controller** for custom engines.
- 📉 **Ultra-Compact Files**: Output `.taar` files are **~50KB** (vs ~380KB+ previously).

---

## 🛠 Installation

```bash
npm install @srsergio/taptapp-ar
```

---

## 📊 Industry-Leading Benchmarks (v7 Moonshot)

| Metric | Official MindAR | TapTapp AR V7 | Improvement |
| :--- | :--- | :--- | :--- |
| **Compilation Time** | ~23.50s | **~2.61s** | 🚀 **~9x Faster** |
| **Output Size (.taar)** | ~770 KB | **~50 KB** | 📉 **93% Smaller** |
| **Descriptor Format** | 84-byte Float | **64-bit LSH** | 🧠 **Massive Data Saving** |
| **Tracking Data** | 8-bit Gray | **4-bit Packed** | 📦 **50% Data Saving** |
| **Dependency Size** | ~20MB (TFJS) | **< 100KB** | 📦 **99% Smaller Bundle** |

---

## 🛡️ Robustness & Stability (Stress Tested)

The latest version has been rigorously tested with an adaptive stress test (`robustness-check.js`) covering diverse resolutions (VGA to FHD), rotations (X/Y/Z), and scales.

| Metric | Result | Description |
| :--- | :--- | :--- |
| **Pass Rate** | **96.3%** | High success rate across resolutions. |
| **Drift Tolerance** | **< 15%** | Validated geometrically against ground truth metadata. |
| **Tracking Precision** | **Float32** | Full 32-bit precision for optical flow tracking. |
| **Detection Time** | **~21ms** | Ultra-fast initial detection on standard CPU. |
| **Total Pipeline** | **~64ms** | Complete loop (Detect + Match + Track + Validate). |

---

## 🖼️ Compiler Usage (Node.js & Web)

The compiler is optimized to run in workers for maximum performance.

```javascript
import { OfflineCompiler } from '@srsergio/taptapp-ar';

const compiler = new OfflineCompiler();

// Compile target image (provide grayscale pixel data)
// Input: { width, height, data: Uint8Array }
await compiler.compileImageTargets(
  [{ width, height, data: grayscaleUint8Array }], 
  (progress) => console.log(`Compiling: ${progress}%`)
);

// Export to high-efficiency binary format (Protocol V7)
const binaryBuffer = compiler.exportData(); 
```

---

## 🎥 Runtime Usage (AR Tracking)

### 1. Simple A-Frame Integration
The easiest way to use TapTapp AR in a web app:

```html
<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
<script src="path/to/@srsergio/taptapp-ar/dist/index.js"></script>

<a-scene taar-image="imageTargetSrc: ./targets.taar;">
  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
  <a-entity taar-image-target="targetIndex: 0">
    <a-plane position="0 0 0" height="0.552" width="1"></a-plane>
  </a-entity>
</a-scene>
```

### 2. High-Performance Three.js Wrapper
For custom Three.js applications:

```javascript
import { TaarThree } from '@srsergio/taptapp-ar';

const taarThree = new TaarThree({
  container: document.querySelector("#container"),
  imageTargetSrc: './targets.taar',
});

const {renderer, scene, camera} = taarThree;

const anchor = taarThree.addAnchor(0);
// Add your 3D models to anchor.group

await taarThree.start();
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

### 3. Raw Controller (Advanced & Custom Engines)
The `Controller` is the core engine of TapTapp AR. You can use it to build your own AR components or integrate tracking into custom 3D engines.

#### ⚙️ Controller Configuration
| Property | Default | Description |
| :--- | :--- | :--- |
| `inputWidth` | **Required** | The width of the video or image source. |
| `inputHeight` | **Required** | The height of the video or image source. |
| `maxTrack` | `1` | Max number of images to track simultaneously. |
| `warmupTolerance` | `5` | Frames of consistent detection needed to "lock" a target. |
| `missTolerance` | `5` | Frames of missed detection before considering the target "lost". |
| `filterMinCF` | `0.001` | Min cutoff frequency for the OneEuroFilter (reduces jitter). |
| `filterBeta` | `1000` | Filter beta parameter (higher = more responsive, lower = smoother). |
| `onUpdate` | `null` | Callback for tracking events (Found, Lost, ProcessDone). |
| `debugMode` | `false` | If true, returns extra debug data (cropped images, feature points). |
| `worker` | `null` | Pass a custom worker instance if using a specialized environment. |

#### 🚀 Example: Tracking a Video Stream
Ideal for real-time AR apps in the browser:

```javascript
import { Controller } from '@srsergio/taptapp-ar';

const controller = new Controller({
  inputWidth: video.videoWidth,
  inputHeight: video.videoHeight,
  onUpdate: (data) => {
    if (data.type === 'updateMatrix') {
      const { targetIndex, worldMatrix } = data;
      if (worldMatrix) {
        console.log(`Target ${targetIndex} detected! Matrix:`, worldMatrix);
        // Apply worldMatrix (Float32Array[16]) to your 3D object
      } else {
        console.log(`Target ${targetIndex} lost.`);
      }
    }
  }
});

// Single target
await controller.addImageTargets('./targets.taar');

// OR multiple targets from different .taar files
await controller.addImageTargets(['./target1.taar', './target2.taar', './target3.taar']);
controller.processVideo(videoElement); // Starts the internal RAF loop
```

#### 📸 Example: One-shot Image Matching
Use this for "Snap and Detect" features without a continuous video loop:

```javascript
const controller = new Controller({ inputWidth: 1024, inputHeight: 1024 });
await controller.addImageTargets('./targets.taar');

// 1. Detect features in a static image
const { featurePoints } = await controller.detect(canvasElement);

// 2. Attempt to match against a specific target index
const { targetIndex, modelViewTransform } = await controller.match(featurePoints, 0);

if (targetIndex !== -1) {
  // Found a match! Use modelViewTransform for initial pose estimation
}
```

### 4. Vanilla JS (No Framework) 🍦
The **simplest way** to use AR—no Three.js, no A-Frame. Just overlay an image on the tracked target.

```javascript
import { SimpleAR } from '@srsergio/taptapp-ar';

const ar = new SimpleAR({
  container: document.getElementById('ar-container'),
  targetSrc: './my-target.taar',  // Single URL or array: ['./a.taar', './b.taar']
  overlay: document.getElementById('my-overlay'),
  onFound: ({ targetIndex }) => console.log(`Target ${targetIndex} detected! 🎯`),
  onLost: ({ targetIndex }) => console.log(`Target ${targetIndex} lost 👋`)
});

await ar.start();

// When done:
ar.stop();
```

#### 📁 Minimal HTML
```html
<div id="ar-container" style="width: 100vw; height: 100vh;">
  <img id="my-overlay" src="./overlay.png" 
       style="opacity: 0; z-index: 1; width: 200px; transition: opacity 0.3s;" />
</div>

<script type="module">
  import { SimpleAR } from '@srsergio/taptapp-ar';
  
  const ar = new SimpleAR({
    container: document.getElementById('ar-container'),
    targetSrc: './targets.taar',
    overlay: document.getElementById('my-overlay'),
  });
  
  ar.start();
</script>
```

#### ⚙️ SimpleAR Options
| Option | Required | Description |
| :--- | :--- | :--- |
| `container` | ✅ | DOM element where video + overlay render |
| `targetSrc` | ✅ | URL to your `.taar` file |
| `overlay` | ✅ | DOM element to position on the target |
| `onFound` | ❌ | Callback when target is detected |
| `onLost` | ❌ | Callback when target is lost |
| `onUpdate` | ❌ | Called each frame with `{ targetIndex, worldMatrix }` |
| `cameraConfig` | ❌ | Camera constraints (default: `{ facingMode: 'environment', width: 1280, height: 720 }`) |

---

## 🏗️ Protocol V7 (Moonshot Packed Format)
TapTapp AR uses a proprietary **Moonshot Vision Codec** that is significantly more efficient than standard AR formats.

- **Fourier Positional Encoding**: Maps 2D coordinates into a 16-dimensional frequency space. This creates a "Neural Consistency Check" that filters out noise and motion blur by checking for harmonic spatial agreement.
- **4-bit Packed Tracking Data**: Image data used for optical flow is compressed to 4-bit depth.
- **64-bit LSH Fingerprinting**: Feature descriptors are compressed to just 8 bytes using LSH.
- **Binary Matching Engine**: Uses hardware-accelerated population count (`popcount`) and `XOR` for near-instant point matching.
- **Zero-Copy Restoration**: Binary buffers are mapped directly to TypedArrays (Uint32 for descriptors, Float32 for tracking coordinates, Int8 for Fourier signatures).

---

## 📄 License & Credits

MIT © [srsergiolazaro](https://github.com/srsergiolazaro)

Based on the core research of MindAR, but completely re-written for high-performance binary processing and JS-only execution.
