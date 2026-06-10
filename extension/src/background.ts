// Service worker. Records captures from content scripts into local storage so
// the popup can show a "recent" list, and seeds default settings on install.

import { DEFAULT_SETTINGS, pushCapture, type CaptureRecord } from "./settings";

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get("settings");
  if (!stored.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "capture" && msg.record) {
    void pushCapture(msg.record as CaptureRecord);
  }
  // No async response needed; return nothing.
});
