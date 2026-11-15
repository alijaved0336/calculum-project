"""The client's five reference emails, and the rules each one carries with it.

`opening_email.py` decides WHAT the first supplier email may say — the terms,
the date, the contact, the sign-off. This module decides WHICH email it is.

The client supplies five reference emails. They are not five tones of the same
notice; they are five different documents with different content rules:

* :attr:`EmailTemplate.STANDARD` — the short notification. Terms, date, stop.
  This is the default and the only one the original single-format email wrote.
* :attr:`EmailTemplate.LONGER` — the same notification with the process context
  and a feedback deadline the client actually wants stated.
* :attr:`EmailTemplate.COLLABORATIVE` — the negotiable version. It says out loud
  that the buyer is willing to negotiate, which every other variant forbids.
* :attr:`EmailTemplate.SCF` — the longer notice plus the early-payment paragraph.
  Gated: it can only be sent where the programme can actually be offered.
* :attr:`EmailTemplate.SENIOR_MANAGEMENT` — the executive-sponsorship message.
  No subject line, no day figures and no date in the client's reference.

That difference is the whole reason this module exists. The validator in
`opening_email.py` bans requesting language ("we would like"), justification
("industry standards", "cash flow") and figures the spec did not supply — and
three of the five reference emails are written in exactly that language,
because the client wants them to be. Left as one global rule set, those three
variants could never pass validation: every draft would be regenerated until it
came back as the short notice again.

So each template carries its own carve-outs, named phrase by phrase. A template
permits the wording ITS reference uses and nothing else — "we would like" is
allowed in the collaborative email and still rejected in the other four.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from enum import Enum


class EmailTemplate(str, Enum):
    """Which of the client's reference emails a request is asking for."""

    STANDARD = "standard"
    LONGER = "longer"
    COLLABORATIVE = "collaborative"
    SCF = "scf"
    SENIOR_MANAGEMENT = "senior_management"
    # The negotiator's own email. Not a sixth client reference — it is the
    # STANDARD notice used as the DEFAULT for everything they did not specify,
    # with every part of it theirs to change. See the registry entry below.
    CUSTOM = "custom"


class DeadlineKind(str, Enum):
    """What the date in this email is a deadline FOR.

    The same resolved date means different things per template: the day the new
    terms take effect, the day feedback is due, or the payment due date. The
    email has to say which, and the model must not pick.
    """

    EFFECTIVE = "effective"
    FEEDBACK = "feedback"
    DUE = "due"
    NONE = "none"


@dataclass(frozen=True)
class EmailTemplateSpec:
    """One reference email, plus the rules that make it sendable."""

    id: EmailTemplate
    label: str
    # One line naming what this variant is for. Goes in the prompt so the model
    # knows which job it is doing, not just which shape to copy.
    purpose: str
    # The client's reference email, near-verbatim. Placeholders are the client's
    # own; `[Supplier]` stands in for the recipient named in their copy, so no
    # real customer name can survive into a draft.
    reference: str
    # The ordered sections, said in words. The reference shows the shape; this
    # says which parts are obligatory when the negotiator's instruction pushes
    # the wording around.
    structure: tuple[str, ...]
    word_cap: int
    deadline_kind: DeadlineKind
    # How the deadline is worded, with and without an approved calendar date.
    deadline_with_date: str
    deadline_relative: str
    # Whether the email must state the new term as a day figure. The senior
    # management message deliberately does not.
    requires_term_figure: bool
    requires_subject: bool
    # Wording from the global bans that THIS reference uses on purpose. Matched
    # as lowercase substrings, exactly like the ban lists themselves.
    allowed_negotiation_phrases: frozenset[str]
    allowed_justification_phrases: frozenset[str]
    # Whether this variant can only be drafted where SCF can actually be offered.
    requires_scf: bool
    # Anything else the drafter has to be told about this variant specifically.
    notes: tuple[str, ...] = ()


# ── The reference emails ──────────────────────────────────────────────────
#
# Reproduced from the client's document. `Adp, Inc` — the supplier their copy
# happened to name — is replaced by `[Supplier]` in every one: left as-is, it is
# a real company name sitting in the prompt next to an instruction to write a
# supplier email, and it eventually turns up in a draft addressed to someone
# else. Every other placeholder is theirs and is mapped in the prompt.
#
# One further change: the senior-management reference signed `[Your Name]` where
# the other four sign `XXX`. It signs `XXX` here too — the name line is the same
# static placeholder in all five (`SIGN_OFF_NAME_PLACEHOLDER` in
# `opening_email.py`), and a reference that shows a different one is an
# invitation to resolve it.
#
# And a third: that same reference carried a `[Title]` line, alone among the
# five. The client asked for the title gone from the signature, so it is gone
# from here as well — left in, it is the one reference showing a line every
# other rule now says the email does not have, and the drafter copies what the
# reference shows.

