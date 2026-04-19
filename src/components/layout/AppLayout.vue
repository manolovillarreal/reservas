<template>
  <div class="h-screen overflow-hidden bg-[#FAFAFA] font-sans text-gray-900">
    <header v-if="isMobile" class="fixed inset-x-0 top-0 z-30 flex h-[52px] items-center justify-between border-b border-[#374151] bg-[#111827] px-3">
      <button type="button" class="touch-target rounded-md text-[#9CA3AF]" @click="openDrawer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <button
        type="button"
        class="relative touch-target rounded-md text-[#9CA3AF]"
        @click="showNotificationsPanel = !showNotificationsPanel"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5" aria-hidden="true">
          <path d="M12 3a4 4 0 00-4 4v2.2A5 5 0 015.2 13L4 14.2V16h16v-1.8L18.8 13A5 5 0 0118 9.2V7a4 4 0 00-4-4z" />
          <path d="M9.5 19a2.5 2.5 0 005 0" />
        </svg>
        <span
          v-if="notificationsStore.unreadCount > 0"
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white"
        >{{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}</span>
      </button>
    </header>

    <aside
      v-if="!isMobile"
      class="fixed inset-y-0 left-0 z-20 flex flex-col bg-gray-900 text-gray-50 transition-all duration-300"
      :style="{ width: `${sidebarWidth}px` }"
    >
      <div class="flex h-16 items-center border-b border-gray-800 px-4">
        <img :src="LogoImage" alt="TekMi Inn" class="h-9 w-9 shrink-0 rounded-[8px] object-contain">
        <div v-if="!isSidebarCollapsed" class="ml-3 flex items-baseline overflow-hidden whitespace-nowrap">
          <span class="text-[18px] font-semibold text-white">TekMi</span>
          <span class="ml-1 text-[18px] font-normal text-neutral-muted">. Inn</span>
        </div>
      </div>

      <nav class="scroll-container flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <router-link
          v-for="item in visiblePrimaryNav"
          :key="item.name"
          :to="item.to"
          class="flex items-center rounded-md px-2 py-2 transition-colors group"
          :class="[$route.path === item.to ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white']"
          :title="isSidebarCollapsed ? item.name : ''"
        >
          <span class="w-6 select-none text-center text-xl" v-html="item.icon"></span>
          <span v-if="!isSidebarCollapsed" class="ml-3 text-sm font-medium">{{ item.name }}</span>
        </router-link>

        <button
          type="button"
          class="group relative flex w-full items-center rounded-md px-2 py-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          :title="isSidebarCollapsed ? 'Notificaciones' : ''"
          @click="showNotificationsPanel = !showNotificationsPanel"
        >
          <span class="relative w-6 select-none text-center text-xl">
            🔔
            <span
              v-if="notificationsStore.unreadCount > 0"
              class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white"
            >{{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}</span>
          </span>
          <span v-if="!isSidebarCollapsed" class="ml-3 text-sm font-medium">Notificaciones</span>
        </button>

        <div class="mt-4 border-t border-gray-800 pb-2 pt-4">
          <router-link
            v-for="item in visibleSecondaryNav"
            :key="item.name"
            :to="item.to"
            class="flex items-center rounded-md px-2 py-2 transition-colors group"
            :class="[$route.path === item.to ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white']"
            :title="isSidebarCollapsed ? item.name : ''"
          >
            <span class="w-6 select-none text-center text-xl" v-html="item.icon"></span>
            <span v-if="!isSidebarCollapsed" class="ml-3 text-sm font-medium">{{ item.name }}</span>
          </router-link>
        </div>
      </nav>

      <div class="flex items-center border-t border-gray-800 p-4">
        <button
          type="button"
          @click="toggleSidebar"
          class="touch-target h-8 w-8 shrink-0 rounded-full bg-gray-800 text-gray-400 hover:text-white"
        >
          {{ isSidebarCollapsed ? '>>' : '<<' }}
        </button>

        <div v-if="!isSidebarCollapsed" class="ml-3 flex flex-1 flex-col overflow-hidden">
          <span class="truncate text-sm font-medium">{{ userLabel }}</span>
          <span class="text-xs capitalize text-gray-500">{{ roleLabel }}</span>
          <button type="button" @click="logout" class="text-left text-xs text-gray-400 hover:text-white">Cerrar sesion</button>
        </div>

        <button
          v-if="isTablet"
          type="button"
          class="touch-target ml-2 h-8 w-8 rounded-full bg-gray-800 text-gray-400 hover:text-white"
          @click="openDrawer"
          title="Abrir menu"
        >
          ...
        </button>
      </div>
    </aside>

    <div class="flex h-full min-w-0 flex-col overflow-hidden" :style="mainContainerStyle">
      <main class="scroll-container flex-1 overflow-y-auto border-l border-gray-200 p-4 sm:p-6 lg:p-8" :style="mainContentStyle">
        <div v-if="isOffline || updateAvailable" class="sticky top-0 z-10 mb-4 space-y-2">
          <div
            v-if="isOffline"
            class="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 shadow-sm"
          >
            {{ offlineBannerText }}
          </div>

          <div
            v-if="updateAvailable"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 shadow-sm"
          >
            <span>Hay una actualización disponible</span>
            <button
              type="button"
              class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              @click="applyPwaUpdate"
            >
              Actualizar ahora
            </button>
          </div>
        </div>

        <router-view></router-view>
      </main>
    </div>

    <NotificationsPanel
      :isOpen="showNotificationsPanel"
      :sidebarOffset="sidebarWidth"
      @close="showNotificationsPanel = false"
    />
    <MobileNav v-if="isMobile" @open-drawer="openDrawer" />
    <MobileDrawer v-model="isDrawerOpen" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectivity } from '../../composables/useConnectivity'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { usePermissions } from '../../composables/usePermissions'
import { warmPriorityOfflineData } from '../../services/offlineWarmup'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useNotificationsStore } from '../../stores/notifications'
import { useSourcesStore } from '../../stores/sources'
import NotificationsPanel from '../notifications/NotificationsPanel.vue'
import LogoImage from '../../assets/logo.jpeg'
import MobileDrawer from './MobileDrawer.vue'
import MobileNav from './MobileNav.vue'

