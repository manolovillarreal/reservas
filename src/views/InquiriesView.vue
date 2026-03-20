<template>
  <div class="space-y-6">
     <div class="flex items-center justify-between gap-3">
       <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Consultas</h1>
       <div class="flex items-center gap-3">
         <ViewModeToggle v-model="viewMode" class="hidden sm:flex" />
         <button v-if="can('inquiries', 'create')" class="btn-primary" @click="openCreateModal">+ Nueva consulta</button>
       </div>
     </div>

    <div v-if="isMobile" class="card !py-3 flex items-center justify-between gap-3">
      <p class="text-sm text-gray-600">{{ filteredInquiries.length }} consultas</p>
      <button type="button" class="btn-secondary text-sm" @click="showFiltersSheet = true">Filtros</button>
    </div>

    <div v-if="!isMobile" class="card !py-4 flex flex-wrap items-center gap-4 bg-white">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Buscar por nombre, teléfono o número..."
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-72"
      >

      <select v-model="filters.status" class="rounded-md border border-gray-300 px-3 py-2 text-sm min-w-44">
        <option value="">Todos los estados</option>
        <option v-for="(label, key) in INQUIRY_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>

      <div class="flex items-center gap-2">
        <input v-model="filters.dateFrom" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
        <span class="text-gray-400 text-xs">–</span>
        <input v-model="filters.dateTo" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
      </div>

      <button v-if="hasFilters" class="text-sm font-medium text-gray-500 underline" @click="clearFilters">Limpiar filtros</button>
    </div>

    <div v-if="!isMobile" class="card overflow-hidden !p-0">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-4">Número</th>
              <th class="px-4 py-4">Código</th>
              <th class="px-4 py-4">Huésped</th>
              <th class="px-4 py-4">Check-in</th>
              <th class="px-4 py-4">Check-out</th>
              <th class="px-4 py-4">Noches</th>
              <th class="px-4 py-4">Personas</th>
              <th class="px-4 py-4">Estado</th>
              <th class="px-4 py-4">Origen</th>
              <th class="px-4 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="store.loading">
              <td colspan="10" class="px-6 py-10 text-center text-gray-400">Cargando consultas...</td>
            </tr>
            <tr v-else-if="filteredInquiries.length === 0">
              <td colspan="10" class="px-6 py-10 text-center text-gray-500 italic">No hay consultas para mostrar.</td>
            </tr>
            <tr v-for="inquiry in filteredInquiries" :key="inquiry.id" class="hover:bg-gray-50">
              <td class="px-4 py-4">
                <span class="font-mono text-xs text-gray-500">{{ inquiry.inquiry_number || '-' }}</span>
              </td>
              <td class="px-4 py-4">
                <span class="font-mono text-xs text-gray-700">{{ inquiry.reference_code || '-' }}</span>
              </td>
              <td class="px-4 py-4">
                <p class="font-medium text-gray-900">{{ inquiry.guest_name || 'Sin nombre' }}</p>
                <p class="text-xs text-gray-500">{{ inquiry.guest_phone || 'Sin teléfono' }}</p>
              </td>
              <td class="px-4 py-4 text-gray-700">{{ formatDate(inquiry.check_in) }}</td>
              <td class="px-4 py-4 text-gray-700">{{ formatDate(inquiry.check_out) }}</td>
              <td class="px-4 py-4 text-gray-700">{{ getNights(inquiry.check_in, inquiry.check_out) }}</td>
              <td class="px-4 py-4 text-gray-700">{{ getPersonas(inquiry) }}</td>
              <td class="px-4 py-4">
                <div class="flex flex-wrap items-center gap-1">
                  <span
                    class="rounded-full border px-2 py-0.5 text-xs font-medium"
                    :style="getInquiryStatusStyle(inquiry.status)"
                  >{{ getInquiryStatusLabel(inquiry.status) }}</span>
                  <span
                    v-if="isQuoteExpired(inquiry)"
                    title="Cotización vencida"
                    class="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700"
                  >⚠ Venc.</span>
                </div>
              </td>
              <td class="px-4 py-4 text-gray-700">{{ inquiry.source_display_label || inquiry.source || '-' }}</td>
              <td class="px-4 py-4 text-right">
                <router-link :to="`/consultas/${inquiry.id}`" class="text-sm font-medium text-primary hover:text-primary-dark">Ver detalle</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="space-y-3">
      <div v-if="store.loading" class="card text-sm text-gray-500">Cargando consultas...</div>
      <div v-else-if="filteredInquiries.length === 0" class="card text-sm text-gray-500">No hay consultas para mostrar.</div>

      <DataCard
        v-for="inquiry in filteredInquiries"
        v-else
        :key="inquiry.id"
        :title="inquiry.guest_name || 'Sin nombre'"
        :subtitle="`${inquiry.inquiry_number || '-'} · ${inquiry.reference_code || '-'}`"
        :badge="{ label: getInquiryStatusLabel(inquiry.status), type: inquiry.status === 'perdida' ? 'danger' : inquiry.status === 'convertida' ? 'success' : 'info' }"
        :meta="[
          { label: 'Fechas', value: `${formatDate(inquiry.check_in)} -> ${formatDate(inquiry.check_out)}` },
          { label: 'Noches', value: String(getNights(inquiry.check_in, inquiry.check_out)) },
          { label: 'Personas', value: String(getPersonas(inquiry)) },
          { label: 'Origen', value: inquiry.source_display_label || inquiry.source || '-' }
        ]"
        :actions="inquiryActions(inquiry)"
      />
    </div>

    <BaseModal :isOpen="showCreateModal" title="Nueva consulta" size="lg" @close="closeCreateModal">
      <form class="space-y-5" @submit.prevent="submitCreate">
        <AppFormSection title="Solicitante" :divider="true">
          <AppFormGrid :columns="2">
            <AppInput
              v-model="createForm.guest_name"
              label="Nombre"
              required
              :error="createFieldError('guest_name')"
              @blur="touchCreateField('guest_name')"
            />
            <AppInput
              v-model="createForm.guest_phone"
              label="Teléfono"
              hint="Opcional"
            />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Fechas de interés" :divider="true">
          <AppFormGrid :columns="2">
            <AppDatePicker v-model="createForm.check_in" label="Check-in" hint="Opcional" />
            <AppDatePicker v-model="createForm.check_out" label="Check-out" hint="Opcional" />
          </AppFormGrid>

          <p v-if="createNights > 0" class="text-sm text-[#6B7280]">{{ createNights }} noches</p>

          <AppFieldGroup title="¿Qué unidades te interesan?" subtitle="Opcional" :compact="true" :border="true">
            <div class="max-h-40 space-y-1 overflow-y-auto">
              <p v-if="units.length === 0" class="text-sm text-gray-500">No hay unidades activas.</p>
              <label v-for="unit in units" :key="unit.id" class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-white">
                <input type="checkbox" :value="unit.id" v-model="createForm.unit_ids" class="rounded border-gray-300">
                <span>{{ unit.name }}<span v-if="venueNameById(unit.venue_id)" class="text-gray-400"> · {{ venueNameById(unit.venue_id) }}</span></span>
              </label>
            </div>
          </AppFieldGroup>
        </AppFormSection>

        <AppFormSection title="Personas" :divider="true">
          <AppFormGrid :columns="2">
            <AppCounter v-model="createForm.adults" label="Adultos" :min="1" :max="20" />
            <AppCounter v-model="createForm.children" label="Niños" :min="0" :max="20" />
          </AppFormGrid>
          <p class="text-sm text-[#6B7280]">Total: <strong class="text-[#111827]">{{ Number(createForm.adults || 0) + Number(createForm.children || 0) }}</strong></p>
        </AppFormSection>

        <AppFormSection title="Cotización" :divider="true">
          <AppInput v-model="createForm.price_per_night" type="number" label="Precio por noche" prefix="$" hint="Opcional" />

          <AppFormGrid :columns="2">
            <AppInput v-model="createForm.discount_percentage" type="number" label="Descuento" suffix="%" hint="Opcional" />
            <AppInput v-model="createForm.commission_percentage" type="number" label="Comisión" suffix="%" hint="Opcional" />
          </AppFormGrid>

          <AppDatePicker v-model="createForm.quote_expires_at" label="Cotización válida hasta" hint="Opcional" />

          <PricingCalculatorPanel
            :checkIn="createForm.check_in"
            :checkOut="createForm.check_out"
            :pricePerNight="Number(createForm.price_per_night || 0)"
            :discountPercentage="Number(createForm.discount_percentage || 0)"
            :commissionPercentage="Number(createForm.commission_percentage || 0)"
            :units="createForm.unit_ids"
            :adults="Number(createForm.adults || 1)"
            :children="Number(createForm.children || 0)"
          />
        </AppFormSection>

        <AppFormSection title="Origen" :divider="true">
          <AppFieldGroup title="Canal de origen" :border="false" :compact="true">
            <SourceSelector
              :modelValue="{ sourceTypeId: createForm.source_type_id, sourceDetailId: createForm.source_detail_id }"
              @update:modelValue="updateCreateSourceSelection"
              @suggestions="applyCreateSourceSuggestions"
            />
          </AppFieldGroup>
        </AppFormSection>

        <AppFormSection title="Notas" :divider="false">
          <AppTextarea
            v-model="createForm.notes"
            label="Notas"
            :rows="2"
            :autoResize="true"
          />
        </AppFormSection>

        <AppInlineAlert v-if="createError" type="error" :message="createError" />

        <AppFormActions
          submit-label="Guardar consulta"
          cancel-label="Cancelar"
          :loading="creating"
          :submit-disabled="creating"
          @submit="submitCreate"
          @cancel="closeCreateModal"
        />
      </form>
    </BaseModal>

    <InquiryConversionModal
      v-if="selectedInquiryForConversion"
      :isOpen="showConversionModal"
      :inquiry="selectedInquiryForConversion"
      @close="closeConversionModal"
      @converted="handleConverted"
    />

    <BottomSheet
      v-model="showFiltersSheet"
      title="Filtros de consultas"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Buscar</label>
          <input v-model="filters.search" type="text" placeholder="Nombre, teléfono o número" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</label>
          <select v-model="filters.status" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            <option v-for="(label, key) in INQUIRY_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <input v-model="filters.dateFrom" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <input v-model="filters.dateTo" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
        </div>

        <div class="flex items-center justify-between pt-2">
          <button v-if="hasFilters" class="text-sm font-medium text-gray-500 underline" @click="clearFilters">Limpiar filtros</button>
          <button type="button" class="btn-primary ml-auto" @click="showFiltersSheet = false">Aplicar</button>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '../components/ui/BaseModal.vue'
