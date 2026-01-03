# @srsergio/taptapp-ar

🚀 **TapTapp AR** is a high-performance Augmented Reality (AR) toolkit for **Node.js** and **Browser** environments. It provides an ultra-fast offline compiler and a lightweight runtime for image tracking.

**100% Pure JavaScript**: This package is now completely independent of **TensorFlow.js** for both compilation and real-time tracking, resulting in massive performance gains and zero-latency initialization.

---

## 🌟 Key Features

- 🖼️ **Hyper-Fast Compiler**: Pure JavaScript compiler that generates `.mind` files in **< 0.9s per image**.
- ⚡ **No TensorFlow Dependency**: No TFJS at all. Works natively in any JS environment (Node, Browser, Workers).
- 🚀 **Protocol V3 (Columnar Binary)**: Zero-copy loading with 80%+ smaller files and CPU-cache alignment.
- 🧵 **Optimized Runtime**: Tracking engine with **Buffer Recycling** and **Zero-Copy** for smooth 60fps AR on low-end devices.
- 📦 **Framework Agnostic**: Includes wrappers for **A-Frame**, **Three.js**, and a raw **Controller** for custom engines.

---

## 🛠 Installation

```bash
npm install @srsergio/taptapp-ar
```

---

## 📊 Industry-Leading Benchmarks (v3)

| Metric | Official MindAR | TapTapp AR | Improvement |
| :--- | :--- | :--- | :--- |
| **Compilation Time** | ~23.50s | **~0.89s** | 🚀 **26x Faster** |
| **Output Size (.mind)** | ~770 KB | **~127 KB** | 📉 **83.5% Smaller** |
| **Tracking Latency** | Variable (TFJS) | **Constant (Pure JS)** | ⚡ **Stable 60fps** |
| **Dependency Size** | ~20MB (TFJS) | **< 100KB** | 📦 **99% Smaller Bundle** |

---

## 🖼️ Compiler Usage (Node.js & Web)

The compiler is designed to run in workers (Node.js or Browser) for maximum performance.

```javascript
import { OfflineCompiler } from '@srsergio/taptapp-ar';

const compiler = new OfflineCompiler();

// Compile target image (provide grayscale pixel data)
await compiler.compileImageTargets(
  [{ width, height, data: grayscaleUint8Array }], 
  (progress) => console.log(`Compiling: ${progress}%`)
);

// Export to high-efficiency binary format
const binaryBuffer = compiler.exportData(); 
```

---

## 🎥 Runtime Usage (AR Tracking)

### 1. Simple A-Frame Integration
The easiest way to use TapTapp AR in a web app:

```html
<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
<script src="path/to/@srsergio/taptapp-ar/dist/index.js"></script>

<a-scene mindar-image="imageTargetSrc: ./targets.mind;">
  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
  <a-entity mindar-image-target="targetIndex: 0">
    <a-plane position="0 0 0" height="0.552" width="1"></a-plane>
  </a-entity>
</a-scene>
```

### 2. High-Performance Three.js Wrapper
For custom Three.js applications:

```javascript
import { MindARThree } from '@srsergio/taptapp-ar';

const mindarThree = new MindARThree({
  container: document.querySelector("#container"),
  imageTargetSrc: './targets.mind',
});

const {renderer, scene, camera} = mindarThree;

const anchor = mindarThree.addAnchor(0);
// Add your 3D models to anchor.group

await mindarThree.start();
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

await controller.addImageTargets('./targets.mind');
controller.processVideo(videoElement); // Starts the internal RAF loop
```

#### 📸 Example: One-shot Image Matching
Use this for "Snap and Detect" features without a continuous video loop:

```javascript
const controller = new Controller({ inputWidth: 1024, inputHeight: 1024 });
await controller.addImageTargets('./targets.mind');

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
  container: document.getElementById('ar-container'),   // Where to render
  targetSrc: './my-target.mind',                        // Your compiled .mind file
  overlay: document.getElementById('my-overlay'),       // Element to position on target
  onFound: () => console.log('Target detected! 🎯'),
  onLost: () => console.log('Target lost 👋')
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
    targetSrc: './targets.mind',
    overlay: document.getElementById('my-overlay'),
  });
  
  ar.start();
</script>
```

#### ⚙️ SimpleAR Options
| Option | Required | Description |
| :--- | :--- | :--- |
| `container` | ✅ | DOM element where video + overlay render |
| `targetSrc` | ✅ | URL to your `.mind` file |
| `overlay` | ✅ | DOM element to position on the target |
| `onFound` | ❌ | Callback when target is detected |
| `onLost` | ❌ | Callback when target is lost |
| `onUpdate` | ❌ | Called each frame with `{ targetIndex, worldMatrix }` |
| `cameraConfig` | ❌ | Camera constraints (default: `{ facingMode: 'environment', width: 1280, height: 720 }`) |

---

#### 🛠️ Life-cycle Management
Properly management is crucial to avoid memory leaks:

```javascript
// Stop the video loop
controller.stopProcessVideo();

// Clean up workers and internal buffers
controller.dispose();
```

---

## 🏗️ Protocol V3 (Columnar Binary Format)
TapTapp AR uses a proprietary columnar binary format that is significantly more efficient than standard JSON-based formats.

- **Zero-Copy Restoration**: Binary buffers are mapped directly to TypedArrays.
- **Cache Locality**: Performance is optimized for modern CPUs by keeping coordinates and descriptors adjacent in memory.
- **Alignment Safe**: Automatically handles `ArrayBuffer` alignment for predictable behavior across all browsers.

---

## 📄 License & Credits

MIT © [srsergiolazaro](https://github.com/srsergiolazaro)

Based on the core research of MindAR, but completely re-written for high-performance binary processing and JS-only execution.
