import { describe, it, expect, vi } from "vitest";
import {
  THEMES,
  THEME_STORAGE_KEY,
  isTheme,
  resolveTheme,
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  NO_FLASH_SCRIPT,
} from "@/app/lib/theme";

/** Minimal in-memory stand-in for window.localStorage. */
function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("theme", () => {
  describe("THEMES / isTheme", () => {
    it("offers light, dark, and system", () => {
      expect(THEMES).toEqual(["light", "dark", "system"]);
    });

    it("accepts known themes and rejects others", () => {
      expect(isTheme("light")).toBe(true);
      expect(isTheme("dark")).toBe(true);
      expect(isTheme("system")).toBe(true);
      expect(isTheme("sepia")).toBe(false);
      expect(isTheme(null)).toBe(false);
      expect(isTheme(undefined)).toBe(false);
    });
  });

  describe("resolveTheme", () => {
    it("returns the explicit theme regardless of OS preference", () => {
      expect(resolveTheme("light", true)).toBe("light");
      expect(resolveTheme("dark", false)).toBe("dark");
    });

    it("follows the OS when set to system", () => {
      expect(resolveTheme("system", true)).toBe("dark");
      expect(resolveTheme("system", false)).toBe("light");
    });
  });

  describe("getStoredTheme", () => {
    it("returns the stored explicit choice", () => {
      expect(getStoredTheme(memoryStorage({ [THEME_STORAGE_KEY]: "dark" }))).toBe("dark");
      expect(getStoredTheme(memoryStorage({ [THEME_STORAGE_KEY]: "light" }))).toBe("light");
    });

    it("defaults to system when nothing is stored", () => {
      expect(getStoredTheme(memoryStorage())).toBe("system");
    });

    it("treats an unrecognized stored value as system", () => {
      expect(getStoredTheme(memoryStorage({ [THEME_STORAGE_KEY]: "neon" }))).toBe("system");
    });

    it("falls back to system when storage is unavailable", () => {
      expect(getStoredTheme(undefined)).toBe("system");
    });
  });

  describe("setStoredTheme", () => {
    it("persists explicit choices", () => {
      const store = memoryStorage();
      setStoredTheme(store, "dark");
      expect(store.getItem(THEME_STORAGE_KEY)).toBe("dark");
    });

    it("clears the key for system so the OS preference takes over", () => {
      const store = memoryStorage({ [THEME_STORAGE_KEY]: "dark" });
      setStoredTheme(store, "system");
      expect(store.getItem(THEME_STORAGE_KEY)).toBeNull();
    });

    it("no-ops without throwing when storage is unavailable", () => {
      expect(() => setStoredTheme(undefined, "dark")).not.toThrow();
    });
  });

  describe("applyTheme", () => {
    it("adds the dark class for dark and removes it for light", () => {
      const toggle = vi.fn();
      applyTheme({ classList: { toggle } as unknown as DOMTokenList }, "dark");
      expect(toggle).toHaveBeenCalledWith("dark", true);

      toggle.mockClear();
      applyTheme({ classList: { toggle } as unknown as DOMTokenList }, "light");
      expect(toggle).toHaveBeenCalledWith("dark", false);
    });
  });

  describe("NO_FLASH_SCRIPT", () => {
    it("references the shared storage key and the OS dark query", () => {
      expect(NO_FLASH_SCRIPT).toContain(THEME_STORAGE_KEY);
      expect(NO_FLASH_SCRIPT).toContain("prefers-color-scheme: dark");
      expect(NO_FLASH_SCRIPT).toContain('classList.toggle("dark"');
    });
  });
});
