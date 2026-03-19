<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Reservas</h1>
      <router-link v-if="can('reservations', 'create')" to="/reservar" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        Nueva reserva
      </router-link>
    </div>

    <!-- Filters Bar -->
    <div class="card !py-4 flex flex-wrap gap-4 items-center bg-white">
      
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
            placeholder="Buscar huésped..." 
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
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Ingreso desde</label>
        <input v-model="filters.checkInFrom" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
      </div>

      <div class="w-full md:w-40">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Ingreso hasta</label>
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

    <!-- Table -->
    <ReservationTable 
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
    />

    <PaymentModal
      v-if="selectedReservation"
      :isOpen="showPaymentModal"
      :reservationId="selectedReservation?.id || ''"
      :totalAmount="Number(selectedReservation?.total_amount || 0)"
      :paidAmount="Number(selectedReservation?.paid_amount || 0)"
      @close="closePaymentModal"
      @saved="handlePaymentSaved"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import { useSourcesStore } from '../stores/sources'
import ReservationTable from '../components/reservations/ReservationTable.vue'
import PaymentModal from '../components/payments/PaymentModal.vue'
import { usePermissions } from '../composables/usePermissions'

const store = useReservationsStore()
const sourcesStore = useSourcesStore()
const router = useRouter()
const { can } = usePermissions()

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
  sortBy: 'check_in',
  sortDir: 'desc'
})

const sourceDetails = computed(() => sourcesStore.sourceDetails)

const pagination = ref({
  page: 1,
  pageSize: 25
})

const showPaymentModal = ref(false)
const selectedReservation = ref(null)

const fetchList = async () => {
  await store.fetchReservations({
    search: filters.value.searchData,
    status: filters.value.status,
    sourceDetailId: filters.value.sourceDetailId,
    checkInFrom: filters.value.checkInFrom,
    checkInTo: filters.value.checkInTo,
    sortBy: filters.value.sortBy,
    sortDir: filters.value.sortDir,
    paginated: true,
    page: pagination.value.page,
    pageSize: pagination.value.pageSize
  })
}

onMounted(async () => {
  await fetchList()
})

const hasActiveFilters = computed(() => {
  return filters.value.searchData !== '' || filters.value.status !== '' || filters.value.sourceDetailId !== '' || filters.value.checkInFrom !== defaultRange.from || filters.value.checkInTo !== defaultRange.to || filters.value.sortDir !== 'desc'
})

const clearFilters = () => {
  filters.value = {
    searchData: '',
    status: '',
    sourceDetailId: '',
    checkInFrom: defaultRange.from,
    checkInTo: defaultRange.to,
    sortBy: 'check_in',
    sortDir: 'desc'
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
  if (filters.value.sortBy === sortKey) {
    filters.value.sortDir = filters.value.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    filters.value.sortBy = sortKey
    filters.value.sortDir = 'desc'
  }
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
</script>
