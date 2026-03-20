import { ref, computed } from 'vue'

export function useViewMode(viewKey) {
  const STORAGE_KEY = `tekmi_view_${viewKey}`

  const savedMode = localStorage.getItem(STORAGE_KEY)
  const viewMode = ref(savedMode || 'table')

  function setViewMode(mode) {
    viewMode.value = mode
    localStorage.setItem(STORAGE_KEY, mode)
  }

  function toggleViewMode() {
    setViewMode(viewMode.value === 'table' ? 'cards' : 'table')
  }

  const isTable = computed(() => viewMode.value === 'table')
  const isCards = computed(() => viewMode.value === 'cards')

  return {
    viewMode,
    isTable,
    isCards,
    setViewMode,
    toggleViewMode
  }
}
