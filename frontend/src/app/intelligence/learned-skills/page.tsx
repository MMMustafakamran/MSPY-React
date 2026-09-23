import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, CodeBlock, Panel, TryIt } from "@/components/ui";

const ADAPTER_ROW = `| Microsoft Agent Framework | CopilotKit.Intelligence.AgentFramework | SkillRegistryContextProvider and AddCopilotKitIntelligenceSkills |

using CopilotKit.Intelligence.AgentFramework;
using Microsoft.Agents.AI;

using var skills = new SkillRegistryContextProvider(new SkillRegistryOptions
{
    // Set these here, or omit them to use environment variables (linked above).
    ContainerId = "support-learning",
    Revision = "exact-revision-id", // Optional: pin a published revision.
});
await skills.InitializeAsync();
var agent = skills.CreateAgent(chatClient, new ChatClientAgentOptions { ... });

  "The adapter targets .NET 9 and Agent Framework >=1.0.0,<2.0.0."`;

const UV_RESOLVE = `$ curl -o /dev/null -w '%{http_code}' https://pypi.org/pypi/copilotkit-intelligence-runtime/json
404
$ curl -o /dev/null -w '%{http_code}' https://pypi.org/pypi/copilotkit-intelligence-langgraph/json
404
$ curl -o /dev/null -w '%{http_code}' https://pypi.org/pypi/copilotkit-intelligence-adk/json
404`;

/** The classic-mode snippet, as published (revision uncommented 2026-09-23). */
const BUILT_IN_CLASSIC = `import { BuiltInAgent } from "@copilotkit/runtime/v2";

const agent = new BuiltInAgent({
  model: "openai/gpt-4o",
  prompt: "Follow the application's support policy.",
  learnedSkills: {
    // Set these here, or omit them to use environment variables (linked above).
    containerId: "support-learning",
    revision: "exact-revision-id", // Optional: pin a published revision.
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
  learnedSkills: {
    // Set these here, or omit them to use environment variables (linked above).
    containerId: "support-learning",
    revision: "exact-revision-id", // Optional: pin a published revision.
  },
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

/**
 * Both snippets, compiled verbatim in a throwaway probe against the installed
 * runtime, then and now. Kept side by side so the resolution is not silent.
 */
const BUILT_IN_ERRORS = `# @copilotkit/runtime 1.69.2 (declared ^1.69.2), 2026-09-21 snippets
$ npx tsc --noEmit    # classic mode, snippet verbatim
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

# @copilotkit/runtime 1.73.3 (declared ^1.73.3), 2026-09-23 snippets
$ npx tsc --noEmit    # classic + factory verbatim, and the import
(no output, exit 0)

# ai 6.0.256, @ai-sdk/openai 3.0.97, typescript 5.9.3`;

