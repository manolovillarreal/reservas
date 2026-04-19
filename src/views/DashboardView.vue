<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
      <router-link to="/reservar" class="btn-primary">
        + Nuevo Registro
      </router-link>
    </div>

    <p v-if="isOffline && hasSyncTimestamp" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      Última actualización: {{ lastSyncLabel }}
    </p>

    <AlertsWidget />
    <NotificationsWidget />

    <AvailabilityWidget />

    <!-- Metrics Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      
      <!-- Card 1 -->
      <div class="card">
        <p class="text-[13px] font-medium text-gray-500 mb-1">Reservas activas</p>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.monthReservations }}</p>
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
          <div v-for="res in getReservationsForDay(day.dateObject)" :key="res.id + '-' + res._dayType"
               class="mb-1 text-xs rounded cursor-pointer transition-transform hover:scale-[1.02]"
               :class="[getMiniCalendarStyles(res.status, res._dayType), res._dayType === 'checkout' ? 'px-1 py-0.5' : 'p-1']"
               @click="openDetails(res)"
               :title="(res.guest_display_name || 'Reserva') + ' · ' + (res.unit_names_display || 'Sin unidades')"
          >
            <template v-if="res._dayType === 'checkout'">
              <p class="truncate">🚪 {{ res.guest_display_name?.split(' ')[0] || '' }}</p>
            </template>
            <template v-else>
              <p class="truncate font-medium">{{ res.guest_display_name?.split(' ')[0] || 'Reserva' }}</p>
              <p class="truncate opacity-80">{{ res.unit_names_display || 'Sin unidad' }}</p>
            </template>
          </div>
        </div>

      </div>
    </div>

    <CheckInOutWidget />

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCachedTimestamp } from '../composables/useConnectivity'
import { useReservationsStore } from '../stores/reservations'
import { useToast } from '../composables/useToast'
import AvailabilityWidget from '../components/dashboard/AvailabilityWidget.vue'
import { useNotificationsStore } from '../stores/notifications'
import AlertsWidget from '../components/dashboard/AlertsWidget.vue'
import NotificationsWidget from '../components/dashboard/NotificationsWidget.vue'
import CheckInOutWidget from '../components/dashboard/CheckInOutWidget.vue'

const store = useReservationsStore()
const router = useRouter()
const toast = useToast()
const notificationsStore = useNotificationsStore()
const { isOnline, isOffline, lastSyncLabel, hasSyncTimestamp } = useCachedTimestamp('dashboard')

const currentWeekStart = ref(new Date())

const metrics = ref({
  monthReservations: 0,
  pendingCount: 0,
  arrivalsWeek: 0,
  departuresWeek: 0,
})

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

const formatRangeDate = (isoDate) => {
  if (!isoDate) return '-'
  return new Date(isoDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const preregPendingReservations = computed(() => {
  const today = new Date()
  const maxDate = shiftDays(today, 7)
  const todayIso = toIsoDate(today)
  const maxIso = toIsoDate(maxDate)

  return store.reservations.filter((res) => {
    if (res.status !== 'confirmed') return false
    if (!res.check_in) return false
    if (res.preregistro_completado === true) return false
    return res.check_in >= todayIso && res.check_in <= maxIso
  })
})

const weekRangeLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  return `${formatRangeDate(weekDays.value[0].date)} - ${formatRangeDate(weekDays.value[6].date)}`
})

onMounted(async () => {
  await store.fetchReservations()
  notificationsStore.fetchNotifications()
  calculateMetrics()
  generateWeekDays()
})

watch(isOnline, async (value, previousValue) => {
  if (value && previousValue === false) {
    await store.fetchReservations()
    notificationsStore.fetchNotifications()
    calculateMetrics()
  }
})

const calculateMetrics = () => {
  const today = new Date()
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)
  
  let monthRes = 0
  let arrivals = 0
  let departures = 0

  store.reservations.forEach(res => {
    const checkIn = new Date(res.check_in)
    const checkOut = new Date(res.check_out)

    if (['confirmed', 'in_stay'].includes(res.status)) monthRes++

    // 7 días
    if (checkIn >= today && checkIn <= in7Days && res.status !== 'cancelled') {
      arrivals++
    }
    if (checkOut >= today && checkOut <= in7Days && ['in_stay', 'confirmed'].includes(res.status)) {
      departures++
    }
  })

  metrics.value = {
    monthReservations: monthRes,
    pendingCount: preregPendingReservations.value.length,
    arrivalsWeek: arrivals,
    departuresWeek: departures
  }
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
  const items = []
  for (const res of store.reservations) {
    if (res.status === 'cancelled') continue
    if (dStr === res.check_out) {
      // Día de salida: mostrar stub compacto de checkout
      items.push({ ...res, _dayType: 'checkout' })
    } else if (dStr >= res.check_in && dStr < res.check_out) {
      items.push({ ...res, _dayType: dStr === res.check_in ? 'checkin' : 'stay' })
    }
  }
  // Checkouts primero — salen por la mañana, los entrantes van después
  items.sort((a, b) => (a._dayType === 'checkout' ? 0 : 1) - (b._dayType === 'checkout' ? 0 : 1))
  return items
}

const getMiniCalendarStyles = (status, dayType) => {
  if (dayType === 'checkout') {
    const map = {
      confirmed: 'bg-blue-50 text-blue-400 border-r-2 border-blue-300',
      in_stay: 'bg-emerald-50 text-emerald-500 border-r-2 border-emerald-300',
      completed: 'bg-gray-100 text-gray-400',
    }
    return map[status] || 'bg-gray-100 text-gray-400'
  }
  const map = {
    confirmed: 'bg-blue-50 text-blue-700 border-l-2 border-blue-400',
    in_stay: 'bg-emerald-50 text-emerald-800 border-l-2 border-emerald-400',
    completed: 'bg-gray-100 text-gray-600',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}

const openDetails = (res) => {
  if (!res?.id) return
  router.push(`/reservas/${res.id}`)
}
</script>
