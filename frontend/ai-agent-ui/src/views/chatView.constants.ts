import type { Goal, Tone } from '@/types/chat'

export const TONES = ['collaborative', 'assertive', 'methodical'] as const

export const RECOMMENDED_TONE: Tone = 'collaborative'

export const GOALS: Goal[] = [
  {
    id: 'term-extension',
    title: 'Term Extension',
    description: 'Extend payment terms to improve your working capital position.',
    scfStatus: 'SCF Disabled',
  },
  {
    id: 'term-extension-scf',
    title: 'Term Extension + SCF',
    description:
      'Extend payment terms while offering the supplier an early-payment option through SCF.',
    scfStatus: 'SCF Enabled',
  },
]
