<template>
  <CalculumLoading v-if="loading" block />

  <CalculumFullScreen
v-if="showFullScreen" :title="$t('home.overview.location')"
    @close-full-screen="showFullScreen = false">
    <template #fullScreenContent>
      <div id="mapContent" class="full-body relative">
        <div class="row mb-1">
          <div class="location-legend">
            <div class="buyer d-flex align-items-center">
              <span class="seriesA mr-2"></span>
              <span>{{ $t('home.overview.buyer') }}</span>
            </div>
            <div class="supplier d-flex align-items-center">
              <span class="seriesF mr-2"></span>
              <span>{{ $t('home.overview.supplier') }}s</span>
            </div>
          </div>
        </div>
        <div id="mypopupFull">
          <div class="span-capitalize">
            <h6>{{ country }}</h6>
          </div>
          <div class="mb-1 font-weight-bold span-capitalize"> {{ $t('global.numberOf') }} {{ typeShape }}:
            <span>{{ amountFormatted }} </span>
          </div>
          <div class="mb-1 font-weight-bold span-capitalize"> {{ $t('global.nameOf') }} {{ typeShape }}:</div>
          <div class="">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
              <span class="span-content span-capitalize" :title="names">{{ names }}</span>
            </Tooltip>
          </div>
        </div>
        <div v-if="isMapLoaded" class="row">
          <kendo-map
            :key="keyComponent" 
            :zoom="3" :min-zoom="2" style="width: 100vw; height: 100vh; "
            :shape-mouse-enter="onShapeMouseEnter" :shape-mouse-leave="onshapeMouseLeave"
            :shape-created="onShapeCreated"
            :shape-click="onShapeClick">
            <kendo-map-layer
              :type="'tile'"
              :url-template="'https://#= subdomain #.tile.openstreetmap.org/#= zoom #/#= x #/#= y #.png'"
              :subdomains="['a', 'b', 'c']"
              :attribution="'&copy; <a href=\'https://osm.org/copyright\'>OpenStreetMap contributors</a>'"
            />    
            <kendo-map-layer :type="'bubble'" :symbol="'circle'" :data-source="markers">
            </kendo-map-layer>
          </kendo-map>
        </div>
        <div v-else class="row">
          <div class="alert alert-info">
            {{ $t('home.overview.mapWillBeAvailableShortly') }}
          </div>
        </div>
      </div>
    </template>
  </CalculumFullScreen>


  <div v-else class="card relative h-100">
    <div class="card-body relative" :class="{ 'bg-blur': loading }">
      <div class="row mb-3">
        <div class="d-flex justify-content-between w-100">
          <h6 class="mb-1 font-bold text-base">{{ $t('home.overview.location') }}
            <CalculumTooltipIcon
v-if="!fromValueProposition" class="mt-2"
              :info-text="$t('home.overview.locationTooltipDefault')" :advanced-tooltip-class="true"
              :unique-identifier="'popover-preferences-preferences'" :key-pop-over="'matchLocation'">
            </CalculumTooltipIcon>
          </h6>

          <p v-if="!showFullScreen && !fromValueProposition" class="btn-extension" @click="showFullScreen = true">
            <button class="btn btn-simple btn-icon link link--icon">
              <em class="fa-solid fa-up-right-and-down-left-from-center text-sm"></em>
            </button>
          </p>
        </div>

        <!-- Map Legend -->

        <div class="location-legend">

          <div class="buyer d-flex align-items-center">
            <span class="rounded-0 square-legend mr-2 w-4  bg-orange-500"></span>
            <span class="legend-text">{{ $t('home.overview.buyer') }}</span>
          </div>

          <div class="supplier d-flex align-items-center">
            <span class="rounded-0 square-legend mr-2 w-4  bg-teal-600"></span>
            <span class="legend-text">{{ $t('home.overview.supplier') }}s</span>
          </div>

        </div>
        <!-- END Map Legend -->

      </div>

      <div class="row">
        <div id="mypopup">

          <div class="span-capitalize">
            <h6>{{ country }}</h6>
          </div>

          <div v-if="!StringUtils.isEmpty(amountFormatted)" class="mb-1 font-weight-bold span-capitalize">
            <span> {{ $t(`global.${metricSelected}`) }}: {{ amountFormatted }}</span>
          </div>

          <div class="">

            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'auto'">
            </Tooltip>

          </div>
        </div>

        <!-- Map -->
        <div v-if="isMapLoaded" class="container-map">
          <kendo-map 
          :key="keyComponent" 
          :zoom="2" 
          :min-zoom="2" 
          :max-zoom="fromValueProposition ? 2 : 21" 
          :scrollable="!fromValueProposition"
          style="width: 100%; height: 450px;" 
          :shape-mouse-enter="onShapeMouseEnter"
          :shape-mouse-leave="onshapeMouseLeave" 
          :shape-created="onShapeCreated"
          :shape-click="onShapeClick"
          :class="{'custom-map-scroll':fromValueProposition, 'no-map-controls': fromValueProposition}"
          >
            <kendo-map-layer
              :type="'tile'"
              :url-template="'https://#= subdomain #.tile.openstreetmap.org/#= zoom #/#= x #/#= y #.png'"
              :subdomains="['a', 'b', 'c']"
              :attribution="'&copy; <a href=\'https://osm.org/copyright\'>OpenStreetMap contributors</a>'"
            />    
            <kendo-map-layer :type="'bubble'" :symbol="'circle'" :data-source="markers" />
          </kendo-map>
        </div>
        <div v-else class="alert alert-info">
          {{ $t('home.overview.mapWillBeAvailableShortly') }}
        </div>
        <!-- END Map -->

      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { reactive, toRefs, defineComponent, watch, onMounted } from 'vue'

