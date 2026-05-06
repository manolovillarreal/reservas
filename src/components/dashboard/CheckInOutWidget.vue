<template>
  <div class="card">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Entradas y Salidas</h2>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading"
          title="Copiar resumen"
          @click="copySummary"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M10 20h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <div class="day-toggle">
          <button
            type="button"
            :class="['day-toggle-btn', day === 'hoy' ? 'day-toggle-active' : '']"
            @click="day = 'hoy'"
          >Hoy</button>
          <button
            type="button"
            :class="['day-toggle-btn', day === 'manana' ? 'day-toggle-active' : '']"
            @click="day = 'manana'"
          >Manana</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-6 text-center text-sm text-gray-400">Cargando...</div>

    <div v-else class="grid grid-cols-2 gap-4">
      <!-- Entradas -->
      <div>
        <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          Entradas
          <span v-if="currentEntradas.length > 0" class="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700">{{ currentEntradas.length }}</span>
        </p>
        <p v-if="currentEntradas.length === 0" class="text-xs italic text-gray-400">Ninguna</p>
        <div v-else class="space-y-2">
          <button
            v-for="item in currentEntradas"
            :key="'e-' + item.reservationId"
            type="button"
            class="group w-full rounded-lg border border-l-2 border-emerald-300 bg-white px-3 py-2.5 text-left transition-shadow hover:border-gray-300 hover:shadow-sm"
            @click="goTo(item.reservationId)"
          >
            <p class="truncate text-sm font-semibold text-gray-900">{{ item.guestName }}</p>
            <div class="mt-1 flex items-center justify-between gap-1">
              <p class="truncate text-xs text-gray-500">{{ item.unitLabel }}</p>
              <ReservationBadge :status="item.status" class="shrink-0" />
            </div>
            <p v-if="item.estimatedArrivalLabel || item.flightNumber" class="mt-1 truncate text-xs text-gray-500">
              {{ item.estimatedArrivalLabel ? `Llega ${item.estimatedArrivalLabel}` : 'Llegada sin hora' }}<span v-if="item.flightNumber"> · Vuelo {{ item.flightNumber }}</span>
            </p>
          </button>
        </div>
      </div>

      <!-- Salidas -->
      <div>
        <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-700">
          <span class="inline-block h-2 w-2 rounded-full bg-orange-500"></span>
          Salidas
          <span v-if="currentSalidas.length > 0" class="ml-auto rounded-full bg-orange-100 px-1.5 py-0.5 text-orange-700">{{ currentSalidas.length }}</span>
        </p>
        <p v-if="currentSalidas.length === 0" class="text-xs italic text-gray-400">Ninguna</p>
        <div v-else class="space-y-2">
          <button
            v-for="item in currentSalidas"
            :key="'s-' + item.reservationId"
            type="button"
            class="group w-full rounded-lg border border-r-2 border-orange-300 bg-white px-3 py-2.5 text-left transition-shadow hover:border-gray-300 hover:shadow-sm"
            @click="goTo(item.reservationId)"
          >
            <p class="truncate text-sm font-semibold text-gray-900">{{ item.guestName }}</p>
            <div class="mt-1 flex items-center justify-between gap-1">
              <p class="truncate text-xs text-gray-500">{{ item.unitLabel }}</p>
              <ReservationBadge :status="item.status" class="shrink-0" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useToast } from '../../composables/useToast'
import ReservationBadge from '../ui/ReservationBadge.vue'
import { formatTime } from '../../utils/messageUtils'

const router = useRouter()
const accountStore = useAccountStore()
const toast = useToast()

const loading = ref(true)
const day = ref('hoy')

const todayEntradas = ref([])
const todaySalidas = ref([])
const tomorrowEntradas = ref([])
const tomorrowSalidas = ref([])

const currentEntradas = computed(() => day.value === 'hoy' ? todayEntradas.value : tomorrowEntradas.value)
const currentSalidas = computed(() => day.value === 'hoy' ? todaySalidas.value : tomorrowSalidas.value)

const goTo = (id) => {
  router.push('/reservas/' + id)
}

const buildVenueLines = (items = []) => {
  const venueMap = new Map()

  for (const item of items) {
    const entries = Array.isArray(item.unitEntries) && item.unitEntries.length
      ? item.unitEntries
      : [{ venueName: 'Sin sede', unitName: item.unitLabel || 'Sin asignar' }]

    for (const entry of entries) {
      const venueName = entry.venueName || 'Sin sede'
      const unitName = entry.unitName || 'Sin asignar'
      if (!venueMap.has(venueName)) {
        venueMap.set(venueName, new Set())
      }
      venueMap.get(venueName).add(unitName)
    }
  }

  const lines = []
  for (const [venueName, units] of venueMap.entries()) {
    lines.push(venueName)
    lines.push(...Array.from(units))
    lines.push('')
  }

  return lines.length ? lines.slice(0, -1) : ['Sin registros']
}

