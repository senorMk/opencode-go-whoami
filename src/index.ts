import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { buildReport, formatHuman } from "./whoami.js";

/**
 * opencode-go-whoami
 * Shows which OpenCode Go / Zen API key is active, plus your own
 * email labels (OpenCode stores keys only, not emails).
 *
 * Install (global):
 *   1. cp src/*.ts ~/.config/opencode/plugins/go-whoami.ts  (or symlink, see scripts/link-global.sh)
 *      -- or add this package to "plugin" in opencode.jsonc
 *   2. cp go-accounts.example.json ~/.config/opencode/go-accounts.json and fill in emails
 *   3. restart opencode, then ask "go whoami" or call the go_whoami tool
 */
export const GoWhoamiPlugin: Plugin = async ({ client }) => {
  // Log once per session so the active account is visible in logs.
  try {
    const r = buildReport();
    const primary =
      r.accounts.find((a) => a.provider === "opencode-go") ?? r.accounts[0];
    if (primary) {
      await client.app.log({
        body: {
          service: "go-whoami",
          level: "info",
          message: `active ${primary.provider}: ${primary.email ?? "unlabelled"} (${primary.masked} fp ${primary.fingerprint})`,
          extra: { fingerprint: primary.fingerprint, masked: primary.masked },
        },
      });
    }
  } catch {
    // never break session startup
  }

  return {
    tool: {
      go_whoami: tool({
        description:
          "Show which OpenCode Go/Zen account key is active (masked key + fingerprint + your email label from go-accounts.json). Use when the user asks which account they are signed in with.",
        args: {
          verbose: tool.schema.boolean().optional().describe("Include auth path and mapping path"),
        },
        async execute(args) {
          const r = buildReport();
          if (args.verbose) return formatHuman(r);
          const lines = r.accounts.map((a) => {
            const who = a.email ?? "(unlabelled)";
            const label = a.label ? ` [${a.label}]` : "";
            return `${a.provider}: ${who}${label} (${a.masked} fp ${a.fingerprint})`;
          });
          return [...lines, r.note].join("\n");
        },
      }),
    },
  };
};

// Alias so both `GoWhoamiPlugin` and `GoWhoami` imports work.
export const GoWhoami = GoWhoamiPlugin;
