<template>
  <div class="space-y-6">
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 class="text-lg font-semibold text-gray-900">Pre-registro de huéspedes</h3>
      <p class="mt-1 text-sm text-gray-600">{{ reservation.venue_name || reservation.venueLabel || 'Alojamiento' }}</p>
      <p class="mt-1 text-sm text-gray-500">
        {{ formatDate(reservation.check_in) }} → {{ formatDate(reservation.check_out) }}
      </p>
      <p class="mt-2 text-xs uppercase tracking-wide text-gray-500">
        Personas declaradas: {{ normalizedGuestCount }}
      </p>
    </div>

    <form class="space-y-6" @submit.prevent="submitForm">
      <section v-for="(guest, index) in guestForms" :key="index" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h4 class="text-base font-semibold text-gray-900">
              {{ index === 0 ? 'Huésped principal' : `Acompañante ${index}` }}
            </h4>
            <p class="text-sm text-gray-500">
              {{ index === 0 ? 'Será el huésped primario de la reserva.' : 'Completa los datos nominales si están disponibles.' }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Nombre completo</label>
            <input
              v-model="guest.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              :required="index === 0"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              v-model="guest.phone"
              type="tel"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Nacionalidad</label>
            <input
              v-model="guest.nationality"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo de documento</label>
            <select
              v-model="guest.document_type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Sin definir</option>
              <option value="passport">Pasaporte</option>
              <option value="cedula">Cédula</option>
              <option value="dni">DNI</option>
              <option value="foreign_id">Documento extranjero</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Número de documento</label>
            <input
              v-model="guest.document_number"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
          </div>
        </div>
      </section>

      <div v-if="errorMessage" class="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMessage }}
      </div>

      <div class="flex justify-end border-t border-gray-200 pt-4">
        <button
          type="submit"
          class="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? 'Guardando...' : submitLabel }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  reservation: { type: Object, required: true },
  initialGuests: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Guardar pre-registro' },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

const guestForms = ref([])

const normalizedGuestCount = computed(() => {
  const count = Number(props.reservation?.guests_count || 1)
  return count > 0 ? count : 1
})

const buildEmptyGuest = () => ({
  name: '',
  phone: '',
  nationality: '',
  document_type: '',
  document_number: ''
})

const initializeForms = () => {
  const count = normalizedGuestCount.value
  const nextGuests = []

  for (let index = 0; index < count; index++) {
    const sourceGuest = props.initialGuests[index] || {}
    nextGuests.push({
      ...buildEmptyGuest(),
      name: sourceGuest.name || '',
      phone: sourceGuest.phone || '',
      nationality: sourceGuest.nationality || '',
      document_type: sourceGuest.document_type || '',
      document_number: sourceGuest.document_number || ''
    })
  }

  guestForms.value = nextGuests
}

watch(() => [props.reservation, props.initialGuests], initializeForms, { immediate: true, deep: true })

const submitForm = () => {
  emit('submit', {
    guests: guestForms.value.map(guest => ({ ...guest }))
  })
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}
</script>
