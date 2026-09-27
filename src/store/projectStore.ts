// Project state: clips, layers, effects, mappings, BPM, settings.
// This slice is what gets serialized to IndexedDB / JSON.

import { create } from 'zustand';
import type {
  AudioModulation,
  BlendMode,
  Clip,
  EffectInstance,
  EffectType,
  KeyBinding,
  Layer,
  LayerParamKey,
  MediaMeta,
  MidiMapping,
  ProjectData,
  Quantization,
  Transform,
} from '../types';
import { createEffectInstance } from '../effects/registry';
import { uid, clamp } from '../utils/id';

export const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  anchorX: 0.5,
  anchorY: 0.5,
};

export const DEFAULT_LAYER_PARAMS = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  hue: 0,
  speed: 1,
  blur: 0,
};

export function createLayer(name: string, index: number): Layer {
  return {
    id: uid('layer'),
    name: name || `Layer ${index}`,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    solo: false,
    activeClipId: null,
    transform: { ...DEFAULT_TRANSFORM },
    params: { ...DEFAULT_LAYER_PARAMS },
    effects: [],
  };
}

export function createClip(column: number, row: number, name?: string): Clip {
  return {
    id: uid('clip'),
    name: name || `Clip ${column * 8 + row + 1}`,
    mediaId: null,
    kind: null,
    duration: 0,
    fps: 30,
    width: 0,
    height: 0,
    thumbnail: null,
    playbackMode: 'loop',
    loop: true,
    speed: 1,
    inPoint: 0,
    outPoint: 0,
    column,
    row,
    shortcut: null,
    color: null,
  };
}

export function emptyProject(name = 'Untitled Project'): ProjectData {
  const layers = [createLayer('Layer 1', 1), createLayer('Layer 2', 2), createLayer('Layer 3', 3)];
  return {
    version: 1,
    id: uid('project'),
    name,
    width: 1280,
    height: 720,
    fps: 60,
    columns: 4,
    rows: 4,
    layers,
    clips: [],
    media: [],
    midiMappings: [],
    keyBindings: [],
    bpm: 120,
    quantization: 'off',
    accentColor: '#22d3ee',
    masterEffects: [],
    audioModulations: [],
    masterOpacity: 1,
    masterBrightness: 1,
  };
}

// ---------- shortcuts auto-assign ----------

const CLIP_KEY_GRID = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

export function clipKeyFor(column: number, row: number): string | null {
  const keys = CLIP_KEY_GRID[row];
  return keys ? keys[column] ?? null : null;
}

export function defaultKeyBindings(clips: Clip[], layers: Layer[]): KeyBinding[] {
  const bindings: KeyBinding[] = [];
  clips.forEach((clip) => {
    if (clip.shortcut) {
      bindings.push({
        id: uid('key'),
        key: clip.shortcut,
        action: { type: 'clip', clipId: clip.id },
        label: `Trigger ${clip.name}`,
      });
    }
  });
  const layerKeys = ['q', 'w', 'e', 'r', 't', 'y'];
  layers.forEach((layer, i) => {
    const key = layerKeys[i];
    if (key) {
      bindings.push({
        id: uid('key'),
        key,
        action: { type: 'layer', layerId: layer.id },
        label: `Select ${layer.name}`,
      });
    }
  });
  bindings.push(
    {
      id: uid('key'),
      key: ' ',
      action: { type: 'transport', action: 'playPause' },
      label: 'Play / Pause',
    },
    {
      id: uid('key'),
      key: 'Backspace',
      action: { type: 'transport', action: 'stop' },
      label: 'Stop all clips',
    },
    {
      id: uid('key'),
      key: 'p',
      action: { type: 'toggle', action: 'performance' },
      label: 'Performance mode',
    },
    {
      id: uid('key'),
      key: 'f',
      action: { type: 'toggle', action: 'output' },
      label: 'Toggle output window',
    },
    {
      id: uid('key'),
      key: 'r',
      action: { type: 'transport', action: 'record' },
      label: 'Toggle recording',
    },
    {
      id: uid('key'),
      key: 'F5',
      action: { type: 'transport', action: 'restart' },
      label: 'Restart clips',
    },
  );
  return bindings;
}

