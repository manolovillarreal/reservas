<template>
  <div ref="containerRef" class="relative">
    <div class="flex items-center gap-2">
      <div class="flex-1 space-y-1">
        <label v-if="labelStart" class="block text-sm font-medium text-[#6B7280]">
          {{ labelStart }}
          <span v-if="required" class="ml-0.5 text-[#EF4444]">*</span>
        </label>
        <input
          :value="startText"
          type="text"
          :placeholder="placeholderStart || 'DD/MM/AAAA'"
          maxlength="10"
          autocomplete="off"
          class="block min-h-[44px] w-full rounded-md border bg-white px-3 py-2 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF]"
          :class="shownErrorStart ? 'border-[#EF4444] ring-[3px] ring-[rgba(239,68,68,0.20)]' : 'border-[#E5E7EB] focus:border-[#4C2FFF] focus:ring-[3px] focus:ring-[rgba(76,47,255,0.20)]'"
          @input="onStartInput"
          @blur="onStartBlur"
        />
        <AppFieldHint v-if="shownErrorStart" :message="shownErrorStart" type="error" />
      </div>

      <span class="flex-shrink-0 text-xs text-[#9CA3AF]" :class="(labelStart || labelEnd) ? 'mt-5' : ''">></span>

      <div class="flex-1 space-y-1">
        <label v-if="labelEnd" class="block text-sm font-medium text-[#6B7280]">
          {{ labelEnd }}
        </label>
        <input
          :value="endText"
          type="text"
          :placeholder="placeholderEnd || 'DD/MM/AAAA'"
          maxlength="10"
          autocomplete="off"
          class="block min-h-[44px] w-full rounded-md border bg-white px-3 py-2 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF]"
          :class="shownErrorEnd ? 'border-[#EF4444] ring-[3px] ring-[rgba(239,68,68,0.20)]' : 'border-[#E5E7EB] focus:border-[#4C2FFF] focus:ring-[3px] focus:ring-[rgba(76,47,255,0.20)]'"
          @input="onEndInput"
          @blur="onEndBlur"
        />
        <AppFieldHint v-if="shownErrorEnd" :message="shownErrorEnd" type="error" />
      </div>

      <button
        type="button"
        class="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-md border transition"
        :class="[
          calendarOpen ? 'border-[#4C2FFF] bg-[#4C2FFF]/5 text-[#4C2FFF]' : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-gray-50',
          (labelStart || labelEnd) ? 'mt-6' : ''
        ]"
        aria-label="Seleccionar rango de fechas"
        @click.stop="toggleCalendar"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </button>
    </div>

    <div
      v-if="calendarOpen"
      class="z-50 mt-2 overflow-hidden border border-[#E5E7EB] bg-white shadow-xl"
      :class="isMobile ? 'fixed inset-x-0 top-[72px] max-h-[80vh] overflow-y-auto rounded-none border-x-0' : 'absolute left-0 top-full w-[580px] rounded-xl'"
      @click.stop
      @mousedown.stop
    >
      <div :class="isMobile ? '' : 'flex divide-x divide-[#E5E7EB]'">
        <div class="flex-1 p-4">
          <div class="mb-3 flex items-center justify-between">
            <button type="button" class="rounded-md p-1.5 text-[#6B7280] hover:bg-gray-100 transition" @click.stop="shiftMonths(-1)">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span class="text-sm font-semibold text-[#111827] capitalize">{{ leftMonthLabel }}</span>
            <button v-if="isMobile" type="button" class="rounded-md p-1.5 text-[#6B7280] hover:bg-gray-100 transition" @click.stop="shiftMonths(1)">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <div v-else class="w-7" />
          </div>

          <div class="mb-2 grid grid-cols-7">
            <div v-for="d in DAY_HEADERS" :key="d" class="py-1 text-center text-xs font-semibold text-[#9CA3AF]">{{ d }}</div>
          </div>

          <div class="grid grid-cols-7">
            <template v-for="(cell, idx) in leftCells" :key="`l-${idx}`">
              <div v-if="!cell.day" class="py-0.5" />
              <button
                v-else
                type="button"
                :disabled="cell.disabled"
                class="py-0.5 transition-colors focus:outline-none"
                :class="cellBgClass(cell)"
                @click.stop="onDayClick(cell.iso)"
                @mouseenter="!cell.disabled && (hoverDate = cell.iso)"
                @mouseleave="hoverDate = null"
              >
                <span
                  class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors"
                  :class="cellInnerClass(cell)"
                >{{ cell.day }}</span>
              </button>
            </template>
          </div>
        </div>

        <div v-if="!isMobile" class="flex-1 p-4">
          <div class="mb-3 flex items-center justify-between">
            <div class="w-7" />
            <span class="text-sm font-semibold text-[#111827] capitalize">{{ rightMonthLabel }}</span>
            <button type="button" class="rounded-md p-1.5 text-[#6B7280] hover:bg-gray-100 transition" @click.stop="shiftMonths(1)">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div class="mb-2 grid grid-cols-7">
            <div v-for="d in DAY_HEADERS" :key="d" class="py-1 text-center text-xs font-semibold text-[#9CA3AF]">{{ d }}</div>
          </div>

          <div class="grid grid-cols-7">
            <template v-for="(cell, idx) in rightCells" :key="`r-${idx}`">
              <div v-if="!cell.day" class="py-0.5" />
              <button
                v-else
                type="button"
                :disabled="cell.disabled"
                class="py-0.5 transition-colors focus:outline-none"
                :class="cellBgClass(cell)"
                @click.stop="onDayClick(cell.iso)"
                @mouseenter="!cell.disabled && (hoverDate = cell.iso)"
                @mouseleave="hoverDate = null"
              >
                <span
                  class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors"
                  :class="cellInnerClass(cell)"
                >{{ cell.day }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBreakpoint } from '../../../composables/useBreakpoint'