_REF_STANDARD = """\
Subject: Payment Terms Standardisation of — 60 Days Effective by [MM, DD, YYYY]

Dear [Supplier] Team,

As part of our ongoing standardisation of payment terms across our supplier base, we are formally notifying you of an update to your payment terms.

We are changing your current payment terms of 45 days to a new standard term of 60 days. We value our partnership and want to ensure a smooth transition. These updated terms will take effect by [MM, DD, YYYY]

Thank you for your attention to this matter.

Kind Regards
XXX
[Company]"""

_REF_LONGER = """\
Subject: Notice of Payment Terms Standardization - Action Required by [MM, DD, YYYY]

Dear [Supplier] Team,

I trust this email finds you well.

I am writing to inform you about [Buyer Name]'s initiative on the standardization of payment terms. To better align with our internal processes and industry standards, [Buyer Name] is standardizing payment terms to [XX] days for all suppliers.

We value our partnership and want to ensure a smooth transition. Please share your feedback on this proposed change by [MM, DD, YYYY]. If we don't hear from you by this date, we will assume you are in agreement and proceed with implementing the new payment terms.

Should you have any questions or require further clarification, please do not hesitate to reach out to us directly by responding to this email.

We look forward to your prompt response.

Kind Regards
XXX
[Company]"""

_REF_COLLABORATIVE = """\
Subject: Standardizing Payment Terms - [Buyer Name]

Dear [Supplier] Team,

I trust this email finds you well.

As you know, [Buyer Name] is focused on investing in the growth of our business to deliver exceptional customer value. This includes significant investments in end-to-end supply chain solutions and technologies.

To support these investments and continue our growth trajectory, we must constantly drive innovation and efficiency throughout our supply chain.

Following extensive analysis, our leadership team has determined that adjusting our overall payment terms is essential to meet industry standards and remain competitive. We value our business relationship with you and look forward to continuing to work together.

We understand that payment terms are essential to both parties, and we are willing to negotiate a mutually beneficial payment arrangement. Also, we would like to request the following payment terms:

Payment Terms: [XX] days
Due Date: [MM, DD, YYYY]

These payment terms are fair and reasonable to be aligned to the industry and other peers in the market. We value our ongoing cooperation with your firm and look forward to your feedback at your earliest convenience.

Sincerely,
XXX
[Company]"""

_REF_SCF = """\
Subject: Notice of Payment Terms Standardization - Supply Chain Finance

Dear [Supplier] Team,

I am writing to inform you about [Buyer Name]'s initiative on the standardization of payment terms. To better align with our internal processes and industry standards, [Buyer Name] is standardizing payment terms to [XX] days for all suppliers.

We value our partnership and want to ensure a smooth transition. Please share your feedback on this proposed change by [MM, DD, YYYY]. If we don't hear from you by this date, we will assume you are in agreement and proceed with implementing the new payment terms.

We understand that this transition may pose challenges for some suppliers. In line with our commitment to supporting you, we have partnered with a third-party provider to offer early payment options, enhancing your cash flow while adapting to the new terms seamlessly.

Should you have any questions or require further clarification, please do not hesitate to reach out to us directly by responding to this email. Thank you for your attention to this matter, and I look forward to your prompt response.

Best regards,
XXX
[Company]"""

_REF_SENIOR_MANAGEMENT = """\
Dear Valued Supplier Partner,

At [Buyer Name], we are continuously evaluating our operational strategies to ensure sustainable, long-term growth and competitiveness in our industry. As part of this effort, our executive leadership team has launched a company-wide strategic initiative focused on optimizing our working capital and streamlining financial operations across our entire supply chain.

A critical component of this strategy involves standardizing and extending our payment terms across our global supplier base. Enhancing our financial flexibility strengthens our market position, directly enables continued investment in growth, and reinforces our ability to build stronger, more resilient partnerships with key suppliers like you over the long term.

Because this initiative is driven directly by top management, alignment on payment terms is a mandatory requirement for all our active vendors and suppliers. These discussions are an essential part of our broader company objectives, and full participation in this process is required to maintain a forward-looking business relationship.

Our dedicated Category Manager will lead these discussions with your team to review our target terms and establish an implementation plan.

We deeply appreciate your continued partnership and active support as we execute this critical strategic milestone together.

Sincerely,
XXX
[Company]"""


# ── The registry ──────────────────────────────────────────────────────────

