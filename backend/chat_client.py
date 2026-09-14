"""Chat client construction, exactly as the docs build it.

Every Python sample on the Microsoft Agent Framework pages repeats this same
helper — Azure OpenAI when `AZURE_OPENAI_ENDPOINT` is set, otherwise OpenAI,
and a hard failure when neither is configured. It is factored out here so the
three agents can share one copy instead of three.

The Azure branch uses `OpenAIChatClient(..., azure_endpoint=...)`, which every
page now agrees on, with `DefaultAzureCredential()` as the fallback when no
`AZURE_OPENAI_API_KEY` is set (i.e. you signed in with `az login`).
"""

from __future__ import annotations

import os

from agent_framework import SupportsChatGetResponse
from agent_framework.openai import OpenAIChatClient
from azure.identity import DefaultAzureCredential


def build_chat_client() -> SupportsChatGetResponse:
    # [1] quickstart: chat client
    # [!code highlight]
    if os.getenv("AZURE_OPENAI_ENDPOINT"):
        azure_api_key = os.getenv("AZURE_OPENAI_API_KEY")
        return OpenAIChatClient(
            model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4o-mini"),
            api_key=azure_api_key,
            credential=None if azure_api_key else DefaultAzureCredential(),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        )
    if os.getenv("OPENAI_API_KEY"):
        return OpenAIChatClient(
            model=os.getenv("OPENAI_CHAT_MODEL_ID", "gpt-5.6-luna"),
            api_key=os.getenv("OPENAI_API_KEY"),
        )
    raise RuntimeError(
        "Set AZURE_OPENAI_ENDPOINT (uses az login unless AZURE_OPENAI_API_KEY is set) "
        "or OPENAI_API_KEY."
    )
