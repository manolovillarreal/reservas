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
      <h1 class="text-2xl font-semibold text-gray-900">Convertir en reserva</h1>
    </div>

    <div v-if="loading" class="card py-10 text-center text-gray-500">Cargando consulta...</div>

    <div v-else-if="!inquiry" class="card py-10 text-center">
      <h2 class="text-lg font-semibold text-gray-900">Consulta no encontrada</h2>
      <p class="mt-2 text-sm text-gray-500">La URL puede ser inválida o la consulta fue eliminada.</p>
    </div>

    <form v-else class="space-y-5" @submit.prevent="submitConversion">
      <p class="font-mono text-xs text-gray-500">Consulta: {{ inquiry.inquiry_number || '-' }}</p>

      <AppInlineAlert type="info" message="La reserva se creará en estado Confirmada." />

      <AppFormSection title="Huésped" :divider="true" :collapsible="true" :defaultOpen="true">
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
          <AppInput v-model="form.guest_email" label="Email" type="email" hint="Opcional" />
        </AppFormGrid>
        <AppCountrySelect v-model="form.guest_nationality" label="Nacionalidad" hint="Opcional" />
        <AppFormGrid :columns="2">
          <AppSelect
            v-model="form.guest_document_type"
            label="Tipo de documento"
            :options="documentTypeOptions"
            placeholder="Sin definir"
            hint="Opcional"
          />
          <AppInput v-model="form.guest_document_number" label="Número de documento" hint="Opcional" />
        </AppFormGrid>
        <AppFormGrid :columns="2">
          <AppSelect
            v-model="form.guest_gender"
            label="Género"
            :options="[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' }, { value: 'unspecified', label: 'Prefiero no indicar' }]"
            placeholder="Sin definir"
            hint="Opcional"
          />
          <AppDatePicker v-model="form.guest_birth_date" label="Fecha de nacimiento" hint="Opcional" />
        </AppFormGrid>
      </AppFormSection>

      <AppFormSection title="Fechas y unidad" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppFormGrid :columns="2">
          <AppDatePicker
            v-model="form.check_in"
            label="Check-in"
            :error="fieldError('check_in')"
            @update:modelValue="touchField('check_in')"
          />
          <AppDatePicker
            v-model="form.check_out"
            label="Check-out"
            :error="fieldError('check_out')"
            @update:modelValue="touchField('check_out')"
          />
        </AppFormGrid>

        <div v-if="nights > 0 && !hasAvailabilityConflict" class="flex items-center gap-2 text-sm font-medium text-[#10B981]">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.03-9.28a.75.75 0 10-1.06-1.06L9.25 10.38 8.03 9.16a.75.75 0 10-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.25-3.25z" clip-rule="evenodd" />
          </svg>
          {{ nights }} noche{{ nights !== 1 ? 's' : '' }} · Fechas disponibles
        </div>
        <div v-else-if="nights > 0" class="text-sm text-[#6B7280]">{{ nights }} noche{{ nights !== 1 ? 's' : '' }}</div>

        <AppInlineAlert
          v-if="hasAvailabilityConflict"
          type="error"
          title="Fechas ocupadas"
          :message="`Unidades no disponibles: ${selectedUnavailableNames.join(', ')}`"
        />

        <AppFieldGroup title="Unidad(es)" :border="true" :compact="true" :tone="fieldError('unit_ids') ? 'error' : 'neutral'">
          <div class="max-h-44 space-y-1 overflow-y-auto">
            <p v-if="units.length === 0" class="text-sm text-gray-500">No hay unidades activas.</p>
            <label
              v-for="unit in units"
              :key="unit.id"
              class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-white"
            >
              <input v-model="form.unit_ids" type="checkbox" :value="unit.id" class="rounded border-gray-300">
              <span>{{ unit.name }}</span>
            </label>
          </div>
          <template #footer>
            <p v-if="fieldError('unit_ids')" class="text-xs text-[#EF4444]">{{ fieldError('unit_ids') }}</p>
          </template>
        </AppFieldGroup>
      </AppFormSection>

      <AppFormSection title="Personas" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppFormGrid :columns="2">
          <AppCounter v-model="form.adults" label="Adultos" :min="1" :max="20" />
          <AppCounter v-if="activeCategories.includes('minors')" v-model="form.minors" :label="ageCategoryLabels.minors" :min="0" :max="20" />
          <AppCounter v-if="activeCategories.includes('children')" v-model="form.children" :label="ageCategoryLabels.children" :min="0" :max="20" />
          <AppCounter v-if="activeCategories.includes('infants')" v-model="form.infants" :label="ageCategoryLabels.infants" :min="0" :max="20" />
        </AppFormGrid>
        <p class="text-sm text-[#6B7280]">
          Total: <strong class="text-[#111827]">{{ guestsTotal }} persona{{ guestsTotal !== 1 ? 's' : '' }}</strong>
        </p>
      </AppFormSection>

      <AppFormSection title="Precio y comisión" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppInput
          v-model="form.price_per_night"
          type="number"
          label="Precio por noche"
          prefix="$"
          :hint="suggestionHint"
        />

        <AppInlineAlert
          v-if="pricingSuggestion.estimatedLabel"
          type="info"
          :message="pricingSuggestion.estimatedLabel"
        />

        <div v-if="pricingSuggestion.unitBreakdown?.length" class="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-2">
          <p class="font-semibold text-gray-900">Sugerido por unidad</p>
          <div v-for="item in pricingSuggestion.unitBreakdown" :key="item.unitId" class="flex flex-wrap items-center justify-between gap-2">
            <span>{{ item.unitName }} · {{ item.label }}</span>
            <span class="font-medium text-gray-900">{{ item.nightly === null ? 'Sin tarifa' : `$${Math.round(item.nightly).toLocaleString('es-CO')}/noche` }}</span>
          </div>
        </div>

        <div v-if="showFullHouseToggle" class="space-y-2 rounded-md border border-gray-200 p-3">
          <AppToggle v-model="useFullHousePricing" label="Aplicar tarifa full house" description="Reemplaza la suma por unidad por tarifa de propiedad completa" />
        </div>

        <div v-if="hasPeakPolicy" class="rounded-md border border-gray-200 p-3">
          <AppToggle v-model="usePeakPricing" label="Aplicar precio pico" description="Activa politica global de temporada pico" />
        </div>

        <AppFormGrid :columns="2">
          <AppInput v-model="form.discount_percentage" type="number" label="Descuento" suffix="%" hint="Opcional" />
          <AppInput v-model="form.commission_percentage" type="number" label="Comisión" suffix="%" hint="Opcional" />
        </AppFormGrid>

        <PricingCalculatorPanel
          :checkIn="form.check_in"
          :checkOut="form.check_out"
          :pricePerNight="Number(form.price_per_night || 0)"
          :discountPercentage="Number(form.discount_percentage || 0)"
          :commissionPercentage="Number(form.commission_percentage || 0)"
          :units="form.unit_ids"
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
        <AppFieldHint message="Copiado desde la consulta" type="hint" />
      </AppFormSection>

      <AppFormSection title="Notas" :divider="true" :collapsible="true" :defaultOpen="false">
        <AppTextarea v-model="form.notes" label="Notas" hint="Opcional" :rows="2" :autoResize="true" />
      </AppFormSection>

      <AppFormSection title="Registro de pago" :divider="false" :collapsible="true" :defaultOpen="true">
        <AppFormGrid :columns="2">
          <AppInput v-model="payment.amount" type="number" label="Monto abonado" prefix="$" hint="Opcional" />
          <AppSelect v-model="payment.method" label="Método" :options="PAYMENT_METHOD_OPTIONS" />
        </AppFormGrid>
        <AppInput v-model="payment.reference" label="Referencia" hint="Opcional" />
        <AppDatePicker v-model="payment.payment_date" label="Fecha de pago" />
      </AppFormSection>

      <AppInlineAlert
        v-if="syncIssue"
        type="warning"
        title="Reserva creada con problema de sincronización"
        :message="syncIssue.message"
      >
        <template #actions>
          <button type="button" class="rounded-md border border-current px-3 py-1 text-xs font-medium transition hover:opacity-80" @click="retrySync">Reintentar</button>
          <button type="button" class="rounded-md border border-current px-3 py-1 text-xs font-medium transition hover:opacity-80" @click="goManual">Hacer manualmente</button>
        </template>
      </AppInlineAlert>

      <AppInlineAlert v-if="errorMessage" type="error" :message="errorMessage" :dismissible="true" />

      <AppFormActions
        submit-label="Crear reserva"
        cancel-label="Cancelar"
        :loading="submitting"
        :submit-disabled="submitting || hasAvailabilityConflict"
        @submit="submitConversion"
        @cancel="router.back()"
      />
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { useReservationsStore } from '../stores/reservations'
import { useInquiriesStore } from '../stores/inquiries'
import { useGuestsStore } from '../stores/guests'
import { useToast } from '../composables/useToast'
import { useAgeCategorySettings } from '../composables/useAgeCategorySettings'
import { generateUniqueReferenceCode } from '../utils/referenceUtils'
import { buildPricingSuggestion } from '../utils/pricingUtils'
import { DOCUMENT_TYPES_ADULT as documentTypeOptions } from '../utils/documentTypes'
import SourceSelector from '../components/sources/SourceSelector.vue'
import {
  AppInput,
  AppSelect,
  AppTextarea,
  AppDatePicker,
  AppCounter,
  AppToggle,
  AppFieldGroup,
  AppFormSection,
  AppFormActions,
  AppInlineAlert,
  AppFieldHint,
  AppFormGrid,
  AppPhoneInput,
  AppCountrySelect,
  PricingCalculatorPanel
} from '@/components/ui/forms'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const reservationsStore = useReservationsStore()
const inquiriesStore = useInquiriesStore()
const guestsStore = useGuestsStore()
const toast = useToast()
const { ageCategorySettings, loadAgeCategorySettings, activeCategories, ageCategoryLabels } = useAgeCategorySettings()