interface ProjectStore extends ProjectData {
  // ---- meta ----
  setProject: (data: ProjectData) => void;
  newProject: (name?: string) => void;
  setName: (name: string) => void;
  setResolution: (width: number, height: number) => void;
  setFps: (fps: number) => void;
  setAccentColor: (color: string) => void;
  setGrid: (columns: number, rows: number) => void;

  // ---- media ----
  addMedia: (meta: MediaMeta) => void;
  removeMedia: (mediaId: string) => void;
  updateMedia: (mediaId: string, patch: Partial<MediaMeta>) => void;

  // ---- clips ----
  addClip: (clip: Clip) => void;
  updateClip: (clipId: string, patch: Partial<Clip>) => void;
  removeClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => Clip | null;
  moveClip: (clipId: string, column: number, row: number) => void;
  setClipShortcut: (clipId: string, key: string | null) => void;

  // ---- layers ----
  addLayer: () => void;
  updateLayer: (layerId: string, patch: Partial<Layer>) => void;
  setLayerParam: (layerId: string, param: LayerParamKey, value: number) => void;
  setLayerTransform: (layerId: string, patch: Partial<Transform>) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  moveLayer: (layerId: string, direction: -1 | 1) => void;
  setBlendMode: (layerId: string, mode: BlendMode) => void;
  setLayerClip: (layerId: string, clipId: string | null) => void;

  // ---- effects ----
  addEffect: (layerId: string | null, type: EffectType) => void;
  updateEffect: (
    layerId: string | null,
    effectId: string,
    patch: Partial<EffectInstance>,
  ) => void;
  setEffectParam: (
    layerId: string | null,
    effectId: string,
    key: string,
    value: number,
  ) => void;
  removeEffect: (layerId: string | null, effectId: string) => void;
  moveEffect: (layerId: string | null, effectId: string, direction: -1 | 1) => void;

  // ---- midi / keys / audio mods ----
  addMidiMapping: (mapping: MidiMapping) => void;
  removeMidiMapping: (id: string) => void;
  setKeyBindings: (bindings: KeyBinding[]) => void;
  setKeyBinding: (id: string, patch: Partial<KeyBinding>) => void;
  addKeyBinding: (binding: KeyBinding) => void;
  removeKeyBinding: (id: string) => void;
  addAudioMod: (mod: AudioModulation) => void;
  updateAudioMod: (id: string, patch: Partial<AudioModulation>) => void;
  removeAudioMod: (id: string) => void;

  // ---- bpm ----
  setBpm: (bpm: number) => void;
  setQuantization: (q: Quantization) => void;

  // ---- master ----
  setMaster: (patch: { opacity?: number; brightness?: number }) => void;

  getData: () => ProjectData;
}

