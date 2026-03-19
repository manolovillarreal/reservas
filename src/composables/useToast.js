import { useToastStore } from '../stores/toast'

export const useToast = () => {
  const toastStore = useToastStore()

  return {
    success: (message, duration = 3000) => toastStore.pushToast({ type: 'success', message, duration }),
    error: (message, duration = 3000) => toastStore.pushToast({ type: 'error', message, duration }),
    info: (message, duration = 3000) => toastStore.pushToast({ type: 'info', message, duration }),
    warning: (message, duration = 3000) => toastStore.pushToast({ type: 'warning', message, duration }),
  }
}