const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const inquiry = ref(null)
const units = ref([])
const selectedUnavailableNames = ref([])
const syncIssue = ref(null)
const useFullHousePricing = ref(false)
const usePeakPricing = ref(false)
const submitAttempted = ref(false)
const touched = reactive({ guest_first_name: false, check_in: false, check_out: false, unit_ids: false })

const accountPricing = ref({
  price_general_base: null, price_general_min: null, price_general_extra: null,
  price_per_person_base: null, price_weekend_pct: null, price_peak_pct: null,
  price_child_pct: 50, price_full_house_min: null, price_full_house_base: null, price_full_house_peak: null,
})

const todayIso = new Date().toISOString().slice(0, 10)
const payment = ref({ amount: '', method: 'transferencia', reference: '', payment_date: todayIso })

const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'plataforma', label: 'Plataforma' },
]

const form = ref(buildEmptyForm())

function buildEmptyForm() {
  return {
    guest_first_name: '', guest_last_name: '',
    guest_phone: '', guest_phone_country_code: '+57',
    guest_email: '', guest_nationality: '',
    guest_document_type: '', guest_document_number: '',
    guest_gender: '', guest_birth_date: '',
    check_in: '', check_out: '',
    adults: 1, minors: 0, children: 0, infants: 0,
    unit_ids: [],
    price_per_night: '', commission_percentage: '', discount_percentage: '',
    source_type_id: '', source_detail_id: '', source_name: '', notes: ''
  }
}

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const start = new Date(form.value.check_in)
  const end = new Date(form.value.check_out)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const guestsTotal = computed(() =>
  Number(form.value.adults || 0) + Number(form.value.minors || 0) +
  Number(form.value.children || 0) + Number(form.value.infants || 0)
)

