<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Reportes</h1>
        <p class="text-sm text-gray-500">Métricas, ocupación, canales y exportación para el periodo seleccionado.</p>
      </div>
      <div class="text-xs text-gray-500">
        {{ describeRange(selectedRange) }}
      </div>
    </div>

    <div v-if="!canViewReports" class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
      <p class="mt-2 text-sm text-amber-800">No tienes permisos para ver reportes financieros.</p>
    </div>

    <template v-else>
      <div class="card space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="preset in presets"
            :key="preset.key"
            type="button"
            class="rounded-lg border px-3 py-2 text-sm font-medium transition"
            :class="selectedPreset === preset.key ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:text-primary'"
            @click="applyPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <AppDateRangePicker
              v-model="pickerRange"
              label-start="Desde"
              label-end="Hasta"
            />
          </div>

          <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-gray-900">Comparar con periodo anterior</p>
                <p class="text-xs text-gray-500">Muestra la variación en métricas y gráficas.</p>
              </div>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition"
                :class="compareWithPrevious ? 'bg-primary' : 'bg-gray-300'"
                @click="compareWithPrevious = !compareWithPrevious"
              >
                <span
                  class="inline-block h-5 w-5 rounded-full bg-white shadow transition"
                  :class="compareWithPrevious ? 'translate-x-5' : 'translate-x-1'"
                ></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="card border-red-200 bg-red-50/40">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-red-900">Error</h2>
        <p class="mt-2 text-sm text-red-700">{{ errorMessage }}</p>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div v-for="i in 10" :key="i" class="card animate-pulse">
          <div class="h-3 w-28 rounded bg-gray-200"></div>
          <div class="mt-4 h-8 w-36 rounded bg-gray-200"></div>
          <div class="mt-3 h-3 w-32 rounded bg-gray-100"></div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div v-for="card in metricCards" :key="card.key" class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ card.label }}</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ card.value }}</p>
          <p class="mt-1 text-xs text-gray-500">{{ card.helper }}</p>
          <p
            v-if="compareWithPrevious"
            class="mt-3 text-xs font-medium"
            :class="card.comparison.direction === 'up' ? 'text-emerald-600' : card.comparison.direction === 'down' ? 'text-red-600' : 'text-gray-500'"
          >
            {{ card.comparison.label }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section class="card space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Ingresos por periodo</h2>
              <p class="text-xs text-gray-500">Agrupado por {{ incomeGranularityLabel }}.</p>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-[#4C2FFF]"></span>Periodo actual</span>
              <span v-if="compareWithPrevious" class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-gray-400"></span>Periodo anterior</span>
            </div>
          </div>

          <div v-if="incomeSeries.length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            Sin datos para el periodo seleccionado
          </div>

          <div v-else class="space-y-3">
            <div class="flex h-64 items-end gap-2 rounded-xl bg-gray-50 px-3 py-4">
              <div v-for="point in incomeSeries" :key="point.label" class="flex min-w-0 flex-1 items-end gap-1">
                <div
                  v-if="compareWithPrevious"
                  class="flex-1 rounded-t-md bg-gray-300 transition"
                  :style="{ height: getBarHeight(point.previous, maxIncomeValue) }"
                  :title="`Periodo anterior: ${formatCop(point.previous)}`"
                ></div>
                <div
                  class="flex-1 rounded-t-md bg-[#4C2FFF] transition"
                  :style="{ height: getBarHeight(point.current, maxIncomeValue) }"
                  :title="`Periodo actual: ${formatCop(point.current)}`"
                ></div>
              </div>
            </div>

            <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${Math.max(incomeSeries.length, 1)}, minmax(0, 1fr))` }">
              <p v-for="point in incomeSeries" :key="`${point.label}-label`" class="truncate text-center text-[11px] text-gray-500">{{ point.label }}</p>
            </div>
          </div>
        </section>

        <section class="card space-y-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Ocupación por unidad</h2>
            <p class="text-xs text-gray-500">Ordenada de mayor a menor ocupación.</p>
          </div>

          <div v-if="occupancyByUnit.length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            Sin datos para el periodo seleccionado
          </div>

          <div v-else class="space-y-3">
            <div v-for="item in occupancyByUnit" :key="item.unitId" class="space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <p class="truncate text-sm font-medium text-gray-800">{{ item.unitName }}</p>
                <p class="text-xs font-semibold text-gray-600">{{ formatPercent(item.occupancyPct) }}</p>
              </div>
              <div class="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  class="h-full rounded-full"
                  :class="item.color === 'green' ? 'bg-emerald-500' : item.color === 'yellow' ? 'bg-amber-400' : 'bg-red-500'"
                  :style="{ width: `${Math.min(item.occupancyPct, 100)}%` }"
                ></div>
              </div>
              <p class="text-[11px] text-gray-500">{{ item.occupiedDays }} ocupados · {{ item.blockedDays }} bloqueados · {{ item.availableDays }} libres</p>
            </div>
          </div>
        </section>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section class="card space-y-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Reservas por canal</h2>
            <p class="text-xs text-gray-500">Distribución porcentual por origen.</p>
          </div>

          <div v-if="reservationsByChannel.length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            Sin datos para el periodo seleccionado
          </div>

          <div v-else class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <div class="mx-auto h-52 w-52 rounded-full" :style="{ background: donutGradient }">
              <div class="m-8 flex h-[calc(100%-4rem)] items-center justify-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p class="text-xs uppercase tracking-wide text-gray-500">Total</p>
                  <p class="text-2xl font-semibold text-gray-900">{{ currentMetrics.reservationsTotal }}</p>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div v-for="item in reservationsByChannel" :key="item.label" class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: item.color }"></span>
                  <span class="truncate text-sm text-gray-700">{{ item.label }}</span>
                </div>
                <div class="text-right text-xs text-gray-500">
                  <p class="font-semibold text-gray-800">{{ item.value }}</p>
                  <p>{{ formatPercent(item.percentage) }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="card space-y-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Ingresos por canal</h2>
            <p class="text-xs text-gray-500">Neto vs comisión pagada por canal.</p>
          </div>

          <div v-if="incomeByChannel.length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            Sin datos para el periodo seleccionado
          </div>

          <div v-else class="space-y-4">
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-[#4C2FFF]"></span>Ingreso neto</span>
              <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-gray-300"></span>Comisión</span>
            </div>

            <div v-for="item in incomeByChannel" :key="item.label" class="space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <p class="truncate text-sm font-medium text-gray-800">{{ item.label }}</p>
                <p class="text-xs text-gray-500">{{ formatCop(item.gross) }}</p>
              </div>
              <div class="flex h-4 overflow-hidden rounded-full bg-gray-100">
                <div class="h-full bg-[#4C2FFF]" :style="{ width: getStackWidth(item.net, item.gross) }" :title="`Neto: ${formatCop(item.net)}`"></div>
                <div class="h-full bg-gray-300" :style="{ width: getStackWidth(item.commission, item.gross) }" :title="`Comisión: ${formatCop(item.commission)}`"></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="card space-y-4">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Mapa de calor de ocupación</h2>
            <p class="text-xs text-gray-500">Ocupado, bloqueado o libre por unidad y día.</p>
          </div>
          <p v-if="heatmapData.truncated" class="text-xs text-amber-600">Mostrando los primeros 31 días del rango.</p>
        </div>

        <div v-if="heatmapData.rows.length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          Sin datos para el periodo seleccionado
        </div>

        <div v-else class="space-y-4 overflow-x-auto">
          <div class="min-w-max">
            <div class="grid gap-1" :style="{ gridTemplateColumns: `180px repeat(${Math.max(heatmapData.dates.length, 1)}, minmax(18px, 1fr))` }">
              <div class="text-xs font-semibold uppercase tracking-wide text-gray-400">Unidad</div>
              <div v-for="date in heatmapData.dates" :key="date" class="text-center text-[10px] text-gray-400">{{ formatDayLabel(date) }}</div>

              <template v-for="row in heatmapData.rows" :key="row.unitId">
                <div class="pr-2 text-sm font-medium text-gray-700">{{ row.unitName }}</div>
                <button
                  v-for="cell in row.cells"
                  :key="`${row.unitId}-${cell.date}`"
                  type="button"
                  class="h-5 rounded-sm border border-white/80"
                  :class="cell.status === 'occupied' ? 'bg-primary/70' : cell.status === 'blocked' ? 'bg-gray-400' : 'bg-gray-100'"
                  :title="`${row.unitName} · ${formatDateDisplay(cell.date)} · ${cell.label}`"
                  @click="selectedHeatCell = cell"
                ></button>
              </template>
            </div>
          </div>

          <div v-if="selectedHeatCell" class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p class="font-semibold text-gray-900">{{ selectedHeatCell.unitName }} · {{ formatDateDisplay(selectedHeatCell.date) }}</p>
            <p>{{ selectedHeatCell.label }}<span v-if="selectedHeatCell.note"> — {{ selectedHeatCell.note }}</span></p>
          </div>
        </div>
      </section>

      <section class="card space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Exportar reportes</h2>
          <p class="text-xs text-gray-500">CSV disponible en frontend. PDF quedará habilitado cuando Gotenberg esté disponible.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div v-for="report in exportDefinitions" :key="report.key" class="rounded-2xl border border-gray-200 bg-white p-4">
            <p class="text-sm font-semibold text-gray-900">{{ report.title }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ report.description }}</p>
            <p class="mt-3 text-xs text-gray-400">{{ report.rows.length }} fila(s)</p>

            <div class="mt-4 space-y-2">
              <button
                type="button"
                class="w-full rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                :disabled="report.rows.length === 0"
                @click="downloadCsv(report.key)"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-400"
                disabled
              >
                PDF — Próximamente
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import AppDateRangePicker from '../components/ui/forms/AppDateRangePicker.vue'
import {
  REPORTS_STATE_KEY,
  getPresetRange,
  normalizeRange,
  getPreviousRange,
  describeRange,
  normalizeReservationRecord,
  buildMetrics,
  buildIncomeSeries,
  buildUnitOccupancyData,
  buildChannelReservationData,
  buildChannelIncomeData,
  buildHeatmapData,
  buildExportRows,
  exportRowsToCsv,
  formatCop,
  formatPercent,
  formatDateDisplay,
  getMetricComparison,
  getIncomeGranularity
} from '../utils/reports'

const accountStore = useAccountStore()
const { can } = usePermissions()
const toast = useToast()

const presets = [
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'year', label: 'Este año' }
]

const loadSavedState = () => {
  try {
    const raw = localStorage.getItem(REPORTS_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const savedState = loadSavedState()
const selectedPreset = ref(savedState?.preset || 'month')
const selectedRange = ref(normalizeRange(savedState?.range || getPresetRange(savedState?.preset || 'month')))
const compareWithPrevious = ref(savedState?.compare === true)

const loading = ref(false)
const errorMessage = ref('')
const units = ref([])
const currentReservations = ref([])
const previousReservations = ref([])
const currentOccupancies = ref([])
const previousOccupancies = ref([])
const selectedHeatCell = ref(null)

const canViewReports = computed(() => can('reports', 'view_financial') || can('payments', 'view'))

const pickerRange = computed({
  get: () => selectedRange.value,
  set: (value) => {
    selectedPreset.value = 'custom'
    selectedRange.value = normalizeRange(value, 'month')
  }
})

const previousRange = computed(() => getPreviousRange(selectedRange.value))
const currentMetrics = computed(() => buildMetrics({
  reservations: currentReservations.value,
  units: units.value,
  occupancies: currentOccupancies.value,
  range: selectedRange.value
}))
const previousMetrics = computed(() => buildMetrics({
  reservations: previousReservations.value,
  units: units.value,
  occupancies: previousOccupancies.value,
  range: previousRange.value
}))

const metricCards = computed(() => [
  {
    key: 'gross',
    label: 'Ingresos brutos',
    value: formatCop(currentMetrics.value.grossIncome),
    helper: 'Suma de reservas del periodo',
    comparison: getMetricComparison(currentMetrics.value.grossIncome, previousMetrics.value.grossIncome)
  },
  {
    key: 'net',
    label: 'Ingresos netos',
    value: formatCop(currentMetrics.value.netIncome),
    helper: 'Descontando comisiones',
    comparison: getMetricComparison(currentMetrics.value.netIncome, previousMetrics.value.netIncome)
  },
  {
    key: 'collections',
    label: 'Recaudo',
    value: formatCop(currentMetrics.value.collectedRevenue),
    helper: 'Pagos recibidos en el periodo',
    comparison: getMetricComparison(currentMetrics.value.collectedRevenue, previousMetrics.value.collectedRevenue)
  },
  {
    key: 'occupancy',
    label: 'Ocupación promedio',
    value: formatPercent(currentMetrics.value.averageOccupancy),
    helper: 'Días-unidad ocupados / totales',
    comparison: getMetricComparison(currentMetrics.value.averageOccupancy, previousMetrics.value.averageOccupancy)
  },
  {
    key: 'reservations',
    label: 'Reservas totales',
    value: new Intl.NumberFormat('es-CO').format(currentMetrics.value.reservationsTotal),
    helper: 'Confirmadas y cerradas',
    comparison: getMetricComparison(currentMetrics.value.reservationsTotal, previousMetrics.value.reservationsTotal)
  },
  {
    key: 'nights',
    label: 'Noches vendidas',
    value: new Intl.NumberFormat('es-CO').format(currentMetrics.value.nightsSold),
    helper: 'Total de noches en reservas',
    comparison: getMetricComparison(currentMetrics.value.nightsSold, previousMetrics.value.nightsSold)
  },
  {
    key: 'stay',
    label: 'Estancia promedio',
    value: `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(currentMetrics.value.averageStay)} noches`,
    helper: 'Noches / reservas',
    comparison: getMetricComparison(currentMetrics.value.averageStay, previousMetrics.value.averageStay)
  },
  {
    key: 'rate',
    label: 'Tarifa promedio por noche',
    value: formatCop(currentMetrics.value.averageRate),
    helper: 'Ingresos brutos / noches',
    comparison: getMetricComparison(currentMetrics.value.averageRate, previousMetrics.value.averageRate)
  },
  {
    key: 'rate_per_person',
    label: 'Tarifa promedio por persona',
    value: formatCop(currentMetrics.value.averageRatePerPerson),
    helper: 'Ingresos brutos / huéspedes totales',
    comparison: getMetricComparison(currentMetrics.value.averageRatePerPerson, previousMetrics.value.averageRatePerPerson)
  },
  {
    key: 'guests',
    label: 'Huéspedes totales',
    value: new Intl.NumberFormat('es-CO').format(currentMetrics.value.totalGuests),
    helper: 'Personas registradas',
    comparison: getMetricComparison(currentMetrics.value.totalGuests, previousMetrics.value.totalGuests)
  }
])

const incomeSeries = computed(() => buildIncomeSeries(
  currentReservations.value,
  selectedRange.value,
  compareWithPrevious.value ? previousReservations.value : []
))

const maxIncomeValue = computed(() => {
  const values = incomeSeries.value.flatMap((item) => compareWithPrevious.value ? [item.current, item.previous] : [item.current])
  return Math.max(...values, 0)
})

const occupancyByUnit = computed(() => buildUnitOccupancyData(
  units.value,
  currentOccupancies.value,
  selectedRange.value,
  currentReservations.value
))

const reservationsByChannel = computed(() => buildChannelReservationData(currentReservations.value))
const incomeByChannel = computed(() => buildChannelIncomeData(currentReservations.value))
const heatmapData = computed(() => buildHeatmapData(units.value, currentOccupancies.value, selectedRange.value))
const exportRows = computed(() => buildExportRows(currentReservations.value, occupancyByUnit.value))

const exportDefinitions = computed(() => [
  {
    key: 'ingresos',
    title: 'Reporte de ingresos',
    description: 'Totales brutos, netos, comisión, canal y estado de pago.',
    rows: exportRows.value.ingresos || []
  },
  {
    key: 'ocupacion',
    title: 'Reporte de ocupación',
    description: 'Disponibilidad, días ocupados, bloqueos e ingresos por unidad.',
    rows: exportRows.value.ocupacion || []
  },
  {
    key: 'reservas',
    title: 'Reporte de reservas',
    description: 'Código, huésped, noches, total, pagado y saldo pendiente.',
    rows: exportRows.value.reservas || []
  },
  {
    key: 'huespedes',
    title: 'Reporte de huéspedes',
    description: 'Estadías, noches acumuladas, última visita y total gastado.',
    rows: exportRows.value.huespedes || []
  }
])

const donutGradient = computed(() => {
  if (!reservationsByChannel.value.length) {
    return 'conic-gradient(#E5E7EB 0deg 360deg)'
  }

  let start = 0
  const segments = reservationsByChannel.value.map((item) => {
    const end = start + (item.percentage * 3.6)
    const segment = `${item.color} ${start}deg ${end}deg`
    start = end
    return segment
  })

  return `conic-gradient(${segments.join(', ')})`
})

const incomeGranularityLabel = computed(() => {
  const granularity = getIncomeGranularity(selectedRange.value)
  if (granularity === 'day') return 'día'
  if (granularity === 'week') return 'semana'
  return 'mes'
})

const applyPreset = (presetKey) => {
  selectedPreset.value = presetKey
  selectedRange.value = normalizeRange(getPresetRange(presetKey))
}

const persistState = () => {
  localStorage.setItem(REPORTS_STATE_KEY, JSON.stringify({
    preset: selectedPreset.value,
    range: selectedRange.value,
    compare: compareWithPrevious.value
  }))
}

const fetchActiveUnits = async (accountId) => {
  const { data, error } = await supabase
    .from('units')
    .select('id, name')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

const fetchReservationsForRange = async (accountId, range) => {
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id,
      reservation_number,
      reference_code,
      created_at,
      check_in,
      check_out,
      status,
      total_amount,
      paid_amount,
      commission_percentage,
      adults,
      minors,
      children,
      infants,
      guests!reservations_guest_id_fkey(first_name, last_name, phone, phone_country_code, email),
      source_detail_info:source_details!reservations_source_detail_id_fkey(label_es),
      reservation_units(unit_id, units(name))
    `)
    .eq('account_id', accountId)
    .in('status', ['confirmed', 'in_stay', 'completed', 'finalized'])
    .is('deleted_at', null)
    .gte('check_in', range.start)
    .lte('check_in', range.end)
    .order('check_in', { ascending: true })

  if (error) throw error
  return (data || []).map(normalizeReservationRecord)
}

