"""The client's approved supplier emails, keyed by template.

`{{PLACEHOLDER}}` values the supplier data holds are filled in code by
`fill_email_template`; the rest become `[Bracketed Placeholders]` for the
negotiator to supply.
"""
from __future__ import annotations

import re

from domain.entities.intent import EmailTemplate

EMAIL_TEMPLATES: dict[EmailTemplate, dict[str, str]] = {
    EmailTemplate.DEFAULT_PAYMENT_TERMS_STANDARDIZATION: {
        "subject": "Payment Terms Standardization to {{PROPOSED_PAYMENT_TERMS_DAYS}} Days - Effective {{EFFECTIVE_DATE}}",
        "body": """Dear {{SUPPLIER_NAME}} Team,

As part of our ongoing standardization of payment terms across our supplier base, we are formally notifying you of an update to your payment terms.

We are changing your current payment terms from {{CURRENT_PAYMENT_TERMS_DAYS}} days to our new standard term of {{PROPOSED_PAYMENT_TERMS_DAYS}} days.

We value our partnership and want to ensure a smooth transition. The updated payment terms will take effect on {{EFFECTIVE_DATE}}.

Thank you for your attention to this matter.

Kind regards,
{{SENDER_NAME}}
{{SENDER_TITLE}}
{{BUYER_NAME}}""",
    },
    EmailTemplate.LONG_FORM_PAYMENT_TERMS_NOTICE: {
        "subject": "Notice of Payment Terms Standardization - Response Required by {{RESPONSE_DUE_DATE}}",
        "body": """Dear {{SUPPLIER_NAME}} Team,

I trust this email finds you well.

I am writing to inform you about {{BUYER_NAME}}’s initiative to standardize payment terms across its supplier base. To better align with our internal processes and industry standards, {{BUYER_NAME}} is proposing payment terms of {{PROPOSED_PAYMENT_TERMS_DAYS}} days.

We value our partnership and want to ensure a smooth transition. Please share your feedback on this proposed change by {{RESPONSE_DUE_DATE}}. If we do not hear from you by this date, we will assume that you agree with the proposed terms and will proceed with implementation on {{EFFECTIVE_DATE}}.

Should you have any questions or require further clarification, please respond directly to this email.

We look forward to your prompt response.

Kind regards,
{{SENDER_NAME}}
{{SENDER_TITLE}}
{{BUYER_NAME}}""",
    },
    EmailTemplate.COLLABORATIVE_NEGOTIABLE_PAYMENT_TERMS: {
        "subject": "Proposal to Standardize Payment Terms - {{BUYER_NAME}}",
        "body": """Dear {{SUPPLIER_NAME}} Team,

I trust this email finds you well.

{{BUYER_NAME}} remains focused on investing in business growth and delivering exceptional customer value. This includes significant investments in end-to-end supply chain solutions and technologies.

To support these investments and continue our growth trajectory, we must drive innovation and efficiency throughout our supply chain.

Following an extensive analysis, our leadership team has determined that adjusting our payment terms is important for aligning with industry standards and remaining competitive. We value our business relationship with you and look forward to continuing our work together.

We understand that payment terms are important to both parties, and we are open to discussing a mutually beneficial arrangement. We would therefore like to propose the following:

Proposed Payment Terms: {{PROPOSED_PAYMENT_TERMS_DAYS}} days
Proposed Effective Date: {{EFFECTIVE_DATE}}

We believe these terms are fair, reasonable, and aligned with industry standards and market peers. Please share your feedback by {{RESPONSE_DUE_DATE}}.

We value our ongoing cooperation and look forward to hearing from you.

Kind regards,
{{SENDER_NAME}}
{{SENDER_TITLE}}
{{BUYER_NAME}}""",
    },
    EmailTemplate.SUPPLY_CHAIN_FINANCE_PAYMENT_TERMS: {
        "subject": "Payment Terms Standardization with Supply Chain Finance Option",
        "body": """Dear {{SUPPLIER_NAME}} Team,

I am writing to inform you about {{BUYER_NAME}}’s initiative to standardize payment terms across its supplier base. To better align with our internal processes and industry standards, {{BUYER_NAME}} is proposing payment terms of {{PROPOSED_PAYMENT_TERMS_DAYS}} days.

We value our partnership and want to ensure a smooth transition. Please share your feedback on this proposed change by {{RESPONSE_DUE_DATE}}. If we do not hear from you by this date, we will assume that you agree with the proposed terms and will proceed with implementation on {{EFFECTIVE_DATE}}.

We understand that this transition may create challenges for some suppliers. To support you, we have partnered with {{SCF_PROVIDER_NAME}} to offer an early-payment option. This solution can help improve your cash flow while allowing you to transition to the new payment terms smoothly.

Should you have any questions or require further clarification, please respond directly to this email.

Thank you for your attention to this matter. We look forward to your prompt response.

Kind regards,
{{SENDER_NAME}}
{{SENDER_TITLE}}
{{BUYER_NAME}}""",
    },
    EmailTemplate.SENIOR_MANAGEMENT_FORMAL_INITIATIVE: {
        "subject": "Executive Notice: Strategic Payment Terms Initiative - {{BUYER_NAME}}",
        "body": """Dear {{SUPPLIER_NAME}} Team,

At {{BUYER_NAME}}, we continuously evaluate our operational strategies to support sustainable long-term growth and competitiveness. As part of this effort, our executive leadership team has launched a company-wide initiative to optimize working capital and streamline financial operations across our supply chain.

A critical component of this strategy is the standardization and extension of payment terms across our global supplier base. Improving our financial flexibility strengthens our market position, enables continued investment in growth, and supports stronger and more resilient long-term supplier partnerships.

Under this initiative, the proposed standard payment term is {{PROPOSED_PAYMENT_TERMS_DAYS}} days, with an intended effective date of {{EFFECTIVE_DATE}}.

As this initiative is sponsored directly by senior management, alignment with the standard payment terms is required for all active suppliers. Participation in this process is essential to maintaining a forward-looking business relationship with {{BUYER_NAME}}.

Your designated Category Manager, {{CATEGORY_MANAGER_NAME}}, will lead discussions with your team to review the proposed terms and establish an implementation plan.

We sincerely appreciate your continued partnership and active support as we implement this important strategic initiative.

Kind regards,
{{SENDER_NAME}}
{{SENDER_TITLE}}
{{BUYER_NAME}}""",
    },
}

_PLACEHOLDER = re.compile(r"\{\{([A-Z_]+)\}\}")


def fill_email_template(template: EmailTemplate, values: dict[str, object]) -> str:
    """The template as "Subject: ...\\n\\n<body>", known values filled in.

    A value that is missing (None or "") becomes a readable bracketed
    placeholder - `{{EFFECTIVE_DATE}}` → `[Effective Date]` - never a guess.
    """

    def replace(match: re.Match[str]) -> str:
        value = values.get(match.group(1))
        if value is None or value == "":
            return f"[{match.group(1).replace('_', ' ').title().replace('Scf', 'SCF')}]"
        return str(value)

    spec = EMAIL_TEMPLATES[template]
    return f"Subject: {_PLACEHOLDER.sub(replace, spec['subject'])}\n\n{_PLACEHOLDER.sub(replace, spec['body'])}"