const subtotal = computed(() => Number(form.value.price_per_night || 0) * nights.value)
const discountAmount = computed(() => subtotal.value * Number(form.value.discount_percentage || 0) / 100)
const customerTotal = computed(() => Math.max(subtotal.value - discountAmount.value, 0))
const hasAvailabilityConflict = computed(() => selectedUnavailableNames.value.length > 0)

const selectedUnits = computed(() => {
  const s = new Set(form.value.unit_ids || [])
  return units.value.filter(u => s.has(u.id))
})

const allUnitsSelected = computed(() => {
  if (!units.value.length) return false
  const s = new Set(form.value.unit_ids || [])
  return units.value.every(u => s.has(u.id))
})

const hasFullHouseTariff = computed(() => {
  const c = accountPricing.value
  return c.price_full_house_base !== null || c.price_full_house_peak !== null || c.price_full_house_min !== null
})
const hasPeakPolicy = computed(() => accountPricing.value.price_peak_pct !== null && accountPricing.value.price_peak_pct !== 0)
const showFullHouseToggle = computed(() => allUnitsSelected.value && hasFullHouseTariff.value)

const pricingSuggestion = computed(() => buildPricingSuggestion({
  selectedUnits: selectedUnits.value,
  settings: accountPricing.value,
  checkIn: form.value.check_in,
  checkOut: form.value.check_out,
  adults: Number(form.value.adults || 0),
  minors: Number(form.value.minors || 0),
  children: Number(form.value.children || 0),
  infants: Number(form.value.infants || 0),
  ageSettings: ageCategorySettings.value,
  usePeak: usePeakPricing.value,
  useFullHouse: useFullHousePricing.value,
  allUnitsSelected: allUnitsSelected.value,
}))

