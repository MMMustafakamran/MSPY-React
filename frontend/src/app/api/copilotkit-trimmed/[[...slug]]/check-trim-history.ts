// Message history, "Check it on a turn with two tool calls" — verbatim.
// Imported by nothing. Run it with:
//   npx tsx "src/app/api/copilotkit-trimmed/[[...slug]]/check-trim-history.ts"
import { strict as assert } from "node:assert";
import type { Message } from "@ag-ui/client";
import { lastTurnOnly } from "./trim-history";

const call = (id: string, name: string) => ({
  id,
  type: "function" as const,
  function: { name, arguments: "{}" },
});

// One earlier assistant message opens two calls. The kept turn answers only
// the second one, because the first was resolved before the last user message.
const messages: Message[] = [
  { id: "u1", role: "user", content: "book me a flight and a hotel" },
  { id: "a1", role: "assistant", toolCalls: [call("cA", "bookFlight"), call("cB", "bookHotel")] },
  { id: "t-a", role: "tool", toolCallId: "cA", content: "flight booked" },
  { id: "u2", role: "user", content: "yes, that hotel" },
  { id: "t-b", role: "tool", toolCallId: "cB", content: "hotel booked" },
];

const trimmed = lastTurnOnly(messages);

// Only the answered call is forwarded; `cA` was resolved before the kept turn.
const forwardedCallIds = trimmed.flatMap((message) =>
  message.role === "assistant" ? (message.toolCalls ?? []).map((c) => c.id) : [],
);
assert.deepEqual(forwardedCallIds, ["cB"]);

// And every forwarded call is answered by the message right after it, which is
// what the provider requires. Presence somewhere in the list is not enough.
trimmed.forEach((message, index) => {
  for (const toolCall of message.role === "assistant" ? (message.toolCalls ?? []) : []) {
    const next = trimmed[index + 1];
    assert.ok(
      next && next.role === "tool" && next.toolCallId === toolCall.id,
      `tool call ${toolCall.id} is not answered by the next message`,
    );
  }
});

// The stored transcript is untouched: `a1` still holds both calls.
assert.equal(messages[1].role === "assistant" && messages[1].toolCalls?.length, 2);

// A second run: both results of one parallel call are retained, and an
// assistant message sits between them. The rescued call must stay with BOTH
// results, so nothing separates it from either one.
const parallel: Message[] = [
  { id: "u1", role: "user", content: "book both" },
  { id: "a1", role: "assistant", toolCalls: [call("cA", "bookFlight"), call("cB", "bookHotel")] },
  { id: "u2", role: "user", content: "go ahead" },
  { id: "t-a", role: "tool", toolCallId: "cA", content: "flight booked" },
  { id: "a3", role: "assistant", content: "one moment" },
  { id: "t-b", role: "tool", toolCallId: "cB", content: "hotel booked" },
];

const trimmedParallel = lastTurnOnly(parallel);
trimmedParallel.forEach((message, index) => {
  for (const toolCall of message.role === "assistant" ? (message.toolCalls ?? []) : []) {
    const answers = new Set<string>();
    for (let i = index + 1; trimmedParallel[i]?.role === "tool"; i++) {
      // NOT FROM THE PAGE. The published line does not typecheck: the loop
      // condition narrows `trimmedParallel[i]?.role`, not the indexed element
      // read again here (TS2339 on @ag-ui/client 0.0.57). It runs correctly.
      // @ts-expect-error acknowledged in place; the line below is verbatim.
      answers.add(trimmedParallel[i].toolCallId);
    }
    assert.ok(
      answers.has(toolCall.id),
      `tool call ${toolCall.id} is separated from its result`,
    );
  }
});

console.log("trim-history: forwarded only the answered call, next to its result");
