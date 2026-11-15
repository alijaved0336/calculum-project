import { ref, onMounted, onUnmounted, nextTick } from 'vue'

export interface StickyHeaderOptions {
  offset?: number
  className?: string
  stickyClassName?: string
  scrollContainer?: string | HTMLElement
}

export function useStickyHeaders(options: StickyHeaderOptions = {}) {
  const {
    offset = 0,
    className = 'sticky-header',
    stickyClassName = 'sticky-active',
    scrollContainer = null
  } = options

  const stickyHeaders = ref<HTMLElement[]>([])
  const isScrolling = ref(false)
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null
  let containerElement: HTMLElement | null = null

  const updateStickyHeaders = () => {

    if (!stickyHeaders.value.length) return

    // Obtener el contenedor de scroll
    const scrollContainer = containerElement || globalThis
    let activeStickyIndex = -1

    for (let i = 0; i < stickyHeaders.value.length; i++) {
      const header = stickyHeaders.value[i]
      const rect = header.getBoundingClientRect()
      const nextHeader = stickyHeaders.value[i + 1]

      const containerRect = scrollContainer === globalThis 
        ? { top: 0, left: 0 }
        : (scrollContainer as HTMLElement).getBoundingClientRect()
      
      const relativeTop = rect.top - containerRect.top
      const relativeBottom = rect.bottom - containerRect.top

      const isInViewport = relativeTop <= offset && relativeBottom > offset

      const nextHeaderInViewport = nextHeader ? 
        (nextHeader.getBoundingClientRect().top - containerRect.top) <= offset + rect.height : false

      if (isInViewport && !nextHeaderInViewport) {
        activeStickyIndex = i
        break
      }
    }

    stickyHeaders.value.forEach((header, index) => {
      if (index === activeStickyIndex) {
        header.classList.add(stickyClassName)
        header.style.position = 'sticky'
        header.style.top = Number(offset) + 'px'
        header.style.zIndex = '100'
      } else {
        header.classList.remove(stickyClassName)
        header.style.position = ''
        header.style.top = ''
        header.style.zIndex = ''
      }
    })
  }

  const handleScroll = () => {
    isScrolling.value = true
    
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    requestAnimationFrame(() => {
      updateStickyHeaders()
    })

    scrollTimeout = globalThis.setTimeout(() => {
      isScrolling.value = false
    }, 100)
  }

  const initializeContainer = () => {
    if (scrollContainer) {
      if (typeof scrollContainer === 'string') {
        containerElement = document.querySelector(scrollContainer)
      } else {
        containerElement = scrollContainer
      }
    }
  }

  const registerHeader = (element: HTMLElement) => {
    if (!stickyHeaders.value.includes(element)) {
      stickyHeaders.value.push(element)
      element.classList.add(className)
    }
  }

  const unregisterHeader = (element: HTMLElement) => {
    const index = stickyHeaders.value.indexOf(element)
    if (index > -1) {
      stickyHeaders.value.splice(index, 1)
      element.classList.remove(className, stickyClassName)
      element.style.position = ''
      element.style.top = ''
      element.style.zIndex = ''
    }
  }

  const refreshHeaders = () => {
    nextTick(() => {
      updateStickyHeaders()
    })
  }

  onMounted(() => {
    nextTick(() => {
      initializeContainer()
      
      const targetElement = containerElement || globalThis
      targetElement.addEventListener('scroll', handleScroll, { passive: true })
      globalThis.addEventListener('resize', updateStickyHeaders, { passive: true })
      updateStickyHeaders()
    })
  })

  onUnmounted(() => {
    const targetElement = containerElement || globalThis
    targetElement.removeEventListener('scroll', handleScroll)
    globalThis.removeEventListener('resize', updateStickyHeaders)
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  })

  return {
    registerHeader,
    unregisterHeader,
    refreshHeaders,
    isScrolling,
    stickyHeaders
  }
}

// Apply/remove the sticky class + inline positioning across a group of elements
// (titles or subtitles), returning the height of whichever element became sticky.
function applyStickyOffsets(
  elements: NodeListOf<HTMLElement>,
  containerRect: DOMRect,
  offset: number,
  stickyClass: string,
  zIndex: string
): number {
  let stickyHeight = 0;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const next = elements[i + 1];
    const offsetTop = el.getBoundingClientRect().top - containerRect.top;
    const nextOffsetTop = next ? next.getBoundingClientRect().top - containerRect.top : null;
    const isSticky = offsetTop <= offset && (nextOffsetTop === null || nextOffsetTop > offset);

    if (isSticky) {
      el.classList.add(stickyClass);
      stickyHeight = el.offsetHeight;
      el.style.position = 'sticky';
      el.style.top = offset + 'px';
      el.style.zIndex = zIndex;
    } else {
      el.classList.remove(stickyClass);
      el.style.position = '';
      el.style.top = '';
      el.style.zIndex = '';
    }
  }

  return stickyHeight;
}

export function refreshAllStickyHeaders(
  titleOffset = 0,
  subtitleOffset = null,
  stickyTitleClass = 'sticky-active-title',
  stickySubtitleClass = 'sticky-active-subtitle',
  scrollContainerSelector = '.content-section'
) {
  const container = document.querySelector(scrollContainerSelector) as HTMLElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();

  // Sticky para títulos
  const titleElements = container.querySelectorAll('.sticky-title') as NodeListOf<HTMLElement>;
  const stickyTitleHeight = applyStickyOffsets(titleElements, containerRect, titleOffset, stickyTitleClass, '100');

  // Sticky para subtítulos (si no se pasa subtitleOffset, usar la altura del título sticky)
  const subtitleElements = container.querySelectorAll('.sticky-subtitle') as NodeListOf<HTMLElement>;
  const effectiveSubtitleOffset = subtitleOffset ?? stickyTitleHeight;
  applyStickyOffsets(subtitleElements, containerRect, effectiveSubtitleOffset, stickySubtitleClass, '99');
}

export function initStickyScrollListener({
  offset = 0,
  subtitleOffset = null,
  stickyTitleClass = 'sticky-active-title',
  stickySubtitleClass = 'sticky-active-subtitle',
  scrollContainerSelector = '.content-section'
} = {}) {
  const container = document.querySelector(scrollContainerSelector) as HTMLElement;
  console.log('Sticky container:', container);
  if (!container) return;
  const handler = () => refreshAllStickyHeaders(
    offset,
    subtitleOffset,
    stickyTitleClass,
    stickySubtitleClass,
    scrollContainerSelector
  );
  container.addEventListener('scroll', handler, { passive: true });
  globalThis.addEventListener('resize', handler, { passive: true });
  // Llama una vez al inicio
  nextTick(() => handler());
  return () => {
    container.removeEventListener('scroll', handler);
    globalThis.removeEventListener('resize', handler);
  };
} 