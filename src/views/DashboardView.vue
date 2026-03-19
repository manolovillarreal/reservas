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

    <div class="card !py-4 flex flex-wrap items-end gap-4 bg-white">
      <div class="w-full md:w-64">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Rango de ingresos</label>
        <select v-model="incomeFilterPreset" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          <option value="last_week">Ultima semana</option>
          <option value="this_month">Este mes</option>
          <option value="last_30_days">Ultimo mes (30 dias)</option>
          <option value="custom">Rango personalizado</option>
        </select>
      </div>

      <div v-if="incomeFilterPreset === 'this_month'" class="rounded-md border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-sm font-medium text-[#2D1B69]">
        {{ currentMonthLabel }}
      </div>

      <div v-if="incomeFilterPreset === 'custom'" class="w-full md:w-44">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Desde</label>
        <input v-model="customIncomeRange.from" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
      </div>

      <div v-if="incomeFilterPreset === 'custom'" class="w-full md:w-44">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Hasta</label>
        <input v-model="customIncomeRange.to" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
      </div>
    </div>

    <!-- Metrics Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      
      <!-- Card 1 -->
      <div class="card">
        <p class="text-[13px] font-medium text-gray-500 mb-1">Reservas ({{ incomeRangeLabel }})</p>
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
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Ocupacion semanal</h2>
        <div class="flex items-center gap-2">
          <button class="btn-secondary text-sm" @click="goToPreviousWeek">Anterior</button>
          <span class="text-sm text-gray-600">{{ weekRangeLabel }}</span>
          <button class="btn-secondary text-sm" @click="goToNextWeek">Siguiente</button>
        </div>
      </div>
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
               :title="`${res.guest_display_name || 'Reserva'} · ${res.unit_names_display || 'Sin unidades'}`"
          >
            <p class="truncate font-medium">{{ res.guest_display_name?.split(' ')[0] || 'Reserva' }}</p>
            <p class="truncate opacity-80">{{ res.unit_names_display || 'Sin unidad' }}</p>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import DeadlineAlert from '../components/ui/DeadlineAlert.vue'
import { getNetAmount } from '../utils/reservations'

const store = useReservationsStore()
const router = useRouter()

const incomeFilterPreset = ref('last_week')
const customIncomeRange = ref({
  from: '',
  to: ''
})
const currentWeekStart = ref(new Date())

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

const toIsoDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

const shiftDays = (value, days) => {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

const getIncomeRange = () => {
  const today = new Date()
  const todayIso = toIsoDate(today)

  if (incomeFilterPreset.value === 'this_month') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      from: toIsoDate(monthStart),
      to: todayIso
    }
  }

  if (incomeFilterPreset.value === 'last_30_days') {
    return {
      from: toIsoDate(shiftDays(today, -29)),
      to: todayIso
    }
  }

  if (incomeFilterPreset.value === 'custom') {
    return {
      from: customIncomeRange.value.from || null,
      to: customIncomeRange.value.to || null
    }
  }

  return {
    from: toIsoDate(shiftDays(today, -6)),
    to: todayIso
  }
}

const formatRangeDate = (isoDate) => {
  if (!isoDate) return '-'
  return new Date(isoDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const incomeRangeLabel = computed(() => {
  const range = getIncomeRange()
  if (!range.from || !range.to) return 'rango personalizado'
  return `${formatRangeDate(range.from)} - ${formatRangeDate(range.to)}`
})

const currentMonthLabel = computed(() => {
  if (incomeFilterPreset.value !== 'this_month') return ''

  const monthLabel = new Date().toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  })

  return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
})

const weekRangeLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  return `${formatRangeDate(weekDays.value[0].date)} - ${formatRangeDate(weekDays.value[6].date)}`
})

onMounted(async () => {
  await store.fetchReservations()
  calculateMetrics()
  generateWeekDays()
})

watch([incomeFilterPreset, customIncomeRange], () => {
  calculateMetrics()
}, { deep: true })

const calculateMetrics = () => {
  const today = new Date()
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)
  const incomeRange = getIncomeRange()
  
  let monthRes = 0
  let monthGross = 0
  let monthNet = 0
  let arrivals = 0
  let departures = 0

  store.reservations.forEach(res => {
    const checkIn = new Date(res.check_in)
    const checkOut = new Date(res.check_out)
    const deadline = res.payment_deadline ? new Date(res.payment_deadline) : null

    const checkInIso = toIsoDate(checkIn)
    const inIncomeRange = (!incomeRange.from || checkInIso >= incomeRange.from) && (!incomeRange.to || checkInIso <= incomeRange.to)

    if (inIncomeRange) {
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
  const start = new Date(currentWeekStart.value)
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({
      dateObject: d,
      date: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      dateNumber: d.getDate()
    })
  }
  weekDays.value = days
}

const goToPreviousWeek = () => {
  currentWeekStart.value = shiftDays(currentWeekStart.value, -7)
  generateWeekDays()
}

const goToNextWeek = () => {
  currentWeekStart.value = shiftDays(currentWeekStart.value, 7)
  generateWeekDays()
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
    confirmed: 'bg-[#EEF2FF] text-[#2D1B69] border-l-2 border-[#C7D2FE]',
    in_stay: 'bg-[#ECFDF5] text-[#065F46] border-l-2 border-[#6EE7B7]',
    completed: 'bg-[#F9FAFB] text-[#6B7280] border-l-2 border-[#E5E7EB]',
    cancelled: 'bg-[#F3F4F6] text-[#9CA3AF] border-l-2 border-[#E5E7EB]',
  }
  return map[status] || 'bg-[#F9FAFB] text-[#6B7280] border-l-2 border-[#E5E7EB]'
}

const formatCurrency = (val) => {
  return val.toLocaleString('es-CO')
}

const openDetails = (res) => {
  if (!res?.id) return
  router.push(`/reservas/${res.id}`)
}
</script>
