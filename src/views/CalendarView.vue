<template>
  <div class="space-y-6 p-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-800">Calendario Marmanu House</h1>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Vista</label>
          <select v-model="viewMode" class="mt-1 rounded-md border-gray-300 text-sm">
            <option value="clasica">Clasica</option>
            <option value="completa">Completa</option>
            <option value="por_unidad">Por unidad</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Periodo</label>
          <select v-model="periodPreset" class="mt-1 rounded-md border-gray-300 text-sm">
            <option value="today">Hoy</option>
            <option value="this_week">Esta semana</option>
            <option value="next_30">Proximos 30 dias</option>
            <option value="this_month">Este mes</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <div v-if="periodPreset === 'custom'">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Desde</label>
          <input v-model="periodFrom" type="date" class="mt-1 rounded-md border-gray-300 text-sm">
        </div>

        <div v-if="periodPreset === 'custom'">
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Hasta</label>
          <input v-model="periodTo" type="date" class="mt-1 rounded-md border-gray-300 text-sm">
        </div>

        <div v-if="periodPreset === 'this_week'" class="flex items-center gap-2 self-end">
          <button class="btn-secondary text-sm" @click="goToPreviousWeek">Semana anterior</button>
          <span class="text-sm text-gray-600">{{ weekRangeLabel }}</span>
          <button class="btn-secondary text-sm" @click="goToNextWeek">Semana siguiente</button>
        </div>
      </div>
    </div>

    <div
      v-if="viewMode === 'completa' || viewMode === 'por_unidad'"
      class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtro de sedes</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <label
          v-for="venue in venues"
          :key="`venue-filter-${venue.id}`"
          class="inline-flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
        >
          <input
            type="checkbox"
            :value="venue.id"
            :checked="selectedVenueIds.includes(venue.id)"
            @change="toggleVenueFilter(venue.id)"
            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          >
          <span>{{ venue.name }}</span>
        </label>
      </div>
    </div>

    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div class="mb-6 flex flex-wrap gap-4 text-sm font-medium text-gray-600">
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-blue-500"></span> Reserva</span>
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-orange-500"></span> Mantenimiento</span>
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-purple-500"></span> Uso propietario</span>
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-amber-500"></span> Hold temporal</span>
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-gray-500"></span> Externo</span>
      </div>

      <div v-if="loading" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
        Cargando ocupaciones...
      </div>

      <div v-else-if="periodPreset === 'today'" class="space-y-3">
        <div v-if="todayAgendaEvents.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No hay eventos para hoy.
        </div>

        <button
          v-for="event in todayAgendaEvents"
          :key="`agenda-${event.id}`"
          type="button"
          class="w-full rounded-md border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm"
          @click="goToOccupancyDetail(event.sourceOccupancy)"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold text-gray-900">{{ event.unitLabel }}</p>
            <span
              v-if="event.eventType !== 'Estadia'"
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="event.eventType === 'Entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'"
            >
              {{ event.eventType }}
            </span>
          </div>

          <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
            <span>{{ event.pax }} pax</span>
            <span class="capitalize">{{ event.source || 'Sin origen' }}</span>
            <span v-if="event.balance > 0" class="font-semibold text-red-600">Saldo: ${{ formatCurrency(event.balance) }}</span>
          </div>
        </button>
      </div>

      <div v-else-if="periodPreset === 'this_week'" class="grid grid-cols-1 gap-3 md:grid-cols-7">
        <div
          v-for="day in weekDays"
          :key="`week-${day.date}`"
          class="rounded-md border border-gray-200 bg-white p-2"
        >
          <p class="text-xs uppercase text-gray-500">{{ day.dayName }}</p>
          <p class="text-sm font-semibold text-gray-800">{{ formatDate(day.date) }}</p>

          <div class="mt-2 space-y-1">
            <button
              v-for="occ in getOccupanciesForDay(day.date)"
              :key="`week-occ-${occ.id}`"
              data-occ-trigger="true"
              type="button"
              class="block w-full truncate rounded px-2 py-1 text-left text-xs text-white"
              :class="occupancyColor(occ)"
              @mouseenter="openDesktopTooltip($event, occ, day.date)"
              @mousemove="openDesktopTooltip($event, occ, day.date)"
              @mouseleave="closeDesktopTooltip"
              @click="onOccupancyClick($event, occ, day.date)"
            >
              {{ getOccupancyDisplayLabel(occ, viewMode) }}
            </button>
            <p v-if="getOccupanciesForDay(day.date).length === 0" class="text-xs text-gray-400">Sin eventos</p>
          </div>
        </div>
      </div>

      <div v-else-if="viewMode === 'clasica'" class="grid grid-cols-7 gap-px border border-gray-200 bg-gray-200">
        <div
          v-for="day in calendarDays"
          :key="`classic-day-${day.date}`"
          class="min-h-[120px] bg-white p-2 transition-colors hover:bg-gray-50"
        >
          <div class="text-right text-sm font-semibold text-gray-400">{{ day.dayNumber }}</div>

          <button
            v-for="occ in getOccupanciesForDay(day.date)"
            :key="`classic-occ-${occ.id}`"
            data-occ-trigger="true"
            type="button"
            class="mt-1 block w-full truncate rounded p-1.5 text-left text-xs text-white shadow-sm"
            :class="occupancyColor(occ)"
            @mouseenter="openDesktopTooltip($event, occ, day.date)"
            @mousemove="openDesktopTooltip($event, occ, day.date)"
            @mouseleave="closeDesktopTooltip"
            @click="onOccupancyClick($event, occ, day.date)"
          >
            {{ getOccupancyDisplayLabel(occ, 'clasica') }}
          </button>
        </div>
      </div>

      <div v-else-if="viewMode === 'completa'" class="space-y-4">
        <div v-if="visibleVenues.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No hay sedes seleccionadas para mostrar.
        </div>

        <div v-for="venue in visibleVenues" :key="`venue-box-${venue.id}`" class="rounded-md border border-gray-200 bg-white">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left"
            @click="toggleVenueCollapse(venue.id)"
          >
            <span class="font-semibold text-gray-800">{{ venue.name }}</span>
            <span class="text-sm text-gray-500">{{ isVenueCollapsed(venue.id) ? '+' : '-' }}</span>
          </button>

          <div v-if="!isVenueCollapsed(venue.id)" class="overflow-x-auto border-t border-gray-100 p-3">
            <table class="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th class="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-700">Habitacion</th>
                  <th
                    v-for="day in calendarDays"
                    :key="`complete-head-${venue.id}-${day.date}`"
                    class="border border-gray-200 bg-gray-50 px-2 py-2 text-center font-semibold text-gray-600"
                  >
                    {{ day.dayNumber }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="unit in getUnitsByVenue(venue.id)" :key="`complete-unit-${unit.id}`">
                  <td class="sticky left-0 border border-gray-200 bg-white px-3 py-2 font-medium text-gray-700">{{ unit.name }}</td>
                  <td :colspan="calendarDays.length" class="border border-gray-200 p-1">
                    <div class="relative" :style="timelineGridStyle">
                      <div class="pointer-events-none absolute inset-0 grid" :style="timelineGridStyle">
                        <div
                          v-for="day in calendarDays"
                          :key="`complete-bg-${unit.id}-${day.date}`"
                          class="border-r border-gray-100 last:border-r-0"
                        ></div>
                      </div>

                      <div class="relative grid gap-1" :style="timelineGridStyle">
                        <button
                          v-for="segment in getUnitSegmentsForComplete(unit.id)"
                          :key="`complete-segment-${segment.id}-${segment.colStart}-${segment.colEnd}`"
                          data-occ-trigger="true"
                          type="button"
                          class="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] text-white"
                          :class="occupancyColor(segment)"
                          :style="{ gridColumn: `${segment.colStart} / ${segment.colEnd}` }"
                          @mouseenter="openDesktopTooltip($event, segment, segment.contextDate)"
                          @mousemove="openDesktopTooltip($event, segment, segment.contextDate)"
                          @mouseleave="closeDesktopTooltip"
                          @click="onOccupancyClick($event, segment, segment.contextDate)"
                        >
                          {{ getOccupancyDisplayLabel(segment, 'completa') }}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div v-if="visibleVenues.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No hay sedes seleccionadas para mostrar.
        </div>

        <div v-for="venue in visibleVenues" :key="`unit-group-${venue.id}`" class="rounded-md border border-gray-200 bg-white">
          <div class="border-b border-gray-100 px-4 py-3">
            <h3 class="font-semibold text-gray-800">{{ venue.name }}</h3>
          </div>

          <div class="space-y-2 p-3">
            <div v-for="unit in getUnitsByVenue(venue.id)" :key="`unit-collapse-${unit.id}`" class="rounded-md border border-gray-200">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left"
                @click="toggleUnitCollapse(unit.id)"
              >
                <span class="text-sm font-medium text-gray-800">{{ unit.name }}</span>
                <span class="text-sm text-gray-500">{{ isUnitCollapsed(unit.id) ? '+' : '-' }}</span>
              </button>

              <div v-if="!isUnitCollapsed(unit.id)" class="space-y-1 border-t border-gray-100 p-3">
                <button
                  v-for="occ in getUnitOccupancies(unit.id)"
                  :key="`unit-occ-${occ.id}`"
                  data-occ-trigger="true"
                  type="button"
                  class="block w-full truncate rounded px-2 py-1 text-left text-xs text-white"
                  :class="occupancyColor(occ)"
                  @mouseenter="openDesktopTooltip($event, occ, null)"
                  @mousemove="openDesktopTooltip($event, occ, null)"
                  @mouseleave="closeDesktopTooltip"
                  @click="onOccupancyClick($event, occ, null)"
                >
                  {{ getOccupancyDisplayLabel(occ, 'por_unidad') }} · {{ occ.start_date }} -> {{ occ.end_date }}
                </button>

                <p v-if="getUnitOccupancies(unit.id).length === 0" class="text-xs text-gray-500">Sin ocupaciones en el periodo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="tooltip.visible && periodPreset !== 'today'"
      ref="tooltipRef"
      class="fixed z-[120] w-80 rounded-md border border-gray-200 bg-white p-3 shadow-xl"
      :style="{ left: `${tooltip.position.x}px`, top: `${tooltip.position.y}px` }"
      @click.stop
    >
      <p class="text-sm font-semibold text-gray-900">{{ tooltipDetails.unitName }}</p>
      <p class="mt-1 text-xs font-medium text-gray-600">Tipo: {{ tooltipDetails.typeLabel }}</p>
      <p class="mt-1 text-xs text-gray-600">Fechas: {{ tooltipDetails.dateRange }}</p>
      <p class="mt-1 text-xs text-gray-600">Noches: {{ tooltipDetails.nights }}</p>
      <p v-if="tooltipDetails.holderName" class="mt-1 text-xs text-gray-600">Titular: {{ tooltipDetails.holderName }}</p>

      <p v-if="tooltipDetails.paxLabel" class="mt-1 text-xs text-gray-600">Personas: {{ tooltipDetails.paxLabel }}</p>
      <p v-if="tooltipDetails.sourceLabel" class="mt-1 text-xs text-gray-600">Origen: {{ tooltipDetails.sourceLabel }}</p>
      <p v-if="tooltipDetails.balance > 0" class="mt-1 text-xs font-semibold text-red-600">Saldo pendiente: ${{ formatCurrency(tooltipDetails.balance) }}</p>
      <p v-if="tooltipDetails.reason" class="mt-1 text-xs text-gray-600">Motivo: {{ tooltipDetails.reason }}</p>

      <div v-if="isTouchDevice" class="mt-3 border-t border-gray-100 pt-2">
        <button
          type="button"
          class="btn-secondary text-sm"
          @click="goToOccupancyDetail(tooltip.occupancy)"
        >
          Ver detalle
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'

const router = useRouter()
const accountStore = useAccountStore()

const occupancies = ref([])
const units = ref([])
const venues = ref([])
const loading = ref(false)

const viewMode = ref('clasica')
const periodPreset = ref('next_30')
const periodFrom = ref('')
const periodTo = ref('')
const weekStart = ref(getWeekStartMonday(new Date()))

const selectedVenueIds = ref([])
const collapsedVenues = ref({})
const collapsedUnits = ref({})

const tooltip = ref({
  visible: false,
  occupancy: null,
  contextDate: null,
  position: { x: 0, y: 0 }
})
const tooltipRef = ref(null)
const isTouchDevice = ref(false)

function toIsoDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}