_TEMPLATES: dict[EmailTemplate, EmailTemplateSpec] = {
    EmailTemplate.STANDARD: EmailTemplateSpec(
        id=EmailTemplate.STANDARD,
        label="Standard notification",
        purpose=(
            "The default first email: a short, formal notification that the "
            "payment terms are being standardised, and when it takes effect. "
            "It is not a request, a proposal or an invitation to discuss."
        ),
        reference=_REF_STANDARD,
        structure=(
            "Subject line",
            "Greeting addressed to the supplier",
            "One sentence of standardisation context",
            "One sentence stating the change from the current term to the new term",
            "One sentence stating when it takes effect",
            "Administrative contact — only if the spec approved one",
            "A one-line thanks",
            "Sign-off",
        ),
        word_cap=150,
        deadline_kind=DeadlineKind.EFFECTIVE,
        deadline_with_date="These updated terms will take effect by {deadline}.",
        deadline_relative=(
            "These updated terms will take effect within {window} days of the "
            "date of this email."
        ),
        requires_term_figure=True,
        requires_subject=True,
        allowed_negotiation_phrases=frozenset(),
        allowed_justification_phrases=frozenset(),
        requires_scf=False,
        notes=(
            "No feedback request, no invitation to discuss, no reasoning about "
            "why the change is being made.",
        ),
    ),
    EmailTemplate.LONGER: EmailTemplateSpec(
        id=EmailTemplate.LONGER,
        label="Longer notification",
        purpose=(
            "The same standardisation notice, written at length: it names the "
            "initiative, gives the supplier a date to respond by, and says what "
            "happens if they do not."
        ),
        reference=_REF_LONGER,
        structure=(
            "Subject line",
            "Greeting addressed to the supplier",
            "A one-line courteous opener",
            "A paragraph naming the standardisation initiative and the new term",
            "A paragraph giving the feedback deadline and the consequence of silence",
            "An offer to answer questions by replying to this email",
            "A closing line",
            "Sign-off",
        ),
        word_cap=230,
        deadline_kind=DeadlineKind.FEEDBACK,
        deadline_with_date=(
            "Please share your feedback on this proposed change by {deadline}. "
            "If we don't hear from you by this date, we will assume you are in "
            "agreement and proceed with implementing the new payment terms."
        ),
        deadline_relative=(
            "Please share your feedback on this proposed change within {window} "
            "days of the date of this email. If we don't hear from you by then, "
            "we will assume you are in agreement and proceed with implementing "
            "the new payment terms."
        ),
        requires_term_figure=True,
        requires_subject=True,
        # The feedback deadline is the point of this variant. It is a response
        # window on a decision already taken, not an invitation to counter — so
        # only the wording the client's reference actually uses is unbanned.
        allowed_negotiation_phrases=frozenset({
            "we look forward to hearing",
        }),
        allowed_justification_phrases=frozenset({
            "industry standard",
        }),
        requires_scf=False,
        notes=(
            "\"To better align with our internal processes and industry "
            "standards\" is the ONLY reasoning permitted. No benchmark figures, "
            "no peer comparison, no spend, no cash-flow argument.",
            "The feedback deadline is a response window on a decision already "
            "taken. Never offer to change the term, and never say the term is "
            "negotiable.",
        ),
    ),
    EmailTemplate.COLLABORATIVE: EmailTemplateSpec(
        id=EmailTemplate.COLLABORATIVE,
        label="Negotiable, collaborative version",
        purpose=(
            "The negotiable version: it explains why the buyer is changing "
            "terms, states the terms being requested, and says openly that the "
            "buyer is willing to negotiate a mutually beneficial arrangement."
        ),
        reference=_REF_COLLABORATIVE,
        structure=(
            "Subject line",
            "Greeting addressed to the supplier",
            "A one-line courteous opener",
            "A paragraph on the buyer's investment and growth context",
            "A paragraph on why terms are being adjusted",
            "A paragraph stating openness to negotiate, introducing the requested terms",
            "The requested terms as two labelled lines: Payment Terms and Due Date",
            "A closing line inviting their feedback",
            "Sign-off",
        ),
        word_cap=280,
        deadline_kind=DeadlineKind.DUE,
        deadline_with_date="Due Date: {deadline}",
        deadline_relative=(
            "Due Date: within {window} days of the date of this email"
        ),
        requires_term_figure=True,
        requires_subject=True,
        # This is the one variant that is allowed to ask rather than tell. It is
        # still not allowed to argue with figures.
        allowed_negotiation_phrases=frozenset({
            "we would like",
            "we request",
            "we are requesting",
            "we propose",
            "welcome your feedback",
            "we welcome your",
            "we look forward to hearing",
        }),
        allowed_justification_phrases=frozenset({
            "industry standard",
            "peers",
            "peer group",
        }),
        requires_scf=False,
        notes=(
            "The growth and investment context is generic buyer-side framing. "
            "It never becomes a figure: no spend, no cash-flow number, no "
            "financing rate, no benchmark value, no sample size.",
            "\"Aligned to the industry and other peers in the market\" is the "
            "strongest comparison permitted, and it stays qualitative.",
            "Payment Terms and Due Date go on their own labelled lines, exactly "
            "as the reference lays them out.",
        ),
    ),
    EmailTemplate.SCF: EmailTemplateSpec(
        id=EmailTemplate.SCF,
        label="Version with Supply Chain Finance",
        purpose=(
            "The longer standardisation notice with the early-payment paragraph: "
            "the buyer has partnered with a third-party provider so suppliers "
            "who need earlier cash can take it while the new terms apply."
        ),
        reference=_REF_SCF,
        structure=(
            "Subject line",
            "Greeting addressed to the supplier",
            "A paragraph naming the standardisation initiative and the new term",
            "A paragraph giving the feedback deadline and the consequence of silence",
            "A paragraph offering the third-party early-payment option",
            "An offer to answer questions by replying to this email",
            "Sign-off",
        ),
        word_cap=250,
        deadline_kind=DeadlineKind.FEEDBACK,
        deadline_with_date=(
            "Please share your feedback on this proposed change by {deadline}. "
            "If we don't hear from you by this date, we will assume you are in "
            "agreement and proceed with implementing the new payment terms."
        ),
        deadline_relative=(
            "Please share your feedback on this proposed change within {window} "
            "days of the date of this email. If we don't hear from you by then, "
            "we will assume you are in agreement and proceed with implementing "
            "the new payment terms."
        ),
        requires_term_figure=True,
        requires_subject=True,
        allowed_negotiation_phrases=frozenset({
            "we look forward to hearing",
        }),
        allowed_justification_phrases=frozenset({
            "industry standard",
            "supply chain finance",
            "cash flow",
        }),
        requires_scf=True,
        notes=(
            "The early-payment paragraph is qualitative only: a third-party "
            "provider, an early payment option, improved cash flow. Never state "
            "a financing rate, a discount percentage, a fee, the supplier's own "
            "borrowing cost, or any figure attached to the programme.",
            "Do not name the provider — the spec does not supply one.",
            "\"To better align with our internal processes and industry "
            "standards\" is the only reasoning permitted for the change itself.",
        ),
    ),
    EmailTemplate.SENIOR_MANAGEMENT: EmailTemplateSpec(
        id=EmailTemplate.SENIOR_MANAGEMENT,
        label="Formal message from senior management",
        purpose=(
            "The executive-sponsorship message: senior management announcing "
            "the terms initiative across the supplier base, and handing the "
            "detailed discussion to the Category Manager."
        ),
        reference=_REF_SENIOR_MANAGEMENT,
        structure=(
            "Greeting addressed to the supplier partner",
            "A paragraph on the company-wide strategic initiative",
            "A paragraph on standardising and extending payment terms",
            "A paragraph stating that alignment is mandatory, driven by top management",
            "A line handing the discussions to the Category Manager",
            "A closing line of appreciation",
            "Sign-off",
        ),
        word_cap=300,
        deadline_kind=DeadlineKind.NONE,
        deadline_with_date="",
        deadline_relative="",
        # The client's reference states no term and no date at all: it announces
        # the initiative and hands the numbers to the Category Manager. Putting a
        # figure in would be this email doing the negotiator's meeting for them.
        requires_term_figure=False,
        requires_subject=False,
        allowed_negotiation_phrases=frozenset(),
        allowed_justification_phrases=frozenset({
            "working capital",
        }),
        requires_scf=False,
        notes=(
            "State NO day figures, NO payment-term numbers and NO dates. This "
            "message announces the initiative; the Category Manager takes the "
            "numbers to the supplier.",
            "No subject line — the reference has none.",
            "\"Optimizing our working capital\" is generic strategy language and "
            "is permitted. No figure ever attaches to it.",
        ),
    ),
    # ── The negotiator's own email ────────────────────────────────────────
    #
    # Chosen when they want to write it themselves, and offered by name when the
    # clarifying question runs (see `agents.nodes.draft_opening_email`).
    #
    # It is the STANDARD notice underneath. That is the whole design: whatever
    # the negotiator specified is theirs, and whatever they did not falls back
    # to the default notice rather than to the model's invention. Give it
    # nothing and it IS the standard email; give it everything and none of the
    # standard email survives.
    #
    # What it does NOT relax is any figure, date, contact or sign-off rule. The
    # negotiator writing their own wording is not the negotiator approving a
    # date nobody supplied — those checks are the spec's, not the template's,
    # and they hold here exactly as they hold everywhere else. The one check
    # that lifts is `off_template`, because "say what you like" and "match the
    # reference sentence for sentence" cannot both be true.
    EmailTemplate.CUSTOM: EmailTemplateSpec(
        id=EmailTemplate.CUSTOM,
        label="Custom email",
        purpose=(
            "The negotiator's own email: they say what it should contain and "
            "how it should read, and anything they leave unsaid falls back to "
            "the standard notification."
        ),
        reference=_REF_STANDARD,
        structure=(
            "Whatever the negotiator asked for, in the order they asked for it",
            "Anything they did not specify: as the standard notification has it",
            "Sign-off",
        ),
        # Room for what they ask for without inviting an essay when they ask for
        # little. The standard notice fits inside it untouched.
        word_cap=400,
        deadline_kind=DeadlineKind.EFFECTIVE,
        deadline_with_date="These updated terms will take effect by {deadline}.",
        deadline_relative=(
            "These updated terms will take effect within {window} days of the "
            "date of this email."
        ),
        requires_term_figure=True,
        requires_subject=True,
        # Their email, their register. The escalation ban is NOT lifted with
        # these — it is not template-dependent anywhere (see _ESCALATION_PHRASES),
        # because a threat the buyer never authorised is the same threat whoever
        # asked for it.
        allowed_negotiation_phrases=frozenset({
            "we would like", "we propose", "we suggest", "we request",
            "we look forward to hearing", "happy to discuss",
            "open to discussion", "we welcome your",
        }),
        allowed_justification_phrases=frozenset({
            "industry standard", "working capital", "cash flow",
        }),
        requires_scf=False,
        notes=(
            "The negotiator's instructions are the content. Follow them.",
            "Anything they did NOT specify keeps the standard notification's "
            "wording — do not invent a replacement for it.",
            "Every figure, date and contact still comes from EMAIL SPEC. Their "
            "freedom is over WORDING, never over values nobody supplied.",
        ),
    ),
}


