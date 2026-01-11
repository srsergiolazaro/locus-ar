# Análisis: Orquestador de Escalas vs. Octavas Lineales

## 1. Introducción
El sistema actual de AR utiliza una detección de características basada en **octavas lineales**, donde para cada frame se construye una pirámide completa y se buscan puntos de interés en todos los niveles (0, 1, 2, ... n). Esto garantiza que no perdamos el objetivo independientemente de su distancia, pero es **computacionalmente redundante** una vez que el target ha sido localizado.

## 2. ¿Es factible?
**Sí, es altamente factible y recomendable.**

En una sesión de AR promedio, el tamaño aparente del target en pantalla cambia gradualmente. No saltamos de la Octava 0 (cerca) a la Octava 4 (lejos) en 16ms (un frame). Existe una **consistencia temporal** que podemos explotar.

### Estrategia de Implementación (Orquestador Eficiente)
En lugar de procesar todas las octavas, el orquestador actuaría como un **"Foco de Escala"**:
1.  **Estado de Tracking**: Si el objeto está trackeado en la Octava $i$, el orquestador solo pide procesar las octavas $[i-1, i, i+1]$.
2.  **Modo Búsqueda**: Si el tracking se pierde o la confianza baja, el orquestador expande la búsqueda a todas las octavas.
3.  **Trigger por Saliency**: Integrar con el `SaliencyMap` actual. Si hay un cambio brusco en la periferia, forzar un check de escala global.

## 3. Impacto Estimado

### A. Rendimiento (CPU/Latencia)
*   **Ahorro de Cómputo**: ~40% - 60% en la fase de detección.
*   **Razón**: Aunque las octavas superiores son más pequeñas, el coste de filtrado Gaussiano, Diferencia de Gaussianas (DoG) y extracción de descriptores se acumula. Eliminar 2 o 3 niveles innecesarios libera ciclos críticos de CPU para el renderizado o lógica de negocio.
*   **Latencia**: Se reduce el jitter. Menos procesamiento por frame significa tiempos de respuesta más consistentes.

### B. Consumo Energético
*   Directamente proporcional a la reducción de uso de CPU/GPU. Clave para sesiones prolongadas en dispositivos móviles (web-AR).

### C. Precisión y Robustez
*   **Riesgo**: Si el usuario mueve el dispositivo muy rápido hacia atrás/adelante, podríamos "perder" la escala activa.
*   **Mitigación**: Implementar un **"Interleave de Octavas"**. Por ejemplo, procesar $[i-1, i, i+1]$ siempre, pero cada 5 frames, procesar una octava lejana de forma rotativa para verificar si el objeto ha reaparecido allí.

## 4. Análisis de Peso (Ocupación de Código)
Un orquestador basado en lógica de control (Heurística o Kalman Filter para escala) pesaría **menos de 2KB** minificado. Es mucho más eficiente que añadir modelos de ML para predicción de escala.

## 5. Cuadro Comparativo

| Característica | Octavas Lineales (Actual) | Orquestador de Escalas (Propuesto) |
| :--- | :--- | :--- |
| **Costo Computacional** | Alto (Constante) | Bajo (Adaptativo) |
| **Robustez al Cambio de Escala** | Máxima | Media-Alta (con mitigación) |
| **Ideal para...** | Detección Inicial | Tracking Continuo |
| **Impacto en FPS** | Limitado por el peor caso | Optimizado para el caso de uso común |

## 6. Conclusión
La implementación de un orquestador de octavas es el siguiente paso lógico para la **Percepción Bio-Inspirada**. Permite que el sistema "se concentre" no solo en dónde está el objeto ($x, y$) sino también en qué resolución es más eficiente verlo ($z$).

**Recomendación**: Implementar como un módulo `ScaleOrchestrator` dentro de `src/core/perception/`.