import { Map, MapLayer } from '@progress/kendo-map-vue-wrapper'
import { StringUtils, ColorsUtils } from '@/utils';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import * as FormatData from '@/utils/FormatData';
import { CalculumFullScreen } from '@ada/design-system'
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { ensureMapLoaded } from '@/utils/mapLoader'

// Types
import type { Match } from '@/types'
import type { PropType } from 'vue'

export default defineComponent({
  name: 'OverviewLocation',
  components: {
    'kendo-map': Map,
    'kendo-map-layer': MapLayer,
    CalculumFullScreen,
    Tooltip,
    CalculumLoading,
    CalculumTooltipIcon
  },
  props: {
    resizeKey: { type: Number, required: false, default: 0 },
    data: { type: Object as PropType<Match.CountriesMap>, required: false, default: null },
    metricSelected: { type: Object as PropType<Match.Metric>, required: false, default: null },
    fromValueProposition: { type: Boolean, required: false, default: false },
    selectedCountry: { type: String as PropType<string | null>, required: false, default: null }
  },
  emits: ['location-clicked'],

  setup(props, { emit }) {
    let mypopup: any = null
    let mypopupFull: any = null

    const data = reactive<{
      loading: boolean;
      markers: any[];
      showFullScreen: boolean;
      locationsBuyers: {
        supplierOrBuyerCount: number;
        spendCount: number;
        volume: string;
        country: string;
        geoLat: number;
        geoLon: number;
      }[];
      locationsSuppliers: {
        supplierOrBuyerCount: number;
        spendCount: number;
        volume: string;
        country: string;
        geoLat: number;
        geoLon: number;
      }[];
      keyComponent: number;
      country: string;
      names: string;
      amountFormatted: string;
      typeShape: string;
      isMapLoaded: boolean;
    }>({
      loading: false,
      markers: [],
      showFullScreen: false,
      locationsSuppliers: [],
      locationsBuyers: [],
      keyComponent: new Date().getUTCMilliseconds(),
      country: 'Select an item from the map',
      names: 'Select an item from the map',
      amountFormatted: "",
      typeShape: 'suppliers',
      isMapLoaded: false
    })

    onMounted(async () => {
      data.loading = true;
      try {

        await ensureMapLoaded();
        if (typeof (window as any).kendo === 'undefined') {
          throw new Error('Kendo not available after load');
        }
        data.isMapLoaded = true;
        
      } catch (error) {
        if (import.meta.env.DEV) console.error('[MAP_LOADER] Failed to load map:', error);
        data.isMapLoaded = false;
        // Mostrar un mensaje de error más descriptivo al usuario
        data.country = 'Error loading map. Please refresh the page.';
      } finally {
        data.loading = false;
      }

      // Refuerzo para ocultar controles si fromValueProposition es true
      if (props.fromValueProposition) {
        setTimeout(() => {
          const mapRoot = document.querySelector('.no-map-controls');
          if (mapRoot) {
            const controls = mapRoot.querySelectorAll('.k-map-controls');
            controls.forEach(control => (control as HTMLElement).style.display = 'none');
          }
        }, 200);
      }
    });

    // Colors

    const SUPPLIER_COLOR = ColorsUtils.teal[600];
    const SUPPLIER_COLOR_ON_HOVER = ColorsUtils.teal[300];

    const BUYER_COLOR = ColorsUtils.orange[500]
    const BUYER_COLOR_ON_HOVER = ColorsUtils.orange[300];
    
    const SELECTED_COLOR = '#0040C1'; // Color when selected (supplierStandard blue)

    // END Colors

    function onShapeMouseEnter(e: any) {
      mypopup = document.getElementById('mypopup')
      mypopupFull = document.getElementById('mypopupFull')

      data.country = e.shape.dataItem.country
      data.amountFormatted = e.shape.dataItem.amountFormatted
      data.typeShape = e.shape.dataItem.type

      e.shape.options.set('stroke', { width: 1, color: '#000000' })
      e.shape.options.set('fill', { color: e.shape.dataItem.type === 'supplier' ? SUPPLIER_COLOR_ON_HOVER : BUYER_COLOR_ON_HOVER, opacity: 0.85 })

      if (mypopup) {
        mypopup.style.display = 'block'
      }

      if (mypopupFull) {
        mypopupFull.style.display = 'block'
      }
    }

    function onshapeMouseLeave(e: any) {
      mypopup = document.getElementById('mypopup')
      mypopupFull = document.getElementById('mypopupFull')

      // Check if this country is selected
      const isSelected = props.selectedCountry === e.shape.dataItem.country;
      
      let color;
      if (isSelected) {
        color = SELECTED_COLOR;
      } else {
        color = e.shape.dataItem.type === 'suppliers' ? SUPPLIER_COLOR : BUYER_COLOR;
      }

      e.shape.options.set('stroke', { width: 1, color: '#aaaaa' })
      e.shape.options.set('fill', { color: color, opacity: 0.65 })

      if (mypopup) {
        mypopup.style.display = 'none'
      }

      if (mypopupFull) {
        mypopupFull.style.display = 'none'
      }
    }

    function onShapeCreated(e: any) {
      // Check if this country is selected
      const isSelected = props.selectedCountry === e.shape.dataItem.country;
      
      let color;
      if (isSelected) {
        color = SELECTED_COLOR;
      } else {
        color = e.shape.dataItem.type === 'suppliers' ? SUPPLIER_COLOR : BUYER_COLOR;
      }
      
      e.shape.options.set('fill', { color: color, opacity: 0.65 })
    }

    function onShapeClick(e: any) {
      // Emit event to parent with country and type information
      emit('location-clicked', {
        country: e.shape.dataItem.country,
        type: e.shape.dataItem.type,
        amountFormatted: e.shape.dataItem.amountFormatted
      });
    }

    function getGeo() {
      // Validate
      if (props.data === undefined) {
        if (import.meta.env.DEV) console.log("** Error in getGeo: props.data is undefined")
        return
      }

      if (props.metricSelected === undefined || StringUtils.isEmpty(props.metricSelected)) {
        if (import.meta.env.DEV) console.log("** Error in getGeo: props.metricSelected is undefined or empty")
        return
      }

      const { suppliers, buyers } = props.data

      if (suppliers === undefined || buyers === undefined) {
        if (import.meta.env.DEV) console.log("** Error in getGeo: suppliers or buyers is undefined")
        return
      }

      if (suppliers.length === 0 || buyers.length === 0) {
        if (import.meta.env.DEV) console.log("** Error in getGeo: suppliers or buyers is empty")
        return
      }

      // Reset markers
      data.markers = []

      // Suppliers

      for (const row of suppliers) {
        const marker = {
          location: [row.geoLat, row.geoLon],
          value: 0,
          type: 'suppliers',
          country: row.country,
          amountFormatted: ""
        }

        switch (props.metricSelected) {
          case 'numberOfSuppliers':
            // To show in Tooltip
            marker.amountFormatted = row.supplierOrBuyerCount.toString()

            // To render on map
            marker.value = row.supplierOrBuyerCount

            break;

          case 'numberOfSpends':
            marker.amountFormatted = row.spendCount.toString()

            marker.value = row.spendCount

            break;

          case 'spendVolume':
            // Parse as float and round to 2 decimals 
            const amount = Math.round(parseFloat(row.volume) * 100) / 100

            marker.amountFormatted = StringUtils.formatBigNumbers(amount)

            marker.value = amount

            break;

          default:
            break;
        }

        data.markers.push(marker)
      }

      data.locationsSuppliers = suppliers;

      // Buyers

      for (const row of buyers) {
        const marker = {
          location: [row.geoLat, row.geoLon],
          value: 0,
          type: 'buyers',
          country: row.country,
          amountFormatted: ""
        }

        switch (props.metricSelected) {
          case 'numberOfSuppliers':
            // To show in Tooltip
            marker.amountFormatted = row.supplierOrBuyerCount.toString()

            marker.value = row.supplierOrBuyerCount

            break;

          case 'numberOfSpends':
            marker.amountFormatted = row.spendCount.toString()

            marker.value = row.spendCount

            break;

          case 'spendVolume':
            // Parse as float and round to 2 decimals 
            const amount = Math.round(parseFloat(row.volume) * 100) / 100

            marker.amountFormatted = StringUtils.formatBigNumbers(amount)

            marker.value = amount

            break;

          default:
            break;
        }

        data.markers.push(marker)
      }

      data.locationsBuyers = buyers;

      // Refresh map if markers are updated
      data.keyComponent++;
    }

    // Refresh map markers on data from parent change
    watch([() => props.data, () => props.metricSelected], () => {
      getGeo()
    }, { immediate: true })
    
    // Refresh map when selected country changes
    watch(() => props.selectedCountry, () => {
      data.keyComponent++;
    })
    onMounted(() => {
      if (props.fromValueProposition) {
        setTimeout(() => {
          // Eliminar controles de zoom (+/-)
          const zoomControls = document.querySelectorAll('.k-map-controls .k-zoom-control');
          zoomControls.forEach(control => control.remove());

          // Eliminar controles de navegación (pan: arriba, abajo, izquierda, derecha)
          const panControls = document.querySelectorAll('.k-map-controls .k-pan-control');
          panControls.forEach(control => control.remove());

          // Otra variante (dependiendo de la estructura HTML específica)
          const navControls = document.querySelectorAll('[data-role="navigator"]');
          navControls.forEach(control => control.remove());
        }, 100);
      }
    })

    return {
      ...toRefs(data),
      onShapeMouseEnter,
      onshapeMouseLeave,
      onShapeCreated,
      onShapeClick,
      StringUtils
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.container-map{
  width: 100% !important;
}

div[data-role="navigator"] {
  display: none !important;
}

.k-widget .k-navigator {
  display: none !important;
}

.k-map .k-navigator {
  border-color: #000000;
  color: 'red' !important;
  background-color: #000000;
}

.square-legend {
  width: 15px;
  height: 15px;
}

.k-map .k-i-marker-supplier,
.k-map .k-i-marker-bayer {
  background-color: #2c3746;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  z-index: 95;
}

.k-map {
  z-index: 90;
}

.k-map .k-layer {
  z-index: 99;
}

.k-map .k-i-marker-bayer {
  background-color: #f52c50;
}

.location-legend {
  background-color: white;
  opacity: 0.9;
  padding: 5px;
  position: absolute;
  right: 20px;
  top: 80px;
  font-size: 1rem;
  z-index: 95;
}

span.seriesA,
span.seriesF {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
}

div.span-capitalize {
  text-transform: capitalize;
}

span.span-content {
  text-transform: capitalize;
  width: 100%;
  float: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#mypopup,
#mypopupFull {
  width: 450px;
  padding: 20px;
  margin: 15px 200px;
  line-height: normal;
  font-size: small;
  background-color: white;
  opacity: 0.9;
  border-radius: 6px;
  z-index: 97;
  position: absolute;
  display: none;
}

#mypopupFull {
  margin-left: 200px;
}

.full-body {
  flex: 1 1 auto;
  min-height: 1px;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.k-map-controls {
  z-index: 5000;

  .k-button-icon .k-icon .k-i-plus {
    color: 'red' !important;
  }
}

.custom-map-scroll {
  pointer-events: none;
  &.k-map-controls{
    display: none !important;
  }
}

.custom-map-scroll > div {
  pointer-events: auto;

  &.k-map-controls{
    display: none !important;
  }
}

.no-map-controls .k-map-controls {
  display: none !important;
}
</style>

<style>
.no-map-controls .k-map-controls {
  display: none !important;
}
</style>
