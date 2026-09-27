// CLIP MATRIX — columns × rows grid with thumbnails, launch, drag & drop, context menu.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Square, Plus, Trash2, Copy, Pencil, X, Film, Image as ImageIcon, Music, Upload } from 'lucide-react';
import type { Clip } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useUIStore } from '../../store/uiStore';
import { useTelemetryTick } from '../../hooks/useTelemetry';
import { telemetry } from '../../store/telemetry';
import { launchClip } from '../../clips/launch';
import { importFiles, attachMediaToClip, attachMediaToNewSlot } from '../../clips/import';
import { formatTime, clamp } from '../../utils/id';

export function ClipMatrix() {
  const columns = useProjectStore((s) => s.columns);
  const rows = useProjectStore((s) => s.rows);
  const clips = useProjectStore((s) => s.clips);
  const setGrid = useProjectStore((s) => s.setGrid);
  useTelemetryTick(120);

  const cells: React.ReactNode[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const clip = clips.find((c) => c.column === col && c.row === row) ?? null;
      cells.push(<ClipCell key={`${col}:${row}`} clip={clip} column={col} row={row} />);
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-1 border border-line">
      <header className="flex items-center justify-between h-6 px-2 bg-surface-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-2xs font-semibold tracking-[0.14em] text-txt-mid uppercase">Clip Matrix</h2>
          <span className="text-2xs text-txt-low">
            {clips.filter((c) => c.mediaId).length} clips · {columns}×{rows}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="text-2xs text-txt-low hover:text-accent px-1"
            onClick={() => setGrid(clamp(columns - 1, 1, 12), rows)}
            title="Remove column"
          >
            C−
          </button>
          <button
            className="text-2xs text-txt-low hover:text-accent px-1"
            onClick={() => setGrid(clamp(columns + 1, 1, 12), rows)}
            title="Add column"
          >
            C+
          </button>
          <button
            className="text-2xs text-txt-low hover:text-accent px-1"
            onClick={() => setGrid(columns, clamp(rows - 1, 1, 12))}
            title="Remove row"
          >
            R−
          </button>
          <button
            className="text-2xs text-txt-low hover:text-accent px-1"
            onClick={() => setGrid(columns, clamp(rows + 1, 1, 12))}
            title="Add row"
          >
            R+
          </button>
        </div>
      </header>
      <div
        className="flex-1 overflow-auto p-1.5"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(96px, 1fr))`,
          gridAutoRows: 'minmax(64px, 1fr)',
          gap: '4px',
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) e.preventDefault();
        }}
        onDrop={(e) => {
          if (e.dataTransfer.files.length > 0) {
            e.preventDefault();
            void importFiles(e.dataTransfer.files);
          }
        }}
      >
        {cells}
      </div>
    </div>
  );
}

function ClipCell({ clip, column, row }: { clip: Clip | null; column: number; row: number }) {
  const updateClip = useProjectStore((s) => s.updateClip);
  const removeClip = useProjectStore((s) => s.removeClip);
  const duplicateClip = useProjectStore((s) => s.duplicateClip);
  const selectClip = useUIStore((s) => s.selectClip);
  const setCueClip = usePlaybackStore((s) => s.setCueClip);
  const setRenaming = useUIStore((s) => s.setRenamingClipId);
  const renaming = useUIStore((s) => s.renamingClipId === clip?.id);
  const selected = useUIStore((s) => s.selectedClipId === clip?.id);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  const status = clip ? telemetry.clipStatus.get(clip.id) ?? 'stopped' : 'stopped';
  const isPlaying = status === 'playing';

  const handleClick = () => {
    if (!clip) return;
    selectClip(clip.id);
    setCueClip(clip.id);
    if (clip.mediaId) launchClip(clip.id);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        void importFiles(files, clip?.id);
        return;
      }
      const mediaId = e.dataTransfer.getData('application/x-vj-media');
      if (mediaId) {
        if (clip) attachMediaToClip(mediaId, clip.id);
        else attachMediaToNewSlot(mediaId, column, row);
        return;
      }
      const movingId = e.dataTransfer.getData('application/x-vj-clip');
      if (movingId) {
        useProjectStore.getState().moveClip(movingId, column, row);
      }
    },
    [clip, column, row],
  );

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  return (
    <div
      ref={cellRef}
      className={`relative border transition-colors overflow-hidden group ${
        selected ? 'border-accent' : isPlaying ? 'border-accent/60' : 'border-line'
      } ${dropActive ? 'border-accent bg-accent/10' : ''} ${clip ? 'cursor-pointer' : 'bg-surface-2'}`}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (clip) setMenu({ x: e.clientX, y: e.clientY });
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleDrop}
      draggable={!!clip}
      onDragStart={(e) => {
        if (clip) e.dataTransfer.setData('application/x-vj-clip', clip.id);
      }}
    >
      {clip?.thumbnail && (
        <img
          src={clip.thumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 pointer-events-none"
          draggable={false}
        />
      )}
      {clip && !clip.thumbnail && (
        <div className="absolute inset-0 flex items-center justify-center text-txt-low pointer-events-none">
          {clip.kind === 'audio' ? <Music size={18} /> : clip.kind ? <Film size={18} /> : <Plus size={18} />}
        </div>
      )}

      {/* playing indicator */}
      {isPlaying && (
        <div className="absolute top-1 left-1 w-2 h-2 bg-accent animate-pulse shadow-[0_0_6px_var(--accent)]" />
      )}
      {status === 'ended' && <div className="absolute top-1 left-1 w-2 h-2 bg-amber-400" />}

      {/* shortcut */}
      {clip?.shortcut && (
        <div className="absolute top-0.5 right-0.5 bg-surface-0/80 text-txt-hi text-2xs font-mono px-1 border border-line">
          {clip.shortcut.toUpperCase()}
        </div>
      )}

      {/* label */}
      {clip && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-1 pb-0.5 pt-2 pointer-events-none">
          {renaming ? (
            <input
              autoFocus
              className="w-full bg-surface-0 border border-accent text-txt-hi text-2xs px-1 outline-none pointer-events-auto"
              defaultValue={clip.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                updateClip(clip.id, { name: e.target.value || clip.name });
                setRenaming(null);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  updateClip(clip.id, { name: (e.target as HTMLInputElement).value || clip.name });
                  setRenaming(null);
                }
                if (e.key === 'Escape') setRenaming(null);
              }}
            />
          ) : (
            <div className="text-2xs text-txt-hi truncate leading-tight">{clip.name}</div>
          )}
          <div className="flex items-center justify-between text-2xs text-txt-low font-mono">
            <span>{clip.kind ?? '—'}</span>
            <span>{clip.duration > 0 ? formatTime(clip.duration) : clip.mediaId ? 'img' : 'empty'}</span>
          </div>
        </div>
      )}

      {/* hover actions */}
      {clip && (
        <div className="absolute top-0 right-0 hidden group-hover:flex gap-0.5 p-0.5">
          <button
            className="w-5 h-5 flex items-center justify-center bg-surface-0/90 border border-line text-txt-mid hover:text-accent"
            title="Duplicate clip"
            onClick={(e) => {
              e.stopPropagation();
              duplicateClip(clip.id);
            }}
          >
            <Copy size={11} />
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center bg-surface-0/90 border border-line text-txt-mid hover:text-red-400"
            title="Delete clip"
            onClick={(e) => {
              e.stopPropagation();
              removeClip(clip.id);
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* empty state */}
      {!clip && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-100 pointer-events-none">
          <Plus size={16} className="text-txt-low" />
        </div>
      )}

      {/* context menu */}
      {menu && clip && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              icon: isPlaying ? <Square size={11} /> : <Play size={11} />,
              label: isPlaying ? 'Stop on layer' : 'Launch to layer',
              action: () => launchClip(clip.id),
            },
            { icon: <Pencil size={11} />, label: 'Rename', action: () => setRenaming(clip.id) },
            { icon: <Copy size={11} />, label: 'Duplicate', action: () => duplicateClip(clip.id) },
            {
              icon: <Upload size={11} />,
              label: 'Replace media…',
              action: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*,image/*,audio/*';
                input.onchange = () => {
                  if (input.files?.[0]) void importFiles(input.files, clip.id);
                };
                input.click();
              },
            },
            {
              icon: <ImageIcon size={11} />,
              label: 'Clear media',
              action: () =>
                updateClip(clip.id, {
                  mediaId: null,
                  kind: null,
                  thumbnail: null,
                  duration: 0,
                  inPoint: 0,
                  outPoint: 0,
                }),
            },
            {
              icon: <Trash2 size={11} />,
              label: 'Delete clip',
              danger: true,
              action: () => removeClip(clip.id),
            },
          ]}
        />
      )}
    </div>
  );
}

function ContextMenu({
  x,
  y,
  items,
}: {
  x: number;
  y: number;
  items: { icon: React.ReactNode; label: string; action: () => void; danger?: boolean }[];
}) {
  return (
    <div
      className="fixed z-50 bg-surface-2 border border-line shadow-xl min-w-[150px] py-0.5"
      style={{ left: Math.min(x, window.innerWidth - 170), top: Math.min(y, window.innerHeight - 220) }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`w-full flex items-center gap-2 px-2 py-1 text-2xs text-left ${
            item.danger ? 'text-red-300 hover:bg-red-950' : 'text-txt-mid hover:bg-surface-4 hover:text-txt-hi'
          }`}
          onClick={item.action}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ClipMatrixToolbar() {
  return (
    <div className="flex items-center gap-1">
      <X size={10} className="text-txt-low" />
    </div>
  );
}
