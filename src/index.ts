import { Plugin } from "@opencode/plugin";
import { buildReport, formatHuman } from "./whoami.js";

export default Plugin.define({
  id: "opencode-go-whoami",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.add({
        name: "go_whoami",
        description:
          "Show which OpenCode Go/Zen account key is active (masked key + fingerprint + your email label from go-accounts.json). Use when the user asks which account they are signed in with.",
        input: {
          type: "object",
          properties: {
            verbose: {
              type: "boolean",
              description: "Include auth path and mapping path",
            },
          },
          additionalProperties: false,
        },
        async execute(input) {
          const r = buildReport();
          if ((input as { verbose?: boolean }).verbose) {
            return { content: formatHuman(r) };
          }
          const lines = r.accounts.map((a) => {
            const who = a.email ?? "(unlabelled)";
            const label = a.label ? ` [${a.label}]` : "";
            return `${a.provider}: ${who}${label} (${a.masked} fp ${a.fingerprint})`;
          });
          return { content: [...lines, r.note].join("\n") };
        },
      });
    });
  },
});
