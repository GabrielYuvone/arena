// Reactively samples the telemetry singleton at a limited rate.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Re-renders at most every `intervalMs` while telemetry changes. */
export function useTelemetryTick(intervalMs = 100): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return Math.floor(Date.now() / intervalMs);
}

export function useTelemetryValue<T>(selector: () => T, intervalMs = 100): T {
  const [value, setValue] = useState<T>(selector);
  useEffect(() => {
    const id = window.setInterval(() => setValue(selector()), intervalMs);
    return () => window.clearInterval(id);
  }, [selector, intervalMs]);
  return value;
}

export function useToastAutoClear(
  toast: string | null,
  clear: () => void,
  ms = 2600,
): void {
  const clearRef = useRef(clear);
  clearRef.current = clear;
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => clearRef.current(), ms);
    return () => window.clearTimeout(id);
  }, [toast, ms]);
}

/** External store subscription helper. */
export function useStoreSubscribe(store: { subscribe: (fn: () => void) => () => void }): void {
  useSyncExternalStore(
    (fn) => store.subscribe(fn),
    () => 0,
  );
}
