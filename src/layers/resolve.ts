// Builds the render input from project state + runtime overrides.

import type { Clip, Layer, LayerParams, ProjectData, Transform } from '../types';
import type { LayerRenderState } from '../canvas/renderer';
import { mediaEngine } from '../canvas/media';
import type { Overrides } from '../utils/modulation';
import { resolveValue } from '../utils/modulation';
import { clamp } from '../utils/id';

export function resolveLayerState(
  layer: Layer,
  overrides: Overrides,
): {
  opacity: number;
  params: LayerParams;
  transform: Transform;
  effectParams: Record<string, Record<string, number>>;
} {
  const t = layer.transform;
  const p = layer.params;

  const scaleX = resolveValue(t.scaleX, { kind: 'layer', layerId: layer.id, param: 'scale' }, overrides);
  const scaleBoth = clamp(scaleX, 0, 4);

  const transform: Transform = {
    x: clamp(resolveValue(t.x, { kind: 'layer', layerId: layer.id, param: 'x' }, overrides), -1.5, 1.5),
    y: clamp(resolveValue(t.y, { kind: 'layer', layerId: layer.id, param: 'y' }, overrides), -1.5, 1.5),
    scaleX: scaleBoth,
    scaleY: clamp(resolveValue(t.scaleY, { kind: 'layer', layerId: layer.id, param: 'scale' }, overrides), 0, 4),
    rotation: resolveValue(t.rotation, { kind: 'layer', layerId: layer.id, param: 'rotation' }, overrides),
    anchorX: t.anchorX,
    anchorY: t.anchorY,
  };

  const params: LayerParams = {
    brightness: clamp(
      resolveValue(p.brightness, { kind: 'layer', layerId: layer.id, param: 'brightness' }, overrides),
      0,
      3,
    ),
    contrast: clamp(
      resolveValue(p.contrast, { kind: 'layer', layerId: layer.id, param: 'contrast' }, overrides),
      0,
      3,
    ),
    saturation: clamp(
      resolveValue(p.saturation, { kind: 'layer', layerId: layer.id, param: 'saturation' }, overrides),
      0,
      3,
    ),
    hue: resolveValue(p.hue, { kind: 'layer', layerId: layer.id, param: 'hue' }, overrides),
    speed: clamp(resolveValue(p.speed, { kind: 'layer', layerId: layer.id, param: 'speed' }, overrides), 0, 8),
    blur: clamp(resolveValue(p.blur, { kind: 'layer', layerId: layer.id, param: 'blur' }, overrides), 0, 1),
  };

  const effectParams: Record<string, Record<string, number>> = {};
  for (const fx of layer.effects) {
    const resolved: Record<string, number> = { ...fx.params };
    for (const key of Object.keys(resolved)) {
      resolved[key] = resolveValue(
        resolved[key],
        { kind: 'effect', layerId: layer.id, effectId: fx.id, param: key },
        overrides,
      );
    }
    effectParams[fx.id] = resolved;
  }

  return {
    opacity: clamp(
      resolveValue(layer.opacity, { kind: 'layer', layerId: layer.id, param: 'opacity' }, overrides),
      0,
      1,
    ),
    params,
    transform,
    effectParams,
  };
}

export function visibleLayers(layers: Layer[]): Layer[] {
  const anySolo = layers.some((l) => l.solo);
  return layers.filter((l) => l.visible && (!anySolo || l.solo));
}

export function buildRenderStates(
  project: ProjectData,
  overrides: Overrides,
  getTexture: (clip: Clip) => WebGLTexture | null,
): LayerRenderState[] {
  const layers = visibleLayers(project.layers);
  const states: LayerRenderState[] = [];
  for (const layer of layers) {
    const effective = resolveLayerState(layer, overrides);
    let texture: WebGLTexture | null = null;
    let mediaAspect = 16 / 9;
    const clip = layer.activeClipId
      ? project.clips.find((c) => c.id === layer.activeClipId)
      : null;
    if (clip && clip.mediaId && clip.kind !== 'audio') {
      texture = getTexture(clip);
      if (clip.width > 0 && clip.height > 0) mediaAspect = clip.width / clip.height;
    }
    states.push({
      layer,
      texture,
      mediaAspect,
      opacity: effective.opacity,
      params: effective.params,
      transform: effective.transform,
      effectParams: effective.effectParams,
    });
  }
  return states;
}

export function resolveMasterEffectParams(
  effects: { id: string; params: Record<string, number> }[],
  overrides: Overrides,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const fx of effects) {
    const resolved: Record<string, number> = { ...fx.params };
    for (const key of Object.keys(resolved)) {
      resolved[key] = resolveValue(
        resolved[key],
        { kind: 'effect', layerId: '', effectId: fx.id, param: key },
        overrides,
      );
    }
    out[fx.id] = resolved;
  }
  return out;
}

export function sourceForClip(clip: Clip): HTMLVideoElement | HTMLImageElement | null {
  return mediaEngine.getClipSource(clip);
}
