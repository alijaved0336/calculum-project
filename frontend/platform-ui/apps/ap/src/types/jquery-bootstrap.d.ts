// Bootstrap 4's jQuery plugins (tooltip, modal, etc.) add methods to the jQuery object at
// runtime that aren't part of @types/jquery's own typings (there's no official @types
// package for them) — augment just what this app actually calls.
declare global {
  interface JQuery<TElement = HTMLElement> {
    tooltip(options?: Record<string, unknown>): this;
    tooltip(command: string): this;
  }
}

export {};
