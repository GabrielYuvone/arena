// Main render loop: playback sync → texture upload → modulation → WebGL render.

import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { usePlaybackStore } from '../store/playbackStore';
import { visualEngine } from '../canvas/engine';
import { mediaEngine } from '../canvas/media';
import { audioEngine } from '../audio/engine';
import { midiEngine } from '../midi/engine';
import { playbackController } from '../clips/playback';
import { bpmClock } from '../utils/bpm';
import { computeOverrides, resetModSmoothing } from '../utils/modulation';
import { buildRenderStates, resolveMasterEffectParams, resolveLayerState, visibleLayers } from '../layers/resolve';
import { telemetry } from '../store/telemetry';
import { clamp } from '../utils/id';

export function useRenderLoop(): void {
  const lastTime = useRef(performance.now());
  const fpsAccum = useRef<number[]>([]);

  useEffect(() => {
    let raf = 0;
    let lastTelemetry = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = clamp((now - lastTime.current) / 1000, 0, 0.1);
      lastTime.current = now;

      const project = useProjectStore.getState();
      const playback = usePlaybackStore.getState();

      // --- FPS telemetry ---
      fpsAccum.current.push(dt);
      if (fpsAccum.current.length > 30) fpsAccum.current.shift();
      if (now - lastTelemetry > 120) {
        lastTelemetry = now;
        const avg = fpsAccum.current.reduce((a, b) => a + b, 0) / (fpsAccum.current.length || 1);
        telemetry.fps = avg > 0 ? 1 / avg : 0;
        telemetry.frameMs = avg * 1000;
        telemetry.beatPhase = bpmClock.beatPhase(now);
        telemetry.beatCount = bpmClock.beatCount(now);
      }

      // --- audio ---
      const levels = audioEngine.sample();

      // --- clip playback ---
      const activeClipIds = new Set<string>();
      project.layers.forEach((l) => {
        if (l.activeClipId) activeClipIds.add(l.activeClipId);
      });
      if (playback.cueClipId) activeClipIds.add(playback.cueClipId);

      const playing = playback.transport === 'playing';
      playbackController.syncFrame(
        project.clips,
        activeClipIds,
        playing,
        playback.reverse,
        dt,
      );

      // --- overrides (audio mods + MIDI) ---
      const overrides = computeOverrides(
        project.audioModulations,
        project.midiMappings,
        levels,
        midiEngine.snapshot(),
        (effectId) => {
          for (const l of project.layers) {
            const fx = l.effects.find((f) => f.id === effectId);
            if (fx) return fx;
          }
          return project.masterEffects.find((f) => f.id === effectId);
        },
      );

      // --- per-layer effective speed applied to video elements ---
      const layers = visibleLayers(project.layers);
      for (const layer of layers) {
        if (!layer.activeClipId) continue;
        const clip = project.clips.find((c) => c.id === layer.activeClipId);
        if (!clip) continue;
        const source = mediaEngine.getClipSource(clip);
        if (source instanceof HTMLVideoElement) {
          const eff = resolveLayerState(layer, overrides);
          const rate = clamp(clip.speed * eff.params.speed, 0.0625, 16);
          try {
            if (Math.abs(source.playbackRate - rate) > 0.001) source.playbackRate = rate;
          } catch {
            /* */
          }
          // route video audio through analyser
          if (!source.muted) audioEngine.connectVideo(source);
        }
      }

      // --- render ---
      if (visualEngine.renderer && visualEngine.glCanvas) {
        const states = buildRenderStates(project, overrides, (clip) =>
          visualEngine.getTexture(clip),
        );
        visualEngine.renderer.setSize(project.width, project.height);
        visualEngine.renderer.render({
          layers: states,
          masterEffects: project.masterEffects,
          masterEffectParams: resolveMasterEffectParams(project.masterEffects, overrides),
          masterOpacity: project.masterOpacity,
          masterBrightness: project.masterBrightness,
          time: now / 1000,
        });
        visualEngine.present();
      }

      // --- recording time ---
      if (visualEngine.isRecording()) {
        usePlaybackStore
          .getState()
          .setRecordTime((Date.now() - visualEngine.recordStart) / 1000);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // reset smoothing when project changes drastically
  useEffect(() => resetModSmoothing(), []);
}
