<template>
    <div>
      <Chart>
        <ChartSeries>          
          <ChartSeriesItem
            :type="'radarArea'"
            :data-items="radarData"
            :field="'post'"
            :category-field="'name'"
            :color="lineColor"
            :style="{
              fill: fillColor,
              opacity: fillOpacity
            }"
          />
        </ChartSeries>
        <ChartValueAxis>
          <ChartValueAxisItem
            :min="0"
            :max="3"
            :major-unit="1"
            :labels="{
              visible: false,              
            }"
            :major-grid-lines="{
              visible: true,
              color: gridColor,
              width: 2
            }"
            :minor-grid-lines="{
              visible: false
            }"
          />
        </ChartValueAxis>
        <ChartCategoryAxis>
          <ChartCategoryAxisItem
            :labels="{
              visible: true,
              step: 1,
              skip: 0,
              rotation: 0,
              font: 'bold 16px Inter,Arial, sans-serif',
              visual: getLabels
            }"
          />
        </ChartCategoryAxis>
        <ChartLegend 
          :position="'bottom'" 
          :labels="{ font: 'bold 12px Arial, sans-serif', visible: false }"
          
        />
        <ChartTooltip 
          :visible="true"          
        :render="'defaultTooltipRender'"
        >

        <template #defaultTooltipRender="{ props }">
            <span class="font-weight-bold text-center tooltip-category-title">
            {{ getRadarLabel(props.point.category) }}: 
            </span>
            <span class="text-center tooltip-category-title">
            {{  getCategoryLabel(props.point.value) }}
          </span>
            
        </template>

        </ChartTooltip>
      </Chart>
    </div>
  </template>
  
  <script lang="ts">

  import { defineComponent, ref } from 'vue';
  import { useI18n } from 'vue-i18n';

  import {
      Chart,
      ChartLegend,
      ChartValueAxis,
      ChartValueAxisItem,
      ChartCategoryAxis,
      ChartCategoryAxisItem,
      ChartSeries,
      ChartSeriesItem,
      ChartTooltip,
  } from "@progress/kendo-vue-charts";
  import { Path, Group, Text } from "@progress/kendo-drawing";

  export default defineComponent({
  name: "RadarChart",
  components: { Chart,
      ChartLegend,
      ChartValueAxis,
      ChartValueAxisItem,
      ChartCategoryAxis,
      ChartCategoryAxisItem,
      ChartSeries,
      ChartSeriesItem,
      ChartTooltip },
  props: {
    radarData: {
      type: Array,
      required: true
    },
    lineColor: {
      type: String,
      default: '#667085' 
    },
    gridColor: {
      type: String,
      default: '#a0a0a0'
    },
    fillColor: {
      type: String,
      default: '#667085'
    },
    fillOpacity: {
      type: Number,
      default: 1
    }
  },
  setup(props: any) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    // The SCF analysis endpoint returns the axis names in English; map them to the app labels.
    const radarLabelKeys: Record<string, string> = {
        'Buyer Leverage / Materiality': 'home.entityCard.buyerLeverageMateriality',
        'Cost of Funds': 'global.financingTab.costOfFunds',
        'Financing Days': 'global.financingTab.financingDays',
        'Spend Volume': 'global.spendVolume',
        'Supplier using Financing': 'global.supplierUsingFinancing'
    };

    function getRadarLabel(value: string) {
        const key = radarLabelKeys[(value ?? '').trim()];
        return key ? translate.t(key) : value;
    }

    const categoriesChart = ['null', 'low', 'medium', 'high']; // 0,1,2,3
    
    function getCategoryLabel(value: number) {
        return categoriesChart[value] || '';
    }

    // Helper function to estimate text width
    function estimateTextWidth(text: string, fontSize: number = 14): number {
        // Estimate width more accurately for Inter font
        // Average character width varies: uppercase letters are wider, lowercase narrower
        // For better centering, especially for short words, use a more precise calculation
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            // More accurate width estimation based on character type
            if (char === ' ') {
                width += fontSize * 0.3; // Space is narrower
            } else if (char >= 'A' && char <= 'Z') {
                width += fontSize * 0.65; // Uppercase letters are wider
            } else if (char >= 'a' && char <= 'z') {
                width += fontSize * 0.55; // Lowercase letters are narrower
            } else if (char >= '0' && char <= '9') {
                width += fontSize * 0.6; // Numbers are medium width
            } else {
                width += fontSize * 0.6; // Default for other characters
            }
        }
        // For very short words, add a small adjustment to improve centering
        if (text.length <= 5) {
            width *= 0.95;
        }
        
        if (text === 'Cost of') {
            width *= 0.88; 
        }
        
        if (text === 'Funds') {
            width *= 0.99; 
        }
        return width;
    }

    function getLabels(e: any) {
        const rawValue = e.value || '';
        const originalValue = getRadarLabel(rawValue);
        
        // Count whitespace characters
        const spaceCount = (originalValue.match(/\s/g) || []).length;
        
        let formattedValue = originalValue;
        
        // Special rule: if contains "/", split after the "/"
        if (originalValue.includes('/')) {
            const slashIndex = originalValue.indexOf('/');
            const beforeSlash = originalValue.substring(0, slashIndex + 1).trim();
            const afterSlash = originalValue.substring(slashIndex + 1).trim();
            formattedValue = `${beforeSlash}\n${afterSlash}`;
        } else if (spaceCount >= 2) {
            // If has 2 or more spaces, split at the second space
            const spaces = originalValue.split(/\s+/);
            if (spaces.length >= 3) {
                // Take the first two words as first line
                const firstLine = spaces.slice(0, 2).join(' ');
                // The rest as second line
                const secondLine = spaces.slice(2).join(' ');
                formattedValue = `${firstLine}\n${secondLine}`;
            } else if (spaces.length === 3) {
                // Special case for exactly 3 words (2 spaces)
                const firstLine = spaces.slice(0, 2).join(' ');
                const secondLine = spaces[2];
                formattedValue = `${firstLine}\n${secondLine}`;
            }
        } else if (spaceCount === 1) {
            // If has only 1 space, split at that space
            formattedValue = originalValue.replace(/\s+/, '\n');
        }
        // Split text into lines
        const lines = formattedValue.split('\n');
        // Calculate offset based on label position (more space for bottom 3 labels)
        let offsetX = 0;
        let offsetY = 0;
        
        // Determine position based on label text to add more space for bottom labels
        if (rawValue.includes('Cost of Funds')) {
            // Left axis - move further left
            // offsetX = -20;
            offsetY = 15;
        } else if (rawValue.includes('Supplier using Financing')) {
            // Bottom axis - move further down
            offsetY = 15;            
        } 
        else if (rawValue.includes('Spend Volume')) {
            // Bottom axis - move further down
            offsetX = -10;
        } else if (rawValue.includes('Financing Days')) {
            // Right axis - move further right
            offsetX = 5;
        }
        // Buyer Leverage / Materiality (top) keeps default position

        // Calculate center X position of the available rectangle
        const centerX = e.rect.origin.x + (e.rect.size.width / 2);
        const fontSize = 14;

        // If only one line, use simple Text centered
        if (lines.length === 1) {
            const textWidth = estimateTextWidth(lines[0], fontSize);
            const centeredX = centerX + offsetX - (textWidth / 2);
            
            return new Text(
                formattedValue,
                [centeredX, e.rect.origin.y + offsetY],
                {
                    font: "500 14px Inter",            
                }
            );
        }

        // If multiple lines, create a Group with multiple Text elements, each centered
        const group = new Group();
        const lineHeight = 16; // Height between lines
        const startY = e.rect.origin.y + offsetY - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line: string, index: number) => {
            const textWidth = estimateTextWidth(line, fontSize);
            const centeredX = centerX + offsetX - (textWidth / 2);
            
            const text = new Text(
                line,
                [centeredX, startY + (index * lineHeight)],
                {
                    font: "500 14px Inter"
                }
            );
            group.append(text);
        });

        return group;
    }

    return {
        getLabels,
        getCategoryLabel,
        getRadarLabel,
        categoriesChart
    }
  }  
})

</script>

<style scoped>

  .tooltip-category-title {
      font-size: 0.75rem;
      text-transform: capitalize;
  }
</style>
