import type { BoxBadgeVariant } from "./types";

import greenTopCenterUrl from "./icons/green-top-center.svg?url";
import greenTopRightUrl from "./icons/green-top-right.svg?url";
import greenCenterRightUrl from "./icons/green-center-right.svg?url";
import yellowTopLeftUrl from "./icons/yellow-top-left.svg?url";
import yellowCenterUrl from "./icons/yellow-center.svg?url";
import yellowBottomRightUrl from "./icons/yellow-bottom-right.svg?url";
import redBottomLeftUrl from "./icons/red-bottom-left.svg?url";
import redCenterLeftUrl from "./icons/red-center-left.svg?url";
import redBottomCenterUrl from "./icons/red-bottom-center.svg?url";

/** Designer SVG assets keyed by the closed `variant` union. */
export const BOX_BADGE_ICON_URLS: Record<BoxBadgeVariant, string> = {
  "green-top-center": greenTopCenterUrl,
  "green-top-right": greenTopRightUrl,
  "green-center-right": greenCenterRightUrl,
  "yellow-top-left": yellowTopLeftUrl,
  "yellow-center": yellowCenterUrl,
  "yellow-bottom-right": yellowBottomRightUrl,
  "red-bottom-left": redBottomLeftUrl,
  "red-center-left": redCenterLeftUrl,
  "red-bottom-center": redBottomCenterUrl,
};
