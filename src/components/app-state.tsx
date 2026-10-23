"use client";

// Local-first store. The state lives in localStorage and nowhere else: no server,
// no account. useSyncExternalStore keeps every component in step, including other
// tabs. The server snapshot is the empty default, so the first client render
// matches the server HTML; `useHydrated` lets a view wait for the real data.

import { useCallback, useSyncExternalStore } from "react";
import { defaultState, normalizeState, STORAGE_KEY, type AppState } from "@/lib/state";

const SERVER_SNAPSHOT = defaultState();

let current: AppState = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) current = normalizeState(JSON.parse(raw));
  } catch {
    // Storage blocked or corrupt: start empty rather than crash.
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private mode or full storage: the session still works, it just won't be saved.
  }
}

function emit(): void {
  for (const l of listeners) l();
}

function onStorage(e: StorageEvent): void {
  if (e.key !== STORAGE_KEY) return;
  try {
    current = e.newValue ? normalizeState(JSON.parse(e.newValue)) : defaultState();
  } catch {
    return;
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): AppState {
  load();
  return current;
}

function getServerSnapshot(): AppState {
  return SERVER_SNAPSHOT;
}

export type Updater = (fn: (s: AppState) => AppState) => void;

export function useAppState(): readonly [AppState, Updater] {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const update = useCallback<Updater>((fn) => {
    load();
    current = fn(current);
    persist();
    emit();
  }, []);
  return [state, update] as const;
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function replaceState(next: unknown): void {
  load();
  current = normalizeState(next);
  persist();
  emit();
}

export function resetState(): void {
  replaceState(defaultState());
}
