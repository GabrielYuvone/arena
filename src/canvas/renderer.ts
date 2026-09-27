// WebGL render pipeline: layers → transforms → effects → blend → master → screen.
// Shaders live in src/shaders/*, effect registry in src/effects/registry.ts.

import { GLCore, type FBO, type Program } from './gl';
import { compose, rotation as rotM, scaling, translation } from '../utils/matrix';
import type { EffectInstance, Layer, LayerParams, Transform } from '../types';
import { EFFECT_SHADERS } from '../effects/registry';

import quadVert from '../shaders/quad.vert?raw';
import transformVert from '../shaders/transform.vert?raw';
import passthroughFrag from '../shaders/passthrough.frag?raw';
import blendFrag from '../shaders/blend.frag?raw';
import colorFrag from '../shaders/color.frag?raw';
import masterFrag from '../shaders/master.frag?raw';
import feedbackFrag from '../shaders/effects/feedback.frag?raw';
import blurFrag from '../shaders/effects/blur.frag?raw';

const BLEND_INDEX: Record<string, number> = {
  normal: 0,
  add: 1,
  screen: 2,
  multiply: 3,
  overlay: 4,
  difference: 5,
  lighten: 6,
  darken: 7,
};

export interface LayerRenderState {
  layer: Layer;
  texture: WebGLTexture | null;
  mediaAspect: number;
  opacity: number;
  params: LayerParams;
  transform: Transform;
  /** extra per-effect resolved params (effectId -> params) */
  effectParams: Record<string, Record<string, number>>;
}

export interface RenderInput {
  layers: LayerRenderState[]; // bottom → top
  masterEffects: EffectInstance[];
  masterEffectParams: Record<string, Record<string, number>>;
  masterOpacity: number;
  masterBrightness: number;
  time: number;
}

export class Renderer {
  core: GLCore;
  private width = 1280;
  private height = 720;

  private comp: [FBO, FBO];
  private compIndex = 0;
  private scratch: [FBO, FBO];
  private scratchIndex = 0;
  private layerFBO: FBO;
  private temporalFBOs = new Map<string, [FBO, FBO]>();
  private temporalIndex = new Map<string, number>();

  private progTransform: Program;
  private progBlend: Program;
  private progColor: Program;
  private progMaster: Program;
  private progFeedback: Program;
  private progBlur: Program;
  private effectProgs = new Map<string, Program>();

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.core = new GLCore(canvas);
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;

    this.comp = [
      this.core.createFBO(width, height),
      this.core.createFBO(width, height),
    ];
    this.scratch = [
      this.core.createFBO(width, height),
      this.core.createFBO(width, height),
    ];
    this.layerFBO = this.core.createFBO(width, height);

