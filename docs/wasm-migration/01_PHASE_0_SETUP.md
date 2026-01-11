# 🛠️ Phase 0: Setup & Infrastructure

> **Duración**: 1 semana  
> **Objetivo**: Configurar proyecto Rust, toolchain WASM y CI/CD

---

## 📋 Checklist

- [ ] Instalar toolchain Rust + wasm-pack
- [ ] Crear estructura de proyecto
- [ ] Configurar wasm-bindgen
- [ ] Setup CI/CD para build WASM
- [ ] Crear harness de interop JS↔WASM
- [ ] Escribir "Hello World" función SIMD

---

## 🏗️ Estructura del Proyecto

```
packages/taptapp-ar/
├── src/                          # JavaScript existente
│   ├── core/
│   ├── compiler/
│   └── runtime/
├── wasm/                         # 🆕 Nuevo directorio Rust
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs               # Entry point
│   │   ├── image/               # Image processing
│   │   │   ├── mod.rs
│   │   │   ├── gaussian.rs
│   │   │   ├── resize.rs
│   │   │   └── pyramid.rs
│   │   ├── detection/           # Feature detection
│   │   │   ├── mod.rs
│   │   │   ├── dog.rs
│   │   │   ├── extrema.rs
│   │   │   ├── freak.rs
│   │   │   └── lsh.rs
│   │   ├── matching/            # Feature matching
│   │   │   ├── mod.rs
│   │   │   ├── hamming.rs
│   │   │   ├── hough.rs
│   │   │   └── ransac.rs
│   │   ├── tracking/            # Tracking & pose
│   │   │   ├── mod.rs
│   │   │   ├── ncc.rs
│   │   │   ├── warp.rs
│   │   │   ├── pnp.rs
│   │   │   └── icp.rs
│   │   └── utils/               # Utilities
│   │       ├── mod.rs
│   │       ├── simd.rs
│   │       └── memory.rs
│   ├── tests/                   # Unit tests
│   │   ├── image_tests.rs
│   │   ├── detection_tests.rs
│   │   └── golden_tests.rs
│   └── benches/                 # Benchmarks
│       └── pipeline_bench.rs
├── pkg/                         # 🆕 Output WASM (generated)
└── scripts/
    └── build-wasm.sh            # 🆕 Build script
```

---

## 📦 Cargo.toml

```toml
[package]
name = "taptapp-ar-core"
version = "0.1.0"
authors = ["Sergio Lázaro <slazaro.dev@gmail.com>"]
edition = "2021"
description = "High-performance WASM core for TapTapp AR"
license = "MIT"

[lib]
crate-type = ["cdylib", "rlib"]

[features]
default = ["simd"]
simd = []
console_error_panic_hook = ["dep:console_error_panic_hook"]

[dependencies]
wasm-bindgen = "0.2.92"
js-sys = "0.3.69"
console_error_panic_hook = { version = "0.1.7", optional = true }

# SIMD support
wide = "0.7"  # Portable SIMD

# Linear algebra (for PnP/ICP)
nalgebra = { version = "0.32", default-features = false, features = ["std"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }

[dev-dependencies]
wasm-bindgen-test = "0.3.42"
criterion = "0.5"
proptest = "1.4"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"

# Minimize WASM size
[profile.release.package."*"]
opt-level = "z"
```

---

## 🔧 lib.rs - Entry Point

```rust
//! TapTapp AR Core - High-performance WASM library
//! 
//! This library provides SIMD-accelerated implementations of:
//! - Image processing (Gaussian blur, pyramid, resize)
//! - Feature detection (DoG, FREAK, LSH)
//! - Feature matching (Hamming, Hough)
//! - Tracking (NCC, PnP, ICP)

use wasm_bindgen::prelude::*;

pub mod image;
pub mod detection;
pub mod matching;
pub mod tracking;
pub mod utils;

/// Initialize the WASM module with better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Check if SIMD is available
#[wasm_bindgen]
pub fn simd_available() -> bool {
    // This will be true if compiled with SIMD target
    cfg!(target_feature = "simd128")
}

/// Get library version
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// Re-export public API
pub use image::{gaussian_blur, resize_bilinear, build_pyramid};
pub use detection::{detect_features, compute_freak, compute_lsh};
pub use matching::{match_features, hough_voting};
pub use tracking::{track_ncc, solve_pnp, refine_icp};
```

