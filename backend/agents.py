"""The five agents this harness serves.

Each one is lifted from a documentation page rather than designed here. No tool,
instruction, or state schema in this file was invented — if it is not in a doc
sample, it is not here.

Why five agents instead of one: `state_schema` and `predict_state_config` are
properties of an `AgentFrameworkAgent`, and the docs define two *different*
schemas — `language` on the Shared State pages and `searches` on State
Rendering. One agent cannot carry both without departing from what the docs
show, so each keeps its own endpoint.

  main_agent     →  Quickstart + Tool Rendering  (get_weather)
  sample_agent   →  Shared State read/write  (update_language)
  search_agent   →  State Rendering  (update_searches)
  context_agent  →  Agent App Context  (ContextAwareAgent, no tools)
  a2ui_agent     →  Fixed Schema A2UI  (display_flight)

The fourth one is new as of the 2026-09-04 drift. That page used to publish a
plain agent with the comment "frontend context is forwarded automatically"; it
now publishes a `ContextAwareAgent` subclass that folds the forwarded context
into a system message by hand. Both cannot be true, and the shipped source
settles it — see `create_context_agent` below.
"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from ag_ui.core import BaseEvent
from agent_framework import Agent, BaseChatClient, SupportsChatGetResponse, tool
from agent_framework.ag_ui import AgentFrameworkAgent
from agent_framework_ag_ui import AgentFrameworkAgent as _AgentFrameworkAgentNewPath
from pydantic import BaseModel, Field

# Seven doc pages import `AgentFrameworkAgent` from `agent_framework.ag_ui`.
# The Agent App Context page, alone, imports it from `agent_framework_ag_ui`.
# `agent_framework.ag_ui` is a lazy shim over that package, so both spellings
# reach the same class today. Asserted rather than assumed: if a release ever
# splits them, this fails at import instead of silently running two classes.
assert _AgentFrameworkAgentNewPath is AgentFrameworkAgent

# --------------------------------------------------------------------------
# Tool Rendering — docs.copilotkit.ai/ms-agent-python/generative-ui/tool-rendering
# --------------------------------------------------------------------------


# [1] tool rendering: get_weather
# [!code highlight]
@tool
def get_weather(
    location: Annotated[str, Field(description="The location to get weather for")],
) -> str:
    normalized = location.strip() or "the requested location"
    return f"The weather for {normalized} is 70 degrees."
# endregion


def create_main_agent(chat_client: SupportsChatGetResponse) -> Agent:
    """Quickstart's agent, plus the one tool the Tool Rendering page adds."""
    return Agent(
        name="MyAgent",
        instructions="You are a helpful assistant.",
        client=chat_client,
        tools=[get_weather],
    )


# --------------------------------------------------------------------------
# Agent App Context — .../agent-app-context
# --------------------------------------------------------------------------
#
# The page's Python sample, verbatim, apart from the factory name: the harness
# names one factory per doc page (`create_main_agent`, `create_sample_agent`,
# `create_search_agent`), and the page calls this one `create_agent`.
#
# What changed on 2026-09-04: the sample used to be a plain `AgentFrameworkAgent`
# whose docstring read "frontend context is forwarded automatically". It is now
# the subclass below, which builds a system message out of `input_data["context"]`
# by hand, and the page's lead-in now says "Use middleware to read it and inject
# it into the agent's conversation."
#
# The shipped source says the new version is the correct one. In
# `agent_framework_ag_ui._agent_run.run_agent_stream`, `input_data["context"]` is
# read in exactly one place — `build_ag_ui_context_slice(...)`, inside the branch
# guarded by the A2UI injection flag. A run without `injectA2UITool` never turns
# the forwarded context into anything the model sees. So the old sample could not
# have worked as described, and the old claim was the defect.


# region context-agent
# [1] agent app context: parse the forwarded value
# [!code highlight]
def parse_context_value(value: Any) -> Any:
    """Undo the `JSON.stringify` that `useAgentContext` applies on the way out.

    The AG-UI protocol types a context value as a string, so the hook
    stringifies anything that is not already one and the agent receives JSON
    text rather than the object or the array. The doc page spells this out as
    of the 2026-09-09 sync: parse before reading a field, or `colleagues[0]`
    yields a single character and `isinstance(value, list)` can never pass.

    A value that was already a string is sent unchanged and has to survive
    untouched, so a decode is only accepted when it produces a container.
    `json.loads` succeeds on plain text like `123` or `true` that was never
    encoded in the first place, and taking those results would corrupt them.
    """
    if not isinstance(value, str):
        return value
    try:
        decoded = json.loads(value)
    except (TypeError, ValueError):
        return value
    return decoded if isinstance(decoded, (dict, list)) else value


