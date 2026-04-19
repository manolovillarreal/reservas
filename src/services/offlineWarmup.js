import { useAccountStore } from '../stores/account'
import { useGuestsStore } from '../stores/guests'
import { useNotificationsStore } from '../stores/notifications'
import { useReservationsStore } from '../stores/reservations'
import { useRoomBlocksStore } from '../stores/roomBlocks'
import { useSourcesStore } from '../stores/sources'
import { useUnitsStore } from '../stores/units'
import { markSyncSuccess, isOnlineNow } from '../composables/useConnectivity'
import { getMessageSettings, getPredefinedMessages } from './messageSettingsService'
import { supabase } from './supabase'

const toIsoDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}

const addDays = (value, days) => {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

const startOfMonth = (value) => {
  const date = new Date(value)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfNextMonth = (value) => {
  const date = startOfMonth(value)
  date.setMonth(date.getMonth() + 2)
  date.setDate(0)
  return date
}

const fetchAccountProfile = async (accountId) => {
  const queries = [
    supabase.from('accounts').select('id, name').eq('id', accountId).maybeSingle(),
    supabase.from('account_profile').select('*').eq('account_id', accountId).maybeSingle(),
  ]

  await Promise.allSettled(queries)
}

const fetchPriorityGuests = async (accountId, todayIso) => {
  const { data: reservations } = await supabase
    .from('reservations')
    .select('guest_id')
    .eq('account_id', accountId)
    .gte('check_out', todayIso)
    .in('status', ['confirmed', 'in_stay'])

  const guestIds = [...new Set((reservations || []).map((row) => row.guest_id).filter(Boolean))]

  if (!guestIds.length) return []

  const { data } = await supabase
    .from('guests')
    .select('*')
    .eq('account_id', accountId)
    .in('id', guestIds)
    .order('first_name', { ascending: true })

  return data || []
}

const fetchPriorityOccupancies = async (accountId, fromIso, toIso) => {
  const { data } = await supabase
    .from('occupancies')
    .select('id, unit_id, start_date, end_date, occupancy_type, reservation_id, inquiry_id, notes')
    .eq('account_id', accountId)
    .lt('start_date', toIso)
    .gte('end_date', fromIso)
    .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')

  return data || []
}

export const warmPriorityOfflineData = async (pinia) => {
  if (!isOnlineNow()) return { ok: false, reason: 'offline' }

  const accountStore = useAccountStore(pinia)
  const accountId = accountStore.currentAccountId
  if (!accountId) return { ok: false, reason: 'missing-account' }

  const sourcesStore = useSourcesStore(pinia)
  const reservationsStore = useReservationsStore(pinia)
  const roomBlocksStore = useRoomBlocksStore(pinia)
  const unitsStore = useUnitsStore(pinia)
  const guestsStore = useGuestsStore(pinia)
  const notificationsStore = useNotificationsStore(pinia)

  const today = new Date()
  const todayIso = toIsoDate(today)
  const next30Iso = toIsoDate(addDays(today, 30))
  const currentMonthIso = toIsoDate(startOfMonth(today))
  const nextMonthEndIso = toIsoDate(endOfNextMonth(today))

  const tasks = [
    accountStore.initializeFromSession(),
    sourcesStore.preload(accountId, { force: true }),
    reservationsStore.fetchReservations({
      checkInFrom: todayIso,
      checkInTo: next30Iso,
      sortBy: 'check_in',
      sortDir: 'asc',
      paginated: false,
      pageSize: 100,
    }),
    roomBlocksStore.fetchRoomBlocks(),
    unitsStore.fetchUnits(),
    guestsStore.fetchGuests(),
    notificationsStore.fetchNotifications(),
    fetchAccountProfile(accountId),
    fetchPriorityGuests(accountId, todayIso),
    fetchPriorityOccupancies(accountId, currentMonthIso, nextMonthEndIso),
    getMessageSettings(accountId),
    getPredefinedMessages(accountId),
  ]

  const results = await Promise.allSettled(tasks)
  const succeeded = results.filter((result) => result.status === 'fulfilled').length

  if (succeeded > 0) {
    markSyncSuccess('dashboard', 'reservations', 'calendar')
  }

  return {
    ok: succeeded > 0,
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
  }
}
