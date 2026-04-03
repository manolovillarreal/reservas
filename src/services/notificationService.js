import { supabase } from './supabase'

// ============================================================
// VALORES POR DEFECTO DE CONFIGURACIÓN
// ============================================================
export const DEFAULT_NOTIFICATION_SETTINGS = {
  // Reservas y consultas
  nueva_consulta:         { enabled: true },
  nueva_reserva:          { enabled: true },
  reserva_cancelada:      { enabled: true },
  inquiry_expiring_soon:  { enabled: true, days: 2 },
  inquiry_no_activity:    { enabled: true, days: 5 },
  // Llegada y salida
  preregistro_completado: { enabled: true },
  preregistro_pending:    { enabled: true, days: 3 },
  checkin_del_dia:        { enabled: true },
  checkin_realizado:      { enabled: true },
  checkout_del_dia:       { enabled: true },
  checkout_vencido:       { enabled: true },
  // Pagos
  anticipo_registrado:          { enabled: true },
  balance_pending_post_checkin: { enabled: true, hours: 12 },
}

// ============================================================
// CORE: insertar notificación (fire-and-forget, nunca lanza)
// ============================================================
export async function createNotification(accountId, { type, title, message = null, related_type = null, related_id = null, is_alert = false }) {
  try {
    await supabase.from('notifications').insert({
      account_id: accountId,
      type,
      title,
      message,
      related_type,
      related_id,
      is_alert,
    })
    // Fire-and-forget: enviar push a los dispositivos suscritos de la cuenta.
    // El .catch() garantiza que un fallo de push nunca interrumpe el flujo.
    sendPushNotification(accountId, { type, title, message, related_type, related_id })
      .catch(err => console.error('[push] send-push failed:', err))
  } catch (e) {
    // silencioso — las notificaciones nunca interrumpen el flujo principal
    console.warn('[notifications] createNotification failed silently:', e?.message)
  }
}

// ============================================================
// PUSH NOTIFICATIONS — fire-and-forget
// Llama a la Edge Function send-push con el payload de la
// notificación recién creada. Nunca lanza errores al llamador.
// ============================================================
export async function sendPushNotification(accountId, notification) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return

  const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      account_id: accountId,
      type: notification.type,
      title: notification.title,
      message: notification.message ?? null,
      related_type: notification.related_type ?? null,
      related_id: notification.related_id ?? null,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`send-push HTTP ${res.status}: ${text}`)
  }
}

// ============================================================
// CONFIGURACIÓN: fetch y upsert
// ============================================================
export async function getNotificationSettings(accountId) {
  const { data } = await supabase
    .from('notification_settings')
    .select('settings')
    .eq('account_id', accountId)
    .maybeSingle()

  if (!data?.settings) return { ...DEFAULT_NOTIFICATION_SETTINGS }
  // Merge con defaults para tipos nuevos que puedan añadirse en el futuro
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...data.settings }
}

export async function saveNotificationSettings(accountId, settings) {
  const { error } = await supabase
    .from('notification_settings')
    .upsert({ account_id: accountId, settings }, { onConflict: 'account_id' })
  if (error) throw error
}

// ============================================================
// HELPERS INTERNOS
// ============================================================
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(String(dateStr)).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

// ============================================================
// EVENTOS DIRECTOS (activos)
// Todas las funciones notifyXxx tienen try/catch interno garantizado:
// nunca propagan errores al llamador.
// ============================================================

export async function notifyNuevaConsulta(accountId, inquiry) {
  try {
    const guestName = inquiry?.guest_name || 'Huésped desconocido'
    const checkIn = formatDate(inquiry?.check_in)
    await createNotification(accountId, {
      type: 'nueva_consulta',
      title: `Nueva consulta: ${guestName}`,
      message: checkIn ? `Llegada prevista: ${checkIn}` : null,
      related_type: 'inquiry',
      related_id: inquiry?.id || null,
    })
  } catch (e) { /* silencioso */ }
}

export async function notifyNuevaReserva(accountId, reservation) {
  try {
    const guestName = reservation?.guest_name || 'Huésped desconocido'
    const checkIn = formatDate(reservation?.check_in)
    await createNotification(accountId, {
      type: 'nueva_reserva',
      title: `Nueva reserva: ${guestName}`,
      message: checkIn ? `Check-in: ${checkIn}` : null,
      related_type: 'reservation',
      related_id: reservation?.id || null,
    })
  } catch (e) { /* silencioso */ }
}

export async function notifyReservaCancelada(accountId, reservation) {
  try {
    const guestName = reservation?.guest_name || 'Huésped desconocido'
    const checkIn = formatDate(reservation?.check_in)
    await createNotification(accountId, {
      type: 'reserva_cancelada',
      title: `Reserva cancelada: ${guestName}`,
      message: checkIn ? `Fecha de check-in era: ${checkIn}` : null,
      related_type: 'reservation',
      related_id: reservation?.id || null,
    })
  } catch (e) { /* silencioso */ }
}

