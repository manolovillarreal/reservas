<template>
  <BaseModal :isOpen="isOpen" :title="title" :size="size" @close="handleClose">
    <div class="space-y-4">
      <p class="text-sm text-gray-600 whitespace-pre-line">{{ message }}</p>

      <div v-if="confirmationText" class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Escribe exactamente este texto para continuar
        </p>
        <div class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {{ confirmationText }}
        </div>
        <input
          :value="modelValue"
          type="text"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Escribe el texto de confirmación"
          @input="$emit('update:modelValue', $event.target.value)"
        >
      </div>

      <p v-if="errorMessage" class="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ errorMessage }}
      </p>
    </div>

    <template #footer>
      <button type="button" class="btn-secondary" :disabled="loading" @click="handleClose">
        Cancelar
      </button>
      <button
        type="button"
        class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="isConfirmDisabled"
        @click="$emit('confirm')"
      >
        {{ loading ? 'Procesando...' : confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Confirmar' },
  confirmationText: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  size: { type: String, default: 'sm' }
})

const emit = defineEmits(['close', 'confirm', 'update:modelValue'])

const isConfirmDisabled = computed(() => {
  if (props.loading) return true
  if (!props.confirmationText) return false
  return props.modelValue.trim() !== props.confirmationText
})

const handleClose = () => {
  if (props.loading) return
  emit('close')
}
</script>
