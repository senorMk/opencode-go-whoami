import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = dirname(dirname(fileURLToPath(import.meta.url)));
const config = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode");
const destination = join(config, "plugins", "go-whoami");
const cliPath = join(config, "cli.json");
// Parse before changing installed files; never overwrite unreadable settings.
const cli = existsSync(cliPath) ? JSON.parse(readFileSync(cliPath, "utf8")) : {};
if (cli.plugins !== undefined && !Array.isArray(cli.plugins)) {
  throw new Error(`${cliPath}: plugins must be an array`);
}
const entryPath = (entry) => typeof entry === "string" ? entry : Array.isArray(entry) ? entry[0] : entry?.package;
const isOurs = (entry) => /(?:^|\/)go-whoami(?:-tui\.tsx)?\/?$/.test(entryPath(entry) || "");
const entries = cli.plugins || [];
const previous = entries.find(isOurs);
let options = previous && typeof previous === "object"
  ? (Array.isArray(previous) ? previous[1] : previous.options) : undefined;
// Preserve sidebar options when upgrading an installation not yet migrated by OpenCode.
if (!previous && existsSync(join(config, "tui.json"))) {
  const legacy = JSON.parse(readFileSync(join(config, "tui.json"), "utf8"));
  const entry = legacy.plugin?.find(isOurs);
  if (entry && typeof entry === "object") options = Array.isArray(entry) ? entry[1] : entry.options;
}
cli.plugins = entries.filter((entry) => !isOurs(entry));
cli.plugins.push({ package: destination, options: options || {} });
cli.$schema ||= "https://opencode.ai/v2/cli.json";

const backup = join(config, "backups", `go-whoami-${Date.now()}`);
const save = (path) => {
  mkdirSync(backup, { recursive: true });
  copyFileSync(path, join(backup, path.split("/").at(-1)));
};
mkdirSync(destination, { recursive: true });
for (const name of ["index.ts", "whoami.ts", "tui.tsx"]) {
  const target = join(destination, name);
  if (existsSync(target)) save(target);
  // Rename over a possible old symlink instead of writing through it.
  copyFileSync(join(source, "src", name), `${target}.tmp`);
  renameSync(`${target}.tmp`, target);
}
writeFileSync(join(destination, "package.json"), JSON.stringify({
  name: "opencode-go-whoami",
  type: "module",
  exports: { ".": "./index.ts", "./tui": "./tui.tsx" },
}, null, 2) + "\n");

// V2 discovers every top-level .ts file as a plugin, including the old helper.
// Move only this plugin's legacy files outside discovery, retaining a backup.
for (const name of ["go-whoami.ts", "go-whoami-whoami.ts", "go-whoami-tui.tsx"]) {
  const path = join(config, "plugins", name);
  if (lstatSync(path, { throwIfNoEntry: false })) {
    mkdirSync(backup, { recursive: true });
    renameSync(path, join(backup, name));
  }
}
if (existsSync(cliPath)) save(cliPath);
writeFileSync(cliPath, JSON.stringify(cli, null, 2) + "\n");
mkdirSync(join(config, "command"), { recursive: true });
copyFileSync(join(source, "command", "go-whoami.md"), join(config, "command", "go-whoami.md"));
const mapping = join(config, "go-accounts.json");
if (!existsSync(mapping)) copyFileSync(join(source, "go-accounts.example.json"), mapping);
console.log(`Installed OpenCode v2 plugin and sidebar in ${destination}`);
if (existsSync(backup)) console.log(`Previous installation backed up in ${backup}`);
console.log("Restart OpenCode, then use /go-whoami.");