export async function notifyPreregistroCompletado(accountId, reservation) {
  try {
    const guestName = reservation?.guest_name || 'Huésped desconocido'
    const checkIn = formatDate(reservation?.check_in)
    await createNotification(accountId, {
      type: 'preregistro_completado',
      title: `Pre-registro completado: ${guestName}`,
      message: checkIn ? `Check-in: ${checkIn}` : null,
      related_type: 'reservation',
      related_id: reservation?.id || null,
    })
  } catch (e) { /* silencioso */ }
}

export async function notifyCheckinRealizado(accountId, reservation) {
  try {
    const guestName = reservation?.guest_name || 'Huésped desconocido'
    await createNotification(accountId, {
      type: 'checkin_realizado',
      title: `Check-in registrado: ${guestName}`,
      message: null,
      related_type: 'reservation',
      related_id: reservation?.id || null,
    })
  } catch (e) { /* silencioso */ }
}

export async function notifyAnticipoRegistrado(accountId, payment, reservation) {
  try {
    const guestName = reservation?.guest_name || 'Huésped desconocido'
    const amount = Number(payment?.amount || 0).toLocaleString('es-CO')
    await createNotification(accountId, {
      type: 'anticipo_registrado',
      title: `Pago registrado: $${amount}`,
      message: `Reserva de ${guestName}`,
      related_type: 'reservation',
      related_id: reservation?.id || null,
    })
  } catch (e) { /* silencioso */ }
}

// ============================================================
// NOTIFICACIONES PROGRAMADAS (inactivas hasta que pg_cron esté disponible en staging)
//
// Para activar estas funciones:
//   1. Habilitar pg_cron en la instancia de Supabase.
//   2. Crear las entradas de cron en una migración SQL:
//      SELECT cron.schedule('checkin-del-dia', '0 7 * * *', '...');
//      (o bien invocarlas desde Edge Functions con cron trigger)
//   3. Descomentar las exportaciones al final de este bloque.
// ============================================================

// Utilidad: evita duplicados verificando si ya existe una notificación
// del mismo type+related_id en las últimas 24 horas.
async function isDuplicateNotification(accountId, type, relatedId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let query = supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('type', type)
    .gte('created_at', since)
  if (relatedId) query = query.eq('related_id', relatedId)
  const { count } = await query
  return (count || 0) > 0
}

// cron: '0 7 * * *' — cada mañana a las 7am
// Notifica reservas con check-in hoy.
async function _runCheckinDelDia(accountId) {
  const settings = await getNotificationSettings(accountId)
  if (!settings.checkin_del_dia?.enabled) return

  const todayIso = new Date().toISOString().slice(0, 10)
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, guests(name), check_in')
    .eq('account_id', accountId)
    .eq('check_in', todayIso)
    .eq('status', 'confirmed')

  for (const res of reservations || []) {
    if (await isDuplicateNotification(accountId, 'checkin_del_dia', res.id)) continue
    await createNotification(accountId, {
      type: 'checkin_del_dia',
      title: `Check-in hoy: ${res.guests?.name || 'Huésped'}`,
      message: 'Llegada programada para hoy',
      related_type: 'reservation',
      related_id: res.id,
      is_alert: true,
    })
  }
}

// cron: '0 7 * * *' — cada mañana a las 7am
// Notifica reservas con check-out hoy.
async function _runCheckoutDelDia(accountId) {
  const settings = await getNotificationSettings(accountId)
  if (!settings.checkout_del_dia?.enabled) return

  const todayIso = new Date().toISOString().slice(0, 10)
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, guests(name), check_out')
    .eq('account_id', accountId)
    .eq('check_out', todayIso)
    .in('status', ['confirmed', 'in_stay'])

  for (const res of reservations || []) {
    if (await isDuplicateNotification(accountId, 'checkout_del_dia', res.id)) continue
    await createNotification(accountId, {
      type: 'checkout_del_dia',
      title: `Check-out hoy: ${res.guests?.name || 'Huésped'}`,
      message: 'Salida programada para hoy',
      related_type: 'reservation',
      related_id: res.id,
      is_alert: true,
    })
  }
}

// cron: '0 * * * *' — cada hora
// Notifica reservas con check-out vencido (status in_stay y check_out < hoy).
async function _runCheckoutVencido(accountId) {
  const settings = await getNotificationSettings(accountId)
  if (!settings.checkout_vencido?.enabled) return

  const todayIso = new Date().toISOString().slice(0, 10)
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, guests(name), check_out')
    .eq('account_id', accountId)
    .eq('status', 'in_stay')
    .lt('check_out', todayIso)

  for (const res of reservations || []) {
    if (await isDuplicateNotification(accountId, 'checkout_vencido', res.id)) continue
    await createNotification(accountId, {
      type: 'checkout_vencido',
      title: `Check-out vencido: ${res.guest_name || 'Huésped'}`,
      message: `Salida era el ${formatDate(res.check_out)}`,
      related_type: 'reservation',
      related_id: res.id,
      is_alert: true,
    })
  }
}

