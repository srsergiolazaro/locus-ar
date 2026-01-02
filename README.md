# @srsergio/taptapp-ar

🚀 **TapTapp AR** is a high-performance Augmented Reality (AR) toolkit specifically designed for **Astro** and **Node.js** environments. It provides a seamless way to integrate image tracking, video overlays, and an offline compiler for image targets.

Built on top of **MindAR** and **A-Frame**, this package features a **pure JavaScript offline compiler** that requires **no TensorFlow** for backend compilation, while still supporting TensorFlow.js for real-time tracking in the browser.

---

## 🌟 Key Features

- 🚀 **Astro Native**: Optimized components for Astro's Islands architecture.
- 🖼️ **Ultra-Fast Offline Compiler**: Pure JavaScript compiler that generates `.mind` target files in **~1.3s per image**.
- ⚡ **Zero TensorFlow for Compilation**: The offline compiler uses optimized pure JS algorithms - no TensorFlow installation required.
- 🧵 **Multi-threaded Engine**: Truly parallel processing using Node.js `worker_threads` for bulk image compilation.
- 🚀 **Serverless Ready**: Lightweight compiler with minimal dependencies, perfect for Vercel, AWS Lambda, and Netlify.

---

## 🛠 Installation

```bash
npm install @srsergio/taptapp-ar
```

### 📦 Optional Dependencies

> **Note:** TensorFlow is **NOT required** for the offline compiler. It only uses pure JavaScript.

For real-time AR tracking in the browser, TensorFlow.js is loaded automatically via CDN.

---

## 🚀 Astro Integration Guide

The easiest way to display AR content is using the `ARVideoTrigger` component.

### Usage

```astro
---
import ARVideoTrigger from '@srsergio/taptapp-ar/astro/ARVideoTrigger.astro';

const config = {
  cardId: 'unique-id',
  targetImageSrc: 'https://cdn.example.com/target.jpg',
  targetMindSrc: 'https://cdn.example.com/targets.mind',
  videoSrc: 'https://cdn.example.com/overlay.mp4',
  videoWidth: 1280,
  videoHeight: 720,
  scale: 1.2,
};
---

<ARVideoTrigger config={config} />
```

---

## 🖼 High-Performance Offline Compiler

The `OfflineCompiler` is the core of the TapTapp asset pipeline. It has been re-engineered for extreme speed and reliability.

### ⚡ Performance Benchmarks

| Metric | TaptApp AR | MindAR Official |
| :--- | :--- | :--- |
| **Compilation time** | **~0.17s** | ~0.52s |
| **Tracking points** | **54 points** | 47 points |
| TensorFlow required | ❌ **No** | ✅ Yes |
| Speed comparison | **~3x faster** | baseline |

> Tested on 1024x1024 image. TaptApp detects **+15% more points** while being **3x faster** without TensorFlow.

### Basic Usage

```typescript
import { OfflineCompiler } from '@srsergio/taptapp-ar/compiler/offline-compiler.js';

const compiler = new OfflineCompiler();

async function compile(imageBuffer: Buffer) {
  // targetImages is an array of images to compile into the same .mind file
  const result = await compiler.compileTrack({
    targetImages: [imageBuffer],
    progressCallback: (progress) => console.log(`Compiling: ${progress}%`),
    basePercent: 0
  });
  
  return result;
}
```

### 🛠 Architecture & Optimizations

- **Pure JavaScript Engine**: The `DetectorLite` class implements feature detection entirely in JavaScript, eliminating TensorFlow dependencies and startup overhead.
- **On-Demand Similarity Algorithm**: Lazily evaluates only the most promising feature candidates, slashing CPU time by 90%.
- **Worker Pool Parallelism**: Automatically spawns a `WorkerPool` using Node.js worker threads to parallelize work across all available CPU cores.
- **Optimized Gaussian Filters**: Unrolled kernel operations with pre-calculated offsets for maximum performance.
- **Zero Cold Start**: No TensorFlow initialization means instant startup in serverless environments.

---

## ❓ Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **Camera not starting** | Ensure your site is served via `HTTPS`. Browsers block camera access on insecure origins. |
| **Video not playing** | iOS Safari requires `muted` and `playsinline` attributes for autoplaying videos. Our components handle this by default. |
| **CORS errors** | Ensure that `targetImageSrc`, `targetMindSrc`, and `videoSrc` have CORS headers enabled (`Access-Control-Allow-Origin: *`). |
| **Memory Outage on Serverless** | Reduce the resolution of your target images. High-res images increase memory pressure during compilation. |

---

## 🏗 Development

```bash
# Install dependencies
npm install

# Build the package
npm run build
```

The package uses **TypeScript** and exports both ESM and CJS compatible builds located in the `dist` folder.

---

## 📄 License

MIT © [srsergiolazaro](https://github.com/srsergiolazaro)
