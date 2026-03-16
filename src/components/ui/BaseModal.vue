<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Overlay -->
    <div 
      class="absolute inset-0 bg-black opacity-50 transition-opacity"
      @click="close"
    ></div>
    
    <!-- Modal Panel -->
    <div 
      class="bg-white rounded-xl shadow-xl z-50 flex flex-col max-h-[90vh] overflow-hidden transform transition-all"
      :class="widthClass"
      role="dialog"
      aria-modal="true"
    >
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
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
      
      <div class="px-6 py-6 overflow-y-auto flex-1">
        <slot></slot>
      </div>
      
      <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
  }
})

const emit = defineEmits(['close'])

const widthClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-full max-w-sm'
    case 'lg': return 'w-full max-w-4xl'
    default: return 'w-full max-w-2xl'
  }
})

const close = () => {
  emit('close')
}
</script>