def get_template(template: EmailTemplate) -> EmailTemplateSpec:
    return _TEMPLATES[template]


def all_templates() -> tuple[EmailTemplateSpec, ...]:
    return tuple(_TEMPLATES.values())


# ── Selection ─────────────────────────────────────────────────────────────
#
# The negotiator picks a variant by asking for it — either by clicking one of
# the follow-up actions, whose wording is fixed, or by typing something close to
# it. Matching is on the negotiator's own words only: an operator prompt
# instruction sets policy for every email, and letting the word "longer" in a
# standing instruction silently re-shape a specific request is exactly the kind
# of invisible override that is impossible to debug from a draft.

_SCF_RE = re.compile(
    r"\b(?:scf|supply\s*chain\s*financ\w*|reverse\s+factoring|early[- ]payment|"
    r"early\s+payment|dynamic\s+discount\w*)\b",
    re.IGNORECASE,
)
# Bare officer acronyms are deliberately NOT here. "my contact is CEO Starbucks
# Paul Bremer" names the RECIPIENT, and matching "ceo" turned that into a
# request for the executive-sponsorship message — a different document, sent
# over senior management's name, because the negotiator mentioned a job title.
# An officer only selects this variant as the SENDER of the message.
_SENIOR_RE = re.compile(
    r"\b(?:senior\s+management|top\s+management|executive(?:\s+(?:leadership|"
    r"sponsor\w*|message|letter))?|leadership\s+(?:team\s+)?(?:message|letter|"
    r"announcement)|c-?level|"
    r"(?:message|letter|note|email)\s+from\s+(?:the\s+|our\s+)?(?:ceo|cfo|coo)|"
    r"from\s+(?:the\s+|our\s+)(?:ceo|cfo|coo))\b",
    re.IGNORECASE,
)
# The bare stem "negotiab" is deliberately NOT here. "tell them this is
# non-negotiable" contains it, and matched — so a request to HARDEN the email
# selected the negotiable variant, which is the exact opposite document. The
# stem only counts inside phrasing that actually asks for one.
_COLLABORATIVE_RE = re.compile(
    r"\b(?:more\s+negotiab\w+|negotiab\w+\s+(?:version|email|approach|wording)|"
    r"collaborativ\w+|willing\s+to\s+negotiate|open\s+to\s+negotiat\w+|"
    r"softer|soften|friendl\w+|partnership\s+version|less\s+firm|"
    r"more\s+flexible)\b",
    re.IGNORECASE,
)
_LONGER_RE = re.compile(
    r"\b(?:longer|lengthen|expand(?:ed)?|fuller|more\s+detail\w*|more\s+context|"
    r"elaborate|detailed\s+version|flesh\s+out)\b",
    re.IGNORECASE,
)

