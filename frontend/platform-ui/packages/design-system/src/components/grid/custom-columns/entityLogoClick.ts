import type { InjectionKey } from "vue";

/**
 * What EntityLogoColumn calls when a clickable cell (a row carrying `partyId`) is clicked. Injected
 * rather than emitted: the cell is rendered deep inside GraphqlGrid's own Kendo slot templates, with
 * no event path up to whichever screen hosts the grid - and what "open this entity" means (AR's
 * Customer Card modal, for instance) is the app's own concern, not the design-system's. An app
 * provides it once at its root; with nothing provided, the click is a no-op.
 */
export type EntityLogoClickHandler = (dataItem: Record<string, unknown>, field: string) => void;

export const ENTITY_LOGO_CLICK_KEY: InjectionKey<EntityLogoClickHandler> = Symbol("EntityLogoClick");
