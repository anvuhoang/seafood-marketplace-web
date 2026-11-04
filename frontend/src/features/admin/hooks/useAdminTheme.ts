"use client";

import { useCallback, useSyncExternalStore } from "react";

export type AdminTheme = "light" | "dark";

const STORAGE_KEY = "haisan_admin_theme";
const listeners = new Set<() => void>();

function read(): AdminTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked; fall back to the system setting.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** The admin theme: the saved choice, else the system setting. Shared by every component that uses it. */
export function useAdminTheme() {
  const theme = useSyncExternalStore<AdminTheme>(subscribe, read, () => "light");

  const setTheme = useCallback((next: AdminTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice then lasts only until the page closes.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
