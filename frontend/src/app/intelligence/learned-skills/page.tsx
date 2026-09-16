import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, Panel, TryIt } from "@/components/ui";

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
            fail="What actually happens: the agent answers from its own instructions. Neither tool exists — the only Microsoft Agent Framework adapter the page offers is a .NET package, and this section's backend is Python."
          />
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