function addDays(value, days) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function getWeekStartMonday(value) {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(date, diff)
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO')
}

function applyPreset() {
  const today = new Date()

  if (periodPreset.value === 'today') {
    const todayIso = toIsoDate(today)
    periodFrom.value = todayIso
    periodTo.value = todayIso
    return
  }

  if (periodPreset.value === 'this_week') {
    periodFrom.value = toIsoDate(weekStart.value)
    periodTo.value = toIsoDate(addDays(weekStart.value, 6))
    return
  }

  if (periodPreset.value === 'this_month') {
    periodFrom.value = toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1))
    periodTo.value = toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    return
  }

  if (periodPreset.value === 'custom') {
    if (!periodFrom.value || !periodTo.value) {
      periodFrom.value = toIsoDate(today)
      periodTo.value = toIsoDate(addDays(today, 29))
    }
    return
  }

  periodFrom.value = toIsoDate(today)
  periodTo.value = toIsoDate(addDays(today, 29))
}

const calendarDays = computed(() => {
  if (!periodFrom.value || !periodTo.value) return []

  const start = new Date(periodFrom.value)
  const end = new Date(periodTo.value)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []

  const days = []
  const cursor = new Date(start)
  while (cursor <= end) {
    days.push({
      date: toIsoDate(cursor),
      dayNumber: cursor.getDate()
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
})

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart.value, i)
    days.push({
      date: toIsoDate(date),
      dayName: date.toLocaleDateString('es-ES', { weekday: 'short' })
    })
  }
  return days
})

