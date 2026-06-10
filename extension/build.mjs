// Builds the extension into extension/dist/ with esbuild, then copies the static
// assets (manifest, icons, popup html/css). Run via `npm run build:ext` from the
// repo root, or `npm run build` / `npm run build:popup` inside extension/.
//
// Usage: node build.mjs [content|popup|all]   (default: all)

import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const target = process.argv[2] ?? "all";

const common = {
  bundle: true,
  format: "iife",
  target: "chrome110",
  logLevel: "info",
};

// content + background are the on-page / worker scripts.
const codeEntries = {
  content: join(root, "src/content.ts"),
  background: join(root, "src/background.ts"),
};
// Popup script lives under dist/popup/ so popup.html can load it relatively.
const popupEntries = {
  "popup/popup": join(root, "src/popup.ts"),
};

async function buildEntries(entries) {
  for (const [name, entry] of Object.entries(entries)) {
    await esbuild.build({
      ...common,
      entryPoints: [entry],
      outfile: join(dist, `${name}.js`),
    });
  }
}

function copyStatic() {
  cpSync(join(root, "manifest.json"), join(dist, "manifest.json"));
  cpSync(join(root, "icons"), join(dist, "icons"), { recursive: true });
  mkdirSync(join(dist, "popup"), { recursive: true });
  cpSync(join(root, "popup/popup.html"), join(dist, "popup/popup.html"));
  cpSync(join(root, "popup/popup.css"), join(dist, "popup/popup.css"));
}

if (target === "all") {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  await buildEntries({ ...codeEntries, ...popupEntries });
  copyStatic();
} else if (target === "content") {
  // The "content" build also produces background.js and copies static assets,
  // so a bare `npm run build` yields a loadable extension on its own. It runs
  // first in `build:ext`, so clean dist here to avoid stale artifacts.
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  await buildEntries(codeEntries);
  copyStatic();
} else if (target === "popup") {
  mkdirSync(join(dist, "popup"), { recursive: true });
  await buildEntries(popupEntries);
  cpSync(join(root, "popup/popup.html"), join(dist, "popup/popup.html"));
  cpSync(join(root, "popup/popup.css"), join(dist, "popup/popup.css"));
}

console.log(`✓ extension build (${target}) → dist/`);