# [2] agent app context: build the system message
# [!code highlight]
def build_context_system_message(context: Any) -> str | None:
    if not isinstance(context, list) or not context:
        return None

    lines = ["## Context from the application"]
    for entry in context:
        if not isinstance(entry, dict):
            continue

        description = entry.get("description")
        value = parse_context_value(entry.get("value"))
        if not isinstance(description, str) or not description or value is None:
            continue

        if not isinstance(value, str):
            try:
                value = json.dumps(value, ensure_ascii=False, indent=2)
            except (TypeError, ValueError):
                value = str(value)
        lines.extend(["", description, value])

    return "\n".join(lines) if len(lines) > 1 else None


# [3] agent app context: inject it per request
# [!code highlight]
class ContextAwareAgent(AgentFrameworkAgent):
    """Add app context to this request without mutating the shared agent."""

    async def run(
        self,
        input_data: dict[str, Any],
    ) -> AsyncGenerator[BaseEvent, None]:
        context_prompt = build_context_system_message(input_data.get("context"))
        messages = input_data.get("messages")

        # The adapter skips the model when messages are empty. Context
        # alone must not create an unsolicited model call.
        if context_prompt and isinstance(messages, list) and messages:
            run_id = input_data.get("runId") or str(uuid4())
            request_input = dict(input_data)
            request_input["runId"] = run_id
            request_input["messages"] = [
                {
                    "id": f"{run_id}-app-context",
                    "role": "system",
                    "content": context_prompt,
                },
                *[
                    message
                    for message in messages
                    if not (
                        isinstance(message, dict)
                        and isinstance(message.get("id"), str)
                        and message["id"].endswith("-app-context")
                    )
                ],
            ]
            input_data = request_input

        async for event in super().run(input_data):
            yield event


def create_context_agent(chat_client: BaseChatClient) -> AgentFrameworkAgent:
    base_agent = Agent(
        name="sample_agent",
        instructions="You are a helpful assistant.",
        client=chat_client,
    )

    return ContextAwareAgent(
        agent=base_agent,
        name="CopilotKitMicrosoftAgentFrameworkAgent",
        description="Assistant using request-local app context.",
        require_confirmation=False,
    )
# endregion


# --------------------------------------------------------------------------
# Shared State — .../shared-state/in-app-agent-read and in-app-agent-write
# --------------------------------------------------------------------------

LANGUAGE_STATE_SCHEMA: dict[str, object] = {
    "language": {
        "type": "string",
        "enum": ["english", "spanish"],
        "description": "Preferred language.",
    }
}

LANGUAGE_PREDICT_STATE_CONFIG: dict[str, dict[str, str]] = {
    "language": {"tool": "update_language", "tool_argument": "language"}
}


# [2] shared state: update_language
# [!code highlight]
@tool

def update_language(
    language: Annotated[str, Field(description="Preferred language: 'english' or 'spanish'")],
) -> str:
    normalized = (language or "").strip().lower()
    if normalized not in ("english", "spanish"):
        return "Language unchanged. Use 'english' or 'spanish'."
    return f"Language updated to {normalized}."
# endregion


def create_sample_agent(chat_client: SupportsChatGetResponse) -> AgentFrameworkAgent:
    base_agent = Agent(
        name="sample_agent",
        instructions="You are a helpful assistant.",
        client=chat_client,
        tools=[update_language],
    )
    return AgentFrameworkAgent(
        agent=base_agent,
        name="CopilotKitMicrosoftAgentFrameworkAgent",
        description="Assistant that tracks a simple language state.",
        state_schema=LANGUAGE_STATE_SCHEMA,
        predict_state_config=LANGUAGE_PREDICT_STATE_CONFIG,
        require_confirmation=False,
    )


# --------------------------------------------------------------------------
# State Rendering — .../generative-ui/state-rendering
# --------------------------------------------------------------------------


class SearchItem(BaseModel):
    query: str
    done: bool


SEARCHES_STATE_SCHEMA: dict[str, object] = {
    "searches": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "done": {"type": "boolean"},
            },
            "required": ["query", "done"],
            "additionalProperties": False,
        },
        "description": "List of searches and whether each is done.",
    }
}

SEARCHES_PREDICT_STATE_CONFIG: dict[str, dict[str, str]] = {
    "searches": {
        "tool": "update_searches",
        "tool_argument": "searches",
    }
}