const buildArrivalSummary = (item) => {
  const parts = []
  if (item.estimatedArrivalLabel) parts.push(`hora ${item.estimatedArrivalLabel}`)
  if (item.flightNumber) parts.push(`vuelo ${item.flightNumber}`)
  return parts.length ? ` (${parts.join(' · ')})` : ''
}

const buildCopyText = () => {
  return [
    '➡️Salidas /',
    '',
    ...buildVenueLines(currentSalidas.value),
    '',
    '',
    '➡️Entradas /',
    '',
    ...buildVenueLines(currentEntradas.value),
    '',
    ...currentEntradas.value.map((item) => `${item.guestName} - ${item.unitLabel || 'Sin asignar'}${buildArrivalSummary(item)}`)
  ].join('\n')
}

const copySummary = async () => {
  try {
    await navigator.clipboard.writeText(buildCopyText())
    toast.success('Resumen copiado')
  } catch {
    toast.error('No se pudo copiar el resumen')
  }
}

const getLocalIso = (date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

onMounted(async () => {
  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    const todayDate = new Date()
    const tomorrowDate = new Date()
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)

    const today = getLocalIso(todayDate)
    const tomorrowIso = getLocalIso(tomorrowDate)

    const orFilter = 'start_date.eq.' + today + ',end_date.eq.' + today + ',start_date.eq.' + tomorrowIso + ',end_date.eq.' + tomorrowIso

    const { data, error } = await supabase
      .from('occupancies')
      .select('reservation_id, units(name, venues(name)), reservations!inner(id, status, check_in, check_out, estimated_arrival_time, flight_number, guests!reservations_guest_id_fkey(first_name, last_name))')
      .eq('account_id', accountId)
      .eq('occupancy_type', 'reservation')
      .or(orFilter)

    if (error) throw error

    const resMap = new Map()
    for (const row of data || []) {
      const res = row.reservations
      if (!res) continue
      const key = row.reservation_id
      if (!resMap.has(key)) {
        resMap.set(key, {
          reservationId: key,
          guestName: `${res.guests?.first_name || ''} ${res.guests?.last_name || ''}`.trim() || 'Huesped',
          status: res.status || '',
          checkIn: res.check_in ? String(res.check_in).slice(0, 10) : '',
          checkOut: res.check_out ? String(res.check_out).slice(0, 10) : '',
          estimatedArrivalLabel: formatTime(res.estimated_arrival_time) || null,
          flightNumber: res.flight_number || null,
          unitNames: [],
          unitEntries: [],
        })
      }
      const unitName = row.units?.name
      const venueName = row.units?.venues?.name || 'Sin sede'
      if (unitName && !resMap.get(key).unitNames.includes(unitName)) {
        resMap.get(key).unitNames.push(unitName)
      }
      if (unitName && !resMap.get(key).unitEntries.some((entry) => entry.unitName === unitName && entry.venueName === venueName)) {
        resMap.get(key).unitEntries.push({ venueName, unitName })
      }
    }

    const all = Array.from(resMap.values()).map((r) => ({
      ...r,
      unitLabel: r.unitNames.join(', '),
    }))

    todayEntradas.value = all.filter((r) => r.checkIn === today)
    todaySalidas.value = all.filter((r) => r.checkOut === today)
    tomorrowEntradas.value = all.filter((r) => r.checkIn === tomorrowIso)
    tomorrowSalidas.value = all.filter((r) => r.checkOut === tomorrowIso)
  } catch (e) {
    console.warn('[CheckInOutWidget] fetch failed:', e?.message)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.day-toggle {
  display: inline-flex;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}

.day-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 400;
  border: 1px solid #E5E7EB;
  margin: -1px;
  background: #FFFFFF;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-toggle-btn:first-child {
  border-radius: 6px 0 0 6px;
}

.day-toggle-btn:last-child {
  border-radius: 0 6px 6px 0;
}

.day-toggle-btn:hover {
  background: #F9FAFB;
  color: #4B5563;
}

.day-toggle-active {
  background: #EEF2FF;
  border-color: #4C2FFF;
  color: #4C2FFF;
  font-weight: 500;
}
</style>