---

## 🧪 Test: Hello World SIMD

```rust
// wasm/src/utils/simd.rs

use wasm_bindgen::prelude::*;

/// Simple SIMD test: Sum an array of f32 using 4-wide vectors
#[wasm_bindgen]
pub fn simd_sum_f32(data: &[f32]) -> f32 {
    #[cfg(target_feature = "simd128")]
    {
        use core::arch::wasm32::*;
        
        let mut sum_vec = f32x4_splat(0.0);
        let chunks = data.chunks_exact(4);
        let remainder = chunks.remainder();
        
        for chunk in chunks {
            let v = f32x4(chunk[0], chunk[1], chunk[2], chunk[3]);
            sum_vec = f32x4_add(sum_vec, v);
        }
        
        // Horizontal sum
        let arr: [f32; 4] = unsafe { std::mem::transmute(sum_vec) };
        let mut total = arr[0] + arr[1] + arr[2] + arr[3];
        
        // Handle remainder
        for &x in remainder {
            total += x;
        }
        
        total
    }
    
    #[cfg(not(target_feature = "simd128"))]
    {
        data.iter().sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_simd_sum() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        assert_eq!(simd_sum_f32(&data), 45.0);
    }
}
```

---

## 🏭 Build Script

```bash
#!/bin/bash
# scripts/build-wasm.sh

set -e

echo "🦀 Building TapTapp AR WASM Core..."

cd wasm

# Build with SIMD enabled
RUSTFLAGS='-C target-feature=+simd128' \
wasm-pack build \
  --target web \
  --out-dir ../pkg \
  --release

# Optimize WASM size
if command -v wasm-opt &> /dev/null; then
  echo "📦 Optimizing WASM size..."
  wasm-opt -O3 -o ../pkg/taptapp_ar_core_bg.wasm ../pkg/taptapp_ar_core_bg.wasm
fi

# Print size
echo "📊 Final WASM size:"
ls -lh ../pkg/*.wasm

echo "✅ Build complete!"
```

---

## 🔄 CI/CD Configuration

```yaml
# .github/workflows/wasm.yml

name: WASM Build & Test

on:
  push:
    paths:
      - 'packages/taptapp-ar/wasm/**'
  pull_request:
    paths:
      - 'packages/taptapp-ar/wasm/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: dtolnay/rust-action@stable
        with:
          targets: wasm32-unknown-unknown
          
      - name: Install wasm-pack
        run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
        
      - name: Install wasm-opt
        run: |
          npm install -g binaryen
          
      - name: Build WASM
        run: |
          cd packages/taptapp-ar
          ./scripts/build-wasm.sh
          
      - name: Run Rust tests
        run: |
          cd packages/taptapp-ar/wasm
          cargo test
          
      - name: Run WASM tests
        run: |
          cd packages/taptapp-ar/wasm
          wasm-pack test --headless --chrome
          
      - name: Check WASM size
        run: |
          SIZE=$(stat -f%z packages/taptapp-ar/pkg/taptapp_ar_core_bg.wasm 2>/dev/null || stat -c%s packages/taptapp-ar/pkg/taptapp_ar_core_bg.wasm)
          if [ $SIZE -gt 153600 ]; then
            echo "❌ WASM size ($SIZE bytes) exceeds 150KB limit!"
            exit 1
          fi
          echo "✅ WASM size: $SIZE bytes"
          
      - name: Upload WASM artifact
        uses: actions/upload-artifact@v4
        with:
          name: wasm-bundle
          path: packages/taptapp-ar/pkg/
```

---

## 🔌 JavaScript Interop Harness

