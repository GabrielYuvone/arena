// Clip launch with quantization + layer targeting.

import { useProjectStore } from '../store/projectStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUIStore } from '../store/uiStore';
import { bpmClock } from '../utils/bpm';
import { playbackController } from './playback';

const pending = new Map<string, number>();

export function activeTargetLayerId(): string | null {
  const ui = useUIStore.getState();
  const project = useProjectStore.getState();
  return ui.selectedLayerId ?? project.layers[project.layers.length - 1]?.id ?? null;
}

/** Launch (or toggle off) a clip on a layer, honoring quantization. */
export function launchClip(clipId: string, layerId?: string | null): void {
  const project = useProjectStore.getState();
  const layer = layerId ?? activeTargetLayerId();
  if (!layer) return;
  const layerObj = project.layers.find((l) => l.id === layer);
  if (!layerObj || layerObj.locked) return;

  const q = project.quantization;
  const delay = q === 'off' ? 0 : Math.round(bpmClock.msToNextBoundary(q));

  const run = () => {
    const st = useProjectStore.getState();
    const playback = usePlaybackStore.getState();
    const current = st.layers.find((l) => l.id === layer)?.activeClipId ?? null;
    if (current === clipId) {
      st.setLayerClip(layer, null);
    } else {
      st.setLayerClip(layer, clipId);
      if (playback.transport === 'stopped') playback.play();
    }
  };

  // quantized launches replace each other
  const key = `launch:${layer}`;
  const existing = pending.get(key);
  if (existing) window.clearTimeout(existing);
  if (delay <= 0) {
    run();
  } else {
    pending.set(
      key,
      window.setTimeout(() => {
        pending.delete(key);
        run();
      }, delay),
    );
  }
}

export function stopLayer(layerId: string): void {
  useProjectStore.getState().setLayerClip(layerId, null);
}

export function stopAllLayers(): void {
  const st = useProjectStore.getState();
  st.layers.forEach((l) => st.setLayerClip(l.id, null));
  playbackController.stopAll();
}

export function restartAll(): void {
  const st = useProjectStore.getState();
  const ids = st.layers.map((l) => l.activeClipId).filter((x): x is string => !!x);
  playbackController.restart(ids);
  usePlaybackStore.getState().play();
}
