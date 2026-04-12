<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 bg-black/20"
      @click="emit('close')"
    />

    <!-- Panel -->
    <Transition name="notif-panel">
      <div
        v-if="isOpen"
        class="fixed z-50 flex flex-col bg-white shadow-xl"
        :class="isMobile
          ? 'inset-x-0 top-[52px] max-h-[75vh] rounded-b-2xl'
          : 'top-0 h-screen w-96'"
        :style="!isMobile ? { left: `${sidebarOffset}px` } : {}"
      >
        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 class="text-base font-semibold text-gray-900">Notificaciones</h2>
          <div class="flex items-center gap-3">
            <button
              v-if="store.unreadCount > 0"
              type="button"
              class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              @click="handleMarkAll"
            >
              Marcar todas como leídas
            </button>
            <button
              type="button"
              class="touch-target rounded-md text-gray-400 hover:text-gray-700"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Push notification banner (lazy ask) -->
        <!-- Solo visible si: browser soporta push, no hay suscripción activa,
             el permiso no fue rechazado explícitamente, y el usuario no lo ha descartado. -->
        <div
          v-if="showPushBanner"
          class="shrink-0 border-b border-indigo-100 bg-indigo-50 px-4 py-3"
        >
          <p class="text-sm font-medium text-indigo-800">Activa las notificaciones push</p>
          <p class="mt-0.5 text-xs text-indigo-600">
            Recibe alertas aunque la app esté cerrada o en segundo plano.
          </p>
          <div class="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              class="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              :disabled="subscribing"
              @click="handleSubscribe"
            >
              {{ subscribing ? 'Activando...' : 'Activar notificaciones push' }}
            </button>
            <button
              type="button"
              class="text-xs text-indigo-500 hover:text-indigo-700"
              @click="showPushBanner = false"
            >
              Ahora no
            </button>
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto">
          <!-- Empty state -->
          <div v-if="store.notifications.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
            <div class="mb-3 text-4xl">🔔</div>
            <p class="text-sm font-medium text-gray-600">Sin notificaciones</p>
            <p class="mt-1 text-xs text-gray-400">Aquí aparecerán los eventos importantes.</p>
          </div>

          <!-- Notification items -->
          <ul v-else class="divide-y divide-gray-50">
            <li
              v-for="notification in store.notifications"
              :key="notification.id"
              class="relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors bg-indigo-50/50 hover:bg-indigo-100/50"
              @click="handleItemClick(notification)"
            >
              <button
                v-if="!notification.is_alert"
                type="button"
                class="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition hover:bg-white hover:text-gray-700"
                aria-label="Descartar notificación"
                @click.stop="handleDismiss(notification.id)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <!-- Unread dot -->
              <div class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
              <div class="min-w-0 flex-1 pr-5">
                <p class="truncate text-sm font-medium leading-snug text-gray-900">{{ notification.title }}</p>
                <p v-if="notification.message" class="mt-0.5 line-clamp-2 text-xs text-gray-500">{{ notification.message }}</p>
                <p class="mt-1 text-xs text-gray-400">{{ timeAgo(notification.created_at) }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '../../stores/notifications'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { usePushNotifications } from '../../composables/usePushNotifications'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  sidebarOffset: { type: Number, default: 220 },
})

const emit = defineEmits(['close'])

const store = useNotificationsStore()
const router = useRouter()
const { isMobile } = useBreakpoint()
const { isSupported, isSubscribed, subscribe, checkSubscriptionStatus } = usePushNotifications()

const subscribing = ref(false)

// El banner se muestra si el browser soporta push, el dispositivo no está suscrito
// y el usuario no ha rechazado explícitamente el permiso en este navegador.
const pushPermissionNotDenied = computed(() =>
  typeof Notification !== 'undefined' && Notification.permission !== 'denied'
)

const showPushBanner = computed({
  get: () => isSupported.value && !isSubscribed.value && pushPermissionNotDenied.value && _showBanner.value,
  set: (v) => { _showBanner.value = v },
})
const _showBanner = ref(true)

onMounted(() => {
  if (isSupported.value) checkSubscriptionStatus()
})

const handleSubscribe = async () => {
  subscribing.value = true
  try {
    await subscribe()
  } finally {
    subscribing.value = false
    _showBanner.value = false
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

const getNavigationPath = (notification) => {
  if (!notification.related_type || !notification.related_id) return null
  const map = {
    reservation: `/reservas/${notification.related_id}`,
    inquiry: `/consultas/${notification.related_id}`,
    guest: `/huespedes/${notification.related_id}`,
  }
  return map[notification.related_type] || null
}

const handleItemClick = async (notification) => {
  await store.markAsRead(notification.id)
  const path = getNavigationPath(notification)
  if (path) {
    router.push(path)
    emit('close')
  }
}

const handleDismiss = async (notificationId) => {
  await store.markAsRead(notificationId)
}

const handleMarkAll = async () => {
  await store.markAllAsRead()
}
</script>

<style scoped>
.notif-panel-enter-active,
.notif-panel-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.notif-panel-enter-from,
.notif-panel-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
