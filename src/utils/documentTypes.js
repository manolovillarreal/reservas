export const DOCUMENT_TYPES_ADULT = [
  { value: 'CC',  label: 'CC — Cédula de Ciudadanía' },
  { value: 'CE',  label: 'CE — Cédula de Extranjería' },
  { value: 'PA',  label: 'PA — Pasaporte' },
  { value: 'PE',  label: 'PE — Permiso Especial de Permanencia' },
  { value: 'PT',  label: 'PT — Permiso de Protección Temporal' },
  { value: 'DNI', label: 'DNI — Documento Nacional de Identidad' },
]

export const DOCUMENT_TYPES_MINOR = [
  { value: 'TI', label: 'TI — Tarjeta de Identidad' },
  { value: 'RC', label: 'RC — Registro Civil' },
  { value: 'MS', label: 'MS — Menor sin identificación' },
]

export const DOCUMENT_TYPES_ALL = [...DOCUMENT_TYPES_ADULT, ...DOCUMENT_TYPES_MINOR]
