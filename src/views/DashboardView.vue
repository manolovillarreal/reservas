<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
      <router-link to="/reservar" class="btn-primary">
        + Nueva reserva
      </router-link>
    </div>

    <!-- Active Alerts Banner -->
    <DeadlineAlert v-if="overdueReservations.length > 0" :show="true">
      <ul class="list-disc pl-5 space-y-1">
        <li v-for="res in overdueReservations" :key="res.id">
          <strong>{{ res.guest_display_name }}</strong> — reserva del {{ res.check_in }} tiene deadline de pago vencido.
          <router-link :to="`/reservas/${res.id}`" class="underline hover:text-orange-900 ml-2">Ver reserva &rarr;</router-link>
        </li>
      </ul>
    </DeadlineAlert>

    <!-- Metrics Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      
      <!-- Card 1 -->
      <div class="card">
        <p class="text-[13px] font-medium text-gray-500 mb-1">Reservas este mes</p>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.monthReservations }}</p>
      </div>

      <!-- Card 2 -->
      <div class="card">
        <p class="text-[13px] font-medium text-gray-500 mb-1">Ingresos brutos</p>
        <p class="text-3xl font-semibold text-gray-900">${{ formatCurrency(metrics.monthGrossIncome) }}</p>
      </div>

      <!-- Card 3 -->
      <div class="card">
        <p class="text-[13px] font-medium text-gray-500 mb-1">Ingresos netos</p>
        <p class="text-3xl font-semibold text-gray-900">${{ formatCurrency(metrics.monthNetIncome) }}</p>
      </div>

      <!-- Card 4 -->
      <div class="card" :class="{'ring-2 ring-amber-400': metrics.pendingCount > 0}">
        <p class="text-[13px] font-medium text-gray-500 mb-1 flex items-center justify-between">
          <span>Alertas operativas</span>
          <span v-if="metrics.pendingCount > 0" class="w-2 h-2 rounded-full bg-amber-500"></span>
        </p>
        <p class="text-3xl font-semibold" :class="metrics.pendingCount > 0 ? 'text-amber-600' : 'text-gray-900'">
          {{ metrics.pendingCount }}
        </p>
      </div>

      <!-- Card 5 -->
      <div class="card">
        <p class="text-[13px] font-medium text-gray-500 mb-1">Llegadas esta semana</p>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.arrivalsWeek }}</p>
      </div>

      <!-- Card 6 -->
      <div class="card">
        <p class="text-[13px] font-medium text-gray-500 mb-1">Salidas esta semana</p>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.departuresWeek }}</p>
      </div>

    </div>

    <!-- Weekly Mini Calendar Placeholder -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Ocupación (Próximos 7 días)</h2>
      <div class="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        
        <!-- Headers -->
        <div v-for="day in weekDays" :key="day.date" class="bg-gray-50 px-2 py-2 text-center">
          <p class="text-xs text-gray-500 font-medium uppercase">{{ day.dayName }}</p>
          <p class="text-sm font-semibold text-gray-900">{{ day.dateNumber }}</p>
        </div>

        <!-- Content Cells -->
        <div v-for="day in weekDays" :key="`content-${day.date}`" class="bg-white p-2 min-h-[120px]">
          <div v-for="res in getReservationsForDay(day.dateObject)" :key="res.id" 
               class="mb-1 p-1 text-xs rounded truncate cursor-pointer transition-transform hover:scale-[1.02]"
               :class="getMiniCalendarStyles(res.status)"
               @click="openDetails(res)"
               :title="res.guest_display_name"
          >
            {{ res.guest_display_name?.split(' ')[0] }}
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useReservationsStore } from '../stores/reservations'
import DeadlineAlert from '../components/ui/DeadlineAlert.vue'
import { getNetAmount } from '../utils/reservations'

const store = useReservationsStore()

const metrics = ref({
  monthReservations: 0,
  monthGrossIncome: 0,
  monthNetIncome: 0,
  pendingCount: 0,
  arrivalsWeek: 0,
  departuresWeek: 0,
})

const overdueReservations = ref([])
const weekDays = ref([])

onMounted(async () => {
  await store.fetchReservations()
  calculateMetrics()
  generateWeekDays()
})

const calculateMetrics = () => {
  const today = new Date()
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)
  
  let monthRes = 0
  let monthGross = 0
  let monthNet = 0
  let arrivals = 0
  let departures = 0

  store.reservations.forEach(res => {
    const checkIn = new Date(res.check_in)
    const checkOut = new Date(res.check_out)
    const deadline = res.payment_deadline ? new Date(res.payment_deadline) : null

    // Este Mes
    if (checkIn.getMonth() === today.getMonth() && checkIn.getFullYear() === today.getFullYear()) {
      monthRes++
      if (['confirmed', 'in_stay'].includes(res.status)) {
        monthGross += Number(res.total_amount || 0)
        monthNet += getNetAmount(res)
      }
    }

    // 7 días
    if (checkIn >= today && checkIn <= in7Days && res.status !== 'cancelled') {
      arrivals++
    }
    if (checkOut >= today && checkOut <= in7Days && ['in_stay', 'confirmed'].includes(res.status)) {
      departures++
    }
  })

  metrics.value = { monthReservations: monthRes, monthGrossIncome: monthGross, monthNetIncome: monthNet, pendingCount: 0, arrivalsWeek: arrivals, departuresWeek: departures }
  overdueReservations.value = []
}

const generateWeekDays = () => {
  const days = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      dateObject: d,
      date: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      dateNumber: d.getDate()
    })
  }
  weekDays.value = days
}

const getReservationsForDay = (dateObj) => {
  const dStr = dateObj.toISOString().split('T')[0]
  return store.reservations.filter(res => {
    // Basic inclusion (assuming full days for simple mini-calendar)
    if (res.status === 'cancelled') return false
    return dStr >= res.check_in && dStr < res.check_out // < checkout because leaving day is not occupied night
  })
}

const getMiniCalendarStyles = (status) => {
  const map = {
    confirmed: 'bg-blue-50 text-blue-700 border-l-2 border-blue-400',
    in_stay: 'bg-emerald-50 text-emerald-800 border-l-2 border-emerald-400',
    completed: 'bg-gray-100 text-gray-600',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}

const formatCurrency = (val) => {
  return val.toLocaleString('es-CO')
}

const openDetails = (res) => {
  console.log("Not implemented yet, goes to /reservas/:id", res.id)
}
</script>
