// TOP BAR: project name, file ops, fps/res/status readouts, fullscreen, settings.

import { useRef, useState } from 'react';
import {
  FolderPlus,
  Save,
  FolderOpen,
  Download,
  Upload,
  Settings,
  Maximize2,
  Cpu,
  Volume2,
  Sliders,
  CopyPlus,
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUIStore } from '../store/uiStore';
import { useTelemetryTick } from '../hooks/useTelemetry';
import { telemetry } from '../store/telemetry';
import {
  newProject,
  saveCurrentProject,
  saveProjectAs,
  exportCurrentProject,
  importProjectFile,
  openProject,
} from '../project/actions';
import { listProjects } from '../project/db';
import type { ProjectSummary } from '../types';
import { Button, IconButton } from './ui/Controls';

export function TopBar() {
  const name = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);
  const width = useProjectStore((s) => s.width);
  const height = useProjectStore((s) => s.height);
  const transport = usePlaybackStore((s) => s.transport);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const showToast = useUIStore((s) => s.showToast);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [openPanel, setOpenPanel] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useTelemetryTick(250);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      showToast('Fullscreen not available');
    }
  };

  return (
    <header className="flex items-center h-9 px-2 bg-surface-2 border-b border-line gap-2 shrink-0">
      {/* brand */}
      <div className="flex items-center gap-2 pr-2 border-r border-line">
        <div className="w-5 h-5 bg-accent flex items-center justify-center text-surface-0 font-black text-2xs">
          VJ
        </div>
        <div className="leading-none">
          <div className="text-xs font-bold tracking-[0.2em] text-txt-hi">VJ STUDIO</div>
          <div className="text-2xs text-txt-low tracking-wider">VISUAL PERFORMANCE</div>
        </div>
      </div>

      {/* project name */}
      {editingName ? (
        <input
          autoFocus
          className="h-6 w-44 bg-surface-0 border border-accent text-txt-hi text-xs px-2 outline-none"
          defaultValue={name}
          onBlur={(e) => {
            setName(e.target.value || 'Untitled Project');
            setEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setName((e.target as HTMLInputElement).value || 'Untitled Project');
              setEditingName(false);
            }
            if (e.key === 'Escape') setEditingName(false);
          }}
        />
      ) : (
        <button
          className="h-6 px-2 text-xs text-txt-hi bg-surface-3 border border-line hover:border-accent/60 max-w-[180px] truncate"
          onClick={() => setEditingName(true)}
          title="Rename project"
        >
          {name}
        </button>
      )}

      {/* file ops */}
      <div className="flex items-center gap-1">
        <IconButton title="New project" onClick={newProject}>
          <FolderPlus size={14} />
        </IconButton>
        <div className="relative">
          <IconButton
            title="Open project (IndexedDB)"
            onClick={async () => {
              if (openPanel) {
                setOpenPanel(false);
                return;
              }
              setOpenPanel(true);
              setProjects(await listProjects().catch(() => []));
            }}
          >
            <FolderOpen size={14} />
          </IconButton>
          {openPanel && (
            <div className="absolute left-0 top-7 z-50 w-72 bg-surface-2 border border-line shadow-2xl">
              <div className="flex items-center justify-between px-2 h-7 border-b border-line">
                <span className="text-2xs uppercase tracking-wider text-txt-mid">Saved projects</span>
                <button className="text-txt-low hover:text-txt-hi text-2xs" onClick={() => setOpenPanel(false)}>
                  ✕
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {(projects ?? []).length === 0 && (
                  <div className="p-3 text-2xs text-txt-low">No saved projects yet.</div>
                )}
                {(projects ?? []).map((p) => (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-surface-4 text-left"
                    onClick={async () => {
                      setOpenPanel(false);
                      await openProject(p.id);
                    }}
                  >
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="w-10 h-6 object-cover border border-line" />
                    ) : (
                      <div className="w-10 h-6 bg-surface-0 border border-line" />
                    )}
                    <div className="min-w-0">
                      <div className="text-2xs text-txt-hi truncate">{p.name}</div>
                      <div className="text-2xs text-txt-low">
                        {new Date(p.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <IconButton title="Save project (IndexedDB)" onClick={() => void saveCurrentProject()}>
          <Save size={14} />
        </IconButton>
        <IconButton title="Save as new project" onClick={() => void saveProjectAs()}>
          <CopyPlus size={14} />
        </IconButton>
        <IconButton title="Export project JSON" onClick={exportCurrentProject}>
          <Download size={14} />
        </IconButton>
        <IconButton title="Import project JSON" onClick={() => fileRef.current?.click()}>
          <Upload size={14} />
        </IconButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importProjectFile(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className="flex-1" />

      {/* status readouts */}
      <div className="flex items-center gap-2 text-2xs font-mono">
        <div className="flex items-center gap-1.5 px-2 h-6 bg-surface-3 border border-line">
          <Cpu size={11} className="text-accent" />
          <span className="text-txt-low">FPS</span>
          <span className="text-accent w-7 text-right">{telemetry.fps.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 h-6 bg-surface-3 border border-line">
          <span className="text-txt-low">OUT</span>
          <span className="text-txt-hi">
            {width}×{height}
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2 h-6 border ${
            transport === 'playing'
              ? 'bg-accent/20 border-accent/60 text-accent'
              : 'bg-surface-3 border-line text-txt-mid'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${transport === 'playing' ? 'bg-accent animate-pulse' : 'bg-txt-low'}`}
          />
          {transport.toUpperCase()}
        </div>
        <div
          className={`flex items-center gap-1.5 px-2 h-6 bg-surface-3 border border-line ${
            telemetry.midiDeviceName ? 'text-emerald-400' : 'text-txt-low'
          }`}
          title={telemetry.midiDeviceName ?? 'No MIDI device'}
        >
          <Sliders size={11} />
          MIDI {telemetry.midiDeviceName ? '●' : '○'}
        </div>
        <div
          className={`flex items-center gap-1.5 px-2 h-6 bg-surface-3 border border-line ${
            telemetry.audioRunning ? 'text-emerald-400' : 'text-txt-low'
          }`}
        >
          <Volume2 size={11} />
          AUD {telemetry.audioRunning ? '●' : '○'}
        </div>
      </div>

      <div className="flex items-center gap-1 pl-1">
        <Button size="sm" variant="ghost" title="Keyboard shortcuts" onClick={() => setShortcutsOpen(true)}>
          KEYS
        </Button>
        <IconButton title="Fullscreen output (browser)" onClick={toggleFullscreen}>
          <Maximize2 size={14} />
        </IconButton>
        <IconButton title="Settings" onClick={() => setSettingsOpen(true)}>
          <Settings size={14} />
        </IconButton>
      </div>
    </header>
  );
}