const weekRangeLabel = computed(() => {
  return `${formatDate(toIsoDate(weekStart.value))} - ${formatDate(toIsoDate(addDays(weekStart.value, 6)))}`
})

const timelineGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(calendarDays.value.length, 1)}, minmax(0, 1fr))`
}))

const selectedVenueSet = computed(() => new Set(selectedVenueIds.value))

const visibleVenues = computed(() => {
  if (selectedVenueSet.value.size === 0) return venues.value
  return venues.value.filter((venue) => selectedVenueSet.value.has(venue.id))
})

const filteredOccupancies = computed(() => {
  if (selectedVenueSet.value.size === 0) return occupancies.value
  return occupancies.value.filter((occ) => selectedVenueSet.value.has(occ.units?.venue_id))
})

const todayAgendaEvents = computed(() => {
  if (periodPreset.value !== 'today') return []

  const todayIso = periodFrom.value
  const grouped = new Map()

  filteredOccupancies.value
    .filter((occ) => occ.occupancy_type === 'reservation')
    .forEach((occ) => {
      const checkIn = occ.reservations?.check_in || occ.start_date
      const checkOut = occ.reservations?.check_out || occ.end_date
      const isEntry = checkIn === todayIso
      const isExit = checkOut === todayIso
      const inStay = todayIso > checkIn && todayIso < checkOut

      if (!isEntry && !isExit && !inStay) return

      const key = occ.reservation_id || occ.id
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          sourceOccupancy: occ,
          unitNames: new Set(),
          eventType: isEntry ? 'Entrada' : isExit ? 'Salida' : 'Estadia',
          pax: Number(occ.reservations?.adults || 0) + Number(occ.reservations?.children || 0),
          source: occ.reservations?.source || '',
          balance: Math.max(0, Number(occ.reservations?.total_amount || 0) - Number(occ.reservations?.paid_amount || 0))
        })
      }

      grouped.get(key).unitNames.add(occ.units?.name || 'Unidad')
    })

  return Array.from(grouped.values()).map((event) => ({
    ...event,
    unitLabel: Array.from(event.unitNames).join(', ')
  }))
})

async function fetchMasterData() {
  const accountId = accountStore.getRequiredAccountId()
  const [{ data: venuesData }, { data: unitsData }] = await Promise.all([
    supabase.from('venues').select('id, name').eq('account_id', accountId).order('name', { ascending: true }),
    supabase.from('units').select('id, name, venue_id').eq('account_id', accountId).eq('is_active', true).order('name', { ascending: true })
  ])

  venues.value = venuesData || []
  units.value = unitsData || []

  if (selectedVenueIds.value.length === 0) {
    selectedVenueIds.value = (venues.value || []).map((venue) => venue.id)
  }
}

async function fetchOccupancies() {
  if (!periodFrom.value || !periodTo.value) return

  loading.value = true

  try {
    const toExclusive = toIsoDate(addDays(new Date(periodTo.value), 1))

    const accountId = accountStore.getRequiredAccountId()
    const { data } = await supabase
      .from('occupancies')
      .select('id, unit_id, start_date, end_date, occupancy_type, reservation_id, inquiry_id, notes, units(name, venue_id, venues(name)), reservations(id, guest_name, adults, children, source, total_amount, paid_amount, check_in, check_out)')
      .eq('account_id', accountId)
      .lt('start_date', toExclusive)
      .gt('end_date', periodFrom.value)
      .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')

    occupancies.value = data || []
  } finally {
    loading.value = false
  }
}

function getUnitsByVenue(venueId) {
  return units.value.filter((unit) => unit.venue_id === venueId)
}

function getOccupanciesForDay(dateStr) {
  return filteredOccupancies.value.filter((occ) => dateStr >= occ.start_date && dateStr < occ.end_date)
}

function getUnitOccupanciesForDay(unitId, dateStr) {
  return filteredOccupancies.value.filter((occ) => occ.unit_id === unitId && dateStr >= occ.start_date && dateStr < occ.end_date)
}

function getUnitOccupancies(unitId) {
  return filteredOccupancies.value
    .filter((occ) => occ.unit_id === unitId)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
}

function getUnitSegmentsForComplete(unitId) {
  if (!periodFrom.value || !periodTo.value || calendarDays.value.length === 0) return []

  const rangeStart = periodFrom.value
  const rangeEndExclusive = toIsoDate(addDays(new Date(periodTo.value), 1))
  const totalDays = calendarDays.value.length

  return getUnitOccupancies(unitId)
    .map((occ) => {
      const startClamped = occ.start_date > rangeStart ? occ.start_date : rangeStart
      const endClamped = occ.end_date < rangeEndExclusive ? occ.end_date : rangeEndExclusive

      const colStart = Math.max(1, Math.floor((new Date(startClamped) - new Date(rangeStart)) / 86400000) + 1)
      const rawColEnd = Math.floor((new Date(endClamped) - new Date(rangeStart)) / 86400000) + 1
      const colEnd = Math.min(totalDays + 1, rawColEnd)

      if (colEnd <= colStart) return null

      return {
        ...occ,
        colStart,
        colEnd,
        contextDate: startClamped
      }
    })
    .filter(Boolean)
}

function occupancyColor(occ) {
  return {
    reservation: 'bg-blue-500',
    maintenance: 'bg-orange-500',
    owner_use: 'bg-purple-500',
    inquiry_hold: 'bg-amber-500',
    external: 'bg-gray-500'
  }[occ.occupancy_type] || 'bg-gray-400'
}

function getOccupancyDisplayLabel(occ, mode) {
  if ((mode === 'por_unidad' || mode === 'completa') && occ.occupancy_type === 'reservation') {
    return occ.reservations?.guest_name || 'Reserva'
  }

  return occ.units?.name || 'Unidad'
}

function getOccupancyTypeLabel(occ, contextDate = null) {
  if (occ.occupancy_type === 'reservation') {
    const checkIn = occ.reservations?.check_in || occ.start_date
    const checkOut = occ.reservations?.check_out || occ.end_date

    if (contextDate && contextDate === checkIn) return 'Entrada'
    if (contextDate && contextDate === checkOut) return 'Salida'
    return 'Estadia'
  }

  if (occ.occupancy_type === 'inquiry_hold') return 'Hold'
  return 'Bloqueo'
}

function goToOccupancyDetail(occ) {
  if (!occ) return

  if (occ.occupancy_type === 'reservation' && occ.reservation_id) {
    router.push(`/reservas/${occ.reservation_id}`)
    return
  }

  if (occ.occupancy_type === 'inquiry_hold' && occ.inquiry_id) {
    router.push(`/consultas/${occ.inquiry_id}`)
    return
  }

  router.push(`/bloqueos/${occ.id}`)
}

function getPointerPosition(event) {
  const targetRect = event.currentTarget?.getBoundingClientRect?.()

  const x = typeof event.clientX === 'number' && event.clientX > 0
    ? event.clientX
    : (targetRect ? targetRect.left + targetRect.width / 2 : 120)

  const y = typeof event.clientY === 'number' && event.clientY > 0
    ? event.clientY
    : (targetRect ? targetRect.top + targetRect.height / 2 : 120)

  return { x, y }
}

function setTooltipPosition(event) {
  const pointer = getPointerPosition(event)
  const tooltipWidth = 320
  const tooltipHeight = 220
  const spacing = 14

  let x = pointer.x + spacing
  let y = pointer.y + spacing

  if (x + tooltipWidth > window.innerWidth - 8) {
    x = Math.max(8, pointer.x - tooltipWidth - spacing)
  }

  if (y + tooltipHeight > window.innerHeight - 8) {
    y = Math.max(8, pointer.y - tooltipHeight - spacing)
  }

  tooltip.value.position = { x, y }
}

function openDesktopTooltip(event, occ, contextDate) {
  if (isTouchDevice.value || periodPreset.value === 'today') return

  tooltip.value.visible = true
  tooltip.value.occupancy = occ
  tooltip.value.contextDate = contextDate
  setTooltipPosition(event)
}

function closeDesktopTooltip() {
  if (isTouchDevice.value) return
  tooltip.value.visible = false
}

function onOccupancyClick(event, occ, contextDate) {
  if (!occ) return

  if (isTouchDevice.value) {
    tooltip.value.visible = true
    tooltip.value.occupancy = occ
    tooltip.value.contextDate = contextDate
    setTooltipPosition(event)
    return
  }

  goToOccupancyDetail(occ)
}

function onOutsideClick(event) {
  if (!tooltip.value.visible || !isTouchDevice.value) return

  const inTooltip = tooltipRef.value?.contains(event.target)
  const inTrigger = event.target?.closest?.('[data-occ-trigger="true"]')

  if (!inTooltip && !inTrigger) {
    tooltip.value.visible = false
  }
}

const tooltipDetails = computed(() => {
  const occ = tooltip.value.occupancy
  if (!occ) {
    return {
      unitName: '',
      typeLabel: '',
      dateRange: '',
      nights: 0,
      holderName: '',
      paxLabel: '',
      sourceLabel: '',
      balance: 0,
      reason: ''
    }
  }

  const pax = Number(occ.reservations?.adults || 0) + Number(occ.reservations?.children || 0)
  const balance = Math.max(0, Number(occ.reservations?.total_amount || 0) - Number(occ.reservations?.paid_amount || 0))
  const nights = Math.max(
    0,
    Math.ceil((new Date(occ.end_date) - new Date(occ.start_date)) / (1000 * 60 * 60 * 24))
  )
  const reason = ['maintenance', 'owner_use'].includes(occ.occupancy_type)
    ? (occ.notes ? String(occ.notes).split('\n')[0] : '')
    : ''

  return {
    unitName: occ.units?.name || 'Unidad',
    typeLabel: getOccupancyTypeLabel(occ, tooltip.value.contextDate),
    dateRange: `${occ.start_date} -> ${occ.end_date}`,
    nights,
    holderName: occ.occupancy_type === 'reservation' ? (occ.reservations?.guest_name || '') : '',
    paxLabel: occ.occupancy_type === 'reservation' ? String(pax) : '',
    sourceLabel: occ.occupancy_type === 'reservation' ? (occ.reservations?.source || '') : '',
    balance,
    reason
  }
})

function toggleVenueFilter(venueId) {
  if (selectedVenueIds.value.includes(venueId)) {
    selectedVenueIds.value = selectedVenueIds.value.filter((id) => id !== venueId)
    return
  }

  selectedVenueIds.value = [...selectedVenueIds.value, venueId]
}

function toggleVenueCollapse(venueId) {
  collapsedVenues.value = {
    ...collapsedVenues.value,
    [venueId]: !collapsedVenues.value[venueId]
  }
}

function isVenueCollapsed(venueId) {
  return Boolean(collapsedVenues.value[venueId])
}

function toggleUnitCollapse(unitId) {
  collapsedUnits.value = {
    ...collapsedUnits.value,
    [unitId]: !collapsedUnits.value[unitId]
  }
}

function isUnitCollapsed(unitId) {
  return Boolean(collapsedUnits.value[unitId])
}

function goToPreviousWeek() {
  weekStart.value = addDays(weekStart.value, -7)
}

function goToNextWeek() {
  weekStart.value = addDays(weekStart.value, 7)
}

onMounted(async () => {
  isTouchDevice.value = Boolean(window.matchMedia?.('(pointer: coarse)')?.matches || 'ontouchstart' in window)

  applyPreset()
  await fetchMasterData()
  await fetchOccupancies()

  document.addEventListener('click', onOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick)
})

watch(periodPreset, async () => {
  applyPreset()
  tooltip.value.visible = false
  await fetchOccupancies()
})

watch(weekStart, async () => {
  if (periodPreset.value !== 'this_week') return
  applyPreset()
  await fetchOccupancies()
})

watch([periodFrom, periodTo], async () => {
  if (periodPreset.value !== 'custom') return
  await fetchOccupancies()
})
</script>
