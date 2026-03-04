import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage`, e);
    }
  }, [key, stored]);

  return [stored, setStored];
}

export function useLocalStorageMap<V>(key: string): [Map<string, V>, (updater: Map<string, V> | ((prev: Map<string, V>) => Map<string, V>)) => void] {
  const [stored, setStored] = useState<Map<string, V>>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const entries = JSON.parse(item) as [string, V][];
        return new Map(entries);
      }
    } catch {}
    return new Map();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(stored.entries())));
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage`, e);
    }
  }, [key, stored]);

  return [stored, setStored];
}
