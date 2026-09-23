import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, CodeBlock, Panel, TryIt } from "@/components/ui";

/** The slot path, as published at the top of the page. */
const SLOT_PATH = `<CopilotChat
  messageView={{
    assistantMessage: {
      markdownRenderer: {
        /* ... */
      },
    },
  }}
/>`;

/** "Custom tags are not supported", the error the page publishes. */
const PUBLISHED_CUSTOM_TAG_ERROR = `error TS2353: Object literal may only specify known properties,
and '"reference-chip"' does not exist in type 'Components'.`;

/** The same key, compiled here. */
const MEASURED_CUSTOM_TAG_ERROR = `# a throwaway probe file, deleted after the run:
#   components: { "reference-chip": ({ children }) => <span>{children}</span> }

$ npx tsc --noEmit
src/__probe_custom_tag.tsx(11,15): error TS2353: Object literal may only specify
  known properties, and '"reference-chip"' does not exist in type 'Components'.
src/__probe_custom_tag.tsx(11,36): error TS7031: Binding element 'children'
  implicitly has an 'any' type.

# streamdown 1.6.11 (transitive, via @copilotkit/react-core 1.69.2), typescript 5.9.3`;

/** The tag as the default renderer emits it, quoted from the page. */
const PUBLISHED_DEFAULT_LINK = `<a class="wrap-anywhere font-medium text-primary underline"
data-streamdown="link" …>`;

