<template>
  <Transition name="drawer-fade">
    <div v-if="modelValue" class="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" @click="closeDrawer"></div>

      <Transition name="drawer-slide">
        <aside
          v-if="modelValue"
          class="absolute inset-y-0 left-0 flex w-[85vw] max-w-[280px] flex-col border-r border-[#374151] bg-[#111827] shadow-xl"
        >
          <header class="border-b border-[#374151] px-4 py-4">
            <div class="flex items-center gap-2">
              <img :src="LogoImage" alt="TekMi Inn" class="h-8 w-8 rounded-[8px] object-contain">
              <div>
                <p class="text-sm font-semibold text-[#F9FAFB]">TekMi Inn</p>
                <p class="text-xs text-[#9CA3AF]">{{ accountStore.currentAccountName || 'Sin alojamiento' }}</p>
              </div>
            </div>
            <div class="mt-3">
              <p class="text-sm font-medium text-[#F9FAFB]">{{ userLabel }}</p>
              <p class="text-xs capitalize text-[#9CA3AF]">{{ accountStore.currentUserRole || 'sin rol' }}</p>
            </div>
          </header>

          <nav class="scroll-container flex-1 overflow-y-auto px-3 py-3" aria-label="Navegacion principal">
            <button
              v-for="item in primaryItems"
              :key="item.name"
              type="button"
              class="touch-target mb-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
              :class="isActive(item.to) ? 'bg-[#374151] text-white' : 'text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white'"
              @click="goTo(item.to)"
            >
              {{ item.name }}
            </button>

            <div class="my-3 border-t border-[#374151]"></div>

            <button
              v-for="item in secondaryItems"
              :key="item.name"
              type="button"
              class="touch-target mb-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
              :class="isActive(item.to) ? 'bg-[#374151] text-white' : 'text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white'"
              @click="goTo(item.to)"
            >
              {{ item.name }}
            </button>
          </nav>

          <footer class="border-t border-[#374151] px-4 py-3" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
            <p class="truncate text-xs text-[#9CA3AF]">{{ userEmail || 'sin-email@tekmi.app' }}</p>
            <button type="button" class="touch-target mt-2 text-sm font-medium text-[#F9FAFB] underline" @click="logout">
              Cerrar sesion
            </button>
          </footer>
        </aside>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogoImage from '../../assets/logo.jpeg'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useSourcesStore } from '../../stores/sources'
import { usePermissions } from '../../composables/usePermissions'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const sourcesStore = useSourcesStore()
const { can } = usePermissions()

const userEmail = ref('')

const userLabel = computed(() => accountStore.currentAccountName || 'Usuario')

const primaryItems = computed(() => {
  const items = [
    { name: 'Dashboard', to: '/' },
    { name: 'Reservas', to: '/reservas' },
    { name: 'Calendario', to: '/calendario' },
    { name: 'Consultas', to: '/consultas' },
    { name: 'Mensajes', to: '/mensajes' },
    { name: 'Huéspedes', to: '/huespedes' },
    { name: 'Pagos', to: '/pagos' },
  ]

  return items.filter((item) => {
    if (item.to === '/reservas') return can('reservations', 'view')
    if (item.to === '/consultas') return can('inquiries', 'view')
    if (item.to === '/mensajes') return can('settings', 'edit')
    if (item.to === '/huespedes') return can('guests', 'view')
    if (item.to === '/pagos') return can('payments', 'view')
    if (item.to === '/calendario') return can('calendar', 'view')
    return true
  })
})

const secondaryItems = computed(() => {
  const items = []
  if (can('pricing', 'view')) items.push({ name: 'Tarifas', to: '/tarifas' })
  if (can('settings', 'edit')) items.push({ name: 'Configuracion', to: '/configuracion' })
  return items
})

const closeDrawer = () => {
  emit('update:modelValue', false)
}

const isActive = (target) => {
  if (target === '/calendario') {
    return route.path === '/calendario' || route.path === '/calendar' || route.path.startsWith('/calendar/')
  }
  if (target === '/') return route.path === '/'
  return route.path === target || route.path.startsWith(`${target}/`)
}

const goTo = async (target) => {
  if (!target || isActive(target)) {
    closeDrawer()
    return
  }

  await router.push(target)
  closeDrawer()
}

const logout = async () => {
  await supabase.auth.signOut()
  sourcesStore.clear()
  accountStore.clear()
  closeDrawer()
  await router.push({ name: 'login' })
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  userEmail.value = data?.session?.user?.email || ''
})

watch(() => route.path, () => {
  if (props.modelValue) {
    closeDrawer()
  }
})
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 250ms ease-out;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 250ms ease-out;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}
</style>

