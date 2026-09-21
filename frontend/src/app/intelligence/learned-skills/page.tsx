import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, CodeBlock, Panel, TryIt } from "@/components/ui";

const ADAPTER_ROW = `| Microsoft Agent Framework | CopilotKit.Intelligence.AgentFramework | SkillRegistryContextProvider and AddCopilotKitIntelligenceSkills |

using CopilotKit.Intelligence.AgentFramework;
using Microsoft.Agents.AI;

using var skills = new SkillRegistryContextProvider(new SkillRegistryOptions());
await skills.InitializeAsync();
var agent = skills.CreateAgent(chatClient, new ChatClientAgentOptions { ... });

  "The adapter targets .NET 9 and Agent Framework >=1.0.0,<2.0.0."`;

const UV_RESOLVE = `$ curl -o /dev/null -w '%{http_code}' https://pypi.org/pypi/copilotkit-intelligence-runtime/json
404
$ curl -o /dev/null -w '%{http_code}' https://pypi.org/pypi/copilotkit-intelligence-langgraph/json
404
$ curl -o /dev/null -w '%{http_code}' https://pypi.org/pypi/copilotkit-intelligence-adk/json
404`;

/** The 2026-09-21 sync's new classic-mode snippet, as published. */
const BUILT_IN_CLASSIC = `import { BuiltInAgent } from "@copilotkit/runtime/v2";

const agent = new BuiltInAgent({
  model: "openai/gpt-4o",
  prompt: "Follow the application's support policy.",
  learnedSkills: {
    containerId: "support-learning",
    // revision: "exact-revision-id", // Optional: pin a published revision.
  },
});`;

/** And its factory-mode snippet, as published. */
const BUILT_IN_FACTORY = `import {
  BuiltInAgent,
  convertMessagesToVercelAISDKMessages,
} from "@copilotkit/runtime/v2";
import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText } from "ai";

const agent = new BuiltInAgent({
  type: "aisdk",
  learnedSkills: { containerId: "support-learning" },
  factory: ({ input, abortSignal, learnedSkills }) =>
    streamText({
      model: openai("gpt-4o"),
      system: [
        "Follow the application's support policy.",
        learnedSkills.catalog,
      ].filter(Boolean).join("\\n\\n"),
      messages: convertMessagesToVercelAISDKMessages(input.messages),
      tools: { ...learnedSkills.tools },
      stopWhen: stepCountIs(10),
      abortSignal,
    }),
});`;

/** Both snippets, compiled against the installed runtime. */
const BUILT_IN_ERRORS = `$ npx tsc --noEmit    # classic mode, snippet verbatim
error TS2353: Object literal may only specify known properties, and
  'learnedSkills' does not exist in type 'BuiltInAgentConfiguration'.

$ npx tsc --noEmit    # factory mode, snippet verbatim
error TS2353: Object literal may only specify known properties, and
  'learnedSkills' does not exist in type
  'BuiltInAgentClassicConfig | BuiltInAgentAISDKFactoryConfig'.
error TS2339: Property 'learnedSkills' does not exist on type
  'AgentFactoryContext'.

$ npx tsc --noEmit    # the type the prose says to import
error TS2724: '"@copilotkit/runtime/v2"' has no exported member named
  'BuiltInAgentFactoryContext'. Did you mean 'AgentFactoryContext'?

# @copilotkit/runtime 1.69.2 (declared ^1.69.2), ai 6.0.256, @ai-sdk/openai 3.0.97`;

