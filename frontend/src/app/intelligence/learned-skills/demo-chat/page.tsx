"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";

import { DemoFrame } from "@/components/demo-frame";

/**
 * Automatic learned skill delivery, against this repo's quickstart agent.
 *
 * There is no adapter to mount. The page's only Microsoft Agent Framework
 * adapter is `CopilotKit.Intelligence.AgentFramework`, a .NET 9 package, and
 * this section's backend is Python; the base client the page says Python uses,
 * `copilotkit-intelligence-runtime`, is not on PyPI either. So
 * `SkillRegistryContextProvider` cannot be constructed here in any language
 * this repo runs, and the two tools it would register never exist.
 *
 * The 2026-09-21 sync added a second candidate, `BuiltInAgent`, which would run
 * in the TypeScript runtime this app already has. It does not help: at
 * `@copilotkit/runtime` 1.69.2 `learnedSkills` is not a property of
 * `BuiltInAgentConfiguration` in either mode, so neither published snippet
 * compiles. The route page carries the compiler output.
 *
 * The demo shows the absence rather than faking the presence: the agent is
 * this repo's normal `my_agent`, and the prompt asks for the exact tool names
 * the page reserves. The agent answers from its own instructions with no tool
 * call, which is what a reader following the page ends up with.
 *
 * The tool names below are quoted from the page's "Read tools" section. They
 * are listed as text, not registered — registering look-alike tools would make
 * the page appear to work and destroy the finding.
 */

const RESERVED_TOOLS = [
  "copilotkit_load_skill(skill_name)",
  "copilotkit_read_skill_file(skill_name, path)",
] as const;

function SkillToolProbe() {
  return (
    <div className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Tools the adapter would register
      </h2>
      <table data-testid="skill-tool-probe" className="w-full text-left text-xs">
        <tbody className="font-mono">
          {RESERVED_TOOLS.map((tool) => (
            <tr
              key={tool}
              className="border-t border-slate-200 first:border-0 dark:border-slate-800"
            >
              <th className="py-1 pr-3 font-medium text-slate-500">{tool}</th>
              <td data-testid="skill-tool-status" className="py-1 text-rose-600 dark:text-rose-400">
                not registered: .NET adapter, or learnedSkills at 1.69.2
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 font-mono text-[11px] text-slate-500">
        CopilotKit.Intelligence.AgentFramework targets net9.0 · this backend is Python
        <br />
        BuiltInAgent.learnedSkills · TS2353 at @copilotkit/runtime 1.69.2
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <DemoFrame
      parentPath="/intelligence/learned-skills"
      subtitle="skill delivery · no Python adapter"
    >
      <div className="flex h-full flex-col">
        <SkillToolProbe />
        <div className="min-h-0 flex-1">
          <CopilotChat agentId="my_agent" />
        </div>
      </div>
    </DemoFrame>
  );
}
