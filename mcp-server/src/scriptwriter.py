"""Scriptwriter: diff -> dialogue. Uses Groq (if GROQ_API_KEY is set) and falls back to a free rule-based writer."""
from __future__ import annotations

import hashlib
import random
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

# (pattern on added lines, id, roast line, explainer line)
SMELLS = [
    (r"\b(console\.log|print\(|debugger\b|println!?\()", "debug",
     "Someone shipped a debug print. Production logs are about to get chatty.",
     "The change adds a debug print; consider removing it before release."),
    (r"(catch\s*(\([^)]*\))?\s*\{\s*\}|except[^:\n]*:\s*pass)", "swallow",
     "An empty catch block. Swallow the error and pray nobody notices.",
     "An exception is caught and ignored, so failures on that path will be silent."),
    (r"\b(TODO|FIXME|HACK|XXX)\b", "todo",
     "There's a fresh TODO in here. Future you just got a ticket.",
     "New TODO or FIXME markers mark work that is knowingly unfinished."),
    (r"(@pytest\.mark\.skip|\bxit\(|\bit\.skip\(|\btest\.skip\(|\.only\()", "skip",
     "A test got skipped. Classic: if the test fails, mute the test.",
     "A test is skipped or focused, so the suite no longer covers everything."),
    (r"(#\s*type:\s*ignore|@ts-ignore|@ts-expect-error|eslint-disable|as any\b|:\s*any\b)", "typeescape",
     "A type-checker silencer. The compiler raised a hand and got told to sit down.",
     "A type or lint check is suppressed here, which hides a mismatch rather than fixing it."),
    (r"(time\.sleep\(|setTimeout\([^,]+,\s*\d{3,}|Thread\.sleep\()", "sleep",
     "A hardcoded sleep. Nothing says reliable like waiting and hoping.",
     "A fixed delay is used; that tends to hide timing problems."),
    (r"(localhost:\d+|127\.0\.0\.1|chmod\s+777)", "hardcode",
     "A hardcoded localhost. Works on my machine, ships to yours.",
     "A local address or open permission is hardcoded and may not hold in production."),
]

OPENERS_ROAST = [
    "Hold onto your pager, someone just shipped {title}.",
    "Grab a coffee. Today's pull request is {title}, and it's either genius or a three A M incident.",
    "Welcome back to the roast. On the grill today: {title}.",
    "I opened {title} and my SRE senses started tingling.",
    "Alright, today's victim. I mean, today's contribution: {title}.",
]
REACT_SAM = ["Hey, it ships!", "Okay, but hear me out.", "In my defence, it worked locally.", "That's harsh. Accurate, but harsh.", "Fine. What else?"]
CLOSERS = [
    "Verdict: approve, but somebody watch the dashboards on deploy day.",
    "Verdict: merge it, then write the test you know you skipped.",
    "Verdict: request changes, lovingly.",
    "Verdict: ship it, and keep the rollback button warm.",
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


def clean_title(title: str) -> str:
    """Strip commit hashes, PR numbers and conventional-commit prefixes for speech."""
    t = re.sub(r"\b[0-9a-f]{7,40}\b", "", title or "", flags=re.I)
    t = re.sub(r"^\s*(merge (pull request|branch)[^:]*:?)", "", t, flags=re.I)
    t = re.sub(r"^\s*(feat|fix|chore|docs|refactor|perf|test|build|ci|style)(\([^)]*\))?!?:\s*", "", t, flags=re.I)
    t = re.sub(r"\(?#\d+\)?", "", t)
    t = re.sub(r"^\s*(commit|pr)\b[:\s]*", "", t, flags=re.I)
    t = re.sub(r"\s+", " ", t).strip(" -:·")
    return t or "these changes"


def nice_name(path: str) -> str:
    """'src/auth/oauth_handler_v2.py' -> 'oauth handler v2'."""
    base = path.rsplit("/", 1)[-1]
    stem = base.split(".")[0] or base
    if stem.lower() in {"index", "main", "__init__", "mod"} and "/" in path:
        stem = path.rsplit("/", 2)[-2]
    stem = re.sub(r"([a-z])([A-Z])", r"\1 \2", stem)
    return re.sub(r"[_\-.]+", " ", stem).strip().lower() or base


def to_spoken_text(text: str) -> str:
    """Pronunciation changes only; captions retain the original identifiers."""
    text = re.sub(r"\b[0-9a-f]{12,40}\b", "this commit", text, flags=re.I)
    text = re.sub(r"\b(?:[\w.-]+/)+([\w.-]+)", lambda m: nice_name(m[0]), text)
    text = re.sub(r"\bp99\b", "p ninety nine", text, flags=re.I)
    text = re.sub(r"\b([\w-]+)\.py\b", r"\1 dot py", text)
    text = re.sub(r"\b([\w-]+)\.(tsx?|jsx?)\b", r"\1", text)
    text = text.replace("!==", " is not ").replace("===", " equals ").replace("!=", " is not ").replace("==", " equals ").replace("&&", " and ").replace("||", " or ").replace("=>", " arrow ")
    text = re.sub(r"\bTTL\b", "T T L", text)
    text = re.sub(r"\bOOM\b", "O O M", text)
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"\b(?:_+[A-Za-z][A-Za-z0-9_]*|[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+)\b", lambda m: m[0].strip("_").replace("_", " ").lower(), text)
    return re.sub(r"\s{2,}", " ", text).strip()


