<template>
  <div class="p-3 sm:p-6 max-w-3xl mx-auto">
    <div class="mb-6 flex items-center gap-3">
      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[#6B7280] hover:text-[#111827] transition-colors"
        title="Volver"
        @click="router.back()"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true">
          <path d="M13 16l-5-6 5-6" />
        </svg>
      </button>
      <h1 class="text-2xl font-semibold text-gray-900">Editar consulta</h1>
    </div>

    <div v-if="loading" class="card py-10 text-center text-gray-500">Cargando consulta...</div>

    <div v-else-if="!inquiry" class="card py-10 text-center">
      <h2 class="text-lg font-semibold text-gray-900">Consulta no encontrada</h2>
      <p class="mt-2 text-sm text-gray-500">La URL puede ser inválida o la consulta fue eliminada.</p>
    </div>

    <form v-else class="space-y-5" @submit.prevent="submitEdit">
      <p class="font-mono text-xs text-gray-400">{{ inquiry.inquiry_number || '' }}</p>

      <AppFormSection title="Solicitante" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppFormGrid :columns="2">
          <AppInput
            v-model="form.guest_first_name"
            label="Nombres"
            required
            :error="fieldError('guest_first_name')"
            @blur="touchField('guest_first_name')"
          />
          <AppInput v-model="form.guest_last_name" label="Apellidos" hint="Opcional" />
        </AppFormGrid>
        <AppFormGrid :columns="2">
          <AppPhoneInput
            :countryCode="form.guest_phone_country_code"
            :phoneNumber="form.guest_phone"
            label="Teléfono"
            hint="Opcional"
            @update:countryCode="form.guest_phone_country_code = $event"
            @update:phoneNumber="form.guest_phone = $event"
          />
          <AppInput
            v-model="form.guest_email"
            label="Email"
            type="email"
            hint="Opcional"
          />
        </AppFormGrid>
      </AppFormSection>

      <AppFormSection title="Fechas y unidad" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppFormGrid :columns="2">
          <AppDatePicker v-model="form.check_in" label="Check-in" hint="Opcional" />
          <AppDatePicker v-model="form.check_out" label="Check-out" hint="Opcional" />
        </AppFormGrid>
        <p v-if="nights > 0" class="text-sm text-[#6B7280]">{{ nights }} noches</p>

        <AppFieldGroup title="¿Qué unidades te interesan?" subtitle="Opcional" :compact="true" :border="true">
          <div class="max-h-40 space-y-1 overflow-y-auto">
            <p v-if="units.length === 0" class="text-sm text-gray-500">No hay unidades activas.</p>
            <label v-for="unit in units" :key="unit.id" class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-white">
              <input type="checkbox" :value="unit.id" v-model="form.unit_ids" class="rounded border-gray-300">
              <span>{{ unit.name }}<span v-if="venueNameById(unit.venue_id)" class="text-gray-400"> · {{ venueNameById(unit.venue_id) }}</span></span>
            </label>
          </div>
        </AppFieldGroup>
      </AppFormSection>

      <AppFormSection title="Personas" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppFormGrid :columns="2">
          <AppCounter v-model="form.adults" label="Adultos" :min="1" :max="20" />
          <AppCounter v-if="activeCategories.includes('minors')" v-model="form.minors" :label="ageCategoryLabels.minors" :min="0" :max="20" />
          <AppCounter v-if="activeCategories.includes('children')" v-model="form.children" :label="ageCategoryLabels.children" :min="0" :max="20" />
          <AppCounter v-if="activeCategories.includes('infants')" v-model="form.infants" :label="ageCategoryLabels.infants" :min="0" :max="20" />
        </AppFormGrid>
        <p class="text-sm text-[#6B7280]">Total: <strong class="text-[#111827]">{{ Number(form.adults || 0) + Number(form.minors || 0) + Number(form.children || 0) + Number(form.infants || 0) }}</strong></p>
      </AppFormSection>

      <AppFormSection title="Cotización" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppInput v-model="form.price_per_night" type="number" label="Precio por noche" prefix="$" hint="Opcional" />
        <AppFormGrid :columns="2">
          <AppInput v-model="form.discount_percentage" type="number" label="Descuento" suffix="%" hint="Opcional" />
          <AppInput v-model="form.commission_percentage" type="number" label="Comisión" suffix="%" hint="Opcional" />
        </AppFormGrid>
        <AppDatePicker v-model="form.quote_expires_at" label="Cotización válida hasta" hint="Opcional" />
        <PricingCalculatorPanel
          :checkIn="form.check_in"
          :checkOut="form.check_out"
          :pricePerNight="Number(form.price_per_night || 0)"
          :discountPercentage="Number(form.discount_percentage || 0)"
          :commissionPercentage="Number(form.commission_percentage || 0)"
          :units="form.unit_ids || []"
          :adults="Number(form.adults || 1)"
          :minors="Number(form.minors || 0)"
          :children="Number(form.children || 0)"
          :infants="Number(form.infants || 0)"
        />
      </AppFormSection>

      <AppFormSection title="Origen" :divider="true" :collapsible="true" :defaultOpen="false">
        <AppFieldGroup title="Canal de origen" :border="false" :compact="true">
          <SourceSelector
            :modelValue="{ sourceTypeId: form.source_type_id, sourceDetailId: form.source_detail_id, sourceName: form.source_name }"
            @update:modelValue="updateSourceSelection"
            @suggestions="applySourceSuggestions"
          />
        </AppFieldGroup>
      </AppFormSection>

      <AppFormSection title="Notas" :divider="false" :collapsible="true" :defaultOpen="false">
        <AppTextarea v-model="form.notes" label="Notas" :rows="2" :autoResize="true" />
      </AppFormSection>

      <AppInlineAlert v-if="saveError" type="error" :message="saveError" />

      <AppFormActions
        submit-label="Actualizar consulta"
        cancel-label="Cancelar"
        :loading="saving"
        :submit-disabled="saving"
        @submit="submitEdit"
        @cancel="router.back()"
      />
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useInquiriesStore } from '../stores/inquiries'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { useAgeCategorySettings } from '../composables/useAgeCategorySettings'
import SourceSelector from '../components/sources/SourceSelector.vue'
import {
  AppInput,
  AppPhoneInput,
  AppTextarea,
  AppDatePicker,
  AppCounter,
  AppFieldGroup,
  AppFormSection,
  AppFormActions,
  AppInlineAlert,
  AppFormGrid,
  PricingCalculatorPanel
} from '@/components/ui/forms'

