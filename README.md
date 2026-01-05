# @srsergio/taptapp-ar

<p align="center">
  <a href="./docs/technical-paper.pdf">📄 <b>Technical Paper (PDF)</b></a> &nbsp;|&nbsp;
  <a href="./docs/index.html">🌐 <b>Official Website</b></a> &nbsp;|&nbsp;
  <a href="./analysis/INDEX.md">📊 <b>Analysis Report</b></a>
</p>

🚀 **TapTapp AR** is a high-performance Augmented Reality (AR) toolkit for **Node.js** and **Browser** environments. It provides an ultra-fast offline compiler and a lightweight runtime for image tracking.

**100% Pure JavaScript**: This package is now completely independent of **TensorFlow.js** for both compilation and real-time tracking, resulting in massive performance gains and zero-latency initialization.

---

## 🌟 Key Features

- 🖼️ **Hyper-Fast Compiler**: Pure JavaScript compiler that generates `.taar` files in **< 3s**.
- ⚡ **No TensorFlow Dependency**: No TFJS at all. Works natively in any JS environment (Node, Browser, Workers).
- 🚀 **Protocol V7 (Moonshot)**: 
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

### 1. SimpleAR (Recommended) 🍦
The **simplest way** to use AR—no Three.js or A-Frame required. Just overlay an HTML element on the tracked target.

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

#### 📁 Minimal HTML Example
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
| `onUpdate` | ❌ | Called cada frame con `{ targetIndex, worldMatrix }` |
| `cameraConfig` | ❌ | Config de cámara (por defecto: `{ facingMode: 'environment', width: 1280, height: 720 }`) |

---

### 2. React Integration (Vite & SSR Safe) ⚛️

The fastest and most modern way to build AR apps with React. It supports **Code Splitting** and is **100% SSR-Safe** (Next.js, Astro, Remix).

#### 🚀 Quick Start: `<TaptappAR />`
Drop the component into your app. It handles camera permissions, scanning animations, and video/image overlays automatically.

```tsx
import { TaptappAR, mapDataToPropsConfig } from '@srsergio/taptapp-ar';

const MyARComponent = ({ data }) => {
  // Use mapDataToPropsConfig to convert your raw data into ARConfig
  const config = mapDataToPropsConfig(data);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <TaptappAR config={config} />
    </div>
  );
};
```

#### 🛠️ Custom UI: `useAR()` Hook
If you want to build your own UI while keeping the powerful tracking logic:

```tsx
import { useAR } from '@srsergio/taptapp-ar';

const CustomAR = ({ config }) => {
  const { containerRef, overlayRef, status, toggleVideo } = useAR(config);

  return (
    <div ref={containerRef} style={{ position: 'relative' }} onClick={toggleVideo}>
      {/* Custom Scanning UI */}
      {status === 'scanning' && <div className="my-loader">Scanning...</div>}
      
      {/* Video Overlay */}
      <video ref={overlayRef} src={config.videoSrc} loop muted playsInline />
    </div>
  );
};
```

---

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

### 📚 Legacy Usage
For **A-Frame** or **Three.js** wrappers, please refer to the [Advanced Usage Documentation](./docs/advanced-usage.md).

---

## 🏗️ Protocol V7 (Moonshot Packed Format)
TapTapp AR uses a proprietary **Moonshot Vision Codec** that is significantly more efficient than standard AR formats.

- **4-bit Packed Tracking Data**: Image data used for optical flow is compressed to 4-bit depth.
- **64-bit LSH Fingerprinting**: Feature descriptors are compressed to just 8 bytes using LSH.
- **Binary Matching Engine**: Uses hardware-accelerated population count (`popcount`) and `XOR` for near-instant point matching.
- **Zero-Copy Restoration**: Binary buffers are mapped directly to TypedArrays (Uint32 for descriptors, Float32 for tracking coordinates).

---

## 📄 License & Recognition

**Taptapp AR** is created and maintained by **Sergio Lazaro**.

This project is licensed under the **GPL-3.0 License**.
This ensures that the project remains open and free, and that authorship is properly recognized. No "closed-source" usage is allowed without a commercial agreement.

Commercial licenses are available for proprietary applications. Please contact the author for details.

### Acknowledgements
This project evolved from the incredible work of [MindAR](https://github.com/hiukim/mind-ar-js). While the codebase has been extensively rewritten and optimized for performance, we gratefully acknowledge the foundation laid by the original authors.

