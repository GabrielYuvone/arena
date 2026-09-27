// Live telemetry: FPS, audio levels, MIDI activity, clip statuses.
// Kept outside React state to avoid re-render storms; UI samples it at ~10 Hz.

export interface AudioLevels {
  volume: number;
  bass: number;
  mid: number;
  treble: number;
}

export type ClipRuntimeStatus = 'stopped' | 'playing' | 'paused' | 'ended';

class Telemetry {
  fps = 0;
  frameMs = 0;
  levels: AudioLevels = { volume: 0, bass: 0, mid: 0, treble: 0 };
  midiActivity = 0; // timestamp of last MIDI message
  midiDeviceName: string | null = null;
  midiSupported = false;
  audioRunning = false;
  clipStatus = new Map<string, ClipRuntimeStatus>();
  recording = false;
  beatPhase = 0; // 0..1 within current beat
  beatCount = 0;
  lastFrameTime = 0;

  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const telemetry = new Telemetry();