# [3] state rendering: update_searches
# [!code highlight]
# region update-searches
@tool
def update_searches(
    searches: Annotated[
        list[SearchItem],
        Field(
            description=(
                "The complete source of truth for the user's searches. Maintain "
                "ordering and include the full list on each call."
            )
        ),
    ],
) -> str:
    return f"Searches updated. Tracking {len(searches)} item(s)."
# endregion


def create_search_agent(chat_client: SupportsChatGetResponse) -> AgentFrameworkAgent:
    base_agent = Agent(
        name="search_agent",
        instructions=(
            "You help users create and run searches.\n\n"
            "State sync rules:\n"
            "- Maintain a list of searches: each item has { query, done }.\n"
            "- When adding a new search, call `update_searches` with the FULL list, "
            "including the new item with done=true.\n"
            "- All searches in the list should have done=true unless explicitly in progress.\n"
            "- Never send partial updates. Always include the full list on each call.\n"
        ),
        client=chat_client,
        tools=[update_searches],
    )
    return AgentFrameworkAgent(
        agent=base_agent,
        name="CopilotKitMicrosoftAgentFrameworkAgent",
        description="Maintains a list of searches and streams state to the UI.",
        state_schema=SEARCHES_STATE_SCHEMA,
        predict_state_config=SEARCHES_PREDICT_STATE_CONFIG,
        require_confirmation=False,
    )


# --------------------------------------------------------------------------
# Fixed Schema A2UI — .../generative-ui/a2ui/fixed-schema
# --------------------------------------------------------------------------
#
# The page's own Python sample, with the factory renamed the way every other
# agent in this file is (`create_*_agent`) and the schema read from
# `a2ui_schemas/flight_schema.json` rather than inlined.
#
# What "fixed schema" means here: the component tree is authored once, as JSON,
# and never generated by the model. The tool supplies only the data model. That
# is why this agent needs no `render_a2ui` tool and the runtime sets
# `injectA2UITool: false` for it — `display_flight` returns the operations
# container itself, and the A2UI middleware renders any valid one it sees in the
# event stream.
#
# The three operations are ordered, not a set. `createSurface` must come first
# or there is no surface for the other two to address; `updateComponents` before
# `updateDataModel` or the bindings resolve against a tree that does not exist
# yet.
#
# `CATALOG_ID` is the contract with the frontend: it has to match the id the
# browser registers in `a2ui/catalog.ts`, or the surface paints with no
# component vocabulary and nothing appears.

A2UI_CATALOG_ID = "copilotkit://flight-fixed-catalog"
A2UI_SURFACE_ID = "flight-fixed-schema"

FLIGHT_SCHEMA = json.loads(
    (Path(__file__).parent / "a2ui_schemas" / "flight_schema.json").read_text(
        encoding="utf-8"
    )
)


# [1] fixed schema a2ui: the tool returns the operations container
# [!code highlight]
# region display-flight
@tool(name="display_flight", description="Show a flight card for the given trip.")
def display_flight(
    origin: Annotated[str, Field(description="3-letter origin code, e.g. 'JFK'.")],
    destination: Annotated[str, Field(description="3-letter destination code.")],
    airline: Annotated[str, Field(description="Airline name.")],
    price: Annotated[str, Field(description="Price string, e.g. '$289'.")],
) -> str:
    ops = [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": A2UI_SURFACE_ID,
                "catalogId": A2UI_CATALOG_ID,
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": A2UI_SURFACE_ID,
                "components": FLIGHT_SCHEMA,
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": A2UI_SURFACE_ID,
                "path": "/",
                "value": {
                    "origin": origin,
                    "destination": destination,
                    "airline": airline,
                    "price": price,
                },
            },
        },
    ]
    return json.dumps({"a2ui_operations": ops})
# endregion


def create_a2ui_agent(chat_client: SupportsChatGetResponse) -> AgentFrameworkAgent:
    """Fixed Schema A2UI's agent — one tool, and it draws the surface."""
    base_agent = Agent(
        name="a2ui_fixed_agent",
        instructions=(
            "You help users find flights.\n\n"
            "When the user asks about a route, call `display_flight` EXACTLY ONCE, "
            "with origin, destination, airline and price. One call, one card — "
            "never offer several options, because every call draws over the same "
            "surface and only the last one survives.\n\n"
            "Invent plausible values for anything the user did not give you; this "
            "is a demo and there is no booking system behind it. After the call, "
            "reply with at most one short sentence — the card is the answer, and "
            "restating it in prose is noise."
        ),
        client=chat_client,
        tools=[display_flight],
    )
    return AgentFrameworkAgent(
        agent=base_agent,
        name="CopilotKitMicrosoftAgentFrameworkAgent",
        description="Draws a flight card as an A2UI surface from a fixed schema.",
        require_confirmation=False,
    )
