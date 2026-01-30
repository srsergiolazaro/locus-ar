# Taptapp AR Controller Features

Este documento detalla las características modulares y mejoras de rendimiento implementadas en el controlador de Taptapp AR. Cada una de estas funcionalidades puede ser activada o desactivada rápidamente desde el código para pruebas de rendimiento o debugging.

## 1. One Euro Filter (Smoothing)
- **Trata de:** Un filtro adaptativo de primer orden para suavizar señales ruidosas.
- **Qué aporta:** Reduce drásticamente el "jitter" (temblor) visual del objeto AR cuando el marcador está estático o se mueve lentamente. Proporciona una experiencia mucho más estable y premium.
- **Requisito / Dependencia:** Ninguno. Es independiente.
- **Archivo:** `features/one-euro-filter-feature.ts`

## 2. Temporal Filter (Warmup & Miss Tolerance)
- **Trata de:** Lógica de persistencia temporal que gestiona estados de "calentamiento" y "pérdida".
- **Qué aporta:**
    - **Warmup:** Evita falsos positivos al requerir que el marcador sea detectado consistentemente durante N cuadros antes de mostrarlo.
    - **Miss Tolerance:** Mantiene el objeto visible durante breves oclusiones o fallos rápidos del tracker, evitando que el objeto parpadee o desaparezca instantáneamente.
- **Requisito / Dependencia:** Ninguno.
- **Archivo:** `features/temporal-filter-feature.ts`

## 3. Crop Detection (Movement Optimization)
- **Trata de:** Optimización que analiza solo regiones con movimiento en lugar de procesar toda la imagen.
- **Qué aporta:** Mejora significativa en el rendimiento (FPS) y reduce el uso de CPU. Al detectar puntos de interés solo en áreas activas, se ignora el fondo estático.
- **Requisito / Dependencia:** Depende de `CropDetector`.
- **Archivo:** `features/crop-detection-feature.ts`

## 4. Auto Rotation Matrix
- **Trata de:** Ajuste automático de la matriz de transformación basada en la orientación del video de entrada.
- **Qué aporta:** Permite que el AR funcione correctamente tanto en modo horizontal como vertical (Portrait) sin que el desarrollador tenga que rotar manualmente las coordenadas.
- **Requisito / Dependencia:** Ninguno.
- **Archivo:** `features/auto-rotation-feature.ts`

---

## Cómo desactivar una característica rápidamente

En `packages/locus-ar/src/compiler/controller.ts`, puedes comentar la línea donde se añade la característica en el constructor o configurar el flag `enabled: false` en la instancia.

```typescript
// Ejemplo para desactivar suavizado
this.featureManager.getFeature("one-euro-filter").enabled = false;
```
