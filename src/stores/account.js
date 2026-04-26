import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'

const normalizeBootstrapRows = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  return [payload]
}

export const useAccountStore = defineStore('account', () => {
  const currentAccountId = ref('')
  const currentUserId = ref('')
  const currentUserEmail = ref('')
  const currentUserRole = ref('')
  const currentAccountName = ref('')
  const currentAccountStatus = ref('active')
  const permissions = ref([])
  const initialized = ref(false)
  const loadError = ref('')

  const permissionSet = computed(() => new Set(permissions.value.map(p => `${p.resource}:${p.action}`)))

  const clear = () => {
    currentAccountId.value = ''
    currentUserId.value = ''
    currentUserEmail.value = ''
    currentUserRole.value = ''
    currentAccountName.value = ''
    currentAccountStatus.value = 'active'
    permissions.value = []
    initialized.value = false
    loadError.value = ''
  }

  const setAccountContext = ({ accountId, userId, userEmail, role, accountName, accountStatus }) => {
    currentAccountId.value = accountId || ''
    currentUserId.value = userId || ''
    currentUserEmail.value = userEmail || ''
    currentUserRole.value = role || ''
    currentAccountName.value = accountName || ''
    currentAccountStatus.value = accountStatus || 'active'
  }

  const patchAccountContext = ({ accountName, accountStatus } = {}) => {
    if (accountName !== undefined) currentAccountName.value = accountName
    if (accountStatus !== undefined) currentAccountStatus.value = accountStatus
  }

  const loadRolePermissions = async (role) => {
    if (!role) {
      permissions.value = []
      return
    }

    const { data, error } = await supabase
      .from('role_permissions')
      .select('resource, action')
      .eq('role', role)

    if (error) throw error
    permissions.value = data || []
  }

  const initializeFromSession = async () => {
    loadError.value = ''

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      clear()
      loadError.value = sessionError.message
      return false
    }

    const user = sessionData?.session?.user
    if (!user) {
      clear()
      return false
    }

    const { data: accountUsers, error: membershipError } = await supabase
      .from('account_users')
      .select('account_id, role, accounts(name, status)')
      .eq('user_id', user.id)
      .limit(1)

    if (membershipError) {
      clear()
      loadError.value = membershipError.message
      return false
    }

    let membership = accountUsers?.[0] || null

    if (!membership) {
      const { data: bootstrapData, error: bootstrapError } = await supabase.rpc('bootstrap_account_membership')

      if (bootstrapError) {
        clear()
        loadError.value = bootstrapError.message || 'USER_NOT_ASSOCIATED'
        initialized.value = true
        return false
      }

      const row = normalizeBootstrapRows(bootstrapData)[0]
      if (!row?.account_id) {
        clear()
        loadError.value = 'USER_NOT_ASSOCIATED'
        initialized.value = true
        return false
      }

      membership = {
        account_id: row.account_id,
        role: row.role,
        accounts: {
          name: row.account_name
        }
      }
    }

    setAccountContext({
      accountId: membership.account_id,
      userId: user.id,
      userEmail: user.email || '',
      role: membership.role,
      accountName: membership.accounts?.name || '',
      accountStatus: membership.accounts?.status || 'active'
    })

    await loadRolePermissions(membership.role)
    initialized.value = true
    return true
  }

  const hasPermission = (resource, action) => {
    if (!resource || !action) return false
    if (currentUserRole.value === 'admin') return true
    return permissionSet.value.has(`${resource}:${action}`)
  }

  const getRequiredAccountId = () => {
    if (!currentAccountId.value) {
      throw new Error('No account context available for current user.')
    }
    return currentAccountId.value
  }

  return {
    currentAccountId,
    currentUserId,
    currentUserEmail,
    currentUserRole,
    currentAccountName,
    currentAccountStatus,
    permissions,
    initialized,
    loadError,
    initializeFromSession,
    hasPermission,
    getRequiredAccountId,
    patchAccountContext,
    clear
  }
})
