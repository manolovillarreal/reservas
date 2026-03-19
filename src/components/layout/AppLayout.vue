<template>
  <div class="flex h-screen bg-[#FAFAFA] font-sans overflow-hidden text-gray-900">
    
    <!-- Sidebar -->
    <aside 
      class="bg-gray-900 text-gray-50 flex flex-col transition-all duration-300 z-20"
      :class="isSidebarCollapsed ? 'w-16' : 'w-56'"
    >
      <!-- Logo Area -->
      <div class="h-16 flex items-center px-4 border-b border-gray-800">
        <div class="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center font-bold text-white shrink-0">
          HF
        </div>
        <span v-if="!isSidebarCollapsed" class="ml-3 font-semibold text-lg whitespace-nowrap overflow-hidden">
          HostFlow
        </span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <router-link 
          v-for="item in visiblePrimaryNav" :key="item.name"
          :to="item.to"
          class="flex items-center px-2 py-2 rounded-md transition-colors group"
          :class="[$route.path === item.to ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white']"
          :title="isSidebarCollapsed ? item.name : ''"
        >
          <span class="text-xl w-6 text-center select-none" v-html="item.icon"></span>
          <span v-if="!isSidebarCollapsed" class="ml-3 text-sm font-medium">{{ item.name }}</span>
        </router-link>

        <div class="pt-4 pb-2 mt-4 border-t border-gray-800">
          <router-link 
            v-for="item in visibleSecondaryNav" :key="item.name"
            :to="item.to"
            class="flex items-center px-2 py-2 rounded-md transition-colors group"
            :class="[$route.path === item.to ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white']"
            :title="isSidebarCollapsed ? item.name : ''"
          >
            <span class="text-xl w-6 text-center select-none" v-html="item.icon"></span>
            <span v-if="!isSidebarCollapsed" class="ml-3 text-sm font-medium">{{ item.name }}</span>
          </router-link>
        </div>
      </nav>

      <!-- User Area / Toggle -->
      <div class="p-4 border-t border-gray-800 flex items-center">
        <button 
          @click="isSidebarCollapsed = !isSidebarCollapsed"
          class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white shrink-0"
        >
          {{ isSidebarCollapsed ? '>>' : '<<' }}
        </button>
        <div v-if="!isSidebarCollapsed" class="ml-3 flex flex-col overflow-hidden">
          <span class="text-sm font-medium truncate">{{ userLabel }}</span>
          <span class="text-xs text-gray-500 capitalize">{{ roleLabel }}</span>
          <button @click="logout" class="text-left text-xs text-gray-400 hover:text-white">
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Main view scrolling area -->
      <main class="flex-1 overflow-y-auto p-8 border-l border-gray-200">
        <router-view></router-view>
      </main>
    </div>
    
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { usePermissions } from '../../composables/usePermissions'

const isSidebarCollapsed = ref(false)
const router = useRouter()
const accountStore = useAccountStore()
const { can } = usePermissions()

const primaryNav = [
  { name: 'Dashboard', to: '/', icon: '◫' },
  { name: 'Reservas', to: '/reservas', icon: '☰' },
  { name: 'Pagos', to: '/pagos', icon: '💳' },
  { name: 'Consultas', to: '/consultas', icon: '❓' },
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
    if (item.to === '/consultas') return can('inquiries', 'view')
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

const logout = async () => {
  await supabase.auth.signOut()
  accountStore.clear()
  router.push({ name: 'login' })
}
</script>
