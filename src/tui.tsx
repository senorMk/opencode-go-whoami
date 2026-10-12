/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui";
import { createSignal, onCleanup, Show } from "solid-js";
import { buildReport } from "./whoami.js";

function AccountSidebar(props: { api: Plugin.Context }) {
  const [report, setReport] = createSignal(buildReport());

  const refresh = () => {
    try {
      setReport(buildReport());
    } catch {
      // Keep the last good state; never break the sidebar.
    }
  };
  const offUpdated = props.api.data.on("session.step.ended", refresh);
  // Also pick up account changes made outside the current session.
  const timer = setInterval(refresh, 5000);
  onCleanup(() => {
    offUpdated();
    clearInterval(timer);
  });

  const primary = () =>
    report().accounts.find((a) => a.provider === "opencode-go") ??
    report().accounts[0];

  const line = () => {
    const p = primary();
    if (!p) return "no signed-in account";
    if (p.email) return p.email;
    // Unlabelled: show the masked key so it can still be told apart,
    // and re-running setup.sh will offer to label it.
    return `(unlabelled ${p.masked})`;
  };

  return (
    <Show when={primary()}>
      <box gap={0}>
        <box flexDirection="row">
          <text fg={props.api.theme.text.base}>
            <b>Account</b>
          </text>
        </box>
        <text fg={props.api.theme.text.muted} wrapMode="none">
          {line()}
        </text>
      </box>
    </Show>
  );
}

export default Plugin.define({
  id: "opencode-go-whoami",
  setup(api) {
    if (api.options.enabled === false) return;
    return api.ui.slot({
      append: "sidebar.content",
      render: () => <AccountSidebar api={api} />,
    });
  },
});
