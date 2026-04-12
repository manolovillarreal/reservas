<template>
  <div v-if="items.length > 0" class="card overflow-hidden !p-0">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-700">
        Notificaciones
        <span class="ml-1.5 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
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
        <div v-for="item in items" :key="item.id" class="w-full shrink-0 cursor-pointer px-4 py-4" @click="handleClick(item)">
          <div class="relative flex items-start gap-2">
            <button
              v-if="!item.is_alert"
              type="button"
              class="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition hover:bg-white hover:text-gray-700"
              aria-label="Descartar notificación"
              @click.stop="dismiss(item.id)"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span class="mt-0.5 text-base leading-none">{{ typeIcon(item.type) }}</span>
            <div class="min-w-0 pr-5">
              <p class="truncate text-sm font-semibold text-gray-900">{{ item.title }}</p>
              <p v-if="item.message" class="mt-1 line-clamp-2 text-sm text-gray-500">{{ item.message }}</p>
              <p class="mt-2 text-xs text-gray-400">{{ timeAgo(item.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="items.length > 1" class="flex justify-center gap-1.5 pb-3 pt-1">
      <button v-for="(_, i) in items" :key="i" type="button" class="h-1.5 rounded-full transition-all" :class="i === currentIndex ? 'w-4 bg-indigo-500' : 'w-1.5 bg-gray-300'" @click="currentIndex = i" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '../../stores/notifications'

const notifStore = useNotificationsStore()
const router = useRouter()

const currentIndex = ref(0)
const touchStartX = ref(0)

const items = computed(() => notifStore.ephemeralNotifications)

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
    nueva_reserva: '✅',
    nueva_consulta: '💬',
    reserva_cancelada: '❌',
    checkin_realizado: '🏨',
    anticipo_registrado: '💰',
    preregistro_completado: '📋',
  }
  return icons[type] || '🔔'
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Ahora mismo'
  if (mins < 60) return 'Hace ' + mins + ' min'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return 'Hace ' + hours + (hours > 1 ? ' horas' : ' hora')
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  return 'Hace ' + days + ' dias'
}

const handleClick = async (item) => {
  await notifStore.markAsRead(item.id)
  if (!item.related_type || !item.related_id) return
  const paths = {
    reservation: '/reservas/' + item.related_id,
    inquiry: '/consultas/' + item.related_id,
  }
  const path = paths[item.related_type]
  if (path) router.push(path)
}

const dismiss = async (id) => {
  await notifStore.markAsRead(id)
}
</script>