# Which OpenCode Go account am I using?

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

A tiny plugin that answers: **"which account am I signed in with right now?"**

It shows each signed-in key as a masked snippet plus the **email you assign to it**, because OpenCode itself only stores keys — not emails. The safe source for the real email is always https://opencode.ai/auth.

Requires **OpenCode v2**. The server tool and sidebar use the v2 plugin API.

## Upgrade an existing installation

If v2 reports “Plugin must export a default definition with an id and an effect or setup function”, run:

```sh
sh scripts/link-global.sh
```

Restart OpenCode afterwards. This updates the plugin and sidebar without asking for your emails again. Existing labels are kept, and legacy plugin files are moved to `~/.config/opencode/backups/`.

## Install (one command, ~1 minute)

```sh
sh scripts/setup.sh
```

That's it. The setup:

1. finds your signed-in keys,
2. asks you which email each one belongs to,
3. saves your answers, installs the plugin + permanent sidebar panel, and adds a `/go-whoami` command.

It looks like this:

```
Found your signed-in keys:
  - opencode-go  sk-AcMe…0000  (id a1b2c3d4e5f6)
  - opencode     sk-SaMp…1111  (id f6e5d4c3b2a1)

Email for opencode-go (sk-AcMe…0000)? you@example.com
Email for opencode (sk-SaMp…1111)? [Enter to skip]

Done! Restart opencode, then type  /go-whoami
```

Then restart opencode. From now on:

- **Your email shows permanently** in the session sidebar, in a small `Account` panel next to Quota:

```
Account
you@example.com
```

- `/go-whoami` still works for full details (all keys, fingerprints).

If you skipped labelling a key, the sidebar shows `(unlabelled sk-AcMe…0000)` instead of an email — just re-run the setup.

## I switched accounts — now what?

Sign in as usual (`opencode auth login`), then re-run:

```sh
sh scripts/setup.sh
```

Your old answers are kept as a backup (`go-accounts.json.bak-<date>`), and the new key gets labelled.

## Just want a quick check without installing?

```sh
node bin/cli.mjs
```

Shows your keys and their short IDs, no setup needed.

## Uninstall

Delete the installed plugin directory and command, then remove the `go-whoami` package entry from `cli.json`:

```sh
rm -r ~/.config/opencode/plugins/go-whoami
rm ~/.config/opencode/command/go-whoami.md
```

If you upgraded from v1, also remove the old `go-whoami-tui.tsx` entry from `tui.json` if you still use that file.

Your email list (`~/.config/opencode/go-accounts.json`) stays until you delete it.

## Questions

**Why can't it just read my email automatically?**
OpenCode's sign-in file (`~/.local/share/opencode/auth.json`) contains API keys only — there is no email in it to display. So the setup asks you once and remembers your answer per key.

**What is the "id" next to my key?**
A short ID computed from your key, used only to tell keys apart. Your full key is never shown or sent anywhere — the plugin only ever displays the first/last few characters.

**Does this send my keys anywhere?**
No. Everything runs locally on your machine.

**Where are my answers stored?**
In `~/.config/opencode/go-accounts.json` — a plain text file you can view or edit anytime.

## For developers

- `src/whoami.ts` — finds keys, computes short IDs, matches your email list
- `src/index.ts` — the opencode server plugin (provides the `go_whoami` tool)
- `src/tui.tsx` — the TUI plugin (permanent `Account` sidebar panel)
- `bin/cli.mjs` — terminal check with no dependencies
- `command/go-whoami.md` — the `/go-whoami` slash command
- `scripts/setup.sh` — the guided installer above
- `scripts/link-global.sh` — install or upgrade without changing email labels
- `scripts/install.mjs` — shared v2 installer; respects `XDG_CONFIG_HOME`

## License

MIT — see [LICENSE.md](LICENSE.md).
