<template>
  <div class="min-h-screen bg-gray-100 px-4 py-10 pb-24">
    <div class="mx-auto max-w-4xl space-y-6">
      <header class="text-center">
        <img
          v-if="accommodationLogo"
          :src="accommodationLogo"
          alt="Logo alojamiento"
          class="mx-auto mb-3 h-14 w-14 rounded-lg border border-gray-200 bg-white object-contain"
          style="width: 150px; height: auto;"
        >
        <p class="mt-2 text-base font-semibold text-gray-800">{{ accommodationName }}</p>
        <h1 class="text-3xl font-bold text-gray-900">Pre-registro de huéspedes</h1>
        <p class="mt-1 text-sm text-gray-600">Completa tus datos antes de tu llegada al alojamiento.</p>
      </header>

      <section v-if="viewState === 'loading'" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Cargando información del alojamiento...
      </section>

      <section v-else-if="viewState === 'success'" class="rounded-xl border border-emerald-200 bg-white p-8 shadow-sm">
        <div class="text-center">
          <h2 class="text-2xl font-semibold text-emerald-700">¡Pre-registro completado!</h2>
          <p class="mt-3 text-sm text-gray-600">Te esperamos el {{ formatDate(checkInDate) }}.</p>
        </div>

        <div v-if="companionsRemaining > 0" class="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p class="text-sm font-medium text-gray-900">¿Viajan acompañantes que quieran registrarse por su cuenta?</p>
          <template v-if="!companionLink">
            <button
              :disabled="companionLinkLoading"
              class="mt-3 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              @click="generateCompanionLink"
            >
              {{ companionLinkLoading ? 'Generando...' : 'Generar link para acompañantes' }}
            </button>
          </template>
          <template v-else>
            <p class="mt-2 text-xs text-amber-700">⚠️ Este link es exclusivo para los acompañantes de esta reserva. Al compartirlo, cualquier persona con el link podrá registrar datos como acompañante.</p>
            <button
              class="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              @click="copyCompanionLink"
            >
              {{ companionLinkCopied ? 'Copiado ✓' : 'Copiar link' }}
            </button>
          </template>
        </div>
      </section>

      <section v-else-if="viewState === 'error'" class="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h2 class="text-2xl font-semibold text-red-700">No se pudo completar el pre-registro</h2>
        <p class="mt-3 text-sm text-gray-700">{{ errorMessage }}</p>
        <p class="mt-2 text-sm text-gray-600">Contacta al alojamiento para más información.</p>
        <p v-if="contactPhone" class="mt-1 text-sm font-medium text-gray-800">Teléfono: {{ contactPhone }}</p>
      </section>

      <section v-else class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Este link es personal. Contiene información de tu reserva — no lo compartas con personas que no sean de tu grupo.
        </div>

        <div class="mb-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p class="text-sm font-semibold text-indigo-900">Tu reserva en {{ accommodationName }}</p>
          <p class="mt-1 text-sm text-indigo-800">Check-in: {{ formatDate(checkInDate) }} → Check-out: {{ formatDate(checkOutDate) }}</p>
          <p class="mt-1 text-sm text-indigo-800">{{ guestsCount }} personas</p>
        </div>

        <PreRegistroForm
          :reservation="reservationInfo"
          :guestsCount="formGuestsCount"
          :isPublic="true"
          :submitting="submitting"
          :initialPrimaryGuest="initialPrimaryGuest"
          @submitted="handleSubmit"
        />

        <!-- Companion link — alternative to filling companion data manually -->
        <div v-if="guestsCount > 1 && companionsRemaining > 0" class="rounded-md border border-gray-200 bg-gray-50 p-4">
          <p class="text-sm font-medium text-gray-900">¿Prefieren que los acompañantes se registren por su cuenta?</p>
          <p class="mt-1 text-xs text-gray-500">Genera un link exclusivo para que cada acompañante complete sus propios datos.</p>
          <template v-if="!companionLink">
            <button
              type="button"
              :disabled="companionLinkLoading"
              class="mt-3 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              @click="generateCompanionLink"
            >
              {{ companionLinkLoading ? 'Generando...' : 'Generar link para acompañantes' }}
            </button>
          </template>
          <template v-else>
            <p class="mt-2 text-xs text-amber-700">⚠️ Al compartirlo, cualquier persona con el link podrá registrarse como acompañante de esta reserva.</p>
            <button
              type="button"
              class="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              @click="copyCompanionLink"
            >
              {{ companionLinkCopied ? 'Copiado ✓' : 'Copiar link de acompañantes' }}
            </button>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PreRegistroForm from '../components/preregistro/PreRegistroForm.vue'
import { copyTextToClipboard } from '../utils/clipboard'

