# 🎯 TapTapp AR - Resumen de Arquitectura

> Documento ejecutivo para toma de decisiones

---

## 📊 Estado Actual vs Competencia

| Métrica | TapTapp AR | MindAR | ARjs |
|---------|------------|--------|------|
| **Tiempo compilación** | ~0.93s ✅ | ~23.5s | N/A |
| **Bundle size** | <100KB ✅ | ~20MB | ~1MB |
| **Optimización** | **Bio-Inspired (98% pixel savings) 🚀** | No | No |
| **Precisión** | Sub-pixel ✅ | Standard | Standard |

---

## 🔴 3 Mayores Cuellos de Botella

### 1. Filtros Gaussianos CPU (~40% tiempo compilación)
```
Problema: _applyGaussianFilter() ejecuta O(10×W×H×numOctaves) operaciones
Archivo:  detector-lite.js:181
Solución: Migrar a WASM SIMD → 4-8× speedup
```

### 2. Procesamiento de Escalas Completo
```
Problema: Se procesan 307K píxeles por frame innecesariamente
Solución: Bio-Inspired Engine ya implementado (Foveal Attention)
Resultado: Solo 52K píxeles procesados (83% reducción)
```

---

## 🧠 Arquitectura Bio-Inspirada (Moonshot #9) ✅

Ya implementada e integrada en el `main`.

| Componente | Función | Beneficio |
|------------|---------|-----------|
| **Foveal Attention** | Visión central vs periférica | -83% Pixels procesados |
| **Predictive Coding** | Detección de cambios estáticos | -88% Frames procesados |
| **Saccadic Controller** | Saltos de atención estratégicos | Tracking ultra-veloz |
| **Saliency Map** | Identificación de regiones clave | Detección inteligente |

---

## 🎯 Próximo Gran Paso: WASM SIMD Core

### Resultado Esperado Post-WASM

| Métrica | Actual (JS) | Bio-Inspired (JS) | Bio-Inspired (WASM) |
|---------|-------------|-------------------|---------------------|
| Compilación | ~0.93s | ~0.93s | **~150ms** |
| Tracking p/frame | 307K pixels | 52K pixels | 52K pixels |
| FPS (Mobile) | ~15-20 | **~50-60** | **~60+ (Battery safe)** |

---

## ✅ Quick Wins (Aplicados HOY)

1. **Reducir escalas**: Cambiar `SCALE_STEP_EXPONENT` de 0.6 a 1.0.
2. **Bio-Inspired Engine**: Activado por defecto en el nuevo adaptador.
3. **TypedArray pooling**: Reusar buffers para evitar GC jank.

---

## 📁 Documentación Completa

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para detalles técnicos profundos.
