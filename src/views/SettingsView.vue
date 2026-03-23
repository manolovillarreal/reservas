<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Configuracion</h1>
    </div>

    <div v-if="can('settings', 'edit') && isMobile" class="card !p-0 overflow-hidden">
      <RouterLink to="/configuracion/perfil" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Perfil del alojamiento</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Usuarios</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion/canales-origenes" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Canales y origen</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion/documentos" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Personalización documentos</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
        <a href="#condiciones-alojamiento" class="flex items-center justify-between px-4 py-3 text-sm text-gray-800">
        <span>Condiciones</span>
        <span class="text-gray-400">›</span>
        </a>
    </div>

    <div v-if="can('settings', 'edit') && !isMobile" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Documentos</h2>
          <p class="text-sm text-gray-500">Personaliza header, footer, colores y secciones de vouchers/cotizaciones.</p>
        </div>
        <RouterLink to="/configuracion/documentos" class="btn-primary text-sm">
          Abrir configuracion de documentos
        </RouterLink>
      </div>
    </div>

    <div v-if="can('settings', 'edit') && !isMobile" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Canales y origenes</h2>
          <p class="text-sm text-gray-500">Gestiona los tipos y canales en una vista dedicada.</p>
        </div>
        <RouterLink to="/configuracion/canales-origenes" class="btn-primary text-sm">
          Abrir canales y origenes
        </RouterLink>
      </div>
    </div>

    <div v-if="can('settings', 'edit') && !isMobile" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Perfil</h2>
          <p class="text-sm text-gray-500">Edita informacion comercial, contacto, ubicacion y logo en una vista dedicada.</p>
        </div>
        <RouterLink to="/configuracion/perfil" class="btn-primary text-sm">
          Abrir perfil
        </RouterLink>
      </div>
    </div>

    <div id="condiciones-alojamiento" v-if="can('settings', 'edit')" class="card">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Condiciones del alojamiento</h2>
        <p class="text-sm text-gray-500">Este texto se mostrará en vouchers y cotizaciones.</p>
      </div>
      <textarea
        v-model="voucherConditions"
        rows="5"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        placeholder="Escribe aquí las condiciones del alojamiento..."
      ></textarea>
      <div class="mt-3 flex justify-end">
        <button type="button" class="btn-primary text-sm" :disabled="savingConditions" @click="saveVoucherConditions">
          {{ savingConditions ? 'Guardando...' : 'Guardar condiciones' }}
        </button>
      </div>
    </div>

    <div v-if="can('settings', 'edit')" class="card">
      <div class="mb-5 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Notificaciones</h2>
          <p class="text-sm text-gray-500">Controla qué eventos generan notificaciones in-app.</p>
        </div>
        <button type="button" class="btn-primary text-sm" :disabled="savingNotifSettings" @click="saveNotifSettings">
          {{ savingNotifSettings ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>

      <div v-for="group in notifTypeGroups" :key="group.title" class="mb-6 last:mb-0">
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ group.title }}</h3>
        <div class="divide-y divide-gray-100 rounded-md border border-gray-200">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="flex items-center justify-between px-4 py-3"
          >
            <span class="text-sm text-gray-700">{{ item.label }}</span>
            <div class="flex items-center gap-3">
              <div v-if="item.daysLabel && notifSettings[item.key]" class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="30"
                  class="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm disabled:opacity-40"
                  :disabled="!notifSettings[item.key]?.enabled"
                  v-model.number="notifSettings[item.key].days"
                />
                <span class="text-xs text-gray-500">{{ item.daysLabel }}</span>
              </div>
              <button
                v-if="notifSettings[item.key]"
                type="button"
                class="relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                :class="notifSettings[item.key]?.enabled ? 'bg-indigo-600' : 'bg-gray-200'"
                @click="notifSettings[item.key].enabled = !notifSettings[item.key].enabled"
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

    <div class="card">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-900">Cuenta activa</h2>
      <div class="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <p><span class="font-medium text-gray-700">Cuenta:</span> {{ accountStore.currentAccountName || '-' }}</p>
        <p><span class="font-medium text-gray-700">Rol:</span> {{ accountStore.currentUserRole || '-' }}</p>
        <p><span class="font-medium text-gray-700">Account ID:</span> {{ accountStore.currentAccountId || '-' }}</p>
      </div>
    </div>

    <div v-if="can('users', 'invite')" class="card">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Usuarios</h2>
          <p class="text-sm text-gray-500">Gestiona roles y asociaciones de usuarios en esta cuenta.</p>
        </div>
      </div>

      <p class="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        La creacion de usuarios se realiza en Supabase. Aqui solo gestionas la asociacion y rol dentro de la cuenta.
      </p>

      <AppInlineAlert v-if="usersSuccessMessage" type="success" :message="usersSuccessMessage" />

      <div v-if="isMobile" class="space-y-3">
        <DataCard
          v-for="item in users"
          :key="item.id"
          :title="item.user_email || item.user_id"
          :subtitle="item.role"
          :badge="roleBadge(item.role)"
          :actions="[
            ...(can('users', 'edit_role') ? [{ label: 'Cambiar rol', type: 'ghost', handler: () => openRoleSheet(item) }] : []),
            ...(can('users', 'remove') ? [{ label: 'Eliminar', type: 'danger', handler: () => openRemoveSheet(item) }] : [])
          ]"
        />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">Usuario</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Rol</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="4" class="px-4 py-8 text-center text-gray-400">Cargando usuarios...</td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-gray-500">No hay usuarios asociados a esta cuenta.</td>
            </tr>
            <tr v-for="item in users" :key="item.id">
              <td class="px-4 py-3 text-gray-900">{{ item.user_id }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.user_email || '-' }}</td>
              <td class="px-4 py-3">
                <div class="w-36">
                  <AppSelect
                    :model-value="item.role"
                    :options="roleOptions"
                    placeholder="Seleccionar rol"
                    :disabled="!can('users', 'edit_role') || savingRoleId === item.id"
                    @change="updateRole(item, $event)"
                  />
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <span v-if="savingRoleId === item.id" class="text-xs text-gray-500">Guardando rol...</span>
                  <button
                    v-if="can('users', 'remove')"
                    class="text-sm font-medium text-red-600 hover:text-red-800"
                    :disabled="removingId === item.id"
                    @click="removeUser(item)"
                  >
                    Quitar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <BottomSheet v-if="isMobile" v-model="showRoleSheet" title="Cambiar rol" height="half">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">Selecciona el nuevo rol para {{ selectedUser?.user_email || selectedUser?.user_id || '-' }}.</p>
        <AppSelect
          :model-value="selectedRole"
          :options="roleOptions"
          placeholder="Seleccionar rol"
          @change="selectedRole = $event"
        />
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showRoleSheet = false">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="!selectedRole || !selectedUser" @click="applyRoleChange">Guardar</button>
        </div>
      </template>
    </BottomSheet>

    <BottomSheet v-if="isMobile" v-model="showRemoveSheet" title="Eliminar usuario" height="half">
      <div class="space-y-4">
        <p class="text-sm text-gray-700">¿Quitar usuario de esta cuenta?</p>
        <p class="text-sm text-gray-500">{{ selectedUser?.user_email || selectedUser?.user_id || '-' }}</p>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showRemoveSheet = false">Cancelar</button>
          <button type="button" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" @click="applyRemoveUser">Eliminar</button>
        </div>
      </template>
    </BottomSheet>

    <div v-else class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
      <p class="mt-2 text-sm text-amber-800">No tienes permisos para gestionar usuarios.</p>
    </div>

  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { getNotificationSettings, saveNotificationSettings as saveNotifSettingsApi } from '../services/notificationService'