const route = useRoute()

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const viewState = ref('loading')
const submitting = ref(false)
const errorMessage = ref('')
const checkInDate = ref('')
const checkOutDate = ref('')
const guestsCount = ref(1)
const companionsRemaining = ref(0)
const accommodationName = ref('Alojamiento')
const contactPhone = ref('')
const accommodationLogo = ref('')
const initialPrimaryGuest = ref(null)

const token = computed(() => String(route.params.token || ''))

const companionLink = ref('')
const companionLinkLoading = ref(false)
const companionLinkCopied = ref(false)

// When preregistro is not yet complete, limit companion slots to remaining count
// so PreRegistroForm's missingCompanions doesn't show already-registered companions
const formGuestsCount = computed(() => {
  const expected = Math.max(0, guestsCount.value - 1)
  const alreadyRegistered = expected - companionsRemaining.value
  return alreadyRegistered > 0 ? guestsCount.value - alreadyRegistered : guestsCount.value
})

const reservationInfo = computed(() => ({
  accommodationName: accommodationName.value,
  check_in: checkInDate.value,
  check_out: checkOutDate.value,
}))

const parseErrorMessage = (status, message, body = null) => {
  if (status === 404) return 'Este link no es válido.'
  if (status === 409) return 'El pre-registro ya fue completado.'
  if (status === 410) {
    if (body?.reason === 'edit_expired')
      return 'El período de edición del pre-registro ha finalizado. Para modificaciones, contacta directamente al alojamiento.'
    return 'Este link ya no está disponible. Comunícate directamente con el alojamiento.'
  }
  return message || 'Ocurrió un error inesperado.'
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

const loadContextFromApi = async () => {
  try {
    const res = await fetch(
        `${FUNCTIONS_URL}/public-preregistro?token=${encodeURIComponent(token.value)}&format=json`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' } }
    )
    const data = await res.json()

    if (!res.ok) {
      errorMessage.value = parseErrorMessage(res.status, data?.message, data)
      if (data?.contact_phone) contactPhone.value = String(data.contact_phone)
      viewState.value = 'error'
      return
    }

    checkInDate.value = String(data.reservation?.check_in || '')
    checkOutDate.value = String(data.reservation?.check_out || '')
    guestsCount.value = Math.max(1, Number(data.reservation?.guests_count || 1))
    accommodationName.value = String(data.account?.name || 'Alojamiento')
    contactPhone.value = String(data.account?.phone || '')
    accommodationLogo.value = String(data.account?.logo_url || '')
    companionsRemaining.value = Number(data.companions_remaining ?? 0)
    initialPrimaryGuest.value = data.guest || null
    viewState.value = 'form'
  } catch {
    errorMessage.value = 'No se pudo cargar la información del pre-registro.'
    viewState.value = 'error'
  }
}

const handleSubmit = async ({ primary_guest, additional_guests, estimated_arrival_time, flight_number }) => {
  submitting.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(
      `${FUNCTIONS_URL}/public-preregistro?token=${encodeURIComponent(token.value)}`,
      {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest: primary_guest,
          companions: additional_guests || [],
          estimated_arrival_time: estimated_arrival_time || null,
          flight_number: flight_number || null,
        }),
      }
    )
    const data = await res.json()

    if (!res.ok) {
      errorMessage.value = parseErrorMessage(res.status, data?.message, data)
      if (data?.contact_phone) contactPhone.value = String(data.contact_phone)
      viewState.value = 'error'
      submitting.value = false
      return
    }

    if (data?.check_in) checkInDate.value = data.check_in
    companionsRemaining.value = Number(data?.companions_remaining ?? 0)
    viewState.value = 'success'
  } catch {
    errorMessage.value = 'Ocurrió un error inesperado al enviar el pre-registro.'
    viewState.value = 'error'
  } finally {
    submitting.value = false
  }
}

const generateCompanionLink = async () => {
  companionLinkLoading.value = true
  try {
    const res = await fetch(`${FUNCTIONS_URL}/public-companion-preregistro`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'generate', primary_token: token.value }),
    })

    const data = await res.json()
    if (!res.ok || !data?.companion_url) throw new Error('No se pudo generar el link.')

    const appOrigin = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
    companionLink.value = appOrigin + data.companion_url
  } catch {
    // silently fail; button remains visible
  } finally {
    companionLinkLoading.value = false
  }
}

const copyCompanionLink = async () => {
  try {
    await copyTextToClipboard(companionLink.value)
    companionLinkCopied.value = true
    setTimeout(() => { companionLinkCopied.value = false }, 2000)
  } catch {
    // ignore
  }
}

onMounted(loadContextFromApi)
</script>
