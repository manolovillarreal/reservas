<template>
  <div v-if="can('settings', 'edit')" class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Tarifas</h1>
        <p class="text-sm text-gray-500">Configura valores base y politicas globales de precio.</p>
      </div>
      <RouterLink to="/configuracion" class="btn-secondary text-sm">Volver a configuracion</RouterLink>
    </div>

    <div class="card">
      <AppInlineAlert
        type="info"
        message="Las tarifas generales se aplican a las unidades que no tengan tarifa propia configurada. Las politicas globales aplican a todas las unidades."
      />

      <form class="mt-4 space-y-6" @submit.prevent="saveSettings">
        <AppFormSection title="Tarifas generales" :divider="true" :collapsible="isMobile" :defaultOpen="true">
          <AppFormGrid :columns="2">
            <AppInput v-model="form.price_general_base" type="number" label="Precio base general" prefix="$" hint="Opcional" />
            <AppInput v-model="form.price_general_min" type="number" label="Precio minimo general" prefix="$" hint="Opcional" />
            <AppInput v-model="form.price_general_extra" type="number" label="Precio por persona adicional general" prefix="$" hint="Opcional" />
            <AppInput v-model="form.price_per_person_base" type="number" label="Precio por persona por noche" prefix="$" hint="Para cotizaciones sin unidad asignada" />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Politicas globales" :divider="true" :collapsible="isMobile" :defaultOpen="true">
          <AppFormGrid :columns="2">
            <AppInput
              v-model="form.anticipo_pct"
              type="number"
              label="Anticipo para cotización"
              suffix="%"
              hint="Se usa en la variable {{porcentaje_anticipo}} de mensajes"
            />
            <AppInput
              v-model="form.price_weekend_pct"
              type="number"
              label="Incremento fin de semana (vie-sab)"
              suffix="%"
              hint="Se aplica sobre el precio base de cada unidad los viernes y sabados"
            />
            <AppInput
              v-model="form.price_peak_pct"
              type="number"
              label="Incremento temporada pico"
              suffix="%"
              hint="Se aplica manualmente al activar precio pico en una reserva"
            />
            <AppInput
              v-model="form.price_child_pct"
              type="number"
              label="Precio nino en % del precio de persona adicional"
              suffix="%"
              hint="0% = ninos gratis · 100% = igual que adulto"
            />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Tarifas full house" :divider="false" :collapsible="isMobile" :defaultOpen="true">
          <AppFormGrid :columns="2">
            <AppInput v-model="form.price_full_house_min" type="number" label="Precio minimo full house" prefix="$" hint="Opcional" />
            <AppInput v-model="form.price_full_house_base" type="number" label="Precio base full house" prefix="$" hint="Opcional" />
            <AppInput
              v-model="form.price_full_house_peak"
              type="number"
              label="Precio pico full house"
              prefix="$"
              hint="Aplica cuando se reserva la propiedad completa como un solo bloque"
            />
          </AppFormGrid>
        </AppFormSection>

        <div :class="isMobile ? 'sticky bottom-0 z-20 -mx-4 border-t border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_-6px_18px_rgba(15,23,42,0.06)]' : ''">
          <AppFormActions
            submit-label="Guardar tarifas"
            cancel-label="Restablecer"
            :loading="saving || loading"
            :submit-disabled="saving || loading"
            @submit="saveSettings"
            @cancel="loadSettings"
          />
        </div>
      </form>
    </div>
  </div>

  <div v-else class="card border-amber-200 bg-amber-50/40">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
    <p class="mt-2 text-sm text-amber-800">No tienes permisos para editar las tarifas.</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import {
  AppInput,
  AppFormSection,
  AppFormGrid,
  AppFormActions,
  AppInlineAlert,
} from '@/components/ui/forms'

const accountStore = useAccountStore()
const { can } = usePermissions()
const toast = useToast()
const { isMobile } = useBreakpoint()

const loading = ref(false)
const saving = ref(false)

const buildEmpty = () => ({
  price_general_base: '',
  price_general_min: '',
  price_general_extra: '',
  price_per_person_base: '',
  anticipo_pct: '50',
  price_weekend_pct: '',
  price_peak_pct: '',
  price_child_pct: '50',
  price_full_house_min: '',
  price_full_house_base: '',
  price_full_house_peak: '',
})

const form = ref(buildEmpty())

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  if (Number.isNaN(number)) return null
  return number
}

const loadSettings = async () => {
  if (!can('settings', 'edit')) return

  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('settings')
      .select('price_general_base, price_general_min, price_general_extra, price_per_person_base, anticipo_pct, price_weekend_pct, price_peak_pct, price_child_pct, price_full_house_min, price_full_house_base, price_full_house_peak')
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) throw error

    form.value = {
      price_general_base: data?.price_general_base ?? '',
      price_general_min: data?.price_general_min ?? '',
      price_general_extra: data?.price_general_extra ?? '',
      price_per_person_base: data?.price_per_person_base ?? '',
      anticipo_pct: data?.anticipo_pct ?? 50,
      price_weekend_pct: data?.price_weekend_pct ?? '',
      price_peak_pct: data?.price_peak_pct ?? '',
      price_child_pct: data?.price_child_pct ?? 50,
      price_full_house_min: data?.price_full_house_min ?? '',
      price_full_house_base: data?.price_full_house_base ?? '',
      price_full_house_peak: data?.price_full_house_peak ?? '',
    }
  } catch (err) {
    toast.error(err.message || 'No se pudo cargar la configuracion de tarifas.')
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  if (!can('settings', 'edit')) return

  saving.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const payload = {
      account_id: accountId,
      price_general_base: toNumberOrNull(form.value.price_general_base),
      price_general_min: toNumberOrNull(form.value.price_general_min),
      price_general_extra: toNumberOrNull(form.value.price_general_extra),
      price_per_person_base: toNumberOrNull(form.value.price_per_person_base),
      anticipo_pct: toNumberOrNull(form.value.anticipo_pct) ?? 50,
      price_weekend_pct: toNumberOrNull(form.value.price_weekend_pct),
      price_peak_pct: toNumberOrNull(form.value.price_peak_pct),
      price_child_pct: toNumberOrNull(form.value.price_child_pct) ?? 50,
      price_full_house_min: toNumberOrNull(form.value.price_full_house_min),
      price_full_house_base: toNumberOrNull(form.value.price_full_house_base),
      price_full_house_peak: toNumberOrNull(form.value.price_full_house_peak),
    }

    const { error } = await supabase
      .from('settings')
      .upsert(payload, { onConflict: 'account_id' })

    if (error) throw error
    toast.success('Tarifas guardadas correctamente.')
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar la configuracion de tarifas.')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>
