import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export const OFFLINE_MUTATION_MESSAGE = 'Esta acción requiere conexión a internet. Conéctate para continuar.'

const LAST_SYNC_PREFIX = 'tekmi_last_sync_at'
const onlineState = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const updateAvailable = ref(false)
let applyUpdateHandler = null

const isBrowser = typeof window !== 'undefined'

const getStorageKey = (scope = 'global') => `${LAST_SYNC_PREFIX}:${scope}`

const dispatchWindowEvent = (name, detail = {}) => {
  if (!isBrowser) return
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

const syncOnlineState = (value) => {
  onlineState.value = Boolean(value)
  dispatchWindowEvent(value ? 'tekmi:online' : 'tekmi:offline')
}

const ensureConnectivityListeners = () => {
  if (!isBrowser || window.__tekmiConnectivityBound) return

  window.__tekmiConnectivityBound = true
  window.addEventListener('online', () => syncOnlineState(true))
  window.addEventListener('offline', () => syncOnlineState(false))
}

ensureConnectivityListeners()

export const isOnlineNow = () => {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

export const requireOnline = () => {
  if (!isOnlineNow()) {
    throw new Error(OFFLINE_MUTATION_MESSAGE)
  }
}

export const getLastSyncAt = (scope = 'global') => {
  if (!isBrowser) return ''
  return window.localStorage.getItem(getStorageKey(scope)) || ''
}

export const markSyncSuccess = (...scopes) => {
  if (!isBrowser || !isOnlineNow()) return ''

  const at = new Date().toISOString()
  const uniqueScopes = new Set(['global', ...scopes.filter(Boolean)])

  uniqueScopes.forEach((scope) => {
    window.localStorage.setItem(getStorageKey(scope), at)
  })

  dispatchWindowEvent('tekmi:sync-updated', {
    scopes: Array.from(uniqueScopes),
    at,
  })

  return at
}

export const formatLastSyncLabel = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const timeLabel = new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)

  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()

  if (sameDay) return `hoy ${timeLabel}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `ayer ${timeLabel}`
  }

  const fullDate = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short'
  }).format(date)

  return `${fullDate} ${timeLabel}`
}

export const setPwaUpdateHandler = (handler) => {
  applyUpdateHandler = typeof handler === 'function' ? handler : null
}

export const notifyPwaUpdateAvailable = (handler) => {
  setPwaUpdateHandler(handler)
  updateAvailable.value = true
}

export const clearPwaUpdateAvailable = () => {
  updateAvailable.value = false
}

export const applyPwaUpdate = async () => {
  if (typeof applyUpdateHandler === 'function') {
    await applyUpdateHandler()
    return
  }

  if (isBrowser) {
    window.location.reload()
  }
}

const bindSyncTimestamp = (scope = 'global') => {
  const timestamp = ref(getLastSyncAt(scope) || getLastSyncAt('global'))

  const refresh = () => {
    timestamp.value = getLastSyncAt(scope) || getLastSyncAt('global')
  }

  onMounted(() => {
    if (!isBrowser) return
    ensureConnectivityListeners()
    window.addEventListener('tekmi:sync-updated', refresh)
    window.addEventListener('storage', refresh)
  })

  onBeforeUnmount(() => {
    if (!isBrowser) return
    window.removeEventListener('tekmi:sync-updated', refresh)
    window.removeEventListener('storage', refresh)
  })

  return {
    lastSyncAt: timestamp,
    lastSyncLabel: computed(() => formatLastSyncLabel(timestamp.value)),
    hasSyncTimestamp: computed(() => Boolean(timestamp.value)),
  }
}

export const useConnectivity = () => {
  const { lastSyncAt, lastSyncLabel, hasSyncTimestamp } = bindSyncTimestamp('global')

  return {
    isOnline: computed(() => onlineState.value),
    isOffline: computed(() => !onlineState.value),
    lastSyncAt,
    lastSyncLabel,
    hasSyncTimestamp,
    updateAvailable,
    applyPwaUpdate,
    clearPwaUpdateAvailable,
  }
}

export const useCachedTimestamp = (scope = 'global') => {
  const { lastSyncAt, lastSyncLabel, hasSyncTimestamp } = bindSyncTimestamp(scope)

  return {
    isOnline: computed(() => onlineState.value),
    isOffline: computed(() => !onlineState.value),
    lastSyncAt,
    lastSyncLabel,
    hasSyncTimestamp,
  }
}
