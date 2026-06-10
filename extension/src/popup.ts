// Popup controller: edit settings + show recent captures.

import {
  getSettings,
  setSettings,
  getRecentCaptures,
  normaliseDashboardUrl,
  type CaptureRecord,
} from "./settings";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

async function load() {
  const s = await getSettings();
  $<HTMLInputElement>("dashboardUrl").value = s.dashboardUrl;
  $<HTMLInputElement>("enabled").checked = s.enabled;
  $<HTMLInputElement>("autofillEnabled").checked = s.autofillEnabled;
  $<HTMLInputElement>("captureEnabled").checked = s.captureEnabled;
  renderCaptures(await getRecentCaptures());
}

function renderCaptures(list: CaptureRecord[]) {
  const ul = $<HTMLUListElement>("captures");
  ul.innerHTML = "";
  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No captures yet.";
    ul.appendChild(li);
    return;
  }
  for (const c of list) {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.className = "cap-title";
    title.textContent = [c.company, c.role].filter(Boolean).join(" · ") || "Job";
    const meta = document.createElement("div");
    meta.className = "cap-meta";
    const when = document.createElement("span");
    when.textContent = new Date(c.at).toLocaleString();
    const state = document.createElement("span");
    state.textContent = c.ok ? "✓ saved" : "✗ failed";
    if (!c.ok) state.className = "cap-bad";
    meta.append(when, state);
    li.append(title, meta);
    ul.appendChild(li);
  }
}

async function save() {
  const status = $<HTMLParagraphElement>("status");
  await setSettings({
    dashboardUrl: normaliseDashboardUrl(
      $<HTMLInputElement>("dashboardUrl").value
    ),
    enabled: $<HTMLInputElement>("enabled").checked,
    autofillEnabled: $<HTMLInputElement>("autofillEnabled").checked,
    captureEnabled: $<HTMLInputElement>("captureEnabled").checked,
  });
  status.textContent = "Saved. Reload the job page to apply.";
  status.className = "status ok";
  setTimeout(() => {
    status.textContent = "";
    status.className = "status";
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  void load();
  $<HTMLButtonElement>("save").addEventListener("click", () => void save());
});
