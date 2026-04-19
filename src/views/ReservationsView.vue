<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Reservas</h1>
      <div class="flex items-center gap-3">
        <ViewModeToggle v-if="!isMobile" v-model="viewMode" />
        <router-link v-if="can('reservations', 'create') && !isMobile" to="/reservar" class="btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Nuevo Registro
        </router-link>
      </div>
    </div>

    <div v-if="isMobile" class="card !py-3 flex items-center justify-between gap-3">
      <p class="text-sm text-gray-600">{{ store.totalCount }} resultados</p>
      <button type="button" class="btn-secondary touch-target text-sm" @click="showFiltersSheet = true">
        Filtros
      </button>
    </div>

    <!-- Filters Bar -->
    <div v-if="!isMobile" class="card !py-4 flex flex-wrap gap-4 items-center bg-white">
      
      <!-- Search Guest -->
      <div class="w-full md:w-64">
        <label class="sr-only">Buscar huésped</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            v-model="filters.searchData" 
            type="text" 
            placeholder="Buscar huésped, código o nro..." 
            class="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
          >
        </div>
      </div>

      <!-- State Filter -->
      <div class="w-full md:w-48">
        <select v-model="filters.status" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option value="">Todos los estados</option>
          <option value="confirmed">Confirmada</option>
          <option value="in_stay">En estadía</option>
          <option value="completed">Finalizada</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      <!-- Source Filter -->
      <div class="w-full md:w-48">
        <select v-model="filters.sourceDetailId" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option value="">Cualquier origen</option>
          <option v-for="detail in sourceDetails" :key="detail.id" :value="detail.id">{{ detail.label_es }}</option>
        </select>
      </div>

      <div class="w-full md:w-40">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Check-in</label>
        <input v-model="filters.checkInFrom" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
      </div>

      <div class="w-full md:w-40">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Check-out</label>
        <input v-model="filters.checkInTo" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
      </div>

      <!-- Clear btn -->
      <button 
        v-if="hasActiveFilters" 
        @click="clearFilters"
        class="text-sm font-medium text-gray-500 hover:text-gray-700 underline"
      >
        Limpiar filtros
      </button>

    </div>

    <!-- Table View -->
    <ReservationTable 
      v-if="isTable && !isMobile"
      :reservations="store.reservations" 
      :loading="store.loading" 
      :sortKey="filters.sortBy"
      :sortDir="filters.sortDir"
      :page="pagination.page"
      :pageSize="pagination.pageSize"
      :totalCount="store.totalCount"
      @sort-change="onSortChange"
      @page-change="onPageChange"
      @view="goToDetail"
      @register-payment="openPaymentModal"
      @change-status="openStatusModal"
    />

    <!-- Cards View -->
    <div v-if="(isCards || isMobile) && (store.reservations.length > 0 || store.loading)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <template v-for="reservation in store.reservations" :key="reservation.id">
        <div v-if="isMobile" class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="font-bold text-gray-900 text-base truncate">{{ reservation.guest_display_name || reservation.guest_name || 'Sin nombre' }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ reservation.reservation_number || '-' }}{{ reservation.reference_code ? ' · ' + reservation.reference_code : '' }}
              </p>
            </div>

            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <ReservationBadge :status="reservation.status" />
              <button
                v-if="reservation.guest_wa_url"
                type="button"
                class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"
                @click="window.open(reservation.guest_wa_url, '_blank')"
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
              <p class="text-sm text-gray-900 font-medium mt-0.5">{{ reservation.check_in ? new Date(reservation.check_in).toLocaleDateString('es-CO') : '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Check-out</p>
              <p class="text-sm text-gray-900 font-medium mt-0.5">{{ reservation.check_out ? new Date(reservation.check_out).toLocaleDateString('es-CO') : '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Noches</p>
              <p class="text-sm text-gray-900 font-medium mt-0.5">{{ reservation.nights || 0 }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Origen</p>
              <p class="text-sm text-gray-900 font-medium mt-0.5">{{ reservation.source_display_label || 'Directo' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Unidad</p>
              <p class="text-sm text-gray-900 font-medium mt-0.5">{{ reservation.unit_names_display || 'Sin asignar' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Personas</p>
              <p class="text-sm text-gray-900 font-medium mt-0.5">
                {{ [
                  Number(reservation.adults || 0) > 0 ? `${reservation.adults} adultos` : '',
                  Number(reservation.minors || 0) > 0 ? `${reservation.minors} menores` : '',
                  Number(reservation.children || 0) > 0 ? `${reservation.children} niños` : '',
                  Number(reservation.babies || reservation.infants || 0) > 0 ? `${reservation.babies || reservation.infants} bebés` : ''
                ].filter(Boolean).join(' · ') || 'Sin registro' }}
              </p>
            </div>
          </div>

          <div class="h-px bg-gray-100"></div>

          <div class="flex justify-between items-center">
            <span class="text-xs text-gray-500">Saldo pendiente</span>
            <span
              class="font-semibold text-xs px-2 py-0.5 rounded-md"
              :class="Number(reservation.total_amount || 0) - Number(reservation.paid_amount || 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'"
            >
              {{ Number(reservation.total_amount || 0) - Number(reservation.paid_amount || 0) > 0
                ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(reservation.total_amount || 0) - Number(reservation.paid_amount || 0))
                : 'Al día' }}
            </span>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 h-9 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700"
              @click="goToDetail(reservation)"
            >
              Ver
            </button>
            <button
              v-if="can('reservations', 'edit')"
              type="button"
              class="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-700"
              @click="router.push('/reservas/' + reservation.id + '/editar')"
              aria-label="Editar reserva"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.586 3.586a2 2 0 112.828 2.828L12 15.828l-4 1 1-4 9.586-9.242z" />
              </svg>
            </button>
          </div>
        </div>

        <DataCard
          v-else
          :title="reservation.guest_display_name || reservation.guest_name || 'Sin nombre'"
          :subtitle="`${reservation.reservation_number} ${reservation.reference_code ? '· ' + reservation.reference_code : ''}`"
          :badge="{ 
            label: String(reservation.status || 'sin_estado').replace(/_/g, ' ').charAt(0).toUpperCase() + String(reservation.status || 'sin_estado').replace(/_/g, ' ').slice(1),
            type: reservation.status === 'confirmed' ? 'info' : reservation.status === 'in_stay' ? 'warning' : reservation.status === 'completed' ? 'success' : 'danger'
          }"
          :meta="[
            { label: 'Check-in', value: new Date(reservation.check_in).toLocaleDateString('es-CO') },
            { label: 'Check-out', value: new Date(reservation.check_out).toLocaleDateString('es-CO') },
            { label: 'Noches', value: reservation.nights || 0 },
            { label: 'Personas', value: `${reservation.adults || 0} adultos${reservation.children ? ' + ' + reservation.children + ' niños' : ''}` },
            { label: 'Unidad', value: reservation.unit_names_display || 'Sin asignar' },
            { label: 'Origen', value: reservation.source_display_label || 'Directo' }
          ]"
          :actions="[
            ...(reservation.guest_wa_url ? [{ label: '📱 WhatsApp', type: 'whatsapp', handler: () => window.open(reservation.guest_wa_url, '_blank') }] : []),
            { label: 'Ver detalle', handler: () => goToDetail(reservation) },
            ...(can('payments', 'create') ? [{ label: 'Registrar pago', handler: () => openPaymentModal(reservation) }] : []),
            ...(can('reservations', 'edit') ? [{ label: 'Cambiar estado', handler: () => openStatusModal(reservation) }] : [])
          ]"
        />
      </template>
    </div>

    <!-- Empty State in Cards -->
    <div v-if="(isCards || isMobile) && store.reservations.length === 0 && !store.loading" class="text-center py-12 card">
      <p class="text-gray-600">No se encontraron reservas.</p>
      <button v-if="hasActiveFilters" type="button" class="mt-3 text-sm font-medium text-primary hover:text-primary-dark underline" @click="clearFilters">
        Limpiar filtros
      </button>
    </div>

    <PaymentModal
      v-if="selectedReservation"
      :isOpen="showPaymentModal"
      :reservationId="selectedReservation?.id || ''"
      :totalAmount="Number(selectedReservation?.total_amount || 0)"
      :paidAmount="Number(selectedReservation?.paid_amount || 0)"
      @close="closePaymentModal"
      @saved="handlePaymentSaved"
    />

    <StatusChangeModal
      v-if="selectedStatusReservation"
      :isOpen="showStatusModal"
      :reservationId="selectedStatusReservation.id"
      :currentStatus="selectedStatusReservation.status"
      :guestName="selectedStatusReservation.guest_display_name || selectedStatusReservation.guest_name || 'Sin nombre'"
      :hasGuest="Boolean(selectedStatusReservation.guest_id)"
      @close="closeStatusModal"
      @updated="handleStatusUpdated"
    />

    <BottomSheet
      v-model="showFiltersSheet"
      title="Filtros"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Buscar</label>
          <input
            v-model="filters.searchData"
            type="text"
            placeholder="Huésped, código o nro"
            class="mt-1 block min-h-[44px] w-full rounded-md border-gray-300 text-sm"
          >
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</label>
          <select v-model="filters.status" class="mt-1 block min-h-[44px] w-full rounded-md border-gray-300 text-sm">
            <option value="">Todos los estados</option>
            <option value="confirmed">Confirmada</option>
            <option value="in_stay">En estadía</option>
            <option value="completed">Finalizada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Origen</label>
          <select v-model="filters.sourceDetailId" class="mt-1 block min-h-[44px] w-full rounded-md border-gray-300 text-sm">
            <option value="">Cualquier origen</option>
            <option v-for="detail in sourceDetails" :key="detail.id" :value="detail.id">{{ detail.label_es }}</option>
          </select>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Check-in</label>
            <input v-model="filters.checkInFrom" type="date" class="mt-1 block min-h-[44px] w-full rounded-md border-gray-300 text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Check-out</label>
            <input v-model="filters.checkInTo" type="date" class="mt-1 block min-h-[44px] w-full rounded-md border-gray-300 text-sm">
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <button v-if="hasActiveFilters" type="button" class="text-sm font-medium text-gray-500 underline" @click="clearFilters">
            Limpiar filtros
          </button>
          <button type="button" class="btn-primary ml-auto" @click="showFiltersSheet = false">Aplicar</button>
        </div>
      </div>
    </BottomSheet>

    <router-link
      v-if="can('reservations', 'create') && isMobile"
      to="/reservar"
      class="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark"
    >
      + Registro
    </router-link>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import { useSourcesStore } from '../stores/sources'
import ReservationTable from '../components/reservations/ReservationTable.vue'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import DataCard from '../components/ui/DataCard.vue'
import PaymentModal from '../components/payments/PaymentModal.vue'
import StatusChangeModal from '../components/reservations/StatusChangeModal.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import { usePermissions } from '../composables/usePermissions'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useViewMode } from '../composables/useViewMode'

const store = useReservationsStore()
const sourcesStore = useSourcesStore()
const router = useRouter()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const { viewMode, isTable, isCards } = useViewMode('reservas')

const filters = ref({
  searchData: '',
  status: '',
  sourceDetailId: '',
  checkInFrom: '',
  checkInTo: '',
  sortBy: '',
  sortDir: ''
})

const sourceDetails = computed(() => sourcesStore.sourceDetails)

const pagination = ref({
  page: 1,
  pageSize: 25
})

const showPaymentModal = ref(false)
const selectedReservation = ref(null)
const showStatusModal = ref(false)
const selectedStatusReservation = ref(null)
const showFiltersSheet = ref(false)

const fetchList = async () => {
  await store.fetchReservations({
    search: filters.value.searchData,
    status: filters.value.status,
    sourceDetailId: filters.value.sourceDetailId,
    checkInFrom: filters.value.checkInFrom,
    checkInTo: filters.value.checkInTo,
    sortBy: filters.value.sortBy || 'check_in',
    sortDir: filters.value.sortDir || 'desc',
    paginated: true,
    page: pagination.value.page,
    pageSize: pagination.value.pageSize
  })
}

onMounted(async () => {
  await fetchList()
})

const hasActiveFilters = computed(() => {
  return filters.value.searchData !== '' || filters.value.status !== '' || filters.value.sourceDetailId !== '' || filters.value.checkInFrom !== '' || filters.value.checkInTo !== '' || filters.value.sortBy !== '' || filters.value.sortDir !== ''
})

const clearFilters = () => {
  filters.value = {
    searchData: '',
    status: '',
    sourceDetailId: '',
    checkInFrom: '',
    checkInTo: '',
    sortBy: '',
    sortDir: ''
  }
  pagination.value.page = 1
}

watch(() => [
  filters.value.searchData,
  filters.value.status,
  filters.value.sourceDetailId,
  filters.value.checkInFrom,
  filters.value.checkInTo,
  filters.value.sortDir
], async () => {
  pagination.value.page = 1
  await fetchList()
})

const onSortChange = async (sortKey) => {
  if (filters.value.sortBy !== sortKey) {
    filters.value.sortBy = sortKey
    filters.value.sortDir = 'asc'
    return
  }

  if (filters.value.sortDir === 'asc') {
    filters.value.sortDir = 'desc'
    return
  }

  if (filters.value.sortDir === 'desc') {
    filters.value.sortBy = ''
    filters.value.sortDir = ''
    return
  }

  filters.value.sortDir = 'asc'
}

const onPageChange = async (page) => {
  if (page < 1) return
  pagination.value.page = page
  await fetchList()
}

const goToDetail = (res) => {
  router.push(`/reservas/${res.id}`)
}

const openPaymentModal = (reservation) => {
  selectedReservation.value = reservation
  showPaymentModal.value = true
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  selectedReservation.value = null
}

const handlePaymentSaved = async () => {
  await fetchList()
}

const openStatusModal = (reservation) => {
  selectedStatusReservation.value = reservation
  showStatusModal.value = true
}

const closeStatusModal = () => {
  showStatusModal.value = false
  selectedStatusReservation.value = null
}

const handleStatusUpdated = async () => {
  await fetchList()
  closeStatusModal()
}
</script>







