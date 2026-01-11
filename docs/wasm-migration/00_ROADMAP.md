# 🚀 Roadmap: Migración Completa a WASM SIMD

> **Objetivo**: Reducir tiempo de compilación de ~1s a ~150ms y latencia de tracking de ~25ms a ~8ms  
> **Duración estimada**: 6-8 semanas  
> **Stack propuesto**: Rust + wasm-bindgen + wasm-pack

---

## 📊 Resumen del Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MIGRATION PHASES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 0          Phase 1           Phase 2           Phase 3              │
│  ────────         ────────          ────────          ────────             │
│  Setup &          Image             Feature           Matching &           │
│  Infra            Processing        Detection         Tracking             │
│                                                                             │
│  [1 semana]       [2 semanas]       [2 semanas]       [2 semanas]          │
│                                                                             │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │ Rust     │     │ Gaussian │      │ DoG      │      │ Hough    │         │
│  │ Project  │────▶│ Blur     │─────▶│ Pyramid  │─────▶│ Voting   │         │
│  │ Setup    │     │ SIMD     │      │ SIMD     │      │ SIMD     │         │
│  └──────────┘     └──────────┘      └──────────┘      └──────────┘         │
│       │                │                 │                 │               │
│       ▼                ▼                 ▼                 ▼               │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │ wasm-    │     │ Resize   │      │ Extrema  │      │ NCC      │         │
│  │ bindgen  │     │ Bilinear │      │ Detection│      │ Batch    │         │
│  │ Config   │     │ SIMD     │      │ SIMD     │      │ SIMD     │         │
│  └──────────┘     └──────────┘      └──────────┘      └──────────┘         │
│       │                │                 │                 │               │
│       ▼                ▼                 ▼                 ▼               │
│  ┌──────────┐     ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │ CI/CD    │     │ Pyramid  │      │ FREAK    │      │ PnP/ICP  │         │
│  │ Pipeline │     │ Builder  │      │ Compute  │      │ Solver   │         │
│  └──────────┘     └──────────┘      └──────────┘      └──────────┘         │
│                                                                             │
│                           Phase 4                                           │
│                           ────────                                          │
│                           Integration                                       │
│                           & Polish                                          │
│                                                                             │
│                           [1 semana]                                        │
│                                                                             │
│                        ┌──────────┐                                         │
│                        │ Full     │                                         │
│                        │ Pipeline │                                         │
│                        │ Tests    │                                         │
│                        └──────────┘                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Documentos

| Documento | Descripción |
|-----------|-------------|
| [01_PHASE_0_SETUP.md](./01_PHASE_0_SETUP.md) | Configuración inicial de Rust/WASM |
| [02_PHASE_1_IMAGE_PROCESSING.md](./02_PHASE_1_IMAGE_PROCESSING.md) | Gaussian blur, resize, pyramid |
| [03_PHASE_2_FEATURE_DETECTION.md](./03_PHASE_2_FEATURE_DETECTION.md) | DoG, extrema, FREAK, LSH |
| [04_PHASE_3_MATCHING_TRACKING.md](./04_PHASE_3_MATCHING_TRACKING.md) | Hough, NCC, PnP, ICP |
| [05_PHASE_4_INTEGRATION.md](./05_PHASE_4_INTEGRATION.md) | Tests E2E, benchmarks, rollout |
| [06_TEST_STRATEGY.md](./06_TEST_STRATEGY.md) | Estrategia completa de testing |
| [07_BENCHMARKS.md](./07_BENCHMARKS.md) | Métricas y KPIs de éxito |

---

## 🎯 KPIs de Éxito

| Métrica | Actual | Target | Mejora |
|---------|--------|--------|--------|
| Compile time (1000×1000 image) | ~930ms | <200ms | **4.5×** |
| Tracking latency (per frame) | ~25ms | <10ms | **2.5×** |
| Bundle size (WASM) | N/A | <150KB | — |
| Memory peak (compile) | ~80MB | <40MB | **2×** |
| GC pressure (runtime) | Alto | Bajo | — |

