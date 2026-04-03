<template>
  <div class="card space-y-4">
    <h2 class="text-base font-semibold text-gray-900">Consulta de disponibilidad</h2>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="sm:col-span-2">
        <AppDateRangePicker
          v-model="dateRange"
          label-start="Check-in"
          label-end="Check-out"
          :min-date="todayIso"
          :error-start="touched.checkIn && !checkIn ? 'Requerido' : ''"
          :error-end="touched.checkOut ? checkOutError : ''"
          @update:modelValue="onDateChange"
          @blur="onDateBlur"
        />
      </div>
      <AppCounter
        v-model="personas"
        label="Personas"
        :min="1"
        :max="30"
      />
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="btn-primary"
        :disabled="loading"
        @click="verify"
      >
        {{ loading ? 'Verificando…' : 'Verificar disponibilidad' }}
      </button>
      <button
        v-if="checked"
        type="button"
        class="text-sm text-gray-500 underline"
        @click="handleReset"
      >
        Limpiar
      </button>
    </div>

    <!-- Error -->
    <AppInlineAlert v-if="error" type="error" :message="error" />

    <!-- Result: no availability -->
    <div v-if="checked && !loading && available.length === 0" class="space-y-3">
      <AppInlineAlert
        type="warning"
        :message="noAvailabilityMessage"
      >
        <template #actions>
          <button type="button" class="text-sm font-medium underline" @click="goToCalendar">
            Ver calendario
          </button>
        </template>
      </AppInlineAlert>
    </div>

    <!-- Result: availability found -->
    <div v-if="checked && !loading && available.length > 0" class="space-y-3">
      <p class="text-sm font-medium text-emerald-700">
        {{ available.length }} {{ available.length === 1 ? 'unidad disponible' : 'unidades disponibles' }}
      </p>

      <div class="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
        <div
          v-for="unit in available"
          :key="unit.id"
          class="flex items-center justify-between px-3 py-2"
        >
          <div>
            <span class="text-sm font-medium text-gray-900">{{ unit.name }}</span>
            <span v-if="!singleVenue" class="ml-2 text-xs text-gray-500">{{ unit.venues?.name }}</span>
            <span class="ml-2 text-xs text-gray-400">· hasta {{ unit.capacity }} pers.</span>
          </div>
        </div>
      </div>

      <div class="pt-1">
        <button type="button" class="btn-primary" @click="goToForm">
          + Nueva reserva / consulta
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '../../stores/account'
import { useAvailability } from '../../composables/useAvailability'
import { AppDateRangePicker, AppCounter, AppInlineAlert } from '@/components/ui/forms'

const router = useRouter()
const accountStore = useAccountStore()
const { loading, error, available, totalAvailableCapacity, insufficientCapacity, singleVenue, checked, checkAvailability, reset } = useAvailability()

const checkIn = ref('')
const checkOut = ref('')
const personas = ref(2)
const touched = ref({ checkIn: false, checkOut: false })

const dateRange = computed({
  get: () => ({ start: checkIn.value || null, end: checkOut.value || null }),
  set: (value) => {
    checkIn.value = value?.start || ''
    checkOut.value = value?.end || ''
  }
})

const todayIso = new Date().toISOString().slice(0, 10)

const checkOutError = computed(() => {
  if (!checkOut.value) return 'Requerido'
  if (checkIn.value && checkOut.value <= checkIn.value) return 'Debe ser posterior al check-in'
  return ''
})

const noAvailabilityMessage = computed(() => {
  if (available.value.length > 0) return ''
  if (insufficientCapacity.value) {
    return `No hay capacidad suficiente para ${personas.value} persona(s) en ese rango. La suma de cupos disponibles es ${totalAvailableCapacity.value}.`
  }

  return 'No hay unidades disponibles para el rango y número de personas indicados.'
})

const onDateChange = () => {
  // Reset results when dates change so stale data isn't shown
  if (checked.value) reset()
}

const onDateBlur = () => {
  touched.value.checkIn = true
  touched.value.checkOut = true
}

const verify = async () => {
  touched.value = { checkIn: true, checkOut: true }
  if (!checkIn.value || checkOutError.value) return

  const accountId = accountStore.getRequiredAccountId()
  await checkAvailability({ accountId, checkIn: checkIn.value, checkOut: checkOut.value, personas: personas.value })
}

const handleReset = () => {
  reset()
  touched.value = { checkIn: false, checkOut: false }
}

const goToCalendar = () => {
  router.push({ path: '/calendar', query: { from: checkIn.value, to: checkOut.value } })
}

const goToForm = () => {
  router.push({
    path: '/reservar',
    query: { check_in: checkIn.value, check_out: checkOut.value, personas: String(personas.value) }
  })
}
</script>
