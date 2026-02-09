import { useCallback, useSyncExternalStore } from "react";
import { books as seedBooks, type Book } from "@/data/content";

const STORAGE_KEY = "books_data";

function getSnapshot(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return seedBooks;
}

let cachedBooks = getSnapshot();

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  cachedBooks = getSnapshot();
  listeners.forEach((cb) => cb());
}

function persist(books: Book[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) notify();
  });
}

export function useBooks() {
  const books = useSyncExternalStore(subscribe, () => cachedBooks);

  const setBooks = useCallback((updater: Book[] | ((prev: Book[]) => Book[])) => {
    const current = getSnapshot();
    const next = typeof updater === "function" ? updater(current) : updater;
    persist(next);
  }, []);

  return { books, setBooks };
}
