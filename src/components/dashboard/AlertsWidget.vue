<template>
  <div v-if="items.length > 0" class="card overflow-hidden !p-0">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-700">
        Alertas operativas
        <span class="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {{ items.length }}
        </span>
      </h2>
      <div class="flex items-center gap-2">
        <button type="button" class="touch-target rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30" :disabled="currentIndex <= 0" @click="prev">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button type="button" class="touch-target rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30" :disabled="currentIndex >= items.length - 1" @click="next">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>

    <div class="relative select-none overflow-hidden" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <div class="flex transition-transform duration-300 ease-in-out" :style="{ transform: 'translateX(-' + (currentIndex * 100) + '%)' }">
        <div v-for="item in items" :key="item.id" class="w-full shrink-0 px-4 py-4">
          <div class="space-y-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-gray-900">{{ item.guestName }}</p>
                <p class="mt-1 text-xs text-gray-500">Check-in: {{ item.checkInLabel }}<span v-if="item.unit"> · {{ item.unit }}</span></p>
              </div>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{{ item.alerts.length }}</span>
            </div>

            <ul class="space-y-2">
              <li v-for="alert in item.alerts" :key="alert.id" class="flex items-start gap-2 text-sm text-gray-700">
                <span class="mt-0.5 text-base leading-none">{{ typeIcon(alert.type) }}</span>
                <div class="min-w-0">
                  <p class="font-medium text-gray-900">{{ alert.title }}</p>
                  <p v-if="alert.message" class="text-xs text-gray-500">{{ alert.message }}</p>
                </div>
              </li>
            </ul>

            <div class="flex justify-end">
              <button type="button" class="rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50" @click="handleCardClick(item)">
                Ver reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="items.length > 1" class="flex justify-center gap-1.5 pb-3 pt-1">
      <button v-for="(_, i) in items" :key="i" type="button" class="h-1.5 rounded-full transition-all" :class="i === currentIndex ? 'w-4 bg-amber-500' : 'w-1.5 bg-gray-300'" @click="currentIndex = i" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useReservationsStore } from '../../stores/reservations'

const reservStore = useReservationsStore()
const router = useRouter()

const currentIndex = ref(0)
const touchStartX = ref(0)
const operationalAlerts = ref([])

const toIsoDate = (d) => {
  const date = new Date(d)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const buildOperationalAlerts = () => {
  const today = toIsoDate(new Date())
  const tomorrow = toIsoDate(new Date(Date.now() + 86400000))
  const plus7 = toIsoDate(new Date(Date.now() + 7 * 86400000))
  const grouped = []

  for (const res of reservStore.reservations) {
    const name = res.guest_display_name || 'Huesped'
    const unit = res.unit_names_display || ''
    const alerts = []

    if (res.status === 'confirmed' && res.check_in === today) {
      alerts.push({
        id: 'op_checkin_' + res.id,
        type: 'check_in_hoy',
        title: 'Check-in hoy',
        message: unit ? name + ' · ' + unit : name,
      })
    }

    if (res.status === 'in_stay' && res.check_out === today) {
      alerts.push({
        id: 'op_checkout_' + res.id,
        type: 'check_out_hoy',
        title: 'Check-out hoy',
        message: unit ? name + ' · ' + unit : name,
      })
    }

    if (res.status === 'in_stay' && res.check_out < today) {
      const days = Math.floor((new Date(today) - new Date(res.check_out)) / 86400000)
      alerts.push({
        id: 'op_checkout_vencido_' + res.id,
        type: 'check_out_vencido',
        title: 'Check-out vencido',
        message: name + ' · ' + days + ' dia' + (days !== 1 ? 's' : '') + ' vencido',
      })
    }

    const isUpcoming = res.status === 'confirmed' && res.check_in >= tomorrow && res.check_in <= plus7

    if (isUpcoming) {
      if (!res.preregistro_completado) {
        alerts.push({
          id: 'op_prereg_' + res.id,
          type: 'preregistro_pending',
          title: 'Pre-registro pendiente',
          message: 'Llega el ' + formatDate(res.check_in),
        })
      }

      const balance = Number(res.total_amount || 0) - Number(res.paid_amount || 0)
      if (balance > 0) {
        alerts.push({
          id: 'op_balance_' + res.id,
          type: 'balance_pending',
          title: 'Saldo pendiente',
          message: 'Pendiente antes del check-in',
        })
      }

      alerts.push({
        id: 'op_proximos_' + res.id,
        type: 'check_in_proximos',
        title: 'Check-in próximo',
        message: formatDate(res.check_in) + (unit ? ' · ' + unit : ''),
      })
    }

    if (alerts.length > 0) {
      grouped.push({
        id: 'reservation_alerts_' + res.id,
        guestName: name,
        checkIn: res.check_in,
        checkInLabel: formatDate(res.check_in),
        unit,
        alerts,
        related_type: 'reservation',
        related_id: res.id,
      })
    }
  }

  operationalAlerts.value = grouped.sort((a, b) => String(a.checkIn || '').localeCompare(String(b.checkIn || '')))
}

const items = computed(() => operationalAlerts.value)

watch(
  () => reservStore.reservations,
  () => { buildOperationalAlerts() },
  { immediate: true }
)

watch(
  () => items.value.length,
  (newLen) => {
    if (currentIndex.value >= newLen) {
      currentIndex.value = Math.max(0, newLen - 1)
    }
  }
)

const prev = () => { if (currentIndex.value > 0) currentIndex.value-- }
const next = () => { if (currentIndex.value < items.value.length - 1) currentIndex.value++ }

const onTouchStart = (e) => { touchStartX.value = e.touches[0].clientX }
const onTouchEnd = (e) => {
  const diff = touchStartX.value - e.changedTouches[0].clientX
  if (Math.abs(diff) > 50) {
    if (diff > 0) next()
    else prev()
  }
}

const typeIcon = (type) => {
  const icons = {
    check_in_hoy: '🏨',
    check_out_hoy: '🚪',
    check_out_vencido: '⚠️',
    preregistro_pending: '📋',
    balance_pending: '💰',
    check_in_proximos: '📅',
  }
  return icons[type] || '🔔'
}

const handleCardClick = (item) => {
  if (!item.related_type || !item.related_id) return
  const paths = {
    reservation: '/reservas/' + item.related_id,
    inquiry: '/consultas/' + item.related_id,
  }
  const path = paths[item.related_type]
  if (path) router.push(path)
}
</script>