const route = useRoute()
const router = useRouter()
const store = useInquiriesStore()
const accountStore = useAccountStore()
const toast = useToast()
const { loadAgeCategorySettings, activeCategories, ageCategoryLabels } = useAgeCategorySettings()

const loading = ref(true)
const saving = ref(false)
const saveError = ref('')
const inquiry = ref(null)
const units = ref([])
const venues = ref([])
const submitAttempted = ref(false)
const touched = reactive({ guest_first_name: false })

const form = ref({
  guest_first_name: '',
  guest_last_name: '',
  guest_phone: '',
  guest_phone_country_code: '+57',
  guest_email: '',
  check_in: '',
  check_out: '',
  adults: 1,
  minors: 0,
  children: 0,
  infants: 0,
  unit_ids: [],
  price_per_night: '',
  quote_expires_at: '',
  commission_percentage: '',
  discount_percentage: '',
  source_type_id: '',
  source_detail_id: '',
  source_name: '',
  notes: ''
})

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const start = new Date(form.value.check_in)
  const end = new Date(form.value.check_out)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const touchField = (field) => { touched[field] = true }

const fieldError = (field) => {
  if (!touched[field] && !submitAttempted.value) return ''
  if (field === 'guest_first_name' && !form.value.guest_first_name?.trim()) {
    return 'El nombre del huésped es obligatorio.'
  }
  return ''
}

const venueNameById = (venueId) => venues.value.find(v => v.id === venueId)?.name || ''

const updateSourceSelection = (value) => {
  form.value.source_type_id = value?.sourceTypeId || ''
  form.value.source_detail_id = value?.sourceDetailId || ''
  form.value.source_name = value?.sourceName || ''
}

const applySourceSuggestions = (payload) => {
  if (form.value.commission_percentage === '' || form.value.commission_percentage == null) form.value.commission_percentage = Number(payload.commissionPercentage || 0)
  if (form.value.discount_percentage === '' || form.value.discount_percentage == null) form.value.discount_percentage = Number(payload.discountPercentage || 0)
}

const hydrateForm = (inq) => {
  form.value = {
    guest_first_name: inq.guest_first_name || '',
    guest_last_name: inq.guest_last_name || '',
    guest_phone: inq.guest_phone || '',
    guest_phone_country_code: inq.phone_country_code || '+57',
    guest_email: inq.guest_email || '',
    check_in: inq.check_in || '',
    check_out: inq.check_out || '',
    adults: inq.adults ?? 1,
    minors: inq.minors ?? 0,
    children: inq.children ?? 0,
    infants: inq.infants ?? 0,
    unit_ids: [...(inq.inquiry_units?.map(u => u.unit_id) || [])],
    price_per_night: inq.price_per_night ?? '',
    quote_expires_at: inq.quote_expires_at ? inq.quote_expires_at.slice(0, 10) : '',
    commission_percentage: inq.commission_percentage ?? '',
    discount_percentage: inq.discount_percentage ?? '',
    source_type_id: inq.source_detail_info?.source_type_id || '',
    source_detail_id: inq.source_detail_id || '',
    source_name: inq.source_name || '',
    notes: inq.notes || ''
  }
}

onMounted(async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const [inq, { data: venuesData }, { data: unitsData }] = await Promise.all([
      store.getInquiryById(route.params.id),
      supabase.from('venues').select('id, name').eq('account_id', accountId).order('name'),
      supabase.from('units').select('id, name, venue_id').eq('account_id', accountId).eq('is_active', true).order('name'),
      loadAgeCategorySettings()
    ])
    inquiry.value = inq
    venues.value = venuesData || []
    units.value = unitsData || []
    if (inq) hydrateForm(inq)
  } catch (err) {
    toast.error(err.message || 'No se pudo cargar la consulta')
  } finally {
    loading.value = false
  }
})

const submitEdit = async () => {
  if (!inquiry.value) return
  submitAttempted.value = true
  if (fieldError('guest_first_name')) return

  saving.value = true
  saveError.value = ''
  try {
    await store.updateInquiry(inquiry.value.id, {
      ...form.value,
      phone_country_code: form.value.guest_phone_country_code
    })
    toast.success('Consulta actualizada.')
    router.push(`/consultas/${inquiry.value.id}`)
  } catch (err) {
    saveError.value = err.message || 'No se pudo actualizar la consulta.'
  } finally {
    saving.value = false
  }
}
</script>
