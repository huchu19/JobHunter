// Content script — injected into job boards. Owns all DOM work and delegates
// every decision to the pure helpers in extract.ts.
//
// Build order this milestone is autofill-first: the headline action is filling
// an application form from the user's saved profile (the thing that makes the
// M1.5 profile actually useful). Auto-capture (saving the application to the
// board on submit) rides alongside.

import {
  detectBoard,
  isApplicationLikeUrl,
  parseJobFromTitle,
  matchField,
  sponsorshipAnswer,
  type Board,
  type ExtensionProfile,
  type FieldHints,
} from "./extract";
import {
  getSettings,
  type Settings,
} from "./settings";

type FillableEl =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

const SKIP_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "file",
  "image",
  "password",
  "search",
]);

let board: Board = "generic";
let settings: Settings;

void init();

async function init() {
  settings = await getSettings();
  if (!settings.enabled) return;

  board = detectBoard(location.hostname, location.pathname);

  const isAppUrl = isApplicationLikeUrl(location.pathname);

  // Known ATS boards always get the full badge. Generic sites always get
  // the Save Job button (user browses any company careers page); Autofill
  // is gated to URLs that look like actual application forms.
  if (board === "generic" && !isAppUrl && !settings.autofillEnabled && !settings.captureEnabled) return;

  mountBadge(board !== "generic" || isAppUrl);
  if (settings.captureEnabled) watchForSubmit();
}

// ---------------------------------------------------------------------------
// Floating action UI
// ---------------------------------------------------------------------------
function mountBadge(showAutofill = true) {
  if (document.getElementById("ukf-badge")) return;

  const wrap = document.createElement("div");
  wrap.id = "ukf-badge";
  wrap.setAttribute("data-ukf", "");
  Object.assign(wrap.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483647",
    display: "flex",
    gap: "8px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  });

  if (settings.autofillEnabled && showAutofill) {
    wrap.appendChild(
      makeButton("✨ Autofill", "#4f46e5", "#ffffff", onAutofill)
    );
  }
  // Save Job button is always shown when capture is enabled (regardless of URL).
  if (settings.captureEnabled) {
    wrap.appendChild(
      makeButton("＋ Save job", "#ffffff", "#4f46e5", onManualSave, true)
    );
  }
  document.body.appendChild(wrap);
}

function makeButton(
  label: string,
  bg: string,
  fg: string,
  onClick: () => void,
  outlined = false
): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  Object.assign(b.style, {
    padding: "10px 14px",
    borderRadius: "10px",
    border: outlined ? "1px solid #4f46e5" : "none",
    background: bg,
    color: fg,
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
  });
  b.addEventListener("click", onClick);
  return b;
}

function toast(message: string, ok = true) {
  const el = document.createElement("div");
  el.textContent = message;
  Object.assign(el.style, {
    position: "fixed",
    bottom: "76px",
    right: "20px",
    zIndex: "2147483647",
    maxWidth: "320px",
    padding: "12px 16px",
    borderRadius: "10px",
    background: ok ? "#065f46" : "#7f1d1d",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    fontWeight: "500",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ---------------------------------------------------------------------------
// Autofill
// ---------------------------------------------------------------------------
async function onAutofill() {
  const profile = await fetchProfile();
  if (!profile) {
    toast("Couldn't reach your dashboard. Is it running?", false);
    return;
  }
  const filled = fillForm(profile);
  if (filled === 0) {
    toast("No matching fields found to autofill.", false);
  } else {
    toast(`✓ Autofilled ${filled} field${filled === 1 ? "" : "s"}.`);
  }
}

/** Fill every recognised field on the page; return how many were filled. */
function fillForm(profile: ExtensionProfile): number {
  const els = Array.from(
    document.querySelectorAll<FillableEl>("input, textarea, select")
  );
  let count = 0;
  for (const el of els) {
    if (el.closest("[data-ukf]")) continue; // never fill our own UI
    if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)) continue;
    if (el.disabled || el.readOnly) continue;

    const hints = collectHints(el);
    let value = matchField(hints, profile);

    // Sponsorship is a yes/no question, not a free-text value.
    if (
      value === null &&
      hintHasText(hints, ["sponsor", "visa", "work permit"])
    ) {
      value = sponsorshipAnswer(profile);
    }
    if (!value) continue;

    if (setValue(el, value)) count++;
  }
  return count;
}

/** Gather attribute + associated-label hints for one field. */
function collectHints(el: FillableEl): FieldHints {
  return {
    name: el.getAttribute("name") ?? undefined,
    id: el.id || undefined,
    label: labelTextFor(el) || undefined,
    placeholder: el.getAttribute("placeholder") ?? undefined,
    autocomplete: el.getAttribute("autocomplete") ?? undefined,
    type: el instanceof HTMLInputElement ? el.type : undefined,
  };
}

/** Find the human label for a field (<label for>, wrapping label, or aria). */
function labelTextFor(el: FillableEl): string {
  if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl?.textContent) return lbl.textContent;
  }
  const wrapping = el.closest("label");
  if (wrapping?.textContent) return wrapping.textContent;
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const ref = document.getElementById(labelledby);
    if (ref?.textContent) return ref.textContent;
  }
  return "";
}

