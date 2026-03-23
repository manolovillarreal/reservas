<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/configuracion" class="text-gray-400 hover:text-gray-600">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Notificaciones</h1>
    </div>

    <!-- Push en este dispositivo -->
    <div class="card">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Notificaciones push en este dispositivo
      </h2>

      <p v-if="!pushSupported" class="text-sm text-gray-500">
        Tu navegador no soporta notificaciones push.
      </p>

      <template v-else>
        <p class="mb-3 flex items-center gap-2 text-sm">
          <span
            class="inline-block h-2 w-2 rounded-full"
            :class="pushSubscribed ? 'bg-green-500' : 'bg-gray-300'"
          />
          <span :class="pushSubscribed ? 'text-green-700' : 'text-gray-600'">
            {{ pushSubscribed ? 'Activas en este dispositivo' : 'No activas en este dispositivo' }}
          </span>
        </p>

        <button
          type="button"
          class="btn-secondary text-sm"
          :disabled="pushLoading"
          @click="handlePushToggle"
        >
          <template v-if="pushLoading">Procesando...</template>
          <template v-else-if="pushSubscribed">🔔 Desactivar notificaciones push</template>
          <template v-else>🔔 Activar notificaciones push</template>
        </button>

        <p v-if="isIOS" class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          En iPhone y iPad, las notificaciones push requieren tener la app instalada desde Safari
          usando &ldquo;Agregar a pantalla de inicio&rdquo;. Asegúrate de abrir esta página desde
          Safari antes de activarlas.
        </p>
      </template>
    </div>

    <!-- Grupos de tipos de notificación -->
    <div v-if="settingsLoaded" class="space-y-6">
      <div v-for="group in notifTypeGroups" :key="group.title" class="card">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">{{ group.title }}</h2>
        <div class="divide-y divide-gray-100 rounded-md border border-gray-200">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="flex items-center justify-between px-4 py-3"
          >
            <span class="text-sm text-gray-700">{{ item.label }}</span>

            <div class="flex items-center gap-3">
              <!-- Campo días -->
              <div v-if="item.daysLabel && notifSettings[item.key]" class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="30"
                  class="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm disabled:opacity-40"
                  :disabled="!notifSettings[item.key]?.enabled"
                  v-model.number="notifSettings[item.key].days"
                  @input="debouncedSave"
                />
                <span class="text-xs text-gray-500">{{ item.daysLabel }}</span>
              </div>

              <!-- Campo horas -->
              <div v-if="item.hoursLabel && notifSettings[item.key]" class="flex items-center gap-1.5">
                <input
                  type="number"
                  :min="item.hoursMin ?? 1"
                  :max="item.hoursMax ?? 48"
                  class="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm disabled:opacity-40"
                  :disabled="!notifSettings[item.key]?.enabled"
                  v-model.number="notifSettings[item.key].hours"
                  @input="debouncedSave"
                />
                <span class="text-xs text-gray-500">{{ item.hoursLabel }}</span>
              </div>

              <!-- Toggle -->
              <button
                v-if="notifSettings[item.key]"
                type="button"
                class="relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                :class="notifSettings[item.key]?.enabled ? 'bg-indigo-600' : 'bg-gray-200'"
                @click="toggleAndSave(item.key)"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition"
                  :class="notifSettings[item.key]?.enabled ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center py-10 text-sm text-gray-400">
      Cargando configuración...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { usePushNotifications } from '../composables/usePushNotifications'
import {
  getNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../services/notificationService'

const accountStore = useAccountStore()
const { can } = usePermissions()
const toast = useToast()

const {
  isSupported: pushSupported,
  isSubscribed: pushSubscribed,
  isIOS,
  subscribe: subscribePush,
  unsubscribe: unsubscribePush,
  checkSubscriptionStatus,
} = usePushNotifications()

const pushLoading = ref(false)
const notifSettings = ref({})
const settingsLoaded = ref(false)
let saveTimer = null

const notifTypeGroups = [
  {
    title: 'Reservas y consultas',
    items: [
      { key: 'nueva_consulta',        label: 'Nueva consulta' },
      { key: 'nueva_reserva',         label: 'Nueva reserva confirmada' },
      { key: 'reserva_cancelada',     label: 'Reserva cancelada' },
      { key: 'inquiry_expiring_soon', label: 'Consulta próxima a vencer',    daysLabel: 'días antes de vencer' },
      { key: 'inquiry_no_activity',   label: 'Consulta sin actividad',       daysLabel: 'días sin cambios' },
    ],
  },
  {
    title: 'Llegada y salida',
    items: [
      { key: 'preregistro_completado', label: 'Pre-registro completado' },
      { key: 'preregistro_pending',    label: 'Pre-registro pendiente',       daysLabel: 'días antes del check-in' },
      { key: 'checkin_del_dia',        label: 'Check-in del día' },
      { key: 'checkin_realizado',      label: 'Check-in realizado' },
      { key: 'checkout_del_dia',       label: 'Check-out del día' },
      { key: 'checkout_vencido',       label: 'Huésped con check-out vencido' },
    ],
  },
  {
    title: 'Pagos',
    items: [
      { key: 'anticipo_registrado',         label: 'Anticipo registrado' },
      { key: 'balance_pending_post_checkin', label: 'Saldo pendiente después del check-in', hoursLabel: 'horas desde el check-in', hoursMin: 1, hoursMax: 48 },
    ],
  },
]

const handlePushToggle = async () => {
  pushLoading.value = true
  try {
    if (pushSubscribed.value) {
      await unsubscribePush()
      toast.success('Notificaciones push desactivadas.')
    } else {
      const ok = await subscribePush()
      if (ok) toast.success('Notificaciones push activadas en este dispositivo.')
      else toast.error('No se pudo activar las notificaciones push.')
    }
  } catch (e) {
    toast.error(e.message || 'Error al gestionar las notificaciones push.')
  } finally {
    pushLoading.value = false
  }
}

const saveSettings = async () => {
  if (!can('settings', 'edit')) return
  try {
    const accountId = accountStore.getRequiredAccountId()
    await saveNotificationSettings(accountId, notifSettings.value)
  } catch (err) {
    toast.error(err.message)
  }
}

const debouncedSave = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveSettings, 500)
}

const toggleAndSave = (key) => {
  if (!notifSettings.value[key]) return
  notifSettings.value[key].enabled = !notifSettings.value[key].enabled
  saveSettings()
}

onMounted(async () => {
  if (pushSupported.value) checkSubscriptionStatus()

  if (!can('settings', 'edit')) return
  try {
    const accountId = accountStore.getRequiredAccountId()
    notifSettings.value = await getNotificationSettings(accountId)
    settingsLoaded.value = true
  } catch (err) {
    toast.error(err.message)
  }
})
</script>
