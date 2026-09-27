// ============================================================
// VJ Studio — Domain types
// ============================================================

// ---------- Media ----------

export type MediaKind = 'video' | 'image' | 'audio';

export interface MediaMeta {
  id: string;
  name: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  /** data-url thumbnail (small, jpeg) */
  thumbnail: string | null;
  createdAt: number;
  /** original file name for re-linking after import */
  fileName: string;
}

// ---------- Clips ----------

export type PlaybackMode = 'loop' | 'once' | 'pingpong' | 'hold';

export type ClipStatus = 'empty' | 'loading' | 'ready' | 'error' | 'playing' | 'paused';

export interface Clip {
  id: string;
  name: string;
  mediaId: string | null;
  kind: MediaKind | null;
  duration: number;
  fps: number;
  width: number;
  height: number;
  thumbnail: string | null;
  playbackMode: PlaybackMode;
  loop: boolean;
  speed: number;
  inPoint: number;
  outPoint: number;
  /** position in clip matrix */
  column: number;
  row: number;
  /** keyboard shortcut hint */
  shortcut: string | null;
  color: string | null;
}

// ---------- Transform / Layer params ----------

export interface Transform {
  x: number; // -1..1 relative to comp width
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
  anchorX: number; // 0..1
  anchorY: number;
}

export interface LayerParams {
  brightness: number; // 0..2 (1 = neutral)
  contrast: number; // 0..2
  saturation: number; // 0..2
  hue: number; // -180..180
  speed: number; // playback speed multiplier
  blur: number; // 0..1 extra blur
}

export type BlendMode =
  | 'normal'
  | 'add'
  | 'screen'
  | 'multiply'
  | 'overlay'
  | 'difference'
  | 'lighten'
  | 'darken';

export const BLEND_MODES: BlendMode[] = [
  'normal',
  'add',
  'screen',
  'multiply',
  'overlay',
  'difference',
  'lighten',
  'darken',
];

// ---------- Effects ----------

export type EffectType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'blur'
  | 'sharpen'
  | 'pixelate'
  | 'invert'
  | 'grayscale'
  | 'rgbSplit'
  | 'chromaticAberration'
  | 'mirror'
  | 'kaleidoscope'
  | 'feedback'
  | 'noise'
  | 'scanlines'
  | 'vignette';

export interface EffectParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface EffectDef {
  type: EffectType;
  name: string;
  category: 'color' | 'stylize' | 'distort' | 'pattern' | 'time';
  params: EffectParamDef[];
  /** effect uses previous frame (feedback) */
  temporal?: boolean;
}

export interface EffectInstance {
  id: string;
  type: EffectType;
  enabled: boolean;
  bypass: boolean;
  params: Record<string, number>;
}

// ---------- Layers ----------

export interface Layer {
  id: string;
  name: string;
  opacity: number; // 0..1
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  solo: boolean;
  activeClipId: string | null;
  transform: Transform;
  params: LayerParams;
  effects: EffectInstance[];
}

// ---------- Audio / Modulation ----------

export type AudioSourceKind = 'video' | 'file' | 'system' | 'off';

export type ModSource = 'volume' | 'bass' | 'mid' | 'treble';

export interface AudioModulation {
  id: string;
  source: ModSource;
  target: TargetRef;
  amount: number; // -1..1
  smoothing: number; // 0..1
  enabled: boolean;
}

export interface AudioState {
  source: AudioSourceKind;
  fileName: string | null;
  volume: number; // 0..1 output volume
  // live analysis (not serialized)
}

// ---------- Targets (shared by MIDI / Audio / Keyboard) ----------

export type TargetRef =
  | { kind: 'layer'; layerId: string; param: LayerParamKey }
  | { kind: 'effect'; layerId: string; effectId: string; param: string }
  | { kind: 'master'; param: 'opacity' | 'brightness' | 'feedback' }
  | { kind: 'clip'; clipId: string }
  | { kind: 'transport'; param: 'playPause' | 'tap' };

export type LayerParamKey =
  | 'opacity'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'speed'
  | 'blur'
  | 'scale'
  | 'rotation'
  | 'x'
  | 'y';

export interface MidiMapping {
  id: string;
  type: 'cc' | 'note';
  channel: number; // 0-15, -1 = omni
  number: number; // cc or note number
  target: TargetRef;
  label: string;
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

// ---------- Keyboard ----------

export type KeyAction =
  | { type: 'clip'; clipId: string }
  | { type: 'layer'; layerId: string }
  | { type: 'transport'; action: 'playPause' | 'stop' | 'restart' | 'record' }
  | { type: 'toggle'; action: 'performance' | 'output' | 'fullscreen' | 'settings' }
  | { type: 'master'; action: 'opacityUp' | 'opacityDown' };

export interface KeyBinding {
  id: string;
  key: string; // e.g. '1', 'q', 'Space', 'F5'
  action: KeyAction;
  label: string;
}

// ---------- BPM / Quantization ----------

export type Quantization = 'off' | '1/4' | '1/2' | '1bar' | '2bar' | '4bar';

export const QUANTIZE_OPTIONS: { value: Quantization; label: string; beats: number }[] = [
  { value: 'off', label: 'OFF', beats: 0 },
  { value: '1/4', label: '1/4', beats: 1 },
  { value: '1/2', label: '1/2', beats: 2 },
  { value: '1bar', label: '1 BAR', beats: 4 },
  { value: '2bar', label: '2 BARS', beats: 8 },
  { value: '4bar', label: '4 BARS', beats: 16 },
];

// ---------- Project ----------

export interface ProjectData {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  columns: number;
  rows: number;
  layers: Layer[];
  clips: Clip[];
  media: MediaMeta[];
  midiMappings: MidiMapping[];
  keyBindings: KeyBinding[];
  bpm: number;
  quantization: Quantization;
  accentColor: string;
  masterEffects: EffectInstance[];
  audioModulations: AudioModulation[];
  masterOpacity: number;
  masterBrightness: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail: string | null;
}

// ---------- UI ----------

export type PreviewSource = 'output' | 'cue';

export interface LoadProgress {
  active: boolean;
  label: string;
  value: number; // 0..1
}
