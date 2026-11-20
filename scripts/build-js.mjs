import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = path.resolve(import.meta.dirname, "..");
const versionFile = path.join(rootDir, "src", "build-version.mjs");

const source = fs.readFileSync(versionFile, "utf8");
const match = /export const BUILD_VERSION = (\d+);/.exec(source);
if (!match) {
  throw new Error(`Could not find BUILD_VERSION in ${versionFile}`);
}

const nextVersion = Number(match[1]) + 1;
const updated = source.replace(/export const BUILD_VERSION = \d+;/, `export const BUILD_VERSION = ${nextVersion};`);
fs.writeFileSync(versionFile, updated, "utf8");
console.log(`[build:js] Bumped BUILD_VERSION to ${nextVersion}`);

const viteBin = path.join(rootDir, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");
const result = spawnSync(viteBin, ["build", "-c", "vite.js-only.config.mjs"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env },
});

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 0);
