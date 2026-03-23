import { storeToRefs } from 'pinia'
import { useNotificationsStore } from '../stores/notifications'

export function useNotifications() {
  const store = useNotificationsStore()
  const { notifications, unreadCount } = storeToRefs(store)

  return {
    notifications,
    unreadCount,
    fetchNotifications: store.fetchNotifications,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    addNotification: store.addNotification,
  }
}
