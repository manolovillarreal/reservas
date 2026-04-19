<template>
  <div class="space-y-6">
     <div class="flex items-center justify-between gap-3">
       <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Consultas</h1>
       <div class="flex items-center gap-3">
         <ViewModeToggle v-if="!isMobile" v-model="viewMode" />
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
            <tr v-for="inquiry in filteredInquiries" :key="inquiry.id" class="cursor-pointer hover:bg-gray-50" @click="router.push('/consultas/' + inquiry.id)">
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
              <td class="px-4 py-4 text-right" @click.stop>
                <div class="relative inline-block text-left">
                  <button
                    class="inline-flex h-9 w-9 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    type="button"
                    @click.stop="toggleInquiryMenu(inquiry.id)"
                  >
                    ...
                  </button>
                  <div
                    v-if="openInquiryMenuId === inquiry.id"
                    class="absolute right-0 z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    <button class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" @click.stop="router.push('/consultas/' + inquiry.id); openInquiryMenuId = ''">
                      Ver detalle
                    </button>
                    <button
                      v-if="!['convertida', 'vencida', 'perdida'].includes(inquiry.status)"
                      class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      @click.stop="router.push('/consultas/' + inquiry.id + '/editar'); openInquiryMenuId = ''"
                    >
                      Editar
                    </button>
                    <button
                      v-if="!['convertida', 'vencida', 'perdida'].includes(inquiry.status)"
                      class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      @click.stop="openConversionModal(inquiry); openInquiryMenuId = ''"
                    >
                      Convertir
                    </button>
                    <button
                      v-if="inquiry.guest_phone"
                      class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      @click.stop="openWhatsApp(inquiry); openInquiryMenuId = ''"
                    >
                      📱 WhatsApp
                    </button>
                    <button
                      v-if="can('inquiries', 'delete')"
                      class="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      @click.stop="requestDeleteInquiry(inquiry)"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
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

      <div
        v-for="inquiry in filteredInquiries"
        v-else
        :key="inquiry.id"
        class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3"
      >
        <div class="flex justify-between items-start gap-2">
          <div class="min-w-0">
            <p class="font-bold text-gray-900 text-base truncate">
              {{ `${inquiry.guest_first_name || ''} ${inquiry.guest_last_name || ''}`.trim() || 'Sin nombre' }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">
              Ref: {{ inquiry.inquiry_number || '-' }}{{ inquiry.reference_code ? ' · ' + inquiry.reference_code : '' }}
            </p>
          </div>

          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <span
              class="rounded-full border px-2 py-0.5 text-xs font-medium"
              :style="getInquiryStatusStyle(inquiry.status)"
            >{{ getInquiryStatusLabel(inquiry.status) }}</span>
            <button
              v-if="inquiry.guest_phone"
              type="button"
              class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"
              @click="openWhatsApp(inquiry)"
              aria-label="Abrir WhatsApp"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#16A34A" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path fill="#16A34A" d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.5.5 0 00.612.612l5.726-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.645-.52-5.153-1.424l-.369-.22-3.398.873.888-3.397-.24-.38A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Check-in</p>
            <p class="text-sm text-gray-900 font-medium mt-0.5">{{ formatDate(inquiry.check_in) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Check-out</p>
            <p class="text-sm text-gray-900 font-medium mt-0.5">{{ formatDate(inquiry.check_out) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Noches</p>
            <p class="text-sm text-gray-900 font-medium mt-0.5">{{ getNights(inquiry.check_in, inquiry.check_out) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Origen</p>
            <p class="text-sm text-gray-900 font-medium mt-0.5">{{ inquiry.source_detail?.label_es || inquiry.source_display_label || '-' }}</p>
          </div>
          <div v-if="(inquiry.unit_names_display || inquiry.unitsLabel || inquiry.units_label)" class="col-span-2">
            <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Unidad</p>
            <p class="text-sm text-gray-900 font-medium mt-0.5">{{ inquiry.unit_names_display || inquiry.unitsLabel || inquiry.units_label }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Personas</p>
            <p class="text-sm text-gray-900 font-medium mt-0.5">
              {{ [
                Number(inquiry.adults || 0) > 0 ? `${inquiry.adults} adultos` : '',
                Number(inquiry.children || 0) > 0 ? `${inquiry.children} niños` : ''
              ].filter(Boolean).join(' · ') || '-' }}
            </p>
          </div>
        </div>

        <div class="h-px bg-gray-100"></div>

        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-500">Precio/noche</span>
          <span class="font-semibold text-sm text-gray-900">
            {{ inquiry.price_per_night != null && inquiry.price_per_night !== '' ? `$${formatCurrency(inquiry.price_per_night)}` : '-' }}
          </span>
        </div>

        <div class="flex gap-2 flex-wrap">
          <button
            type="button"
            class="flex-1 h-9 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700"
            @click="router.push('/consultas/' + inquiry.id)"
          >
            Ver
          </button>

          <button
            v-if="!['convertida','vencida','perdida'].includes(inquiry.status)"
            type="button"
            class="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-700"
            @click="router.push('/consultas/' + inquiry.id + '/editar')"
            aria-label="Editar consulta"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.586 3.586a2 2 0 112.828 2.828L12 15.828l-4 1 1-4 9.586-9.242z" />
            </svg>
          </button>

          <button
            v-if="canConvertInquiry(inquiry.status)"
            type="button"
            class="text-xs font-semibold text-primary border border-primary rounded-lg px-3 h-9"
            @click="openConversionModal(inquiry)"
          >
            Convertir
          </button>

          <button
            v-if="can('inquiries', 'delete')"
            type="button"
            class="w-9 h-9 border border-red-200 rounded-lg text-red-500 flex items-center justify-center"
            @click="requestDeleteInquiry(inquiry)"
            aria-label="Eliminar consulta"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
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

    <ConfirmActionModal
      :isOpen="showDeleteInquiryModal"
      title="Eliminar consulta"
      :message="inquiryToDelete
        ? '¿Eliminar la consulta de '
          + [inquiryToDelete.guest_first_name,
             inquiryToDelete.guest_last_name]
            .filter(Boolean).join(' ')
          + '?'
        : ''"
      confirmLabel="Eliminar"
      :loading="deleteInquiryLoading"
      :errorMessage="deleteInquiryError"
      @close="showDeleteInquiryModal = false"
      @confirm="confirmDeleteInquiry"
    />

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
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
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
const openInquiryMenuId = ref('')
const showDeleteInquiryModal = ref(false)
const inquiryToDelete = ref(null)
const deleteInquiryLoading = ref(false)
const deleteInquiryError = ref('')

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

const toggleInquiryMenu = (id) => {
  openInquiryMenuId.value = openInquiryMenuId.value === id ? '' : id
}

const openWhatsApp = (inquiry) => {
  const digits = ((inquiry.phone_country_code || '').replace(/\D/g, '')) + (inquiry.guest_phone || '').replace(/\D/g, '')
  if (digits) window.open(`https://wa.me/${digits}`, '_blank')
}

const requestDeleteInquiry = (inquiry) => {
  openInquiryMenuId.value = ''
  inquiryToDelete.value = inquiry
  deleteInquiryError.value = ''
  showDeleteInquiryModal.value = true
}

const confirmDeleteInquiry = async () => {
  if (!inquiryToDelete.value) return
  deleteInquiryLoading.value = true
  try {
    await store.deleteInquiry(inquiryToDelete.value.id)
    showDeleteInquiryModal.value = false
    inquiryToDelete.value = null
    toast.success('Consulta eliminada')
  } catch {
    deleteInquiryError.value = 'No se pudo eliminar la consulta.'
  } finally {
    deleteInquiryLoading.value = false
  }
}

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
  const BLOCKED_STATUSES = ['convertida', 'vencida', 'perdida']
  const actions = []

  if (inquiry.guest_phone) {
    const digits = ((inquiry.phone_country_code || '').replace(/\D/g, '')) + (inquiry.guest_phone || '').replace(/\D/g, '')
    if (digits) {
      actions.push({ label: '📱 WhatsApp', type: 'whatsapp', handler: () => window.open(`https://wa.me/${digits}`, '_blank') })
    }
  }

  actions.push({ label: 'Ver detalle', type: 'ghost', handler: () => router.push(`/consultas/${inquiry.id}`) })
  
  if (!BLOCKED_STATUSES.includes(inquiry.status)) {
    actions.push({ label: 'Editar', type: 'ghost', handler: () => router.push(`/consultas/${inquiry.id}/editar`) })
  }

  if (canConvertInquiry(inquiry.status)) {
    actions.push({
      label: 'Convertir',
      type: 'primary',
      handler: () => openConversionModal(inquiry)
    })
  }

  if (can('inquiries', 'delete')) {
    actions.push({ label: 'Eliminar', type: 'danger', handler: () => requestDeleteInquiry(inquiry) })
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
