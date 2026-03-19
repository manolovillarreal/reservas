<template>
  <div class="min-h-screen bg-gray-100 px-4 py-10">
    <div class="mx-auto max-w-4xl space-y-6">
      <header class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Pre-registro de huéspedes</h1>
        <p class="mt-2 text-sm text-gray-600">Completa tus datos antes de tu llegada al alojamiento.</p>
      </header>

      <section v-if="viewState === 'loading'" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Cargando información del alojamiento...
      </section>

      <section v-else-if="viewState === 'success'" class="rounded-xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <h2 class="text-2xl font-semibold text-emerald-700">¡Pre-registro completado!</h2>
        <p class="mt-3 text-sm text-gray-600">Te esperamos el {{ formatDate(checkInDate) }}.</p>
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
          <p class="mt-1 text-sm text-indigo-800">Check-in: {{ formatDate(checkInDate) }} → Check-out: {{ formatDate(checkOutDate) }}</p>
          <p class="mt-1 text-sm text-indigo-800">{{ guestsCount }} personas</p>
        </div>

        <PreRegistroForm
          :reservation="reservationInfo"
          :guestsCount="guestsCount"
          :isPublic="true"
          :submitting="submitting"
          @submitted="handleSubmit"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../services/supabase'
import PreRegistroForm from '../components/preregistro/PreRegistroForm.vue'

const route = useRoute()

const viewState = ref('loading')
const submitting = ref(false)
const errorMessage = ref('')
const checkInDate = ref('')
const checkOutDate = ref('')
const guestsCount = ref(1)
const accommodationName = ref('Alojamiento')
const contactPhone = ref('')

const token = computed(() => String(route.params.token || ''))

const reservationInfo = computed(() => ({
  accommodationName: accommodationName.value,
  check_in: checkInDate.value,
  check_out: checkOutDate.value,
}))

const parseErrorMessage = (status, message) => {
  if (status === 404) return 'Este link no es válido.'
  if (status === 409) return 'El pre-registro ya fue completado.'
  if (status === 410) return 'Este link ha expirado.'
  return message || 'Ocurrió un error inesperado.'
}

const extractFunctionError = async (error) => {
  if (!error) return { status: 500, message: 'Ocurrió un error inesperado.', contactPhone: '' }

  const status = Number(error.context?.status || 500)

  if (typeof error.context?.json === 'function') {
    try {
      const payload = await error.context.json()
      return {
        status,
        message: payload?.message || error.message || 'Ocurrió un error inesperado.',
        contactPhone: String(payload?.contact_phone || ''),
      }
    } catch {
      return { status, message: error.message || 'Ocurrió un error inesperado.', contactPhone: '' }
    }
  }

  return { status, message: error.message || 'Ocurrió un error inesperado.', contactPhone: '' }
}

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

const loadContextFromQuery = () => {
  const query = route.query
  checkInDate.value = String(query.check_in || '')
  checkOutDate.value = String(query.check_out || '')
  guestsCount.value = Math.max(1, Number(query.guests_count || 1))
  accommodationName.value = String(query.accommodation || 'Alojamiento')
  contactPhone.value = String(query.contact_phone || '')
  viewState.value = 'form'
}

const handleSubmit = async ({ primary_guest, additional_guests }) => {
  submitting.value = true
  errorMessage.value = ''

  const body = {
    token: token.value,
    primary_guest,
    additional_guests,
  }

  const { data, error } = await supabase.functions.invoke('process-preregistro', { body })

  if (error) {
    const parsed = await extractFunctionError(error)
    errorMessage.value = parseErrorMessage(parsed.status, parsed.message)
    if (parsed.contactPhone) {
      contactPhone.value = parsed.contactPhone
    }
    viewState.value = 'error'
    submitting.value = false
    return
  }

  if (data?.check_in) {
    checkInDate.value = data.check_in
  }

  viewState.value = 'success'
  submitting.value = false
}

onMounted(loadContextFromQuery)
</script>
