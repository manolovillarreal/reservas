<template>
  <div v-if="items.length > 0" class="card overflow-hidden !p-0">
    <!-- Header with arrows -->
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-700">
        Notificaciones
        <span class="ml-1.5 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {{ items.length }}
        </span>
      </h2>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="touch-target rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
          :disabled="currentIndex <= 0"
          @click="prev"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          class="touch-target rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
          :disabled="currentIndex >= items.length - 1"
          @click="next"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Carousel slides -->
    <div
      class="relative select-none overflow-hidden"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div
        class="flex transition-transform duration-300 ease-in-out"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="w-full shrink-0 cursor-pointer px-4 py-4"
          @click="handleCardClick(item)"
        >
          <div class="flex items-start gap-2">
            <span class="mt-0.5 text-base leading-none">{{ typeIcon(item.type) }}</span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-gray-900">{{ item.title }}</p>
              <p v-if="item.message" class="mt-1 line-clamp-2 text-sm text-gray-500">{{ item.message }}</p>
              <p v-if="!item.is_operational" class="mt-2 text-xs text-gray-400">{{ timeAgo(item.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dots indicator -->
    <div v-if="items.length > 1" class="flex justify-center gap-1.5 pb-3 pt-1">
      <button
        v-for="(_, i) in items"
        :key="i"
        type="button"
        class="h-1.5 rounded-full transition-all"
        :class="i === currentIndex ? 'w-4 bg-indigo-500' : 'w-1.5 bg-gray-300'"
        @click="currentIndex = i"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '../../stores/notifications'
import { useReservationsStore } from '../../stores/reservations'

const notifStore = useNotificationsStore()
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
  const alerts = []

  for (const res of reservStore.reservations) {
    const name = res.guest_display_name || 'Huésped'
    const unit = res.unit_names_display || ''

    // check_in_hoy
    if (res.status === 'confirmed' && res.check_in === today) {
      alerts.push({
        id: `op_checkin_${res.id}`,
        type: 'check_in_hoy',
        title: 'Check-in hoy',
        message: unit ? `${name} · ${unit}` : name,
        related_type: 'reservation',
        related_id: res.id,
        is_operational: true,
      })
    }

    // check_out_hoy
    if (res.status === 'in_stay' && res.check_out === today) {
      alerts.push({
        id: `op_checkout_${res.id}`,
        type: 'check_out_hoy',
        title: 'Check-out hoy',
        message: unit ? `${name} · ${unit}` : name,
        related_type: 'reservation',
        related_id: res.id,
        is_operational: true,
      })
    }

    // check_out_vencido
    if (res.status === 'in_stay' && res.check_out < today) {
      const days = Math.floor((new Date(today) - new Date(res.check_out)) / 86400000)
      alerts.push({
        id: `op_checkout_vencido_${res.id}`,
        type: 'check_out_vencido',
        title: 'Check-out vencido',
        message: `${name} · ${days} día${days !== 1 ? 's' : ''} vencido`,
        related_type: 'reservation',
        related_id: res.id,
        is_operational: true,
      })
    }

    // Próximos: check_in entre mañana y +7 días
    const isUpcoming = res.status === 'confirmed' && res.check_in >= tomorrow && res.check_in <= plus7

    if (isUpcoming) {
      // preregistro_pending
      if (!res.preregistro_completado) {
        alerts.push({
          id: `op_prereg_${res.id}`,
          type: 'preregistro_pending',
          title: 'Pre-registro pendiente',
          message: `${name} · llega el ${formatDate(res.check_in)}`,
          related_type: 'reservation',
          related_id: res.id,
          is_operational: true,
        })
      }

      // balance_pending
      const balance = Number(res.total_amount || 0) - Number(res.paid_amount || 0)
      if (balance > 0) {
        alerts.push({
          id: `op_balance_${res.id}`,
          type: 'balance_pending',
          title: 'Saldo pendiente',
          message: `${name} · $${balance.toLocaleString('es-CO')} pendiente`,
          related_type: 'reservation',
          related_id: res.id,
          is_operational: true,
        })
      }

      // check_in_proximos
      alerts.push({
        id: `op_proximos_${res.id}`,
        type: 'check_in_proximos',
        title: 'Check-in próximo',
        message: `${name} · ${formatDate(res.check_in)}${unit ? ' · ' + unit : ''}`,
        related_type: 'reservation',
        related_id: res.id,
        is_operational: true,
      })
    }
  }

  operationalAlerts.value = alerts
}

// Combina ambas fuentes eliminando duplicados.
// Si una notificación en DB tiene el mismo type + related_id que una alerta
// operativa, se muestra solo la de DB.
const items = computed(() => {
  const dbNotifs = notifStore.notifications
  const dbSet = new Set(dbNotifs.map(n => `${n.type}__${n.related_id}`))
  const filteredOps = operationalAlerts.value.filter(
    op => !dbSet.has(`${op.type}__${op.related_id}`)
  )
  return [...filteredOps, ...dbNotifs]
})

// Clamp index cuando la lista se reduce
watch(
  () => items.value.length,
  (newLen) => {
    if (currentIndex.value >= newLen) {
      currentIndex.value = Math.max(0, newLen - 1)
    }
  }
)

onMounted(() => {
  buildOperationalAlerts()
})

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

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

const handleCardClick = async (item) => {
  if (!item.is_operational) {
    await notifStore.markAsRead(item.id)
  }
  if (!item.related_type || !item.related_id) return
  const map = {
    reservation: `/reservas/${item.related_id}`,
    inquiry: `/consultas/${item.related_id}`,
    guest: `/huespedes/${item.related_id}`,
  }
  const path = map[item.related_type]
  if (path) router.push(path)
}
</script>
