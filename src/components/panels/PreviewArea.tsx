// PREVIEW area: master canvas, aspect presets, zoom controls, CUE mini-preview.

import { useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Square as SquareIcon,
  MonitorPlay,
  PictureInPicture2,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useUIStore } from '../../store/uiStore';
import { visualEngine } from '../../canvas/engine';
import { mediaEngine } from '../../canvas/media';
import { Button, Select } from '../ui/Controls';

const ASPECT_PRESETS = [
  { label: '16:9', w: 1280, h: 720 },
  { label: '4:3', w: 1024, h: 768 },
  { label: '1:1', w: 720, h: 720 },
  { label: '9:16', w: 720, h: 1280 },
];

export function PreviewArea() {
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const cueCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const width = useProjectStore((s) => s.width);
  const height = useProjectStore((s) => s.height);
  const setResolution = useProjectStore((s) => s.setResolution);
  const previewSource = usePlaybackStore((s) => s.previewSource);
  const setPreviewSource = usePlaybackStore((s) => s.setPreviewSource);
  const previewFit = usePlaybackStore((s) => s.previewFit);
  const previewZoom = usePlaybackStore((s) => s.previewZoom);
  const setPreviewZoom = usePlaybackStore((s) => s.setPreviewZoom);
  const setPreviewFit = usePlaybackStore((s) => s.setPreviewFit);
  const cueClipId = usePlaybackStore((s) => s.cueClipId);
  const clips = useProjectStore((s) => s.clips);
  const showToast = useUIStore((s) => s.showToast);

  // canvases lifecycle
  useEffect(() => {
    const gl = glCanvasRef.current;
    const out = outputCanvasRef.current;
    const cue = cueCanvasRef.current;
    if (!gl) return;
    if (!visualEngine.renderer) {
      visualEngine.init(gl, width, height);
    }
    visualEngine.attachOutputCanvas(out);
    visualEngine.attachCueCanvas(cue);
    return () => {
      visualEngine.attachOutputCanvas(null);
      visualEngine.attachCueCanvas(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cue preview drawing (raw clip, 2D canvas)
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = cueCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const clip = cueClipId ? clips.find((c) => c.id === cueClipId) : null;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!clip || !clip.mediaId) return;
      const source = mediaEngine.getClipSource(clip);
      if (!source) return;
      try {
        const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
        const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
        if (!sw || !sh) return;
        const scale = Math.min(canvas.width / sw, canvas.height / sh);
        const w = sw * scale;
        const h = sh * scale;
        ctx.drawImage(source, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      } catch {
        /* not ready */
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cueClipId, clips]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      showToast('Fullscreen not available');
    }
  };

  const aspect = width / height;
  const zoom = previewFit ? 0 : previewZoom;

  return (
    <div className="flex flex-col h-full bg-surface-1 border border-line min-h-0">
      <header className="flex items-center justify-between h-7 px-2 bg-surface-3 border-b border-line shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <span className="text-2xs font-semibold tracking-[0.14em] text-txt-mid uppercase">Preview</span>
          <div className="flex ml-1">
            <Button
              size="xs"
              variant={previewSource === 'output' ? 'primary' : 'default'}
              onClick={() => setPreviewSource('output')}
              title="Show master output"
            >
              <MonitorPlay size={11} /> OUTPUT
            </Button>
            <Button
              size="xs"
              variant={previewSource === 'cue' ? 'primary' : 'default'}
              onClick={() => setPreviewSource('cue')}
              title="Show cued clip"
            >
              <PictureInPicture2 size={11} /> CUE
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {ASPECT_PRESETS.map((p) => (
            <Button
              key={p.label}
              size="xs"
              active={width === p.w && height === p.h}
              title={`Output ${p.w}×${p.h}`}
              onClick={() => setResolution(p.w, p.h)}
            >
              {p.label}
            </Button>
          ))}
          <Select
            title="Output resolution"
            value={`${width}x${height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              if (w && h) setResolution(w, h);
            }}
            className="w-[110px]"
          >
            {[
              [width, height],
              [1920, 1080],
              [1280, 720],
              [1024, 768],
              [720, 720],
              [720, 1280],
              [3840, 2160],
            ]
              .filter((v, i, a) => a.findIndex((x) => x[0] === v[0] && x[1] === v[1]) === i)
              .map(([w, h]) => (
                <option key={`${w}x${h}`} value={`${w}x${h}`}>
                  {w}×{h}
                </option>
              ))}
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button size="xs" active={previewFit} onClick={() => setPreviewFit(true)} title="Fit preview">
            FIT
          </Button>
          <Button
            size="xs"
            active={!previewFit && previewZoom === 1}
            onClick={() => setPreviewZoom(1)}
            title="100% zoom"
          >
            100%
          </Button>
          <Button size="xs" onClick={() => setPreviewZoom(Math.max(0.25, (previewFit ? 1 : previewZoom) - 0.25))} title="Zoom out">
            <ZoomOut size={11} />
          </Button>
          <Button size="xs" onClick={() => setPreviewZoom((previewFit ? 1 : previewZoom) + 0.25)} title="Zoom in">
            <ZoomIn size={11} />
          </Button>
          <Button size="xs" onClick={toggleFullscreen} title="Fullscreen preview (Esc to exit)">
            {document.fullscreenElement ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </Button>
        </div>
      </header>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden relative"
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
      >
        {/* master canvas */}
        <div
          style={{
            aspectRatio: `${aspect}`,
            width: zoom > 0 ? `${zoom * 100}%` : 'auto',
            height: zoom > 0 ? 'auto' : '94%',
            maxWidth: zoom > 0 ? 'none' : '98%',
            maxHeight: zoom > 0 ? 'none' : '98%',
            transform: zoom > 1 ? `scale(${zoom})` : undefined,
            transition: 'width 0.15s, height 0.15s',
          }}
          className="relative border border-line/60"
        >
          <canvas
            ref={glCanvasRef}
            className="w-full h-full block"
            style={{ imageRendering: zoom > 1.5 ? 'pixelated' : 'auto' }}
          />
          {/* hidden output copy target */}
          <canvas ref={outputCanvasRef} className="hidden" />
          {previewSource === 'cue' && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
              <canvas ref={cueCanvasRef} width={960} height={540} className="w-full h-full object-contain" />
              <div className="absolute top-2 left-2 bg-surface-0/80 border border-accent/60 text-accent text-2xs px-2 py-0.5 font-mono">
                CUE — {clips.find((c) => c.id === cueClipId)?.name ?? 'no clip selected'}
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  size="xs"
                  variant="accent"
                  onClick={() => {
                    setPreviewSource('output');
                  }}
                >
                  VIEW OUTPUT
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* status overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none">
          <div className="bg-black/70 border border-line text-txt-mid text-2xs font-mono px-2 py-0.5">
            {width}×{height} · {aspect.toFixed(2)}
          </div>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button
            size="xs"
            variant={visualEngine.isOutputWindowOpen() ? 'primary' : 'default'}
            onClick={() => {
              if (visualEngine.isOutputWindowOpen()) {
                visualEngine.closeOutputWindow();
                usePlaybackStore.getState().setOutputWindow(false);
              } else {
                const ok = visualEngine.openOutputWindow();
                usePlaybackStore.getState().setOutputWindow(ok);
                if (!ok) showToast('Popup blocked — allow popups for OUTPUT window');
              }
            }}
            title="Open OUTPUT in separate window"
          >
            <SquareIcon size={10} /> OUTPUT WIN
          </Button>
        </div>
      </div>
    </div>
  );
}
