export const getSourceLabel = (record) => {
  if (record?.source_name) {
    return `${record?.source_detail_info?.label_es || record?.source_detail?.label_es || 'Otro'} — ${record.source_name}`
  }
  return record?.source_detail_info?.label_es || record?.source_detail?.label_es || '-'
}

export const getSourceLegacyValue = (detail) => {
  if (!detail) return null
  return detail.name || null
}