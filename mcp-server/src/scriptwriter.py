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
    spoken_text: str | None = None

    def __post_init__(self):
        if self.spoken_text is None:
            self.spoken_text = to_spoken_text(self.text)


def to_spoken_text(text: str) -> str:
    """Pronunciation changes only; captions retain the original identifiers."""
    text = re.sub(r"\bp99\b", "p ninety nine", text, flags=re.I)
    text = re.sub(r"\b([\w-]+)\.py\b", r"\1 dot py", text)
    text = re.sub(r"\bTTL\b", "T T L", text)
    text = re.sub(r"\bOOM\b", "O O M", text)
    return re.sub(r"\b_*[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]*\b", lambda m: m[0].strip("_").replace("_", " ").lower(), text)


def analyze(diff: str) -> dict:
    files = re.findall(r"^diff --git a/(\S+)", diff, re.M)
    added = sum(1 for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for l in diff.splitlines() if l.startswith("-") and not l.startswith("---"))
    low = diff.lower()
    risks = [(k, msg) for pat, k, msg in RISKY if re.search(pat, low)]
    tests = [f for f in files if re.search(r"(test|spec)", f, re.I)]
    symbols = list(dict.fromkeys(re.findall(r"^[+-]\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(", diff, re.M)))
    changed = "\n".join(l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
    behavior = []
    if re.search(r"\b(?:await|async)\b", changed):
        behavior.append("The added code uses async execution; review what must complete before the next step.")
    if re.search(r"\breturn\b", changed):
        behavior.append("The added code includes a return path; compare its result with the removed code.")
    if re.search(r"\b(?:raise|except)\b", changed):
        behavior.append("The added code handles or raises an exception; check callers of that path.")
    return {"files": files, "added": added, "removed": removed, "risks": risks, "tests": tests, "symbols": symbols, "behavior": behavior}


def _short(path: str) -> str:
    return path.rsplit("/", 1)[-1]


def write(diff: str, fmt: str = "roast", title: str = "these changes", length: str = "short", intensity: str = "spicy") -> list[Line]:
    a = analyze(diff)
    n = len(a["files"])
    top = ", ".join(_short(f) for f in a["files"][:3]) or "no files at all"
    risk = a["risks"][0][0] if a["risks"] else None
    has_tests = bool(a["tests"])
    long = length == "medium"

    facts = f"{n} changed file{'s' if n != 1 else ''}: {top}. {a['added']} added lines, {a['removed']} removed."
    symbols = "Changed functions: " + ", ".join(a["symbols"][:5]) + "." if a["symbols"] else "No changed Python function definitions are visible in this diff."
    concern = f"The diff includes {risk} code. Review that path; a pattern match does not prove a failure." if risk else "This diff cannot establish the blast radius. Check callers and deployment context."
    tests = f"Changed test files: {', '.join(a['tests'][:3])}. That does not tell us whether they pass." if has_tests else "No test files changed in this diff. Existing coverage and test results are unknown."
    behavior = a["behavior"][:(3 if long else 1)]

    if fmt == "explainer":
        lines = [
            Line(ALEX, f"Welcome to the code explainer. Today we're walking through {title}.", sfx="transition_whoosh"),
            Line(ALEX, facts),
            Line(ALEX, symbols, sfx="keyboard_clack"),
        ]
        lines.extend(Line(ALEX, b) for b in behavior)
        lines.extend([Line(ALEX, concern), Line(ALEX, tests)])
        return lines

    if fmt == "postmortem":
        lines = [
            Line(ALEX, f"This is the war room for {title}. Let's keep it blameless.", sfx="pager_alert"),
            Line(SAM, "So what actually changed?", overlap_ms=-200),
            Line(ALEX, facts),
            Line(ALEX, symbols),
            Line(SAM, "What's the blast radius if this goes wrong?", sfx="transition_whoosh"),
            Line(ALEX, "A code diff alone does not prove an incident timeline or root cause. " + concern),
            Line(SAM, "And the follow-ups?", overlap_ms=-180),
            Line(ALEX, tests),
        ]
        lines.extend(Line(ALEX, b) for b in behavior)
        return lines

    spicy = intensity == "spicy"
    lines = [
        Line(SAM, f"Today's pull request: {title}. {facts}", "excited", sfx="keyboard_clack"),
        Line(ALEX, symbols, "skeptical", -220),
        Line(SAM, "So what needs a closer look?", "curious"),
        Line(ALEX, concern, "sarcastic", -260, "record_scratch"),
    ]
    lines.extend(Line(ALEX, b, "focused") for b in behavior)
    if long:
        for k, _ in a["risks"][1:3]:
            lines.append(Line(SAM, f"Fine, what about the {k} bits?"))
            lines.append(Line(ALEX, f"The diff also mentions {k}. Check the changed path and its callers.", "skeptical", -180))
    lines += [
        Line(SAM, tests, "hopeful"),
        Line(ALEX, f"{top}: line counts aren't a safety certificate." if spicy else f"Review {top} with its callers before deciding to merge.", "dry", -200),
    ]
    return lines
