/**
 * Tests for utils/exportPdf.ts — the PDF capture logic extracted from
 * EntityExportPDF.vue's inline implementation so it's testable without mounting a
 * component. @progress/kendo-drawing's drawDOM/exportPDF can't produce real output in
 * jsdom, so we mock them; everything else here (cloning, off-screen container,
 * cleanup) is real DOM behavior, exercised as-is.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockDrawDOM = vi.fn()
const mockExportPDF = vi.fn()

// Partial mock: this file only imports drawDOM/exportPDF directly, but mock the whole
// module defensively the same way anyway, in case that changes later.
vi.mock('@progress/kendo-drawing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@progress/kendo-drawing')>()
  return {
    ...actual,
    drawDOM: (...args: unknown[]) => mockDrawDOM(...args),
    exportPDF: (...args: unknown[]) => mockExportPDF(...args),
  }
})

import { exportElementToPdf } from '@/modules/home/workingCapital/utils/exportPdf'

describe('exportElementToPdf', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>
  let element: HTMLElement

  beforeEach(() => {
    mockDrawDOM.mockReset()
    mockExportPDF.mockReset()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    element = document.createElement('div')
    element.innerHTML = '<span>content</span>'
    document.body.appendChild(element)
  })

  afterEach(() => {
    clickSpy.mockRestore()
    element.remove()
  })

  it('draws the element and downloads the resulting PDF on success', async () => {
    mockDrawDOM.mockResolvedValue({ fake: 'group' })
    mockExportPDF.mockResolvedValue('data:application/pdf;base64,fake')

    await exportElementToPdf(element, 'test.pdf')

    expect(mockDrawDOM).toHaveBeenCalledTimes(1)
    expect(mockExportPDF).toHaveBeenCalledWith({ fake: 'group' }, expect.objectContaining({ paperSize: 'auto' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('draws a clone, not the original element (so the live DOM is never mutated)', async () => {
    mockDrawDOM.mockResolvedValue({})
    mockExportPDF.mockResolvedValue('data:application/pdf;base64,fake')

    await exportElementToPdf(element, 'test.pdf')

    const [drawnNode] = mockDrawDOM.mock.calls[0]
    expect(drawnNode).not.toBe(element)
    expect(drawnNode.innerHTML).toBe(element.innerHTML)
  })

  it('removes the off-screen clone container from the document after success', async () => {
    mockDrawDOM.mockResolvedValue({})
    mockExportPDF.mockResolvedValue('data:application/pdf;base64,fake')

    const bodyChildrenBefore = document.body.children.length
    await exportElementToPdf(element, 'test.pdf')

    expect(document.body.children.length).toBe(bodyChildrenBefore)
  })

  it('removes the off-screen clone container even when drawDOM rejects, and propagates the error', async () => {
    mockDrawDOM.mockRejectedValue(new Error('draw failed'))

    const bodyChildrenBefore = document.body.children.length
    await expect(exportElementToPdf(element, 'test.pdf')).rejects.toThrow('draw failed')

    expect(document.body.children.length).toBe(bodyChildrenBefore)
    expect(mockExportPDF).not.toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('propagates an exportPDF failure too, without downloading a broken file (EF-2)', async () => {
    mockDrawDOM.mockResolvedValue({})
    mockExportPDF.mockRejectedValue(new Error('export failed'))

    await expect(exportElementToPdf(element, 'test.pdf')).rejects.toThrow('export failed')
    expect(clickSpy).not.toHaveBeenCalled()
  })

  describe('chartImage override (Supplier Match Coverage donut)', () => {
    beforeEach(() => {
      element.innerHTML = `
        <div class="wc-smc__donut-wrap">
          <div class="k-chart"><svg><path d="broken" /></svg></div>
          <div class="wc-smc__donut-center">42</div>
        </div>
      `
    })

    it('replaces the .k-chart node with an <img> of the given data URI before drawing', async () => {
      mockDrawDOM.mockResolvedValue({})
      mockExportPDF.mockResolvedValue('data:application/pdf;base64,fake')

      await exportElementToPdf(element, 'test.pdf', 'data:image/png;base64,fake')

      const [drawnNode] = mockDrawDOM.mock.calls[0] as [HTMLElement]
      expect(drawnNode.querySelector('.k-chart')).toBeNull()
      const img = drawnNode.querySelector('.wc-smc__donut-wrap img')
      expect(img).not.toBeNull()
      expect(img?.getAttribute('src')).toBe('data:image/png;base64,fake')
      // The center count overlay is a sibling of the chart, not touched.
      expect(drawnNode.querySelector('.wc-smc__donut-center')?.textContent).toBe('42')
    })

    it('leaves the clone unchanged when no chartImage is given (backward compatible)', async () => {
      mockDrawDOM.mockResolvedValue({})
      mockExportPDF.mockResolvedValue('data:application/pdf;base64,fake')

      await exportElementToPdf(element, 'test.pdf')

      const [drawnNode] = mockDrawDOM.mock.calls[0] as [HTMLElement]
      expect(drawnNode.querySelector('.k-chart')).not.toBeNull()
      expect(drawnNode.querySelector('img')).toBeNull()
    })

    it('does nothing if chartImage is given but no .k-chart node exists in the clone', async () => {
      element.innerHTML = '<span>content</span>'
      mockDrawDOM.mockResolvedValue({})
      mockExportPDF.mockResolvedValue('data:application/pdf;base64,fake')

      await expect(exportElementToPdf(element, 'test.pdf', 'data:image/png;base64,fake')).resolves.toBeUndefined()
    })
  })

  // AB#20132 — kendo's standard PDF fonts stop at U+00FF and drop anything above it
  // without erroring, which is how the terms arrow went missing from the export.
  describe('glyphs the PDF fonts cannot carry', () => {
    beforeEach(() => {
      mockDrawDOM.mockResolvedValue({})
      mockExportPDF.mockResolvedValue('data:application/pdf;base64,fake')
    })

    async function drawnText(html: string): Promise<string> {
      element.innerHTML = html
      await exportElementToPdf(element, 'test.pdf')
      const [drawnNode] = mockDrawDOM.mock.calls.at(-1) as [HTMLElement]
      return drawnNode.textContent ?? ''
    }

    it('substitutes the from-to arrow in every text node of the clone', async () => {
      const text = await drawnText(
        '<td>30 → 45</td><p>Dec 2022 → Dec 2023</p><span>72 → 94 weighted terms</span>'
      )
      expect(text).not.toContain('→')
      expect(text).toContain('30 » 45')
      expect(text).toContain('Dec 2022 » Dec 2023')
      expect(text).toContain('72 » 94 weighted terms')
    })

    it('substitutes dashes and leaves every Latin-1 character alone', async () => {
      const text = await drawnText('<span>a — b · c ó</span>')
      expect(text).toBe('a - b · c ó')
    })

    it('does not touch the live element, only the clone', async () => {
      await drawnText('<span>30 → 45</span>')
      expect(element.textContent).toBe('30 → 45')
    })
  })
})
