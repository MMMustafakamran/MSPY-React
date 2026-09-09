"""Serves the Microsoft Agent Framework agents over AG-UI.

`add_agent_framework_fastapi_endpoint` mounts an agent at a path on a normal
FastAPI app. The Quickstart mounts one agent at `/`; this harness mounts five,
because the Shared State and State Rendering pages each define their own
`state_schema` and cannot share one agent (see `agents.py`).

The optional bearer-token middleware is the Authentication page's Python
sample. It stays inert unless `AUTH_BEARER_TOKEN` is set, so the app runs
unauthenticated by default.
"""

from __future__ import annotations

import os
from pathlib import Path

import uvicorn
from agent_framework.ag_ui import add_agent_framework_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

# Prefer backend/.env (what the docs describe as agent/.env), then fall back to
# a repo-root .env so a single top-level file also works.
_BACKEND_ENV = Path(__file__).parent / ".env"
_ROOT_ENV = Path(__file__).parent.parent / ".env"
load_dotenv(_BACKEND_ENV)
load_dotenv(_ROOT_ENV, override=False)

from agents import (  # noqa: E402 - must follow load_dotenv
    create_a2ui_agent,
    create_context_agent,
    create_main_agent,
    create_sample_agent,
    create_search_agent,
)
from chat_client import build_chat_client  # noqa: E402

PORT = int(os.getenv("AGENT_PORT", "8000"))

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "AGENT_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

if not (os.getenv("OPENAI_API_KEY") or os.getenv("AZURE_OPENAI_ENDPOINT")):
    raise SystemExit(
        "No model provider configured.\n"
        f"Create {_BACKEND_ENV} (or a repo-root .env) from .env.example and set "
        "OPENAI_API_KEY, or AZURE_OPENAI_ENDPOINT for Azure OpenAI."
    )

app = FastAPI(title="CopilotKit + Microsoft Agent Framework (Python)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [1] authentication: bearer middleware
# [!code highlight]
# region auth-middleware
REQUIRED_BEARER_TOKEN = os.getenv("AUTH_BEARER_TOKEN")

AGENT_PATHS = {"/", "/sample_agent", "/search_agent", "/context_agent", "/a2ui_agent"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Protect the AG-UI endpoints if a token is configured.
    if REQUIRED_BEARER_TOKEN and request.url.path in AGENT_PATHS:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
            )
        token = auth_header.split(" ", 1)[1].strip()
        if token != REQUIRED_BEARER_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
    return await call_next(request)
# endregion


@app.get("/health")
async def health() -> dict[str, object]:
    """Not part of the docs — lets the app's home page report reachability."""
    return {"status": "ok", "agents": sorted(AGENT_PATHS), "authRequired": bool(REQUIRED_BEARER_TOKEN)}


chat_client = build_chat_client()

# [2] quickstart: agent endpoint
# [!code highlight]
# Quickstart / Tool Rendering / everything with no state schema.
add_agent_framework_fastapi_endpoint(app=app, agent=create_main_agent(chat_client), path="/")

# Shared State read + write.
#
# `default_state` seeds the language before the first run. The pages used to
# seed it from the frontend with `useAgent({ initialState })`, a prop the hook
# has never had; they now seed in a `useEffect` gated on `isReady`, which the
# hook does return. `default_state` stays because it is what makes the value
# survive a re-run — the client seed only covers the first paint.
# [3] shared state: agent endpoint
# [!code highlight]
add_agent_framework_fastapi_endpoint(
    app=app,
    agent=create_sample_agent(chat_client),
    path="/sample_agent",
    default_state={"language": "english"},
)

# Agent App Context.
#
# Its own endpoint as of the 2026-09-04 drift. The page used to share the plain
# `sample_agent` because it claimed the forwarded context needed no server-side
# code; it now publishes a `ContextAwareAgent` that injects the context itself,
# and that subclass carries no state schema, so it cannot share the Shared State
# agent. See `agents.py` for why the new version is the correct one.
# [5] agent app context: agent endpoint
# [!code highlight]
add_agent_framework_fastapi_endpoint(
    app=app, agent=create_context_agent(chat_client), path="/context_agent"
)

# [4] state rendering: agent endpoint
# [!code highlight]
# State Rendering.
add_agent_framework_fastapi_endpoint(
    app=app, agent=create_search_agent(chat_client), path="/search_agent"
)

# Fixed Schema A2UI.
#
# Its own endpoint because `display_flight` must not be reachable from any other
# page: the runtime enables the A2UI middleware for this agent alone
# (`a2ui: { agents: ["a2ui_agent"] }` in the runtime route), and an agent that
# carried the tool without the middleware would return the operations container
# as plain JSON text into the chat.
# [6] fixed schema a2ui: agent endpoint
# [!code highlight]
add_agent_framework_fastapi_endpoint(
    app=app, agent=create_a2ui_agent(chat_client), path="/a2ui_agent"
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
