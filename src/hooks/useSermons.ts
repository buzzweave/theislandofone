import { useCallback, useSyncExternalStore } from "react";
import { sermons as seedSermons, type Sermon } from "@/data/content";

const STORAGE_KEY = "sermons_data";

function getSnapshot(): Sermon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return seedSermons;
}

let cachedSermons = getSnapshot();

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  cachedSermons = getSnapshot();
  listeners.forEach((cb) => cb());
}

function persist(sermons: Sermon[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sermons));
  notify();
}

// Listen for storage events from other tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) notify();
  });
}

export function useSermons() {
  const sermons = useSyncExternalStore(subscribe, () => cachedSermons);

  const setSermons = useCallback((updater: Sermon[] | ((prev: Sermon[]) => Sermon[])) => {
    const current = getSnapshot();
    const next = typeof updater === "function" ? updater(current) : updater;
    persist(next);
  }, []);

  return { sermons, setSermons };
}
