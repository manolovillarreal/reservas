import { ref, computed } from 'vue'
import { useAccountStore } from '../stores/account'
import { getAgeCategorySettings, getAgeRangeLabels } from '../services/ageRangeService'

// Caché en módulo — se carga una sola vez por sesión
const _loaded = ref(false)
const _loading = ref(false)
const _settings = ref({
  minors_active: true,
  minors_min_age: 10,
  minors_price_pct: 80,
  children_active: true,
  children_min_age: 2,
  children_max_age: 9,
  children_price_pct: 60,
  infants_active: true,
  infants_max_age: 1,
  infants_price_pct: 0,
})

export function useAgeCategorySettings() {
  const accountStore = useAccountStore()

  const load = async () => {
    if (_loaded.value || _loading.value) return
    _loading.value = true
    try {
      const accountId = accountStore.getRequiredAccountId()
      const data = await getAgeCategorySettings(accountId)
      if (data) {
        Object.assign(_settings.value, data)
      }
      _loaded.value = true
    } catch (e) {
      console.warn('[useAgeCategorySettings] load failed:', e?.message)
    } finally {
      _loading.value = false
    }
  }

  const activeCategories = computed(() => {
    const cats = []
    if (_settings.value.minors_active) cats.push('minors')
    if (_settings.value.children_active) cats.push('children')
    if (_settings.value.infants_active) cats.push('infants')
    return cats
  })

  const labels = computed(() => getAgeRangeLabels(_settings.value))

  return {
    ageCategorySettings: _settings,
    loadAgeCategorySettings: load,
    activeCategories,
    ageCategoryLabels: labels,
  }
}
