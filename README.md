# VJ Studio — Visual Performance Tool

**🟢 EN VIVO: https://gabrielyuvone.github.io/arena/**

Aplicación web completa para VJing en tiempo real. Construida con **Vite + React + TypeScript +
Tailwind CSS + Zustand + WebGL + Web Audio + Web MIDI**. Sin backend: los proyectos se guardan en
**IndexedDB** y se exportan/importan como **JSON**.

> No es una landing page: es la herramienta de producción, abierta directamente en la interfaz.

---

## Arranque rápido

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en dist/
```

### Deploy (GitHub Pages)

La rama `gh-pages` contiene el build estático y publica automáticamente en
`https://gabrielyuvone.github.io/arena/`. Para actualizar:

```bash
npm run build
# copiar dist/* a la rama gh-pages y hacer push
```

---

## Arquitectura

```
src/
├── components/        # UI: TopBar, modales, primitivas (Slider, Panel, Button…)
│   └── panels/        # ClipMatrix, LayerPanel, PreviewArea, TransportBar,
│                      # EffectsPanel, TransformPanel, ClipInspector,
│                      # AudioPanel, MidiPanel, MediaLibrary
├── canvas/            # Motor visual WebGL (GLCore, Renderer, VisualEngine, MediaEngine)
├── shaders/           # Fragment shaders independientes (.frag / .vert, importados con ?raw)
│   └── effects/       # brightness, contrast, saturation, hue, blur, sharpen, pixelate,
│                      # invert, grayscale, rgbSplit, chromaticAberration, mirror,
│                      # kaleidoscope, feedback, noise, scanlines, vignette
├── clips/             # PlaybackController (loop/once/pingpong/hold, in/out, reverse)
│                      # launch (con quantization) · import (drag & drop + thumbnails)
├── layers/            # Resolución de capas + overrides (audio/MIDI)
├── effects/           # Registro de efectos (definiciones + shaders + parámetros)
├── audio/             # Motor Web Audio (análisis volume/bass/mid/treble)
├── midi/              # Web MIDI: dispositivos, CC/notes, MIDI LEARN
├── keyboard/          # Atajos configurables
├── project/           # IndexedDB (proyectos + blobs de media), serialización JSON
├── store/             # Zustand: proyecto · playback · UI · telemetría
├── types/             # Modelo de dominio completo
├── utils/             # matriz, BPM clock, modulación, parámetros, ids
└── hooks/             # useRenderLoop (rAF principal), useTelemetry
```

### Pipeline de render (WebGL)

1. Cada clip activo se sube como textura desde `<video>` / `<img>`.
2. Por capa (de abajo hacia arriba): transform → ajustes de color → cadena de efectos (ping-pong FBO).
3. Las capas se mezclan con **blend modes** (Normal, Add, Screen, Multiply, Overlay, Difference,
   Lighten, Darken) + opacidad.
4. Efectos **master** (incluido **Feedback** con buffer temporal: Amount / Zoom / Rotation / Decay).
5. Pass final (master opacity + brightness) al canvas de preview / output / grabación.

Los shaders viven en `src/shaders/` como archivos independientes — para agregar un efecto nuevo:
crear `effects/miEfecto.frag`, registrarlo en `src/effects/registry.ts`.

---

## Funcionalidad

### Clips y medios
- Matriz de clips por columnas × filas (ajustable).
- Drag & drop de **MP4 / WebM / MOV / PNG / JPG / GIF / audio** sobre celdas o sobre toda la app.
- Thumbnails automáticos (se descartan frames negros).
- Click = lanzar / detener en la capa objetivo. Click derecho: renombrar, duplicar, reemplazar,
  limpiar, borrar. Arrastrar clip entre celdas para reubicar.
- Por clip: nombre, tipo, duración, FPS, resolución, modo de reproducción (**LOOP / ONCE /
  PING PONG / HOLD**), loop, velocidad (presets 0.1x–4x + custom), puntos **IN / OUT**.

### Capas
- Orden vertical (la superior renderiza encima), reordenar, duplicar, bloquear, ocultar, solo.
- Blend mode + opacidad por capa.
- Controles por capa con sliders (doble click = reset, flechas = ajuste fino, click en el valor
  para tipear): Opacity, Brightness, Contrast, Saturation, Hue, Speed, Blur, Scale, Rotation, X, Y.