export default function Page() {
  return (
    <>
      <RouteHeader path="/intelligence/learned-skills" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Automatic learned skill delivery is meant to put one Learning
          container&apos;s published skills in front of an agent without a CLI
          download or a restart. A framework adapter adds an alphabetical
          catalog and two tools —{" "}
          <code>copilotkit_load_skill</code> and{" "}
          <code>copilotkit_read_skill_file</code> — and the model decides when
          to load a skill. This route is where that would be wired for the
          Microsoft Agent Framework backend this repo runs.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={[
              "List the skills you can load, then load the refund-policy skill and follow it.",
            ]}
            expect="The agent calls copilotkit_load_skill, reads SKILL.md, and answers following the published skill."
            fail="What actually happens: the agent answers from its own instructions. Neither tool exists. The page's only Microsoft Agent Framework adapter is a .NET package while this section's backend is Python, and the BuiltInAgent row added on 2026-09-21 does not compile at the installed runtime."
          />
        </div>
      </Panel>

      <Panel
        title="BuiltInAgent: the row that arrived on 2026-09-21"
        description="The first adapter on the page that this repo could actually run, since it lives in the TypeScript runtime rather than in the Python agent."
      >
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The sync added a <code>BuiltInAgent</code> row to the adapter table
          against <code>@copilotkit/runtime/v2</code>, the package this repo
          already depends on, with &ldquo;no wrapper or separate adapter package
          required&rdquo;. Both of its snippets are below as published.
        </p>
        <div className="mt-4 space-y-4">
          <CodeBlock filename="Classic mode" language="typescript" code={BUILT_IN_CLASSIC} />
          <CodeBlock filename="Factory mode" language="typescript" code={BUILT_IN_FACTORY} />
        </div>
        <div className="mt-4">
          <Callout tone="warn" title="Neither snippet compiles at the installed runtime">
            <code>learnedSkills</code> is not a property of{" "}
            <code>BuiltInAgentConfiguration</code> in{" "}
            <code>@copilotkit/runtime</code> 1.69.2, in either mode, and the
            factory context has no <code>learnedSkills</code> either. The prose
            also says to import <code>BuiltInAgentFactoryContext</code> from{" "}
            <code>@copilotkit/runtime/v2</code>; that name is not exported, and
            the compiler suggests <code>AgentFactoryContext</code>, which is the
            type the factory actually receives. Only{" "}
            <code>convertMessagesToVercelAISDKMessages</code> resolves. Shown as
            quoted text rather than shipped code for the reason the rest of this
            repo does: a file that cannot compile takes the whole frontend
            typecheck down with it, and the snippet is the finding either way.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {BUILT_IN_ERRORS}
            </pre>
          </Callout>
        </div>
        <div className="mt-4">
          <Callout tone="warn" title="The env var the Learning page hands you does nothing here">
            <a href="/learning" className="underline">
              Learning
            </a>{" "}
            tells you to configure the adapter with{" "}
            <code>CPK_INTELLIGENCE_LEARNING_CONTAINER_ID</code> in the agent
            server environment. This section says the opposite for this adapter:
            &ldquo;Omitting the configuration disables all skill requests, even
            when delivery environment variables exist.&rdquo; For{" "}
            <code>BuiltInAgent</code> the container has to be named in code. The
            Learning page&apos;s manual-setup list does not mention{" "}
            <code>BuiltInAgent</code> at all, though it is now the first row of
            this page&apos;s table.
          </Callout>
        </div>
      </Panel>

      <Callout tone="warn" title="The only Microsoft Agent Framework adapter is .NET, on a Python page">
        This page is published at{" "}
        <code>/ms-agent-python/intelligence/learned-skills</code> — the Python
        section. Its adapter table has exactly one Microsoft Agent Framework
        row, and that row is{" "}
        <code>CopilotKit.Intelligence.AgentFramework</code>, a C# package
        targeting <code>net9.0</code>. The worked example is C#. There is no
        Python path for this framework anywhere on the page, and nothing on it
        says so — a reader in the Python section reaches the setup section and
        finds the only snippet for their framework is in another language.
        <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {ADAPTER_ROW}
        </pre>
      </Callout>

      <Callout tone="warn" title="Every Python package the page names is absent from PyPI">
        Even taking the non-native route, the page says “Python uses{" "}
        <code>copilotkit-intelligence-runtime</code>”. That package does not
        exist, and neither do the two Python adapters it lists for other
        frameworks. Checked 2026-09-16. The TypeScript siblings{" "}
        <em>are</em> published (<code>@copilotkit/intelligence-langgraph</code>{" "}
        and <code>@copilotkit/intelligence-mastra</code>, both 1.71.2, published
        2026-09-14), so the whole feature is not unreleased — the Python half of
        it is missing.
        <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {UV_RESOLVE}
        </pre>
      </Callout>

      <Callout tone="warn" title="“Deployment requirements” admits this at the bottom, not the top">
        The page&apos;s closing section: “The server migration and v1 delivery
        endpoint must deploy before adapters rely on them. Each adapter also
        requires a published canonical client version with the learned-snapshot
        operation.” That is the page saying the feature may not be live — placed
        after every setup snippet, with nothing earlier marked unavailable. A
        reader following the page in order writes the wiring first.
      </Callout>

      <Callout tone="warn" title="One page, three sections, one nominally applicable adapter">
        The same page is served byte-identically under{" "}
        <code>/ms-agent-python</code>, <code>/agno</code> and{" "}
        <code>/deepagents</code>, differing only in the flavour inside its own
        links. Agno appears nowhere in the adapter table. Deep Agents maps to
        the LangGraph Python adapter — which 404s. So of the three sections that
        publish this page, none can follow it.
      </Callout>

      <Callout tone="warn" title="“Both tools remain registered” became two rules">
        The Read tools section used to open with &ldquo;Both tools remain
        registered even when the snapshot is empty&rdquo;. It now says the
        framework adapters do that while <code>BuiltInAgent</code> omits both
        tools for an empty snapshot and hands its factory{" "}
        <code>tools: {"{}"}</code>. Nothing in the demo below changes: the tools are
        absent here because no adapter can be mounted at all, not because a
        snapshot came back empty.
      </Callout>

      <Callout tone="premium" title="Not exercised here">
        Everything past installation: the freshness window and shared refresh,
        per-invocation snapshot pinning, <code>latest</code> versus an exact{" "}
        <code>CPK_INTELLIGENCE_SKILLS_REVISION</code>, revocation blocking new
        invocations, the stale-snapshot fallback, and the read-only status
        fields. All of it needs an adapter this backend cannot install plus a
        provisioned Learning container with published skills.
      </Callout>

      <Panel title="Source">
        <SourceCode file="frontend/src/app/intelligence/learned-skills/demo-chat/page.tsx" />
      </Panel>
    </>
  );
}
