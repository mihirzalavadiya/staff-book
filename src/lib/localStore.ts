/**
 * Tiny localStorage-backed store for per-device preferences, consumed with
 * useSyncExternalStore so the server snapshot never mismatches on hydration.
 */
export function createLocalStore<T extends string>(key: string, fallback: T, isValid: (v: string) => v is T) {
  const listeners = new Set<() => void>();
  let cached: T | null = null;

  function read(): T {
    if (cached !== null) return cached;
    try {
      const raw = localStorage.getItem(key);
      cached = raw !== null && isValid(raw) ? raw : fallback;
    } catch {
      cached = fallback;
    }
    return cached;
  }

  return {
    get: read,
    getServer: () => fallback,
    set(next: T) {
      cached = next;
      try {
        localStorage.setItem(key, next);
      } catch {
        /* storage unavailable */
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cached = null;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}