const suggestionHint = computed(() => pricingSuggestion.value.originLabel || 'Opcional')

watch(showFullHouseToggle, (enabled) => { if (!enabled) useFullHousePricing.value = false })
watch(hasPeakPolicy, (enabled) => { if (!enabled) usePeakPricing.value = false })
watch(() => pricingSuggestion.value.nightly, (nightly) => {
  if (form.value.price_per_night !== '' && form.value.price_per_night !== null) return
  if (nightly === null) return
  form.value.price_per_night = Math.round(nightly)
})
watch(
  () => [form.value.check_in, form.value.check_out, (form.value.unit_ids || []).join(',')],
  async () => { await evaluateAvailability() }
)

const touchField = (field) => { touched[field] = true }

const fieldError = (field) => {
  if (!touched[field] && !submitAttempted.value) return ''
  if (field === 'guest_first_name' && !form.value.guest_first_name?.trim()) return 'El nombre del huésped es obligatorio.'
  if (field === 'check_in' && !form.value.check_in) return 'Debes completar check-in.'
  if (field === 'check_out') {
    if (!form.value.check_out) return 'Debes completar check-out.'
    if (form.value.check_in && new Date(form.value.check_in) >= new Date(form.value.check_out)) return 'El check-out debe ser posterior al check-in.'
  }
  if (field === 'unit_ids' && form.value.unit_ids.length === 0) return 'Debes seleccionar al menos una unidad.'
  return ''
}

const updateSourceSelection = (value) => {
  form.value.source_type_id = value?.sourceTypeId || ''
  form.value.source_detail_id = value?.sourceDetailId || ''
  form.value.source_name = value?.sourceName || ''
}

const applySourceSuggestions = (payload) => {
  if (form.value.commission_percentage === '' || form.value.commission_percentage == null) form.value.commission_percentage = Number(payload.commissionPercentage || 0)
  if (form.value.discount_percentage === '' || form.value.discount_percentage == null) form.value.discount_percentage = Number(payload.discountPercentage || 0)
}

