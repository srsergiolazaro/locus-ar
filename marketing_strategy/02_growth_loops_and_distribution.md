# 02: Bucles de Crecimiento y Distribución (Crecimiento Mecánico)

## 1. El Bucle Viral "D2D" (Desarrollador a Desarrollador)
En el mundo del código abierto, los usuarios son tu fuerza de ventas. Necesitamos diseñar razones para que los desarrolladores compartan Taptapp.

### Bucle A: De "Demo" a "Star" (Estrella)
1. El desarrollador encuentra el repositorio en GitHub.
2. El desarrollador ve un **enlace a una demo interactiva** que funciona al instante en su celular.
3. El desarrollador queda impresionado por la ausencia de pantallas de carga.
4. El desarrollador le da una "star" al repo y hace un fork para crear su propia demo.
5. Se comparte la nueva demo en Twitter/LinkedIn → Nuevos desarrolladores entran en el Paso 1.

### Bucle B: El Bucle de Autoridad del "Technical Paper"
1. Ingenieros de alto nivel buscan "tracking de AR sin ML".
2. Encuentran el **Technical Paper** (en arXiv/GitHub).
3. El documento aporta un valor técnico profundo (LSH, empaquetado de 4 bits).
4. Taptapp AR es citado como la implementación de referencia.
5. Adopción impulsada por la autoridad para proyectos comerciales serios.

## 2. Canales Estratégicos de Distribución
- **X (Twitter) / LinkedIn**: Micro-demos (videos de 15s) resaltando el "Arranque con Latencia Cero".
- **Discord (WebXR / Three.js)**: Posicionarlo como la "opción ligera para producción de alto rendimiento".
- **Daily.dev / Dev.to**: Artículos titulados: *"Por qué eliminé TensorFlow de mi librería de AR (y gané 9x en rendimiento)"*.

## 3. La Estrategia de "Infiltración"
- **Awesome Lists**: Hacer PRs a `awesome-webxr`, `awesome-threejs`, `awesome-ar`, `awesome-cv`.
- **Adaptadores del Ecosistema**: Lanzar y publicar `@taptapp/react`, `@taptapp/aframe` en npm. Esto crea "satélites" de descubrimiento.
- **Truco de npm Trends**: Asegurar que las keywords en `package.json` coincidan con `mind-ar` y `ar.js` para aparecer en las comparaciones de tendencias.

## 4. Preparación para "Show HN" (Hacker News)
Hacker News requiere la etiqueta "Show HN". El objetivo no son solo los upvotes; es el **feedback técnico de alta calidad**.
- **El Gancho**: "Reescribí un motor de Visión Artificial para evitar el impuesto de TensorFlow."
- **La Evidencia**: Benchmarks + Paper en PDF.
- **La Recompensa**: Estar en la página principal de HN por más de 4 horas = más de 1000 estrellas + interés corporativo.
