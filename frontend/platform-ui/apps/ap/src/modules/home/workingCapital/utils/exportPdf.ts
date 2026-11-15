import { drawDOM, exportPDF } from '@progress/kendo-drawing'

// Mirrors apps/ap/src/modules/home/entityCard/pdf/EntityExportPDF.vue's capture
// technique (offscreen clone + zoom compensation + drawDOM/exportPDF), extracted here
// as a standalone, reusable, independently-testable function — that component has no
// equivalent shared utility today (it's all inlined in its own <script>).

// Counteracts the app's global 0.67 CSS zoom (1 / 0.67 ≈ 1.4925), same factor
// EntityExportPDF.vue uses.
const ZOOM_COMPENSATION = 1.4925
const MIN_PDF_WIDTH = 1200

// kendo-drawing's exportPDF() maps text through the 14 standard PDF fonts, which reach
// only U+00FF — no font is registered here, so anything above that is dropped silently,
// leaving a gap where the character was. Verified against the real exporter: "30 → 45"
// comes out of exportPDF() as "30  45", while "·", "ó", "»" and the rest of Latin-1 survive.
// These are the characters the exported dashboard actually renders; substituting them on
// the clone keeps the live view's real glyphs untouched.
// ponytail: a substitution table, not an embedded font — registering a Unicode TTF via
// pdf.defineFont() would render the originals, at the cost of ~1MB of font assets and a
// different typeface for the whole PDF. Swap to that if the list ever outgrows a handful.
const PDF_SAFE_GLYPHS: Record<string, string> = {
  '→': '»',   // → from-to arrow: KPI sub-line, coverage subtitle, terms column
  '—': '-',   // — em dash
  '–': '-',   // – en dash
  '−': '-',   // − minus sign
}
const UNSUPPORTED_GLYPHS = new RegExp('[' + Object.keys(PDF_SAFE_GLYPHS).join('') + ']', 'g')

/**
 * Rewrites the clone's text nodes in place, replacing glyphs the PDF's standard fonts
 * cannot carry. Text nodes only — never attributes or markup — so nothing but rendered
 * copy changes.
 */
function substituteUnsupportedGlyphs(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.nodeValue) {
      node.nodeValue = node.nodeValue.replace(UNSUPPORTED_GLYPHS, c => PDF_SAFE_GLYPHS[c])
    }
  }
}

function downloadPDF(dataURI: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataURI
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Clones `element` off-screen (so the full, unscrolled content renders regardless of
 * the live view's height/overflow constraints), draws it via kendo-drawing, and
 * downloads the result as a PDF. Throws on failure — callers decide how to surface
 * that (toast, logging, etc.) and must reset their own "exporting" state in a
 * `finally`, since this function itself holds no UI state.
 *
 * `chartImage`: a data URI for the Supplier Match Coverage donut, pre-rendered via
 * Kendo's own chart-export API (SupplierMatchCoverageChart.vue's exportChartImage()).
 * drawDOM()'s generic DOM/SVG walk can't faithfully reproduce that chart's SVG output
 * (it's the only real Kendo <Chart> ever run through this pipeline), so when supplied,
 * its rendered `.k-chart` root is swapped for a plain <img> before drawDOM() runs —
 * a node type drawDOM already handles correctly.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  chartImage?: string | null,
): Promise<void> {
  let cloneContainer: HTMLDivElement | null = null
  try {
    const exportWidth = Math.max(element.offsetWidth, MIN_PDF_WIDTH)

    cloneContainer = document.createElement('div')
    cloneContainer.style.cssText = `
      position: fixed; left: -99999px; top: 0;
      zoom: ${ZOOM_COMPENSATION}; width: ${exportWidth}px;
    `

    const clone = element.cloneNode(true) as HTMLElement
    clone.style.height = 'auto'
    clone.style.maxHeight = 'none'
    clone.style.overflow = 'visible'

    if (chartImage) {
      const chartEl = clone.querySelector('.wc-smc__donut-wrap .k-chart')
      if (chartEl) {
        const img = document.createElement('img')
        img.src = chartImage
        img.style.cssText = 'width:100%;height:100%;display:block;'
        chartEl.replaceWith(img)
      }
    }

    substituteUnsupportedGlyphs(clone)

    cloneContainer.appendChild(clone)
    document.body.appendChild(cloneContainer)

    // Let the clone's layout/charts settle before capturing (matches EntityExportPDF.vue).
    await new Promise(resolve => setTimeout(resolve, 150))

    const group = await drawDOM(clone, {
      paperSize: 'auto',
      margin: { top: '0.5cm', left: '0.5cm', right: '0.5cm', bottom: '0.5cm' },
      avoidLinks: true,
    })
    const dataURI = await exportPDF(group, { paperSize: 'auto' })
    downloadPDF(dataURI, filename)
  } finally {
    cloneContainer?.remove()
  }
}
