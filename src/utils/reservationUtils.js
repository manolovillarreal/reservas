export const STATUS_LABELS = {
  confirmed: 'Confirmada',
  in_stay: 'En estadía',
  completed: 'Finalizada',
  cancelled: 'Cancelada'
}

export const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || status || 'Sin estado'
}

export const getReservationGuestName = (reservation) => {
  return reservation?.guests?.name || reservation?.guest_name || 'Sin nombre'
}

export const getReservationGuestPhone = (reservation) => {
  return reservation?.guests?.phone || reservation?.guest_phone || 'Sin teléfono'
}

export const getCommissionAmount = (reservation) => {
  const totalAmount = Number(reservation?.total_amount || 0)
  const commissionPercentage = Number(reservation?.commission_percentage || 0)
  return totalAmount * commissionPercentage / 100
}

export const getNetAmount = (reservation) => {
  return Number(reservation?.total_amount || 0) - getCommissionAmount(reservation)
}

export const getCommissionSummary = (reservation) => {
  const percentage = Number(reservation?.commission_percentage || 0)
  const name = reservation?.commission_name || 'Sin comisión'
  const amount = getCommissionAmount(reservation)
  const netAmount = getNetAmount(reservation)

  return {
    name,
    percentage,
    amount,
    netAmount
  }
}

export const generateReservationNumber = ({ date = new Date(), previousReservationNumber = null }) => {
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`

  let nextSequence = 1
  if (previousReservationNumber) {
    const parts = previousReservationNumber.split('-')
    const currentSeq = Number(parts[2] || '0')
    nextSequence = currentSeq + 1
  }

  return `RES-${yearMonth}-${String(nextSequence).padStart(4, '0')}`
}

export const getGuestsTotal = (reservation) => {
  return Number(reservation?.adults || 0) + Number(reservation?.children || 0)
}

export const getBalanceAmount = (reservation) => {
  return Number(reservation?.total_amount || 0) - Number(reservation?.paid_amount || 0)
}
