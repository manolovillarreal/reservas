import { defineStore } from 'pinia'
import { ref } from 'vue'

let toastIdCounter = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  const removeToast = (id) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const pushToast = ({ type = 'info', message = '', duration = 3000 }) => {
    const id = `toast-${Date.now()}-${toastIdCounter++}`
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 3000

    toasts.value.push({ id, type, message, duration: safeDuration })

    window.setTimeout(() => {
      removeToast(id)
    }, safeDuration)

    return id
  }

  return {
    toasts,
    pushToast,
    removeToast,
  }
})
