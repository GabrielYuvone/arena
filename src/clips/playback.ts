// PlaybackController: per-clip playback state machine (loop/once/pingpong/hold,
// in/out points, speed, reverse) driven every frame from the render loop.

import type { Clip } from '../types';
import { mediaEngine } from '../canvas/media';
import { telemetry, type ClipRuntimeStatus } from '../store/telemetry';
import { clamp } from '../utils/id';

interface ClipRuntime {
  direction: 1 | -1;
  status: ClipRuntimeStatus;
  wasPlaying: boolean;
}

export class PlaybackController {
  private runtimes = new Map<string, ClipRuntime>();
  private restartTokens = new Set<string>();

  private rt(clipId: string): ClipRuntime {
    let r = this.runtimes.get(clipId);
    if (!r) {
      r = { direction: 1, status: 'stopped', wasPlaying: false };
      this.runtimes.set(clipId, r);
    }
    return r;
  }

  getStatus(clipId: string): ClipRuntimeStatus {
    return this.runtimes.get(clipId)?.status ?? 'stopped';
  }

  restart(clipIds: string[]): void {
    clipIds.forEach((id) => {
      const r = this.rt(id);
      r.direction = 1;
      r.status = 'playing';
      this.restartTokens.add(id);
    });
  }

  stopAll(): void {
    this.runtimes.forEach((r) => {
      r.status = 'stopped';
      r.direction = 1;
    });
  }

  /**
   * Advance clip playback.
   * `active` = clips currently on a visible layer or in cue preview.
   */
  syncFrame(
    clips: Clip[],
    activeClipIds: Set<string>,
    playing: boolean,
    reverse: boolean,
    dt: number,
  ): void {
    const seen = new Set<string>();
    for (const clip of clips) {
      if (!clip.mediaId || !clip.kind) continue;
      const isActive = activeClipIds.has(clip.id);
      if (!isActive) {
        const r = this.runtimes.get(clip.id);
        if (r && r.status !== 'stopped') {
          const source = mediaEngine.getClipSource(clip);
          if (source instanceof HTMLVideoElement) source.pause();
          r.status = 'stopped';
          telemetry.clipStatus.set(clip.id, 'stopped');
        }
        continue;
      }
      seen.add(clip.id);
      const r = this.rt(clip.id);
      const source = mediaEngine.getClipSource(clip);
      if (!source) continue;

      if (source instanceof HTMLImageElement) {
        r.status = playing ? 'playing' : 'paused';
        telemetry.clipStatus.set(clip.id, r.status);
        continue;
      }

      const video = source;
      const inPoint = clamp(clip.inPoint, 0, Math.max(0, (clip.duration || video.duration || 0) - 0.05));
      const outPointRaw = clip.outPoint > 0 ? clip.outPoint : video.duration || clip.duration || 0;
      const outPoint = clamp(outPointRaw, inPoint + 0.05, video.duration || outPointRaw);

      const speed = Math.max(0, clip.speed);

      // restart token
      if (this.restartTokens.has(clip.id)) {
        this.restartTokens.delete(clip.id);
        video.currentTime = inPoint;
        r.direction = 1;
      }

      // initialize once metadata ready
      if (video.readyState >= 1 && video.currentTime < inPoint - 0.01 && r.status === 'stopped') {
        video.currentTime = inPoint;
      }

      if (!playing) {
        if (!video.paused) video.pause();
        r.status = r.status === 'stopped' ? 'stopped' : 'paused';
        telemetry.clipStatus.set(clip.id, r.status);
        continue;
      }

      const prevStatus = r.status;

      const wantReverse = reverse || r.direction === -1;

      if ((wantReverse && clip.playbackMode === 'pingpong') || (wantReverse && reverse)) {
        // manual reverse stepping (HTML5 video cannot play backwards)
        if (!video.paused) video.pause();
        r.status = 'playing';
        const next = video.currentTime - dt * speed;
        if (next <= inPoint) {
          if (clip.playbackMode === 'pingpong' && !reverse) {
            r.direction = 1;
            video.currentTime = inPoint;
          } else {
            video.currentTime = inPoint;
            if (clip.playbackMode === 'once') {
              r.status = 'ended';
            } else if (clip.playbackMode === 'hold') {
              r.status = 'ended';
            } else if (clip.playbackMode === 'loop') {
              video.currentTime = outPoint - 0.01;
            }
          }
        } else {
          video.currentTime = next;
        }
      } else {
        // forward
        if (r.direction === -1 && clip.playbackMode === 'pingpong') {
          r.direction = 1;
        }
        if (prevStatus === 'ended') {
          // stay frozen on the last frame until restart/launch
          if (!video.paused) video.pause();
          r.status = 'ended';
        } else {
          r.status = 'playing';
          if (video.paused) {
            void video.play().catch(() => undefined);
          }
          if (video.playbackRate !== speed) {
            try {
              video.playbackRate = clamp(speed, 0.0625, 16);
            } catch {
              /* ignore */
            }
          }
          if (video.currentTime >= outPoint - 0.02) {
            switch (clip.playbackMode) {
              case 'loop':
                video.currentTime = inPoint;
                break;
              case 'once':
                video.pause();
                video.currentTime = outPoint;
                r.status = 'ended';
                break;
              case 'hold':
                video.pause();
                video.currentTime = outPoint;
                r.status = 'ended';
                break;
              case 'pingpong':
                r.direction = -1;
                video.currentTime = outPoint - 0.01;
                break;
            }
          }
        }
      }

      telemetry.clipStatus.set(clip.id, r.status);
    }

    // clean up stale statuses
    telemetry.clipStatus.forEach((_, id) => {
      if (!seen.has(id)) telemetry.clipStatus.delete(id);
    });
  }
}

export const playbackController = new PlaybackController();
