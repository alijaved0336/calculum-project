<template>
<div class="row relative">
  <div class="col-12 d-flex align-items-center justify-content-center">
    <div class="col-4 d-flex align-items-center justify-content-center">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '30%', height: '30px', borderRadius: '8px' }"></Skeleton>
    </div>
    <div class="col-4 d-flex align-items-center justify-content-center">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '30%', height: '30px', borderRadius: '8px' }"></Skeleton>
    </div>
    <div class="col-4 d-flex align-items-center justify-content-center">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '30%', height: '30px', borderRadius: '8px' }"></Skeleton>
    </div>
  </div>
  <div class="col-12 d-flex align-items-center justify-content-around mt-3">
    <div class="card shadow-none tree-family-card" v-for="i in 2">
      <div class="card-body">
        <div class="row">
          <div class="col-12 d-flex align-items-center justify-content-center">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius: '8px' }">  </Skeleton>
          </div>
        </div>
        <div class="row mt-3">
          <div class="col-12 d-flex align-items-center justify-content-center">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '50px', height: '50px', borderRadius: '50%' }"> </Skeleton>
          </div>
        </div>
        <div class="row mt-3">
          <div class="col-12 d-flex align-items-center justify-content-center">
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
          </div>
        </div>
        <div class="row mt-3">
          <div class="col-12 d-flex align-items-center justify-content-center">
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
          </div>
        </div>
        <div class="row mt-3">
          <div class="col-12 d-flex align-items-center justify-content-start">
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
            <div class="col-3 d-flex align-items-center justify-content-center">
              <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }">      </Skeleton>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="d-flex flex-column mt-3">
      <div class="card shadow-none tree-family-card spend-card" v-for="n in 3">
        <div class="card-body">
          <div class="row">
            <div class="col-12 d-flex align-items-center justify-content-center">
              <div class="col-4">
                <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius: '8px' }"></Skeleton>
              </div>
              <div class="col-4">
                <div class="row mt-3">
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                </div>
                <div class="row mt-3">
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                </div>
              </div>
              <div class="col-4">
                <div class="row mt-3">
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                </div>
                <div class="row mt-3">
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                  <div class="col spend-vals">
                    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius: '8px' }"></Skeleton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";



export default defineComponent({
  name: "TreeCardEntitySkeleton",
  components: {    
    Skeleton
  },
  
  setup(props) {
    
  }
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
@media screen and (max-width: 990px) {
  .card-details{
    margin-top: 1rem;
  }
}


/** For card and skeletons */
.k-card.k-card-vertical.d-flex {
  display: flex;
  flex-direction: row;
}
.row > [class*="col-"]:has(> .card) {
  display: flex;
}

.row > [class*="col-"]:has(> .card) > .card {
  width: 100%;
}

.tree-family-card{
  min-height: 150px;
  min-width: 460px;
  max-width: 460px;
  padding: 0;
  &.spend-card{
    min-height: 100px;
  }
  
  // &::after{
  //   content: "___";
  //   position: absolute;
  //   top: 21px;
  //   left: -10%;
  //   }
  // }
  // .tree-family-card:first-child::before{
  //   content: none
  // }
  }

  // *** Responsiveness ***
  
  // *** XXL ***
  @media (max-width: 2000px) {
    .tree-family-header {
      min-width: 400px;
      max-width: 400px;
      padding: 0 15px;
    }
  
    .tree-family-card {
      min-height: 150px;
      min-width: 400px;
      max-width: 400px;
      padding: 0;
  
      span {
        font-size: 14px !important;
      }
    }
  }
  
  // *** END XXL ***
  
  // *** XL ***
  @media (max-width: 1640px) {
    .tree-family-header {
      min-width: 350px;
      max-width: 350px;
      padding: 0 10px;
    }
  
    .tree-family-card {
      min-width: 350px;
      max-width: 350px;
    }
  
    .card-for-spend {
      min-width: 350px;
      max-width: 350px;
    }
  }
  
  // *** END XL ***
  
  // *** L ***
  @media (max-width: 1480px) {
    .tree-family-header {
      font-size: 14px !important;
      min-width: 350px;
      max-width: 350px;
      padding: 0 10px;
    }
  
    .tree-family-card {
      span {
        font-size: 12px !important;
      }
    }
  
    .card-for-spend {
      .spend-details {
        font-size: 14px;
      }
    }
  }
  
  // *** END L ***
  
  // *** M ***
  @media (max-width: 1366px) {
    .tree-family-header {
      min-width: 290px;
      max-width: 290px;
      padding: 0 10px;
    }
  
    .tree-family-card {
      min-width: 290px;
      max-width: 290px;
  
      span {
        font-size: 10px !important;
      }
    }
  
    .card-for-spend {
      min-width: 280px;
      max-width: 280px;
      .spend-details {
        font-size: 12px;
      }
    }
  }
  
  // *** END M ***
  
  // *** S ***
  @media (max-width: 1280px) {
    .tree-family-card{
      min-width: 195px;
      max-width: 220px;
    }
    
    .card-for-spend {
      min-width: 190px;
      max-width: 210px;
      .spend-details {
        font-size: 10px;
      }
    }
  }

  .spend-vals{
    min-width: 75px;
    max-width: 100px;
  }
  
  // *** END S ***
  
  // *** END Responsiveness ***
  
</style>
