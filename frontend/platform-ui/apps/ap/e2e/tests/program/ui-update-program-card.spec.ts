//Created by Josh
import { test, expect } from "@playwright/test";
import { ensureDefaultLogin, goToHomeSection } from "../utils/Utils";
import ProgramUtils from "../utils/ProgramUtils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("Test new ui for program card @analyze @integrated @us-4474", async ({
  page
}) => {

  // The SPA deep-links to /home/analyze* whenever state.json carries a
  // selected program, so /home-dashboard is not a reachable precondition.
  // goToHomeSection is the canonical wait and accepts any /home/* route.
  await goToHomeSection(page);

  // The program card list only exists when the active spend file version holds
  // more than one program: with a single one the panel redirects to that
  // program's overview, which has no cards and not even an "All Programs"
  // button to get back to the list. The active spend file version is
  // server-side user state that any earlier test can change, which is why this
  // test passed when run on its own and failed in the pipeline, where the whole
  // suite runs serially and a preceding test left a single-program version
  // active.
  const spendFileVersion =
    await ProgramUtils.ensureSpendFileVersionWithPrograms(page);

  test.skip(
    spendFileVersion === null,
    "No spend file version of the active company holds the two programs the program card list needs"
  );

  await ProgramUtils.goToProgramSection(page, { allPrograms: true });

  // The legacy `.card--void` placeholder was replaced by `.card-v2`.
  await expect(page.locator("div.card--void")).toHaveCount(0);

  // `SkeletonCard` also renders a `.card-v2` root while the program list loads,
  // and its title slot holds a Skeleton rather than the title span — so the
  // title is what identifies a rendered card.
  const cardTitle = page.locator("div.card-v2 span.text-font-600-24").first();

  await expect(cardTitle).toBeVisible();
  // The title colour class was renamed text-color-700 -> text-gray-700.
  // `truncate-title` is only applied when the title exceeds 10 chars, so
  // it is not part of the invariant.
  await expect(cardTitle).toHaveClass(
    /text-gray-700 text-font-600-24 cursor-pointer/
  );
});