function hintHasText(hints: FieldHints, keywords: string[]): boolean {
  const hay = [hints.name, hints.id, hints.label, hints.placeholder]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

/**
 * Set a value and fire the events frameworks (React/Vue) listen for so the
 * change actually registers. Returns true if it took.
 */
function setValue(el: FillableEl, value: string): boolean {
  if (el instanceof HTMLSelectElement) {
    const opt = Array.from(el.options).find(
      (o) =>
        o.text.trim().toLowerCase() === value.trim().toLowerCase() ||
        o.value.trim().toLowerCase() === value.trim().toLowerCase()
    );
    if (!opt) return false;
    el.value = opt.value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  if (el.value && el.value.trim()) return false; // don't clobber existing input

  // React tracks value via a native setter; bypass it so onChange fires.
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter ? setter.call(el, value) : (el.value = value);

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

// ---------------------------------------------------------------------------
// Capture (save to board)
// ---------------------------------------------------------------------------
function currentJob() {
  const info = parseJobFromTitle(document.title, board);
  // Greenhouse/Lever embed the company in the host; fall back to that.
  if (!info.company) {
    info.company = companyFromHost();
  }
  return info;
}

function companyFromHost(): string | null {
  const host = location.hostname;
  // boards.greenhouse.io/acme  → path segment
  if (board === "greenhouse") {
    const seg = location.pathname.split("/").filter(Boolean)[0];
    if (seg) return titleCase(seg);
  }
  // acme.lever.co / jobs.lever.co/acme
  if (board === "lever") {
    const sub = host.split(".")[0];
    if (sub && sub !== "jobs" && sub !== "www") return titleCase(sub);
    const seg = location.pathname.split("/").filter(Boolean)[0];
    if (seg) return titleCase(seg);
  }
  return null;
}

function titleCase(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function onManualSave() {
  const job = currentJob();
  await saveApplication(job.company, job.role, true);
}

let captured = false;
function watchForSubmit() {
  // Heuristic: a click on a submit-like button is our capture trigger. ATS
  // forms vary too much for a single reliable submit event, so we observe
  // clicks on buttons whose text reads like "Submit application".
  document.addEventListener(
    "click",
    (e) => {
      if (captured) return;
      const target = e.target as HTMLElement | null;
      const btn = target?.closest(
        'button, input[type="submit"], a[role="button"]'
      ) as HTMLElement | null;
      if (!btn || btn.closest("[data-ukf]")) return;
      const text = (btn.textContent || (btn as HTMLInputElement).value || "")
        .trim()
        .toLowerCase();
      if (/\b(submit|apply|send) (application|now)\b|^submit$|^apply$/.test(text)) {
        captured = true;
        const job = currentJob();
        // Slight delay so we don't race the page's own submit handler.
        setTimeout(() => void saveApplication(job.company, job.role, false), 300);
      }
    },
    true
  );
}

async function saveApplication(
  company: string | null,
  role: string | null,
  manual: boolean
) {
  if (!company && !role) {
    toast("Couldn't read company/role from this page.", false);
    return;
  }
  try {
    const res = await fetch(`${settings.dashboardUrl}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: company ?? "Unknown",
        role: role ?? "Unknown role",
        url: location.href,
        status: manual ? "wishlist" : "applied",
        source: "extension",
      }),
    });
    const ok = res.ok;
    // Tell the background worker to record it for the popup list.
    chrome.runtime.sendMessage({
      type: "capture",
      record: { company, role, url: location.href, at: Date.now(), ok },
    });
    toast(
      ok
        ? `✓ Saved — ${company ?? "job"}${role ? " · " + role : ""}`
        : "Save failed — check the dashboard.",
      ok
    );
  } catch {
    toast("Couldn't reach your dashboard. Is it running?", false);
  }
}

// ---------------------------------------------------------------------------
// Dashboard fetches
// ---------------------------------------------------------------------------
async function fetchProfile(): Promise<ExtensionProfile | null> {
  try {
    const res = await fetch(`${settings.dashboardUrl}/api/profile`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile as ExtensionProfile;
  } catch {
    return null;
  }
}