import { useOperationalSettings } from '../../../composables/useOperationalSettings'
import AppFieldHint from './AppFieldHint.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({ start: null, end: null }) },
  minDate: { type: String, default: '' },
  placeholderStart: { type: String, default: '' },
  placeholderEnd: { type: String, default: '' },
  labelStart: { type: String, default: '' },
  labelEnd: { type: String, default: '' },
  required: { type: Boolean, default: false },
  errorStart: { type: String, default: '' },
  errorEnd: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const { isMobile } = useBreakpoint()
const { operationalSettings, loadOperationalSettings } = useOperationalSettings()
const containerRef = ref(null)
const calendarOpen = ref(false)
const hoverDate = ref(null)
const pickingStart = ref(true)

const todayIso = new Date().toISOString().slice(0, 10)
const now = new Date()
const baseYear = ref(now.getFullYear())
const baseMonth = ref(now.getMonth())

const effectiveMinDate = computed(() => {
  const allowPast = operationalSettings.value.allow_past_dates_in_pickers
  if (allowPast) return ''
  if (!props.minDate) return todayIso
  return props.minDate > todayIso ? props.minDate : todayIso
})

const DAY_HEADERS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const internalStart = ref(props.modelValue?.start || null)
const internalEnd = ref(props.modelValue?.end || null)
const startText = ref(isoToDisplay(internalStart.value))
const endText = ref(isoToDisplay(internalEnd.value))
const internalErrorStart = ref('')
const internalErrorEnd = ref('')

const shownErrorStart = computed(() => props.errorStart || internalErrorStart.value)
const shownErrorEnd = computed(() => props.errorEnd || internalErrorEnd.value)

const leftYear = computed(() => new Date(baseYear.value, baseMonth.value, 1).getFullYear())
const leftMonthIdx = computed(() => new Date(baseYear.value, baseMonth.value, 1).getMonth())
const leftMonthLabel = computed(() => `${MONTH_NAMES[leftMonthIdx.value]} ${leftYear.value}`)
const rightYear = computed(() => new Date(baseYear.value, baseMonth.value + 1, 1).getFullYear())
const rightMonthIdx = computed(() => new Date(baseYear.value, baseMonth.value + 1, 1).getMonth())
const rightMonthLabel = computed(() => `${MONTH_NAMES[rightMonthIdx.value]} ${rightYear.value}`)

const leftCells = computed(() => buildCells(leftYear.value, leftMonthIdx.value))
const rightCells = computed(() => buildCells(rightYear.value, rightMonthIdx.value))

const effectiveEnd = computed(() => {
  if (internalEnd.value) return internalEnd.value
  if (!pickingStart.value && hoverDate.value) return hoverDate.value
  return null
})

const rangeStart = computed(() => {
  const s = internalStart.value
  const e = effectiveEnd.value
  if (!s || !e) return s
  return s <= e ? s : e
})

const rangeEnd = computed(() => {
  const s = internalStart.value
  const e = effectiveEnd.value
  if (!s || !e) return e
  return s <= e ? e : s
})

function isoToDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function displayToIso(text) {
  if (!text || text.length !== 10) return null
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return null
  const [d, m, y] = text.split('/')
  const iso = `${y}-${m}-${d}`
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  if (date.toISOString().slice(0, 10) !== iso) return null
  return iso
}

function autoFormatDateInput(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function buildCells(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const minD = effectiveMinDate.value
  const cells = []

  for (let i = 0; i < firstDow; i++) {
    cells.push({ day: null, iso: null, disabled: true })
  }

  for (let d = 1; d <= lastDay; d++) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    const iso = `${year}-${mm}-${dd}`
    cells.push({ day: d, iso, disabled: minD ? iso < minD : false })
  }

  return cells
}

function cellBgClass(cell) {
  if (!cell.day || cell.disabled) return ''
  if (rangeStart.value && rangeEnd.value && cell.iso >= rangeStart.value && cell.iso <= rangeEnd.value) {
    return 'bg-[#4C2FFF]/10'
  }
  return ''
}

function cellInnerClass(cell) {
  if (!cell.day) return ''
  if (cell.disabled) return 'text-[#D1D5DB] cursor-not-allowed opacity-50'
  if ((rangeStart.value && cell.iso === rangeStart.value) || (rangeEnd.value && cell.iso === rangeEnd.value)) {
    return 'bg-[#4C2FFF] text-white font-semibold cursor-pointer'
  }
  return 'text-[#374151] hover:bg-[#4C2FFF]/20 cursor-pointer'
}

