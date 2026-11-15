import { defineComponent, h } from 'vue'

function svgIcon(children: ReturnType<typeof h>[], viewBox = '0 0 16 16') {
  return defineComponent({
    render: () => h('svg', { class: 'ico', viewBox, fill: 'none' }, children),
  })
}

// Sidebar nav icons
export const HomeSvg = svgIcon([
  h('path', { d: 'M2 8.5L8 3l6 5.5M4 7v6.5a.5.5 0 0 0 .5.5H7v-4h2v4h2.5a.5.5 0 0 0 .5-.5V7', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const TrendingUpSvg = svgIcon([
  h('path', { d: 'M2 12l4-4 3 3 5-6', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M11 4h3v3', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const ClipboardSvg = svgIcon([
  h('rect', { x: '3.5', y: '2.5', width: '9', height: '11', rx: '1.3', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M6 2.5h4v1.5H6z', fill: 'currentColor' }),
  h('path', { d: 'M6 7h4M6 9.5h4M6 12h2.5', stroke: 'currentColor', 'stroke-width': '1.1', 'stroke-linecap': 'round' }),
])
export const SlidersSvg = svgIcon([
  h('path', { d: 'M2.5 4h11M2.5 8h11M2.5 12h11', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
  h('circle', { cx: '6', cy: '4', r: '1.4', fill: 'currentColor' }),
  h('circle', { cx: '10', cy: '8', r: '1.4', fill: 'currentColor' }),
  h('circle', { cx: '5.5', cy: '12', r: '1.4', fill: 'currentColor' }),
])
export const TruckSvg = svgIcon([
  h('path', { d: 'M2 4.5h6v6H2zM8 7h3l2 2.5v1H8z', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
  h('circle', { cx: '4.5', cy: '12', r: '1.2', stroke: 'currentColor', 'stroke-width': '1.1' }),
  h('circle', { cx: '11', cy: '12', r: '1.2', stroke: 'currentColor', 'stroke-width': '1.1' }),
])
export const CompareSvg = svgIcon([
  h('path', { d: 'M5 2.5v11M11 2.5v11', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
  h('path', { d: 'M2.5 5.5L5 3l2.5 2.5M8.5 10.5L11 13l2.5-2.5', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const MatchSvg = svgIcon([
  h('circle', { cx: '8', cy: '8', r: '6', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M5.5 8.2l1.7 1.7L10.5 6', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const GearSvg = svgIcon([
  h('circle', { cx: '8', cy: '8', r: '2.2', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', {
    d: 'M8 1.7v1.5M8 12.8v1.5M14.3 8h-1.5M3.2 8H1.7M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7L3.6 3.6',
    stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round',
  }),
])

// Header icons
export const SearchSvg = svgIcon([
  h('circle', { cx: '7', cy: '7', r: '4.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M10.5 10.5L14 14', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' }),
])
export const ChevronDownSvg = svgIcon([
  h('path', { d: 'M4 6l4 4 4-4', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const ChevronUpSvg = svgIcon([
  h('path', { d: 'M4 10l4-4 4 4', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const HelpCircleSvg = svgIcon([
  h('circle', { cx: '8', cy: '8', r: '6.3', stroke: 'currentColor', 'stroke-width': '1.2' }),
  h('path', { d: 'M6.3 6.3a1.7 1.7 0 1 1 2.4 1.55c-.5.27-.7.55-.7 1.05', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round' }),
  h('circle', { cx: '8', cy: '11.2', r: '.6', fill: 'currentColor' }),
])
export const BellSvg = svgIcon([
  h('path', { d: 'M8 2.5a3.3 3.3 0 0 0-3.3 3.3v2c0 .8-.3 1.6-.9 2.2l-.5.5h9.4l-.5-.5a3 3 0 0 1-.9-2.2v-2A3.3 3.3 0 0 0 8 2.5z', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M6.5 12.8a1.5 1.5 0 0 0 3 0', stroke: 'currentColor', 'stroke-width': '1.2' }),
])
export const FilterSvg = svgIcon([
  h('path', { d: 'M2.5 3.5h11L9.5 8.3v4l-3 1.7v-5.7z', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
])
export const ShieldSvg = svgIcon([
  h('path', { d: 'M8 2l5 1.8v3.7c0 3.3-2.2 5.4-5 6.5-2.8-1.1-5-3.2-5-6.5V3.8L8 2z', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
])

// Content icons
export const InfoCircleSvg = svgIcon([
  h('circle', { cx: '8', cy: '8', r: '6.3', stroke: 'currentColor', 'stroke-width': '1.2' }),
  h('path', { d: 'M8 7.3v3.6', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round' }),
  h('circle', { cx: '8', cy: '5.1', r: '.6', fill: 'currentColor' }),
])
export const FileSvg = svgIcon([
  h('path', { d: 'M4 2h6l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', stroke: 'currentColor', 'stroke-width': '1.2', fill: 'none' }),
  h('path', { d: 'M10 2v4h4', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round' }),
])
export const UploadSvg = svgIcon([
  h('path', { d: 'M8 11V3M5 6l3-3 3 3', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' }),
])
export const PlusSvg = svgIcon([
  h('path', { d: 'M8 3v10M3 8h10', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
export const DotsVerticalSvg = svgIcon([
  h('circle', { cx: '8', cy: '3.6', r: '1.1', fill: 'currentColor' }),
  h('circle', { cx: '8', cy: '8', r: '1.1', fill: 'currentColor' }),
  h('circle', { cx: '8', cy: '12.4', r: '1.1', fill: 'currentColor' }),
])
export const PencilSvg = svgIcon([
  h('path', { d: 'M11.5 2.5a1.41 1.41 0 0 1 2 2L5 13H3v-2L11.5 2.5z', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round', fill: 'none' }),
])
export const TrashSvg = svgIcon([
  h('path', { d: 'M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const CheckSvg = svgIcon([
  h('path', { d: 'M3 8.5l3.2 3L13 4.5', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const ArrowRightSvg = svgIcon([
  h('path', { d: 'M3 8h10M9 4l4 4-4 4', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
