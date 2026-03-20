<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Reservas</h1>
      <div class="flex items-center gap-3">
        <ViewModeToggle v-model="viewMode" class="hidden sm:flex" />
        <router-link v-if="can('reservations', 'create') && !isMobile" to="/reservar" class="btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Nueva reserva
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
      v-if="isTable"
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
    <div v-if="isCards && (store.reservations.length > 0 || store.loading)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <DataCard
        v-for="reservation in store.reservations"
        :key="reservation.id"
        :title="reservation.guest_display_name || reservation.guest_name || 'Sin nombre'"
        :subtitle="`${reservation.reservation_number} ${reservation.reference_code ? '· ' + reservation.reference_code : ''}`"
        :badge="{ 
          label: String(reservation.status || 'sin_estado').replace(/_/g, ' ').charAt(0).toUpperCase() + String(reservation.status || 'sin_estado').replace(/_/g, ' ').slice(1),
          type: reservation.status === 'confirmed' ? 'info' : reservation.status === 'in_stay' ? 'warning' : reservation.status === 'completed' ? 'success' : 'danger'
        }"
        :meta="[
          { label: 'Check-in', value: new Date(reservation.check_in_date).toLocaleDateString('es-CO') },
          { label: 'Check-out', value: new Date(reservation.check_out_date).toLocaleDateString('es-CO') },
          { label: 'Noches', value: reservation.nights_count || 0 },
          { label: 'Personas', value: `${reservation.adults_count || 0} adultos${reservation.children_count ? ' + ' + reservation.children_count + ' niños' : ''}` },
          { label: 'Unidad', value: reservation.unit_name || 'Sin asignar' },
          { label: 'Origen', value: reservation.source_detail || 'Directo' }
        ]"
        :actions="[
          { label: 'Ver detalle', handler: () => goToDetail(reservation) },
          ...(can('payments', 'create') ? [{ label: 'Registrar pago', handler: () => openPaymentModal(reservation) }] : []),
          ...(can('reservations', 'edit') ? [{ label: 'Cambiar estado', handler: () => openStatusModal(reservation) }] : [])
        ]"
      />
    </div>

    <!-- Empty State in Cards -->
    <div v-if="isCards && store.reservations.length === 0 && !store.loading" class="text-center py-12 card">
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
      + Reserva
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

const getLast30DaysRange = () => {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 29)

  const toIso = (date) => {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return adjusted.toISOString().slice(0, 10)
  }

  return {
    from: toIso(from),
    to: toIso(today)
  }
}

const defaultRange = getLast30DaysRange()

const filters = ref({
  searchData: '',
  status: '',
  sourceDetailId: '',
  checkInFrom: defaultRange.from,
  checkInTo: defaultRange.to,
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
  return filters.value.searchData !== '' || filters.value.status !== '' || filters.value.sourceDetailId !== '' || filters.value.checkInFrom !== defaultRange.from || filters.value.checkInTo !== defaultRange.to || filters.value.sortBy !== '' || filters.value.sortDir !== ''
})

const clearFilters = () => {
  filters.value = {
    searchData: '',
    status: '',
    sourceDetailId: '',
    checkInFrom: defaultRange.from,
    checkInTo: defaultRange.to,
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







