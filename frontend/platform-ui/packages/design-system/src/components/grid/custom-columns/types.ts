// Named alias, not inlined into TotalsFooterColumn.vue's props: Storybook's Vue docgen chokes on
// a nested generic like `Record<string, string>` written directly inside a prop's `PropType<...>`
// cast (mistakes the embedded `<`/`>` for HTML tags and corrupts the SFC before Vue's own compiler
// sees it). Referencing it by name avoids that.
export type TotalsFooterAnalyzeStore = { customDataPointTypes: Record<string, string> };
