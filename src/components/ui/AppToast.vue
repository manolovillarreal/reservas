<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto rounded-lg border px-4 py-3 shadow-lg"
          :class="typeClassMap[toast.type] || typeClassMap.info"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-medium leading-5">{{ toast.message }}</p>
            <button
              class="shrink-0 text-xs font-semibold opacity-75 transition-opacity hover:opacity-100"
              type="button"
              @click="toastStore.removeToast(toast.id)"
            >
              Cerrar
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToastStore } from '../../stores/toast'

const toastStore = useToastStore()

const typeClassMap = {
  success: 'border-[#10B981]/30 bg-[#10B981]/10 text-[#065F46]',
  error: 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#991B1B]',
  info: 'border-[#2563EB]/30 bg-[#2563EB]/10 text-[#1E3A8A]',
  warning: 'border-[#F97316]/30 bg-[#F97316]/10 text-[#9A3412]',
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