export default function Page() {
  return (
    <>
      <RouteHeader path="/intelligence/learned-skills" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Skill delivery is meant to put one Learning
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
            fail="What actually happens: the agent answers from its own instructions. Neither tool exists. The page's only Microsoft Agent Framework adapter is a .NET package while this section's backend is Python, and the BuiltInAgent row, which compiles at @copilotkit/runtime 1.73.3, would replace this repo's Python agent rather than deliver skills to it, so it is not mounted."
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
          <Callout tone="info" title="Both snippets compile at 1.73.3; they did not at 1.69.2">
            Resolved at <code>@copilotkit/runtime</code> 1.73.3 (declared{" "}
            <code>^1.73.3</code>); failed at 1.69.2 (declared{" "}
            <code>^1.69.2</code>); the page states no minimum version. At
            1.69.2 <code>learnedSkills</code> was not a property of{" "}
            <code>BuiltInAgentConfiguration</code> in either mode, the factory
            context had no <code>learnedSkills</code>, and{" "}
            <code>BuiltInAgentFactoryContext</code> was not exported. At 1.73.3
            all three exist and both snippets, as published today, typecheck.
            They stay quoted rather than mounted: a <code>BuiltInAgent</code>{" "}
            is a TypeScript agent that would replace this repo&apos;s Microsoft
            Agent Framework agent, not deliver skills to it, and it still needs a
            provisioned Learning container with published skills.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {BUILT_IN_ERRORS}
            </pre>
          </Callout>
        </div>
        <div className="mt-4">
          <Callout tone="warn" title="Every snippet now ships a placeholder revision pin, live">
            Each Skill delivery snippet now carries{" "}
            <code>revision: &quot;exact-revision-id&quot;, // Optional: pin a published revision.</code>{" "}
            uncommented (<code>revision=</code> in Python,{" "}
            <code>Revision =</code> in .NET). Copied as published, every adapter
            pins a revision that does not exist. The page does say to
            &ldquo;Replace <code>&quot;exact-revision-id&quot;</code> with a
            published revision ID, or remove that parameter&rdquo;, but once,
            above all the examples, while the line itself is labelled
            &ldquo;Optional&rdquo;. Its own &ldquo;Make sure delivery
            works&rdquo; check then has to tell you to remove it again.
          </Callout>
        </div>
        <div className="mt-4">
          <Callout tone="warn" title="&ldquo;Omit them to use environment variables&rdquo; beside &ldquo;Omitting the configuration disables all skill requests&rdquo;">
            The page now says, before the examples and again above each one,
            &ldquo;Set the container and revision in code below,{" "}
            <strong>or</strong> omit those parameters and use environment
            variables&rdquo;, and inside every snippet &ldquo;Set these here, or
            omit them to use environment variables (linked above).&rdquo; The
            factory-mode prose is unchanged: &ldquo;Omitting the configuration
            disables all skill requests, even when delivery environment
            variables exist.&rdquo; For <code>BuiltInAgent</code> those only
            agree if you omit the two fields but keep an empty{" "}
            <code>learnedSkills: &#123;&#125;</code>, and the page never says
            so. The installed runtime (1.73.3) matches the stricter sentence:{" "}
            <code>BuiltInAgent</code> builds no skill registry when{" "}
            <code>learnedSkills</code> is <code>undefined</code>, and only a
            registry reads <code>CPK_INTELLIGENCE_LEARNING_CONTAINER_ID</code>.{" "}
            <a href="/learning" className="underline">
              Automatic Learning
            </a>
            &apos;s manual path is that env block, so a reader who takes it for{" "}
            <code>BuiltInAgent</code> and drops the object gets an agent that
            requests nothing and reports no error.
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

      <Callout tone="warn" title="Two Python adapters are now marked pending; the base Python client is not">
        The page now puts a &ldquo;Python adapter pending release&rdquo; warning
        on LangGraph Python (&ldquo;<code>copilotkit-intelligence-langgraph</code>{" "}
        is not yet published on PyPI&rdquo;) and on Google ADK (the same for{" "}
        <code>copilotkit-intelligence-adk</code>). The base client it names in
        the same breath is still unflagged: &ldquo;Python uses{" "}
        <code>copilotkit-intelligence-runtime</code>&rdquo;, and that package
        still 404s. Checked 2026-09-23. The TypeScript siblings{" "}
        <em>are</em> published (<code>@copilotkit/intelligence-langgraph</code>{" "}
        and <code>@copilotkit/intelligence-mastra</code>, both 1.71.2, published
        2026-09-14), so the gap is Python-side.
        <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {UV_RESOLVE}
        </pre>
      </Callout>

      <Callout tone="warn" title="&ldquo;Deployment requirements&rdquo; is still at the bottom">
        The page&apos;s closing section: &ldquo;The server migration and v1
        delivery endpoint must deploy before adapters rely on them. Each adapter
        also requires a published canonical client version with the
        learned-snapshot operation.&rdquo; The two new &ldquo;pending
        release&rdquo; callouts cover the LangGraph Python and ADK packages
        only; nothing above the setup snippets says the delivery endpoint itself
        may not be deployed.
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
