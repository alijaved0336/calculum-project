<template>
    <div class="row">
        <div class="col-12 d-flex align-items-center justify-content-around">
          <div
            class="col-sm-12 col-md-12 col-lg-12 col-xl-12 testimonial-container d-flex flex-column justify-content-center"
            :class=" 'testimonial-container-'+teaser  "
          >
            <q>{{ $t(`global.teaser.${teaser}.testimonial.text`) }}</q>
            <row class="mb-5"></row>
            <div>
              <TeaserAvatar :avatar="teaser" />
              <span class="testimonial-person mr-1">{{
                $t(`global.teaser.${teaser}.testimonial.person`)
              }}</span>
              <span class="testimonialial-profession mr-1">{{
                $t(`global.teaser.${teaser}.testimonial.profession`)
              }}</span>
              <span class="testimonial-field">{{
                $t(`global.teaser.${teaser}.testimonial.field`)
              }}</span>
            </div>
          </div>
        </div>
      </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import TeaserAvatar from "@/modules/components/teaser/TeaserAvatar.vue";

export default defineComponent({
    name: 'Testimonial',
    components: {
        TeaserAvatar
    },
    props: {
        teaser: { type: String, required: true }
    },
    setup() {
        
    },
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";
@import "@/modules/components/teaser/style/teaser.scss";

</style>
