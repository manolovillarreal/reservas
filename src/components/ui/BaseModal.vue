<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center" :class="wrapperClass">
    <!-- Overlay -->
    <div 
      class="absolute inset-0 bg-black opacity-50 transition-opacity"
      @click="close"
    ></div>
    
    <!-- Modal Panel -->
    <div
      class="bg-white shadow-xl z-50 flex flex-col overflow-hidden transform transition-all"
      :class="panelClass"
      role="dialog"
      aria-modal="true"
    >
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between sm:px-6 sm:py-4">
        <h3 class="text-xl font-semibold text-gray-900" id="modal-title">
          {{ title }}
        </h3>
        <button 
          @click="close" 
          class="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
        >
          <span class="sr-only">Cerrar</span>
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <slot></slot>
      </div>
      
      <div v-if="$slots.footer" class="safe-area-bottom flex justify-center gap-3 border-t border-gray-200 bg-gray-50 px-4 pb-6 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'md' // sm (400px), md (600px), lg (800px)
  },
  fullScreenOnMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const { isMobile } = useBreakpoint()

const wrapperClass = computed(() => {
  if (props.fullScreenOnMobile && isMobile.value) {
    return 'p-0'
  }
  return 'p-4'
})

const widthClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-full max-w-sm'
    case 'lg': return 'w-full max-w-4xl'
    default: return 'w-full max-w-2xl'
  }
})

const panelClass = computed(() => {
  if (props.fullScreenOnMobile && isMobile.value) {
    return 'h-[100dvh] w-full rounded-none max-h-none'
  }

  return `rounded-xl max-h-[90vh] ${widthClass.value}`
})

const close = () => {
  emit('close')
}
</script>