const fetchOccupanciesForRange = async (accountId, unitIds, range) => {
  if (!unitIds.length) return []

  const nextDay = new Date(range.end)
  nextDay.setDate(nextDay.getDate() + 1)

  const { data, error } = await supabase
    .from('occupancies')
    .select('id, unit_id, start_date, end_date, occupancy_type, notes, expires_at')
    .eq('account_id', accountId)
    .in('unit_id', unitIds)
    .lt('start_date', `${nextDay.toISOString().slice(0, 10)}`)
    .gt('end_date', range.start)
    .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')

  if (error) throw error
  return data || []
}

const loadReports = async () => {
  if (!canViewReports.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    const accountId = accountStore.getRequiredAccountId()
    const compare = compareWithPrevious.value

    const [unitRows, currentRows, previousRows] = await Promise.all([
      fetchActiveUnits(accountId),
      fetchReservationsForRange(accountId, selectedRange.value),
      compare ? fetchReservationsForRange(accountId, previousRange.value) : Promise.resolve([])
    ])

    const unitIds = unitRows.map((item) => item.id)
    const [currentOccRows, previousOccRows] = await Promise.all([
      fetchOccupanciesForRange(accountId, unitIds, selectedRange.value),
      compare ? fetchOccupanciesForRange(accountId, unitIds, previousRange.value) : Promise.resolve([])
    ])

    units.value = unitRows
    currentReservations.value = currentRows
    previousReservations.value = previousRows
    currentOccupancies.value = currentOccRows
    previousOccupancies.value = previousOccRows

    if (!selectedHeatCell.value && heatmapData.value.rows.length) {
      selectedHeatCell.value = heatmapData.value.rows[0]?.cells?.[0] || null
    }
  } catch (error) {
    errorMessage.value = error.message || 'No se pudieron cargar los reportes.'
  } finally {
    loading.value = false
  }
}

const getBarHeight = (value, maxValue) => {
  const numeric = Number(value || 0)
  const max = Number(maxValue || 0)
  if (max <= 0) return '4px'
  return `${Math.max((numeric / max) * 100, 2)}%`
}

const getStackWidth = (value, total) => {
  const numeric = Number(value || 0)
  const base = Number(total || 0)
  if (base <= 0) return '0%'
  return `${Math.max((numeric / base) * 100, 0)}%`
}

const formatDayLabel = (value) => {
  const formatted = formatDateDisplay(value)
  return formatted === '-' ? '-' : formatted.slice(0, 5)
}

const downloadCsv = (key) => {
  const definition = exportDefinitions.value.find((item) => item.key === key)
  if (!definition || !definition.rows.length) return

  const filename = `${key}_${selectedRange.value.start}_${selectedRange.value.end}.csv`
  const ok = exportRowsToCsv(filename, definition.rows)
  if (ok) {
    toast.success('CSV exportado correctamente')
  }
}

watch(
  [() => selectedPreset.value, () => selectedRange.value.start, () => selectedRange.value.end, () => compareWithPrevious.value],
  async () => {
    persistState()
    await loadReports()
  },
  { immediate: true }
)
</script>
