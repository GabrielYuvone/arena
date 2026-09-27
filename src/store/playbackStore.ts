// Playback/transport state: transport, cue, recording, output window.

import { create } from 'zustand';

export type TransportState = 'playing' | 'paused' | 'stopped';

interface PlaybackStore {
  transport: TransportState;
  reverse: boolean;
  record: boolean;
  recordTime: number;
  cueClipId: string | null;
  previewSource: 'output' | 'cue';
  outputWindow: boolean;
  outputFullscreen: boolean;
  previewZoom: number; // 0 = fit
  previewFit: boolean;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void;
  restart: () => void;
  setReverse: (v: boolean) => void;
  setRecord: (v: boolean) => void;
  setRecordTime: (t: number) => void;
  setCueClip: (clipId: string | null) => void;
  setPreviewSource: (src: 'output' | 'cue') => void;
  setOutputWindow: (v: boolean) => void;
  setOutputFullscreen: (v: boolean) => void;
  setPreviewZoom: (z: number) => void;
  setPreviewFit: (v: boolean) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  transport: 'stopped',
  reverse: false,
  record: false,
  recordTime: 0,
  cueClipId: null,
  previewSource: 'output',
  outputWindow: false,
  outputFullscreen: false,
  previewZoom: 1,
  previewFit: true,

  play: () => set({ transport: 'playing' }),
  pause: () => set({ transport: 'paused' }),
  togglePlay: () =>
    set((s) => ({ transport: s.transport === 'playing' ? 'paused' : 'playing' })),
  stop: () => set({ transport: 'stopped' }),
  restart: () => set({ transport: 'playing' }),
  setReverse: (reverse) => set({ reverse }),
  setRecord: (record) => set({ record }),
  setRecordTime: (recordTime) => set({ recordTime }),
  setCueClip: (cueClipId) => set({ cueClipId }),
  setPreviewSource: (previewSource) => set({ previewSource }),
  setOutputWindow: (outputWindow) => set({ outputWindow }),
  setOutputFullscreen: (outputFullscreen) => set({ outputFullscreen }),
  setPreviewZoom: (previewZoom) => set({ previewZoom, previewFit: false }),
  setPreviewFit: (previewFit) => set({ previewFit, previewZoom: previewFit ? 1 : 1 }),
}));