import SourceSelector from '../components/sources/SourceSelector.vue'
import DataCard from '../components/ui/DataCard.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import InquiryConversionModal from '../components/inquiries/InquiryConversionModal.vue'
import { useInquiriesStore } from '../stores/inquiries'
import { usePermissions } from '../composables/usePermissions'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useViewMode } from '../composables/useViewMode'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import { useAccountStore } from '../stores/account'
import { supabase } from '../services/supabase'
import { useToast } from '../composables/useToast'
import {
  AppInput,
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
import {
  INQUIRY_STATUS_LABELS,
  getAvailableInquiryTransitions,
  getInquiryStatusLabel,
  getInquiryStatusStyle
} from '../utils/inquiryUtils'

const store = useInquiriesStore()
const router = useRouter()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const { viewMode, isTable, isCards } = useViewMode('consultas')
const accountStore = useAccountStore()
const toast = useToast()

const filters = ref({ search: '', status: '', dateFrom: '', dateTo: '' })

const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const createTouched = ref({})
const createSubmitAttempted = ref(false)

const venues = ref([])
const units = ref([])

const createForm = ref(buildEmptyForm())
const showFiltersSheet = ref(false)
const showConversionModal = ref(false)
const selectedInquiryForConversion = ref(null)

function buildEmptyForm() {
  return {
    guest_name: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    adults: 1,
    children: 0,
    unit_ids: [],
    price_per_night: '',
    quote_expires_at: '',
    commission_name: '',
    commission_percentage: '',
    discount_percentage: '',
    source: null,
    source_type_id: '',
    source_detail_id: '',
    notes: ''
  }
}

onMounted(async () => {
  const accountId = accountStore.getRequiredAccountId()
  const [{ data: venuesData }, { data: unitsData }] = await Promise.all([
    supabase.from('venues').select('id, name').eq('account_id', accountId).order('name'),
    supabase.from('units').select('id, name, venue_id').eq('account_id', accountId).eq('is_active', true).order('name')
  ])
  venues.value = venuesData || []
  units.value = unitsData || []
  store.fetchInquiries().catch(() => {})
})

const venueNameById = (venueId) => venues.value.find(v => v.id === venueId)?.name || ''

const hasFilters = computed(() =>
  !!filters.value.search || !!filters.value.status || !!filters.value.dateFrom || !!filters.value.dateTo
)
const createNights = computed(() => getNumericNights(createForm.value.check_in, createForm.value.check_out))
const createSubtotal = computed(() => Number(createForm.value.price_per_night || 0) * createNights.value)
const createDiscountAmount = computed(() => createSubtotal.value * Number(createForm.value.discount_percentage || 0) / 100)
const createCustomerTotal = computed(() => Math.max(createSubtotal.value - createDiscountAmount.value, 0))
const createCommissionAmount = computed(() => createCustomerTotal.value * Number(createForm.value.commission_percentage || 0) / 100)
const createNetAmount = computed(() => Math.max(createCustomerTotal.value - createCommissionAmount.value, 0))
const showCreateCalculationPanel = computed(() => {
  return createNights.value > 0 && createForm.value.price_per_night !== '' && createForm.value.price_per_night !== null
})

const filteredInquiries = computed(() => {
  return store.inquiries.filter(inquiry => {
    if (filters.value.status && inquiry.status !== filters.value.status) return false

    if (filters.value.dateFrom && inquiry.check_in && inquiry.check_in < filters.value.dateFrom) return false
    if (filters.value.dateTo && inquiry.check_in && inquiry.check_in > filters.value.dateTo) return false

    if (filters.value.search) {
      const q = filters.value.search.toLowerCase()
      const haystack = `${inquiry.guest_name || ''} ${inquiry.guest_phone || ''} ${inquiry.inquiry_number || ''} ${inquiry.reference_code || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
})

const clearFilters = () => {
  filters.value = { search: '', status: '', dateFrom: '', dateTo: '' }
}

const openConversionModal = (inquiry) => {
  selectedInquiryForConversion.value = inquiry
  showConversionModal.value = true
}

const closeConversionModal = () => {
  showConversionModal.value = false
  selectedInquiryForConversion.value = null
}

const handleConverted = async () => {
  await store.fetchInquiries()
  closeConversionModal()
}

const inquiryActions = (inquiry) => {
  const actions = [
    {
      label: 'Ver detalle',
      type: 'ghost',
      handler: () => router.push(`/consultas/${inquiry.id}`)
    }
  ]

  if (getAvailableInquiryTransitions(inquiry.status).includes('convertida')) {
    actions.push({
      label: 'Convertir',
      type: 'primary',
      handler: () => openConversionModal(inquiry)
    })
  }

  return actions
}

const isQuoteExpired = (inquiry) => {
  if (inquiry.status !== 'cotizada') return false
  if (!inquiry.quote_expires_at) return false
  return new Date(inquiry.quote_expires_at) < new Date()
}

const getPersonas = (inquiry) => {
  const adults = Number(inquiry.adults || 0)
  const children = Number(inquiry.children || 0)
  const total = adults + children
  if (total === 0) return inquiry.guests_count || '-'
  return total
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const getNights = (checkIn, checkOut) => {
  const nights = getNumericNights(checkIn, checkOut)
  return nights === null ? '-' : nights
}

const getNumericNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null

  const start = new Date(checkIn)
  const end = new Date(checkOut)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return nights >= 0 ? nights : 0
}

const formatCurrency = (value) => Number(value || 0).toLocaleString('es-CO')

const updateCreateSourceSelection = (value) => {
  createForm.value.source_type_id = value?.sourceTypeId || ''
  createForm.value.source_detail_id = value?.sourceDetailId || ''

  if (!createForm.value.source_detail_id) {
    createForm.value.source = null
  }
}

const applyCreateSourceSuggestions = (payload) => {
  createForm.value.source = payload.sourceDetailName || payload.sourceDetailLabel || null

  if (!String(createForm.value.commission_name || '').trim()) {
    createForm.value.commission_name = payload.sourceDetailLabel || ''
  }

  if (createForm.value.commission_percentage === '' || createForm.value.commission_percentage === null) {
    createForm.value.commission_percentage = Number(payload.commissionPercentage || 0)
  }

  if (createForm.value.discount_percentage === '' || createForm.value.discount_percentage === null) {
    createForm.value.discount_percentage = Number(payload.discountPercentage || 0)
  }
}

const openCreateModal = () => {
  createForm.value = buildEmptyForm()
  createError.value = ''
  createTouched.value = {}
  createSubmitAttempted.value = false
  showCreateModal.value = true
}

const closeCreateModal = () => {
  if (creating.value) return
  showCreateModal.value = false
}

const submitCreate = async () => {
  createSubmitAttempted.value = true
  if (createFieldError('guest_name')) return

  creating.value = true
  createError.value = ''

  try {
    await store.createInquiry(createForm.value)
    showCreateModal.value = false
    toast.success('Consulta creada correctamente.')
  } catch (err) {
    createError.value = err.message
  } finally {
    creating.value = false
  }
}

const touchCreateField = (field) => {
  createTouched.value[field] = true
}

const createFieldError = (field) => {
  if (!createTouched.value[field] && !createSubmitAttempted.value) return ''

  if (field === 'guest_name' && !createForm.value.guest_name?.trim()) {
    return 'El nombre es obligatorio.'
  }

  return ''
}
</script>
