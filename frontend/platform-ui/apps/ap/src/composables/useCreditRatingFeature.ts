import { ComputedRef, computed } from "vue";
import { useUser } from "@/composables";


/**
 * Credit Rating
 */

const useFeatureCreditRating = () => {
  const { useFeatureCreditRating } = useUser();

  const featureCreditRatingEnabled: ComputedRef<boolean> = computed(() => {
    return useFeatureCreditRating.value;
  });

  function creditRatingColumnsDisplayBasedOnCreditRatingFeature(
    columnArray: Array<any>,
  ): Array<any> {
      
    if (featureCreditRatingEnabled.value) {
      return columnArray;
    } else {
      return columnArray.filter(
        (x: any) =>
          x.field !== "creditRating" &&
          x.field !== "entityStockPerformanceMarketIndex" &&
          x.field !== "creditScoreSource" &&
          x.field !== "creditScore",
      );
    }
  }

  return {
    creditRatingColumnsDisplayBasedOnCreditRatingFeature,
    featureCreditRatingEnabled,
  };
};

export default useFeatureCreditRating;
