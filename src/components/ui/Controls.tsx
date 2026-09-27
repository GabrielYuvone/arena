// Small UI primitives: buttons, panel frames, selects, number inputs, badges.

import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Panel({
  title,
  children,
  right,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`flex flex-col bg-surface-2 border border-line ${className}`}>
      {title !== undefined && (
        <header className="flex items-center justify-between h-6 px-2 bg-surface-3 border-b border-line shrink-0">
          <h2 className="text-2xs font-semibold tracking-[0.14em] text-txt-mid uppercase">{title}</h2>
          {right}
        </header>
      )}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${bodyClassName}`}>{children}</div>
    </section>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  active?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'sm',
  active = false,
  className = '',
  children,
  ...rest
}: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-1 border font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-accent/60';
  const sizes = {
    xs: 'h-5 px-1.5 text-2xs',
    sm: 'h-6 px-2 text-2xs',
    md: 'h-8 px-3 text-xs',
    lg: 'h-10 px-4 text-sm',
  };
  const variants = {
    default: `border-line bg-surface-3 text-txt-mid hover:bg-surface-4 hover:text-txt-hi ${active ? 'bg-surface-5 text-accent border-accent/60' : ''}`,
    primary: `border-accent/70 bg-accent/20 text-accent hover:bg-accent/30 ${active ? 'bg-accent text-surface-0' : ''}`,
    accent: 'border-accent bg-accent text-surface-0 hover:brightness-110',
    danger: `border-red-900/80 bg-red-950/40 text-red-300 hover:bg-red-900/50 ${active ? 'bg-red-700 text-white' : ''}`,
    ghost: `border-transparent bg-transparent text-txt-low hover:text-txt-hi hover:bg-surface-3 ${active ? 'text-accent' : ''}`,
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  children,
  title,
  active = false,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; active?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-6 h-6 border transition-colors focus:outline-none ${
        active
          ? 'border-accent/70 bg-accent/20 text-accent'
          : 'border-transparent text-txt-low hover:text-txt-hi hover:bg-surface-4'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-6 bg-surface-1 border border-line text-2xs text-txt-hi px-1.5 outline-none focus:border-accent appearance-none cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = '',
  title,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  title?: string;
}) {
  return (
    <input
      type="number"
      title={title}
      value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
      className={`h-6 w-16 bg-surface-0 border border-line text-2xs text-txt-hi px-1.5 font-mono text-right outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
    />
  );
}

export function Badge({
  children,
  color = 'default',
  className = '',
}: {
  children: ReactNode;
  color?: 'default' | 'accent' | 'green' | 'red' | 'amber';
  className?: string;
}) {
  const colors = {
    default: 'bg-surface-4 text-txt-mid',
    accent: 'bg-accent/20 text-accent',
    green: 'bg-emerald-950 text-emerald-300',
    red: 'bg-red-950 text-red-300',
    amber: 'bg-amber-950 text-amber-300',
  };
  return (
    <span className={`inline-flex items-center h-4 px-1 text-2xs font-mono ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 my-2 px-2">
      <div className="flex-1 h-px bg-line" />
      {label && <span className="text-2xs text-txt-low uppercase tracking-wider">{label}</span>}
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}

export function Row({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 ${className}`}>{children}</div>
  );
}
