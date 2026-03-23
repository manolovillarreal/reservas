<template>
  <div class="min-h-screen bg-gray-100 px-4 py-10 pb-24">
    <div class="mx-auto max-w-lg space-y-6">

      <!-- Loading -->
      <section v-if="state === 'loading'" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Cargando cotización...
      </section>

      <!-- Not found -->
      <section v-else-if="state === 'not_found'" class="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h2 class="text-xl font-semibold text-red-700">Cotización no encontrada</h2>
        <p class="mt-3 text-sm text-gray-600">El enlace puede ser inválido o la cotización fue eliminada.</p>
      </section>

      <!-- Content -->
      <template v-else-if="state === 'content' && data">

        <!-- Header -->
        <header class="text-center">
          <img
            v-if="data.logo_url"
            :src="data.logo_url"
            :alt="data.business_name"
            class="mx-auto mb-3 h-16 w-16 rounded-xl border border-gray-200 bg-white object-contain"
          />
          <h1 class="text-2xl font-bold text-gray-900">{{ data.business_name }}</h1>
          <p class="mt-1 text-sm text-gray-500">Cotización de hospedaje</p>
        </header>

        <!-- Expired banner -->
        <div v-if="data.is_expired" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          ⚠️ Esta cotización ha vencido.
        </div>

        <!-- Main card -->
        <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">

          <h2 class="text-lg font-semibold text-gray-900">
            Hola {{ data.guest_name }} 👋
          </h2>

          <!-- Stay details -->
          <div v-if="data.nights > 0" class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 space-y-0.5">
            <p>🗓 <strong>Check-in:</strong> {{ formatLong(data.check_in) }}</p>
            <p>🗓 <strong>Check-out:</strong> {{ formatLong(data.check_out) }}</p>
            <p>🌙 {{ data.nights }} {{ data.nights === 1 ? 'noche' : 'noches' }} · {{ data.total_guests }} {{ data.total_guests === 1 ? 'persona' : 'personas' }}</p>
            <p v-if="data.units_label">🏠 {{ data.units_label }}</p>
          </div>

          <!-- Pricing -->
          <div v-if="data.price_per_night && data.nights > 0" class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 space-y-0.5">
            <p>💰 <strong>Precio por noche:</strong> {{ formatCop(data.price_per_night) }}</p>
            <p v-if="data.discount_percentage > 0">🎁 <strong>Descuento ({{ data.discount_percentage }}%):</strong> -{{ formatCop(data.discount_amount) }}</p>
            <p class="text-base font-bold text-gray-900">💵 Total: {{ formatCop(data.total) }}</p>
          </div>

          <!-- Expiry -->
          <div v-if="data.expiry_formatted && !data.is_expired" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            ⏰ <strong>Válida hasta:</strong> {{ data.expiry_formatted }}
          </div>

          <!-- Conditions -->
          <div v-if="data.conditions" class="border-t border-gray-100 pt-4 text-sm text-gray-500">
            <p class="mb-1 font-medium text-gray-700">📋 Condiciones</p>
            <p class="whitespace-pre-wrap leading-relaxed">{{ data.conditions }}</p>
          </div>

          <p class="text-center text-xs text-gray-400 pt-1">Para confirmar o consultar, contáctanos.</p>
        </div>

      </template>

    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const state = ref('loading')
const data = ref(null)

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')

const formatLong = (value) => {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const formatCop = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

onMounted(async () => {
  const token = route.params.token
  if (!token) {
    state.value = 'not_found'
    return
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/public-quote?token=${encodeURIComponent(token)}&format=json`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (!res.ok) {
      state.value = 'not_found'
      return
    }

    const json = await res.json()
    if (json?.error === 'not_found') {
      state.value = 'not_found'
      return
    }

    data.value = json
    state.value = 'content'
  } catch {
    state.value = 'not_found'
  }
})
</script>
