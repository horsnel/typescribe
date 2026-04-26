'use client';

import { useState, useCallback } from 'react';

/**
 * Custom hook for syncing state with localStorage.
 * Uses lazy initialization to avoid the "set-state-in-effect" lint rule.
 * Handles SSR by checking for window.
 */
export function useLocalStorage<T>(key: string, fallback: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        return parsed;
      }
      // Save fallback to localStorage if key doesn't exist
      localStorage.setItem(key, JSON.stringify(fallback));
    } catch { /* ignore */ }
    return fallback;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch { /* ignore */ }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
