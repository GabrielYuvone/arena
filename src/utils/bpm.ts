// BPM clock: manual BPM, tap tempo, beat/bar phase, quantization boundaries.

import type { Quantization } from '../types';
import { clamp } from './id';

export class BpmClock {
  bpm = 120;
  private anchorPerf = performance.now();
  private anchorBeat = 0;
  private taps: number[] = [];

  setBpm(bpm: number): void {
    this.syncAnchor();
    this.bpm = clamp(bpm, 20, 300);
  }

  /** Keep beat phase continuous when BPM changes. */
  syncAnchor(): void {
    const now = performance.now();
    const elapsedBeats = ((now - this.anchorPerf) / 60000) * this.bpm;
    this.anchorBeat += elapsedBeats;
    this.anchorPerf = now;
  }

  restart(): void {
    this.anchorPerf = performance.now();
    this.anchorBeat = 0;
  }

  get beatsPerSecond(): number {
    return this.bpm / 60;
  }

  get beatPeriodMs(): number {
    return 60000 / this.bpm;
  }

  /** Beats elapsed since anchor. */
  beats(now = performance.now()): number {
    return this.anchorBeat + ((now - this.anchorPerf) / 60000) * this.bpm;
  }

  beatPhase(now = performance.now()): number {
    const b = this.beats(now);
    return b - Math.floor(b);
  }

  beatCount(now = performance.now()): number {
    return Math.floor(this.beats(now));
  }

  barCount(now = performance.now()): number {
    return Math.floor(this.beats(now) / 4);
  }

  /** Tap tempo: returns current estimated BPM. */
  tap(): number {
    const now = performance.now();
    this.taps.push(now);
    if (this.taps.length > 6) this.taps.shift();
    if (this.taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.taps.length; i++) intervals.push(this.taps[i] - this.taps[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = clamp(60000 / avg, 20, 300);
      this.syncAnchor();
      this.bpm = Math.round(bpm * 10) / 10;
    }
    return this.bpm;
  }

  resetTaps(): void {
    this.taps = [];
  }

  /** ms from now until the next quantization boundary. */
  msToNextBoundary(quantization: Quantization, now = performance.now()): number {
    const beats = quantizeBeats(quantization);
    if (beats <= 0) return 0;
    const b = this.beats(now);
    const next = Math.ceil(b / beats) * beats;
    return ((next - b) / this.beatsPerSecond) * 1000;
  }
}

export function quantizeBeats(q: Quantization): number {
  switch (q) {
    case '1/4':
      return 1;
    case '1/2':
      return 2;
    case '1bar':
      return 4;
    case '2bar':
      return 8;
    case '4bar':
      return 16;
    default:
      return 0;
  }
}

export const bpmClock = new BpmClock();
