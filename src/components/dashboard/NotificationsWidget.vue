<template>
  <div v-if="unreadNotifications.length > 0" class="card overflow-hidden !p-0">
    <!-- Header with arrows -->
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-700">
        Notificaciones
        <span class="ml-1.5 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {{ unreadNotifications.length }}
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
          :disabled="currentIndex >= unreadNotifications.length - 1"
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
          v-for="notification in unreadNotifications"
          :key="notification.id"
          class="w-full shrink-0 cursor-pointer px-4 py-4"
          @click="handleCardClick(notification)"
        >
          <p class="truncate text-sm font-semibold text-gray-900">{{ notification.title }}</p>
          <p v-if="notification.message" class="mt-1 line-clamp-2 text-sm text-gray-500">{{ notification.message }}</p>
          <p class="mt-2 text-xs text-gray-400">{{ timeAgo(notification.created_at) }}</p>
        </div>
      </div>
    </div>

    <!-- Dots indicator -->
    <div v-if="unreadNotifications.length > 1" class="flex justify-center gap-1.5 pb-3 pt-1">
      <button
        v-for="(_, i) in unreadNotifications"
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
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '../../stores/notifications'

const store = useNotificationsStore()
const router = useRouter()

const currentIndex = ref(0)
const touchStartX = ref(0)

const unreadNotifications = computed(() =>
  store.notifications.filter(n => !n.is_read)
)

// Clamp index when unread list shrinks
watch(
  () => unreadNotifications.value.length,
  (newLen) => {
    if (currentIndex.value >= newLen) {
      currentIndex.value = Math.max(0, newLen - 1)
    }
  }
)

const prev = () => {
  if (currentIndex.value > 0) currentIndex.value--
}

const next = () => {
  if (currentIndex.value < unreadNotifications.value.length - 1) currentIndex.value++
}

const onTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX
}

const onTouchEnd = (e) => {
  const diff = touchStartX.value - e.changedTouches[0].clientX
  if (Math.abs(diff) > 50) {
    if (diff > 0) next()
    else prev()
  }
}

const timeAgo = (dateStr) => {
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

const handleCardClick = async (notification) => {
  await store.markAsRead(notification.id)
  if (!notification.related_type || !notification.related_id) return
  const map = {
    reservation: `/reservas/${notification.related_id}`,
    inquiry: `/consultas/${notification.related_id}`,
    guest: `/huespedes/${notification.related_id}`,
  }
  const path = map[notification.related_type]
  if (path) router.push(path)
}
</script>
