<template>
<div class="accordion-container">
  <div class="col-2 accordion-title"><span class="title-accordion">{{ title  }}</span></div>
  <div class="col-8 accordion-items d-flex justify-content-start align-items-center flex-wrap custom-margin-left">
    <Tooltip :open-delay="100" :anchor-element="'target'" position="top"><span class="accordion-item mb-2 mr-1" v-for="item in limit5Array" :title="item.value">{{ item.value }}    </span></Tooltip>
  </div><span class="accordion-circle mt-1" v-if="restItems > 0">+ {{ restItems  }}   </span>
</div>
</template>
  
  <script lang="ts">
  import { reactive, toRefs, defineComponent, onMounted, onUnmounted } from 'vue'
  import { Tooltip } from '@progress/kendo-vue-tooltip'  
    
  export default defineComponent({
    name: 'HomeAccordionSingle',
    components: { Tooltip },
    props: {
      title: { type: String, required: true },
      items: { type: Object, required: true }
    },
    setup( props ) {      
  
      interface DataInterface {
        showDetails: boolean,        
        itemsTotaL: number,
        widthScreen: number,
        limitItems: number,
        restItems: number,
        itemsToPrint: Array<any>,
        itemsToRest: Array<any>,
        showMore: boolean,        
        itemsFor: number,
        countOfItems: number,
        limit5Array: Array<any>
        arrayCopy: Array<any>
      }

      const data = reactive<DataInterface>({ 
        showDetails: false,        
        itemsTotaL: 0,
        widthScreen: 0,
        limitItems: 5,
        restItems: 0,
        itemsToPrint: [],
        itemsToRest: [],
        showMore: false,
        itemsFor: 0,
        countOfItems: 0,
        limit5Array: [],
        arrayCopy: []
      })

      window.onresize = () => {        
        adjustArray()
      }
      
      onMounted(() => {
        setDataitems()
        adjustArray()
        window.addEventListener('resize', adjustArray)
      })

      onUnmounted(()=>{
        window.removeEventListener('resize', adjustArray)
      })

      function setDataitems() {
        
        if (Array.isArray(props.items)){
          data.itemsToPrint = props.items.map((item:any) => {
            if (item.label) {
              return { value : item.label }
            } else {
              return { value : item }
            }
          })
        } else {
          for (let key in props.items){       
            data.itemsToPrint.push({ value: props.items[key].label})
          }
        }        
      }

      function adjustArray() {
        data.widthScreen = window.innerWidth;
        let limitSize = 5

        if (data.widthScreen < 1920) {
          
          limitSize = 4
        }

        if (data.widthScreen < 1420) {
          
          limitSize = 3
        }
        if (data.widthScreen < 1120) {
          
          limitSize = 2
        }
        if (data.widthScreen < 800) {
          //data.limitItems =  2
          limitSize = 1
        }
        data.limit5Array = data.itemsToPrint.slice(0,limitSize) 
        data.restItems = data.itemsToPrint.length - data.limit5Array.length 
        
      }

      function openCloseDetails() {
        data.showDetails = !data.showDetails
      }

      function changeUppercase(item: string) {
        return item.toUpperCase()
      }
      


      return {
        ...toRefs(data),
        adjustArray,
        openCloseDetails,
        changeUppercase
       }
    }
  })
  </script>
  
  <style scoped lang="scss">  

.accordion-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;    
    align-items: center;
    padding: 0px 16px;
    width: 100%;
    height: 60px;    
    //background: #F8F9FC;
    background: #FFF;
    border: 1px solid #EAECF0;
    box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
    border-radius: 8px;
    //overflow: hidden;
  }

  .accordion-items {
    //width: 100%;
    width: fit-content;
    height: 60px;
    flex: none;    
    flex-grow: 0;
    padding: 12px 0px;
  }  

  .accordion-circle {
    display:flex;
    align-items: center;
    justify-content: center;
    background: #F9FAFB;
    border: 1px solid #98A2B3;
    border-radius: 50%;
    padding: 10px 15px;
    height: 40px;
    min-width: 50px;
    max-width: 50px;
    font-weight: 500;
    font-size: 12px;
    line-height: 20px;
    letter-spacing: 0.02em;
    color: #667085;    
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .accordion-less-characters{
    box-sizing: border-box;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 10px 15px;
    gap: 10px;
    width: -webkit-fit-content;
    width: -moz-fit-content;
    // width: 150px;
    // min-width: 120px;
    height: 40px;
    left: 0px;
    top: 0px;
    background: #F9FAFB;
    border: 1px solid #98A2B3;
    border-radius: 65px;
    text-transform: capitalize;
    font-weight: 500;
    font-size: 12px;
    line-height: 20px;
    letter-spacing: 0.02em;
    color: #667085;    
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    // width: 150px;
  }

  .accordion-item {
    box-sizing: border-box;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 10px 15px;
    gap: 10px;
    width: -webkit-fit-content;
    width: -moz-fit-content;
    //width: fit-content;
    min-width: 50px;
    max-width: 150px;
    height: 40px;
    left: 0px;
    top: 0px;
    background: #F9FAFB;
    border: 1px solid #98A2B3;
    border-radius: 65px;
    text-transform: capitalize;
    font-weight: 500;
    font-size: 12px;
    line-height: 20px;
    letter-spacing: 0.02em;
    color: #667085;    
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .custom-margin-left{
    margin-left: 5.5em;
  }

  .show-details {
    height: 155px !important;
    padding: 12px 0px;
  }

  .title-accordion {
    font-weight: 500;
    font-size: 14px;    
    color: #667085;
    text-transform: capitalize;
   }

  .accordion-action {
    font-weight: 400;
    font-size: 14px;    
    color: #98A2B3;
  }

  .accordion-chevron {
    width: 100%;
    height: auto;
    justify-content: center;
  }

  .num-items {
    min-width: 36px;
    height: 36px;
    -moz-border-radius: 50%;
    -webkit-border-radius: 50%;
    border-radius: 50%;
    border-width: 3px;    
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .num-items-background {
    background: #F2F4F7;
    cursor: unset;
  }

  .details-single-closed {
    width: fit-content;
    padding-right: 15px;
    background-image: url('@/resources/assets/images/icons/chevAccordionDown.svg') !important;
    background-size: 10px !important;
    background-repeat: no-repeat !important;    
    background-position: 100% 50% !important;    
  }

  .details-single-opened {    
    width: fit-content;
    padding-right: 15px;
    background-image: url('@/resources/assets/images/icons/chevAccordionUp.svg') !important;
    background-size: 10px !important;
    background-repeat: no-repeat !important;    
    background-position: 100% 50% !important;    
  }

  </style>
  