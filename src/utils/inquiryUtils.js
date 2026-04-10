export const INQUIRY_STATUS_LABELS = {
  nueva:          'Nueva',
  en_seguimiento: 'En seguimiento',
  cotizada:       'Cotizada',
  vencida:        'Vencida',
  convertida:     'Convertida',
  perdida:        'Perdida'
}

// Transitions visible/selectable in the UI
// 'en_seguimiento' is not shown as a manual option — assigned automatically
export const INQUIRY_TRANSITIONS = {
  nueva:          ['cotizada', 'convertida', 'perdida'],
  en_seguimiento: ['cotizada', 'convertida', 'perdida'],
  cotizada:       ['vencida', 'convertida', 'perdida'],
  vencida:        ['convertida', 'perdida'],
  convertida:     [],
  perdida:        []
}

export const getAvailableInquiryTransitions = (status) => {
  return INQUIRY_TRANSITIONS[status] ?? []
}

export const isValidInquiryTransition = (from, to) => {
  return getAvailableInquiryTransitions(from).includes(to)
}

export const getInquiryStatusLabel = (status) => {
  return INQUIRY_STATUS_LABELS[status] || status || 'Sin estado'
}

// Badge class builder — returns an inline style object
export const getInquiryStatusStyle = (status) => {
  const map = {
    nueva:          { background: '#F0FDF4', color: '#065F46', borderColor: '#6EE7B7' },
    en_seguimiento: { background: '#F0FDF4', color: '#065F46', borderColor: '#6EE7B7' },
    cotizada:       { background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' },
    vencida:        { background: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA' },
    convertida:     { background: '#EEF2FF', color: '#2D1B69', borderColor: '#C7D2FE' },
    perdida:        { background: '#F3F4F6', color: '#9CA3AF', borderColor: '#E5E7EB' }
  }
  return map[status] ?? { background: '#F3F4F6', color: '#9CA3AF', borderColor: '#E5E7EB' }
}
