// Service Worker — TekMi Inn PWA
// Generado con vite-plugin-pwa (injectManifest strategy).
// Este archivo reemplaza el SW auto-generado por generateSW.
// La línea precacheAndRoute(self.__WB_MANIFEST) es inyectada
// por vite-plugin-pwa en build con la lista de assets cacheables.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

const STATIC_ASSETS_CACHE = 'tekmi-static-assets-v1'
const NAVIGATION_CACHE = 'tekmi-navigation-v1'
const SUPABASE_GET_CACHE = 'tekmi-supabase-get-v1'

// Inyectado por vite-plugin-pwa en tiempo de build:
// contiene el listado completo de assets para soporte offline.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

registerRoute(
  ({ request }) => ['style', 'script', 'font', 'image', 'worker'].includes(request.destination),
  new CacheFirst({
    cacheName: STATIC_ASSETS_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 250,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
)

const navigationStrategy = new NetworkFirst({
  cacheName: NAVIGATION_CACHE,
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 30 * 24 * 60 * 60,
      purgeOnQuotaError: true,
    }),
  ],
})

const appShellHandler = createHandlerBoundToURL('/index.html')

registerRoute(
  new NavigationRoute(async (context) => {
    try {
      return await navigationStrategy.handle(context)
    } catch {
      return appShellHandler(context)
    }
  })
)

const supabaseOrigin = (() => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
})()

if (supabaseOrigin) {
  registerRoute(
    ({ url, request }) => request.method === 'GET' && url.origin === supabaseOrigin,
    new NetworkFirst({
      cacheName: SUPABASE_GET_CACHE,
      networkTimeoutSeconds: 3,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    })
  )
}

// ============================================================
// Push Notifications
// ============================================================

self.addEventListener('push', (event) => {
  let data = {}

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { title: event.data.text(), body: '' }
    }
  }

  const title = data.title ?? 'TekMi Inn'
  const body = data.body ?? ''
  const icon = data.icon ?? '/icons/pwa-192.png'
  const badge = data.badge ?? '/icons/pwa-192.png'
  const related_type = data.data?.related_type ?? null
  const related_id = data.data?.related_id ?? null

  const notificationOptions = {
    body,
    icon,
    badge,
    data: { related_type, related_id },
    tag: related_type && related_id ? `${related_type}-${related_id}` : 'tekmi-inn',
  }

  event.waitUntil(self.registration.showNotification(title, notificationOptions))
})

// ============================================================
// Notification click — abrir/enfocar la app y navegar
// ============================================================

function buildNavigationUrl(related_type, related_id) {
  if (!related_type || !related_id) return '/'
  const map = {
    reservation: `/reservas/${related_id}`,
    inquiry: `/consultas/${related_id}`,
    guest: `/huespedes/${related_id}`,
  }
  return map[related_type] ?? '/'
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { related_type, related_id } = event.notification.data ?? {}
  const targetPath = buildNavigationUrl(related_type, related_id)
  const targetUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus()
            if ('navigate' in client) {
              return client.navigate(targetUrl)
            }
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
  )
})
