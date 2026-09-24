import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AccountReport = {
  provider: string;
  type: string;
  fingerprint: string;
  masked: string;
  email: string | null;
  label: string | null;
  mapped: boolean;
};

export type WhoamiReport = {
  authPath: string | null;
  mappingPath: string | null;
  detectedAt: string;
  accounts: AccountReport[];
  note: string;
};

export function resolveAuthPath(): string | null {
  const candidates: (string | undefined)[] = [
    process.env.OPENCODE_AUTH_PATH,
    process.env.XDG_DATA_HOME
      ? join(process.env.XDG_DATA_HOME, "opencode", "auth.json")
      : undefined,
    join(homedir(), ".local", "share", "opencode", "auth.json"),
    join(homedir(), ".config", "opencode", "auth.json"),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

export function resolveMappingPath(): string | null {
  const candidates: (string | undefined)[] = [
    process.env.GO_WHOAMI_MAP,
    join(homedir(), ".config", "opencode", "go-accounts.json"),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

export function defaultMappingPath(): string {
  if (process.env.GO_WHOAMI_MAP) return process.env.GO_WHOAMI_MAP;
  return join(homedir(), ".config", "opencode", "go-accounts.json");
}

export function fingerprint(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex").slice(0, 12);
}

export function maskKey(key: string): string {
  if (!key) return "(empty)";
  if (key.length <= 12) return "***";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

/** Mapping file supports all of these shapes (merged):
 *  { "accounts": { "<fp12>": { "email": "...", "label": "..." } } }
 *  { "accounts": { "<fp12>": "you@example.com" } }
 *  { "<fp12>": "you@example.com" }
 *  { "byPrefix": { "sk-AcMe": "you@example.com" } }
 */
function lookupMapping(
  mapping: Record<string, any>,
  fp: string,
  key: string,
): { email: string | null; label: string | null } {
  const accounts =
    mapping.accounts && typeof mapping.accounts === "object"
      ? mapping.accounts
      : mapping;

  const direct = accounts[fp];
  if (typeof direct === "string" && direct.includes("@")) {
    return { email: direct, label: null };
  }
  if (direct && typeof direct === "object") {
    return {
      email: typeof direct.email === "string" ? direct.email : null,
      label: typeof direct.label === "string" ? direct.label : null,
    };
  }

  const byPrefix = mapping.byPrefix;
  if (byPrefix && typeof byPrefix === "object") {
    for (const [prefix, email] of Object.entries(byPrefix)) {
      if (
        typeof email === "string" &&
        email.includes("@") &&
        key.startsWith(prefix)
      ) {
        return { email, label: null };
      }
    }
  }
  return { email: null, label: null };
}

export function buildReport(): WhoamiReport {
  const authPath = resolveAuthPath();
  const mappingPath = resolveMappingPath();

  let auth: Record<string, { type?: string; key?: string }> = {};
  if (authPath) {
    try {
      auth = JSON.parse(readFileSync(authPath, "utf8"));
    } catch {
      auth = {};
    }
  }

  let mapping: Record<string, any> = {};
  if (mappingPath) {
    try {
      mapping = JSON.parse(readFileSync(mappingPath, "utf8"));
    } catch {
      mapping = {};
    }
  }

  const wanted = ["opencode-go", "opencode"];
  const providers = Object.keys(auth).filter(
    (k) => wanted.includes(k) || k.startsWith("opencode"),
  );
  const keys = (providers.length > 0 ? providers : Object.keys(auth)).sort();

  const accounts: AccountReport[] = keys.map((provider) => {
    const entry = auth[provider] ?? {};
    const key = typeof entry.key === "string" ? entry.key : "";
    const fp = key ? fingerprint(key) : "none";
    const m = key ? lookupMapping(mapping, fp, key) : { email: null, label: null };
    return {
      provider,
      type: typeof entry.type === "string" ? entry.type : "unknown",
      fingerprint: fp,
      masked: maskKey(key),
      email: m.email,
      label: m.label,
      mapped: m.email !== null,
    };
  });

  const unmapped = accounts.filter((a) => !a.mapped && a.fingerprint !== "none");
  const note =
    accounts.length === 0
      ? "No providers found in auth.json. Run `opencode auth login`."
      : unmapped.length === 0
        ? "All keys labelled. Source of truth for email is https://opencode.ai/auth"
        : `OpenCode stores API keys only, not emails. Label ${unmapped.length} key(s) in ${mappingPath ?? defaultMappingPath()} — see go-accounts.example.json. Source of truth: https://opencode.ai/auth`;

  return {
    authPath,
    mappingPath,
    detectedAt: new Date().toISOString(),
    accounts,
    note,
  };
}

export function formatHuman(r: WhoamiReport): string {
  const lines: string[] = [];
  lines.push("OpenCode Go whoami");
  lines.push(`auth: ${r.authPath ?? "(not found)"}`);
  lines.push(`map:  ${r.mappingPath ?? "(none — unlabelled)"}`);
  for (const a of r.accounts) {
    const who = a.email ?? "(unlabelled — add fingerprint to go-accounts.json)";
    const label = a.label ? ` [${a.label}]` : "";
    lines.push(`- ${a.provider}: ${who}${label} (${a.masked} / fp ${a.fingerprint})`);
  }
  lines.push(r.note);
  return lines.join("\n");
}
