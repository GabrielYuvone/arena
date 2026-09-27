// SHORTCUTS modal — view and re-assign keyboard bindings.

import { useState } from 'react';
import { X, Trash2, Plus, Circle } from 'lucide-react';
import type { KeyBinding, KeyAction } from '../types';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { keyboardManager } from '../keyboard/manager';
import { Button, Panel, Select, Badge } from './ui/Controls';
import { uid } from '../utils/id';

export function ShortcutsModal() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcutsOpen);
  const keyBindings = useProjectStore((s) => s.keyBindings);
  const setKeyBinding = useProjectStore((s) => s.setKeyBinding);
  const addKeyBinding = useProjectStore((s) => s.addKeyBinding);
  const removeKeyBinding = useProjectStore((s) => s.removeKeyBinding);
  const layers = useProjectStore((s) => s.layers);
  const clips = useProjectStore((s) => s.clips);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [newAction, setNewAction] = useState<string>('');

  if (!open) return null;

  const describe = (b: KeyBinding) => b.label;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div
        className="w-[560px] max-w-full max-h-[85vh] bg-surface-2 border border-line shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between h-9 px-3 bg-surface-3 border-b border-line shrink-0">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-txt-hi uppercase">
            Keyboard Shortcuts
          </h2>
          <button className="text-txt-low hover:text-txt-hi" onClick={() => setOpen(false)}>
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {keyBindings.length === 0 && (
            <div className="text-2xs text-txt-low text-center py-6">No shortcuts defined.</div>
          )}
          {keyBindings.map((b) => (
            <div key={b.id} className="flex items-center gap-2 bg-surface-3 border border-line px-2 py-1">
              <button
                className={`w-16 h-6 flex items-center justify-center border text-2xs font-mono ${
                  recordingId === b.id
                    ? 'border-accent bg-accent/20 text-accent animate-pulse'
                    : 'border-line bg-surface-0 text-txt-hi hover:border-accent/60'
                }`}
                title="Click to re-assign key"
                onClick={() => {
                  setRecordingId(b.id);
                  keyboardManager.recordNext((key) => {
                    setKeyBinding(b.id, { key });
                    setRecordingId(null);
                  });
                }}
              >
                {recordingId === b.id ? <Circle size={9} fill="currentColor" /> : b.key === ' ' ? 'SPACE' : b.key.toUpperCase()}
              </button>
              <span className="flex-1 text-2xs text-txt-mid">{describe(b)}</span>
              <Badge>{b.action.type}</Badge>
              <button
                className="text-txt-low hover:text-red-400"
                title="Remove shortcut"
                onClick={() => removeKeyBinding(b.id)}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          <Panel title="Add shortcut" bodyClassName="p-1.5">
            <div className="flex items-center gap-1">
              <Select className="flex-1" value={newAction} onChange={(e) => setNewAction(e.target.value)}>
                <option value="">Choose action…</option>
                <optgroup label="TRANSPORT">
                  <option value="transport:playPause">Play / Pause</option>
                  <option value="transport:stop">Stop</option>
                  <option value="transport:restart">Restart</option>
                  <option value="transport:record">Toggle Recording</option>
                </optgroup>
                <optgroup label="UI">
                  <option value="toggle:performance">Performance Mode</option>
                  <option value="toggle:output">Toggle Output</option>
                  <option value="toggle:fullscreen">Fullscreen</option>
                </optgroup>
                <optgroup label="LAYERS">
                  {layers.map((l) => (
                    <option key={l.id} value={`layer:${l.id}`}>
                      Select {l.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="CLIPS">
                  {clips.slice(0, 12).map((c) => (
                    <option key={c.id} value={`clip:${c.id}`}>
                      Trigger {c.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
              <Button
                size="sm"
                variant="primary"
                disabled={!newAction}
                onClick={() => {
                  const [type, value] = newAction.split(':');
                  let action: KeyAction;
                  let label = 'Action';
                  if (type === 'transport') {
                    action = { type: 'transport', action: value as 'playPause' | 'stop' | 'restart' | 'record' };
                    label = value;
                  } else if (type === 'toggle') {
                    action = {
                      type: 'toggle',
                      action: value as 'performance' | 'output' | 'fullscreen' | 'settings',
                    };
                    label = value;
                  } else if (type === 'layer') {
                    action = { type: 'layer', layerId: value };
                    label = `Select ${layers.find((l) => l.id === value)?.name ?? 'layer'}`;
                  } else {
                    action = { type: 'clip', clipId: value };
                    label = `Trigger ${clips.find((c) => c.id === value)?.name ?? 'clip'}`;
                  }
                  const binding: KeyBinding = { id: uid('key'), key: '', action, label };
                  addKeyBinding(binding);
                  setNewAction('');
                  setRecordingId(binding.id);
                  keyboardManager.recordNext((key) => {
                    setKeyBinding(binding.id, { key });
                    setRecordingId(null);
                  });
                }}
              >
                <Plus size={11} /> ADD + RECORD KEY
              </Button>
            </div>
          </Panel>
        </div>

        <footer className="px-3 py-2 border-t border-line text-2xs text-txt-low">
          Click a key badge to re-assign it, then press the new key. Editing inputs ignores
          shortcuts. ESC exits fullscreen via the browser.
        </footer>
      </div>
    </div>
  );
}
