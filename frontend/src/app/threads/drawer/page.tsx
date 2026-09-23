import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, Panel, TryIt } from "@/components/ui";

export default function Page() {
  return (
    <>
      <RouteHeader path="/threads/drawer" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The drop-in conversation sidebar. The claim worth testing is the one
          about wiring: put <code>&lt;CopilotThreadsDrawer&gt;</code> and{" "}
          <code>&lt;CopilotChat&gt;</code> under one{" "}
          <code>&lt;CopilotChatConfigurationProvider&gt;</code> and neither
          selection state nor a thread-select handler is yours to write.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The demo has three tabs. <strong>Zero props</strong> is the doc&apos;s
          integration verbatim. <strong>Customized</strong> is the same drawer
          with <code>renderRow</code>, <code>limit</code>, and the two label
          overrides — every documented customization that works in 1.68.2.{" "}
          <strong>Sidebar host</strong> is the 2026-09-22 section &ldquo;Use the
          Drawer with a sidebar chat&rdquo;: the drawer beside{" "}
          <code>&lt;CopilotSidebar defaultOpen&gt;</code>, which renders a{" "}
          <code>CopilotChat</code> inside itself and so reads the same
          configuration. That snippet renders <code>&lt;YourMainContent /&gt;</code>{" "}
          without defining it; the demo supplies a placeholder.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The same sync added two callouts. The drawer ships only in{" "}
          <code>@copilotkit/react-core/v2</code>. And its chat-header launcher
          appears on mobile viewports only; on desktop the drawer is always
          visible, so no launcher is the intended result.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={["Can you tell me a joke?"]}
            expect="A row appears in the drawer, auto-named after the first exchange. Start a second conversation, then click back to the first — its transcript replays."
            fail="The drawer shows a locked panel instead of a list, which means the runtime is not reporting a valid license — see /threads."
          />
        </div>
      </Panel>

      <Panel title="The demo">
        <SourceCode file="frontend/src/app/threads/drawer/demo-chat/page.tsx" />
      </Panel>

      <Panel title="What the drawer does not do">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The per-row kebab menu covers archive, unarchive, and delete.{" "}
          <strong>Rename is absent</strong> — the doc says so plainly and points
          at <code>useThreads</code> for it, which is one concrete reason the{" "}
          <a
            href="/threads/headless"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            headless page
          </a>{" "}
          exists rather than being a stylistic alternative.
        </p>
      </Panel>

      <Callout tone="warn" title="The slots escape hatch does not work here">
        The doc&apos;s customization section shows projecting children with a{" "}
        <code>slot</code> attribute (<code>header</code>, <code>empty</code>,{" "}
        <code>footer</code>, <code>memories</code>,{" "}
        <code>launcher-icon</code>). The underlying{" "}
        <code>&lt;copilotkit-threads-drawer&gt;</code> web component does
        declare all five, but the React wrapper in{" "}
        <code>@copilotkit/react-core</code> 1.68.2 declares no{" "}
        <code>children</code> on <code>CopilotThreadsDrawerProps</code> and
        renders the element with only <code>renderRow</code> output as its
        children — so passing them is a type error, and would be silently
        dropped even if it were not. Reported rather than worked around; see
        FINDINGS.md.
      </Callout>

      <Callout tone="warn" title="Two providers deep">
        The drawer needs a chat configuration <em>and</em> the threads runtime,
        so this route nests <code>ThreadsProvider</code> inside the app-wide
        provider and <code>CopilotChatConfigurationProvider</code> inside that.
        The doc&apos;s sample shows a single top-level{" "}
        <code>CopilotKitProvider</code> because it assumes the whole app is the
        threads app; here only this section is.
      </Callout>
    </>
  );
}
