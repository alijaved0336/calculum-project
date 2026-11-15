/**
 * AB#20609: parts of the redesigned Overview summary row that are built but stay hidden until
 * product decides on them - the P&L Impact column (`plImpact`, null until G-372), the "Payment
 * Float: N" captions and the Sales Volume trend (neither sent by the API yet) and the SCF button
 * (no receivables destination yet). Flipping this is the whole switch: every piece already reads
 * its own data and falls back to its own empty state.
 */
export const SHOW_UNDECIDED_SUMMARY_METRICS = false