    this.progTransform = this.core.compile('transform', transformVert, passthroughFrag);
    this.progBlend = this.core.compile('blend', quadVert, blendFrag);
    this.progColor = this.core.compile('color', quadVert, colorFrag);
    this.progMaster = this.core.compile('master', quadVert, masterFrag);
    this.progFeedback = this.core.compile('feedback', quadVert, feedbackFrag);
    this.progBlur = this.core.compile('blur', quadVert, blurFrag);
  }

  setSize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    const canvas = this.core.gl.canvas as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    this.core.resizeFBO(this.comp[0], width, height);
    this.core.resizeFBO(this.comp[1], width, height);
    this.core.resizeFBO(this.scratch[0], width, height);
    this.core.resizeFBO(this.scratch[1], width, height);
    this.core.resizeFBO(this.layerFBO, width, height);
    this.temporalFBOs.forEach(([a, b]) => {
      this.core.resizeFBO(a, width, height);
      this.core.resizeFBO(b, width, height);
    });
  }

  /** Upload a video/image element into a cached texture. */
  updateTexture(tex: WebGLTexture, source: TexImageSource): void {
    const gl = this.core.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  createTexture(): WebGLTexture {
    return this.core.createTexture(2, 2);
  }

  private getEffectProgram(type: string): Program {
    let prog = this.effectProgs.get(type);
    if (!prog) {
      const frag = EFFECT_SHADERS[type] ?? passthroughFrag;
      prog = this.core.compile(`fx_${type}`, quadVert, frag);
      this.effectProgs.set(type, prog);
    }
    return prog;
  }

  private setEffectUniforms(
    prog: Program,
    params: Record<string, number>,
    time: number,
  ): void {
    const u = prog.uniforms;
    if (u.u_intensity) {
      this.core.gl.uniform1f(u.u_intensity, params.intensity ?? params.amount ?? 1);
    }
    if (u.u_time) this.core.gl.uniform1f(u.u_time, time);
    if (u.u_resolution) {
      this.core.gl.uniform2f(u.u_resolution, this.width, this.height);
    }
    for (const key of Object.keys(params)) {
      const loc = u[`u_${key}`];
      if (loc) this.core.gl.uniform1f(loc, params[key]);
    }
  }

  private temporalBuffers(id: string): [FBO, FBO] {
    let pair = this.temporalFBOs.get(id);
    if (!pair) {
      pair = [this.core.createFBO(this.width, this.height), this.core.createFBO(this.width, this.height)];
      this.temporalFBOs.set(id, pair);
      // clear both to transparent black (keeps layer alpha semantics)
      for (const fbo of pair) {
        this.core.bindFBO(fbo);
        this.core.clear(0, 0, 0, 0);
      }
      this.temporalIndex.set(id, 0);
    }
    return pair;
  }

  /**
   * Apply an effect chain to `input`.
   * Returns the texture holding the result (one of the scratch FBOs).
   */
  private applyChain(
    input: WebGLTexture,
    effects: EffectInstance[],
    effectParams: Record<string, Record<string, number>>,
    time: number,
  ): WebGLTexture {
    let current = input;
    for (const fx of effects) {
      if (!fx.enabled || fx.bypass) continue;
      const params = effectParams[fx.id] ?? fx.params;

      if (fx.type === 'feedback') {
        const pair = this.temporalBuffers(fx.id);
        const readIdx = this.temporalIndex.get(fx.id) ?? 0;
        const prev = pair[readIdx];
        const next = pair[1 - readIdx];
        this.core.bindFBO(next);
        this.core.useProgram(this.progFeedback);
        this.core.setTexture(0, current, this.progFeedback.uniforms.u_tex);
        this.core.setTexture(1, prev.texture, this.progFeedback.uniforms.u_prev);
        this.setEffectUniforms(this.progFeedback, params, time);
        this.core.drawQuad();
        this.temporalIndex.set(fx.id, 1 - readIdx);
        current = next.texture;
        continue;
      }

      const dst = this.scratch[this.scratchIndex];
      this.scratchIndex = 1 - this.scratchIndex;
      this.core.bindFBO(dst);
      const prog = this.getEffectProgram(fx.type);
      this.core.useProgram(prog);
      this.core.setTexture(0, current, prog.uniforms.u_tex);
      this.setEffectUniforms(prog, params, time);
      this.core.drawQuad();
      current = dst.texture;
    }
    return current;
  }

  private renderLayer(state: LayerRenderState, time: number): WebGLTexture | null {
    const { layer, texture, mediaAspect, params, transform } = state;
    this.core.bindFBO(this.layerFBO);
    this.core.clear(0, 0, 0, 0);

    if (texture) {
      const compAspect = this.width / this.height;
      let fw: number;
      let fh: number;
      if (mediaAspect > compAspect) {
        fw = 2;
        fh = (2 * compAspect) / mediaAspect;
      } else {
        fh = 2;
        fw = (2 * mediaAspect) / compAspect;
      }
      // M = T(x,y) · R · S_user · S_base · T(-anchorOffset)
      const anchorOffsetX = transform.anchorX * 2 - 1;
      const anchorOffsetY = transform.anchorY * 2 - 1;
      const matrix = compose(
        translation(transform.x, transform.y),
        rotM((transform.rotation * Math.PI) / 180),
        scaling(transform.scaleX, transform.scaleY),
        scaling(fw / 2, fh / 2),
        translation(-anchorOffsetX, -anchorOffsetY),
      );
      this.core.useProgram(this.progTransform);
      this.core.gl.uniformMatrix3fv(
        this.progTransform.uniforms.u_matrix,
        false,
        matrix,
      );
      this.core.setTexture(0, texture, this.progTransform.uniforms.u_tex);
      this.core.drawQuad();
    }

    // Color adjustments as one pass
    const needColor =
      params.brightness !== 1 ||
      params.contrast !== 1 ||
      params.saturation !== 1 ||
      params.hue !== 0;
    let current: WebGLTexture = this.layerFBO.texture;
    if (needColor) {
      const dst = this.scratch[this.scratchIndex];
      this.scratchIndex = 1 - this.scratchIndex;
      this.core.bindFBO(dst);
      this.core.useProgram(this.progColor);
      this.core.setTexture(0, current, this.progColor.uniforms.u_tex);
      this.core.gl.uniform1f(this.progColor.uniforms.u_brightness, params.brightness);
      this.core.gl.uniform1f(this.progColor.uniforms.u_contrast, params.contrast);
      this.core.gl.uniform1f(this.progColor.uniforms.u_saturation, params.saturation);
      this.core.gl.uniform1f(this.progColor.uniforms.u_hue, params.hue);
      this.core.drawQuad();
      current = dst.texture;
    }

    // Layer blur param
    if (params.blur > 0.001) {
      const dst = this.scratch[this.scratchIndex];
      this.scratchIndex = 1 - this.scratchIndex;
      this.core.bindFBO(dst);
      this.core.useProgram(this.progBlur);
      this.core.setTexture(0, current, this.progBlur.uniforms.u_tex);
      this.setEffectUniforms(this.progBlur, { intensity: params.blur }, time);
      this.core.drawQuad();
      current = dst.texture;
    }

    // Effect chain (with resolved params)
    return this.applyChain(current, layer.effects, state.effectParams, time);
  }

  render(input: RenderInput): void {
    const { layers, masterEffects, masterEffectParams, masterOpacity, masterBrightness, time } = input;

    // 1. accumulate layers bottom → top
    this.compIndex = 0;
    this.core.bindFBO(this.comp[this.compIndex]);
    this.core.clear(0, 0, 0, 1);

    for (const state of layers) {
      const processed = this.renderLayer(state, time);
      if (!processed) continue;
      const under = this.comp[this.compIndex];
      const dst = this.comp[1 - this.compIndex];
      this.core.bindFBO(dst);
      this.core.useProgram(this.progBlend);
      this.core.setTexture(0, under.texture, this.progBlend.uniforms.u_under);
      this.core.setTexture(1, processed, this.progBlend.uniforms.u_over);
      this.core.gl.uniform1f(this.progBlend.uniforms.u_opacity, state.opacity);
      this.core.gl.uniform1i(
        this.progBlend.uniforms.u_blend,
        BLEND_INDEX[state.layer.blendMode] ?? 0,
      );
      this.core.drawQuad();
      this.compIndex = 1 - this.compIndex;
    }

    // 2. master effect chain
    let current = this.comp[this.compIndex].texture;
    current = this.applyChain(current, masterEffects, masterEffectParams, time);

    // 3. final pass to screen
    this.core.bindFBO(null);
    this.core.useProgram(this.progMaster);
    this.core.setTexture(0, current, this.progMaster.uniforms.u_tex);
    this.core.gl.uniform1f(this.progMaster.uniforms.u_opacity, masterOpacity);
    this.core.gl.uniform1f(this.progMaster.uniforms.u_brightness, masterBrightness);
    this.core.drawQuad();
  }
}
