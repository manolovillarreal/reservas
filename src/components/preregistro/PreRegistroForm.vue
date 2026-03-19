<template>
  <div class="space-y-6">
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 class="text-lg font-semibold text-gray-900">Pre-registro de huéspedes</h3>
      <p class="mt-1 text-sm text-gray-600">{{ reservation?.accommodationName || reservation?.venue_name || 'Alojamiento' }}</p>
      <p class="mt-1 text-sm text-gray-500">
        {{ formatDate(reservation?.check_in) }} → {{ formatDate(reservation?.check_out) }}
      </p>
      <p class="mt-2 text-xs uppercase tracking-wide text-gray-500">Personas declaradas: {{ normalizedGuestsCount }}</p>
    </div>

    <form class="space-y-6" @submit.prevent="submitForm">
      <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 class="text-base font-semibold text-gray-900">Huésped principal</h4>
        <p class="text-sm text-gray-500">Este huésped quedará marcado como principal.</p>

        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label class="md:col-span-2 text-sm text-gray-700">
            Nombre
            <input v-model="primaryGuest.name" type="text" required class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </label>

          <label class="text-sm text-gray-700">
            Nacionalidad
            <input v-model="primaryGuest.nationality" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </label>

          <label class="text-sm text-gray-700">
            Tipo de documento
            <select v-model="primaryGuest.document_type" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
              <option value="">Sin definir</option>
              <option value="passport">Passport</option>
              <option value="cedula">Cédula</option>
              <option value="dni">DNI</option>
              <option value="foreign_id">Foreign ID</option>
            </select>
          </label>

          <label class="text-sm text-gray-700">
            Número de documento
            <input v-model="primaryGuest.document_number" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </label>

          <label class="text-sm text-gray-700">
            Teléfono
            <input v-model="primaryGuest.phone" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </label>

          <label class="md:col-span-2 text-sm text-gray-700">
            Email
            <input v-model="primaryGuest.email" type="email" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </label>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="text-base font-semibold text-gray-900">Acompañantes</h4>
            <p class="text-sm text-gray-500">Faltan {{ missingCompanions }} acompañantes por registrar.</p>
          </div>
          <button type="button" class="btn-secondary text-sm" @click="addCompanion">+ Agregar acompañante</button>
        </div>

        <div v-if="additionalGuests.length === 0" class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500">
          No hay acompañantes cargados todavía.
        </div>

        <div v-for="(guest, index) in additionalGuests" :key="`companion-${index}`" class="rounded-lg border border-gray-200 p-3">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-sm font-medium text-gray-800">Acompañante {{ index + 1 }}</p>
            <button type="button" class="text-sm font-semibold text-red-600 hover:text-red-800" @click="removeCompanion(index)">×</button>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="md:col-span-2 text-sm text-gray-700">
              Nombre
              <input v-model="guest.name" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>

            <label class="text-sm text-gray-700">
              Nacionalidad
              <input v-model="guest.nationality" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>

            <label class="text-sm text-gray-700">
              Tipo de documento
              <select v-model="guest.document_type" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
                <option value="">Sin definir</option>
                <option value="passport">Passport</option>
                <option value="cedula">Cédula</option>
                <option value="dni">DNI</option>
                <option value="foreign_id">Foreign ID</option>
              </select>
            </label>

            <label class="text-sm text-gray-700 md:col-span-2">
              Número de documento
              <input v-model="guest.document_number" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
          </div>
        </div>
      </section>

      <div class="flex justify-end border-t border-gray-200 pt-4">
        <button type="submit" class="btn-primary" :disabled="submitting || !primaryGuest.name.trim()">
          {{ submitting ? 'Guardando...' : 'Completar pre-registro' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  reservation: { type: Object, default: () => ({}) },
  guestsCount: { type: Number, default: 1 },
  isPublic: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  initialPrimaryGuest: { type: Object, default: () => ({}) },
  initialAdditionalGuests: { type: Array, default: () => [] },
})

const emit = defineEmits(['submitted'])

const buildGuest = () => ({
  name: '',
  nationality: '',
  document_type: '',
  document_number: '',
  phone: '',
  email: '',
})

const primaryGuest = reactive(buildGuest())
const additionalGuests = reactive([])

const normalizedGuestsCount = computed(() => {
  const count = Number(props.guestsCount || 1)
  return count > 0 ? count : 1
})

const expectedAdditionalCount = computed(() => {
  const count = normalizedGuestsCount.value - 1
  return count > 0 ? count : 0
})

const missingCompanions = computed(() => {
  const missing = expectedAdditionalCount.value - additionalGuests.length
  return missing > 0 ? missing : 0
})

const resetGuests = () => {
  Object.assign(primaryGuest, buildGuest(), props.initialPrimaryGuest || {})

  additionalGuests.splice(0, additionalGuests.length)
  const seedGuests = Array.isArray(props.initialAdditionalGuests) ? props.initialAdditionalGuests : []
  seedGuests.forEach((guest) => additionalGuests.push({ ...buildGuest(), ...guest }))
}

watch(
  () => [props.initialPrimaryGuest, props.initialAdditionalGuests, props.reservation],
  () => {
    resetGuests()
  },
  { immediate: true, deep: true }
)

const addCompanion = () => {
  additionalGuests.push(buildGuest())
}

const removeCompanion = (index) => {
  if (index < 0 || index >= additionalGuests.length) return
  additionalGuests.splice(index, 1)
}

const submitForm = () => {
  emit('submitted', {
    primary_guest: { ...primaryGuest },
    additional_guests: additionalGuests.map((guest) => ({ ...guest })),
  })
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
</script>
