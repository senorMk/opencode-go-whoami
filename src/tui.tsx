/** @jsxImportSource @opentui/solid */
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
} from "@opencode-ai/plugin/tui";
import { createSignal, onCleanup, Show } from "solid-js";
import { buildReport } from "./whoami.js";

const id = "opencode-go-whoami";
// Sit next to the Quota panel (order 150) in the session sidebar.
const SIDEBAR_ORDER = 140;

function AccountSidebar(props: { api: TuiPluginApi }) {
  const [report, setReport] = createSignal(buildReport());

  const refresh = () => {
    try {
      setReport(buildReport());
    } catch {
      // Keep the last good state; never break the sidebar.
    }
  };
  const offSelect = props.api.event.on("tui.session.select", refresh);
  const offUpdated = props.api.event.on("session.updated", refresh);
  onCleanup(() => {
    offSelect();
    offUpdated();
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
          <text fg={props.api.theme.current.text}>
            <b>Account</b>
          </text>
        </box>
        <text fg={props.api.theme.current.textMuted} wrapMode="none">
          {line()}
        </text>
      </box>
    </Show>
  );
}

const tui: TuiPlugin = async (api, options) => {
  const enabled =
    (options as { enabled?: boolean } | undefined)?.enabled !== false;
  if (!enabled) return;

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content() {
        return <AccountSidebar api={api} />;
      },
    },
  });
};

const pluginModule: TuiPluginModule = { id, tui };
export default pluginModule;
