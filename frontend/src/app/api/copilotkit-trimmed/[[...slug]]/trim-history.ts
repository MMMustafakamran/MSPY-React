// Message history, "Write a filter for middleware" — verbatim.
import {
  Middleware,
  type AbstractAgent,
  type Message,
  type RunAgentInput,
} from "@ag-ui/client";

/** Keeps the final turn, plus any tool call a forwarded tool result needs. */
export function lastTurnOnly(messages: Message[]): Message[] {
  let start = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      start = i;
      break;
    }
  }
  if (start === -1) return messages;

  const kept = messages.slice(start);
  const keptIds = new Set(kept.map((message) => message.id));
  const answeredIds = new Set(
    kept.flatMap((message) => (message.role === "tool" ? [message.toolCallId] : [])),
  );

  // Index the earlier assistant messages by the calls a kept result answers.
  // `Message` is a union, so the map holds the assistant member: only that one
  // carries `toolCalls`.
  const issuerOf = new Map<string, Extract<Message, { role: "assistant" }>>();
  for (const message of messages.slice(0, start)) {
    if (message.role !== "assistant" || keptIds.has(message.id)) continue;
    // Keep only the calls a forwarded result answers. An assistant message can
    // hold several calls, and a call whose result you drop must go too.
    const toolCalls = (message.toolCalls ?? []).filter((call) =>
      answeredIds.has(call.id),
    );
    if (toolCalls.length === 0) continue;
    const narrowed = { ...message, toolCalls };
    for (const call of toolCalls) issuerOf.set(call.id, narrowed);
  }

  // Put each rescued call directly in front of the result that answers it, and
  // keep that message's other results with it. A provider expects a tool call
  // to be answered by the messages right after it, so collecting the rescued
  // calls at the front, or letting anything separate a parallel call from one
  // of its results, recreates the error.
  const emittedIssuers = new Set<Extract<Message, { role: "assistant" }>>();
  const placedResults = new Set<string>();
  const forwarded: Message[] = [];
  for (const message of kept) {
    if (message.role === "tool") {
      if (placedResults.has(message.id)) continue;
      const issuer = issuerOf.get(message.toolCallId);
      if (issuer && !emittedIssuers.has(issuer)) {
        emittedIssuers.add(issuer);
        forwarded.push(issuer);
        for (const sibling of kept) {
          if (sibling.role !== "tool") continue;
          if (!issuer.toolCalls?.some((call) => call.id === sibling.toolCallId)) continue;
          placedResults.add(sibling.id);
          forwarded.push(sibling);
        }
        continue;
      }
    }
    forwarded.push(message);
  }
  return forwarded;
}

/** Rewrites the messages of one run, leaving the stored transcript alone. */
export class TrimHistoryMiddleware extends Middleware {
  constructor(private readonly trim: (messages: Message[]) => Message[]) {
    super();
  }

  run(input: RunAgentInput, next: AbstractAgent) {
    return this.runNext({ ...input, messages: this.trim(input.messages) }, next);
  }
}
