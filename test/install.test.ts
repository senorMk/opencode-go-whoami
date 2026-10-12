import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const installer = resolve("scripts/link-global.sh");
test("upgrade removes legacy discovery entries, preserves labels/settings and is repeatable", () => {
  const fixture = mkdtempSync(join(tmpdir(), "go-whoami-install-"));
  try {
    const config = join(fixture, "opencode");
    const plugins = join(config, "plugins");
    mkdirSync(plugins, { recursive: true });
    const original = join(fixture, "source.ts");
    writeFileSync(original, "original source");
    symlinkSync(original, join(plugins, "go-whoami.ts"));
    writeFileSync(join(plugins, "go-whoami-whoami.ts"), "legacy helper");
    writeFileSync(join(plugins, "go-whoami-tui.tsx"), "legacy sidebar");
    writeFileSync(join(plugins, "unrelated.ts"), "unrelated");
    const labels = '{"accounts":{"fake":"me@example.com"}}\n';
    writeFileSync(join(config, "go-accounts.json"), labels);
    writeFileSync(join(config, "cli.json"), JSON.stringify({
      animations: false,
      plugins: ["other-plugin", { package: join(plugins, "go-whoami-tui.tsx"), options: { enabled: false } }],
    }));
    const env = { ...process.env, XDG_CONFIG_HOME: fixture };
    execFileSync("sh", [installer], { env });
    execFileSync("sh", [installer], { env });
    const cli = JSON.parse(readFileSync(join(config, "cli.json"), "utf8"));
    expect(cli.animations).toBe(false);
    expect(cli.plugins).toEqual(["other-plugin", { package: join(plugins, "go-whoami"), options: { enabled: false } }]);
    expect(readFileSync(join(config, "go-accounts.json"), "utf8")).toBe(labels);
    expect(readFileSync(original, "utf8")).toBe("original source");
    expect(readdirSync(plugins).sort()).toEqual(["go-whoami", "unrelated.ts"]);
    expect(existsSync(join(config, "command", "go-whoami.md"))).toBe(true);
    expect(readdirSync(join(config, "backups")).length).toBeGreaterThan(0);
    const manifest = JSON.parse(readFileSync(join(plugins, "go-whoami", "package.json"), "utf8"));
    expect(manifest.exports).toEqual({ ".": "./index.ts", "./tui": "./tui.tsx" });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("guided setup installs v2 using fake credentials and XDG paths", () => {
  const fixture = mkdtempSync(join(tmpdir(), "go-whoami-setup-"));
  try {
    const auth = join(fixture, "auth.json");
    writeFileSync(auth, JSON.stringify({ "opencode-go": { type: "api", key: "sk-AcMeFakeKey12345678900000" } }));
    const env = { ...process.env, XDG_CONFIG_HOME: fixture, OPENCODE_AUTH_PATH: auth };
    execFileSync("sh", [resolve("scripts/setup.sh")], { env, input: "me@example.com\n" });
    const config = join(fixture, "opencode");
    const cli = JSON.parse(readFileSync(join(config, "cli.json"), "utf8"));
    expect(cli.plugins).toHaveLength(1);
    expect(readFileSync(join(config, "go-accounts.json"), "utf8")).toContain("me@example.com");
    const output = execFileSync("node", [resolve("bin/cli.mjs")], { env: { ...env, GO_WHOAMI_MAP: join(config, "go-accounts.json") }, encoding: "utf8" });
    expect(output).toContain("me@example.com");
    expect(output).not.toContain("sk-AcMeFakeKey12345678900000");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