const evaluateAvailability = async () => {
  selectedUnavailableNames.value = []
  if (!form.value.check_in || !form.value.check_out || form.value.unit_ids.length === 0) return
  const availability = await reservationsStore.getUnitAvailability(form.value.unit_ids, form.value.check_in, form.value.check_out)
  if (availability.unavailableUnitIds.length === 0) return
  selectedUnavailableNames.value = units.value
    .filter(u => availability.unavailableUnitIds.includes(u.id))
    .map(u => u.name)
}

const resolveVenueId = () => {
  if (form.value.unit_ids.length === 0) return null
  return units.value.find(u => u.id === form.value.unit_ids[0])?.venue_id || null
}

onMounted(async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const [inq, { data: unitsData }, { data: pricingData }] = await Promise.all([
      inquiriesStore.getInquiryById(route.params.id),
      supabase.from('units').select('id, name, venue_id, capacity, price_base, price_min, price_extra_person').eq('account_id', accountId).eq('is_active', true).order('name'),
      supabase.from('settings').select('price_general_base, price_general_min, price_general_extra, price_per_person_base, price_weekend_pct, price_peak_pct, price_child_pct, price_full_house_min, price_full_house_base, price_full_house_peak').eq('account_id', accountId).maybeSingle(),
      loadAgeCategorySettings()
    ])
    inquiry.value = inq
    units.value = unitsData || []
    if (pricingData) {
      accountPricing.value = {
        price_general_base: pricingData.price_general_base ?? null,
        price_general_min: pricingData.price_general_min ?? null,
        price_general_extra: pricingData.price_general_extra ?? null,
        price_per_person_base: pricingData.price_per_person_base ?? null,
        price_weekend_pct: pricingData.price_weekend_pct ?? null,
        price_peak_pct: pricingData.price_peak_pct ?? null,
        price_child_pct: pricingData.price_child_pct ?? 50,
        price_full_house_min: pricingData.price_full_house_min ?? null,
        price_full_house_base: pricingData.price_full_house_base ?? null,
        price_full_house_peak: pricingData.price_full_house_peak ?? null,
      }
    }
    if (inq) {
      form.value = {
        guest_first_name: inq.guest_first_name || '',
        guest_last_name: inq.guest_last_name || '',
        guest_phone: inq.guest_phone || '',
        guest_phone_country_code: inq.phone_country_code || '+57',
        guest_email: inq.guest_email || '',
        guest_nationality: inq.guest_nationality || '',
        guest_document_type: inq.guest_document_type || '',
        guest_document_number: inq.guest_document_number || '',
        guest_gender: inq.guest_gender || '',
        guest_birth_date: inq.guest_birth_date || '',
        check_in: inq.check_in || '',
        check_out: inq.check_out || '',
        adults: inq.adults ?? 1,
        minors: inq.minors ?? 0,
        children: inq.children ?? 0,
        infants: inq.infants ?? 0,
        unit_ids: [...(inq.inquiry_units?.map(u => u.unit_id) || [])],
        price_per_night: inq.price_per_night ?? '',
        commission_percentage: inq.commission_percentage ?? '',
        discount_percentage: inq.discount_percentage ?? '',
        source_type_id: inq.source_detail_info?.source_type_id || '',
        source_detail_id: inq.source_detail_id || '',
        source_name: inq.source_name || '',
        notes: ''
      }
      await evaluateAvailability()
    }
  } catch (err) {
    toast.error(err.message || 'No se pudo cargar la consulta')
  } finally {
    loading.value = false
  }
})

