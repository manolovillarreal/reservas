<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Configuracion</h1>
    </div>

    <div v-if="can('settings', 'edit') && isMobile" class="card !p-0 overflow-hidden">
      <RouterLink to="/configuracion/perfil" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Personalización</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Usuarios</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion/canales" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Canales de origen</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion/documentos" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Personalización documentos</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion/tarifas" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Tarifas</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion/notificaciones" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Notificaciones</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
      <RouterLink to="/configuracion/operacion" class="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-800">
        <span>Operación</span>
        <span class="text-gray-400">›</span>
      </RouterLink>
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
          <h2 class="text-lg font-semibold text-gray-900">Canales de origen</h2>
          <p class="text-sm text-gray-500">Configura canales del sistema, actívalos y define comisiones por canal.</p>
        </div>
        <RouterLink to="/configuracion/canales" class="btn-primary text-sm">
          Abrir canales de origen
        </RouterLink>
      </div>
    </div>

    <div v-if="can('settings', 'edit') && !isMobile" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Personalización</h2>
          <p class="text-sm text-gray-500">Edita informacion comercial, contacto, ubicacion, logo y condiciones en una vista dedicada.</p>
        </div>
        <RouterLink to="/configuracion/perfil" class="btn-primary text-sm">
          Abrir personalización
        </RouterLink>
      </div>
    </div>

    <div v-if="can('settings', 'edit') && !isMobile" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Tarifas</h2>
          <p class="text-sm text-gray-500">Configura tarifas generales, politicas globales y modalidad full house.</p>
        </div>
        <RouterLink to="/configuracion/tarifas" class="btn-primary text-sm">
          Abrir configuracion de tarifas
        </RouterLink>
      </div>
    </div>

    <div v-if="can('settings', 'edit') && !isMobile" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Notificaciones</h2>
          <p class="text-sm text-gray-500">Configura qué eventos generan notificaciones y push.</p>
        </div>
        <RouterLink to="/configuracion/notificaciones" class="btn-primary text-sm">
          Abrir configuración de notificaciones
        </RouterLink>
      </div>
    </div>

    <div v-if="can('settings', 'edit') && !isMobile" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Operación</h2>
          <p class="text-sm text-gray-500">Parámetros del flujo operativo: pre-registro, check-in, check-out y reglas de negocio.</p>
        </div>
        <RouterLink to="/configuracion/operacion" class="btn-primary text-sm">
          Abrir configuración de operación
        </RouterLink>
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

    <div v-if="canSeeUsersSection" class="card space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Usuarios</h2>
          <p class="text-sm text-gray-500">Invita usuarios, gestiona roles y controla los cupos por cuenta.</p>
        </div>
        <div class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
          {{ usersStore.slotSummary }}
        </div>
      </div>

      <AppInlineAlert v-if="usersSuccessMessage" type="success" :message="usersSuccessMessage" />
      <AppInlineAlert v-if="usersErrorMessage" type="error" :message="usersErrorMessage" />

      <section class="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div class="flex flex-col gap-4 md:flex-row md:items-end">
          <div class="flex-1">
            <AppInput
              v-model="inviteEmail"
              label="Email"
              type="email"
              placeholder="usuario@correo.com"
              :disabled="!can('users', 'invite') || usersStore.inviting"
            />
          </div>
          <div class="md:w-56" :title="inviteRoleBlockedReason">
            <AppSelect
              v-model="inviteRole"
              label="Rol"
              :options="inviteRoleOptions"
              placeholder="Seleccionar rol"
              :disabled="!can('users', 'invite') || usersStore.inviting"
            />
          </div>
          <button
            type="button"
            class="btn-primary md:self-end"
            :disabled="!can('users', 'invite') || usersStore.inviting || !inviteEmail.trim() || !inviteRole || Boolean(inviteRoleBlockedReason)"
            @click="handleInviteUser"
          >
            {{ usersStore.inviting ? 'Enviando...' : 'Enviar invitación' }}
          </button>
        </div>
        <p class="mt-3 text-xs text-gray-500">{{ usersStore.slotSummary }}</p>
        <p v-if="inviteRoleBlockedReason" class="mt-2 text-xs text-amber-700">{{ inviteRoleBlockedReason }}</p>
      </section>

      <div v-if="isMobile" class="space-y-3">
        <DataCard
          v-for="item in usersStore.users"
          :key="item.id"
          :title="item.display_name"
          :subtitle="item.email || 'Sin email'"
          :badge="item.is_owner ? ownerBadge : roleBadge(item.role)"
          :meta="buildUserMeta(item)"
          :actions="buildMobileActions(item)"
        />
        <div v-if="!usersStore.loading && usersStore.users.length === 0" class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No hay usuarios asociados a esta cuenta.
        </div>
      </div>

      <div v-else class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">Usuario</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Rol</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-if="usersStore.loading">
              <td colspan="5" class="px-4 py-8 text-center text-gray-400">Cargando usuarios...</td>
            </tr>
            <tr v-else-if="usersStore.users.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-gray-500">No hay usuarios asociados a esta cuenta.</td>
            </tr>
            <tr v-for="item in usersStore.users" :key="item.id">
              <td class="px-4 py-3 text-gray-900">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ item.display_name }}</span>
                  <span v-if="item.is_owner" class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">Propietario</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-700">{{ item.email || '-' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="w-44" :title="roleDisabledReason(item)">
                  <AppSelect
                    :model-value="item.role"
                    :options="roleOptionsForUser(item)"
                    placeholder="Seleccionar rol"
                    :disabled="isRoleLocked(item) || usersStore.savingRoleId === item.id || !can('users', 'edit_role')"
                    @change="handleRoleChange(item, $event)"
                  />
                </div>
                <p v-if="roleDisabledReason(item)" class="mt-1 text-xs text-amber-700">{{ roleDisabledReason(item) }}</p>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <span v-if="usersStore.savingRoleId === item.id" class="text-xs text-gray-500">Guardando rol...</span>
                  <button
                    v-if="canRemoveUser(item)"
                    class="text-sm font-medium text-red-600 hover:text-red-800"
                    :disabled="usersStore.removingId === item.id"
                    @click="openRemoveConfirm(item)"
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
        <p class="text-sm text-gray-600">Selecciona el nuevo rol para {{ selectedUser?.display_name || selectedUser?.email || '-' }}.</p>
        <AppSelect
          :model-value="selectedRole"
          :options="selectedUser ? roleOptionsForUser(selectedUser) : usersStore.roleOptions"
          placeholder="Seleccionar rol"
          :disabled="!selectedUser || Boolean(selectedUser && roleDisabledReason(selectedUser))"
          @change="selectedRole = $event"
        />
        <p v-if="selectedUser && roleDisabledReason(selectedUser)" class="text-xs text-amber-700">{{ roleDisabledReason(selectedUser) }}</p>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showRoleSheet = false">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="!selectedRole || !selectedUser" @click="applyRoleChange">Guardar</button>
        </div>
      </template>
    </BottomSheet>

    <ConfirmActionModal
      :isOpen="showRemoveModal"
      title="Quitar usuario"
      :message="removeModalMessage"
      confirmLabel="Quitar"
      :loading="Boolean(selectedRemoveUser && usersStore.removingId === selectedRemoveUser.id)"
      @close="closeRemoveModal"
      @confirm="applyRemoveUser"
    />

    <div v-if="!canSeeUsersSection" class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
      <p class="mt-2 text-sm text-amber-800">No tienes permisos para gestionar usuarios.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAccountStore } from '../stores/account'
import { useUsersStore } from '../stores/users'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import BottomSheet from '../components/ui/BottomSheet.vue'
import DataCard from '../components/ui/DataCard.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import { AppInlineAlert, AppInput, AppSelect } from '@/components/ui/forms'

const accountStore = useAccountStore()
const usersStore = useUsersStore()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const toast = useToast()

const inviteEmail = ref('')
const inviteRole = ref('staff')
const usersSuccessMessage = ref('')
const usersErrorMessage = ref('')
const showRoleSheet = ref(false)
const selectedUser = ref(null)
const selectedRole = ref('')
const showRemoveModal = ref(false)
const selectedRemoveUser = ref(null)

let successMessageTimeout = null
let errorMessageTimeout = null

const canSeeUsersSection = computed(() =>
  can('users', 'invite') || can('users', 'edit_role') || can('users', 'remove')
)

const ownerBadge = { label: 'Propietario', type: 'info' }

const showUsersSuccess = (message) => {
  usersSuccessMessage.value = message
  usersErrorMessage.value = ''
  if (successMessageTimeout) clearTimeout(successMessageTimeout)
  successMessageTimeout = setTimeout(() => {
    usersSuccessMessage.value = ''
    successMessageTimeout = null
  }, 3000)
}

const showUsersError = (message) => {
  usersErrorMessage.value = message
  if (errorMessageTimeout) clearTimeout(errorMessageTimeout)
  errorMessageTimeout = setTimeout(() => {
    usersErrorMessage.value = ''
    errorMessageTimeout = null
  }, 4000)
}

onBeforeUnmount(() => {
  if (successMessageTimeout) clearTimeout(successMessageTimeout)
  if (errorMessageTimeout) clearTimeout(errorMessageTimeout)
})

const statusLabel = (status) => {
  const map = {
    active: 'Activo',
    pending: 'Pendiente',
    inactive: 'Inactivo',
  }
  return map[status] || 'Activo'
}

const statusClass = (status) => {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700'
  if (status === 'pending') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-700'
}

const roleBadge = (role) => {
  const map = {
    admin: { label: 'Admin', type: 'danger' },
    manager: { label: 'Manager', type: 'warning' },
    staff: { label: 'Staff', type: 'neutral' },
  }
  return map[role] || { label: role || '-', type: 'neutral' }
}

const availableSlotsForRole = (role, currentRole = '') => {
  const usage = usersStore.roleUsage[role]
  if (!usage) return { used: 0, max: 0, available: 0 }
  const used = Number(usage.used || 0)
  const max = Number(usage.max || 0)
  const offset = currentRole === role ? 1 : 0
  return { used, max, available: Math.max(0, max - used + offset) }
}

const inviteRoleOptions = computed(() => {
  return usersStore.roleOptions.map((option) => {
    const usage = availableSlotsForRole(option.value)
    const isFull = usage.available <= 0
    return {
      ...option,
      label: `${option.label} (${usage.used}/${usage.max})`,
      disabled: isFull,
    }
  })
})

const inviteRoleBlockedReason = computed(() => {
  const usage = availableSlotsForRole(inviteRole.value)
  if (usage.max > 0 && usage.available <= 0) {
    const label = usersStore.roleOptions.find((item) => item.value === inviteRole.value)?.label || inviteRole.value
    return `No hay cupos disponibles para ${label}.`
  }
  return ''
})

const isRoleLocked = (item) => {
  if (!item) return true
  return item.user_id === accountStore.currentUserId || item.is_owner
}

const roleDisabledReason = (item) => {
  if (!item) return ''
  if (item.user_id === accountStore.currentUserId) return 'No puedes cambiar tu propio rol.'
  if (item.is_owner) return 'El propietario no puede cambiar de rol.'
  return ''
}

const roleOptionsForUser = (item) => {
  return usersStore.roleOptions.map((option) => {
    const usage = availableSlotsForRole(option.value, item?.role)
    const isFull = usage.available <= 0
    return {
      ...option,
      label: `${option.label} (${usage.used}/${usage.max})`,
      disabled: isFull && option.value !== item?.role,
    }
  })
}

const canRemoveUser = (item) => {
  if (!can('users', 'remove')) return false
  if (!item) return false
  if (item.user_id === accountStore.currentUserId) return false
  if (item.is_owner) return false
  return true
}

const buildUserMeta = (item) => {
  return [
    { label: 'Rol', value: roleBadge(item.role).label },
    { label: 'Estado', value: statusLabel(item.status) },
    ...(item.is_owner ? [{ label: 'Tipo', value: 'Propietario' }] : []),
  ]
}

const buildMobileActions = (item) => {
  const actions = []
  if (can('users', 'edit_role') && !isRoleLocked(item)) {
    actions.push({ label: 'Cambiar rol', type: 'ghost', handler: () => openRoleSheet(item) })
  }
  if (canRemoveUser(item)) {
    actions.push({ label: 'Quitar', type: 'danger', handler: () => openRemoveConfirm(item) })
  }
  return actions
}

const loadUsers = async () => {
  if (!canSeeUsersSection.value) return
  try {
    await usersStore.fetchUsers(accountStore.getRequiredAccountId())
  } catch (error) {
    const message = String(error?.message || 'No se pudo cargar la lista de usuarios.')
    showUsersError(message)
    toast.error(message)
  }
}

const handleInviteUser = async () => {
  if (!can('users', 'invite')) return
  if (!inviteEmail.value.trim()) {
    showUsersError('Debes ingresar un email válido.')
    return
  }
  if (!inviteRole.value) {
    showUsersError('Debes seleccionar un rol.')
    return
  }
  if (inviteRoleBlockedReason.value) {
    showUsersError(inviteRoleBlockedReason.value)
    return
  }

  try {
    await usersStore.inviteUser(inviteEmail.value.trim(), inviteRole.value, accountStore.getRequiredAccountId())
    inviteEmail.value = ''
    inviteRole.value = 'staff'
    showUsersSuccess('Invitación enviada correctamente.')
    toast.success('Invitación enviada correctamente.')
  } catch (error) {
    const message = String(error?.message || 'No se pudo enviar la invitación.')
    showUsersError(message)
    toast.error(message)
  }
}

const handleRoleChange = async (item, role) => {
  if (!role || item.role === role) return
  if (isRoleLocked(item)) {
    showUsersError(roleDisabledReason(item))
    return
  }

  try {
    await usersStore.updateUserRole(item.id, role, accountStore.getRequiredAccountId())
    showUsersSuccess('Rol actualizado correctamente.')
    toast.success('Rol actualizado correctamente.')
  } catch (error) {
    const message = String(error?.message || 'No se pudo actualizar el rol.')
    showUsersError(message)
    toast.error(message)
  }
}

const openRoleSheet = (item) => {
  if (isRoleLocked(item)) {
    showUsersError(roleDisabledReason(item))
    return
  }
  selectedUser.value = item
  selectedRole.value = item.role
  showRoleSheet.value = true
}

const applyRoleChange = async () => {
  if (!selectedUser.value || !selectedRole.value) return
  await handleRoleChange(selectedUser.value, selectedRole.value)
  showRoleSheet.value = false
}

const openRemoveConfirm = (item) => {
  if (!canRemoveUser(item)) return
  selectedRemoveUser.value = item
  showRemoveModal.value = true
}

const closeRemoveModal = () => {
  if (usersStore.removingId) return
  showRemoveModal.value = false
  selectedRemoveUser.value = null
}

const removeModalMessage = computed(() => {
  if (!selectedRemoveUser.value) return ''
  const label = selectedRemoveUser.value.email || selectedRemoveUser.value.display_name || 'este usuario'
  return `¿Quitar a ${label} de esta cuenta? Esta acción elimina únicamente la asociación en account_users.`
})

const applyRemoveUser = async () => {
  if (!selectedRemoveUser.value) return
  try {
    await usersStore.removeUser(selectedRemoveUser.value.id, accountStore.getRequiredAccountId())
    showUsersSuccess('Usuario removido de la cuenta.')
    toast.success('Usuario removido de la cuenta.')
    closeRemoveModal()
  } catch (error) {
    const message = String(error?.message || 'No se pudo quitar el usuario.')
    showUsersError(message)
    toast.error(message)
  }
}

onMounted(async () => {
  await loadUsers()
})
</script>
