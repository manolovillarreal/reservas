<template>
  <article
    class="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
    :class="onClick ? 'cursor-pointer transition hover:border-[#D1D5DB] hover:shadow' : ''"
  >
    <header class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-[#111827]">{{ title }}</h3>
        <p v-if="subtitle" class="mt-1 text-xs text-[#6B7280]">{{ subtitle }}</p>
      </div>      
      <span v-if="badge && badge.label" class="rounded-full px-2 py-0.5 text-xs font-medium" :class="badgeClass">
        {{ badge.label }}
      </span>
    </header>

    <dl v-if="safeMeta.length > 0" class="mt-3 space-y-2">
      <div v-for="(item, index) in safeMeta" :key="`meta-${index}`" class="flex items-start justify-between gap-3 text-sm">
        <dt class="text-[#6B7280]">{{ item.label }}</dt>
        <dd class="text-right text-[#111827]">{{ item.value }}</dd>
      </div>
    </dl>

    <footer v-if="safeActions.length > 0" class="mt-4 flex flex-wrap gap-2 border-t border-[#E5E7EB] pt-3">
      <button
        v-for="(action, index) in safeActions"
        :key="`action-${index}`"
        type="button"
        class="touch-target rounded-md px-3 py-2 text-sm font-medium"
        :class="actionClass(action.type)"
        @click.stop="handleAction(action, index)"
      >
        {{ action.label }}
      </button>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  badge: { type: Object, default: null },
  meta: { type: Array, default: () => [] },
  actions: { type: Array, default: () => [] },
  onClick: { type: Function, default: null }
})

const emit = defineEmits(['click', 'action'])

const safeMeta = computed(() => (Array.isArray(props.meta) ? props.meta : []))
const safeActions = computed(() => (Array.isArray(props.actions) ? props.actions : []))

const badgeClass = computed(() => {
  const type = props.badge?.type || 'info'
  if (type === 'success') return 'bg-emerald-100 text-emerald-700'
  if (type === 'warning') return 'bg-amber-100 text-amber-700'
  if (type === 'danger') return 'bg-red-100 text-red-700'
  if (type === 'neutral') return 'bg-gray-100 text-gray-700'
  return 'bg-[#EEF2FF] text-[#4C2FFF]'
})

const actionClass = (type) => {
  if (type === 'danger') return 'bg-red-50 text-red-700 hover:bg-red-100'
  if (type === 'ghost') return 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F8F9FC]'
  return 'bg-[#EEF2FF] text-[#4C2FFF] hover:bg-[#E0E7FF]'
}

const handleCardClick = () => {
  emit('click')
  if (typeof props.onClick === 'function') {
    props.onClick()
  }
}

const handleAction = (action, index) => {
  emit('action', { action, index })
  if (typeof action?.handler === 'function') {
    action.handler()
  }
}
</script>


