# Innovación 05: Paralelismo y Escalabilidad

## El Problema: El bloqueo del hilo principal
La compilación de una imagen AR es un proceso intensivo que consume el 100% de un núcleo de CPU durante varios segundos.
- **MindAR:** Tradicionalmente usa un solo Worker para todo. Si tienes una galería de 10 imágenes, la compilación es lineal y lenta. Además, la comunicación entre el hilo principal y el worker suele ser pesada (copia de memoria masiva).

## La Innovación: WorkerPool Inteligente y Transferencia Zero-Copy
Taptapp-AR implementa una arquitectura de **Pool de Workers adaptativa**.

### 1. Multi-núcleo por Diseño y Lazy-Loading
Detectamos el número de núcleos lógicos del hardware del usuario y creamos un `WorkerPool`. 
- **Innovación en Escalado:** Si compilas una experiencia con múltiples imágenes, las distribuimos en paralelo.
- **Lazy Initialization:** Los Workers solo se spawnean en el momento exacto en que se solicita una compilación, evitando overhead de memoria (20-30MB) durante el modo de solo-tracking.

### 2. Datos Transferibles (Transferable Objects)
Hacemos un uso agresivo de `buffer.transfer` y `SharedArrayBuffer` (donde es posible).
- **Innovación:** En lugar de copiar los datos de la imagen (lo que duplica el uso de RAM y consume tiempo de CPU), "pasamos la propiedad" de la memoria entre hilos.

## ¿Por qué es una innovación disruptiva?

### UX de "Carga Progresiva"
Nuestra arquitectura permite reportar el progreso de forma granulada. Al no bloquear el hilo principal, podemos mostrar animaciones de carga fluidas y feedback al usuario que MindAR no podía ofrecer sin causar "micro-stuttering".

## Métricas de Impacto

- **Tiempo de Compilación (Batch):** Reducción del **60% al 75%** en sistemas quad-core.
- **Latencia de Interfaz:** Mantener los 60 FPS garantizados durante la compilación en segundo plano.
- **Estabilidad:** Prevención de cierres inesperados en móviles por exceso de presión de memoria (`Out of Memory`), gracias a la gestión eficiente de buffers transferibles.
