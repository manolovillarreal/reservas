<template>
  <Transition name="sheet-fade">
    <div v-if="modelValue" class="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" @click="closeSheet"></div>

      <div
        v-if="isMobile"
        class="absolute inset-x-0 bottom-0 rounded-t-2xl border border-[#E5E7EB] bg-white shadow-xl"
        :class="mobileHeightClass"
        :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
      >
        <div class="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[#D1D5DB]"></div>
        <div class="px-4 pb-4 pt-3">
          <h3 class="text-base font-semibold text-[#111827]">{{ title }}</h3>
          <p v-if="description" class="mt-1 text-sm text-[#6B7280]">{{ description }}</p>

          <div class="scroll-container mt-4" :class="mobileContentClass">
            <slot />
          </div>

          <div v-if="$slots.footer" class="mt-4 border-t border-[#E5E7EB] pt-3">
            <slot name="footer" />
          </div>
        </div>
      </div>

      <div v-else class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
          <div class="px-5 py-4">
            <h3 class="text-lg font-semibold text-[#111827]">{{ title }}</h3>
            <p v-if="description" class="mt-1 text-sm text-[#6B7280]">{{ description }}</p>

            <div class="mt-4 max-h-[70vh] overflow-y-auto">
              <slot />
            </div>

            <div v-if="$slots.footer" class="mt-4 border-t border-[#E5E7EB] pt-3">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  height: {
    type: String,
    default: 'auto',
    validator: (value) => ['auto', 'half', 'full'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue'])

const { isMobile } = useBreakpoint()

const closeSheet = () => emit('update:modelValue', false)

const mobileHeightClass = computed(() => {
  if (props.height === 'full') return 'h-[90vh]'
  if (props.height === 'half') return 'h-[50vh]'
  return 'max-h-[80vh]'
})

const mobileContentClass = computed(() => {
  if (props.height === 'auto') return 'max-h-[50vh] overflow-y-auto'
  return 'h-[calc(100%-24px)] overflow-y-auto'
})
</script>

<style scoped>
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 300ms ease-out;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}
</style>