import BottomSheet from '../components/ui/BottomSheet.vue'
import DataCard from '../components/ui/DataCard.vue'
import { AppInlineAlert, AppSelect } from '@/components/ui/forms'

const accountStore = useAccountStore()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const toast = useToast()

const users = ref([])
const loading = ref(false)
const savingRoleId = ref('')
const removingId = ref('')
const usersSuccessMessage = ref('')
const showRoleSheet = ref(false)
const showRemoveSheet = ref(false)
const selectedUser = ref(null)
const selectedRole = ref('')
const voucherConditions = ref('')
const savingConditions = ref(false)
const notifSettings = ref({})
const savingNotifSettings = ref(false)

const notifTypeGroups = [
  {
    title: 'Reservas y consultas',
    items: [
      { key: 'nueva_consulta', label: 'Nueva consulta' },
      { key: 'nueva_reserva', label: 'Nueva reserva' },
      { key: 'reserva_cancelada', label: 'Reserva cancelada' },
      { key: 'inquiry_expiring_soon', label: 'Cotización próxima a vencer', daysLabel: 'días antes de vencer' },
      { key: 'inquiry_no_activity', label: 'Consulta sin actividad', daysLabel: 'días sin cambios' },
    ],
  },
  {
    title: 'Llegada y salida',
    items: [
      { key: 'preregistro_completado', label: 'Pre-registro completado' },
      { key: 'preregistro_pending', label: 'Pre-registro pendiente', daysLabel: 'días antes del check-in' },
      { key: 'checkin_del_dia', label: 'Check-in del día' },
      { key: 'checkin_realizado', label: 'Check-in registrado' },
      { key: 'checkout_del_dia', label: 'Check-out del día' },
      { key: 'checkout_vencido', label: 'Check-out vencido' },
    ],
  },
  {
    title: 'Pagos',
    items: [
      { key: 'anticipo_registrado', label: 'Pago registrado' },
      { key: 'balance_pending', label: 'Saldo pendiente antes de check-in', daysLabel: 'días antes del check-in' },
      { key: 'reservation_no_payment', label: 'Reserva sin pago', daysLabel: 'días desde la confirmación' },
    ],
  },
]