function emitValue(start, end) {
  emit('update:modelValue', { start, end })
}

function shiftMonths(delta) {
  const step = isMobile.value ? 1 : 2
  const d = new Date(baseYear.value, baseMonth.value + (delta * step), 1)
  baseYear.value = d.getFullYear()
  baseMonth.value = d.getMonth()
}

function syncCalendarToSelection() {
  const anchor = internalStart.value || effectiveMinDate.value || todayIso
  const d = new Date(`${anchor}T00:00:00`)
  baseYear.value = d.getFullYear()
  baseMonth.value = d.getMonth()
}

function toggleCalendar() {
  if (calendarOpen.value) {
    calendarOpen.value = false
    return
  }
  syncCalendarToSelection()
  calendarOpen.value = true
}

function onDayClick(iso) {
  if (pickingStart.value) {
    internalStart.value = iso
    internalEnd.value = null
    startText.value = isoToDisplay(iso)
    endText.value = ''
    internalErrorStart.value = ''
    internalErrorEnd.value = ''
    pickingStart.value = false
    emitValue(iso, null)
    return
  }

  if (iso === internalStart.value) return

  let start = internalStart.value
  let end = iso
  if (start > end) {
    const tmp = start
    start = end
    end = tmp
  }

  internalStart.value = start
  internalEnd.value = end
  startText.value = isoToDisplay(start)
  endText.value = isoToDisplay(end)
  internalErrorEnd.value = ''
  hoverDate.value = null
  pickingStart.value = true
  calendarOpen.value = false
  emitValue(start, end)
}

function onStartInput(event) {
  const formatted = autoFormatDateInput(event.target.value)
  startText.value = formatted
  event.target.value = formatted
  internalErrorStart.value = ''

  if (!formatted) {
    internalStart.value = null
    emitValue(null, internalEnd.value)
    return
  }

  if (formatted.length !== 10) return
  const iso = displayToIso(formatted)
  if (!iso) return

  internalStart.value = iso
  emitValue(iso, internalEnd.value)
}

function onStartBlur() {
  const iso = displayToIso(startText.value)
  const minD = effectiveMinDate.value

  if (startText.value && !iso) {
    startText.value = ''
    internalStart.value = null
    emitValue(null, internalEnd.value)
    emit('blur')
    return
  }

  if (!iso) {
    emit('blur')
    return
  }

  if (minD && iso < minD) {
    startText.value = ''
    internalStart.value = null
    internalErrorStart.value = 'Fecha no disponible'
    emitValue(null, internalEnd.value)
    emit('blur')
    return
  }

  internalStart.value = iso
  startText.value = isoToDisplay(iso)

  if (internalEnd.value && internalEnd.value <= iso) {
    endText.value = ''
    internalEnd.value = null
    internalErrorEnd.value = 'Debe ser posterior a la entrada'
    emitValue(iso, null)
  } else {
    internalErrorEnd.value = ''
    emitValue(iso, internalEnd.value)
  }

  emit('blur')
}

function onEndInput(event) {
  const formatted = autoFormatDateInput(event.target.value)
  endText.value = formatted
  event.target.value = formatted
  internalErrorEnd.value = ''

  if (!formatted) {
    internalEnd.value = null
    emitValue(internalStart.value, null)
    return
  }

  if (formatted.length !== 10) return
  const iso = displayToIso(formatted)
  if (!iso) return

  internalEnd.value = iso
  emitValue(internalStart.value, iso)
}

function onEndBlur() {
  const iso = displayToIso(endText.value)

  if (endText.value && !iso) {
    endText.value = ''
    internalEnd.value = null
    emitValue(internalStart.value, null)
    emit('blur')
    return
  }

  if (!iso) {
    emit('blur')
    return
  }

  if (internalStart.value && iso <= internalStart.value) {
    endText.value = ''
    internalEnd.value = null
    internalErrorEnd.value = 'Debe ser posterior a la entrada'
    emitValue(internalStart.value, null)
    emit('blur')
    return
  }

  internalEnd.value = iso
  endText.value = isoToDisplay(iso)
  internalErrorEnd.value = ''
  emitValue(internalStart.value, iso)
  emit('blur')
}

function onOutsideClick(event) {
  if (!containerRef.value) return
  if (!containerRef.value.contains(event.target)) {
    calendarOpen.value = false
  }
}

watch(
  () => props.modelValue,
  (value) => {
    const nextStart = value?.start || null
    const nextEnd = value?.end || null
    if (nextStart !== internalStart.value) {
      internalStart.value = nextStart
      startText.value = isoToDisplay(nextStart)
    }
    if (nextEnd !== internalEnd.value) {
      internalEnd.value = nextEnd
      endText.value = isoToDisplay(nextEnd)
    }
  },
  { deep: true }
)

onMounted(() => {
  loadOperationalSettings()
  document.addEventListener('mousedown', onOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onOutsideClick)
})
</script>
