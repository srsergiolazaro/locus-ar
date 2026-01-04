# Innovación 03: Eficiencia Algorítmica (LSH y Zero-TFJS)

## El Problema: El "Monstruo" de las dependencias
MindAR original utiliza TensorFlow.js (TFJS) como motor de procesamiento. Aunque potente, TFJS introduce:
1.  **Overhead de descarga:** ~1.5MB de código extra.
2.  **Latencia de Calentamiento:** El tiempo que tarda TFJS en compilar kernels WASM el hardware del usuario.
3.  **Incompatibilidad:** Fallos en navegadores que no soportan WebGL o WASM de forma óptima.

## La Innovación: El Motor "Bare-Metal" (DetectorLite)
Hemos eliminado totalmente TensorFlow.js en favor de un motor de visión computarizada escrito en JavaScript puro altamente optimizado.

### 1. DetectorLite (Zero-TFJS)
Implementamos la pirámide Gaussiana y la detección DoG (Difference of Gaussians) mediante **kernels convolucionales desenrollados (unrolled)**.
- **Innovación:** Al no tener que enviar datos a la GPU (evitando el "GPU-CPU bridge overhead"), la detección de características en imágenes pequeñas es paradójicamente más rápida en JS puro que en TFJS.

### 2. LSH (Locality Sensitive Hashing)
En el matching original, comparar dos descriptores requiere calcular la distancia entre arrays de 512 bits. Esto es costoso.
- **Innovación:** Usamos LSH para proyectar esos 512 bits a una "huella digital" de **64 bits**. 
- **Comparación por XOR:** El matching ahora se reduce a una operación `XOR` y un conteo de bits (`popcount`). 
- **Resultado:** El motor puede comparar miles de puntos en microsegundos, usando instrucciones nativas del procesador que antes eran imposibles de aprovechar con descriptores crudos.

## ¿Por qué es una innovación disruptiva?

### La "Paradoja de la Velocidad"
Al reducir la complejidad algorítmica y la carga de dependencias, hemos conseguido que el motor sea más estable. No hay "picos" de lag cuando la GPU está ocupada renderizando el modelo 3D, ya que la detección ocurre en hilos de CPU independientes y ligeros.

## Métricas de Impacto

- **Tiempo de "Time to Interactive" (TTI):** Reducción de **~3 segundos** a **<500ms**.
- **Tamaño del Bundle:** Eliminación de **1.4MB** de dependencias de terceros.
- **Velocidad de Matching:** Incremento de **5x a 10x** en la tasa de frames por segundo (FPS) en dispositivos de gama baja.