# Selection order. SCF and senior management are named documents and win over
# the shape adjectives: "a longer email with SCF" is the SCF email.
_SELECTORS: tuple[tuple[re.Pattern[str], EmailTemplate], ...] = (
    (_SCF_RE, EmailTemplate.SCF),
    (_SENIOR_RE, EmailTemplate.SENIOR_MANAGEMENT),
    (_COLLABORATIVE_RE, EmailTemplate.COLLABORATIVE),
    (_LONGER_RE, EmailTemplate.LONGER),
)


def match_email_template(message: str) -> EmailTemplate | None:
    """The variant the negotiator NAMED, or None when they named none.

    Distinct from :func:`select_email_template` on purpose. "Make it stronger"
    names no format, and the difference between "they did not say" and "they
    said standard" is what lets a follow-up keep the format it is adjusting
    instead of silently reverting to the short notice.
    """
    text = message or ""
    for pattern, template in _SELECTORS:
        if pattern.search(text):
            return template
    return None


def matched_email_templates(message: str) -> tuple[EmailTemplate, ...]:
    """EVERY variant the negotiator's wording points at, in selection order.

    :func:`match_email_template` answers "which one", by taking the first hit in
    priority order — which is the right answer to give the drafter and the wrong
    one for deciding whether they were CLEAR. "A longer collaborative email"
    matches two documents, and resolving it silently by selector order picks one
    of them and tells nobody it was a coin toss.

    So this returns all of them, and the caller can see the difference between
    one signal and two. Used only to decide whether to ask (see
    `agents.nodes.draft_opening_email`); the drafter still selects through
    `match_email_template`.
    """
    text = message or ""
    return tuple(
        template for pattern, template in _SELECTORS if pattern.search(text)
    )