def _quotable(line: str) -> bool:
    s = line.strip()
    return 12 <= len(s) <= 90 and not re.match(r"^(import|from|#include|use |\}|\{|//|#|/\*|\*)", s) and re.search(r"[A-Za-z]", s) is not None


def analyze(diff: str) -> dict:
    files = re.findall(r"^diff --git a/(\S+)", diff, re.M)
    lines = diff.splitlines()
    plus = [l[1:] for l in lines if l.startswith("+") and not l.startswith("+++")]
    minus = [l[1:] for l in lines if l.startswith("-") and not l.startswith("---")]
    low = diff.lower()
    risks = [(k, msg) for pat, k, msg in RISKY if re.search(pat, low)]
    tests = [f for f in files if re.search(r"(test|spec)", f, re.I)]
    symbols = list(dict.fromkeys(re.findall(
        r"^[+-]\s*(?:export\s+)?(?:async\s+)?(?:def|function|fn|func|class)\s+([A-Za-z_]\w*)", diff, re.M)
        + re.findall(r"^[+-]\s*(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(", diff, re.M)))
    changed = "\n".join(plus)
    smells = []
    for pat, sid, roast, explain in SMELLS:
        hit = next((l.strip() for l in plus if re.search(pat, l)), None)
        if hit:
            smells.append({"id": sid, "roast": roast, "explain": explain, "line": hit[:90]})
    quotes = [l.strip() for l in plus if _quotable(l)]
    removed_quotes = [l.strip() for l in minus if _quotable(l)]
    behavior = []
    if re.search(r"\b(?:await|async)\b", changed):
        behavior.append("The added code uses async execution; review what must complete before the next step.")
    if re.search(r"\breturn\b", changed):
        behavior.append("The added code includes a return path; compare its result with the removed code.")
    if re.search(r"\b(?:raise|except|throw|catch)\b", changed):
        behavior.append("The added code handles or raises an exception; check callers of that path.")
    return {"files": files, "added": len(plus), "removed": len(minus), "risks": risks, "tests": tests,
            "symbols": symbols, "behavior": behavior, "smells": smells, "quotes": quotes, "removed_quotes": removed_quotes}


def _short(path: str) -> str:
    return nice_name(path)


def _size_quip(a: dict, rng: random.Random) -> str:
    n, add, rem = len(a["files"]), a["added"], a["removed"]
    if rem > add * 2 and rem > 20:
        return rng.choice([f"They deleted {rem} lines and added {add}. My favourite kind of pull request.", f"Net negative code: {rem} lines gone. Somebody likes cleaning."])
    if add > 400:
        return rng.choice([f"{add} new lines across {n} files. That's not a pull request, that's a novel.", f"{add} added lines. Reviewers everywhere just felt a chill."])
    if add + rem < 10:
        return rng.choice([f"Tiny one: {add} lines in, {rem} out. The small ones bite hardest.", "Barely a handful of lines. Famous last words."])
    return f"{n} file{'s' if n != 1 else ''}, {add} lines in, {rem} out."


