<template>
  <div class="min-h-screen bg-gray-100 px-4 py-10 pb-24">
    <div class="mx-auto max-w-4xl space-y-6">
      <header class="text-center">
        <img
          v-if="accommodationLogo"
          :src="accommodationLogo"
          alt="Logo alojamiento"
          class="mx-auto mb-3 h-14 w-14 rounded-lg border border-gray-200 bg-white object-contain"
        >
        <h1 class="text-3xl font-bold text-gray-900">{{ primaryGuestName ? `Acompañantes de ${primaryGuestName}` : 'Acompañantes de la reserva' }}</h1>
        <p class="mt-2 text-base font-semibold text-gray-800">{{ accommodationName }}</p>
        <p class="mt-1 text-sm text-gray-600">Completa tus datos antes de tu llegada al alojamiento.</p>
      </header>

      <section v-if="viewState === 'loading'" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Cargando información del alojamiento...
      </section>

      <section v-else-if="viewState === 'success'" class="rounded-xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <h2 class="text-2xl font-semibold text-emerald-700">¡Pre-registro completado!</h2>
        <p class="mt-3 text-sm text-gray-600">Te esperamos el {{ formatDate(checkInDate) }}.</p>

        <div v-if="companionsRemaining > 0" class="mt-6">
          <p class="text-sm text-gray-600">Quedan {{ companionsRemaining }} acompañante(s) por registrar.</p>
          <button
            class="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            @click="resetForm"
          >
            Registrar otro acompañante
          </button>
        </div>
        <p v-else class="mt-4 text-sm text-gray-500">El límite de acompañantes ha sido alcanzado.</p>
      </section>

      <section v-else-if="viewState === 'error'" class="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h2 class="text-2xl font-semibold text-red-700">No se pudo completar el pre-registro</h2>
        <p class="mt-3 text-sm text-gray-700">{{ errorMessage }}</p>
        <p class="mt-2 text-sm text-gray-600">Contacta al alojamiento para más información.</p>
        <p v-if="contactPhone" class="mt-1 text-sm font-medium text-gray-800">Teléfono: {{ contactPhone }}</p>
      </section>

      <section v-else class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p class="text-sm font-semibold text-indigo-900">Tu reserva en {{ accommodationName }}</p>
          <p v-if="primaryGuestName" class="mt-1 text-sm text-indigo-800">Titular: {{ primaryGuestName }}</p>
          <p class="mt-1 text-sm text-indigo-800">Check-in: {{ formatDate(checkInDate) }} → Check-out: {{ formatDate(checkOutDate) }}</p>
          <p class="mt-1 text-sm text-indigo-800">{{ guestsCount }} personas</p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <h2 class="text-base font-semibold text-gray-900">Tus datos</h2>

            <div>
              <label class="block text-sm font-medium text-gray-700">Nombre completo <span class="text-red-500">*</span></label>
              <input
                v-model="guest.first_name"
                type="text"
                placeholder="Nombres"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Apellidos</label>
              <input
                v-model="guest.last_name"
                type="text"
                placeholder="Apellidos"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <AppPhoneInput
                  :countryCode="guest.phone_country_code"
                  :phoneNumber="guest.phone"
                  label="Teléfono"
                  hint="Opcional"
                  @update:countryCode="guest.phone_country_code = $event"
                  @update:phoneNumber="guest.phone = $event"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input
                  v-model="guest.email"
                  type="email"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Nacionalidad <span class="text-red-500">*</span></label>
                <AppCountrySelect
                  v-model="guest.nationality"
                  class="mt-1"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Tipo de documento <span class="text-red-500">*</span></label>
                <select
                  v-model="guest.document_type"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Sin definir</option>
                  <option v-for="opt in documentTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Número de documento <span class="text-red-500">*</span></label>
                <input
                  v-model="guest.document_number"
                  type="text"
                  inputmode="numeric"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Género</label>
                <select
                  v-model="guest.gender"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Sin definir</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="unspecified">Prefiero no indicar</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Fecha de nacimiento <span class="text-red-500">*</span></label>
                <input
                  v-model="guest.birth_date"
                  type="date"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
              </div>
            </div>
          </div>

          <button
            type="submit"
            :disabled="submitting || !guest.first_name.trim() || !guest.document_type || !guest.document_number.trim() || !guest.nationality || !guest.birth_date || !guest.gender"
            class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {{ submitting ? 'Enviando...' : 'Completar pre-registro' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppCountrySelect from '../components/ui/forms/AppCountrySelect.vue'
import AppPhoneInput from '../components/ui/forms/AppPhoneInput.vue'
import { DOCUMENT_TYPES_ALL as documentTypeOptions } from '../utils/documentTypes'

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const route = useRoute()

const viewState = ref('loading')
const submitting = ref(false)
const errorMessage = ref('')
const checkInDate = ref('')
const checkOutDate = ref('')
const guestsCount = ref(1)
const accommodationName = ref('Alojamiento')
const primaryGuestName = ref('')
const contactPhone = ref('')
const accommodationLogo = ref('')
const companionsRemaining = ref(0)

const buildGuest = () => ({
  first_name: '',
  last_name: '',
  nationality: '',
  document_type: '',
  document_number: '',
  phone: '',
  phone_country_code: '+57',
  email: '',
  birth_date: '',
  gender: '',
})

const guest = reactive(buildGuest())

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const parseErrorMessage = (status, message) => {
  if (status === 404) return 'Este link no es válido.'
  if (status === 409) return 'Ya completaste el pre-registro para esta reserva.'
  if (status === 422) return message || 'El límite de acompañantes ha sido alcanzado.'
  return message || 'Ocurrió un error inesperado.'
}

const resetForm = () => {
  Object.assign(guest, buildGuest())
  viewState.value = 'form'
}

const handleSubmit = async () => {
  submitting.value = true
  errorMessage.value = ''

  const guestPayload = {
    ...guest,
    first_name: guest.first_name?.trim(),
    last_name: guest.last_name?.trim(),
    phone: guest.phone?.replace(/\s+/g, '').trim(),
    email: guest.email?.trim(),
    document_number: guest.document_number?.trim(),
  }

  const res = await fetch(`${FUNCTIONS_URL}/public-companion-preregistro`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'register',
      companion_token: String(route.params.token || ''),
      guest: guestPayload,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    errorMessage.value = parseErrorMessage(res.status, data?.message)
    if (data?.contact_phone) contactPhone.value = String(data.contact_phone)
    viewState.value = 'error'
    submitting.value = false
    return
  }

  if (data?.check_in) checkInDate.value = data.check_in
  companionsRemaining.value = data?.companions_remaining ?? 0
  viewState.value = 'success'
  submitting.value = false
}

onMounted(async () => {
  const token = String(route.params.token || '')

  try {
    const res = await fetch(
      `${FUNCTIONS_URL}/public-companion-preregistro?token=${encodeURIComponent(token)}`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
    )
    const data = await res.json()

    if (!res.ok) {
      const status = res.status
      errorMessage.value = parseErrorMessage(status, data?.message)
      if (data?.contact_phone) contactPhone.value = String(data.contact_phone)
      viewState.value = 'error'
      return
    }

    checkInDate.value = String(data.reservation?.check_in || '')
    checkOutDate.value = String(data.reservation?.check_out || '')
    guestsCount.value = Math.max(1, Number(data.reservation?.guests_count || 1))
    accommodationName.value = String(data.account?.name || 'Alojamiento')
    primaryGuestName.value = String(data.primary_guest_name || '')
    contactPhone.value = String(data.account?.phone || '')
    viewState.value = 'form'
  } catch {
    errorMessage.value = 'No se pudo cargar la información del pre-registro.'
    viewState.value = 'error'
  }
})
</script>
