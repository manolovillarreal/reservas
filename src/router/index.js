import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { useSourcesStore } from '../stores/sources'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true, plainLayout: true }
    },
    {
      path: '/q/:token',
      name: 'cotizacion-publica',
      component: () => import('../views/PublicQuotationView.vue'),
      meta: { plainLayout: true }
    },
    {
      path: '/prerregistro/:token',
      name: 'preregistro',
      component: () => import('../views/PreRegistroView.vue'),
      meta: { plainLayout: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/reservas',
      name: 'reservas',
      component: () => import('../views/ReservationsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reservas/:id',
      name: 'detalle-reserva',
      component: () => import('../views/ReservationsDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reservas/:id/voucher',
      name: 'voucher-reserva',
      component: () => import('../views/VoucherView.vue'),
      meta: { requiresAuth: true, plainLayout: true }
    },
    {
      path: '/consultas',
      name: 'consultas',
      component: () => import('../views/InquiriesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/consultas/:id',
      name: 'detalle-consulta',
      component: () => import('../views/InquiryDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/consultas/:id/cotizacion',
      name: 'cotizacion-consulta',
      component: () => import('../views/QuotationView.vue'),
      meta: { requiresAuth: true, plainLayout: true }
    },
    {
      path: '/bloqueos',
      name: 'bloqueos',
      component: () => import('../views/RoomBlocksView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/bloqueos/:id',
      name: 'detalle-bloqueo',
      component: () => import('../views/RoomBlocksView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('../views/CalendarView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/calendario',
      redirect: '/calendar',
      meta: { requiresAuth: true }
    },
    {
      path: '/reservar',
      name: 'nueva-reserva',
      component: () => import('../views/NewReservationView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/sedes',
      name: 'sedes',
      component: () => import('../views/VenuesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/unidades',
      name: 'unidades',
      component: () => import('../views/UnitsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/huespedes',
      name: 'huespedes',
      component: () => import('../views/GuestsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/huespedes/:id',
      name: 'detalle-huesped',
      component: () => import('../views/GuestDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/pagos',
      name: 'pagos',
      component: () => import('../views/PaymentsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/mensajes',
      name: 'mensajes',
      component: () => import('../views/MessagesSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/mensajes/:id/editar',
      name: 'editar-mensaje',
      component: () => import('../views/MessageEditorView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracion/documentos',
      name: 'configuracion-documentos',
      component: () => import('../views/DocumentSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracion/canales-origenes',
      name: 'configuracion-canales-origenes',
      component: () => import('../views/SourcesSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracion/perfil',
      name: 'configuracion-perfil',
      component: () => import('../views/ProfileSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracion/tarifas',
      name: 'configuracion-tarifas',
      component: () => import('../views/TariffSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracion/notificaciones',
      name: 'configuracion-notificaciones',
      component: () => import('../views/NotificationSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/account-association-error',
      name: 'account-association-error',
      component: () => import('../views/AccountAssociationErrorView.vue'),
      meta: { requiresAuth: true, plainLayout: true }
    }
  ]
})

router.beforeEach(async (to) => {
  const accountStore = useAccountStore()
  const sourcesStore = useSourcesStore()
  const { data } = await supabase.auth.getSession()
  const isAuthenticated = !!data.session

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (isAuthenticated && to.name !== 'account-association-error') {
    if (!accountStore.initialized) {
      await accountStore.initializeFromSession()
    }

    if (!accountStore.currentAccountId) {
      return { name: 'account-association-error' }
    }

    await sourcesStore.preload(accountStore.currentAccountId)
  }

  return true
})

export default router
