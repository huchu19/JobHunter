// Shared settings + storage helpers for the extension. Uses the `chrome` global,
// so it is deliberately NOT imported by tests (the pure, testable bits live in
// extract.ts). content.ts, background.ts, and the popup all read/write through
// here so storage keys and defaults live in one place.

import { DEFAULT_DASHBOARD_URL, normaliseDashboardUrl } from "./extract";

export { normaliseDashboardUrl };

export interface Settings {
  /** Base URL of the running UK Sponsor Finder app. */
  dashboardUrl: string;
  /** Master on/off for the extension's on-page UI. */
  enabled: boolean;
  /** Offer the autofill action on detected application forms. */
  autofillEnabled: boolean;
  /** Auto-save applications to the board on submit detection. */
  captureEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  dashboardUrl: DEFAULT_DASHBOARD_URL,
  enabled: true,
  autofillEnabled: true,
  captureEnabled: true,
};

const SETTINGS_KEY = "settings";
const CAPTURES_KEY = "recentCaptures";

/** One saved-application record shown in the popup's "recent" list. */
export interface CaptureRecord {
  company: string | null;
  role: string | null;
  url: string;
  at: number; // epoch ms
  ok: boolean; // did the POST succeed
}

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] ?? {}) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function getRecentCaptures(): Promise<CaptureRecord[]> {
  const stored = await chrome.storage.local.get(CAPTURES_KEY);
  return (stored[CAPTURES_KEY] as CaptureRecord[]) ?? [];
}

export async function pushCapture(rec: CaptureRecord): Promise<void> {
  const list = await getRecentCaptures();
  list.unshift(rec);
  await chrome.storage.local.set({ [CAPTURES_KEY]: list.slice(0, 20) });
}
