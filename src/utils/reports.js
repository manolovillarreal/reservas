const DAY_MS = 24 * 60 * 60 * 1000

const CHART_COLORS = ['#4C2FFF', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6']

export const REPORTS_STATE_KEY = 'tekmi_reports_dashboard_state'

export const parseDate = (value) => {
  if (!value) return null
  const raw = String(value).slice(0, 10)
  const [year, month, day] = raw.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export const toIsoDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addDays = (value, days) => {
  const base = value instanceof Date ? new Date(value) : parseDate(value)
  if (!base) return null
  base.setDate(base.getDate() + Number(days || 0))
  return base
}

export const diffDaysInclusive = (start, end) => {
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (!startDate || !endDate) return 0
  return Math.max(Math.round((endDate - startDate) / DAY_MS) + 1, 0)
}

export const getNightCount = (checkIn, checkOut) => {
  const startDate = parseDate(checkIn)
  const endDate = parseDate(checkOut)
  if (!startDate || !endDate) return 0
  return Math.max(Math.round((endDate - startDate) / DAY_MS), 0)
}

export const formatDateDisplay = (value) => {
  const date = parseDate(value)
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

export const formatCop = (value, withSymbol = true) => {
  const amount = Number(value || 0)
  if (withSymbol) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0
  }).format(amount)
}

export const formatPercent = (value) => {
  const numeric = Number(value || 0)
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(numeric)}%`
}

export const startOfWeek = (value) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value)
  if (!date) return null
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

export const endOfWeek = (value) => addDays(startOfWeek(value), 6)

export const startOfMonth = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value)
  if (!date) return null
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export const endOfMonth = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value)
  if (!date) return null
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export const startOfYear = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value)
  if (!date) return null
  return new Date(date.getFullYear(), 0, 1)
}

export const endOfYear = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value)
  if (!date) return null
  return new Date(date.getFullYear(), 11, 31)
}

export const getPresetRange = (preset, referenceDate = new Date()) => {
  const now = new Date(referenceDate)

  if (preset === 'week') {
    return {
      start: toIsoDate(startOfWeek(now)),
      end: toIsoDate(endOfWeek(now))
    }
  }

  if (preset === 'year') {
    return {
      start: toIsoDate(startOfYear(now)),
      end: toIsoDate(endOfYear(now))
    }
  }

  return {
    start: toIsoDate(startOfMonth(now)),
    end: toIsoDate(endOfMonth(now))
  }
}

export const normalizeRange = (range, fallbackPreset = 'month') => {
  const fallback = getPresetRange(fallbackPreset)
  const start = toIsoDate(range?.start || fallback.start)
  const end = toIsoDate(range?.end || fallback.end)

  if (!start || !end) return fallback
  if (start > end) return { start: end, end: start }
  return { start, end }
}

export const getPreviousRange = (range) => {
  const normalized = normalizeRange(range)
  const days = diffDaysInclusive(normalized.start, normalized.end)
  const previousEnd = addDays(normalized.start, -1)
  const previousStart = addDays(previousEnd, -(days - 1))

  return {
    start: toIsoDate(previousStart),
    end: toIsoDate(previousEnd)
  }
}

export const describeRange = (range) => {
  const normalized = normalizeRange(range)
  return `${formatDateDisplay(normalized.start)} – ${formatDateDisplay(normalized.end)}`
}

export const getMetricComparison = (current, previous) => {
  const currentValue = Number(current || 0)
  const previousValue = Number(previous || 0)

  if (currentValue === 0 && previousValue === 0) {
    return { direction: 'neutral', label: '= sin cambio' }
  }

  if (previousValue === 0) {
    return {
      direction: currentValue > 0 ? 'up' : 'neutral',
      label: currentValue > 0 ? '↑ nuevo vs periodo anterior' : '= sin cambio'
    }
  }

  const variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100
  const rounded = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.abs(variation))

  if (Math.abs(variation) < 0.05) {
    return { direction: 'neutral', label: '= sin cambio' }
  }

  return {
    direction: variation > 0 ? 'up' : 'down',
    label: `${variation > 0 ? '↑' : '↓'} ${rounded}% vs periodo anterior`
  }
}

export const normalizeReservationRecord = (row) => {
  const totalAmount = Number(row?.total_amount || 0)
  const paidAmount = Number(row?.paid_amount || 0)
  const commissionPct = Number(row?.commission_percentage || 0)
  const unitNames = (row?.reservation_units || [])
    .map((item) => item?.units?.name)
    .filter(Boolean)

  const guestName = `${row?.guests?.first_name || ''} ${row?.guests?.last_name || ''}`.trim() || 'Sin nombre'
  const guestsTotal =
    Number(row?.adults || 0) +
    Number(row?.minors || 0) +
    Number(row?.children || 0) +
    Number(row?.infants || 0)

  const commissionAmount = totalAmount * commissionPct / 100
  const netAmount = totalAmount - commissionAmount
  const balance = totalAmount - paidAmount

  return {
    ...row,
    guest_name: guestName,
    unit_ids: (row?.reservation_units || []).map((item) => item?.unit_id).filter(Boolean),
    unit_names_display: unitNames.join(', '),
    channel_label: row?.source_detail_info?.label_es || 'Directo',
    nights: getNightCount(row?.check_in, row?.check_out),
    guests_total: guestsTotal,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    commission_percentage: commissionPct,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    balance,
    payment_status: balance <= 0 ? 'Pagado' : paidAmount > 0 ? 'Abonado' : 'Pendiente'
  }
}

export const buildMetrics = ({ reservations = [], units = [], occupancies = [], range }) => {
  const grossIncome = reservations.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
  const netIncome = reservations.reduce((sum, item) => sum + Number(item.net_amount || 0), 0)
  const collectedRevenue = reservations.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0)
  const reservationsTotal = reservations.length
  const nightsSold = reservations.reduce((sum, item) => sum + Number(item.nights || 0), 0)
  const averageStay = reservationsTotal ? nightsSold / reservationsTotal : 0
  const averageRate = nightsSold ? grossIncome / nightsSold : 0
  const totalGuests = reservations.reduce((sum, item) => sum + Number(item.guests_total || 0), 0)
  const averageRatePerPerson = totalGuests ? grossIncome / totalGuests : 0

  const unitStats = buildUnitOccupancyData(units, occupancies, range, reservations)
  const totalUnitDays = unitStats.reduce((sum, unit) => sum + Number(unit.totalDays || 0), 0)
  const occupiedUnitDays = unitStats.reduce((sum, unit) => sum + Number(unit.occupiedDays || 0), 0)
  const averageOccupancy = totalUnitDays ? (occupiedUnitDays / totalUnitDays) * 100 : 0

  return {
    grossIncome,
    netIncome,
    collectedRevenue,
    averageOccupancy,
    reservationsTotal,
    nightsSold,
    averageStay,
    averageRate,
    averageRatePerPerson,
    totalGuests
  }
}

export const getIncomeGranularity = (range) => {
  const days = diffDaysInclusive(range?.start, range?.end)
  if (days <= 31) return 'day'
  if (days <= 366) return 'week'
  return 'month'
}

const monthLabel = (value) => {
  const date = parseDate(value)
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(date)
}

const buildBuckets = (range, granularity) => {
  const normalized = normalizeRange(range)
  const buckets = []
  let cursor = parseDate(normalized.start)
  const end = parseDate(normalized.end)

  while (cursor && end && cursor <= end) {
    const startIso = toIsoDate(cursor)
    let bucketEnd = new Date(cursor)
    let label = formatDateDisplay(startIso).slice(0, 5)

    if (granularity === 'week') {
      bucketEnd = addDays(cursor, 6)
      label = formatDateDisplay(startIso).slice(0, 5)
    } else if (granularity === 'month') {
      bucketEnd = endOfMonth(cursor)
      label = monthLabel(startIso)
    }

    if (bucketEnd > end) bucketEnd = new Date(end)

    buckets.push({
      key: `${startIso}_${toIsoDate(bucketEnd)}`,
      label,
      start: startIso,
      end: toIsoDate(bucketEnd)
    })

    cursor = addDays(bucketEnd, 1)
  }

  return buckets
}

export const buildIncomeSeries = (reservations = [], range, previousReservations = []) => {
  const normalized = normalizeRange(range)
  const granularity = getIncomeGranularity(normalized)
  const currentBuckets = buildBuckets(normalized, granularity)
  const previousRange = getPreviousRange(normalized)
  const previousBuckets = buildBuckets(previousRange, granularity)

  const sumForBuckets = (rows, buckets) => {
    const map = {}
    for (const bucket of buckets) {
      map[bucket.key] = 0
    }

    for (const row of rows) {
      const date = toIsoDate(row.check_in)
      const bucket = buckets.find((item) => date >= item.start && date <= item.end)
      if (bucket) {
        map[bucket.key] += Number(row.total_amount || 0)
      }
    }

    return map
  }

  const currentMap = sumForBuckets(reservations, currentBuckets)
  const previousMap = sumForBuckets(previousReservations, previousBuckets)

  return currentBuckets.map((bucket, index) => ({
    label: bucket.label,
    current: Number(currentMap[bucket.key] || 0),
    previous: previousBuckets[index] ? Number(previousMap[previousBuckets[index].key] || 0) : 0
  }))
}

export const buildUnitOccupancyData = (units = [], occupancies = [], range, reservations = []) => {
  const normalized = normalizeRange(range)
  const dates = enumerateDays(normalized.start, normalized.end)

  const incomeByUnit = {}
  for (const reservation of reservations) {
    const unitIds = reservation.unit_ids || []
    const share = unitIds.length > 0 ? Number(reservation.total_amount || 0) / unitIds.length : 0
    for (const unitId of unitIds) {
      incomeByUnit[unitId] = (incomeByUnit[unitId] || 0) + share
    }
  }

  return (units || []).map((unit) => {
    let occupiedDays = 0
    let blockedDays = 0

    for (const date of dates) {
      const status = resolveCellStatus(unit.id, date, occupancies)
      if (status === 'occupied') occupiedDays += 1
      if (status === 'blocked') blockedDays += 1
    }

    const totalDays = dates.length
    const occupancyPct = totalDays ? (occupiedDays / totalDays) * 100 : 0

    return {
      unitId: unit.id,
      unitName: unit.name,
      totalDays,
      occupiedDays,
      blockedDays,
      availableDays: Math.max(totalDays - occupiedDays - blockedDays, 0),
      occupancyPct,
      income: Number(incomeByUnit[unit.id] || 0),
      color: occupancyPct >= 70 ? 'green' : occupancyPct >= 40 ? 'yellow' : 'red'
    }
  }).sort((a, b) => b.occupancyPct - a.occupancyPct)
}

export const buildChannelReservationData = (reservations = []) => {
  const grouped = {}
  const total = reservations.length || 0

  for (const item of reservations) {
    const key = item.channel_label || 'Directo'
    if (!grouped[key]) {
      grouped[key] = { label: key, value: 0 }
    }
    grouped[key].value += 1
  }

  return Object.values(grouped)
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      percentage: total ? (item.value / total) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
}

export const buildChannelIncomeData = (reservations = []) => {
  const grouped = {}

  for (const item of reservations) {
    const key = item.channel_label || 'Directo'
    if (!grouped[key]) {
      grouped[key] = {
        label: key,
        gross: 0,
        net: 0,
        commission: 0
      }
    }

    grouped[key].gross += Number(item.total_amount || 0)
    grouped[key].net += Number(item.net_amount || 0)
    grouped[key].commission += Number(item.commission_amount || 0)
  }

  return Object.values(grouped).sort((a, b) => b.gross - a.gross)
}

export const buildHeatmapData = (units = [], occupancies = [], range) => {
  const normalized = normalizeRange(range)
  const allDates = enumerateDays(normalized.start, normalized.end)
  const limitedDates = allDates.slice(0, 31)
  const truncated = allDates.length > 31

  return {
    truncated,
    dates: limitedDates,
    rows: units.map((unit) => ({
      unitId: unit.id,
      unitName: unit.name,
      cells: limitedDates.map((date) => {
        const detail = getCellDetail(unit.id, date, occupancies)
        return {
          unitId: unit.id,
          unitName: unit.name,
          date,
          ...detail
        }
      })
    }))
  }
}

export const buildExportRows = (reservations = [], occupancyByUnit = []) => {
  const incomeRows = reservations.map((item) => ({
    'Fecha reserva': formatDateDisplay(item.created_at || item.check_in),
    'Código': item.reference_code || item.reservation_number || '-',
    'Huésped': item.guest_name,
    'Unidad': item.unit_names_display || 'Sin asignar',
    'Noches': item.nights || 0,
    'Tarifa por noche': formatCop(item.nights ? Number(item.total_amount || 0) / Math.max(item.nights, 1) : 0, false),
    'Total bruto': formatCop(item.total_amount, false),
    'Comisión': formatCop(item.commission_amount, false),
    'Total neto': formatCop(item.net_amount, false),
    'Canal': item.channel_label || 'Directo',
    'Estado de pago': item.payment_status
  }))

  const occupancyRows = occupancyByUnit.map((item) => ({
    'Unidad': item.unitName,
    'Días disponibles en periodo': item.availableDays,
    'Días ocupados': item.occupiedDays,
    'Días bloqueados': item.blockedDays,
    'Porcentaje de ocupación': new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(item.occupancyPct),
    'Ingresos generados': formatCop(item.income, false)
  }))

  const reservationRows = reservations.map((item) => ({
    'Código': item.reference_code || item.reservation_number || '-',
    'Huésped': item.guest_name,
    'Canal': item.channel_label || 'Directo',
    'Unidad': item.unit_names_display || 'Sin asignar',
    'Check-in': formatDateDisplay(item.check_in),
    'Check-out': formatDateDisplay(item.check_out),
    'Noches': item.nights || 0,
    'Personas': item.guests_total || 0,
    'Estado': item.status || '-',
    'Total': formatCop(item.total_amount, false),
    'Pagado': formatCop(item.paid_amount, false),
    'Saldo pendiente': formatCop(item.balance, false)
  }))

  const guestMap = {}
  for (const item of reservations) {
    const key = `${item.guest_name}__${item.guests?.phone || ''}`
    if (!guestMap[key]) {
      guestMap[key] = {
        name: item.guest_name,
        phone: item.guests?.phone || '-',
        stays: 0,
        nights: 0,
        lastVisit: item.check_out,
        totalSpent: 0
      }
    }

    guestMap[key].stays += 1
    guestMap[key].nights += Number(item.nights || 0)
    guestMap[key].totalSpent += Number(item.total_amount || 0)
    if (item.check_out && (!guestMap[key].lastVisit || item.check_out > guestMap[key].lastVisit)) {
      guestMap[key].lastVisit = item.check_out
    }
  }

  const guestsRows = Object.values(guestMap).map((item) => ({
    'Nombre': item.name,
    'Teléfono': item.phone,
    'Número de estadías': item.stays,
    'Noches totales': item.nights,
    'Última visita': formatDateDisplay(item.lastVisit),
    'Total gastado': formatCop(item.totalSpent, false)
  }))

  return {
    ingresos: incomeRows,
    ocupacion: occupancyRows,
    reservas: reservationRows,
    huespedes: guestsRows
  }
}

export const exportRowsToCsv = (fileName, rows = []) => {
  if (!rows.length) return false
  const headers = Object.keys(rows[0])
  const csv = [headers.join(';')]

  for (const row of rows) {
    csv.push(headers.map((header) => escapeCsvValue(row[header])).join(';'))
  }

  const blob = new Blob([`\uFEFF${csv.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}

export const getChartColors = () => [...CHART_COLORS]

export const enumerateDays = (start, end) => {
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (!startDate || !endDate || startDate > endDate) return []

  const dates = []
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    dates.push(toIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export const getCellDetail = (unitId, date, occupancies = []) => {
  const match = occupancies.find((item) => {
    if (item.unit_id !== unitId) return false
    return date >= toIsoDate(item.start_date) && date < toIsoDate(item.end_date)
  })

  if (!match) {
    return {
      status: 'free',
      label: 'Libre',
      note: ''
    }
  }

  const isOccupied = ['reservation', 'external'].includes(match.occupancy_type)

  return {
    status: isOccupied ? 'occupied' : 'blocked',
    label: isOccupied ? 'Ocupado' : 'Bloqueado',
    note: match.notes || match.occupancy_type || ''
  }
}

export const resolveCellStatus = (unitId, date, occupancies = []) => getCellDetail(unitId, date, occupancies).status

const escapeCsvValue = (value) => {
  const raw = value == null ? '' : String(value)
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}
