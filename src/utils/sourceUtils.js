export const getSourceLabel = (record) => {
  return record?.source_detail_info?.label_es || record?.source_detail?.label_es || record?.source || '-'
}

export const getSourceLegacyValue = (detail) => {
  if (!detail) return null
  return detail.name || null
}