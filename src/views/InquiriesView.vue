<template>
  <div class="space-y-6">
     <div class="flex items-center justify-between gap-3">
       <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Consultas</h1>
       <div class="flex items-center gap-3">
         <ViewModeToggle v-model="viewMode" class="hidden sm:flex" />
         <router-link v-if="can('inquiries', 'create') && !isMobile" to="/reservar" class="btn-primary">+ Nuevo Registro</router-link>
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

    <div v-if="!isMobile && isTable" class="card overflow-hidden !p-0">
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
                <p class="font-medium text-gray-900">{{ `${inquiry.guest_first_name || ''} ${inquiry.guest_last_name || ''}`.trim() || 'Sin nombre' }}</p>
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
              <td class="px-4 py-4 text-gray-700">{{ inquiry.source_display_label || '-' }}</td>
              <td class="px-4 py-4 text-right">
                <router-link :to="`/consultas/${inquiry.id}`" class="text-sm font-medium text-primary hover:text-primary-dark">Ver detalle</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!isMobile && isCards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <DataCard
        v-for="inquiry in filteredInquiries"
        :key="inquiry.id"
        :title="`${inquiry.guest_first_name || ''} ${inquiry.guest_last_name || ''}`.trim() || 'Sin nombre'"
        :subtitle="`${inquiry.inquiry_number || '-'} · ${inquiry.reference_code || '-'}`"
        :badge="{
          label: `${INQUIRY_STATUS_LABELS[inquiry.status] || getInquiryStatusLabel(inquiry.status)}${isQuoteExpired(inquiry) ? ' ⚠' : ''}`,
          type: inquiryCardBadgeType(inquiry.status)
        }"
        :meta="buildInquiryCardMeta(inquiry)"
        :actions="buildInquiryCardActions(inquiry)"
        :onClick="() => router.push(`/consultas/${inquiry.id}`)"
      />
      <div
        v-if="!store.loading && filteredInquiries.length === 0"
        class="col-span-full text-center py-12 text-neutral-secondary"
      >
        No hay consultas registradas.
      </div>
      <div
        v-if="store.loading"
        class="col-span-full text-center py-12 text-neutral-secondary"
      >
        Cargando consultas...
      </div>
    </div>

    <div v-if="isMobile" class="space-y-3">
      <div v-if="store.loading" class="card text-sm text-gray-500">Cargando consultas...</div>
      <div v-else-if="filteredInquiries.length === 0" class="card text-sm text-gray-500">No hay consultas registradas.</div>

      <DataCard
        v-for="inquiry in filteredInquiries"
        v-else
        :key="inquiry.id"
        :title="`${inquiry.guest_first_name || ''} ${inquiry.guest_last_name || ''}`.trim() || 'Sin nombre'"
        :subtitle="`${inquiry.inquiry_number || '-'} · ${inquiry.reference_code || '-'}`"
        :badge="{ label: getInquiryStatusLabel(inquiry.status), type: inquiryCardBadgeType(inquiry.status) }"
        :meta="buildInquiryCardMeta(inquiry)"
        :actions="buildInquiryCardActions(inquiry)"
        :onClick="() => router.push(`/consultas/${inquiry.id}`)"
      />
    </div>

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

    <router-link
      v-if="can('inquiries', 'create') && isMobile"
      to="/reservar"
      class="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark"
    >
      + Registro
    </router-link>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DataCard from '../components/ui/DataCard.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import InquiryConversionModal from '../components/inquiries/InquiryConversionModal.vue'
import { useInquiriesStore } from '../stores/inquiries'
import { usePermissions } from '../composables/usePermissions'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useViewMode } from '../composables/useViewMode'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import { useToast } from '../composables/useToast'
import { AppInlineAlert } from '@/components/ui/forms'
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
const toast = useToast()

const filters = ref({ search: '', status: '', dateFrom: '', dateTo: '' })

const showFiltersSheet = ref(false)
const showConversionModal = ref(false)
const selectedInquiryForConversion = ref(null)

onMounted(async () => {
  store.fetchInquiries().catch(() => {})
})

const hasFilters = computed(() =>
  !!filters.value.search || !!filters.value.status || !!filters.value.dateFrom || !!filters.value.dateTo
)

const filteredInquiries = computed(() => {
  return store.inquiries.filter(inquiry => {
    if (filters.value.status && inquiry.status !== filters.value.status) return false

    if (filters.value.dateFrom && inquiry.check_in && inquiry.check_in < filters.value.dateFrom) return false
    if (filters.value.dateTo && inquiry.check_in && inquiry.check_in > filters.value.dateTo) return false

    if (filters.value.search) {
      const q = filters.value.search.toLowerCase()
      const haystack = `${inquiry.guest_first_name || ''} ${inquiry.guest_last_name || ''} ${inquiry.guest_phone || ''} ${inquiry.inquiry_number || ''} ${inquiry.reference_code || ''}`.toLowerCase()
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

const canConvertInquiry = (status) => getAvailableInquiryTransitions(status).includes('convertida')

const inquiryCardBadgeType = (status) => {
  if (status === 'perdida') return 'danger'
  if (status === 'convertida') return 'success'
  if (status === 'cotizada') return 'warning'
  return 'info'
}

const buildInquiryCardMeta = (inquiry) => {
  const pricePerNight = inquiry.price_per_night ?? inquiry.pricePerNight
  const originLabel = inquiry.source_detail?.label_es || inquiry.source_display_label || null
  const adults = Number(inquiry.adults || 0)
  const children = Number(inquiry.children || 0)
  const people = adults + children

  return [
    inquiry.check_in ? { label: 'Check-in', value: formatDate(inquiry.check_in) } : null,
    inquiry.check_out ? { label: 'Check-out', value: formatDate(inquiry.check_out) } : null,
    inquiry.check_in && inquiry.check_out ? { label: 'Noches', value: String(getNights(inquiry.check_in, inquiry.check_out)) } : null,
    people > 0 ? { label: 'Personas', value: String(people) } : null,
    originLabel ? { label: 'Origen', value: originLabel } : null,
    pricePerNight != null && pricePerNight !== '' ? { label: 'Precio/noche', value: `$${formatCurrency(pricePerNight)}` } : null
  ].filter(Boolean)
}

const buildInquiryCardActions = (inquiry) => {
  const actions = [
    {
      label: 'Ver detalle',
      type: 'ghost',
      handler: () => router.push(`/consultas/${inquiry.id}`)
    }
  ]

  if (canConvertInquiry(inquiry.status)) {
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


</script>
