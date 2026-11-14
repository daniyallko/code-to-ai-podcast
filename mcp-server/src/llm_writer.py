"""Optional Groq scriptwriter. Returns None on any failure so the rule-based writer takes over."""
from __future__ import annotations

import json
import os

import httpx

URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

STYLE = {
    "roast": "A comedic 2-host PR roast. Sam (Builder) is upbeat and defends the code; Alex (Staff SRE) is dry, cynical and outage-scarred. Lots of short back-and-forth, interruptions, jokes about the actual code.",
    "explainer": "A calm single-narrator code explainer by Alex (Staff SRE) only. Explain what changed and why it matters, in plain words.",
    "postmortem": "A blameless incident-review style chat. Alex leads, Sam asks sharp questions. Serious tone with light humour.",
}


def _prompt(diff: str, fmt: str, title: str, length: str, intensity: str, a: dict) -> str:
    from .scriptwriter import clean_title, nice_name
    n = "7-9" if length == "short" else "12-16"
    return f"""Write a podcast script about this code change titled "{clean_title(title)}".
Style: {STYLE.get(fmt, STYLE['roast'])} Intensity: {intensity}.
Rules:
- {n} lines. Each line under 30 words, natural spoken English.
- Talk about the REAL code: quote or paraphrase specific added/removed lines, function names and logic.
- Never read commit hashes, full file paths or file extensions aloud. Say files by short human names (e.g. "the oauth handler").
- Don't read code symbols literally; say "not equal" not "!=".
- Don't invent facts not visible in the diff (no made-up incidents, metrics, or test results).
- Vary phrasing; no generic filler.
- End with a one-line verdict.
Files: {', '.join(nice_name(f) for f in a['files'][:15])}. +{a['added']} / -{a['removed']} lines.
Code smells detected: {', '.join(s['id'] for s in a['smells']) or 'none'}.
Return JSON: {{"lines":[{{"speaker":"Alex"|"Sam","text":"...","emotion":"neutral|excited|skeptical|sarcastic|curious|dry|hopeful|amused","sfx":null|"record_scratch"|"keyboard_clack"|"transition_whoosh"|"pager_alert"}}]}}

DIFF:
{diff[:14000]}"""


def write(diff: str, fmt: str, title: str, length: str, intensity: str, a: dict):
    key = os.environ.get("GROQ_API_KEY")
    if not key or not diff.strip():
        return None
    from .scriptwriter import ALEX, SAM, Line
    try:
        r = httpx.post(URL, timeout=15, headers={"Authorization": f"Bearer {key}"}, json={
            "model": MODEL, "temperature": 0.9, "reasoning_effort": "low", "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": "You are a witty senior engineer who writes tight podcast scripts. Output JSON only."},
                         {"role": "user", "content": _prompt(diff, fmt, title, length, intensity, a)}]})
        r.raise_for_status()
        raw = json.loads(r.json()["choices"][0]["message"]["content"])["lines"]
        out = []
        for i, l in enumerate(raw[:24]):
            text = str(l.get("text", "")).strip()
            if not text:
                continue
            spk = SAM if str(l.get("speaker", "")).lower().startswith("sam") and fmt != "explainer" else ALEX
            sfx = l.get("sfx") if l.get("sfx") in {"record_scratch", "keyboard_clack", "transition_whoosh", "pager_alert"} else None
            prev = out[-1].speaker if out else None
            out.append(Line(spk, text[:300], str(l.get("emotion") or "neutral"), -180 if prev and prev != spk and i % 2 else 220, sfx))
        return out if len(out) >= 3 else None
    except Exception:  # noqa: BLE001
        return None
