from __future__ import annotations

TONE_GUIDANCE: dict[str, dict[str, str]] = {
    "collaborative": {
        "label": "The Value Creator",
        "description": "Focuses on transparency and building long-term relationships.",
        "best_for": "Long-term vendor contracts, strong supplier relationships, strategic partnerships.",
        "wording_rules": (
            "Lead with shared goals and mutual benefit before stating the ask. "
            "Use inclusive language ('our partnership', 'together', 'mutual benefit'). "
            "Frame payment-term changes as a long-term investment in the relationship. "
            "Emphasise transparency and solution-oriented language throughout."
        ),
    },
    "assertive": {
        "label": "The Assertive (Direct)",
        "description": "Professional, concise, and sets clear boundaries with strong arguments.",
        "best_for": "Price-sensitive deals, one-off transactions, or when you have a strong BATNA.",
        "wording_rules": (
            "Use direct, declarative statements with no hedging. "
            "Frame requirements as non-negotiable where the data supports it. "
            "Reference deadlines and objectives explicitly. "
            "Keep sentences short and outcome-oriented; avoid softening language."
        ),
    },
    "methodical": {
        "label": "The Methodical (Analytical)",
        "description": "Relies entirely on logic, benchmarks, and objective criteria — letting the facts do the talking.",
        "best_for": "Complex negotiations, fact-heavy cases, and situations requiring external benchmarks.",
        "wording_rules": (
            "Ground every point in market rates, industry standards, or precedent. "
            "Use logical sequencing: state the data, draw the inference, make the ask. "
            "Avoid emotional framing or subjective language entirely. "
            "Cite specific figures and reference external benchmarks as third-party evidence."
        ),
    },
}


def get_tone_guidance(tone_id: str | None) -> dict[str, str] | None:
    """Look up the wording guidance for a user-selected tone.

    Returns ``None`` for an unselected or unknown tone — callers fall back to
    a neutral default rather than failing, since tone is an optional
    preference, not a required input.
    """
    if not tone_id:
        return None
    return TONE_GUIDANCE.get(tone_id.strip().lower())