// cron: '0 8 * * *' — diario a las 8am
// Notifica reservas confirmadas próximas sin pre-registro completado.
async function _runPreregistroPending(accountId) {
  const settings = await getNotificationSettings(accountId)
  if (!settings.preregistro_pending?.enabled) return

  const days = settings.preregistro_pending?.days ?? 3
  const todayIso = new Date().toISOString().slice(0, 10)
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + days)
  const targetIso = targetDate.toISOString().slice(0, 10)

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, guests(name), check_in')
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .eq('preregistro_completado', false)
    .gte('check_in', todayIso)
    .lte('check_in', targetIso)

  for (const res of reservations || []) {
    if (await isDuplicateNotification(accountId, 'preregistro_pending', res.id)) continue
    await createNotification(accountId, {
      type: 'preregistro_pending',
      title: `Pre-registro pendiente: ${res.guests?.name || 'Huésped'}`,
      message: `Check-in: ${formatDate(res.check_in)} (faltan ${days} días o menos)`,
      related_type: 'reservation',
      related_id: res.id,
      is_alert: true,
    })
  }
}

// cron: '0 8 * * *' — diario a las 8am
// Notifica consultas próximas a vencer su quote_expires_at.
async function _runInquiryExpiringSoon(accountId) {
  const settings = await getNotificationSettings(accountId)
  if (!settings.inquiry_expiring_soon?.enabled) return

  const days = settings.inquiry_expiring_soon?.days ?? 2
  const now = new Date()
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + days)

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, guest_name, quote_expires_at')
    .eq('account_id', accountId)
    .in('status', ['nueva', 'contactada', 'cotizada'])
    .gte('quote_expires_at', now.toISOString())
    .lte('quote_expires_at', targetDate.toISOString())

  for (const inq of inquiries || []) {
    if (await isDuplicateNotification(accountId, 'inquiry_expiring_soon', inq.id)) continue
    await createNotification(accountId, {
      type: 'inquiry_expiring_soon',
      title: `Cotización próxima a vencer: ${inq.guest_name || 'Sin nombre'}`,
      message: `Vence: ${formatDate(inq.quote_expires_at)}`,
      related_type: 'inquiry',
      related_id: inq.id,
    })
  }
}

// cron: '0 8 * * *' — diario a las 8am
// Notifica consultas sin actividad reciente.
async function _runInquiryNoActivity(accountId) {
  const settings = await getNotificationSettings(accountId)
  if (!settings.inquiry_no_activity?.enabled) return

  const days = settings.inquiry_no_activity?.days ?? 5
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, guest_name, updated_at')
    .eq('account_id', accountId)
    .in('status', ['nueva', 'contactada', 'cotizada'])
    .lte('updated_at', cutoffDate.toISOString())

  for (const inq of inquiries || []) {
    if (await isDuplicateNotification(accountId, 'inquiry_no_activity', inq.id)) continue
    await createNotification(accountId, {
      type: 'inquiry_no_activity',
      title: `Consulta sin actividad: ${inq.guest_name || 'Sin nombre'}`,
      message: `Sin cambios desde hace ${days}+ días`,
      related_type: 'inquiry',
      related_id: inq.id,
    })
  }
}

// cron: '0 * * * *' — cada hora
// Notifica reservas in_stay con saldo >0 y check-in hace más de N horas.
async function _runBalancePendingPostCheckin(accountId) {
  const settings = await getNotificationSettings(accountId)
  if (!settings.balance_pending_post_checkin?.enabled) return

  const hours = settings.balance_pending_post_checkin?.hours ?? 12
  const cutoffIso = new Date(Date.now() - hours * 3600000).toISOString().slice(0, 10)

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, guest_name, check_in, total_amount, paid_amount')
    .eq('account_id', accountId)
    .eq('status', 'in_stay')
    .lte('check_in', cutoffIso)

  for (const res of reservations || []) {
    const balance = Number(res.total_amount || 0) - Number(res.paid_amount || 0)
    if (balance <= 0) continue
    if (await isDuplicateNotification(accountId, 'balance_pending_post_checkin', res.id)) continue
    await createNotification(accountId, {
      type: 'balance_pending_post_checkin',
      title: `Saldo pendiente: ${res.guest_name || 'Huésped'}`,
      message: `Saldo: $${balance.toLocaleString('es-CO')} · Lleva más de ${hours}h en el alojamiento`,
      related_type: 'reservation',
      related_id: res.id,
      is_alert: true,
    })
  }
}

// ============================================================
// Exportaciones de funciones programadas
// INACTIVAS — descomentar cuando pg_cron esté disponible en staging:
// ============================================================
// export const runCheckinDelDia        = _runCheckinDelDia
// export const runCheckoutDelDia       = _runCheckoutDelDia
// export const runCheckoutVencido      = _runCheckoutVencido
// export const runPreregistroPending   = _runPreregistroPending
// export const runInquiryExpiringSoon  = _runInquiryExpiringSoon
// export const runInquiryNoActivity    = _runInquiryNoActivity
// export const runBalancePendingPostCheckin = _runBalancePendingPostCheckin
