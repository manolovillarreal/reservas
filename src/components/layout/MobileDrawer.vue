<template>
  <Transition name="drawer-fade">
    <div v-if="modelValue" class="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" @click="closeDrawer"></div>

      <Transition name="drawer-slide">
        <aside
          v-if="modelValue"
          class="absolute inset-y-0 left-0 flex w-[85vw] max-w-[280px] flex-col border-r border-[#E5E7EB] bg-white shadow-xl"
        >
          <header class="border-b border-[#E5E7EB] px-4 py-4">
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 rounded-[8px] bg-primary text-center leading-8 text-xs font-semibold text-white">TI</div>
              <div>
                <p class="text-sm font-semibold text-[#111827]">TekMi Inn</p>
                <p class="text-xs text-[#6B7280]">{{ accountStore.currentAccountName || 'Sin alojamiento' }}</p>
              </div>
            </div>
            <div class="mt-3">
              <p class="text-sm font-medium text-[#111827]">{{ userLabel }}</p>
              <p class="text-xs capitalize text-[#6B7280]">{{ accountStore.currentUserRole || 'sin rol' }}</p>
            </div>
          </header>

          <nav class="scroll-container flex-1 overflow-y-auto px-3 py-3" aria-label="Navegacion principal">
            <button
              v-for="item in primaryItems"
              :key="item.name"
              type="button"
              class="touch-target mb-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
              :class="isActive(item.to) ? 'bg-[#EEF2FF] text-[#4C2FFF]' : 'text-[#111827] hover:bg-[#F8F9FC]'"
              @click="goTo(item.to)"
            >
              {{ item.name }}
            </button>

            <div class="my-3 border-t border-[#E5E7EB]"></div>

            <button
              v-for="item in secondaryItems"
              :key="item.name"
              type="button"
              class="touch-target mb-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors"
              :class="isActive(item.to) ? 'bg-[#EEF2FF] text-[#4C2FFF]' : 'text-[#111827] hover:bg-[#F8F9FC]'"
              @click="goTo(item.to)"
            >
              {{ item.name }}
            </button>
          </nav>

          <footer class="border-t border-[#E5E7EB] px-4 py-3" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
            <p class="truncate text-xs text-[#6B7280]">{{ userEmail || 'sin-email@tekmi.app' }}</p>
            <button type="button" class="mt-2 text-sm font-medium text-[#111827] underline" @click="logout">
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
    { name: 'Pagos', to: '/pagos' },
  ]

  return items.filter((item) => {
    if (item.to === '/reservas') return can('reservations', 'view')
    if (item.to === '/consultas') return can('inquiries', 'view')
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
