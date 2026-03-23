import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from './account'

export const useNotificationsStore = defineStore('notifications', () => {
  const accountStore = useAccountStore()
  const notifications = ref([])

  const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

  const fetchNotifications = async (limit = 50) => {
    try {
      const accountId = accountStore.getRequiredAccountId()
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit)
      notifications.value = data || []
    } catch (e) {
      // No propagar — si la tabla aún no existe en staging se ignora silenciosamente
      console.warn('[notifications] fetchNotifications failed:', e?.message)
      notifications.value = []
    }
  }

  const markAsRead = async (id) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
      notifications.value = notifications.value.filter(n => n.id !== id)
    } catch (e) {
      console.warn('[notifications] markAsRead failed:', e?.message)
    }
  }

  const markAllAsRead = async () => {
    try {
      const accountId = accountStore.getRequiredAccountId()
      await supabase
        .from('notifications')
        .delete()
        .eq('account_id', accountId)
        .eq('is_read', false)
      notifications.value = notifications.value.filter(n => n.is_read)
    } catch (e) {
      console.warn('[notifications] markAllAsRead failed:', e?.message)
    }
  }

  const addNotification = (notification) => {
    notifications.value.unshift(notification)
  }

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  }
})
