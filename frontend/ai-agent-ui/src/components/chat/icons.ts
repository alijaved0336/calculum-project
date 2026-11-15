import { defineComponent, h } from 'vue'

function svgIcon(children: ReturnType<typeof h>[]) {
  return defineComponent({
    render: () => h('svg', { class: 'ico', viewBox: '0 0 16 16', fill: 'none' }, children),
  })
}

export const SparkleSvg = svgIcon([
  h('path', { d: 'M8 1.5l1.4 4.1L13.5 7 9.4 8.4 8 12.5 6.6 8.4 2.5 7l4.1-1.4L8 1.5z', fill: 'currentColor' }),
  h('path', { d: 'M13 11.5l.6 1.6L15 13.7l-1.4.6L13 15.9l-.6-1.6L11 13.7l1.4-.6.6-1.6z', fill: 'currentColor', opacity: '.5' }),
])
export const BookSvg = svgIcon([
  h('path', { d: 'M3 3h6a2 2 0 0 1 2 2v8H5a2 2 0 0 1-2-2V3z', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M11 5h2v8h-2', stroke: 'currentColor', 'stroke-width': '1.3' }),
])
export const SummarySvg = svgIcon([
  h('rect', { x: '2.5', y: '3', width: '11', height: '10', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M5 6h6M5 8.5h6M5 11h4', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
])
export const ChevronDownSvg = svgIcon([
  h('path', { d: 'M4 6l4 4 4-4', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const PlusSvg = svgIcon([
  h('path', { d: 'M8 3v10M3 8h10', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
export const ClockSvg = svgIcon([
  h('circle', { cx: '8', cy: '8', r: '6', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M8 5v3l2 1.5', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
])
export const DocSvg = svgIcon([
  h('path', { d: 'M4 2h6l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', stroke: 'currentColor', 'stroke-width': '1.2', fill: 'none' }),
  h('path', { d: 'M10 2v4h4', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round' }),
  h('path', { d: 'M6 9h5M6 12h3', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round' }),
])
export const CopySvg = svgIcon([
  h('rect', { x: '5.5', y: '2.5', width: '8', height: '9', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M10.5 11.5v.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.5A1.5 1.5 0 0 1 4 4h.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
])
export const CheckSvg = svgIcon([
  h('path', { d: 'M3 8.5l3.2 3L13 4.5', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const MaximizeSvg = svgIcon([
  h('path', { d: 'M6 2.5H3.5A1 1 0 0 0 2.5 3.5V6M10 2.5h2.5a1 1 0 0 1 1 1V6M6 13.5H3.5a1 1 0 0 1-1-1V10M10 13.5h2.5a1 1 0 0 0 1-1V10', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
])
export const MinimizeSvg = svgIcon([
  h('path', { d: 'M2.5 6H5a1 1 0 0 0 1-1V2.5M13.5 6H11a1 1 0 0 1-1-1V2.5M2.5 10H5a1 1 0 0 1 1 1v2.5M13.5 10H11a1 1 0 0 0-1 1v2.5', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
])
export const CloseSvg = svgIcon([
  h('path', { d: 'M4 4l8 8M12 4l-8 8', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' }),
])
export const ArrowLeftSvg = svgIcon([
  h('path', { d: 'M13 8H3M7 12l-4-4 4-4', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const ArrowRSvg = svgIcon([
  h('path', { d: 'M3 8h10M9 4l4 4-4 4', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const StopSvg = svgIcon([
  h('rect', { x: '4', y: '4', width: '8', height: '8', rx: '1', fill: 'currentColor' }),
])
export const MicSvg = svgIcon([
  h('rect', { x: '6', y: '2', width: '4', height: '8', rx: '2', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5V14', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
])
export const DotsSvg = svgIcon([
  h('circle', { cx: '4', cy: '8', r: '1.2', fill: 'currentColor' }),
  h('circle', { cx: '8', cy: '8', r: '1.2', fill: 'currentColor' }),
  h('circle', { cx: '12', cy: '8', r: '1.2', fill: 'currentColor' }),
])
export const PinSvg = svgIcon([
  h('path', { d: 'M8 2v6m0 0l-3 3h6L8 8zm0 6v5', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const EditResendSvg = svgIcon([
  h('path', { d: 'M11 3l2 2-7 7H4v-2l7-7z', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
])
export const PencilSvg = svgIcon([
  h('path', { d: 'M11.5 2.5a1.41 1.41 0 0 1 2 2L5 13H3v-2L11.5 2.5z', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round', fill: 'none' }),
])
export const TrashSvg = svgIcon([
  h('path', { d: 'M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
])
export const SearchSvg = svgIcon([
  h('circle', { cx: '7', cy: '7', r: '4.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M10.5 10.5L14 14', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' }),
])
export const ThumbUpSvg = svgIcon([
  h('path', { d: 'M5 7v6H3.2A1.2 1.2 0 0 1 2 11.8V8.2A1.2 1.2 0 0 1 3.2 7H5z', stroke: 'currentColor', 'stroke-width': '1.2' }),
  h('path', { d: 'M5 7l2.6-4.4a.9.9 0 0 1 1.7.4V6h3.1a1.2 1.2 0 0 1 1.18 1.45l-.85 4A1.2 1.2 0 0 1 11.6 12.4H5', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
])
export const ThumbDownSvg = svgIcon([
  h('path', { d: 'M11 9V3h1.8A1.2 1.2 0 0 1 14 4.2v3.6A1.2 1.2 0 0 1 12.8 9H11z', stroke: 'currentColor', 'stroke-width': '1.2' }),
  h('path', { d: 'M11 9l-2.6 4.4a.9.9 0 0 1-1.7-.4V10H3.6a1.2 1.2 0 0 1-1.18-1.45l.85-4A1.2 1.2 0 0 1 4.4 3.6H11', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
])
export const CreditCardSvg = svgIcon([
  h('rect', { x: '2', y: '4', width: '12', height: '8', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M2 7h12', stroke: 'currentColor', 'stroke-width': '1.3' }),
])
export const ChartBarsSvg = svgIcon([
  h('path', { d: 'M3.5 12.5V8M8 12.5V4.5M12.5 12.5v-5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
export const GaugeSvg = svgIcon([
  h('path', { d: 'M3.5 10.5a5 5 0 0 1 9 0', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
  h('path', { d: 'M8 10.5l2.5-3', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
  h('circle', { cx: '8', cy: '10.5', r: '1', fill: 'currentColor' }),
])
export const WarnTriangleSvg = svgIcon([
  h('path', { d: 'M8 2.5L14 13H2L8 2.5z', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M8 6.5v3', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' }),
  h('circle', { cx: '8', cy: '11.2', r: '0.8', fill: 'currentColor' }),
])
export const ShieldSvg = svgIcon([
  h('path', { d: 'M8 2.5l5 2v3.5c0 3.2-2.1 5.3-5 6.5-2.9-1.2-5-3.3-5-6.5V4.5l5-2z', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round' }),
])
export const CalendarSvg = svgIcon([
  h('rect', { x: '2.5', y: '3.5', width: '11', height: '10', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
])
export const ExclaimSvg = svgIcon([
  h('circle', { cx: '8', cy: '8', r: '5.5', stroke: 'currentColor', 'stroke-width': '1.3' }),
  h('path', { d: 'M8 5v3.5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
  h('circle', { cx: '8', cy: '11', r: '0.8', fill: 'currentColor' }),
])
