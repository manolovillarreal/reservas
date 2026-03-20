import { computed, onMounted, onUnmounted, ref } from 'vue'

const breakpoints = {
  mobile: 640,
  tablet: 1024,
}

const RESIZE_DEBOUNCE_MS = 120

export function useBreakpoint() {
  const width = ref(typeof window === 'undefined' ? breakpoints.tablet : window.innerWidth)
  let resizeTimer = null

  const updateWidth = () => {
    if (typeof window === 'undefined') return
    width.value = window.innerWidth
  }

  const onResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }

    resizeTimer = setTimeout(() => {
      updateWidth()
      resizeTimer = null
    }, RESIZE_DEBOUNCE_MS)
  }

  onMounted(() => {
    updateWidth()
    window.addEventListener('resize', onResize, { passive: true })
  })

  onUnmounted(() => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
      resizeTimer = null
    }
    window.removeEventListener('resize', onResize)
  })

  const isMobile = computed(() => width.value < breakpoints.mobile)
  const isTablet = computed(() => width.value >= breakpoints.mobile && width.value < breakpoints.tablet)
  const isDesktop = computed(() => width.value >= breakpoints.tablet)

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
  }
}
