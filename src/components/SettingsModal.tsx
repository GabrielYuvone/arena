// SETTINGS modal — output, fps, accent color, grid, performance, storage.

import { useRef, useState } from 'react';
import { X, Trash2, Keyboard, HardDriveDownload } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { Slider } from './ui/Slider';
import { Button, Panel, Select, Row, Badge } from './ui/Controls';
import { relinkAllFromFiles } from '../project/actions';
import { deleteProject, listProjects } from '../project/db';
import type { ProjectSummary } from '../types';

const ACCENT_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#60a5fa',
  '#ffffff',
];

export function SettingsModal() {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);
  const width = useProjectStore((s) => s.width);
  const height = useProjectStore((s) => s.height);
  const fps = useProjectStore((s) => s.fps);
  const accent = useProjectStore((s) => s.accentColor);
  const columns = useProjectStore((s) => s.columns);
  const rows = useProjectStore((s) => s.rows);
  const masterOpacity = useProjectStore((s) => s.masterOpacity);
  const masterBrightness = useProjectStore((s) => s.masterBrightness);
  const setResolution = useProjectStore((s) => s.setResolution);
  const setFps = useProjectStore((s) => s.setFps);
  const setAccentColor = useProjectStore((s) => s.setAccentColor);
  const setGrid = useProjectStore((s) => s.setGrid);
  const setMaster = useProjectStore((s) => s.setMaster);
  const addEffect = useProjectStore((s) => s.addEffect);
  const masterEffects = useProjectStore((s) => s.masterEffects);
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const relinkRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div
        className="w-[640px] max-w-full max-h-[85vh] bg-surface-2 border border-line shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between h-9 px-3 bg-surface-3 border-b border-line shrink-0">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-txt-hi uppercase">Settings</h2>
          <button className="text-txt-low hover:text-txt-hi" onClick={() => setOpen(false)}>
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <Panel title="Output" bodyClassName="p-2 space-y-2">
            <Row>
              <span className="text-2xs text-txt-low w-20 uppercase">Resolution</span>
              <input
                type="number"
                className="h-6 w-20 bg-surface-0 border border-line text-2xs text-txt-hi px-1.5 font-mono text-right outline-none focus:border-accent"
                value={w}
                onChange={(e) => setW(Number(e.target.value))}
              />
              <span className="text-txt-low">×</span>
              <input
                type="number"
                className="h-6 w-20 bg-surface-0 border border-line text-2xs text-txt-hi px-1.5 font-mono text-right outline-none focus:border-accent"
                value={h}
                onChange={(e) => setH(Number(e.target.value))}
              />
              <Button size="sm" variant="primary" onClick={() => setResolution(w, h)}>
                APPLY
              </Button>
            </Row>
            <Row>
              <span className="text-2xs text-txt-low w-20 uppercase">Project FPS</span>
              <Select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-20">
                {[24, 25, 30, 50, 60, 120].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              <Badge>used for recording & smoothness target</Badge>
            </Row>
            <Row>
              <span className="text-2xs text-txt-low w-20 uppercase">Master</span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Slider label="Master Opacity" value={masterOpacity} min={0} max={1} step={0.01} defaultValue={1} onChange={(v) => setMaster({ opacity: v })} />
                <Slider label="Master Brightness" value={masterBrightness} min={0} max={2} step={0.01} defaultValue={1} onChange={(v) => setMaster({ brightness: v })} />
              </div>
            </Row>
            <Row>
              <span className="text-2xs text-txt-low w-20 uppercase">Master FX</span>
              <div className="flex flex-wrap gap-1">
                {['vignette', 'scanlines', 'feedback', 'noise', 'rgbSplit', 'grayscale'].map((t) => (
                  <Button key={t} size="xs" onClick={() => addEffect(null, t as never)} title={`Add ${t} to master chain`}>
                    + {t}
                  </Button>
                ))}
              </div>
              <Badge color={masterEffects.length ? 'accent' : 'default'}>{masterEffects.length} fx</Badge>
            </Row>
          </Panel>

          <Panel title="Interface" bodyClassName="p-2 space-y-2">
            <Row>
              <span className="text-2xs text-txt-low w-20 uppercase">Accent</span>
              <div className="flex gap-1">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 border-2 ${accent === c ? 'border-txt-hi' : 'border-transparent'}`}
                    style={{ background: c }}
                    title={c}
                    onClick={() => setAccentColor(c)}
                  />
                ))}
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-6 h-6 bg-transparent border border-line cursor-pointer"
                  title="Custom color"
                />
              </div>
            </Row>
            <Row>
              <span className="text-2xs text-txt-low w-20 uppercase">Matrix</span>
              <span className="text-2xs text-txt-mid">Columns</span>
              <Select value={columns} onChange={(e) => setGrid(Number(e.target.value), rows)} className="w-14">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <span className="text-2xs text-txt-mid">Rows</span>
              <Select value={rows} onChange={(e) => setGrid(columns, Number(e.target.value))} className="w-14">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Row>
            <Row>
              <Button size="sm" onClick={() => setShortcutsOpen(true)}>
                <Keyboard size={12} /> KEYBOARD SHORTCUTS
              </Button>
            </Row>
          </Panel>

          <Panel title="Storage & Media" bodyClassName="p-2 space-y-2">
            <Row>
              <Button
                size="sm"
                onClick={() => relinkRef.current?.click()}
                title="Re-link missing media by matching file names"
              >
                <HardDriveDownload size={12} /> RE-LINK MEDIA FILES…
              </Button>
              <input
                ref={relinkRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void relinkAllFromFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <span className="text-2xs text-txt-low">
                After importing a JSON project, media must be re-linked.
              </span>
            </Row>
            <Row>
              <Button
                size="sm"
                onClick={() => void listProjects().then(setProjects)}
                title="List saved projects"
              >
                MANAGE SAVED PROJECTS
              </Button>
            </Row>
            {projects && (
              <div className="border border-line divide-y divide-line">
                {projects.length === 0 && (
                  <div className="p-2 text-2xs text-txt-low">Nothing saved in IndexedDB yet.</div>
                )}
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-2 py-1">
                    <span className="flex-1 text-2xs text-txt-mid truncate">{p.name}</span>
                    <span className="text-2xs text-txt-low">{new Date(p.updatedAt).toLocaleString()}</span>
                    <button
                      className="text-txt-low hover:text-red-400"
                      title="Delete saved project"
                      onClick={async () => {
                        await deleteProject(p.id);
                        setProjects(await listProjects());
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="About" bodyClassName="p-2">
            <div className="text-2xs text-txt-low space-y-1">
              <div className="text-txt-mid font-semibold">VJ Studio — Visual Performance Tool</div>
              <div>Vite · React · TypeScript · Tailwind · Zustand · WebGL · Web Audio · Web MIDI</div>
              <div>
                Projects are stored locally in IndexedDB. Export produces JSON with media file
                references (no embedded media).
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
