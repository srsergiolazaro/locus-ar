# TapTapp AR: Post-Mortem de Optimización y Lecciones Aprendidas

Este documento detalla los fallos críticos encontrados durante la fase de optimización de la detección inmediata y el tracking de largo alcance, y cómo se resolvieron para evitar repetir los mismos errores en el futuro.

## 1. El Bug de la Escala Invertida (The Division vs. Multiplication Trap)
### El Problema
Al detectar un marcador en una octava baja (por ejemplo, al 50% de su tamaño original), el sistema intentaba proyectar los puntos encontrados de vuelta al espacio del marcador original.
- **Lo que intentamos:** `world_x = keypoint_x * scale`
- **Por qué falló:** Si el punto estaba en la posición 100 de una imagen de tamaño 50, multiplicar por 0.5 daba 50. ¡El punto se movía al lugar equivocado!
- **La solución:** Usar siempre división para restaurar la escala original: `world_x = (keypoint_x + 0.5) / scale`.
- **Lección:** Las coordenadas de las octavas son relativas al tamaño del buffer de esa octava; para volver al original (X=1), hay que invertir la escala de reducción.

## 2. El Muro del 10% en Hough
### El Problema
La detección de imágenes lejanas moría repentinamente cuando la imagen ocupaba menos del 10% de la pantalla.
- **Lo que intentamos:** Mantener el rango de `minScale = -1` (base 10, lo que significa $10^{-1} = 0.1$).
- **Por qué falló:** En cuanto la imagen era más pequeña que el 10%, el acumulador de Hough descartaba los votos por estar "fuera de rango", rompiendo la detección inicial.
- **La solución:** Ampliar el rango a `minScale = -2` ($10^{-2} = 0.01$).
- **Lección:** No asumas rangos de escala fijos por "estándar". En AR móvil, el usuario puede estar muy lejos de la imagen.

## 3. Artefactos de Borde en el Detector
### El Problema
El tracker a veces "saltaba" o se volvía inestable cuando el marcador estaba cerca del borde de la pantalla.
- **Lo que intentamos:** Un filtro Gaussiano rápido `[1,4,6,4,1]` sin normalización especial en los bordes.
- **Por qué falló:** Al llegar al borde, el filtro sumaba menos de 16/16 (solo capturaba parte de la energía), lo que creaba un falso gradiente de brillo en las esquinas. Esto generaba cientos de "puntos fantasma" que el tracker intentaba seguir.
- **La solución:** Normalizar dinámicamente cada píxel del borde dividiendo por la suma real de los pesos que entraron en la ventana.
- **Lección:** La consistencia lumínica es más importante que la velocidad pura en los bordes. Un borde sucio = Tracking inestable.

## 4. El "Suicidio" por Inliers
### El Problema
El sistema encontraba la imagen (Hamming success) pero el plano azul nunca aparecía.
- **Lo que intentamos:** Exigir un mínimo de 8 inliers para la detección inicial.
- **Por qué falló:** Con imágenes pequeñas, es muy difícil conseguir 8 puntos perfectos en el primer frame. El sistema abortaba el intento antes de empezar.
- **La solución:** Bajar el requisito inicial a 6 inliers para "enganchar" y permitir un periodo de "warm-up" de 15 frames donde el tracker es más permisivo mientras acumula puntos estables.
- **Lección:** Separa los requisitos de *Detección* (sensible) de los de *Tracking* (robusto).

## 5. Export de Octavas en el Compilador
### El Problema
El sistema funcionaba en local pero no con archivos `.taar` compilados.
- **Lo que intentamos:** El compilador procesaba todas las escalas pero solo exportaba la `Octava 0`.
- **Por qué falló:** El motor intentaba comparar una imagen lejana (pequeña) contra una referencia de alta resolución (Gigante), lo cual es ineficiente y propenso a fallar.
- **La solución:** Exportar el array completo de octavas de tracking para que el motor elija la escala que mejor encaja con lo que ve la cámara.

---
**Documento generado para evitar futuras regresiones en la arquitectura de TapTapp AR.**
