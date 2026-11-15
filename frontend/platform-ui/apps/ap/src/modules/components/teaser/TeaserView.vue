<template>
  <div class="d-flex flex-column teaser-view-container p-3" :class="`teaser-view-${teaser}`">
    <!-- HERO TOP SECTION -->
    <div
      class="row rounder-corners here-top-main-section"
      :class="getHeroBackgroundStyle()"
    >
      <div class="col-12 d-flex align-items-center justify-content-between">
        <!-- HERO TEXT LEFT SIDE -->
        <div
          class="col-xl-8 col-lg-6 col-md-6 col-sm-6 d-flex justify-content-center flex-column hero-text-left-side"
        >
          <h1 class="text-white hero-main-title">
            {{ $t(`global.teaser.${teaser}.mainHeaderTitle`) }}
          </h1>
          <h5 class="text-white hero-supporting-text">
            {{ $t(`global.teaser.${teaser}.supportingText`) }}
          </h5>
        </div>
        <!-- HERO IMAGE RIGHT SIDE -->
        <div
          class="col-xl-4 col-lg-6 col-md-6 col-sm-6 d-flex align-items-center justify-content-center hero-top-image section-right-img"
        >
          <HeroImage :hero="teaser" class="hero-svg" />
        </div>
      </div>
    </div>
    <!-- END HERO TOP SECTION -->

    <!-- WHAT YOU GET-->
    <div class="row mt-4">
      <div class="col-12 d-flex align-items-center justify-content-around">
        <div class="col-12">
          <h2 class="what-you-get-header-title">
            {{ $t(`global.teaser.${teaser}.whatYouGet.self`) }}
          </h2>
        </div>
      </div>
    </div>
    <div>
      <!-- END WHAT YOU GET-->

      <!-- WHAT YOU GET LEFT SIDE IMAGE AND STEPS-->
      <div class="row">
        <div
          class="col-12 d-flex flex-wrap align-items-center justify-content-around"
        >
          <div class="col-xl-12 d-flex flex-wrap">
            <div
              class="col-xl-4 col-lg-6 col-md-12 col-sm-12 order-xl-1 order-lg-1 order-md-2 order-sm-2 what-you-get-image"
            >
              <whatYouGetImage :hero="teaser" />
            </div>

            <!-- steps -->
            <div
              :class="[
                'col-xl-8 col-lg-6 col-md-12 col-sm-12 order-xl-2 order-lg-2 order-md-1 order-sm-1 flex-grow-1',
                { 'd-none': !steps.length } // Optionally hide if no steps
              ]">
                <div v-for="step in steps" :key="step.step" class="row mb-4">
                  <div class="col-12 d-flex text-left">
                    <div class="col-1 number-col">
                      <span class="number-circle">{{ step.step }}</span>
                    </div>
                    <div class="col-11">
                      <h3 class="step-title mb-0">{{ step.headerTitle }} </h3>
                      <p v-if="!step.list">{{ step.text }}</p>
                      <ul v-if="step.list" class="pl-0">
                        <li
                          v-for="(item, index) in step.list"
                          :key="index"
                          class="ml-4 list-disc step-list-item"
                        >
                          {{ item }} 
                        </li>
                      </ul>
                    </div>
                  </div>
                </div> <!-- end of v-for loop -->
            
            </div> <!-- end of steps -->
            
          </div> <!-- end col-xl-12 d-flex flex-wrap -->  
          
        
        </div> <!-- end col-12 d-flex flex-wrap align-items-center justify-content-around -->
      </div> <!-- end row : END WHAT YOU GET LEFT SIDE IMAGE AND STEPS-->
      

      <!-- TESTIMONIAL-->
       <TestimonialSection :teaser="teaser" />
      <!--- END TESTIMONIAL-->
      
      <!-- FOOTER -->
      <TeaserFooter :teaser="teaser" />
      <!-- END FOOTER-->
    </div>
  </div>
</template>

<script lang="ts">

import { computed, defineComponent } from "vue";
import HeroImage from "@/modules/components/teaser/HeroImage.vue";
import TeaserFooter from "@/modules/components/teaser/TeaserFooter.vue";
import whatYouGetImage from "@/modules/components/teaser/whatYouGetImage.vue";
import { useI18n } from "vue-i18n";
import { stepsData, Steps } from "@/modules/components/teaser/data/steps";
import TestimonialSection from "@/modules/components/teaser/TestimonialSection.vue";


export default defineComponent({
  name: "TeaserView",
  components: {
    HeroImage,
    TestimonialSection,
    //TeaserAvatar,
    TeaserFooter,
    whatYouGetImage,
  },
  props: {
    teaser: { type: String, required: true }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const steps = computed<Steps[]>(() => {
      const teaserSteps = stepsData[props.teaser] || [];
      return teaserSteps.map((step: any) => ({
        headerTitle: translate.t(step.headerTitle),
        text: step.text ? translate.t(step.text) : undefined,
        step: step.step,
        list: step.list ? step.list.map((item: any) => translate.t(item)) : undefined
      }));
    });
    
    /**
     * returns the background image for the hero section
     */
    function getHeroBackgroundStyle(): string {
      if (props.teaser === "manageTeaser") {
        return "manage-top-overview";
      }
      if (props.teaser === "emailNegotiations") {
        return "manage-top-email-negotiations";
      }
      if (props.teaser === "nineBoxesFinancing" || props.teaser === "entityCardCalculator") {
        return "financing-9boxes";
      }      

      return "manage-top-overview";
    }

    return {
      getHeroBackgroundStyle,
      steps
    };
  }
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";
@import "@/modules/components/teaser/style/teaser.scss";

</style>