---

## 📅 Timeline Detallado

### Semana 1: Phase 0 - Setup
- [ ] Día 1-2: Setup proyecto Rust + wasm-pack
- [ ] Día 3: Configurar CI/CD (build + test WASM)
- [ ] Día 4-5: Crear harness de interop JS↔WASM

### Semana 2-3: Phase 1 - Image Processing
- [ ] Día 6-8: `gaussian_blur_simd`
- [ ] Día 9-10: `resize_bilinear_simd`
- [ ] Día 11-13: `build_pyramid_simd`
- [ ] Día 14-15: Tests de regresión + benchmarks

### Semana 4-5: Phase 2 - Feature Detection
- [ ] Día 16-18: `dog_pyramid_simd`
- [ ] Día 19-21: `find_extrema_3d_simd`
- [ ] Día 22-24: `compute_freak_simd`
- [ ] Día 25-26: `lsh_64bit_simd`
- [ ] Día 27-28: Tests unitarios + integración

### Semana 6-7: Phase 3 - Matching & Tracking
- [ ] Día 29-31: `hamming_distance_simd`
- [ ] Día 32-34: `hough_voting_simd`
- [ ] Día 35-37: `ncc_batch_simd`
- [ ] Día 38-40: `pnp_solve` + `icp_refine`
- [ ] Día 41-42: Integration tests

### Semana 8: Phase 4 - Integration
- [ ] Día 43-44: Full pipeline E2E tests
- [ ] Día 45-46: Performance benchmarks vs JS
- [ ] Día 47-48: Documentation + release prep
- [ ] Día 49: Release candidate

---

## 🔄 Estrategia de Rollout

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE ROLLOUT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Step 1: Feature Flags                                         │
│   ─────────────────────                                         │
│   if (WASM_ENABLED && wasmSupported()) {                        │
│     return wasmGaussianBlur(data);                              │
│   } else {                                                      │
│     return jsGaussianBlur(data);  // Fallback                   │
│   }                                                             │
│                                                                 │
│   Step 2: Canary (5%)                                           │
│   ─────────────────────                                         │
│   - Deploy a 5% de usuarios                                     │
│   - Monitor métricas de error                                   │
│   - Compare benchmarks JS vs WASM                               │
│                                                                 │
│   Step 3: Gradual (25% → 50% → 100%)                            │
│   ─────────────────────────────────────                         │
│   - Aumentar porcentaje cada semana                             │
│   - Mantener fallback JS activo                                 │
│                                                                 │
│   Step 4: Deprecate JS Core                                     │
│   ─────────────────────────────                                 │
│   - Marcar funciones JS como deprecated                         │
│   - Eliminar en v2.0                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| SIMD no soportado en browser antiguo | Media | Alto | Fallback a WASM escalar → JS |
| Memory corruption en Rust | Baja | Crítico | Tests exhaustivos + sanitizers |
| Build time muy largo | Media | Medio | Incremental builds + caching |
| Regresiones de precisión | Media | Alto | Tests de golden outputs |
| Bundle size > 200KB | Baja | Medio | wasm-opt, dead code elim |

---

## 🧪 Filosofía de Testing

1. **Golden Tests**: Comparar output WASM vs JS byte-a-byte
2. **Property Tests**: `proptest` para inputs aleatorios
3. **Fuzz Tests**: Detected crashes con `cargo fuzz`
4. **Benchmark Tests**: Comparar performance en cada PR
5. **E2E Tests**: Pipeline completo con imágenes reales

Ver [06_TEST_STRATEGY.md](./06_TEST_STRATEGY.md) para detalles.

---

## 📦 Entregables Finales

1. **`@srsergio/taptapp-ar-wasm`**: Paquete NPM con bindings
2. **`taptapp_ar_core.wasm`**: Core compilado (~100KB)
3. **Documentación API WASM**
4. **Migration guide para usuarios**
5. **Benchmarks publicados**
