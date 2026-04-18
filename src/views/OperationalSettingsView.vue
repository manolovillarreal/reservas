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
      <!-- Horarios -->
      <div class="card">
        <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Horarios</h2>
        <p class="mb-4 text-xs text-gray-400">Define los horarios operativos del alojamiento.</p>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <AppInput
              v-model="form.checkin_time"
              label="Hora de check-in"
              placeholder="3:00 PM"
              @blur="save"
            />
            <AppFieldHint message="Hora en que los huéspedes pueden ingresar al alojamiento" />
          </div>

          <div>
            <AppInput
              v-model="form.checkout_time"
              label="Hora de check-out"
              placeholder="12:00 PM"
              @blur="save"
            />
            <AppFieldHint message="Hora límite de salida" />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Anticipo</h2>
        <p class="mb-4 text-xs text-gray-400">Configura el porcentaje base que se solicita para confirmar una reserva.</p>

        <div class="md:max-w-sm">
          <AppInput
            v-model="form.anticipo_pct"
            type="number"
            min="0"
            max="100"
            label="Porcentaje de anticipo"
            placeholder="50"
            @blur="save"
          />
          <AppFieldHint message="Porcentaje del total que se solicita como anticipo para confirmar la reserva" />
        </div>
      </div>

      <div class="card">
        <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Políticas</h2>
        <p class="mb-4 text-xs text-gray-400">Administra las condiciones operativas que aparecen en vouchers y cotizaciones.</p>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-800">Condiciones del alojamiento</label>
            <textarea
              v-model="form.voucher_conditions"
              rows="12"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="Escribe aquí las condiciones del alojamiento..."
              @blur="save"
            ></textarea>
          </div>

          <div>
            <AppTextarea
              v-model="form.politica_reserva"
              label="Políticas de reserva"
              :rows="12"
              :autoResize="true"
              placeholder="Escribe aquí las políticas de reserva..."
              @blur="save"
            />
            <AppFieldHint message="Aparece después de las condiciones en los documentos de cotización y voucher" />
          </div>
        </div>
      </div>
    
      <!-- Categorías de edad -->
      <div class="card">
        <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Categorías de edad</h2>
        <p class="mb-4 text-xs text-gray-400">Define los rangos de edad para cada categoría de huéspedes. Los porcentajes de precio se configuran en Tarifas.</p>

        <div class="space-y-4">
          <!-- Menores -->
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-800">Menores</p>
                <p class="text-xs text-gray-500">Rango superior fijo: hasta 17 años.</p>
              </div>
              <button
                type="button"
                :disabled="ageSaving"
                class="relative ml-4 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50"
                :class="ageForm.minors_active ? 'bg-indigo-600' : 'bg-gray-200'"
                @click="ageForm.minors_active = !ageForm.minors_active; saveAgeSettings()"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform"
                  :class="ageForm.minors_active ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
            <div v-if="ageForm.minors_active" class="flex items-center gap-4">
              <div class="flex flex-1 items-center gap-2">
                <label class="text-xs text-gray-500 whitespace-nowrap">Edad mínima</label>
                <input
                  v-model.number="ageForm.minors_min_age"
                  type="number"
                  min="1"
                  max="17"
                  class="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  @change="saveAgeSettings"
                />
              </div>
            </div>
          </div>

          <!-- Niños -->
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-800">Niños</p>
                <p class="text-xs text-gray-500">Categoría intermedia entre bebés y menores.</p>
              </div>
              <button
                type="button"
                :disabled="ageSaving"
                class="relative ml-4 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50"
                :class="ageForm.children_active ? 'bg-indigo-600' : 'bg-gray-200'"
                @click="ageForm.children_active = !ageForm.children_active; saveAgeSettings()"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform"
                  :class="ageForm.children_active ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
            <div v-if="ageForm.children_active" class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500 whitespace-nowrap">Edad mínima</label>
                <input
                  v-model.number="ageForm.children_min_age"
                  type="number"
                  min="0"
                  max="17"
                  class="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  @change="saveAgeSettings"
                />
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500 whitespace-nowrap">Edad máxima</label>
                <input
                  v-model.number="ageForm.children_max_age"
                  type="number"
                  min="0"
                  max="17"
                  class="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  @change="saveAgeSettings"
                />
              </div>
            </div>
          </div>

          <!-- Bebés -->
          <div class="rounded-lg border border-gray-200 p-4">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-800">Bebés</p>
                <p class="text-xs text-gray-500">Rango inferior fijo: desde 0 años.</p>
              </div>
              <button
                type="button"
                :disabled="ageSaving"
                class="relative ml-4 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50"
                :class="ageForm.infants_active ? 'bg-indigo-600' : 'bg-gray-200'"
                @click="ageForm.infants_active = !ageForm.infants_active; saveAgeSettings()"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform"
                  :class="ageForm.infants_active ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
            <div v-if="ageForm.infants_active" class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500 whitespace-nowrap">Edad máxima</label>
                <input
                  v-model.number="ageForm.infants_max_age"
                  type="number"
                  min="0"
                  max="10"
                  class="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  @change="saveAgeSettings"
                />
              </div>
            </div>
          </div>
        </div>

        <p v-if="ageSaveError" class="mt-3 text-xs text-red-600">{{ ageSaveError }}</p>
        <p v-if="ageSaveOk" class="mt-3 text-xs text-emerald-600">Rangos guardados correctamente.</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { getAgeCategorySettings, saveAgeCategorySettings } from '../services/ageRangeService'
