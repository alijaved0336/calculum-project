<template>
<!-- if there are two values inside the pie chart -->
<div class="d-flex flex-column align-items-center justify-content-center" v-if="hasLetterGradeAndValueGradeText">
  <div class="pie d-flex flex-column align-items-center justify-content-center" :style="{ '--p': percentPie, '--b': widthPieRing + 'px', '--c': colorPie }" v-if="hasLetterGradeAndValueGradeText">
    <div class="position_values d-flex flex-column" v-if="letterGradeText && valueGradeText"></div>
    <h3 class="letter_grade_text text-center">{{ letterGradeText }}</h3><span class="value_grade_text text-center" :style="{ color: colorPie }">{{ valueGradeText }}</span>
  </div>
  <div class="back d-flex flex-column align-items-center justify-content-center" :style="{ '--p':100, '--b': widthPieRing + 'px', '--c': '#E9EAEC'}"></div>
</div><!-- if there are only  1 value inside the pie chart -->
<div class="d-flex flex-column align-items-center justify-content-center" v-if="!hasLetterGradeAndValueGradeText">
  <div class="pie d-flex flex-column align-items-center justify-content-center" :style="{ '--p': percentPie, '--b': widthPieRing + 'px', '--c': colorPie }" v-if="!hasLetterGradeAndValueGradeText"><span class="value_grade_text text-center" :style="{ color: colorPie }" v-if="valueGradeText">{{ valueGradeText }}</span><span class="no_info text-center" v-else>N/A</span></div>
  <div class="back d-flex flex-column align-items-center justify-content-center" :style="{ '--p':100, '--b': widthPieRing + 'px', '--c': '#E9EAEC'}"></div>
</div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CustomPieChart',
  props: {
    width: { type: String, required: false },
    widthPieRing: { type: String, required: false, default: '20px' },
    percentPie: { type: String, required: false, default: '100' },
    colorPie: { type: String, required: true, default: '#ABAFB5' },
    backgroundColorOutside: { type: String, required: false },
    valueGradeTextColor: { type: String, required: true },
    letterGradeText: { type: String, required: false },
    valueGradeText: { type: String, required: false },
    hasLetterGradeAndValueGradeText: { type: Boolean, required: false }
  },
  setup(props) {
    return {
      props
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

.back{
  z-index: 1;
  position: absolute;
  --p:20;
  --b:22px;
  --c:darkred;
  --w:150px;
  --w: 7vw;
  width: var(--w);
  aspect-ratio:1;
  display:inline-grid;
  margin:5px;
  place-content:center;
  font-size:25px;
  font-weight:bold;
  font-family:sans-serif;

}

.back:before, .back:after{
  content:"";
  position:absolute;
  border-radius:50%;
}

.back:before {
  inset:0;
  background:
    radial-gradient(farthest-side,var(--c) 98%,#0000) top/var(--b) var(--b) no-repeat,
    conic-gradient(var(--c) calc(var(--p)*1%),#0000 0);
  -webkit-mask:radial-gradient(farthest-side,#0000 calc(99% - var(--b)),#000 calc(100% - var(--b)));
          mask:radial-gradient(farthest-side,#0000 calc(99% - var(--b)),#000 calc(100% - var(--b)));
}
.back:after {
  inset:calc(50% - var(--b)/2);
  background:var(--c);
  transform:rotate(calc(var(--p)*3.6deg)) translateY(calc(50% - var(--w)/2));
}

.letter_grade_text {
  font-size: 1.5vw;
}

.no_info {
  color: var(--color-gray);
  font-weight: 400;
}

@keyframes p {
  from {
    --p: 0;
  }
}

//experimental property, chrome & edge works
@property --p {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}

.pie {
  z-index: 5;
  --w: 7vw;
  width: var(--w);
  animation: p 1s 0.5s both;
  aspect-ratio: 1;
  position: relative;
  display: inline-grid;
  place-content: center;
  margin: 5px;
  font-size: 20px;
  font-weight: bold;
  font-family: sans-serif;
  border-radius: 50%;
}

//for the start point of the pie, makes it rounded
// .pie:before {
//   background:
//     radial-gradient(farthest-side,var(--c) 98%,#0000) top/var(--b) var(--b) no-repeat,
//     conic-gradient(var(--c) calc(var(--p)*1%),#0000 0);
// }

.pie:before {
  content: "";
  position: absolute;
  border-radius: 50%;
  inset: 0;
  // background: conic-gradient(var(--c) calc(var(--p) * 1%), #0000 0);
  // -webkit-mask: radial-gradient(
  //   farthest-side,
  //   #0000 calc(99% - var(--b)),
  //   #000 calc(100% - var(--b))
  // );
  background:
    radial-gradient(farthest-side,var(--c) 98%,#0000) top/var(--b) var(--b) no-repeat,
    conic-gradient(var(--c) calc(var(--p)*1%),#0000 0);
  mask: radial-gradient(
    farthest-side,
    #0000 calc(99% - var(--b)),
    #000 calc(100% - var(--b))
  );
}

//for the end point of the chart, makes it rounded
.pie:after {
  content: "";
  position: absolute;
  border-radius: 50%;
  inset: calc(50% - var(--b) / 2);
  background: var(--c);
  transform: rotate(calc(var(--p) * 3.6deg))
    translateY(calc(50% - var(--w) / 2));
}

.position_values {
  position: relative;
  top: 10px;
}

.position_absolute {
  position: absolute;
}

.value_grade_text {
  font-size: 0.8vw;
}
</style>
