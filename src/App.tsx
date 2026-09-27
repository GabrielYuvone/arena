// VJ Studio — main application shell.

import { useEffect, useMemo } from 'react';
import { TopBar } from './components/TopBar';
import { ClipMatrix } from './components/panels/ClipMatrix';
import { LayerPanel } from './components/panels/LayerPanel';
import { PreviewArea } from './components/panels/PreviewArea';
import { TransportBar, PerfStatus } from './components/panels/TransportBar';
import { EffectsPanel } from './components/panels/EffectsPanel';
import { TransformPanel, LayerControls } from './components/panels/TransformPanel';
import { ClipInspector } from './components/panels/ClipInspector';
import { AudioPanel } from './components/panels/AudioPanel';
import { MidiPanel } from './components/panels/MidiPanel';
import { MediaLibrary } from './components/panels/MediaLibrary';
import { SettingsModal } from './components/SettingsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { useProjectStore } from './store/projectStore';
import { usePlaybackStore } from './store/playbackStore';
import { useUIStore, type RightTab } from './store/uiStore';
import { useRenderLoop } from './hooks/useRenderLoop';
import { keyboardManager } from './keyboard/manager';
import { midiEngine } from './midi/engine';
import { audioEngine } from './audio/engine';
import { launchClip, restartAll, stopAllLayers } from './clips/launch';
import { useToastAutoClear } from './hooks/useTelemetry';
import { visualEngine } from './canvas/engine';
import { importFiles } from './clips/import';

const RIGHT_TABS: { id: RightTab; label: string }[] = [
  { id: 'effects', label: 'FX' },
  { id: 'transform', label: 'TRF' },
  { id: 'clip', label: 'CLIP' },
  { id: 'audio', label: 'AUD' },
  { id: 'midi', label: 'MIDI' },
  { id: 'library', label: 'LIB' },
];

