#!/usr/bin/env node
// Standalone check — no dependencies. Prints which opencode-go key is active.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const authCandidates = [
  process.env.OPENCODE_AUTH_PATH,
  join(homedir(), ".local", "share", "opencode", "auth.json"),
  join(homedir(), ".config", "opencode", "auth.json"),
].filter(Boolean);
const authPath = authCandidates.find((p) => existsSync(p)) ?? null;

const mapPath =
  process.env.GO_WHOAMI_MAP ?? join(homedir(), ".config", "opencode", "go-accounts.json");

let auth = {};
if (authPath) {
  try { auth = JSON.parse(readFileSync(authPath, "utf8")); } catch {}
}
let mapping = {};
if (existsSync(mapPath)) {
  try { mapping = JSON.parse(readFileSync(mapPath, "utf8")); } catch {}
}

const fp = (k) => createHash("sha256").update(k, "utf8").digest("hex").slice(0, 12);
const mask = (k) => (k && k.length > 12 ? `${k.slice(0, 7)}…${k.slice(-4)}` : "***");
const lookup = (m, f, k) => {
  const acc = m.accounts && typeof m.accounts === "object" ? m.accounts : m;
  const d = acc[f];
  if (typeof d === "string" && d.includes("@")) return d;
  if (d && typeof d.email === "string") return d.email;
  if (m.byPrefix && typeof m.byPrefix === "object") {
    for (const [p, e] of Object.entries(m.byPrefix)) {
      if (typeof e === "string" && k.startsWith(p)) return e;
    }
  }
  return null;
};

console.log("OpenCode Go whoami");
console.log(`auth: ${authPath ?? "(not found)"}`);
console.log(`map:  ${existsSync(mapPath) ? mapPath : "(none)"}`);
for (const provider of Object.keys(auth).sort()) {
  const key = auth[provider]?.key ?? "";
  const f = key ? fp(key) : "none";
  const email = key ? lookup(mapping, f, key) : null;
  console.log(`- ${provider}: ${email ?? "(unlabelled)"} (${mask(key)} fp ${f})`);
}
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ authPath, mapPath, auth: Object.keys(auth) }, null, 2));
}
