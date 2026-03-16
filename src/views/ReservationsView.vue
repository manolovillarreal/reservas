<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Reservas</h1>
      <router-link to="/reservar" class="btn-primary flex items-center gap-2">
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
        <select v-model="filters.source" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option value="">Cualquier origen</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="telefono">Teléfono</option>
          <option value="directo">Directo</option>
          <option value="agencia">Agencia</option>
        </select>
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
      :reservations="filteredReservations" 
      :loading="store.loading" 
      @view="goToDetail"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import ReservationTable from '../components/reservations/ReservationTable.vue'

const store = useReservationsStore()
const router = useRouter()

const filters = ref({
  searchData: '',
  status: '',
  source: '',
})

onMounted(async () => {
  await store.fetchReservations()
})

const hasActiveFilters = computed(() => {
  return filters.value.searchData !== '' || filters.value.status !== '' || filters.value.source !== ''
})

const clearFilters = () => {
  filters.value = { searchData: '', status: '', source: '' }
}

const filteredReservations = computed(() => {
  return store.reservations.filter(res => {
    // text search
    if (filters.value.searchData) {
      const q = filters.value.searchData.toLowerCase()
      const gn = res.guest_display_name?.toLowerCase() || ''
      if (!gn.includes(q)) return false
    }
    // status
    if (filters.value.status && res.status !== filters.value.status) return false
    // source
    if (filters.value.source && res.source !== filters.value.source) return false

    return true
  })
})

const goToDetail = (res) => {
  router.push(`/reservas/${res.id}`)
}
</script>