const submitConversion = async () => {
  submitting.value = true
  submitAttempted.value = true
  errorMessage.value = ''
  syncIssue.value = null

  try {
    if (fieldError('guest_first_name')) throw new Error(fieldError('guest_first_name'))
    if (fieldError('check_in')) throw new Error(fieldError('check_in'))
    if (fieldError('check_out')) throw new Error(fieldError('check_out'))
    if (fieldError('unit_ids')) throw new Error(fieldError('unit_ids'))
    if (selectedUnavailableNames.value.length > 0) throw new Error('Hay unidades no disponibles para las fechas seleccionadas.')

    const accountId = accountStore.getRequiredAccountId()

    let referenceCode = inquiry.value?.reference_code || null
    if (!referenceCode) {
      referenceCode = await generateUniqueReferenceCode(accountId)
      await inquiriesStore.updateInquiry(inquiry.value.id, { reference_code: referenceCode })
    }

    const guestRecord = await guestsStore.getOrCreateGuestByPhone({
      first_name: form.value.guest_first_name?.trim() || null,
      last_name: form.value.guest_last_name?.trim() || null,
      phone: form.value.guest_phone?.trim() || null,
      phone_country_code: form.value.guest_phone_country_code || '+57',
      email: form.value.guest_email?.trim() || null,
      nationality: form.value.guest_nationality || null,
      gender: form.value.guest_gender || null,
      birth_date: form.value.guest_birth_date || null,
      document_type: form.value.guest_document_type || null,
      document_number: form.value.guest_document_number?.trim() || null,
    })

    const venueId = resolveVenueId()
    if (!venueId) throw new Error('No se pudo determinar la sede a partir de las unidades seleccionadas.')

    const result = await reservationsStore.createReservationWithPayment(
      {
        venue_id: venueId,
        unit_ids: [...form.value.unit_ids],
        guest_id: guestRecord?.id || null,
        guest_first_name: form.value.guest_first_name?.trim() || null,
        guest_last_name: form.value.guest_last_name?.trim() || null,
        guest_phone: form.value.guest_phone?.trim() || null,
        check_in: form.value.check_in,
        check_out: form.value.check_out,
        adults: Number(form.value.adults || 1),
        minors: Number(form.value.minors || 0),
        children: Number(form.value.children || 0),
        infants: Number(form.value.infants || 0),
        price_per_night: Number(form.value.price_per_night || 0),
        total_amount: Number(customerTotal.value || 0),
        paid_amount: 0,
        commission_percentage: form.value.commission_percentage === '' ? null : Number(form.value.commission_percentage || 0),
        discount_percentage: form.value.discount_percentage === '' ? 0 : Number(form.value.discount_percentage || 0),
        source_detail_id: form.value.source_detail_id || null,
        source_name: form.value.source_name || null,
        notes: form.value.notes || null,
        status: 'confirmed',
        inquiry_id: inquiry.value.id,
        reference_code: referenceCode
      },
      payment.value
    )

    await inquiriesStore.updateInquiry(inquiry.value.id, {
      status: 'convertida',
      reservation_id: result.id,
      reference_code: referenceCode
    })

    if (result?.syncResult?.synced === false) {
      syncIssue.value = {
        reservationId: result.id,
        message: result.syncResult.error || 'No se pudo sincronizar la ocupación.'
      }
      toast.error('Reserva creada, pero falló la sincronización de ocupación.')
      return
    }

    toast.success('Reserva creada correctamente')
    router.push(`/reservas/${result.id}`)
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo convertir la consulta.'
  } finally {
    submitting.value = false
  }
}

const retrySync = async () => {
  if (!syncIssue.value?.reservationId) return
  const result = await reservationsStore.retryReservationOccupancySync(syncIssue.value.reservationId)
  if (result.synced) {
    toast.success('Ocupación sincronizada correctamente.')
    router.push(`/reservas/${syncIssue.value.reservationId}`)
    return
  }
  syncIssue.value = { reservationId: syncIssue.value.reservationId, message: result.error || 'Falló nuevamente la sincronización.' }
}

const goManual = () => {
  if (!syncIssue.value?.reservationId) return
  toast.warning('Gestiona la ocupación manualmente desde el detalle de la reserva.')
  router.push(`/reservas/${syncIssue.value.reservationId}`)
}
</script>
