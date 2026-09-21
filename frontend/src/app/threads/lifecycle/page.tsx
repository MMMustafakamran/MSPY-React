import { RouteHeader } from "@/components/route-header";
import { SourceCodeGroup } from "@/components/source-code";
import { Callout, Panel, TryIt } from "@/components/ui";

export default function Page() {
  return (
    <>
      <RouteHeader path="/threads/lifecycle" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Every lifecycle claim on the page, one button each, with the chat&apos;s
          real resolved state read back after every step: the auto-minted{" "}
          <code>threadId</code>, a remount re-minting it, re-opening the first
          thread with <code>setActiveThreadId(id, {"{"} explicit: true {"}"})</code>{" "}
          and watching its history replay, <code>startNewThread()</code>, then a
          pinned <code>threadId</code> prop that makes both setters no-op and
          survives a remount. A ledger keeps every id the chat has been on, so a
          re-mint reads as a before and after.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={["Say hello in one short sentence."]}
            expect="Remount gives a new id and an empty chat. Open conversation returns to the first id with its messages replayed. With a threadId pinned, New chat changes nothing and the amber line shows the Ignoring startNewThread() warning."
            fail="Open conversation returns to the id but the message count stays at 0: nothing replayed, so the runtime's store is not answering connect()."
          />
        </div>
      </Panel>

      <Panel title="The demo">
        <SourceCodeGroup
          files={[
            { file: "frontend/src/app/threads/lifecycle/demo-chat/page.tsx" },
            { file: "frontend/src/app/api/copilotkit/[[...slug]]/route.ts" },
            {
              file: "frontend/src/app/api/copilotkit-threads/[[...slug]]/route.ts",
            },
          ]}
          note={
            <>
              The demo runs on <code>/api/copilotkit</code>, whose{" "}
              <code>InMemoryAgentRunner</code> replays a thread&apos;s history
              from <code>connect()</code>: the page&apos;s &ldquo;persisting
              AgentRunner&rdquo; case, for the life of the process. The
              Intelligence runtime is listed for <code>identifyUser</code>, the
              contract the &ldquo;scope Rich Threads to the signed-in user&rdquo;
              section describes. Ours is static, which the doc calls
              single-user-demo only.
            </>
          }
        />
      </Panel>

      <Panel title="Pick one source of truth">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <code>setActiveThreadId</code> and <code>startNewThread</code> both
          no-op with a console warning when the <code>threadId</code> is
          prop-controlled. The demo shows both halves: until you press{" "}
          <em>Pin a threadId prop</em> it passes none and the setters drive the
          chat; after, the same <em>New chat</em> button does nothing, and the
          only evidence is the warning the demo surfaces on screen. Compare the{" "}
          <a
            href="/threads/headless"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            headless route
          </a>
          , which drives the prop and never calls the setters.
        </p>
      </Panel>

      <Callout tone="warn" title="Auto-minted ids re-mint on remount">
        The fallback id comes from <code>useMemo</code>, so a changed React{" "}
        <code>key</code>, a parent remount, or StrictMode&apos;s double-mount in
        dev produces a new id and silently starts a new conversation. Mint it
        yourself if it has to survive.
      </Callout>

      <Callout tone="warn" title="Not implemented here">
        The doc&apos;s &ldquo;create a thread with your own API on the first
        message&rdquo; section needs a backend that mints thread rows, which
        this harness does not have. The headless variant it recommends —
        composing <code>CopilotChatInput</code> and setting{" "}
        <code>agent.threadId</code> before an imperative send — is left
        unimplemented rather than faked.
      </Callout>
    </>
  );
}
