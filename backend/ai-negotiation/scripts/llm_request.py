"""Send a request to the configured LLM from the command line.

Standalone: it imports nothing from the project, only ``httpx`` and
``python-dotenv``. It reads ``LLM_BASE_URL``, ``LLM_API_KEY`` and ``LLM_MODEL``
from the environment or ``.env`` (real environment variables win) and posts to
the ``/v1/chat/completions`` endpoint (vLLM serving Qwen3).

The default system prompt is the supplier email prompt below, since email
generation is the core use case. Use ``--system none`` for a bare request, or
``--system-file`` to try a prompt of your own.

    .venv/bin/python scripts/llm_request.py "Write the opening email to Acme asking to move from 30 to 60 days"
    .venv/bin/python scripts/llm_request.py --prompt-file temp/brief.txt --stream
    .venv/bin/python scripts/llm_request.py --system-file temp/my_prompt.txt "..."
    .venv/bin/python scripts/llm_request.py --system none "What is 2 + 2?"
    .venv/bin/python scripts/llm_request.py                        # multi-turn chat; full history sent every turn
    .venv/bin/python scripts/llm_request.py --chat "Write the opening email ..."   # chat, seeded with a first message
    echo "..." | .venv/bin/python scripts/llm_request.py -         # prompt from stdin
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]

EMAIL_SYSTEM_PROMPT = """You write emails for a procurement negotiator.

Roles
- The sender is the BUYER. The recipient is the SUPPLIER.
- The greeting addresses the supplier's contact. The sign-off carries the buyer's signer and the buyer's company.
- Never sign with the supplier's name, the supplier's company or the supplier's contact.

Facts
- Never invent a company, person, date, figure or reason. Use only what the request gives you.
- When a value is unknown, write a placeholder instead: [Supplier Contact], [Supplier Company], [Buyer Name], [Buyer Company], [MM, DD, YYYY] or XXX for a number.
- A subject line or name the negotiator dictates is used word for word.

What never goes in the email
- Internal figures: the BATNA, target range, cash-flow unlock, financing cost, spend totals.
- Market, peer or industry benchmark figures. Refer to them in general terms only ("in line with market practice").
- Internal scores, success probability, leverage assessments or anything that reveals the buyer's position.

The ask
- State the change to payment terms as a decision being put in place, not a question. Write "we are moving our payment terms to 60 days", never "would you consider 60 days?".
- Give the effective date when the request provides one, otherwise use [MM, DD, YYYY].
- Only mention supply chain finance (SCF) when the request says it is offered.

Style
- Professional, courteous and firm. Short paragraphs. No more than about 200 words unless a length is asked for.
- Invite the supplier to confirm or to raise questions with a named contact, without reopening the decision.

