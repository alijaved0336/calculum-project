import { useUserStore } from "@/stores/user";
import { MODULE_ROLES } from "@/constants";
// Leaf module rather than the `@/utils` barrel: that barrel reaches RedirectSection and from there
// the router, which statically imports every view. Pulling it in for one role check is what makes
// a composable untestable in isolation.
import { hasModuleRole } from "@/utils/moduleRoleUtils";
import { computed, type ComputedRef } from "vue";

const useReceivablesComposable = () => {

    const userStore = useUserStore();

    /**
     * Holds if the active company is enabled for receivables (UC-ENT-12).
     *
     * Read from the session roles, the same way every payables module composable reads its own
     * MODULE_* key: `User::getRoles()` merges the active company's roles, so MODULE_AR arrives here
     * with no extra call.
     *
     * It replaced `allowCompanyReceivablesFeature`, which tested the active company's uuid against
     * RECEIVABLES_FEATURE — two uuids hardcoded in the source tree, so enabling a customer meant
     * editing a constant and deploying the bundle to three environments. An administrator now ticks
     * a checkbox.
     *
     * Note this reflects the company active in PAYABLES. A user who belongs to a payables-only
     * company and to a second, receivables-enabled one sees no entry while the first is active,
     * even though AR itself would admit them; they switch company in payables first, which is the
     * action they would have taken anyway. UC-ENT-12 A7 records this deliberately.
     */
    const moduleReceivablesIsAvailable: ComputedRef<boolean> = computed(() => {
        const roles = userStore.getUser?.roles;

        return Array.isArray(roles) && hasModuleRole(roles, MODULE_ROLES.AR);
    })

    return {
        moduleReceivablesIsAvailable
    }
}

export default useReceivablesComposable;