def write_rules(diff: str, fmt: str = "roast", title: str = "these changes", length: str = "short", intensity: str = "spicy") -> list[Line]:
    a = analyze(diff)
    rng = random.Random(hashlib.sha1((diff + fmt + (title or "")).encode()).hexdigest())
    t = clean_title(title)
    names = list(dict.fromkeys(_short(f) for f in a["files"]))
    top = ", ".join(names[:3]) or "no files at all"
    risk = a["risks"][0][0] if a["risks"] else None
    long = length == "medium"
    symbols = ("The functions that changed: " + ", ".join(a["symbols"][:4]) + ".") if a["symbols"] else ""
    concern = (f"The diff touches {risk} code. Read that path closely; a pattern match is not proof of a bug." if risk
               else "This diff cannot establish the blast radius on its own. Check the callers.")
    tests = (f"Tests were touched too, in {', '.join(_short(x) for x in a['tests'][:2])}. Whether they pass is another story." if a["tests"]
             else "And no test files changed. Coverage is anyone's guess.")
    smells = a["smells"][:(3 if long else 2)]
    quote = rng.choice(a["quotes"]) if a["quotes"] else None

    if fmt == "explainer":
        lines = [Line(ALEX, f"Welcome to the code explainer. Today: {t}.", sfx="transition_whoosh"),
                 Line(ALEX, f"This touches {top}. " + _size_quip(a, rng))]
        if symbols:
            lines.append(Line(ALEX, symbols, sfx="keyboard_clack"))
        if quote:
            lines.append(Line(ALEX, f"A representative new line reads: {quote}"))
        lines += [Line(ALEX, b) for b in a["behavior"][:(3 if long else 1)]]
        lines += [Line(ALEX, s["explain"]) for s in smells]
        lines += [Line(ALEX, concern), Line(ALEX, tests)]
        return lines

    if fmt == "postmortem":
        lines = [Line(ALEX, f"War room is open for {t}. Blameless, as always.", sfx="pager_alert"),
                 Line(SAM, rng.choice(["So, what actually changed?", "Walk me through it.", "Where do we start?"]), overlap_ms=-200),
                 Line(ALEX, f"The change lands in {top}. " + _size_quip(a, rng))]
        if symbols:
            lines.append(Line(ALEX, symbols))
        if quote:
            lines += [Line(SAM, "Show me the line you're worried about.", overlap_ms=-150), Line(ALEX, f"This one: {quote}")]
        lines.append(Line(SAM, "What's the blast radius?", sfx="transition_whoosh"))
        lines.append(Line(ALEX, "A diff alone can't prove a root cause. " + concern))
        lines += [Line(ALEX, s["explain"]) for s in smells]
        lines += [Line(SAM, "Follow ups?", overlap_ms=-180), Line(ALEX, tests)]
        return lines

    spicy = intensity == "spicy"
    lines = [Line(SAM, rng.choice(OPENERS_ROAST).format(title=t), "excited", sfx="keyboard_clack"),
             Line(ALEX, f"Changes in {top}. " + _size_quip(a, rng), "skeptical", rng.randint(-260, -120))]
    if quote:
        lines.append(Line(SAM, f"Look at this line: {quote}", "amused", rng.randint(-200, -80)))
        lines.append(Line(ALEX, rng.choice(["Bold. I respect it. I don't trust it.", "I've seen that line before. In an incident report.", "That line has big main character energy."]), "dry", -220, "record_scratch"))
    for s in smells:
        lines.append(Line(ALEX if spicy else SAM, s["roast"] if spicy else s["explain"], "sarcastic", rng.randint(-240, -100)))
        lines.append(Line(SAM, rng.choice(REACT_SAM), "defensive", rng.randint(-200, -60)))
    if a["removed_quotes"] and long:
        lines.append(Line(SAM, f"And they deleted this: {rng.choice(a['removed_quotes'])}", "curious"))
        lines.append(Line(ALEX, "Rest in peace. Hope nothing depended on it.", "dry", -180))
    if symbols:
        lines.append(Line(SAM, symbols, "curious"))
    lines.append(Line(ALEX, concern, "skeptical", -200))
    lines += [Line(ALEX, b, "focused") for b in a["behavior"][:(2 if long else 0)]]
    lines += [Line(SAM, tests, "hopeful"), Line(ALEX, rng.choice(CLOSERS), "dry", -200)]
    return lines


def write(diff: str, fmt: str = "roast", title: str = "these changes", length: str = "short", intensity: str = "spicy") -> list[Line]:
    from . import llm_writer
    lines = llm_writer.write(diff, fmt, title, length, intensity, analyze(diff))
    return lines or write_rules(diff, fmt, title, length, intensity)
