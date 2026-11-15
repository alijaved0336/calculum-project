import { useAnalyzeStore } from "@/stores/analyze";
import { removeIRI, StringUtils } from "@/utils";

/**
 * Validates that a targetProgramUuid belongs to the given activeSpendFileVersion
 * by checking against the currently loaded programs in the analyze store.
 *
 * Returns `true` if the call is safe to proceed, `false` if the parameters are
 * inconsistent and the call should be skipped.
 *
 * This is a defense-in-depth check — the primary defense is the `getDisableWatchers`
 * flag in globalFiltersStore (checked by useConsistentFetch and individual watchers).
 * This function only validates actual program-SFV mismatches when program data
 * is available.
 *
 * See: docs/context/race-condition-company-change.md
 * See: docs/plans/program-sfv-consistency-check.md
 */
export function isProgramSfvConsistent(
  targetProgramUuid: string | null | undefined,
  activeSpendFileVersion: string | null | undefined,
): boolean {
  // If either param is absent, the call doesn't pair them — no risk of mismatch
  if (StringUtils.isNullUndefinedOrEmpty(targetProgramUuid) || StringUtils.isNullUndefinedOrEmpty(activeSpendFileVersion)) {
    return false;
  }

  const analyzeStore = useAnalyzeStore();
  const programs = analyzeStore.getAllPrograms;

  // Programs not loaded yet — can't validate, allow the call through.
  // Views like EntityCard load programs lazily via useProgram(), so
  // allPrograms may be empty on initial mount without implying a mismatch.
  // Transition guards (getDisableWatchers) are handled upstream by
  // useConsistentFetch and individual watchers.
  if (!programs || programs.length === 0) {
    return true;
  }

  // Normalize: strip IRI prefixes for comparison
  const normalizedProgramId = removeIRI(targetProgramUuid);
  const normalizedSfvId = removeIRI(activeSpendFileVersion);

  // Find the program in the loaded list
  const program = programs.find(
    (p: any) => removeIRI(p["@id"]) === normalizedProgramId,
  );

  if (!program) {
    if (import.meta.env.DEV) {
      console.warn(
        "[consistency-check] Skipping API call: program", normalizedProgramId,
        "not found in allPrograms (", programs.length, "programs loaded).",
        "activeSpendFileVersion:", normalizedSfvId,
      );
    }
    return false;
  }

  // Validate the program's SFV matches the active SFV
  const programSfvId = removeIRI(program.spendFileVersion?.["@id"] ?? "");

  if (programSfvId !== normalizedSfvId) {
    if (import.meta.env.DEV) {
      console.warn(
        "[consistency-check] Skipping API call: MISMATCH.",
        "Program", normalizedProgramId, "belongs to SFV", programSfvId,
        "but active SFV is", normalizedSfvId,
      );
    }
    return false;
  }

  return true;
}
