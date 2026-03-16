<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold text-gray-800">Calendario Marmanu House</h1>

    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div class="mb-6 flex gap-4 text-sm font-medium text-gray-600">
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-blue-500"></span> Reserva</span>
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-orange-500"></span> Mantenimiento</span>
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-purple-500"></span> Uso propietario</span>
        <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-gray-500"></span> Externo</span>
      </div>

      <div class="grid grid-cols-7 gap-px border border-gray-200 bg-gray-200">
        <div
          v-for="day in calendarDays"
          :key="day.date"
          class="min-h-[120px] bg-white p-2 transition-colors hover:bg-gray-50"
        >
          <div class="text-right text-sm font-semibold text-gray-400">{{ day.dayNumber }}</div>

          <div
            v-for="occ in getOccupanciesForDay(day.date)"
            :key="occ.id"
            class="mt-1 truncate rounded p-1.5 text-xs text-white shadow-sm"
            :class="occupancyColor(occ)"
            :title="occupancyTitle(occ)"
          >
            {{ occupancyLabel(occ) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../services/supabase'

const calendarDays = ref([])
const occupancies = ref([])

onMounted(async () => {
  const days = []
  const today = new Date()
  for (let i = 0; i < 35; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      date: d.toISOString().split('T')[0],
      dayNumber: d.getDate()
    })
  }

  calendarDays.value = days

  const rangeStart = days[0]?.date
  const rangeEnd = days[days.length - 1]?.date

  const { data } = await supabase
    .from('occupancies')
    .select('id, unit_id, start_date, end_date, occupancy_type, notes, reservations(guest_name), units(name)')
    .lt('start_date', rangeEnd)
    .gt('end_date', rangeStart)
    .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')

  occupancies.value = data || []
})

const getOccupanciesForDay = (dateStr) => {
  const current = new Date(dateStr).getTime()

  return occupancies.value.filter(occ => {
    const start = new Date(occ.start_date).getTime()
    const end = new Date(occ.end_date).getTime()
    return current >= start && current < end
  })
}

const occupancyLabel = (occ) => {
  if (occ.occupancy_type === 'reservation') {
    return occ.reservations?.guest_name || 'Reserva'
  }

  return occ.units?.name || occ.occupancy_type
}

const occupancyTitle = (occ) => {
  if (occ.occupancy_type === 'reservation') {
    return `Reserva: ${occ.reservations?.guest_name || 'Sin nombre'} (${occ.units?.name || 'Unidad'})`
  }

  return `${occ.occupancy_type} (${occ.units?.name || 'Unidad'})`
}

const occupancyColor = (occ) => {
  return {
    reservation: 'bg-blue-500',
    maintenance: 'bg-orange-500',
    owner_use: 'bg-purple-500',
    inquiry_hold: 'bg-amber-500',
    external: 'bg-gray-500'
  }[occ.occupancy_type] || 'bg-gray-400'
}
</script>
