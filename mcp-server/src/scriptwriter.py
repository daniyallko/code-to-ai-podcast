"""Free, deterministic scriptwriter: turns a diff into dialogue lines without any AI calls."""
from __future__ import annotations

import re
from dataclasses import dataclass

ALEX, SAM = "Alex (Staff SRE)", "Sam (Builder)"
VOICES = {ALEX: "am_michael", SAM: "af_bella"}

RISKY = [
    (r"\b(lock|mutex|redis|redlock|semaphore)\b", "locking", "a lock change — that's where race conditions hide"),
    (r"\b(retry|timeout|backoff)\b", "retries", "retry and timeout logic, my favourite source of thundering herds"),
    (r"\b(sql|migration|alter table|create table|index)\b", "database", "database changes — hope there's a rollback plan"),
    (r"\b(auth|token|password|secret|permission)\b", "security", "auth and secrets code, so we read slowly"),
    (r"\b(cache|ttl|memo)\b", "caching", "caching, the second hardest problem in computer science"),
    (r"\b(async|await|thread|goroutine|promise)\b", "concurrency", "concurrency, which means ordering bugs"),
]


@dataclass
class Line:
    speaker: str
    text: str
    emotion: str = "neutral"
    overlap_ms: int = 250
    sfx: str | None = None


def analyze(diff: str) -> dict:
    files = re.findall(r"^diff --git a/(\S+)", diff, re.M)
    added = sum(1 for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for l in diff.splitlines() if l.startswith("-") and not l.startswith("---"))
    low = diff.lower()
    risks = [(k, msg) for pat, k, msg in RISKY if re.search(pat, low)]
    tests = [f for f in files if re.search(r"(test|spec)", f, re.I)]
    return {"files": files, "added": added, "removed": removed, "risks": risks, "tests": tests}


def _short(path: str) -> str:
    return path.rsplit("/", 1)[-1]


def write(diff: str, fmt: str = "roast", title: str = "these changes", length: str = "short", intensity: str = "spicy") -> list[Line]:
    a = analyze(diff)
    n = len(a["files"])
    top = ", ".join(_short(f) for f in a["files"][:3]) or "no files at all"
    risk = a["risks"][0][1] if a["risks"] else None
    has_tests = bool(a["tests"])
    long = length == "medium"

    if fmt == "explainer":
        lines = [
            Line(ALEX, f"Welcome to the code explainer. Today we're walking through {title}.", sfx="transition_whoosh"),
            Line(ALEX, f"This change touches {n} file{'s' if n != 1 else ''}: {top}. It adds {a['added']} lines and removes {a['removed']}."),
        ]
        for f in a["files"][: (5 if long else 2)]:
            lines.append(Line(ALEX, f"In {_short(f)}, the logic is updated. Read this file first to understand the intent of the change.", sfx="keyboard_clack"))
        if risk:
            lines.append(Line(ALEX, f"One thing to watch: {risk}."))
        lines.append(Line(ALEX, "Tests were updated alongside the code, which is great." if has_tests else "No tests were changed, so consider adding coverage before merging."))
        lines.append(Line(ALEX, "That's the walkthrough. Happy reviewing."))
        return lines

    if fmt == "postmortem":
        lines = [
            Line(ALEX, f"This is the war room for {title}. Let's keep it blameless.", sfx="pager_alert"),
            Line(SAM, "So what actually changed?", overlap_ms=-200),
            Line(ALEX, f"{n} files, mainly {top}. {a['added']} lines in, {a['removed']} out."),
            Line(SAM, "What's the blast radius if this goes wrong?", sfx="transition_whoosh"),
            Line(ALEX, f"Worst case it's {risk}." if risk else "Small, honestly. It's a contained change."),
            Line(SAM, "And the follow-ups?", overlap_ms=-180),
            Line(ALEX, "Tests exist, so we add an alert and a runbook." if has_tests else "First follow-up: write the tests we should have had."),
        ]
        return lines

    spicy = intensity == "spicy"
    lines = [
        Line(SAM, f"Okay, today's pull request: {title}. I think it's great, let's ship it!", "excited", sfx="keyboard_clack"),
        Line(ALEX, "Hold on. Before we ship anything, let me read the diff.", "skeptical", -220),
        Line(SAM, f"It's {n} file{'s' if n != 1 else ''}. {top}. Plus {a['added']}, minus {a['removed']}. Tiny!"),
        Line(ALEX, f"Tiny? I see {risk}." if risk else "Tiny diffs are how outages introduce themselves politely.", "sarcastic", -260, "record_scratch"),
        Line(SAM, "Come on, it's clean code. Look at it."),
        Line(ALEX, "Clean code still pages me at three a.m." if spicy else "It's tidy, I'll give you that.", "dry", -200, "pager_alert" if spicy else None),
    ]
    if long:
        for k, msg in a["risks"][1:3]:
            lines.append(Line(SAM, f"Fine, what about the {k} bits?"))
            lines.append(Line(ALEX, f"Also {msg}.", "skeptical", -180))
    lines += [
        Line(SAM, "There are tests though!" if has_tests else "Tests are a follow-up ticket.", "hopeful"),
        Line(ALEX, "Then I'll approve. Reluctantly." if has_tests else "Famous last words. Request changes.", "resigned", -240),
    ]
    return lines
