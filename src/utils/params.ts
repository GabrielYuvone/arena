import type { LayerParamKey, TargetRef } from '../types';

export interface ParamRange {
  min: number;
  max: number;
}

export const LAYER_PARAM_RANGES: Record<LayerParamKey, ParamRange> = {
  opacity: { min: 0, max: 1 },
  brightness: { min: 0, max: 2 },
  contrast: { min: 0, max: 2 },
  saturation: { min: 0, max: 2 },
  hue: { min: -180, max: 180 },
  speed: { min: 0, max: 4 },
  blur: { min: 0, max: 1 },
  scale: { min: 0, max: 3 },
  rotation: { min: -180, max: 180 },
  x: { min: -1, max: 1 },
  y: { min: -1, max: 1 },
};

export const LAYER_PARAM_LABELS: Record<LayerParamKey, string> = {
  opacity: 'Opacity',
  brightness: 'Brightness',
  contrast: 'Contrast',
  saturation: 'Saturation',
  hue: 'Hue',
  speed: 'Speed',
  blur: 'Blur',
  scale: 'Scale',
  rotation: 'Rotation',
  x: 'Position X',
  y: 'Position Y',
};

export function targetKey(target: TargetRef): string {
  switch (target.kind) {
    case 'layer':
      return `layer:${target.layerId}:${target.param}`;
    case 'effect':
      return `effect:${target.layerId}:${target.effectId}:${target.param}`;
    case 'master':
      return `master:${target.param}`;
    case 'clip':
      return `clip:${target.clipId}`;
    case 'transport':
      return `transport:${target.param}`;
  }
}

export function targetLabel(target: TargetRef, names: {
  layerName?: (id: string) => string;
  effectName?: (id: string) => string;
  clipName?: (id: string) => string;
} = {}): string {
  switch (target.kind) {
    case 'layer': {
      const n = names.layerName?.(target.layerId) ?? target.layerId.slice(0, 6);
      return `${n} · ${LAYER_PARAM_LABELS[target.param] ?? target.param}`;
    }
    case 'effect': {
      const n = names.layerName?.(target.layerId) ?? target.layerId.slice(0, 6);
      const e = names.effectName?.(target.effectId) ?? 'Effect';
      return `${n} · ${e} · ${target.param}`;
    }
    case 'master':
      return `Master · ${target.param}`;
    case 'clip':
      return `Trigger clip ${names.clipName?.(target.clipId) ?? target.clipId.slice(0, 6)}`;
    case 'transport':
      return `Transport · ${target.param}`;
  }
}

export function targetRange(target: TargetRef): ParamRange | null {
  switch (target.kind) {
    case 'layer':
      return LAYER_PARAM_RANGES[target.param] ?? null;
    case 'effect':
      return { min: 0, max: 1 };
    case 'master':
      return target.param === 'brightness' ? { min: 0, max: 2 } : { min: 0, max: 1 };
    default:
      return null;
  }
}

/** Key used by runtime override maps. */
export function overrideKey(target: TargetRef): string {
  return targetKey(target);
}
