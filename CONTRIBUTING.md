# Contributing to opencode-go-whoami

Thanks for contributing. This is a small plugin with one strict rule, so please follow this workflow.

## The one strict rule: local-only, key-safe

- **No network calls.** Everything must run locally and deterministically. Never add a fetch/HTTP dependency or phone home for any reason.
- **Never print, log, or transmit a full API key.** Only masked snippets (first/last few characters) and one-way key fingerprints may leave the machine.
- **Never commit real key material.** Not full keys, and not even masked snippets or fingerprints of real keys — examples and screenshots must use obviously fake values (e.g. `sk-AcMe…0000`). Before committing, run:
  ```sh
  git diff --cached | grep -iE "sk-[A-Za-z0-9]{4}" | grep -v "sk-AcMe\|sk-SaMp" && echo "POSSIBLE REAL KEY FRAGMENT — stop and check"
  ```

## Workflow

- Prefer opening an issue before starting features or behavioral changes. Small fixes can go straight to a PR with a short rationale.
- Keep PRs small and focused; one change per PR.

## Verify before opening a PR

```sh
sh -n scripts/setup.sh scripts/link-global.sh
bun test                       # uses fake credentials and temporary config directories
```

The tests cover the server tool, guided setup, repeated upgrades, preserved labels/settings, and legacy symlink migration. Install the `@opencode/plugin` peer before running them. For type-checking, use TypeScript with `@types/node`, `solid-js`, `@opentui/core`, and `@opentui/solid` available, then run `tsc --noEmit`.

When checking against a running v2 server, allow plugin initialization to finish before asserting on `plugin.list`: immediately after startup it may return an empty list.

## Screenshots

Changes to visible output (sidebar panel, `/go-whoami` text) need a before-and-after screenshot. **Redact everything**: keys, fingerprints, emails, and paths must be fake or blurred.

## License

By contributing, you agree your changes are released under the [MIT License](LICENSE.md).
