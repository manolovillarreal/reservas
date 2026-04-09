<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/configuracion" class="text-gray-400 hover:text-gray-600">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Operación</h1>
    </div>

    <div v-if="!can('settings', 'edit')" class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
      <p class="mt-2 text-sm text-amber-800">No tienes permisos para editar la configuración.</p>
    </div>

    <template v-else>
      <!-- Pre-registro -->
      <div class="card">
        <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Pre-registro</h2>
        <p class="mb-4 text-xs text-gray-400">Controla cuándo es obligatorio que el huésped complete el pre-registro antes de avanzar en el flujo.</p>

        <div class="divide-y divide-gray-100 rounded-md border border-gray-200">
          <div class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-800">Permitir check-in sin pre-registro</p>
              <p class="text-xs text-gray-500">Si está desactivado, el check-in no se podrá registrar si el huésped no completó el pre-registro.</p>
            </div>
            <button
              type="button"
              :disabled="saving"
              class="relative ml-4 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50"
              :class="form.allow_checkin_without_preregistro ? 'bg-indigo-600' : 'bg-gray-200'"
              @click="toggle('allow_checkin_without_preregistro')"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform"
                :class="form.allow_checkin_without_preregistro ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-800">Permitir check-out sin pre-registro</p>
              <p class="text-xs text-gray-500">Si está desactivado, el check-out no se podrá registrar si el huésped no completó el pre-registro.</p>
            </div>
            <button
              type="button"
              :disabled="saving"
              class="relative ml-4 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50"
              :class="form.allow_checkout_without_preregistro ? 'bg-indigo-600' : 'bg-gray-200'"
              @click="toggle('allow_checkout_without_preregistro')"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform"
                :class="form.allow_checkout_without_preregistro ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Fechas -->
      <div class="card">
        <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Fechas</h2>
        <p class="mb-4 text-xs text-gray-400">Controla cómo se comportan los selectores de fecha en los formularios.</p>

        <div class="divide-y divide-gray-100 rounded-md border border-gray-200">
          <div class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-800">Permitir seleccionar fechas anteriores</p>
              <p class="text-xs text-gray-500">Si está desactivado, no se podrán elegir fechas pasadas en los selectores de fecha.</p>
            </div>
            <button
              type="button"
              :disabled="saving"
              class="relative ml-4 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50"
              :class="form.allow_past_dates_in_pickers ? 'bg-indigo-600' : 'bg-gray-200'"
              @click="toggle('allow_past_dates_in_pickers')"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform"
                :class="form.allow_past_dates_in_pickers ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>

        <p v-if="saveError" class="mt-3 text-xs text-red-600">{{ saveError }}</p>
        <p v-if="saveOk" class="mt-3 text-xs text-emerald-600">Guardado correctamente.</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'

const accountStore = useAccountStore()
const { can } = usePermissions()

const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)

const form = ref({
  allow_checkin_without_preregistro: true,
  allow_checkout_without_preregistro: true,
  allow_past_dates_in_pickers: true,
})

const load = async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data } = await supabase
      .from('settings')
      .select('allow_checkin_without_preregistro, allow_checkout_without_preregistro, allow_past_dates_in_pickers')
      .eq('account_id', accountId)
      .maybeSingle()

    if (data) {
      form.value.allow_checkin_without_preregistro = data.allow_checkin_without_preregistro ?? true
      form.value.allow_checkout_without_preregistro = data.allow_checkout_without_preregistro ?? true
      form.value.allow_past_dates_in_pickers = data.allow_past_dates_in_pickers ?? true
    }
  } catch (e) {
    console.warn('[OperationalSettings] load failed:', e?.message)
  }
}

const save = async () => {
  saving.value = true
  saveError.value = ''
  saveOk.value = false
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { error } = await supabase
      .from('settings')
      .update({
        allow_checkin_without_preregistro: form.value.allow_checkin_without_preregistro,
        allow_checkout_without_preregistro: form.value.allow_checkout_without_preregistro,
        allow_past_dates_in_pickers: form.value.allow_past_dates_in_pickers,
      })
      .eq('account_id', accountId)

    if (error) throw error
    saveOk.value = true
    setTimeout(() => { saveOk.value = false }, 2500)
  } catch (e) {
    saveError.value = e?.message || 'No se pudo guardar.'
  } finally {
    saving.value = false
  }
}

const toggle = async (key) => {
  form.value[key] = !form.value[key]
  await save()
}

onMounted(load)
</script>
