<template>
  <div class="min-h-screen bg-gray-100 px-4 py-10">
    <div class="mx-auto max-w-4xl">
      <div class="mb-6 text-center">
        <h1 class="text-3xl font-bold text-gray-900">Pre-registro de huéspedes</h1>
        <p class="mt-2 text-sm text-gray-600">Completa los datos antes de la llegada al alojamiento.</p>
      </div>

      <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
        Cargando información de la reserva...
      </div>

      <div v-else-if="completed" class="rounded-xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
        <h2 class="text-2xl font-semibold text-emerald-700">Pre-registro completado</h2>
        <p class="mt-3 text-sm text-gray-600">Gracias. La información fue registrada correctamente.</p>
      </div>

      <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-white p-10 text-center shadow-sm">
        <h2 class="text-2xl font-semibold text-red-700">No se pudo continuar</h2>
        <p class="mt-3 text-sm text-gray-600">{{ errorMessage }}</p>
      </div>

      <div v-else-if="reservationSummary" class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PreRegistroForm
          :reservation="reservationSummary"
          :loading="submitting"
          :errorMessage="submitErrorMessage"
          submitLabel="Enviar pre-registro"
          @submit="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../services/supabase'
import PreRegistroForm from '../components/preregistro/PreRegistroForm.vue'

const route = useRoute()
const loading = ref(true)
const submitting = ref(false)
const completed = ref(false)
const errorMessage = ref('')
const submitErrorMessage = ref('')
const reservationSummary = ref(null)

const parseFunctionError = async (error) => {
  if (!error) return 'Ocurrió un error inesperado.'

  if (typeof error.context?.json === 'function') {
    const contextData = await error.context.json()
    return contextData.message || 'Ocurrió un error inesperado.'
  }

  return error.message || 'Ocurrió un error inesperado.'
}

const loadPreview = async () => {
  loading.value = true
  errorMessage.value = ''

  const { data, error } = await supabase.functions.invoke('process-preregistro', {
    body: {
      action: 'preview',
      token: route.params.token,
    }
  })

  if (error) {
    errorMessage.value = await parseFunctionError(error)
    loading.value = false
    return
  }

  reservationSummary.value = data.reservation
  loading.value = false
}

const handleSubmit = async ({ guests }) => {
  submitting.value = true
  submitErrorMessage.value = ''

  const { error } = await supabase.functions.invoke('process-preregistro', {
    body: {
      action: 'submit',
      token: route.params.token,
      guests,
    }
  })

  if (error) {
    submitErrorMessage.value = await parseFunctionError(error)
    submitting.value = false
    return
  }

  submitting.value = false
  completed.value = true
}

onMounted(loadPreview)
</script>
