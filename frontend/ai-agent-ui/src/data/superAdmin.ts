// Hardcoded mock data for the Super Admin > Setup > Negotiation Agent screen.
// Mirrors the design mock; no backend wiring yet.

export type GoalId = 'term-extension' | 'term-extension-scf'

export interface AgentDocument {
  id: string
  name: string
  type: 'PDF' | 'MD' | 'CSV'
  uploadedBy: string
  lastUpdated: string
  playbooks: { label: string; goal: GoalId }[]
  status: 'Indexed' | 'Processing'
}

export const DOCUMENTS: AgentDocument[] = [
  {
    id: 'doc-1',
    name: 'Concept Definitions v2.1',
    type: 'PDF',
    uploadedBy: 'Carlos G.',
    lastUpdated: 'May 10, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Indexed',
  },
  {
    id: 'doc-2',
    name: 'Negotiation Decision Flow',
    type: 'PDF',
    uploadedBy: 'Carlos G.',
    lastUpdated: 'May 10, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Indexed',
  },
  {
    id: 'doc-3',
    name: 'Pre-AI Negotiation Playbook',
    type: 'PDF',
    uploadedBy: 'Oliver B.',
    lastUpdated: 'May 10, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Indexed',
  },
  {
    id: 'doc-4',
    name: 'Ada Entity Class Diagram',
    type: 'MD',
    uploadedBy: 'Joel I.',
    lastUpdated: 'May 8, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Indexed',
  },
  {
    id: 'doc-5',
    name: 'Supplier Entity Schema v3',
    type: 'MD',
    uploadedBy: 'Joel I.',
    lastUpdated: 'May 12, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Indexed',
  },
  {
    id: 'doc-6',
    name: 'Industry Benchmarks Q1 2026',
    type: 'CSV',
    uploadedBy: 'Carlos G.',
    lastUpdated: 'May 5, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Indexed',
  },
  {
    id: 'doc-7',
    name: 'Tone Persona Guidelines',
    type: 'PDF',
    uploadedBy: 'Oliver B.',
    lastUpdated: 'May 3, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Indexed',
  },
  {
    id: 'doc-8',
    name: 'New Market Analysis CEE',
    type: 'PDF',
    uploadedBy: 'Carlos G.',
    lastUpdated: 'May 14, 2026',
    playbooks: [
      { label: 'Term Extension', goal: 'term-extension' },
      { label: 'Term Ext. + SCF', goal: 'term-extension-scf' },
    ],
    status: 'Processing',
  },
]

export interface AgentGoal {
  id: GoalId
  dotColor: string
  title: string
  description: string
  enabled: boolean
}

export const GOALS: AgentGoal[] = [
  {
    id: 'term-extension',
    dotColor: 'var(--green)',
    title: 'Term Extension',
    description:
      'Negotiate longer payment terms, anchored on average days paid and industry benchmark data.',
    enabled: false,
  },
  {
    id: 'term-extension-scf',
    dotColor: '#3B82F6',
    title: 'Term Extension + SCF',
    description:
      'Pair a term extension with a Supply Chain Finance early-pay option to keep the supplier cash-neutral.',
    enabled: true,
  },
]

export interface CompanyGoalAvailability {
  company: string
  termExtension: boolean
  termExtensionScf: boolean | null // null = disabled / not applicable
  termExtensionScfNote?: string
}

export const COMPANY_AVAILABILITY: CompanyGoalAvailability[] = [
  { company: 'Acme Industrial', termExtension: true, termExtensionScf: true },
  { company: 'Globex Trading', termExtension: true, termExtensionScf: true },
  {
    company: 'Northwind Foods',
    termExtension: true,
    termExtensionScf: true,
  },
  { company: 'Initech Components', termExtension: true, termExtensionScf: true },
]

export interface AgentTone {
  id: string
  dotColor: string
  title: string
  description: string
  enabled: boolean
}

export const TONES: AgentTone[] = [
  {
    id: 'collaborative',
    dotColor: 'var(--green)',
    title: 'Collaborative',
    description:
      'Partnership-first. Frames the extension as a mutual win and invites the supplier to co-create the terms.',
    enabled: true,
  },
  {
    id: 'assertive',
    dotColor: 'var(--red)',
    title: 'Assertive',
    description:
      'Direct and confident. States the buyer’s position clearly and anchors firmly to benchmark data.',
    enabled: true,
  },
  {
    id: 'methodical',
    dotColor: '#3B82F6',
    title: 'Methodical',
    description: 'Structured and evidence-led. Walks through the rationale step by step with supporting figures.',
    enabled: false,
  },
]

export interface DefaultToneMapping {
  playbook: string
  tone: string
}

export const DEFAULT_TONE_MAPPINGS: DefaultToneMapping[] = [
  { playbook: 'Term Extension', tone: 'Collaborative' },
  { playbook: 'Term Extension + SCF', tone: 'Collaborative' },
]

export interface GlobalPromptInstruction {
  id: string
  text: string
  authorInitials: string
  author: string
  created: string
}

export const GLOBAL_PROMPT_INSTRUCTIONS: GlobalPromptInstruction[] = [
  {
    id: 'gp-1',
    text: 'Always open with a collaborative, partnership-oriented tone, and reference industry benchmarks from indexed documents when proposing payment terms.',
    authorInitials: 'CG',
    author: 'Carlos G.',
    created: 'May 6, 2026',
  },
  {
    id: 'gp-2',
    text: 'When the supplier pushes back on an extension, acknowledge the cash-flow impact, then offer SCF as a mitigation before considering a smaller extension.',
    authorInitials: 'OB',
    author: 'Oliver B.',
    created: 'May 3, 2026',
  },
  {
    id: 'gp-3',
    text: 'Never commit to extensions longer than 90 days without flagging for human review.',
    authorInitials: 'OB',
    author: 'Oliver B.',
    created: 'Apr 28, 2026',
  },
  {
    id: 'gp-4',
    text: 'Keep responses under 180 words; use bullet points for any proposal with more than two terms.',
    authorInitials: 'CG',
    author: 'Carlos G.',
    created: 'Apr 20, 2026',
  },
]

export const SETUP_TABS = [
  'Payment Terms Extension',
  'Buyer Standard Group',
  'SCF',
  'Payment Float',
  'Negotiation Agent',
] as const

export type SetupTab = (typeof SETUP_TABS)[number]

export const SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'opportunity', label: 'Opportunity' },
  { id: 'plan', label: 'Plan' },
  { id: 'manage', label: 'Manage' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'compare', label: 'Compare' },
  { id: 'match', label: 'Match' },
  { id: 'setup', label: 'Setup' },
] as const

export type SidebarItemId = (typeof SIDEBAR_ITEMS)[number]['id']
