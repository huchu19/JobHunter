/**
 * Theme system — single source of truth for light / dark / system handling.
 *
 * The user picks one of three *preferences* (`light`, `dark`, `system`). Only an
 * explicit `light`/`dark` choice is persisted; `system` means "follow the OS",
 * so it is stored as the absence of a saved value. A preference resolves to a
 * concrete *resolved* theme (`light` | `dark`) that is applied to <html>.
 *
 * Keep this module free of React and DOM-framework imports so it stays unit
 * testable (see tests/theme.test.ts) and can be inlined into the no-flash
 * <head> script as a string.
 */

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export type ResolvedTheme = "light" | "dark";

/** localStorage key holding an explicit `light`/`dark` choice. */
export const THEME_STORAGE_KEY = "ukf-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Collapse a preference into the theme actually shown. `system` consults the OS;
 * pass the current `prefers-color-scheme: dark` match for testability.
 */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}

/** Read the stored preference. Returns `system` when nothing explicit is saved. */
export function getStoredTheme(storage: Pick<Storage, "getItem"> | undefined): Theme {
  if (!storage) return "system";
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : "system";
  } catch {
    return "system";
  }
}

/**
 * Persist a preference. `light`/`dark` are written; `system` clears the key so
 * the app falls back to the live OS preference.
 */
export function setStoredTheme(
  storage: Pick<Storage, "setItem" | "removeItem"> | undefined,
  theme: Theme,
): void {
  if (!storage) return;
  try {
    if (theme === "system") storage.removeItem(THEME_STORAGE_KEY);
    else storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable (private mode / quota) — non-fatal */
  }
}

/** Toggle <html>'s `dark` class to match a resolved theme. */
export function applyTheme(root: { classList: DOMTokenList }, resolved: ResolvedTheme): void {
  root.classList.toggle("dark", resolved === "dark");
}

/**
 * Synchronous script injected into <head> before paint to prevent a flash of the
 * wrong theme. Mirrors getStoredTheme + resolveTheme + applyTheme above; kept in
 * sync by sharing the storage key constant. Wrapped in a try/catch so a failure
 * never blocks rendering.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var s=localStorage.getItem(k);var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
