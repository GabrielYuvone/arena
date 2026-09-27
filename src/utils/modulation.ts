// Runtime modulation: merges audio reactivity + MIDI control into parameter values.

import type { AudioModulation, EffectInstance, MidiMapping, TargetRef } from '../types';
import { targetKey, targetRange } from './params';
import { getEffectDef } from '../effects/registry';
import { clamp } from './id';

const smoothedLevels = new Map<string, number>();

export function resetModSmoothing(): void {
  smoothedLevels.clear();
}

export function smoothLevel(id: string, target: number, smoothing: number): number {
  const current = smoothedLevels.get(id) ?? target;
  const k = clamp(1 - smoothing, 0.01, 1);
  const next = current + (target - current) * k;
  smoothedLevels.set(id, next);
  return next;
}

export interface Overrides {
  /** absolute values keyed by overrideKey(target) */
  absolute: Map<string, number>;
  /** additive deltas keyed by overrideKey(target) */
  additive: Map<string, number>;
}

export function computeOverrides(
  mods: AudioModulation[],
  mappings: MidiMapping[],
  levels: { volume: number; bass: number; mid: number; treble: number },
  midiValues: Map<string, number>,
  effectLookup: (effectId: string) => EffectInstance | undefined,
): Overrides {
  const out: Overrides = { absolute: new Map(), additive: new Map() };

  // audio → additive
  for (const mod of mods) {
    if (!mod.enabled) continue;
    const raw = levels[mod.source] ?? 0;
    const level = smoothLevel(mod.id, raw, mod.smoothing);
    const key = targetKey(mod.target);
    const range = targetRange(mod.target);
    if (!range) continue;
    const delta = level * mod.amount * (range.max - range.min);
    out.additive.set(key, (out.additive.get(key) ?? 0) + delta);
  }

  // midi → absolute
  for (const mapping of mappings) {
    const key =
      mapping.type === 'cc'
        ? `cc:${mapping.channel >= 0 ? mapping.channel : 0}:${mapping.number}`
        : `note:${mapping.channel >= 0 ? mapping.channel : 0}:${mapping.number}`;
    let norm: number | undefined;
    if (mapping.channel < 0) {
      for (const [k, v] of midiValues) {
        const parts = k.split(':');
        if (parts[0] === mapping.type && Number(parts[2]) === mapping.number) {
          norm = v;
          break;
        }
      }
    } else {
      norm = midiValues.get(key);
    }
    if (norm === undefined) continue;

    const target = mapping.target;
    const tKey = targetKey(target);
    if (target.kind === 'effect') {
      const fx = effectLookup(target.effectId);
      const def = fx ? getEffectDef(fx.type) : undefined;
      const pd = def?.params.find((p) => p.key === target.param);
      const min = pd?.min ?? 0;
      const max = pd?.max ?? 1;
      out.absolute.set(tKey, min + norm * (max - min));
      continue;
    }
    const range = targetRange(target);
    if (!range) continue;
    out.absolute.set(tKey, range.min + norm * (range.max - range.min));
  }

  return out;
}

/** Resolve a numeric value for a target: base → +additive → absolute override. */
export function resolveValue(
  base: number,
  target: TargetRef,
  overrides: Overrides,
): number {
  const key = targetKey(target);
  let v = base + (overrides.additive.get(key) ?? 0);
  const abs = overrides.absolute.get(key);
  if (abs !== undefined) v = abs;
  return v;
}

export function hasOverride(target: TargetRef, overrides: Overrides): boolean {
  const key = targetKey(target);
  return overrides.absolute.has(key) || overrides.additive.has(key);
}
