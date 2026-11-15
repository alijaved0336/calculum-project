import { ADA_ACADEMY_GLOSSARY_URL, ArrayUtils, isNullOrUndefined } from "@/utils";
import { offset } from "@floating-ui/dom";
import { popovers } from "./data";
import { useShepherd } from "vue-shepherd";

/**
 * Initializes a popover and returns it.
 *
 * @return {Object} The tour object.
 * () => {   popover: ReturnType<typeof useShepherd>; }
 */
const usePopoverComposable = (dataClassName: string, keyPopOver: string, popOverBody: string = '') => {
  // Return early if required parameters are missing
  if (!dataClassName || !keyPopOver) {
    if (import.meta.env.DEV) console.warn('usePopoverComposable: Missing required parameters');
    return { popoverComposable: null };
  }

  const popoverComposable = useShepherd({
    defaultStepOptions: {
      cancelIcon: {
        enabled: true
      }
    },
    useModalOverlay: false
  });

  if (isNullOrUndefined(popoverComposable)) {
    if (import.meta.env.DEV) console.warn('usePopoverComposable: Failed to initialize Shepherd');
    return { popoverComposable: null };
  }

  const dataPopOver = popovers.find(x => x.key === keyPopOver);

  if (isNullOrUndefined(dataPopOver)) {
    if (import.meta.env.DEV) console.warn(`usePopoverComposable: No popover data found for key ${keyPopOver}`);
    return { popoverComposable: null };
  }

  // One step
  if (ArrayUtils.isEmpty(dataPopOver.steps)) {
    popoverComposable.addSteps([
      {
        title:  popOverBody ? popOverBody :  `${dataPopOver?.title}`,
        titleClass: "shepherd-title opportunity-title",
        attachTo: { element: `.${dataClassName}`, on: "right" },
        text: `<p class="text-font-500-14">${dataPopOver?.body}</p>`,
        ...(dataPopOver?.linkto ? {
          buttons: [
            {
              text: `${dataPopOver?.btnText}`,
              action: function() {
                window.open(
                  `${ADA_ACADEMY_GLOSSARY_URL}/${dataPopOver?.linkto}`,
                  "_blank"
                );
              }
            }
          ]
        } : {}),
        floatingUIOptions: {
          middleware: [offset({ mainAxis: 20, crossAxis: -10 })]
        }
      }
    ]);

    return {
      popoverComposable
    };
  }

  // Multiple steps
  if (isNullOrUndefined(dataPopOver.steps)) {
    if (import.meta.env.DEV) console.warn('usePopoverComposable: Steps are undefined');
    return { popoverComposable: null };
  }

  const steps = dataPopOver.steps.map(step => {
    return {
      ...step,
      attachTo: { element: `.${dataClassName}`, on: "bottom" },
      buttons: step.buttons.map(button => {
        return {
          ...button,
          action: () => {
            switch (button.actionText) {
              case "back":
                return popoverComposable.back();
              case "next":
                return popoverComposable.next();
              case "complete":
                return popoverComposable.complete();
              case "linkTo":
                window.open(
                  `${ADA_ACADEMY_GLOSSARY_URL}/${button.linkTo}`,
                  "_blank"
                );
                return;
              default:
                return () => {};
            }
          }
        };
      }),
      floatingUIOptions: {
        middleware: [offset({ mainAxis: 20, crossAxis: -10 })]
      }
    };
  });

  popoverComposable.addSteps(steps);

  return {
    popoverComposable
  };
};

export default usePopoverComposable;