export default function App() {
  const accent = useProjectStore((s) => s.accentColor);
  const keyBindings = useProjectStore((s) => s.keyBindings);
  const performanceMode = useUIStore((s) => s.performanceMode);
  const rightTab = useUIStore((s) => s.rightTab);
  const setRightTab = useUIStore((s) => s.setRightTab);
  const loadProgress = useUIStore((s) => s.loadProgress);
  const toast = useUIStore((s) => s.toast);
  const showToast = useUIStore((s) => s.showToast);
  const setPerformanceMode = useUIStore((s) => s.setPerformanceMode);

  useRenderLoop();
  useToastAutoClear(toast, () => useUIStore.getState().showToast(null));

  // accent color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-dim', `${accent}55`);
  }, [accent]);

  // keyboard shortcuts
  useEffect(() => {
    keyboardManager.attach();
    return () => keyboardManager.detach();
  }, []);

  const clips = useProjectStore((s) => s.clips);
  const clipBindings = useMemo(
    () =>
      clips
        .filter((c) => c.shortcut)
        .map((c) => ({
          id: `auto_${c.id}`,
          key: c.shortcut!,
          action: { type: 'clip' as const, clipId: c.id },
          label: `Trigger ${c.name}`,
        })),
    [clips],
  );

  useEffect(() => {
    keyboardManager.setBindings([...keyBindings, ...clipBindings]);
  }, [keyBindings, clipBindings]);

  useEffect(() => {
    keyboardManager.setHandler((binding) => {
      const action = binding.action;
      switch (action.type) {
        case 'clip':
          launchClip(action.clipId);
          break;
        case 'layer':
          useUIStore.getState().selectLayer(action.layerId);
          break;
        case 'transport':
          if (action.action === 'playPause') {
            usePlaybackStore.getState().togglePlay();
            audioEngine.ensure();
          } else if (action.action === 'stop') {
            stopAllLayers();
            usePlaybackStore.getState().stop();
          } else if (action.action === 'restart') {
            restartAll();
          } else if (action.action === 'record') {
            if (visualEngine.isRecording()) {
              visualEngine.stopRecording();
              usePlaybackStore.getState().setRecord(false);
            } else {
              const ok = visualEngine.startRecording(useProjectStore.getState().fps);
              usePlaybackStore.getState().setRecord(ok);
            }
          }
          break;
        case 'toggle':
          if (action.action === 'performance') setPerformanceMode(!useUIStore.getState().performanceMode);
          if (action.action === 'output') {
            if (visualEngine.isOutputWindowOpen()) {
              visualEngine.closeOutputWindow();
              usePlaybackStore.getState().setOutputWindow(false);
            } else {
              const ok = visualEngine.openOutputWindow();
              usePlaybackStore.getState().setOutputWindow(ok);
              if (!ok) showToast('Popup blocked — allow popups for OUTPUT window');
            }
          }
          if (action.action === 'fullscreen') {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen().catch(() => undefined);
          }
          if (action.action === 'settings') useUIStore.getState().setSettingsOpen(true);
          break;
        case 'master':
          break;
      }
    });
  }, [setPerformanceMode, showToast]);

  // MIDI engine init
  useEffect(() => {
    void midiEngine.init();
    return () => midiEngine.dispose();
  }, []);

  // global drag & drop import (empty areas)
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.defaultPrevented) return;
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        void importFiles(e.dataTransfer.files);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const rightContent = useMemo(() => {
    switch (rightTab) {
      case 'effects':
        return (
          <>
            <EffectsPanel />
            <LayerControls />
          </>
        );
      case 'transform':
        return <TransformPanel />;
      case 'clip':
        return <ClipInspector />;
      case 'audio':
        return <AudioPanel />;
      case 'midi':
        return <MidiPanel />;
      case 'library':
        return <MediaLibrary />;
    }
  }, [rightTab]);

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-0 text-txt-hi font-ui overflow-hidden">
      <TopBar />

      <div className="flex-1 flex min-h-0">
        {/* LEFT — layers + audio */}
        {!performanceMode && (
          <aside className="w-60 shrink-0 flex flex-col gap-1 p-1 bg-surface-1 border-r border-line overflow-y-auto">
            <LayerPanel />
            <div className="min-h-[180px] flex-1">
              <AudioPanel />
            </div>
          </aside>
        )}

        {/* CENTER — preview + clips + transport */}
        <main className="flex-1 flex flex-col gap-1 p-1 min-w-0">
          {performanceMode && (
            <div className="flex items-center justify-between h-7 px-2 bg-surface-2 border border-line">
              <PerfStatus />
              <button
                className="text-2xs text-accent hover:underline"
                onClick={() => setPerformanceMode(false)}
              >
                EXIT PERF MODE
              </button>
            </div>
          )}
          <div className={performanceMode ? 'flex-[2] min-h-0' : 'flex-[3] min-h-0'}>
            <PreviewArea />
          </div>
          <div className={performanceMode ? 'flex-[3] min-h-0' : 'flex-[2] min-h-0'}>
            <ClipMatrix />
          </div>
          <TransportBar />
        </main>

        {/* RIGHT — inspector tabs */}
        {!performanceMode && (
          <aside className="w-72 shrink-0 flex flex-col gap-1 p-1 bg-surface-1 border-l border-line overflow-hidden">
            <div className="flex items-center gap-0.5 bg-surface-2 border border-line p-0.5">
              {RIGHT_TABS.map((t) => (
                <button
                  key={t.id}
                  className={`flex-1 h-6 text-2xs font-semibold tracking-wider transition-colors ${
                    rightTab === t.id
                      ? 'bg-accent text-surface-0'
                      : 'text-txt-low hover:text-txt-hi hover:bg-surface-4'
                  }`}
                  onClick={() => setRightTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">{rightContent}</div>
          </aside>
        )}
      </div>

      {/* load progress */}
      {loadProgress.active && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-80 bg-surface-2 border border-accent/60 shadow-2xl">
          <div className="px-2 py-1 text-2xs text-txt-mid">{loadProgress.label}</div>
          <div className="h-1 bg-surface-0">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.round(loadProgress.value * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-surface-3 border border-line px-3 py-1.5 text-xs text-txt-hi shadow-2xl">
          {toast}
        </div>
      )}

      <SettingsModal />
      <ShortcutsModal />
    </div>
  );
}
