# @srsergio/taptapp-ar

🚀 **TapTapp AR** is a high-performance Augmented Reality (AR) toolkit specifically designed for **Astro** and **Node.js** environments. It provides a seamless way to integrate image tracking, video overlays, and an offline compiler for image targets.

Built on top of **MindAR**, **A-Frame**, and **TensorFlow.js**, this package is optimized for both frontend visualization in Astro and backend/serverless image target compilation.

---

## 🌟 Key Features

- 🚀 **Astro Native**: Optimized components for Astro's Islands architecture.
- 🖼️ **Offline Compiler**: A powerful server-side compiler that generates `.mind` target files without a browser.
- ⚡ **Optimized Performance**: Pre-warmed TensorFlow backends and adaptive memory management for serverless environments (Vercel, AWS Lambda).
- 📱 **Mobile First**: Designed for smooth performance on iOS (Safari) and Android.

---

## 🛠 Installation

```bash
npm install @srsergio/taptapp-ar
```

### 📦 Peer Dependencies

Make sure you have the following packages installed in your host project:

```bash
npm install three aframe astro
```

Note: If you are using the `OfflineCompiler` in a Node.js environment, ensure you have the necessary TensorFlow.js backends installed.

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

### `ARVideoTrigger` Props (Config)

| Prop | Type | Description |
| :--- | :--- | :--- |
| `cardId` | `string` | Unique identifier for tracking/session. |
| `targetImageSrc` | `string` | URL of the image being tracked. |
| `targetMindSrc` | `string` | URL of the compiled `.mind` target file. |
| `videoSrc` | `string` | URL of the video to overlay on the target. |
| `videoWidth` | `number` | Original width of the video. |
| `videoHeight` | `number` | Original height of the video. |
| `scale` | `number` | Scaling factor for the video overlay (Default: `1`). |

---

## 🖼 Offline Compiler Guide

The `OfflineCompiler` allows you to compile image targets on the backend. This is the heart of the TapTapp asset pipeline.

### Why use the Offline Compiler?
Standard MindAR tools require a browser canvas to compile images. This compiler uses **TensorFlow.js** backends (CPU/WebGL/Node) to perform the computation as a background task.

### Basic Usage

```typescript
import { OfflineCompiler } from '@srsergio/taptapp-ar';

const compiler = new OfflineCompiler();

async function compile(imageBuffer: Buffer) {
  // targetImages is an array of images to compile into the same .mind file
  const result = await compiler.compileTrack({
    targetImages: [imageBuffer],
    progressCallback: (progress) => console.log(`Compiling: ${progress}%`),
    basePercent: 0
  });
  
  // result is the compiled target data
  return result;
}
```

### ⚡ Serverless Optimization
The compiler is optimized for environments like Vercel Functions:
- **Early Initialization**: TensorFlow is pre-warmed on module import.
- **Memory Management**: Aggressive garbage collection (`tf.dispose()`) and tensor cleanup.
- **Batch Processing**: Automatically splits work to avoid memory spikes.

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
