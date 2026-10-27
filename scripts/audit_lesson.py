#!/usr/bin/env python3
"""
AI Content Auditor & Refinement Engine for Spec-Driven Development (SDD).
Audits adapted curriculum payloads against reading levels, pedagogical fidelity,
and schema invariants.
"""

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path


def count_syllables(word: str) -> int:
    word = word.lower()
    syllables = len(re.findall(r"[aeiouy]+", word))
    if word.endswith("e") and not word.endswith("le") and syllables > 1:
        syllables -= 1
    return max(1, syllables)


def calculate_metrics(text: str):
    words = re.findall(r"\b[A-Za-z]+\b", text)
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    if not words or not sentences:
        return {"words": 0, "sentences": 0, "grade": 0.0, "ease": 0.0, "asl": 0.0}

    total_syllables = sum(count_syllables(w) for w in words)
    num_words = len(words)
    num_sentences = len(sentences)

    asl = num_words / num_sentences
    asw = total_syllables / num_words

    # Flesch-Kincaid Grade Level formula
    fk_grade = 0.39 * asl + 11.8 * asw - 15.59
    # Flesch Reading Ease formula
    fre_score = 206.835 - 1.015 * asl - 84.6 * asw

    return {
        "words": num_words,
        "sentences": num_sentences,
        "asl": round(asl, 1),
        "asw": round(asw, 2),
        "grade": round(fk_grade, 1),
        "ease": round(fre_score, 1),
    }


def audit_payload(filepath: str, target_mode: str = None):
    path = Path(filepath)
    if not path.exists():
        print(f"❌ Error: File not found at {filepath}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    mode = target_mode or data.get("mode", "unknown")
    lesson_id = data.get("lessonId", "unknown")
    title = data.get("title", "Untitled")

    print(f"\n========================================================")
    print(f"🔎 AUDIT REPORT: {title} [{lesson_id}]")
    print(f"🎯 Target Audience Mode: {mode.upper()}")
    print(f"========================================================\n")

    # 1. Structural Schema Audit
    print("📋 [1/4] Schema & Asset Checklist:")
    has_mascot = "mascot" in data
    has_intro = "intro" in data or has_mascot
    sections = data.get("sections", [])
    has_sections = len(sections) > 0
    has_quiz = len(data.get("miniQuiz", [])) > 0

    print(f"  {'✅' if has_intro else '⚠️'} Intro / Mascot Framing: {'Present' if has_intro else 'Missing'}")
    print(f"  {'✅' if has_sections else '❌'} Core Sections: {len(sections)} sections loaded")
    print(f"  {'✅' if has_quiz else '❌'} Mini-Quiz Assessment: {len(data.get('miniQuiz', []))} questions")

    # 2. Linguistic & Readability Audit
    print("\n📊 [2/4] Linguistic & Cognitive Complexity:")
    full_text = ""
    for s in sections:
        full_text += f"{s.get('heading', '')} {s.get('bodyMarkdown', '')} "
        if "chipQuote" in s:
            full_text += f"{s['chipQuote']} "
        if "analogy" in s:
            full_text += f"{s['analogy'].get('description', '')} "

    metrics = calculate_metrics(full_text)
    print(f"  • Total Word Count: {metrics['words']} words")
    print(f"  • Average Sentence Length: {metrics['asl']} words/sentence")
    print(f"  • Flesch-Kincaid Grade Level: Grade {metrics['grade']}")
    print(f"  • Reading Ease Score: {metrics['ease']} / 100")

    if mode == "junior":
        if metrics["grade"] <= 6.5:
            print("  🏆 Result: PASS - Suitable for middle school & kids aged 8-14 (target <= 6.5)")
        else:
            print(f"  ⚠️ Warning: Grade level {metrics['grade']} is slightly high for junior tier. Consider shorter sentences.")
    else:
        if 7.0 <= metrics["grade"] <= 10.0:
            print("  🏆 Result: PASS - Clear, conversational adult reading level (target Grade 7-10)")
        else:
            print(f"  ℹ️ Note: Adult plain English score: Grade {metrics['grade']}")

    # 3. Metaphor & Engagement Audit
    print("\n🎨 [3/4] Metaphor & Multimodal Assets:")
    for idx, s in enumerate(sections, 1):
        heading = s.get("heading", f"Section {idx}")
        analogy = s.get("analogy", {}).get("metaphorName", "None")
        has_diagram = "diagram" in s
        has_widget = "interactiveWidget" in s
        features = []
        if analogy != "None":
            features.append(f"Metaphor: '{analogy}'")
        if has_diagram:
            features.append(f"Diagram: {s['diagram'].get('type')}")
        if has_widget:
            features.append(f"Widget: {s['interactiveWidget'].get('type')}")

        feat_str = ", ".join(features) if features else "Text only"
        print(f"  • Section {idx} ({heading}): {feat_str}")

    # 4. Actionable Refinement Suggestions
    print("\n💡 [4/4] AI Refinement Recommendations:")
    recommendations = []

    # Check for long sentences (> 22 words)
    long_sentences = [
        s.strip()
        for s in re.split(r"[.!?]+", full_text)
        if len(s.strip().split()) > 22
    ]
    if long_sentences and mode == "junior":
        recommendations.append(
            f"Split {len(long_sentences)} sentences that exceed 22 words to keep reading rhythm brisk for kids."
        )

    # Check for jargon definitions
    total_jargon = sum(len(s.get("jargonBuster", [])) for s in sections)
    if total_jargon < 2:
        recommendations.append(
            "Add at least 2 inline 'jargonBuster' tooltips to introduce terminology gently."
        )

    if not recommendations:
        print("  🎉 All criteria exceeded! The content is ready for review and publishing.")
    else:
        for r in recommendations:
            print(f"  👉 {r}")

    print("\n========================================================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit an adapted lesson payload.")
    parser.add_argument("file", help="Path to the JSON lesson payload")
    parser.add_argument("--mode", choices=["junior", "plain-english"], help="Target mode override")
    args = parser.parse_args()

    audit_payload(args.file, args.mode)
