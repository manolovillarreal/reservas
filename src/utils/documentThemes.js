import chroma from 'chroma-js'

export const DOCUMENT_VARIABLE_OPTIONS = [
  { key: 'nombre_comercial', token: '{{nombre_comercial}}', label: 'Nombre comercial' },
  { key: 'nit', token: '{{nit}}', label: 'NIT' },
  { key: 'razon_social', token: '{{razon_social}}', label: 'Razón social' },
  { key: 'telefono', token: '{{telefono}}', label: 'Teléfono' },
  { key: 'email', token: '{{email}}', label: 'Email' },
  { key: 'ciudad', token: '{{ciudad}}', label: 'Ciudad' },
  { key: 'direccion', token: '{{direccion}}', label: 'Dirección' },
  { key: 'website', token: '{{website}}', label: 'Website' },
  { key: 'slogan', token: '{{slogan}}', label: 'Slogan' },
  { key: 'logo', token: '{{logo}}', label: 'Logo' }
]

export const DOCUMENT_COLOR_PALETTES = {
  slate: { primary: '#1E293B', accent: '#3B82F6', background: '#F8FAFC' },
  emerald: { primary: '#064E3B', accent: '#10B981', background: '#F0FDF4' },
  indigo: { primary: '#312E81', accent: '#6366F1', background: '#EEF2FF' },
  warm: { primary: '#78350F', accent: '#F59E0B', background: '#FFFBEB' },
  rose: { primary: '#881337', accent: '#F43F5E', background: '#FFF1F2' }
}

export const DEFAULT_HEADER_FIELDS = {
  nombre_comercial: true,
  nit: true,
  razon_social: false,
  telefono: true,
  email: true,
  ciudad: true,
  direccion: false,
  website: false,
  slogan: false
}

export const DEFAULT_FOOTER_FIELDS = {
  telefono: true,
  email: true,
  website: true,
  ciudad: true,
  direccion: false,
  nombre_comercial: false,
  slogan: false
}

export const DEFAULT_DOCUMENT_SETTINGS = {
  color_theme: 'indigo',
  color_primary: DOCUMENT_COLOR_PALETTES.indigo.primary,
  color_accent: DOCUMENT_COLOR_PALETTES.indigo.accent,
  color_background: DOCUMENT_COLOR_PALETTES.indigo.background,
  header_layout: 1,
  header_show_logo: true,
  header_logo_size: 'medium',
  header_fields: { ...DEFAULT_HEADER_FIELDS },
  header_extra_text: '',
  footer_layout: 1,
  footer_fields: { ...DEFAULT_FOOTER_FIELDS },
  footer_free_text: '',
  show_conditions: true,
  custom_field_label: '',
  custom_field_content: ''
}

const normalizeFields = (value, defaults) => ({
  ...defaults,
  ...(value || {})
})

export const normalizeDocumentSettings = (value = {}) => ({
  ...DEFAULT_DOCUMENT_SETTINGS,
  ...value,
  header_fields: normalizeFields(value.header_fields, DEFAULT_HEADER_FIELDS),
  footer_fields: normalizeFields(value.footer_fields, DEFAULT_FOOTER_FIELDS)
})

export const getDocumentPalette = (documentSettings = {}) => {
  const normalized = normalizeDocumentSettings(documentSettings)
  if (normalized.color_theme === 'custom') {
    return {
      primary: normalized.color_primary,
      accent: normalized.color_accent,
      background: normalized.color_background
    }
  }

  return DOCUMENT_COLOR_PALETTES[normalized.color_theme] || DOCUMENT_COLOR_PALETTES.indigo
}

export const deriveDocumentTheme = (documentSettings = {}) => {
  const palette = getDocumentPalette(documentSettings)
  const primary = chroma(palette.primary)
  const accent = chroma(palette.accent)
  const background = chroma(palette.background)

  return {
    primary: primary.hex(),
    accent: accent.hex(),
    background: background.hex(),
    surface: chroma.mix(background, '#ffffff', 0.7, 'lab').hex(),
    headerSurface: chroma.mix(background, primary, 0.12, 'lab').hex(),
    footerSurface: chroma.mix(background, primary, 0.08, 'lab').hex(),
    accentSoft: chroma.mix(background, accent, 0.16, 'lab').hex(),
    sectionSurface: chroma.mix(background, accent, 0.09, 'lab').hex(),
    border: chroma.mix(primary, background, 0.22, 'lab').alpha(0.35).css(),
    textPrimary: chroma.mix(primary, '#111827', 0.5, 'lab').hex(),
    textSecondary: chroma.mix(primary, background, 0.42, 'lab').darken(1).hex(),
    accentText: chroma.contrast(accent, '#ffffff') > 4.5 ? '#ffffff' : '#111827'
  }
}

export const getLogoSizeClass = (size) => {
  if (size === 'small') return 'h-12 w-12'
  if (size === 'large') return 'h-24 w-24'
  return 'h-16 w-16'
}

export const replaceDocumentVariables = (text, profile = {}, fallbackValues = {}) => {
  const map = {
    '{{logo}}': profile.logo_url || '',
    '{{nombre_comercial}}': profile.commercial_name || profile.legal_name || fallbackValues.nombre_comercial || '',
    '{{nit}}': fallbackValues.nit || profile.nit_display || profile.nit || '',
    '{{razon_social}}': profile.legal_name || fallbackValues.razon_social || '',
    '{{telefono}}': profile.phone || fallbackValues.telefono || '',
    '{{email}}': profile.email || fallbackValues.email || '',
    '{{ciudad}}': profile.city || fallbackValues.ciudad || '',
    '{{direccion}}': profile.address || fallbackValues.direccion || '',
    '{{website}}': profile.website || fallbackValues.website || '',
    '{{slogan}}': profile.slogan || fallbackValues.slogan || ''
  }

  let output = String(text || '')
  Object.entries(map).forEach(([token, value]) => {
    output = output.replaceAll(token, value || '')
  })
  return output.trim()
}