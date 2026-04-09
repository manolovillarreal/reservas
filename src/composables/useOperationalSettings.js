import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'

// Caché en módulo — se carga una sola vez por sesión
const _loaded = ref(false)
const _loading = ref(false)
const _settings = ref({
  allow_checkin_without_preregistro: true,
  allow_checkout_without_preregistro: true,
  allow_past_dates_in_pickers: true,
})

export function useOperationalSettings() {
  const accountStore = useAccountStore()

  const load = async () => {
    if (_loaded.value || _loading.value) return
    _loading.value = true
    try {
      const accountId = accountStore.getRequiredAccountId()
      const { data } = await supabase
        .from('settings')
        .select('allow_checkin_without_preregistro, allow_checkout_without_preregistro, allow_past_dates_in_pickers')
        .eq('account_id', accountId)
        .maybeSingle()

      if (data) {
        _settings.value.allow_checkin_without_preregistro = data.allow_checkin_without_preregistro ?? true
        _settings.value.allow_checkout_without_preregistro = data.allow_checkout_without_preregistro ?? true
        _settings.value.allow_past_dates_in_pickers = data.allow_past_dates_in_pickers ?? true
      }
      _loaded.value = true
    } catch (e) {
      console.warn('[useOperationalSettings] load failed:', e?.message)
    } finally {
      _loading.value = false
    }
  }

  return {
    operationalSettings: _settings,
    loadOperationalSettings: load,
  }
}