let successMessageTimeout = null

const roleOptions = [
  { value: 'admin', label: 'admin' },
  { value: 'manager', label: 'manager' },
  { value: 'staff', label: 'staff' },
]

const showUsersSuccess = (message) => {
  usersSuccessMessage.value = message
  if (successMessageTimeout) {
    clearTimeout(successMessageTimeout)
  }
  successMessageTimeout = setTimeout(() => {
    usersSuccessMessage.value = ''
    successMessageTimeout = null
  }, 2500)
}

onBeforeUnmount(() => {
  if (successMessageTimeout) {
    clearTimeout(successMessageTimeout)
    successMessageTimeout = null
  }
})

const fetchUsers = async () => {
  if (!can('users', 'invite')) return

  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    const { data, error } = await supabase
      .from('account_users')
      .select('id, account_id, user_id, role')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })

    if (error) throw error

    users.value = (data || []).map(item => ({
      ...item,
      user_email: ''
    }))
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

const fetchNotifSettings = async () => {
  if (!can('settings', 'edit')) return
  try {
    const accountId = accountStore.getRequiredAccountId()
    notifSettings.value = await getNotificationSettings(accountId)
  } catch (err) {
    toast.error(err.message)
  }
}

const saveNotifSettings = async () => {
  savingNotifSettings.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    await saveNotifSettingsApi(accountId, notifSettings.value)
    toast.success('Configuración de notificaciones guardada.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingNotifSettings.value = false
  }
}

const fetchVoucherConditions = async () => {
  if (!can('settings', 'edit')) return

  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('settings')
      .select('voucher_conditions')
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) throw error
    voucherConditions.value = String(data?.voucher_conditions || '')
  } catch (err) {
    toast.error(err.message)
  }
}

const saveVoucherConditions = async () => {
  if (!can('settings', 'edit')) return

  savingConditions.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const payload = {
      account_id: accountId,
      voucher_conditions: String(voucherConditions.value || '').trim(),
    }

    const { error } = await supabase
      .from('settings')
      .upsert(payload, { onConflict: 'account_id' })

    if (error) throw error
    toast.success('Condiciones guardadas correctamente.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingConditions.value = false
  }
}

const updateRole = async (item, role) => {
  if (!can('users', 'edit_role') || item.role === role) return

  savingRoleId.value = item.id
  try {
    const { error } = await supabase
      .from('account_users')
      .update({ role })
      .eq('id', item.id)

    if (error) throw error

    item.role = role
    showUsersSuccess('Rol actualizado correctamente.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingRoleId.value = ''
  }
}

const roleBadge = (role) => {
  const map = {
    admin: { label: 'admin', type: 'danger' },
    manager: { label: 'manager', type: 'warning' },
    staff: { label: 'staff', type: 'neutral' }
  }
  return map[role] || { label: role || '-', type: 'neutral' }
}

const openRoleSheet = (item) => {
  selectedUser.value = item
  selectedRole.value = item.role
  showRoleSheet.value = true
}

const applyRoleChange = async () => {
  if (!selectedUser.value || !selectedRole.value) return
  await updateRole(selectedUser.value, selectedRole.value)
  showRoleSheet.value = false
}

const openRemoveSheet = (item) => {
  selectedUser.value = item
  showRemoveSheet.value = true
}

const applyRemoveUser = async () => {
  if (!selectedUser.value) return
  await removeUser(selectedUser.value)
  showRemoveSheet.value = false
}

const removeUser = async (item) => {
  if (!can('users', 'remove')) return

  removingId.value = item.id
  try {
    const { error } = await supabase
      .from('account_users')
      .delete()
      .eq('id', item.id)

    if (error) throw error

    users.value = users.value.filter(user => user.id !== item.id)
    toast.success('Usuario removido de la cuenta.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    removingId.value = ''
  }
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchVoucherConditions(), fetchNotifSettings()])
})
</script>
