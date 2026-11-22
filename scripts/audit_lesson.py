#!/usr/bin/env python3
"""
AI Content Auditor for Spec-Driven Development (SDD).

Audits adapted lesson payloads against reading levels and schema invariants.
Thresholds come from specs/quality-targets.json (single source of truth).

Exit codes: 0 = pass (warnings allowed), 1 = at least one failure, 2 = bad input.
Use --strict to treat warnings as failures.
"""

import argparse
import json
import re
import sys
from pathlib import Path

DEFAULT_TARGETS = Path(__file__).resolve().parent.parent / "specs" / "quality-targets.json"
VALID_MODES = ("junior", "plain-english")


class Report:
    def __init__(self):
        self.failures = []
        self.warnings = []

    def fail(self, msg):
        self.failures.append(msg)
        print(f"  ❌ {msg}")

    def warn(self, msg):
        self.warnings.append(msg)
        print(f"  ⚠️  {msg}")

    @staticmethod
    def ok(msg):
        print(f"  ✅ {msg}")


# ---------- text metrics ----------

def strip_markdown(text: str) -> str:
    text = re.sub(r"```.*?```", " ", text, flags=re.S)       # code fences
    text = re.sub(r"`[^`]*`", " ", text)                      # inline code
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)         # images
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)      # links -> label
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[*_#>]+", "", text)                       # emphasis/headings/quotes
    text = re.sub(r"^\s*(?:[-*+]|\d+[.)])\s+", "", text, flags=re.M)  # bullets / numbered items
    return text


def split_sentences(text: str):
    # Protect decimals, versions and common abbreviations from false splits.
    protected = re.sub(r"(?<=\d)\.(?=\d)", "<DOT>", text)
    protected = re.sub(r"\b(e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|Prof)\.", lambda m: m.group(0).replace(".", "<DOT>"), protected)
    parts = re.split(r"[.!?]+(?:\s|$)|\n{2,}", protected)
    return [p.replace("<DOT>", ".").strip() for p in parts if p.strip()]


def count_syllables(word: str) -> int:
    word = word.lower()
    syllables = len(re.findall(r"[aeiouy]+", word))
    if word.endswith("e") and not word.endswith("le") and syllables > 1:
        syllables -= 1
    return max(1, syllables)


def calculate_metrics(sentences):
    words = [w for s in sentences for w in re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", s)]
    if not words or not sentences:
        return {"words": 0, "sentences": 0, "asl": 0.0, "grade": 0.0, "ease": 0.0}
    asl = len(words) / len(sentences)
    asw = sum(count_syllables(w) for w in words) / len(words)
    return {
        "words": len(words),
        "sentences": len(sentences),
        "asl": round(asl, 1),
        "grade": round(0.39 * asl + 11.8 * asw - 15.59, 1),
        "ease": round(206.835 - 1.015 * asl - 84.6 * asw, 1),
    }


def section_sentences(section: dict):
    """Each field is split on its own, so headings never merge into body text."""
    fields = [section.get("heading", ""), section.get("chipQuote", ""), section.get("bodyMarkdown", "")]
    analogy = section.get("analogy")
    if isinstance(analogy, dict):
        fields.append(analogy.get("description", ""))
    out = []
    for f in fields:
        if isinstance(f, str):
            out.extend(split_sentences(strip_markdown(f)))
    return out


# ---------- audit ----------

def load_json(path: Path, what: str):
    if not path.exists():
        print(f"❌ {what} not found: {path}", file=sys.stderr)
        sys.exit(2)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ {what} is not valid JSON ({path}): {e}", file=sys.stderr)
        sys.exit(2)


def as_dict(value):
    return value if isinstance(value, dict) else {}


def audit_payload(filepath: str, target_mode: str, targets: dict, strict: bool) -> int:
    data = load_json(Path(filepath), "Lesson file")
    if not isinstance(data, dict):
        print("❌ Lesson payload must be a JSON object", file=sys.stderr)
        return 2

    mode = target_mode or data.get("mode")
    if mode not in VALID_MODES:
        print(f"❌ Unknown mode {mode!r}; expected one of {VALID_MODES} (use --mode to override).", file=sys.stderr)
        return 2
    t = targets["modes"][mode]
    st, wt, qt = targets["sections"], targets["widgets"], targets["quiz"]

    sections = [s for s in data.get("sections", []) if isinstance(s, dict)]
    r = Report()

    print("\n========================================================")
    print(f"🔎 AUDIT: {data.get('title', 'Untitled')} [{data.get('lessonId', 'unknown')}]")
    print(f"🎯 Mode: {mode.upper()}")
    print("========================================================")

    # 1. Structure
    print("\n📋 [1/4] Structure:")
    if "mascot" in data or "intro" in data:
        r.ok("Intro / mascot framing present")
    else:
        r.warn("No intro or mascot framing")
    if sections:
        r.ok(f"{len(sections)} sections")
    else:
        r.fail("No sections")
    quiz = data.get("miniQuiz", [])
    if len(quiz) >= qt["minQuestions"]:
        r.ok(f"{len(quiz)} quiz questions")
    else:
        r.fail(f"Quiz has {len(quiz)} questions (min {qt['minQuestions']})")

    # 2. Readability (per lesson, from per-field sentences)
    print("\n📊 [2/4] Readability:")
    all_sentences = [s for sec in sections for s in section_sentences(sec)]
    m = calculate_metrics(all_sentences)
    print(f"  • {m['words']} words, {m['sentences']} sentences, avg {m['asl']} words/sentence")
    print(f"  • Flesch-Kincaid grade {m['grade']} (target {t['gradeMin']}–{t['gradeMax']}), reading ease {m['ease']}")
    if m["words"] == 0:
        r.fail("No readable text found")
    elif m["grade"] > t["gradeMax"]:
        r.fail(f"Grade {m['grade']} exceeds max {t['gradeMax']} for {mode}")
    elif m["grade"] < t["gradeMin"]:
        r.warn(f"Grade {m['grade']} is below {t['gradeMin']}; may read as patronising for {mode}")
    else:
        r.ok("Reading level within target")
    if m["asl"] > t["maxAvgSentenceWords"]:
        r.warn(f"Average sentence length {m['asl']} exceeds {t['maxAvgSentenceWords']}")
    long_count = sum(1 for s in all_sentences if len(s.split()) > t["maxSentenceWords"])
    if long_count:
        r.warn(f"{long_count} sentence(s) longer than {t['maxSentenceWords']} words")

    # 3. Multimodal assets and accessibility
    print("\n🎨 [3/4] Visuals, accessibility and widgets:")
    for idx, s in enumerate(sections, 1):
        label = f"Section {idx} ({s.get('heading', 'untitled')})"
        analogy = as_dict(s.get("analogy"))
        diagram = as_dict(s.get("diagram"))
        widget = as_dict(s.get("interactiveWidget"))

        if st["requireAnalogy"] and not analogy.get("metaphorName"):
            r.fail(f"{label}: no analogy")
        if st["requireDiagram"] and not diagram and not widget:
            r.fail(f"{label}: no diagram or interactive widget")
        if diagram and st["requireDiagramAlt"] and not str(diagram.get("alt", "")).strip():
            r.fail(f"{label}: diagram missing 'alt' text")
        if widget:
            wtype = widget.get("type", "?")
            if wt["requireGoal"] and not str(widget.get("goal", "")).strip():
                r.warn(f"{label}: widget '{wtype}' has no learner 'goal'")
            if wt["requireScaffold"]:
                sc = widget.get("scaffold")
                if sc not in wt["allowedScaffolds"]:
                    r.warn(f"{label}: widget '{wtype}' scaffold {sc!r} not in {wt['allowedScaffolds']}")
    if not r.failures and not r.warnings:
        r.ok("All visual and accessibility checks pass")

    # 4. Jargon
    print("\n💡 [4/4] Vocabulary support:")
    jargon = sum(len(s.get("jargonBuster", []) or []) for s in sections)
    if jargon < t["minJargonBusters"]:
        r.warn(f"Only {jargon} jargonBuster entries (min {t['minJargonBusters']})")
    else:
        r.ok(f"{jargon} jargonBuster entries")

    failed = bool(r.failures) or (strict and bool(r.warnings))
    print("\n--------------------------------------------------------")
    print(f"Result: {'FAIL' if failed else 'PASS'}  ({len(r.failures)} failures, {len(r.warnings)} warnings)"
          f"{' [strict]' if strict else ''}")
    print("--------------------------------------------------------\n")
    return 1 if failed else 0


def main():
    p = argparse.ArgumentParser(description="Audit an adapted lesson payload.")
    p.add_argument("files", nargs="+", help="Path(s) to lesson JSON payload(s)")
    p.add_argument("--mode", choices=VALID_MODES, help="Override the mode found in the file")
    p.add_argument("--targets", default=str(DEFAULT_TARGETS), help="Path to quality-targets.json")
    p.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    args = p.parse_args()

    targets = load_json(Path(args.targets), "Targets config")
    worst = 0
    for f in args.files:
        worst = max(worst, audit_payload(f, args.mode, targets, args.strict))
    sys.exit(worst)


if __name__ == "__main__":
    main()
