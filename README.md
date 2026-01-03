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

### 3. Raw Controller (Custom Logic)
Use the `Controller` directly for maximum control:

```javascript
import { Controller } from '@srsergio/taptapp-ar';

const controller = new Controller({
  inputWidth: 640,
  inputHeight: 480,
  onUpdate: (data) => {
    if (data.type === 'updateMatrix') {
      // worldMatrix found! Apply to your 3D engine
      const { targetIndex, worldMatrix } = data;
    }
  }
});

await controller.addImageTargets('./targets.mind');
controller.processVideo(videoElement);
```

---

## 📄 License & Credits

MIT © [srsergiolazaro](https://github.com/srsergiolazaro)

Based on the core research of MindAR, but completely re-written for high-performance binary processing and JS-only execution.
