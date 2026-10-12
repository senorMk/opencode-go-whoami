import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin from "../src/index";
import { fingerprint } from "../src/whoami";

const fixture = mkdtempSync(join(tmpdir(), "go-whoami-plugin-"));
const auth = join(fixture, "auth.json");
const mapping = join(fixture, "go-accounts.json");
const key = "sk-AcMeFakeKey12345678900000";
const original = { auth: process.env.OPENCODE_AUTH_PATH, map: process.env.GO_WHOAMI_MAP };
process.env.OPENCODE_AUTH_PATH = auth;
process.env.GO_WHOAMI_MAP = mapping;
writeFileSync(auth, JSON.stringify({ "opencode-go": { type: "api", key } }));
writeFileSync(mapping, JSON.stringify({ accounts: { [fingerprint(key)]: "you@example.com" } }));
afterAll(() => {
  for (const [name, value] of [["OPENCODE_AUTH_PATH", original.auth], ["GO_WHOAMI_MAP", original.map]]) {
    if (value === undefined) delete process.env[name!];
    else process.env[name!] = value;
  }
  rmSync(fixture, { recursive: true, force: true });
});

test("v2 setup registers an executable tool with masked output and live account updates", async () => {
  let registered: any;
  await plugin.setup({ tool: { transform: async (edit: any) => {
    edit({ add: (tool: any) => { registered = tool; } });
  } } } as any);
  expect(plugin.id).toBe("opencode-go-whoami");
  expect(registered.name).toBe("go_whoami");
  expect(registered.input.properties.verbose.type).toBe("boolean");
  const brief = await registered.execute({});
  expect(brief.content).toContain("you@example.com");
  expect(brief.content).toContain("sk-AcMe…0000");
  expect(brief.content).not.toContain(key);
  expect(brief.content).not.toContain(auth);
  const verbose = await registered.execute({ verbose: true });
  expect(verbose.content).toContain(auth);
  expect(verbose.content).not.toContain(key);
  writeFileSync(mapping, JSON.stringify({ accounts: { [fingerprint(key)]: "changed@example.com" } }));
  expect((await registered.execute({})).content).toContain("changed@example.com");
  writeFileSync(auth, "{}");
  expect((await registered.execute({})).content).toContain("No providers found");
});
