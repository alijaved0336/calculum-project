import { ComputedRef, WritableComputedRef, computed } from "vue";
import { useUser } from "@/composables";

/**
 * SME
 */

const useSMEFeature = () => {
    const {useFeatureSME} = useUser();

    const featureSMEEnabled : ComputedRef<boolean> = computed(() => {
        return useFeatureSME.value;
    });

    function smeRelatedColumnsDisplayBasedOnSMEFeature( columnArray : Array<any>) : Array<any> {
        if (featureSMEEnabled.value) {
            return columnArray;
        } else {
            //remove  field "isSME" & "smeSource"
            return columnArray.filter((x: any) => x.field !== "isSME" && x.field !== "smeSource");
        }
        
    }



    return {
        featureSMEEnabled,
        smeRelatedColumnsDisplayBasedOnSMEFeature
    }
};

export default useSMEFeature;