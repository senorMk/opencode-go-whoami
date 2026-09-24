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
sh -n scripts/setup.sh          # shell syntax
node bin/cli.mjs                # terminal check still works
```

If you touched `src/tui.tsx` or `scripts/setup.sh`, also run the sandboxed end-to-end install (uses a throwaway fake home — your real `~/.config/opencode` is never touched):

```sh
T=$(mktemp -d) && mkdir -p "$T/.local/share/opencode" \
  && printf '{"opencode-go":{"type":"api","key":"sk-testFakeKey1234567890abcdef"}}' > "$T/.local/share/opencode/auth.json" \
  && printf 'me@example.com\n' | HOME="$T" sh scripts/setup.sh \
  && cat "$T/.config/opencode/tui.json" && rm -rf "$T"
```

## Screenshots

Changes to visible output (sidebar panel, `/go-whoami` text) need a before-and-after screenshot. **Redact everything**: keys, fingerprints, emails, and paths must be fake or blurred.

## License

By contributing, you agree your changes are released under the [MIT License](LICENSE.md).