const isSidebarCollapsed = ref(false)
const isDrawerOpen = ref(false)
const showNotificationsPanel = ref(false)
const router = useRouter()
const accountStore = useAccountStore()
const sourcesStore = useSourcesStore()
const { can } = usePermissions()
const { isMobile, isTablet, isDesktop } = useBreakpoint()
const notificationsStore = useNotificationsStore()
const { isOnline, isOffline, lastSyncLabel, hasSyncTimestamp, updateAvailable, applyPwaUpdate } = useConnectivity()

const EXPANDED_WIDTH = 220
const COLLAPSED_WIDTH = 56

const sidebarWidth = computed(() => (isSidebarCollapsed.value ? COLLAPSED_WIDTH : EXPANDED_WIDTH))

const mainContainerStyle = computed(() => {
  if (isMobile.value) {
    return { marginLeft: '0px' }
  }
  return { marginLeft: `${sidebarWidth.value}px` }
})

const mainContentStyle = computed(() => {
  if (!isMobile.value) return {}
  return {
    paddingTop: '68px',
    paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)'
  }
})

const openDrawer = () => {
  isDrawerOpen.value = true
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

watch(isTablet, (value) => {
  if (value) {
    isSidebarCollapsed.value = true
  }
}, { immediate: true })

watch(isDesktop, (value) => {
  if (value) {
    isSidebarCollapsed.value = false
  }
})

watch(isMobile, (value) => {
  if (!value) {
    isDrawerOpen.value = false
  }
})

const primaryNav = [
  { name: 'Dashboard', to: '/', icon: '◫' },
  { name: 'Reservas', to: '/reservas', icon: '☰' },
  { name: 'Pagos', to: '/pagos', icon: '💳' },
  { name: 'Reportes', to: '/reportes', icon: '📈' },
  { name: 'Consultas', to: '/consultas', icon: '❓' },
  { name: 'Mensajes', to: '/mensajes', icon: '✉️' },
  { name: 'Bloqueos', to: '/bloqueos', icon: '🔒' },
  { name: 'Calendario', to: '/calendar', icon: '📅' },
  { name: 'Huéspedes', to: '/huespedes', icon: '👥' },
]

const secondaryNav = [
  { name: 'Sedes', to: '/sedes', icon: '🏢' },
  { name: 'Unidades', to: '/unidades', icon: '🏠' },
  { name: 'Configuración', to: '/configuracion', icon: '⚙️' },
]

const visiblePrimaryNav = computed(() => {
  return primaryNav.filter((item) => {
    if (item.to === '/reservas') return can('reservations', 'view')
    if (item.to === '/pagos') return can('payments', 'view')
    if (item.to === '/reportes') return can('reports', 'view_financial') || can('payments', 'view')
    if (item.to === '/consultas') return can('inquiries', 'view')
    if (item.to === '/mensajes') return can('settings', 'edit')
    if (item.to === '/bloqueos') return can('occupancies', 'view')
    if (item.to === '/calendar') return can('calendar', 'view')
    if (item.to === '/huespedes') return can('guests', 'view')
    return true
  })
})

const visibleSecondaryNav = computed(() => {
  return secondaryNav.filter((item) => {
    if (item.to === '/unidades') return can('units', 'create') || can('units', 'edit') || can('units', 'delete')
    if (item.to === '/configuracion') return can('settings', 'edit') || can('users', 'invite')
    return true
  })
})

const userLabel = computed(() => {
  return accountStore.currentAccountName || 'Sin cuenta'
})

const roleLabel = computed(() => {
  return accountStore.currentUserRole || 'sin rol'
})

const offlineBannerText = computed(() => {
  if (!isOffline.value) return ''
  if (hasSyncTimestamp.value && lastSyncLabel.value) {
    return `Sin conexión · Mostrando datos del ${lastSyncLabel.value}`
  }
  return 'Sin conexión · Mostrando la última información disponible.'
})

const logout = async () => {
  await supabase.auth.signOut()
  sourcesStore.clear()
  accountStore.clear()
  router.push({ name: 'login' })
}

watch(isOnline, (value, previousValue) => {
  if (value && previousValue === false && accountStore.currentAccountId) {
    void warmPriorityOfflineData()
  }
})

onMounted(() => {
  notificationsStore.fetchNotifications()
})
</script>