def select_email_template(message: str) -> EmailTemplate:
    """Which reference email the negotiator asked for; STANDARD when unstated."""
    return match_email_template(message) or EmailTemplate.STANDARD


# ── The classifier's reading of the same question ─────────────────────────
#
# The patterns above match wording. The intent classifier reads MEANING, and it
# is the one call that sees the thread — so it names the variant too, on the
# same turn it names the intent, and its answer is the primary signal (see
# `build_opening_email_spec`). "Generate a detailed email" is the whole reason:
# it asks for the longer notice in words no selector above matches, and matching
# every paraphrase of five documents with regexes is not a thing that finishes.
#
# What comes back is a free string from a model, so it is coerced here rather
# than trusted: an unknown value means the classifier named no variant, which is
# the same as saying nothing, and never a crash on the email path.


def coerce_email_template(value: object) -> EmailTemplate | None:
    """A classifier-supplied template name as a variant, or None when it is not one."""
    if isinstance(value, EmailTemplate):
        return value
    if not isinstance(value, str):
        return None
    try:
        return EmailTemplate(value.strip().lower())
    except ValueError:
        return None


# ── Emphasis: how hard the same email reads ───────────────────────────────
#
# A second axis, and it has to be separate from the template. "Write a longer
# email" changes WHICH document; "make it stronger" changes how the SAME
# document reads. Collapsing them meant "stronger" matched no format selector,
# fell through to STANDARD, and returned the identical email the negotiator had
# just asked to change — so the request looked ignored, because it was.


class EmailEmphasis(str, Enum):
    STANDARD = "standard"
    FIRM = "firm"


_FIRM_RE = re.compile(
    r"\b(?:strong(?:er|est|ly)?|firm(?:er|est)?|more\s+firm|harder|tougher|"
    r"forceful|more\s+forceful|more\s+direct|more\s+assertive|more\s+serious|"
    r"blunt\w*|punchier|sharper|more\s+authoritative|less\s+soft|"
    r"strongly[- ]worded|hard[- ]hitting|no[- ]nonsense)\b",
    re.IGNORECASE,
)


def select_email_emphasis(message: str) -> EmailEmphasis:
    """Whether the negotiator asked for this email to read harder."""
    return (
        EmailEmphasis.FIRM
        if _FIRM_RE.search(message or "")
        else EmailEmphasis.STANDARD
    )