import { AppInput, AppFieldHint, AppTextarea } from '@/components/ui/forms'

const accountStore = useAccountStore()
const { can } = usePermissions()

const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)

const form = ref({
  allow_checkin_without_preregistro: true,
  allow_checkout_without_preregistro: true,
  allow_past_dates_in_pickers: true,
  checkin_time: '3:00 PM',
  checkout_time: '12:00 PM',
  anticipo_pct: 50,
  voucher_conditions: '',
  politica_reserva: '',
})

const load = async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const [{ data }, { data: profileData }] = await Promise.all([
      supabase
        .from('settings')
        .select('allow_checkin_without_preregistro, allow_checkout_without_preregistro, allow_past_dates_in_pickers, anticipo_pct, voucher_conditions')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('account_profile')
        .select('checkin_time, checkout_time, anticipo_pct, politica_reserva')
        .eq('account_id', accountId)
        .maybeSingle(),
    ])

    if (data) {
      form.value.allow_checkin_without_preregistro = data.allow_checkin_without_preregistro ?? true
      form.value.allow_checkout_without_preregistro = data.allow_checkout_without_preregistro ?? true
      form.value.allow_past_dates_in_pickers = data.allow_past_dates_in_pickers ?? true
      form.value.anticipo_pct = data.anticipo_pct ?? form.value.anticipo_pct
      form.value.voucher_conditions = data.voucher_conditions || ''
    }

    if (profileData) {
      form.value.checkin_time = profileData.checkin_time || '3:00 PM'
      form.value.checkout_time = profileData.checkout_time || '12:00 PM'
      form.value.anticipo_pct = profileData.anticipo_pct ?? form.value.anticipo_pct
      form.value.politica_reserva = profileData.politica_reserva || ''
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
    const anticipoPct = Math.min(100, Math.max(0, Number(form.value.anticipo_pct || 50)))

    const { error } = await supabase
      .from('settings')
      .update({
        allow_checkin_without_preregistro: form.value.allow_checkin_without_preregistro,
        allow_checkout_without_preregistro: form.value.allow_checkout_without_preregistro,
        allow_past_dates_in_pickers: form.value.allow_past_dates_in_pickers,
        anticipo_pct: anticipoPct,
        voucher_conditions: String(form.value.voucher_conditions || '').trim(),
      })
      .eq('account_id', accountId)

    if (error) throw error

    const { error: profileError } = await supabase
      .from('account_profile')
      .upsert({
        account_id: accountId,
        checkin_time: String(form.value.checkin_time || '').trim() || '3:00 PM',
        checkout_time: String(form.value.checkout_time || '').trim() || '12:00 PM',
        anticipo_pct: anticipoPct,
        politica_reserva: String(form.value.politica_reserva || '').trim() || null,
      }, { onConflict: 'account_id' })

    if (profileError) throw profileError
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

// Age category settings
const ageSaving = ref(false)
const ageSaveError = ref('')
const ageSaveOk = ref(false)

const ageForm = ref({
  minors_active: true,
  minors_min_age: 10,
  children_active: true,
  children_min_age: 2,
  children_max_age: 9,
  infants_active: true,
  infants_max_age: 1,
})

const loadAgeSettings = async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const data = await getAgeCategorySettings(accountId)
    ageForm.value.minors_active = data.minors_active ?? true
    ageForm.value.minors_min_age = data.minors_min_age ?? 10
    ageForm.value.children_active = data.children_active ?? true
    ageForm.value.children_min_age = data.children_min_age ?? 2
    ageForm.value.children_max_age = data.children_max_age ?? 9
    ageForm.value.infants_active = data.infants_active ?? true
    ageForm.value.infants_max_age = data.infants_max_age ?? 1
  } catch (e) {
    console.warn('[OperationalSettings] loadAgeSettings failed:', e?.message)
  }
}

const saveAgeSettings = async () => {
  ageSaving.value = true
  ageSaveError.value = ''
  ageSaveOk.value = false
  try {
    const accountId = accountStore.getRequiredAccountId()
    await saveAgeCategorySettings(accountId, {
      ...ageForm.value,
      minors_price_pct: 80,
      children_price_pct: 60,
      infants_price_pct: 0,
    })
    ageSaveOk.value = true
    setTimeout(() => { ageSaveOk.value = false }, 2500)
  } catch (e) {
    ageSaveError.value = e?.message || 'No se pudo guardar.'
  } finally {
    ageSaving.value = false
  }
}

onMounted(() => {
  load()
  loadAgeSettings()
})
</script>