export default function Page() {
  return (
    <>
      <RouteHeader path="/custom-look-and-feel/markdown" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Assistant replies arrive as markdown, and CopilotKit renders them
          through one slot: <code>markdownRenderer</code> on{" "}
          <code>CopilotChatAssistantMessage</code>, whose default wraps
          Streamdown. The page gives three ways in, and the demo mounts all
          three unchanged: a props override carrying Streamdown&apos;s{" "}
          <code>components</code> map, a class string merged onto the markdown
          container, and a component that replaces the renderer outright and is
          handed a single <code>content</code> prop.
        </p>

        <div className="mt-4">
          <CodeBlock
            filename="The slot path, as published"
            language="tsx"
            code={SLOT_PATH}
          />
        </div>

        <div className="mt-4">
          <TryIt
            prompts={[
              "Reply in markdown with a level-2 heading, a sentence containing a link to https://copilotkit.ai, an inline <kbd>Ctrl</kbd>, a footnote marker written as <sup>1</sup>, and the sentence: Hi <reference-chip id=\"42\">Doc 42</reference-chip>.",
            ]}
            expect="Tab 1 renders the heading and the link in the amber my-heading / my-link styles. Tab 2 renders the same reply at text-sm leading-7. Tab 3 shows the raw markdown source in a pre. Read the rendered HTML confirms each claim below."
            fail="All four tabs look identical, meaning the slot object never reached the renderer; or tab 3 still renders formatted markdown, meaning the component was ignored rather than substituted."
          />
        </div>
      </Panel>

      <Panel
        title="The four claims the page makes, and what this repo measured"
        description="Each is checkable in the demo with the Read the rendered HTML button, which prints the a, h2, kbd, sup and reference-chip elements the browser actually built."
      >
        <div className="space-y-4">
          <Callout tone="info" title="1. Drop node, or it lands in the HTML">
            The page warns that every component is handed a <code>node</code>{" "}
            prop holding the parsed syntax-tree node, that it is not a DOM
            attribute, and that spreading it writes a literal{" "}
            <code>node=&quot;[object Object]&quot;</code>. The published snippet
            destructures it out. Tab 4 of the demo is this repo&apos;s own copy
            with <code>node</code> left in the spread, so the two can be
            compared in one sitting.
            <p className="mt-2">
              Worth knowing: the compiler does not catch it.{" "}
              <code>npx tsc --noEmit</code> is clean on both, because{" "}
              <code>ExtraProps</code> in Streamdown types <code>node</code> as{" "}
              <code>Element | undefined</code> from <code>hast</code> and a JSX
              spread does not excess-property-check. The only signal is the
              rendered DOM.
            </p>
          </Callout>

          <Callout tone="info" title="2. Spreading the rest keeps the link hardening">
            The page states that <code>a</code> is handed <code>href</code>,{" "}
            <code>target</code> and <code>rel</code>, with{" "}
            <code>target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot;</code>{" "}
            already applied, and that rebuilding the element by hand throws that
            away. The published snippet spreads. The readout shows whether the
            two attributes survived.
          </Callout>

          <Callout tone="info" title="3. You replace, you do not extend">
            Also from the page: the default component for a tag carries
            Streamdown&apos;s classes and a <code>data-streamdown</code>{" "}
            attribute, and yours supplies neither.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {PUBLISHED_DEFAULT_LINK}
            </pre>
            <p className="mt-2">
              Compare tab 1 (overridden <code>a</code>) with tab 2 (default{" "}
              <code>a</code>) in the readout: the <code>data-streamdown</code>{" "}
              attribute is present on one and absent on the other.
            </p>
          </Callout>

          <Callout tone="success" title="4. Custom tags: the published compile error reproduces exactly">
            The page says a custom key such as <code>reference-chip</code> is a
            compile error and prints the message. It is, and it is the same
            message here.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {PUBLISHED_CUSTOM_TAG_ERROR}
            </pre>
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {MEASURED_CUSTOM_TAG_ERROR}
            </pre>
            <p className="mt-2">
              Shown as quoted output rather than shipped code, for the reason
              the rest of this repo gives: a module that cannot compile takes
              the whole frontend typecheck down with it. The second error is the
              page&apos;s omission, not its claim: an unknown key also strips
              the callback of its contextual typing, so the snippet a reader
              writes produces two errors, and the page prints one. The runtime
              half of the claim, that an unknown tag is stripped and its text
              kept, is checkable in the demo: ask for a{" "}
              <code>&lt;reference-chip&gt;</code> and the readout finds none.
            </p>
          </Callout>
        </div>
      </Panel>

      <Panel title="Findings">
        <div className="space-y-4">
          <Callout tone="warn" title="Live, in the sitemap, and absent from the section sidebar">
            <code>/ms-agent-python/custom-look-and-feel/markdown</code> resolves
            200, is listed in <code>sitemap.xml</code>, and carries a
            &ldquo;Custom Look and Feel&rdquo; breadcrumb. The sidebar tree the
            section serves lists exactly two pages under that folder, Slots and
            Headless UI. This page is not one of them, so nothing in the
            docs links to it: it is reachable by URL, search or sitemap only.
          </Callout>

          <Callout tone="warn" title="my-link and my-heading are named and never defined">
            The <code>components</code> snippet swaps two tags for components
            whose entire visible effect is <code>className=&quot;my-link&quot;</code>{" "}
            and <code>className=&quot;my-heading&quot;</code>. Neither class is
            defined anywhere on the page, and the page is otherwise
            Tailwind-flavoured, where neither is a utility. Followed exactly,
            the snippet is a net loss: it removes Streamdown&apos;s classes and
            its <code>data-streamdown</code> attribute and puts an undefined
            class in their place, which is the page&apos;s own third warning
            happening by default. Both classes are defined in{" "}
            <code>src/app/globals.css</code> here so the swap is visible. The
            snippet is untouched.
          </Callout>

          <Callout tone="warn" title="No snippet on the page says which agent the chat talks to">
            Every snippet is a bare <code>&lt;CopilotChat …/&gt;</code> with no{" "}
            <code>agentId</code>, as on the Slots page. This harness registers
            five named agents and no <code>default</code>, so the published form
            throws in <code>useAgent</code> during render.{" "}
            <code>agentId=&quot;my_agent&quot;</code> is added on each shipped
            snippet and marked in place.
          </Callout>

          <Callout tone="success" title="The replace-the-renderer snippet does compile here, unlike the Slots one">
            Known issue #5 in the README is that{" "}
            <code>SlotValue&lt;C&gt; = C | string | Partial&lt;ComponentProps&lt;C&gt;&gt;</code>{" "}
            makes a bare function component unassignable to most slots, which is
            what breaks the Slots page&apos;s level-3 sample. This slot is not
            one of those: <code>CopilotChatAssistantMessage.MarkdownRenderer</code>{" "}
            is declared{" "}
            <code>
              React.FC&lt;Omit&lt;ComponentProps&lt;typeof Streamdown&gt;,
              &quot;children&quot;&gt; &amp; {"{"} content: string {"}"}&gt;
            </code>{" "}
            with no statics, so the published <code>PlainText</code> is
            assignable and <code>npx tsc --noEmit</code> reports nothing on it.
            The page is correct as published.
          </Callout>

          <Callout tone="warn" title="The published idiom for dropping node is an ESLint warning">
            Destructuring <code>node</code> and then not using it is the fix the
            page prescribes, and it is also exactly what{" "}
            <code>@typescript-eslint/no-unused-vars</code> reports. Shipped as
            published, warning and all:
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {`$ npx eslint src/app/custom-look-and-feel/markdown
published-snippets.tsx
  77:21  warning  'node' is defined but never used  @typescript-eslint/no-unused-vars
  82:22  warning  'node' is defined but never used  @typescript-eslint/no-unused-vars

# eslint 9, eslint-config-next 16.3.2`}
            </pre>
            <p className="mt-2">
              The rule&apos;s <code>ignoreRestSiblings</code> default would have
              spared this if <code>node</code> were spread rather than named,
              but the page&apos;s whole point is that it must be named. Two
              warnings per overridden tag, and the page does not mention it.
            </p>
          </Callout>

          <Callout tone="info" title="Streamdown is not a declared dependency here">
            The <code>components</code> map is Streamdown&apos;s, and the page
            links to streamdown.ai, but nothing on it says to install anything.
            Nothing needs to be: the map is passed as a prop, so no import is
            required, and <code>streamdown</code> 1.6.11 arrives as a transitive
            dependency of <code>@copilotkit/react-core</code> 1.69.2 rather than
            as a line in <code>frontend/package.json</code>. Anyone wanting the{" "}
            <code>Components</code> type by name would be importing an
            undeclared package.
          </Callout>
        </div>
      </Panel>

      <Callout tone="premium" title="Not exercised here">
        The &ldquo;Other frontends&rdquo; section (Vue&apos;s{" "}
        <code>message-renderer</code> scoped slot over{" "}
        <code>streamdown-vue</code>, Angular&apos;s{" "}
        <code>#markdownRenderer</code> <code>ng-template</code> over{" "}
        <code>marked</code>). This is the React harness. The Angular half is the
        MsPy-angular repo&apos;s to check, and it tracks a different doc root.
      </Callout>

      <Panel title="Source · the published snippets">
        <SourceCode file="frontend/src/app/custom-look-and-feel/markdown/published-snippets.tsx" />
      </Panel>

      <Panel title="Source · the demo that mounts them">
        <SourceCode file="frontend/src/app/custom-look-and-feel/markdown/demo-chat/page.tsx" />
      </Panel>
    </>
  );
}