# What "stronger" actually means here, and — the part that took a bad draft to
# learn — what it does not.
#
# Asked to strengthen an email, the model reached for threats: "We require
# strict compliance", "There will be no exceptions or negotiations", "No further
# negotiation on this point will be entertained". All of it over the buyer's
# name, to a supplier who had not yet said anything, and none of it authorised.
#
# So firmness is defined here as SUBTRACTION. A strong notice is the same facts
# with the cushioning removed and the sentences shortened — there is nothing to
# add, and the escalation check in `opening_email.py` refuses the additions
# whatever the negotiator asks for.
FIRM_EMPHASIS_RULES: tuple[str, ...] = (
    "Lead with the change. The first sentence of the body states the new term; "
    "any scene-setting sentence moves after it, or goes.",
    "Cut the cushioning entirely — \"we value our partnership\", \"we want to "
    "ensure a smooth transition\", \"we appreciate your cooperation\", \"thank "
    "you for your attention to this matter\".",
    "Short declarative sentences. Active voice. No softening adverbs "
    "(\"kindly\", \"simply\", \"just\") and no hedges (\"we hope\", \"we trust\").",
    "State the change as settled fact — \"your payment terms are being updated "
    "to X days\" — never as something being put forward for consideration.",
    "One administrative instruction is where the firmness lands, and it is "
    "enough: \"Please update your records to reflect the new terms.\"",
    "The deadline sentence keeps the spec's wording and the spec's value.",
)

FIRM_EMPHASIS_REFUSALS: tuple[str, ...] = (
    "NEVER add a threat, a penalty, or a consequence the variant does not "
    "already state. \"Non-negotiable\", \"no exceptions\", \"strict "
    "compliance\", \"failure to comply\", \"no further negotiation will be "
    "entertained\", \"effective immediately\" — all refused, however the "
    "request is worded, and refused silently: never write a sentence in the "
    "email about what you would not write.",
    "A strong email is one that has had things REMOVED. If it reads harder "
    "because something was added, the wrong thing was done.",
)


# The variant to fall back to when the SCF email was asked for and the
# programme cannot be offered to this supplier. The client's SCF reference IS
# the longer notice plus one early-payment paragraph, so dropping to LONGER
# gives the negotiator the same email minus the paragraph that cannot be sent —
# not a short notice they did not ask for.
SCF_FALLBACK_TEMPLATE = EmailTemplate.LONGER


# ── Carrying a format across a follow-up ──────────────────────────────────
#
# "Make it stronger" adjusts the email already on screen. Which email that is
# has to come from the email itself: nothing else in the turn knows, and
# re-deriving STANDARD would hand back the short notice in place of the longer
# one the negotiator was working on — a format change they never asked for,
# arriving as the answer to a request about register.

# Ordered: the SCF subject also contains "Standardization", so it is tested
# first and the general patterns last.
_TEMPLATE_FINGERPRINTS: tuple[tuple[re.Pattern[str], EmailTemplate], ...] = (
    (re.compile(r"standardization\s*-\s*supply\s+chain\s+finance", re.I), EmailTemplate.SCF),
    (re.compile(r"action\s+required\s+(?:by|within)", re.I), EmailTemplate.LONGER),
    (re.compile(r"^\s*subject.*standardizing\s+payment\s+terms", re.I | re.M), EmailTemplate.COLLABORATIVE),
    (re.compile(r"dear\s+valued\s+supplier\s+partner", re.I), EmailTemplate.SENIOR_MANAGEMENT),
    (re.compile(r"^\s*subject.*payment\s+terms\s+standardisation", re.I | re.M), EmailTemplate.STANDARD),
)

# Whether a message is adjusting the email that already exists, rather than
# asking for a new one. Only an adjustment inherits the previous format — a
# fresh "draft the opening email" starts from the default, because inheriting
# there would make a stale format outlive the request that chose it.
# One PART of the email being changed — "change the subject to …", "the sender
# name should be …". These are adjustments to the email on screen and were not
# recognised as any: a negotiator on the longer notice who asked for a different
# subject got the SHORT notice back, because nothing said this turn was an
# adjustment and the format fell through to the default.
_EMAIL_PART = (
    r"(?:subject(?:\s+line)?|greeting|salutation|sign[-\s]?off|signature|"
    r"sender(?:\s+(?:name|company|title))?|recipient|contact|date|deadline|"
    r"effective\s+date|name|title|company|wording|tone)"
)
_MODIFICATION_RE = re.compile(
    r"\b(?:make\s+(?:it|the\s+email|this)|rewrite|re-?write|revise|redo|"
    r"adjust|tweak|edit|change\s+(?:it|the\s+email|this)|shorten|tighten|"
    r"try\s+again|do\s+it\s+again|same\s+(?:email|one)\s+but|but\s+more|"
    r"more\s+\w+|less\s+\w+|"
    rf"(?:change|set|make|use|keep|update|amend|replace|correct|fix)\s+(?:the\s+|this\s+|its\s+|our\s+)?{_EMAIL_PART}\b|"
    rf"(?:the|this|its|our)\s+{_EMAIL_PART}\s+(?:should|must|needs?\s+to|has\s+to)\b)",
    re.IGNORECASE,
)


def infer_template_from_text(text: str) -> EmailTemplate | None:
    """Which variant a previously drafted email was, read off the draft itself."""
    if not text:
        return None
    for pattern, template in _TEMPLATE_FINGERPRINTS:
        if pattern.search(text):
            return template
    return None