const initial = emptyProject();
initial.keyBindings = defaultKeyBindings(initial.clips, initial.layers);

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...initial,

  setProject: (data) => set({ ...data }),
  newProject: (name) => set({ ...emptyProject(name) }),
  setName: (name) => set({ name }),
  setResolution: (width, height) =>
    set({ width: Math.max(16, Math.round(width)), height: Math.max(16, Math.round(height)) }),
  setFps: (fps) => set({ fps: clamp(fps, 10, 120) }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setGrid: (columns, rows) => set({ columns: clamp(columns, 1, 12), rows: clamp(rows, 1, 12) }),

  addMedia: (meta) => set((s) => ({ media: [...s.media, meta] })),
  removeMedia: (mediaId) =>
    set((s) => ({
      media: s.media.filter((m) => m.id !== mediaId),
      clips: s.clips.map((c) =>
        c.mediaId === mediaId
          ? { ...c, mediaId: null, kind: null, thumbnail: null, duration: 0 }
          : c,
      ),
    })),
  updateMedia: (mediaId, patch) =>
    set((s) => ({ media: s.media.map((m) => (m.id === mediaId ? { ...m, ...patch } : m)) })),

  addClip: (clip) =>
    set((s) => {
      const exists = s.clips.find((c) => c.column === clip.column && c.row === clip.row);
      const clips = exists
        ? s.clips.map((c) => (c.id === exists.id ? { ...clip, id: exists.id } : c))
        : [...s.clips, clip];
      return { clips };
    }),
  updateClip: (clipId, patch) =>
    set((s) => ({ clips: s.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)) })),
  removeClip: (clipId) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== clipId),
      layers: s.layers.map((l) =>
        l.activeClipId === clipId ? { ...l, activeClipId: null } : l,
      ),
      keyBindings: s.keyBindings.filter(
        (b) => !(b.action.type === 'clip' && b.action.clipId === clipId),
      ),
    })),
  duplicateClip: (clipId) => {
    const s = get();
    const clip = s.clips.find((c) => c.id === clipId);
    if (!clip) return null;
    // find first free slot
    for (let col = 0; col < s.columns; col++) {
      for (let row = 0; row < s.rows; row++) {
        if (!s.clips.find((c) => c.column === col && c.row === row)) {
          const copy: Clip = {
            ...clip,
            id: uid('clip'),
            name: `${clip.name} copy`,
            column: col,
            row,
            shortcut: clipKeyFor(col, row),
          };
          set((st) => ({ clips: [...st.clips, copy] }));
          return copy;
        }
      }
    }
    return null;
  },
  moveClip: (clipId, column, row) =>
    set((s) => {
      const target = s.clips.find((c) => c.column === column && c.row === row);
      const source = s.clips.find((c) => c.id === clipId);
      if (!source) return {};
      return {
        clips: s.clips.map((c) => {
          if (c.id === clipId) return { ...c, column, row, shortcut: clipKeyFor(column, row) };
          if (target && c.id === target.id)
            return {
              ...c,
              column: source.column,
              row: source.row,
              shortcut: clipKeyFor(source.column, source.row),
            };
          return c;
        }),
      };
    }),
  setClipShortcut: (clipId, key) =>
    set((s) => ({ clips: s.clips.map((c) => (c.id === clipId ? { ...c, shortcut: key } : c)) })),

  addLayer: () =>
    set((s) => ({ layers: [...s.layers, createLayer(`Layer ${s.layers.length + 1}`, s.layers.length + 1)] })),
  updateLayer: (layerId, patch) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)) })),
  setLayerParam: (layerId, param, value) =>
    set((s) => ({
      layers: s.layers.map((l) => {
        if (l.id !== layerId) return l;
        if (param === 'opacity') return { ...l, opacity: clamp(value, 0, 1) };
        if (param === 'scale') {
          return {
            ...l,
            transform: { ...l.transform, scaleX: clamp(value, 0, 3), scaleY: clamp(value, 0, 3) },
          };
        }
        if (param === 'rotation') return { ...l, transform: { ...l.transform, rotation: value } };
        if (param === 'x') return { ...l, transform: { ...l.transform, x: clamp(value, -1, 1) } };
        if (param === 'y') return { ...l, transform: { ...l.transform, y: clamp(value, -1, 1) } };
        return { ...l, params: { ...l.params, [param]: value } };
      }),
    })),
  setLayerTransform: (layerId, patch) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === layerId ? { ...l, transform: { ...l.transform, ...patch } } : l,
      ),
    })),
  removeLayer: (layerId) =>
    set((s) => {
      if (s.layers.length <= 1) return {};
      return {
        layers: s.layers.filter((l) => l.id !== layerId),
        keyBindings: s.keyBindings.filter(
          (b) => !(b.action.type === 'layer' && b.action.layerId === layerId),
        ),
      };
    }),
  duplicateLayer: (layerId) =>
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === layerId);
      if (idx < 0) return {};
      const src = s.layers[idx];
      const copy: Layer = {
        ...JSON.parse(JSON.stringify(src)),
        id: uid('layer'),
        name: `${src.name} copy`,
        effects: src.effects.map((fx) => ({ ...fx, id: uid('fx'), params: { ...fx.params } })),
      };
      const layers = [...s.layers];
      layers.splice(idx + 1, 0, copy);
      return { layers };
    }),
  moveLayer: (layerId, direction) =>
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === layerId);
      const to = idx + direction;
      if (idx < 0 || to < 0 || to >= s.layers.length) return {};
      const layers = [...s.layers];
      const [moved] = layers.splice(idx, 1);
      layers.splice(to, 0, moved);
      return { layers };
    }),
  setBlendMode: (layerId, mode) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === layerId ? { ...l, blendMode: mode } : l)) })),
  setLayerClip: (layerId, clipId) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === layerId ? { ...l, activeClipId: clipId } : l)) })),

  addEffect: (layerId, type) =>
    set((s) => {
      const instance = createEffectInstance(type);
      if (layerId === null) return { masterEffects: [...s.masterEffects, instance] };
      return {
        layers: s.layers.map((l) =>
          l.id === layerId ? { ...l, effects: [...l.effects, instance] } : l,
        ),
      };
    }),
  updateEffect: (layerId, effectId, patch) =>
    set((s) => {
      const apply = (list: EffectInstance[]) =>
        list.map((fx) => (fx.id === effectId ? { ...fx, ...patch } : fx));
      if (layerId === null) return { masterEffects: apply(s.masterEffects) };
      return {
        layers: s.layers.map((l) => (l.id === layerId ? { ...l, effects: apply(l.effects) } : l)),
      };
    }),
  setEffectParam: (layerId, effectId, key, value) =>
    set((s) => {
      const apply = (list: EffectInstance[]) =>
        list.map((fx) =>
          fx.id === effectId ? { ...fx, params: { ...fx.params, [key]: value } } : fx,
        );
      if (layerId === null) return { masterEffects: apply(s.masterEffects) };
      return {
        layers: s.layers.map((l) => (l.id === layerId ? { ...l, effects: apply(l.effects) } : l)),
      };
    }),
  removeEffect: (layerId, effectId) =>
    set((s) => {
      const apply = (list: EffectInstance[]) => list.filter((fx) => fx.id !== effectId);
      if (layerId === null) return { masterEffects: apply(s.masterEffects) };
      return {
        layers: s.layers.map((l) => (l.id === layerId ? { ...l, effects: apply(l.effects) } : l)),
      };
    }),
  moveEffect: (layerId, effectId, direction) =>
    set((s) => {
      const reorder = (list: EffectInstance[]) => {
        const idx = list.findIndex((fx) => fx.id === effectId);
        const to = idx + direction;
        if (idx < 0 || to < 0 || to >= list.length) return list;
        const next = [...list];
        const [moved] = next.splice(idx, 1);
        next.splice(to, 0, moved);
        return next;
      };
      if (layerId === null) return { masterEffects: reorder(s.masterEffects) };
      return {
        layers: s.layers.map((l) => (l.id === layerId ? { ...l, effects: reorder(l.effects) } : l)),
      };
    }),

  addMidiMapping: (mapping) => set((s) => ({ midiMappings: [...s.midiMappings, mapping] })),
  removeMidiMapping: (id) =>
    set((s) => ({ midiMappings: s.midiMappings.filter((m) => m.id !== id) })),
  setKeyBindings: (keyBindings) => set({ keyBindings }),
  setKeyBinding: (id, patch) =>
    set((s) => ({
      keyBindings: s.keyBindings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),
  addKeyBinding: (binding) => set((s) => ({ keyBindings: [...s.keyBindings, binding] })),
  removeKeyBinding: (id) =>
    set((s) => ({ keyBindings: s.keyBindings.filter((b) => b.id !== id) })),

  addAudioMod: (mod) => set((s) => ({ audioModulations: [...s.audioModulations, mod] })),
  updateAudioMod: (id, patch) =>
    set((s) => ({
      audioModulations: s.audioModulations.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  removeAudioMod: (id) =>
    set((s) => ({ audioModulations: s.audioModulations.filter((m) => m.id !== id) })),

  setBpm: (bpm) => set({ bpm: clamp(bpm, 20, 300) }),
  setQuantization: (quantization) => set({ quantization }),

  setMaster: (patch) =>
    set((s) => ({
      masterOpacity: patch.opacity !== undefined ? clamp(patch.opacity, 0, 1) : s.masterOpacity,
      masterBrightness:
        patch.brightness !== undefined ? clamp(patch.brightness, 0, 2) : s.masterBrightness,
    })),

  getData: () => {
    const s = get();
    return {
      version: 1 as const,
      id: s.id,
      name: s.name,
      width: s.width,
      height: s.height,
      fps: s.fps,
      columns: s.columns,
      rows: s.rows,
      layers: s.layers,
      clips: s.clips,
      media: s.media,
      midiMappings: s.midiMappings,
      keyBindings: s.keyBindings,
      bpm: s.bpm,
      quantization: s.quantization,
      accentColor: s.accentColor,
      masterEffects: s.masterEffects,
      audioModulations: s.audioModulations,
      masterOpacity: s.masterOpacity,
      masterBrightness: s.masterBrightness,
    };
  },
}));