Output
- Output only the email: a "Subject:" line, a blank line, the greeting, the body and the sign-off.
- No preamble, no JSON, no notes, no commentary and no markdown."""

SYSTEM_PRESETS = {"email": EMAIL_SYSTEM_PROMPT, "none": ""}


def main() -> int:
    args = _parse_args()
    load_dotenv(args.env_file, override=False)

    base_url = os.getenv("LLM_BASE_URL", "").strip()
    model = args.model or os.getenv("LLM_MODEL", "").strip()
    api_key = os.getenv("LLM_API_KEY", "").strip()
    if not base_url or not model:
        print("LLM_BASE_URL and LLM_MODEL must be set (env or .env)", file=sys.stderr)
        return 2

    system = Path(args.system_file).read_text() if args.system_file else SYSTEM_PRESETS[args.system]
    messages: list[dict[str, str]] = [{"role": "system", "content": system}] if system.strip() else []

    endpoint = f"{base_url.rstrip('/')}/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    with httpx.Client(timeout=args.timeout) as client:
        prompt = _read_prompt(args)
        if args.chat or not prompt:
            return _chat_loop(client, endpoint, headers, model, messages, args, first=prompt)
        messages.append({"role": "user", "content": prompt})
        reply = _send(client, endpoint, headers, model, messages, args)
        return 0 if reply is not None else 1


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("prompt", nargs="?", help="user message; '-' reads stdin")
    p.add_argument("--prompt-file", help="read the user message from a file")
    p.add_argument("--system", choices=sorted(SYSTEM_PRESETS), default="email", help="system prompt preset (default: email)")
    p.add_argument("--system-file", help="read the system prompt from a file (overrides --system)")
    p.add_argument("--model", help="override LLM_MODEL")
    p.add_argument("--temperature", type=float, default=0.3)
    p.add_argument("--top-p", type=float, default=0.9)
    p.add_argument("--max-tokens", type=int, default=1024)
    p.add_argument("--thinking", action="store_true", help="enable Qwen3 reasoning (chat_template_kwargs)")
    p.add_argument("--no-template-kwargs", action="store_true", help="do not send chat_template_kwargs (non-vLLM backends)")
    p.add_argument("--show-thinking", action="store_true", help="print the <think> block instead of stripping it")
    p.add_argument("--stream", action="store_true", help="stream tokens as they arrive")
    p.add_argument("--chat", action="store_true", help="interactive multi-turn session")
    p.add_argument("--print-request", action="store_true", help="print the request payload before sending")
    p.add_argument("--raw", action="store_true", help="print the full JSON response (non-streaming only)")
    p.add_argument("--timeout", type=float, default=120.0)
    p.add_argument("--env-file", default=str(ROOT / ".env"))
    return p.parse_args()


def _read_prompt(args: argparse.Namespace) -> str:
    if args.prompt_file:
        return Path(args.prompt_file).read_text().strip()
    if args.prompt == "-":
        return sys.stdin.read().strip()
    return (args.prompt or "").strip()


def _chat_loop(client, endpoint, headers, model, messages, args, first: str = "") -> int:
    """Multi-turn session: every request carries the whole conversation so far."""
    print(
        "Chat mode — each message is sent with the full conversation so far.\n"
        "Commands: /quit (or Ctrl+D), /reset clears history, /history shows it, "
        "/system shows the system prompt, /paste for a multi-line message (end with a line containing only '.')."
    )
    base = list(messages)
    pending = first
    while True:
        if pending:
            text, pending = pending, ""
            print(f"\nyou> {text}")
        else:
            try:
                text = input("\nyou> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                return 0
        if not text:
            continue
        if text in ("/quit", "/exit"):
            return 0
        if text == "/reset":
            messages[:] = list(base)
            print("(history cleared)")
            continue
        if text == "/system":
            print(base[0]["content"] if base else "(no system prompt)")
            continue
        if text == "/history":
            turns = messages[len(base):]
            if not turns:
                print("(no messages yet)")
            for m in turns:
                print(f"\n[{m['role']}]\n{m['content']}")
            continue
        if text == "/paste":
            text = _read_multiline()
            if not text:
                continue
        messages.append({"role": "user", "content": text})
        print("\nllm>")
        reply = _send(client, endpoint, headers, model, messages, args)
        if reply is None:
            messages.pop()
        else:
            messages.append({"role": "assistant", "content": reply})


def _read_multiline() -> str:
    lines: list[str] = []
    try:
        while (line := input()) != ".":
            lines.append(line)
    except (EOFError, KeyboardInterrupt):
        pass
    return "\n".join(lines).strip()


def _send(client, endpoint, headers, model, messages, args) -> str | None:
    """Post one completion, print it, and return the answer text (reasoning stripped)."""
    payload = {
        "model": model,
        "messages": messages,
        "temperature": args.temperature,
        "top_p": args.top_p,
        "max_tokens": args.max_tokens,
    }
    if not args.no_template_kwargs:
        payload["chat_template_kwargs"] = {"enable_thinking": args.thinking}
    if args.stream:
        payload["stream"] = True
        payload["stream_options"] = {"include_usage": True}
    if args.print_request:
        print(json.dumps(payload, indent=2), file=sys.stderr)

    started = time.monotonic()
    try:
        if args.stream:
            content, usage = _stream(client, endpoint, headers, payload, args.show_thinking)
        else:
            response = client.post(endpoint, headers=headers, json=payload)
            if response.status_code >= 400:
                print(f"error {response.status_code}: {response.text[:1000]}", file=sys.stderr)
                return None
            data = response.json()
            if args.raw:
                print(json.dumps(data, indent=2))
            message = data["choices"][0]["message"]
            content = message.get("content") or ""
            usage = data.get("usage") or {}
            if args.show_thinking and message.get("reasoning_content"):
                print(f"<think>\n{message['reasoning_content']}\n</think>\n")
            if not args.raw:
                print(content if args.show_thinking else strip_think(content))
    except httpx.HTTPError as exc:
        print(f"request failed: {exc}", file=sys.stderr)
        return None

    elapsed = time.monotonic() - started
    print(
        f"\n[model={model} prompt_tokens={usage.get('prompt_tokens')} "
        f"completion_tokens={usage.get('completion_tokens')} {elapsed:.1f}s]",
        file=sys.stderr,
    )
    return strip_think(content)


def _stream(client, endpoint, headers, payload, show_thinking) -> tuple[str, dict]:
    parts: list[str] = []
    usage: dict = {}
    in_reasoning = False
    with client.stream("POST", endpoint, headers=headers, json=payload) as response:
        if response.status_code >= 400:
            response.read()
            raise httpx.HTTPError(f"{response.status_code}: {response.text[:1000]}")
        for line in response.iter_lines():
            if not line.startswith("data:"):
                continue
            chunk = line[5:].strip()
            if chunk == "[DONE]":
                break
            data = json.loads(chunk)
            usage = data.get("usage") or usage
            if not data.get("choices"):
                continue
            delta = data["choices"][0].get("delta") or {}
            reasoning = delta.get("reasoning_content")
            if reasoning and show_thinking:
                if not in_reasoning:
                    print("<think>", flush=True)
                    in_reasoning = True
                print(reasoning, end="", flush=True)
            text = delta.get("content")
            if text:
                if in_reasoning:
                    print("\n</think>\n", flush=True)
                    in_reasoning = False
                parts.append(text)
                print(text, end="", flush=True)
    print()
    return "".join(parts), usage


def strip_think(text: str) -> str:
    """Remove Qwen3 reasoning: closed spans, a bare closing tag, or an unterminated opening tag."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    if "</think>" in text:
        text = text.rsplit("</think>", 1)[1]
    text = re.sub(r"<think>.*\Z", "", text, flags=re.S)
    return text.strip()


if __name__ == "__main__":
    sys.exit(main())
