# 🚀 Locus AR Client

Welcome to the most advanced and easy-to-use Augmented Reality library for the web! **Locus** combines high-performance bio-inspired algorithms with an ultra-clean developer interface for React.

Designed to be the #1 choice for any AR project, from quick marketing experiences to complex industrial applications.

## 🛠 Installation

```bash
npm install locus-ar
```

## 🌟 Quick Start (`Locus` Component)

The easiest way to get started. Ideal for placing content over images instantly.

```tsx
import { Locus, LocusTransform } from 'locus-ar/client';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Locus targets={{ image: '/card-target.jpg', label: 'card' }}>
        {(detections) => (
          detections.map(det => (
            <LocusTransform key={det.targetIndex} matrix={det.worldMatrix} screenCoords={det.screenCoords}>
              {/* This content will float over the physical image */}
              <div className="glass-morphism">
                <h1>Detected!</h1>
                <p>3D content or UI here.</p>
              </div>
            </LocusTransform>
          ))
        )}
      </Locus>
    </div>
  );
}
```

## 🧠 Full Control (`useLocus` Hook)

For advanced users who need to integrate tracking logic into their own rendering systems or video pipelines.

```tsx
import { useLocus } from 'locus-ar/client';

const MyAdvancedAR = () => {
  const targets = [{ image: '/map.png', label: 'map' }];
  const { state, detections, start, stop } = useLocus(targets, {
    debugMode: true,
    maxTrack: 2,
    bioInspired: true
  });

  return (
    <div>
      <video ref={(el) => el && start(el)} />
      <p>Status: {state}</p>
      {detections.map(d => (
        <div key={d.targetIndex}>Detected {d.label}</div>
      ))}
    </div>
  );
};
```

## 💎 Key Features

- **Bio-inspired Speed**: Aggressive optimization maintaining 60fps even on mid-range mobile devices.
- **On-the-fly Compilation**: No need to pre-process your images. Pass a URL or `ImageData` and the library handles the rest.
- **Multi-target Tracking**: Track multiple targets simultaneously without performance drops.
- **TypeScript First**: Full typing so you never break logic in production.

## 📊 Configuration (`LocusConfig`)

| Property | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `number` | `640` | Processing width (lower = faster). |
| `height` | `number` | `480` | Processing height. |
| `maxTrack` | `number` | `1` | How many targets to track at once. |
| `debugMode` | `boolean` | `false` | Draws feature points and tracking boxes. |
| `bioInspired` | `boolean` | `true` | Enables the advanced optimization engine. |
| `facingMode` | `string` | `'environment'`| Front or back camera. |

---

Designed with ❤️ for the Augmented Reality community. Let's make the web more immersive.
