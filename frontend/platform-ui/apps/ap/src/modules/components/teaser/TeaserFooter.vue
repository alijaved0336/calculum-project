<template>
    <div class="row teaser-footer-container">
        <div class="col-12 d-flex align-items-center justify-content-around">
          <!--  IF TEASER IS manageTeaser -->
          <div
            v-if="teaser === 'manageTeaser'"
            class="col-12 d-flex flex-column justify-content-center"
          >
            <span class="teaser-footer-text">{{
              $t(`global.teaser.${teaser}.footer.boldText`)
            }}</span>
            <span class="teaser-footer-text">{{
              $t(`global.teaser.${teaser}.footer.text`)
            }}</span>
          </div>

          <!-- IF TEASER IS emailNegotiations-->
          <div
            v-if="teaser === 'emailNegotiations'"
            class="col-12 d-flex flex-column justify-content-center"
          >
            <span class="teaser-footer-text">{{
              $t(`global.teaser.${teaser}.footer.boldText`)
            }}</span>
          </div>

          <div
            v-if="teaser === 'nineBoxesFinancing'"
            class="col-12 d-flex flex-column justify-content-center"
          >
            <span class="teaser-footer-text">{{
              $t(`global.teaser.${teaser}.footer.boldText`)
            }}</span>
            <span class="teaser-footer-text">{{
              $t(`global.teaser.${teaser}.footer.text`)
            }}</span>
          </div>
        </div>
      </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    name: "TeaserFooter",
    props: {
        teaser: { type: String, required: true }
    },
    setup() {
        
    },
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

.teaser-footer-text {
  color: $color-gray-600;
  font-weight: 500;
  font-size: 16px;
}

.teaser-footer-container{
  margin-top: 3rem;
}
</style>