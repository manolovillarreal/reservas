<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
    aria-label="Navegacion principal mobile"
  >
    <div class="mx-auto flex h-[56px] max-w-screen-sm items-stretch justify-between px-2">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        class="touch-target flex flex-1 flex-col items-center justify-center rounded-md"
        :class="item.key === 'more' ? 'text-[#9CA3AF]' : isActive(item) ? 'text-[#4C2FFF]' : 'text-[#9CA3AF]'"
        @click="handlePress(item)"
      >
        <component :is="item.icon" class="transition-all" :class="isActive(item) ? 'h-5 w-5' : 'h-[18px] w-[18px]'" />
        <span class="mt-0.5 text-[11px] leading-none">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits(['open-drawer'])

const route = useRoute()
const router = useRouter()

const iconBase = 'currentColor'

const HouseIcon = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: iconBase, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('path', { d: 'M3 10.5L12 3l9 7.5' }),
      h('path', { d: 'M5 9.5V20h14V9.5' }),
      h('path', { d: 'M10 20v-6h4v6' }),
    ])
  }
}

const CalendarCheckIcon = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: iconBase, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('path', { d: 'M8 2v4' }),
      h('path', { d: 'M16 2v4' }),
      h('rect', { x: '3', y: '5', width: '18', height: '16', rx: '2' }),
      h('path', { d: 'M3 10h18' }),
      h('path', { d: 'M9 15l2 2 4-4' }),
    ])
  }
}

const CalendarIcon = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: iconBase, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('path', { d: 'M8 2v4' }),
      h('path', { d: 'M16 2v4' }),
      h('rect', { x: '3', y: '5', width: '18', height: '16', rx: '2' }),
      h('path', { d: 'M3 10h18' }),
    ])
  }
}

const MessageCircleIcon = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: iconBase, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('path', { d: 'M21 12a8.5 8.5 0 01-8.5 8.5H5l-2 2v-7.5A8.5 8.5 0 1112 3.5 8.5 8.5 0 0121 12z' }),
    ])
  }
}

const MoreIcon = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: iconBase, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('circle', { cx: '5', cy: '12', r: '1.5', fill: iconBase, stroke: 'none' }),
      h('circle', { cx: '12', cy: '12', r: '1.5', fill: iconBase, stroke: 'none' }),
      h('circle', { cx: '19', cy: '12', r: '1.5', fill: iconBase, stroke: 'none' }),
    ])
  }
}

const navItems = computed(() => [
  { key: 'dashboard', label: 'Dashboard', to: '/', icon: HouseIcon },
  { key: 'reservas', label: 'Reservas', to: '/reservas', icon: CalendarCheckIcon },
  { key: 'calendario', label: 'Calendario', to: '/calendario', icon: CalendarIcon },
  { key: 'consultas', label: 'Consultas', to: '/consultas', icon: MessageCircleIcon },
  { key: 'more', label: 'Mas', icon: MoreIcon },
])

const isActive = (item) => {
  if (!item.to) return false
  if (item.to === '/calendario') {
    return route.path === '/calendario' || route.path === '/calendar' || route.path.startsWith('/calendar/')
  }
  if (item.to === '/') return route.path === '/'
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const handlePress = async (item) => {
  if (item.key === 'more') {
    emit('open-drawer')
    return
  }

  if (!item.to || isActive(item)) return
  await router.push(item.to)
}
</script>