```typescript
// src/wasm/wasm-loader.ts

let wasmModule: typeof import('../../pkg/taptapp_ar_core') | null = null;
let wasmInitialized = false;
let wasmInitPromise: Promise<boolean> | null = null;

/**
 * Initialize WASM module
 * @returns true if WASM is available and initialized
 */
export async function initWasm(): Promise<boolean> {
  if (wasmInitialized) return true;
  if (wasmInitPromise) return wasmInitPromise;
  
  wasmInitPromise = (async () => {
    try {
      // Dynamic import to avoid bundler issues
      const wasm = await import('../../pkg/taptapp_ar_core');
      await wasm.default(); // Initialize
      
      // Verify SIMD support
      if (!wasm.simd_available()) {
        console.warn('⚠️ WASM SIMD not available, using scalar fallback');
      }
      
      wasmModule = wasm;
      wasmInitialized = true;
      console.log(`✅ TapTapp AR WASM v${wasm.version()} initialized`);
      return true;
    } catch (e) {
      console.warn('⚠️ WASM initialization failed, using JS fallback:', e);
      return false;
    }
  })();
  
  return wasmInitPromise;
}

/**
 * Get WASM module (throws if not initialized)
 */
export function getWasm() {
  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }
  return wasmModule;
}

/**
 * Check if WASM is available
 */
export function isWasmAvailable(): boolean {
  return wasmInitialized && wasmModule !== null;
}

/**
 * Feature flag for WASM usage
 */
export const WASM_ENABLED = true; // Can be controlled by env var
```

---

## ✅ Tests para Phase 0

```typescript
// tests/wasm-setup.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { initWasm, isWasmAvailable, getWasm } from '../src/wasm/wasm-loader';

describe('WASM Setup', () => {
  beforeAll(async () => {
    await initWasm();
  });
  
  it('should initialize WASM module', () => {
    expect(isWasmAvailable()).toBe(true);
  });
  
  it('should return correct version', () => {
    const wasm = getWasm();
    expect(wasm.version()).toMatch(/^\d+\.\d+\.\d+$/);
  });
  
  it('should report SIMD availability', () => {
    const wasm = getWasm();
    // In browser with SIMD support, this should be true
    expect(typeof wasm.simd_available()).toBe('boolean');
  });
  
  it('should compute SIMD sum correctly', () => {
    const wasm = getWasm();
    const data = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(wasm.simd_sum_f32(data)).toBe(45);
  });
});
```

```rust
// wasm/tests/setup_tests.rs

use wasm_bindgen_test::*;
use taptapp_ar_core::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_version() {
    let v = version();
    assert!(!v.is_empty());
}

#[wasm_bindgen_test]
fn test_simd_detection() {
    // Should not panic
    let _ = simd_available();
}

#[wasm_bindgen_test]
fn test_simd_sum_small() {
    let data = vec![1.0f32, 2.0, 3.0, 4.0];
    assert_eq!(utils::simd::simd_sum_f32(&data), 10.0);
}

#[wasm_bindgen_test]
fn test_simd_sum_large() {
    let data: Vec<f32> = (1..=1000).map(|x| x as f32).collect();
    let expected: f32 = (1..=1000).sum::<i32>() as f32;
    assert_eq!(utils::simd::simd_sum_f32(&data), expected);
}

#[wasm_bindgen_test]
fn test_simd_sum_empty() {
    let data: Vec<f32> = vec![];
    assert_eq!(utils::simd::simd_sum_f32(&data), 0.0);
}
```

---

## 📊 Criterios de Éxito Phase 0

| Criterio | Métrica |
|----------|---------|
| ✅ Rust project compiles | `cargo build` exitoso |
| ✅ WASM build succeeds | `wasm-pack build` exitoso |
| ✅ WASM size < 20KB | Solo hello world |
| ✅ CI/CD passes | GitHub Actions verde |
| ✅ JS interop works | Tests de integración pasan |
| ✅ SIMD detected | `simd_available()` returns true en Chrome |

---

## ➡️ Siguiente: [Phase 1 - Image Processing](./02_PHASE_1_IMAGE_PROCESSING.md)
