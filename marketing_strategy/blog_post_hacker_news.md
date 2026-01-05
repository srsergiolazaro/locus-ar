# Cómo logré que la Realidad Aumentada web sea 9 veces más rápida eliminando TensorFlow.js

> **Tl;dr:** La mayoría de las librerías de AR en la web dependen de pesados frameworks de Machine Learning (ML). Taptapp AR demuestra que, volviendo a la visión artificial clásica optimizada "al desnudo" (bare-metal), podemos reducir el tamaño de los archivos en un 93% y acelerar la **compilación de los blancos de tracking** 9 veces.

---

## 1. El Problema: El "Impuesto" de TensorFlow en la Web
Durante años, la Realidad Aumentada (AR) basada en imágenes en el navegador ha seguido una tendencia: usar **TensorFlow.js** (TFJS) para todo. Aunque TFJS es una maravilla de la ingeniería, para tareas de visión artificial clásica como la detección de puntos de interés (Feature Detection), es como usar un mazo para matar una mosca.

### El costo de la abstracción:
*   **Peso muerto**: Más de 20MB de binarios solo para arrancar.
*   **Arranque en frío (Cold Start)**: 2-3 segundos de espera mientras se "calientan" los shaders de la GPU.
*   **Caja Negra**: Errores crípticos de WebGL que son imposibles de depurar en entornos de producción.

Mi misión con **Taptapp AR** fue simple pero radical: **Eliminar TensorFlow por completo y reescribir el motor en JavaScript puro.**

---

## 2. La Decisión: Visión Artificial Nativa (DetectorLite)
En lugar de pedirle a una red neuronal que "adivine" dónde están los bordes de una imagen, implementamos **DetectorLite**. Es un motor basado en la matemática clásica de *Diferencia de Gaussianas* (DoG) optimizado para la arquitectura de los navegadores modernos.

### Ventajas del enfoque "No-ML":
*   **Latencia Cero**: El motor está listo en 0.02s. No hay shaders que compilar ni pesos que cargar.
*   **Compatibilidad Total**: Funciona nativamente en Node.js, navegadores antiguos y, lo más importante, en **WebWorkers** (donde TFJS suele dar problemas).

---

## 3. Protocolo V7: La Innovación "Moonshot"
No bastaba con quitar TFJS. Para ser realmente "Moonshot", necesitábamos que los datos de AR fueran tan ligeros que se sintieran instantáneos incluso en conexiones 3G. Así nació el **Protocolo V7**.

### A. Descriptores LSH de 64 bits (Huellas Digitales Binarias)
Tradicionalmente, para identificar un punto en una imagen se usa un vector de 84 números decimales (floats). Eso es mucha memoria y mucho CPU para comparar.

En Taptapp AR usamos **Locality Sensitive Hashing (LSH)**. Convertimos esos 84 números en una "huella digital" binaria de tan solo 64 bits (8 bytes).
*   **El Truco de Rendimiento**: Esto convierte la búsqueda de coincidencias en un cálculo de **Distancia de Hamming**. Comparar dos puntos ahora se resuelve mediante operaciones de bits extremadamente eficientes (XOR + `popcount`) que el hardware moderno procesa de forma casi instantánea, superando por mucho a cualquier cálculo tensorial.

### B. Empaquetado de Píxeles de 4 bits (Grayscale Packing)
Para el tracking óptico, no necesitamos 256 niveles de gris. Descubrimos que con 16 niveles (4 bits) la estabilidad es idéntica.
*   **Resultado**: Comprimimos la imagen de tracking al 50% de su tamaño original, guardando dos píxeles en el espacio de uno (Uint8). Nuevos tests de estrés confirman que la robustez se mantiene intacta para el flujo óptico incluso con esta reducción.

### C. Cuantización de Coordenadas
En lugar de guardar coordenadas decimales infinitas, estandarizamos todo en una rejilla de 16 bits (Uint16). Menos bits, misma precisión visual, archivos mucho más pequeños.

---

## 4. Los Números No Mienten: Benchmarks Reales
Comparamos Taptapp AR (V7) contra el estándar de la industria open-source, MindAR.js:

| Métrica | MindAR (Original) | Taptapp AR (V7) | Mejora |
| :--- | :--- | :--- | :--- |
| **Tiempo de Compilación** | ~23.50s | **~2.61s** | 🚀 **9x más rápido** |
| **Peso del Archivo de Tracking** | ~770 KB | **~50 KB** | 📉 **-93% de peso** |
| **Arranque (Initialization)** | ~2.5s | **~0.02s** | ⚡ **Instantáneo** |
| **Dependencias (NPM)** | +20MB (TFJS) | **<100KB** | 📦 **99% más ligero** |

---

## 5. Conclusión: Menos es Más
Taptapp AR no es solo una optimización; es una declaración de principios. En un mundo saturado de modelos de IA "caja negra" y software pesado (bloatware), existe un camino de regreso a la eficiencia algorítmica.

Al optimizar para la forma en que el hardware procesa bits realmente, hemos creado el SDK de AR más ligero y rápido del ecosistema web.

---

## 🚀 ¿Quieres probarlo?
El proyecto es 100% open-source bajo licencia GPL-3.0.

- **GitHub**: [srsergiolazaro/taptapp-ar](https://github.com/srsergiolazaro/taptapp-ar)
- **NPM**: `npm install @srsergio/taptapp-ar`

¿Qué opinas? ¿Crees que la web debería volver a algoritmos más determinísticos y ligeros, o el futuro es inevitablemente ML? ¡Hablemos en los comentarios!
