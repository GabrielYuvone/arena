import type { EffectDef } from '../types';

import brightnessFrag from '../shaders/effects/brightness.frag?raw';
import contrastFrag from '../shaders/effects/contrast.frag?raw';
import saturationFrag from '../shaders/effects/saturation.frag?raw';
import hueFrag from '../shaders/effects/hue.frag?raw';
import blurFrag from '../shaders/effects/blur.frag?raw';
import sharpenFrag from '../shaders/effects/sharpen.frag?raw';
import pixelateFrag from '../shaders/effects/pixelate.frag?raw';
import invertFrag from '../shaders/effects/invert.frag?raw';
import grayscaleFrag from '../shaders/effects/grayscale.frag?raw';
import rgbSplitFrag from '../shaders/effects/rgbSplit.frag?raw';
import chromaticAberrationFrag from '../shaders/effects/chromaticAberration.frag?raw';
import mirrorFrag from '../shaders/effects/mirror.frag?raw';
import kaleidoscopeFrag from '../shaders/effects/kaleidoscope.frag?raw';
import feedbackFrag from '../shaders/effects/feedback.frag?raw';
import noiseFrag from '../shaders/effects/noise.frag?raw';
import scanlinesFrag from '../shaders/effects/scanlines.frag?raw';
import vignetteFrag from '../shaders/effects/vignette.frag?raw';

export const EFFECT_DEFS: EffectDef[] = [
  {
    type: 'brightness',
    name: 'Brightness',
    category: 'color',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.5 }],
  },
  {
    type: 'contrast',
    name: 'Contrast',
    category: 'color',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.5 }],
  },
  {
    type: 'saturation',
    name: 'Saturation',
    category: 'color',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.5 }],
  },
  {
    type: 'hue',
    name: 'Hue Rotate',
    category: 'color',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.5 }],
  },
  {
    type: 'blur',
    name: 'Blur',
    category: 'stylize',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.35 }],
  },
  {
    type: 'sharpen',
    name: 'Sharpen',
    category: 'stylize',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.5 }],
  },
  {
    type: 'pixelate',
    name: 'Pixelate',
    category: 'stylize',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.4 }],
  },
  {
    type: 'invert',
    name: 'Invert',
    category: 'stylize',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 1 }],
  },
  {
    type: 'grayscale',
    name: 'Grayscale',
    category: 'color',
    params: [{ key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 1 }],
  },
  {
    type: 'rgbSplit',
    name: 'RGB Split',
    category: 'distort',
    params: [
      { key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.3 },
      { key: 'angle', label: 'Angle', min: 0, max: 6.283, step: 0.01, default: 0 },
    ],
  },
  {
    type: 'chromaticAberration',
    name: 'Chromatic Aberration',
    category: 'distort',
    params: [
      { key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.4 },
      { key: 'spread', label: 'Spread', min: 0, max: 1, step: 0.01, default: 0.3 },
    ],
  },
  {
    type: 'mirror',
    name: 'Mirror',
    category: 'distort',
    params: [
      { key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 1 },
      { key: 'axis', label: 'Axis (0=X 1=Y 2=Both)', min: 0, max: 2, step: 1, default: 2 },
    ],
  },
  {
    type: 'kaleidoscope',
    name: 'Kaleidoscope',
    category: 'pattern',
    params: [
      { key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 1 },
      { key: 'segments', label: 'Segments', min: 0, max: 1, step: 0.01, default: 0.35 },
      { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, default: 0 },
    ],
  },
  {
    type: 'feedback',
    name: 'Feedback',
    category: 'time',
    temporal: true,
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.5 },
      { key: 'zoom', label: 'Zoom', min: 0.5, max: 1.5, step: 0.01, default: 1.02 },
      { key: 'rotation', label: 'Rotation', min: -10, max: 10, step: 0.1, default: 0 },
      { key: 'decay', label: 'Decay', min: 0, max: 1, step: 0.01, default: 0.85 },
    ],
  },
  {
    type: 'noise',
    name: 'Noise',
    category: 'stylize',
    params: [
      { key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.3 },
      { key: 'scale', label: 'Scale', min: 1, max: 64, step: 1, default: 4 },
    ],
  },
  {
    type: 'scanlines',
    name: 'Scanlines',
    category: 'pattern',
    params: [
      { key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.4 },
      { key: 'density', label: 'Density', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  {
    type: 'vignette',
    name: 'Vignette',
    category: 'stylize',
    params: [
      { key: 'intensity', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.5 },
      { key: 'softness', label: 'Softness', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
];

export const EFFECT_SHADERS: Record<string, string> = {
  brightness: brightnessFrag,
  contrast: contrastFrag,
  saturation: saturationFrag,
  hue: hueFrag,
  blur: blurFrag,
  sharpen: sharpenFrag,
  pixelate: pixelateFrag,
  invert: invertFrag,
  grayscale: grayscaleFrag,
  rgbSplit: rgbSplitFrag,
  chromaticAberration: chromaticAberrationFrag,
  mirror: mirrorFrag,
  kaleidoscope: kaleidoscopeFrag,
  feedback: feedbackFrag,
  noise: noiseFrag,
  scanlines: scanlinesFrag,
  vignette: vignetteFrag,
};

export function getEffectDef(type: string): EffectDef | undefined {
  return EFFECT_DEFS.find((d) => d.type === type);
}

export function defaultEffectParams(type: string): Record<string, number> {
  const def = getEffectDef(type);
  const out: Record<string, number> = {};
  def?.params.forEach((p) => {
    out[p.key] = p.default;
  });
  return out;
}

let counter = 0;
export function createEffectInstance(type: string): import('../types').EffectInstance {
  return {
    id: `fx_${Date.now().toString(36)}_${counter++}`,
    type: type as import('../types').EffectType,
    enabled: true,
    bypass: false,
    params: defaultEffectParams(type),
  };
}
