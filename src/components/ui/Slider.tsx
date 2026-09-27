// Compact professional slider with numeric readout, keyboard control, dbl-click reset.

import { useCallback, useRef, useState } from 'react';
import { clamp } from '../../utils/id';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  precision?: number;
  accent?: boolean;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  unit = '',
  precision = 2,
  accent = false,
  onChange,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const norm = (value - min) / (max - min || 1);
  const pct = clamp(norm, 0, 1) * 100;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const t = clamp((clientX - rect.left) / (rect.width || 1), 0, 1);
      const raw = min + t * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChange(clamp(stepped, min, max));
    },
    [min, max, step, onChange],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
    const move = (ev: PointerEvent) => setFromClientX(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const big = step * 10;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = value + (e.shiftKey ? big : step);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = value - (e.shiftKey ? big : step);
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next !== null) {
      e.preventDefault();
      onChange(clamp(next, min, max));
    }
  };

  const commitDraft = () => {
    const v = parseFloat(draft);
    if (!isNaN(v)) onChange(clamp(v, min, max));
    setEditing(false);
  };

  return (
    <div className="group select-none">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-2xs uppercase tracking-wider text-txt-low group-hover:text-txt-mid truncate pr-2">
          {label}
        </span>
        {editing ? (
          <input
            autoFocus
            className="w-14 bg-surface-0 border border-accent text-txt-hi text-2xs text-right px-1 py-0 rounded-none outline-none font-mono"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <button
            className="text-2xs font-mono text-txt-mid hover:text-accent tabular-nums"
            onClick={() => {
              setDraft(String(Number(value.toFixed(precision))));
              setEditing(true);
            }}
            title="Click to type a value"
          >
            {value.toFixed(precision)}
            {unit}
          </button>
        )}
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className="relative h-2.5 bg-surface-0 border border-line cursor-ew-resize focus:outline-none focus:border-accent"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onDoubleClick={() => onChange(defaultValue ?? ((min + max) / 2))}
        title="Drag to adjust · Double-click to reset · Arrows for fine control"
      >
        <div
          className={`absolute inset-y-0 left-0 ${accent ? 'bg-accent' : 'bg-accent/80'}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-txt-hi border border-surface-0 pointer-events-none"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
    </div>
  );
}