def is_modification_request(message: str) -> bool:
    """Whether this message adjusts the existing email rather than asking anew."""
    text = message or ""
    return bool(
        _MODIFICATION_RE.search(text) or _FIRM_RE.search(text)
    )


# ── Subject lines ─────────────────────────────────────────────────────────


# The client's own date placeholder, printed in all five reference emails. With
# no date supplied it STAYS — the reference is what the email says until someone
# supplies the value, exactly like XXX and [Company] in the signature.
DEADLINE_PLACEHOLDER = "[MM, DD, YYYY]"


def build_subject_line(
    template: EmailTemplate,
    proposed_term_days: int | None,
    effective_date: str | None,
    window_days: int | None = None,
    buyer_name: str | None = None,
) -> str:
    """The subject line for this variant, wording taken from its reference.

    Returns "" for a template whose reference carries no subject line.
    """
    if template is EmailTemplate.SENIOR_MANAGEMENT:
        return ""

    if template is EmailTemplate.SCF:
        return "Notice of Payment Terms Standardization - Supply Chain Finance"

    if template is EmailTemplate.COLLABORATIVE:
        # The reference reads "Standardizing Payment Terms - [Buyer Name]". With
        # no buyer name on file the suffix is dropped rather than left as a
        # placeholder: a placeholder in the subject would satisfy the sign-off
        # placeholder check without anything actually reaching the signature.
        return (
            f"Standardizing Payment Terms - {buyer_name}"
            if buyer_name
            else "Standardizing Payment Terms"
        )

    if template is EmailTemplate.LONGER:
        if window_days is not None and not effective_date:
            return (
                "Notice of Payment Terms Standardization - Action Required within "
                f"{window_days} Days"
            )
        return (
            "Notice of Payment Terms Standardization - Action Required by "
            f"{effective_date or DEADLINE_PLACEHOLDER}"
        )

    # STANDARD. Its reference subject reads:
    #
    #   Payment Terms Standardisation of — 60 Days Effective by [MM, DD, YYYY] in 14 Days
    #
    # — the client's own wording, carrying both endings because their document
    # shows both: a calendar date where there is one, a relative window where
    # there is not. One of the two applies to any real email, so one is written.
    #
    # This used to read "Payment Terms Standardisation — 60 Days Effective
    # <date>": no "of", no "by". Small words, and the whole default variant went
    # out under a subject line the client had not written — the negotiator asked
    # for "Payment Terms Standardisation of— 60 Days Effective by 19 Sept 2026",
    # which is their template verbatim, and was told that was a custom subject.
    if proposed_term_days is None:
        return "Payment Terms Standardisation"
    if window_days is not None and not effective_date:
        return (
            f"Payment Terms Standardisation of {proposed_term_days} Days "
            f"Effective in {window_days} Days"
        )
    return (
        f"Payment Terms Standardisation of  {proposed_term_days} Days "
        f"Effective by {effective_date or DEADLINE_PLACEHOLDER}"
    )


# ── The reference, sentence by sentence ───────────────────────────────────


# Where one sentence of a reference ends. Kept simple deliberately: the
# references are plain business prose with no abbreviations that end in a full
# stop, so a terminator followed by a space is a sentence boundary.
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


@lru_cache(maxsize=None)
def reference_sentences(template: EmailTemplate) -> tuple[str, ...]:
    """The prose sentences of this variant's reference email.

    Subject, greeting, closing salutation and signature are left out: they are
    checked elsewhere, by rules that already know what each of them may say.
    What is left is the part with no other guard on it — the body wording,
    which is the client's and not the model's to rewrite.
    """
    body: list[str] = []
    for line in get_template(template).reference.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if _SUBJECT_LINE_RE.match(stripped) or _GREETING_LINE_RE.match(stripped):
            continue
        if _CLOSING_LINE_RE.match(stripped) or _SIGNATURE_LINE_RE.match(stripped):
            continue
        body.extend(s.strip() for s in _SENTENCE_SPLIT_RE.split(stripped) if s.strip())
    return tuple(body)


_SUBJECT_LINE_RE = re.compile(r"^subject\b\s*:", re.IGNORECASE)
_GREETING_LINE_RE = re.compile(r"^(?:dear|hello|hi)\b", re.IGNORECASE)
_CLOSING_LINE_RE = re.compile(
    r"^(?:kind regards|best regards|sincerely|regards|best wishes)\s*[,.]?$",
    re.IGNORECASE,
)
# The signature block: the client's own placeholders, one per line.
_SIGNATURE_LINE_RE = re.compile(r"^(?:XXX|\[Company\]|\[Title\]|\[Your Name\])\s*$")
