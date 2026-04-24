import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../services/supabase'
import { useAccountStore } from './account'

const ROLE_LIMITS = {
  admin: 2,
  manager: 2,
  staff: 4,
}

const buildRoleUsageMap = (rows = []) => {
  const usageMap = {
    admin: { used: 0, max: ROLE_LIMITS.admin },
    manager: { used: 0, max: ROLE_LIMITS.manager },
    staff: { used: 0, max: ROLE_LIMITS.staff },
  }

  rows.forEach((row) => {
    if (!usageMap[row.role]) return
    usageMap[row.role] = {
      used: Number(row.used_slots || 0),
      max: Number(row.max_slots || ROLE_LIMITS[row.role] || 0),
    }
  })

  return usageMap
}

const parseRpcError = (error, fallbackMessage) => {
  const message = String(error?.message || '').trim()
  if (message) return message
  return fallbackMessage
}

export const useUsersStore = defineStore('users', () => {
  const accountStore = useAccountStore()
  const users = ref([])
  const roleUsage = ref(buildRoleUsageMap())
  const loading = ref(false)
  const inviting = ref(false)
  const savingRoleId = ref('')
  const removingId = ref('')

  const slotSummary = computed(() => [
    `Admins: ${roleUsage.value.admin.used}/${roleUsage.value.admin.max}`,
    `Managers: ${roleUsage.value.manager.used}/${roleUsage.value.manager.max}`,
    `Staff: ${roleUsage.value.staff.used}/${roleUsage.value.staff.max}`,
  ].join(' · '))

  const roleOptions = computed(() => [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'staff', label: 'Staff' },
  ])

  const clear = () => {
    users.value = []
    roleUsage.value = buildRoleUsageMap()
    loading.value = false
    inviting.value = false
    savingRoleId.value = ''
    removingId.value = ''
  }

  const fetchUsers = async (accountId) => {
    const resolvedAccountId = accountId || accountStore.getRequiredAccountId()
    loading.value = true
    try {
      const [{ data: userRows, error: usersError }, { data: usageRows, error: usageError }] = await Promise.all([
        supabase.rpc('get_account_users', { p_account_id: resolvedAccountId }),
        supabase.rpc('get_account_role_usage', { p_account_id: resolvedAccountId }),
      ])

      if (usersError) throw usersError
      if (usageError) throw usageError

      users.value = (userRows || []).map((item) => ({
        ...item,
        status: item.status || 'active',
        is_owner: Boolean(item.is_owner),
        display_name: String(item.full_name || '').trim() || String(item.email || '').trim() || String(item.user_id || ''),
      }))
      roleUsage.value = buildRoleUsageMap(usageRows || [])
      return users.value
    } finally {
      loading.value = false
    }
  }

  const inviteUser = async (email, role, accountId) => {
    const resolvedAccountId = accountId || accountStore.getRequiredAccountId()
    inviting.value = true
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role, account_id: resolvedAccountId },
      })

      if (error) {
        let functionMessage = String(error.context?.statusText || error.message || '').trim()
        if (typeof error.context?.json === 'function') {
          const payload = await error.context.json()
          functionMessage = String(payload?.message || functionMessage || '').trim()
        }
        throw new Error(functionMessage || 'No se pudo enviar la invitación.')
      }

      if (data?.success !== true) {
        throw new Error(String(data?.message || 'No se pudo enviar la invitación.'))
      }

      await fetchUsers(resolvedAccountId)
      return data
    } finally {
      inviting.value = false
    }
  }

  const updateUserRole = async (membershipId, role, accountId) => {
    const resolvedAccountId = accountId || accountStore.getRequiredAccountId()
    const target = users.value.find((item) => item.id === membershipId)
    if (!target) throw new Error('Usuario no encontrado.')
    if (target.user_id === accountStore.currentUserId) throw new Error('No puedes cambiar tu propio rol.')
    if (target.is_owner) throw new Error('No puedes cambiar el rol del propietario.')
    if (target.role === role) return target

    savingRoleId.value = membershipId
    try {
      const { data, error } = await supabase.rpc('update_account_user_role', {
        p_membership_id: membershipId,
        p_account_id: resolvedAccountId,
        p_role: role,
      })

      if (error) throw error

      const updatedRow = data
      const index = users.value.findIndex((item) => item.id === membershipId)
      if (index >= 0) {
        const current = users.value[index]
        users.value[index] = {
          ...current,
          ...updatedRow,
          display_name: current.display_name,
        }
      }
      await fetchUsers(resolvedAccountId)
      return updatedRow
    } catch (error) {
      throw new Error(parseRpcError(error, 'No se pudo actualizar el rol.'))
    } finally {
      savingRoleId.value = ''
    }
  }

  const removeUser = async (membershipId, accountId) => {
    const resolvedAccountId = accountId || accountStore.getRequiredAccountId()
    const target = users.value.find((item) => item.id === membershipId)
    if (!target) throw new Error('Usuario no encontrado.')
    if (target.user_id === accountStore.currentUserId) throw new Error('No puedes quitarte de tu propia cuenta.')
    if (target.is_owner) throw new Error('No puedes quitar al propietario de la cuenta.')

    removingId.value = membershipId
    try {
      const { error } = await supabase.rpc('remove_account_user', {
        p_membership_id: membershipId,
        p_account_id: resolvedAccountId,
      })

      if (error) throw error
      users.value = users.value.filter((item) => item.id !== membershipId)
      await fetchUsers(resolvedAccountId)
    } catch (error) {
      throw new Error(parseRpcError(error, 'No se pudo quitar el usuario.'))
    } finally {
      removingId.value = ''
    }
  }

  return {
    users,
    roleUsage,
    loading,
    inviting,
    savingRoleId,
    removingId,
    roleOptions,
    slotSummary,
    clear,
    fetchUsers,
    inviteUser,
    updateUserRole,
    removeUser,
  }
})