- Panel **TRANSFORM**: Position X/Y, Scale X/Y, Rotation, Anchor X/Y, proporción bloqueada o
  deformación independiente. Botones **RESET / CENTER / FIT / FILL**.

### Efectos (17)
Brightness · Contrast · Saturation · Hue · Blur · Sharpen · Pixelate · Invert · Grayscale ·
RGB Split · Chromatic Aberration · Mirror · Kaleidoscope · **Feedback** · Noise · Scanlines · Vignette

Cada efecto: on/off, bypass, parámetros, eliminar, **reordenar** (el orden afecta el resultado).
Cadena por capa **y** cadena master.

### Audio y audio-reactividad
- Fuentes: audio del video, archivo de audio, audio del sistema (getDisplayMedia).
- Visualizador + medidores **Volume / Bass / Mid / Treble**.
- **AUDIO MODULATION**: SOURCE (volume/bass/mid/treble) → TARGET (parámetro de capa o master) →
  AMOUNT → SMOOTHING. Múltiples modulaciones simultáneas.

### MIDI
- Detección de dispositivos (Web MIDI), estado **MIDI CONNECTED** + nombre.
- **MIDI LEARN**: elegir parámetro → mover knob/tecla → se guarda el mapping (CC o Note).
- Lista de mappings con eliminación. Notas pueden lanzar clips.
- Quick mappings (CC 01→Opacity, CC 02→Speed, Note 36→Clip 1…).

### Teclado (configurable)
- `1-9/0, A-L, Z-/` → clips · `Q W E R T Y` → capas · `Space` → play/pause ·
  `Backspace` → stop all · `F5` → restart · `F` → output window · `P` → performance mode ·
  `R` → grabar. Reasignable desde **KEYS** o Settings.

### Tempo
- **BPM** manual, **TAP TEMPO**, **SYNC** (reinicio de compás), indicador de beats.
- **QUANTIZATION**: OFF, 1/4, 1/2, 1 BAR, 2 BARS, 4 BARS — el cambio de clip espera el boundary.

### Preview / Output
- **PREVIEW** con zoom (Fit / 100% / ±) y presets de aspecto **16:9 · 4:3 · 1:1 · 9:16** +
  resolución personalizada.
- **CUE**: vista separada del clip seleccionado antes de mandarlo al output.
- **OUTPUT WIN**: ventana independiente con la composición final (doble click = fullscreen).
- **PERFORMANCE MODE** (`P`): oculta paneles secundarios y prioriza preview + clips + BPM/FPS/AUD/MIDI.

### Recording
- **REC** → MediaRecorder sobre el canvas → descarga **WebM**.

### Proyectos
- **NEW / SAVE / SAVE AS / LOAD / EXPORT / IMPORT**.
- Guardado local en **IndexedDB** (estado + blobs de media). Export **JSON** sin incrustar media
  (referencias por nombre de archivo, re-link posterior con drag & drop).

---

## Atajos por defecto

| Tecla | Acción |
|-------|--------|
| 1–9, 0 | Clips fila 1 |
| A–L | Clips fila 2 |
| Z–/ | Clips fila 3 |
| Q W E R T Y | Seleccionar capa 1–6 |
| Space | Play / Pause |
| Backspace | Stop all |
| F5 | Restart clips |
| F | Ventana OUTPUT |
| P | Performance mode |
| R | Grabar |

---

## Notas de compatibilidad

- **Web MIDI**: Chrome/Edge completo; Firefox con flag; Safari limitado.
- **Audio del sistema**: requiere `getDisplayMedia` (Chrome/Edge). En otros navegadores usar
  archivo de audio o audio de video.
- **MOV**: se reproduce si el códec lo soporta el navegador (H.264 sí; ProRes no).
- La app necesita una interacción del usuario para activar el audio (política de autoplay) —
  cualquier click sobre Play/TAP lo resuelve.

## Tests de humo

`smoke-test.mjs`, `smoke-test2.mjs`, `smoke-test3.mjs` (Playwright + Chromium headless):
carga, import de media, lanzamiento de clips, cadena de efectos, modo performance, guardado.

```bash
node smoke-test.mjs
```
