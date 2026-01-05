# 03: Playbook Táctico de SEO (Algoritmos de npm y GitHub)

## 1. Indexación de Búsqueda en GitHub (El Algoritmo de "Autoridad")
La búsqueda de GitHub le da mucho peso al **Título**, la **Descripción** y los **Topics** (Temas).

### Tácticas:
- **Ingeniería de Topics**: No te limites a poner `ar`. Usa temas especializados pero con alta intención de búsqueda:
  `low-latency-ar`, `offline-ar`, `webgl-vision`, `bare-metal-js`, `image-tracking-sdk`.
- **SEO del Encabezado del README**: El primer `h1` y el párrafo de abajo son indexados.
  - *Recomendación*: Usa palabras clave de forma natural en las primeras 200 palabras.
- **Metadatos del Repositorio**: Asegúrate de que el campo "Website" apunte al sitio de la demo oficial. Esto funciona como una señal de enlace (backlink).

## 2. Descubrimiento en npm (El Algoritmo de "Calidad")
npm utiliza una **Puntuación de Descubrimiento** (Calidad, Popularidad, Mantenimiento).

### Optimizaciones Tácticas para `package.json`:
- **Clústeres de Palabras Clave**: Agrupa las keywords por intención.
  - *Tecnología*: `webgpu`, `wasm` (aunque se usen poco, atraen tráfico de alto nivel), `worker-threads`.
  - *Caso de Uso*: `augmented-reality`, `face-tracking` (futuro), `image-tracking`.
  - *Frameworks*: `react-ar`, `a-frame-ar`, `threejs-ar`.
- **Optimización de la Descripción**: La descripción debe ser una "Micro-Landing Page".
  - *Actual*: "Ultra-fast, lightweight Augmented Reality Image Tracking SDK..."
  - *Moonshot*: "El motor de AR de 50KB y Cero Dependencias para la Web. 9x más rápido que MindAR. Inicialización con latencia cero."
- **Mapeo de Exportaciones**: Un campo `exports` bien configurado en `package.json` asegura que los términos de búsqueda específicos para sub-módulos (como `/compiler`) aparezcan en búsquedas especializadas.

## 3. El Truco de Comparación de "npm Trends"
Cuando la gente compara librerías, busca "Alternativas a [X]".
- **Táctica**: Incluye un archivo `COMPARISON.md` en el repo. Esto posiciona para búsquedas en Google como *"taptapp-ar vs mindar"* o *"mindar alternatives 2026"*.

## 4. Optimización de Conversión del README (CRO)
El SEO los trae a la página; el CRO hace que ejecuten `npm install`.
- **Evidencia Visual**: Un GIF o Video *antes del primer scroll* (above the fold) es obligatorio.
- **La "Regla de los 30 Segundos"**: El código de `Quick Start` debe ser copiable y funcionar en un archivo HTML simple.
- **Prueba Social**: Los "Badges" (Descargas, Estado de CI, Licencia) deben ser lo primero que se vea.
