import { supabase } from './supabase'
import { DEFAULT_DOCUMENT_SETTINGS, normalizeDocumentSettings } from '../utils/documentThemes'

export const getDocumentSettings = async (accountId) => {
  const { data, error } = await supabase
    .from('document_settings')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return {
      ...DEFAULT_DOCUMENT_SETTINGS,
      account_id: accountId,
    }
  }

  return normalizeDocumentSettings(data)
}

export const saveDocumentSettings = async (accountId, payload) => {
  const normalized = normalizeDocumentSettings(payload)

  const { data, error } = await supabase
    .from('document_settings')
    .upsert(
      {
        account_id: accountId,
        color_theme: normalized.color_theme,
        color_primary: normalized.color_primary,
        color_accent: normalized.color_accent,
        color_background: normalized.color_background,
        header_layout: normalized.header_layout,
        header_show_logo: normalized.header_show_logo,
        header_logo_size: normalized.header_logo_size,
        header_fields: normalized.header_fields,
        header_extra_text: normalized.header_extra_text || null,
        footer_layout: normalized.footer_layout,
        footer_fields: normalized.footer_fields,
        footer_free_text: normalized.footer_free_text || null,
        show_conditions: normalized.show_conditions,
        custom_field_label: normalized.custom_field_label || null,
        custom_field_content: normalized.custom_field_content || null,
      },
      { onConflict: 'account_id' }
    )
    .select('*')
    .single()

  if (error) throw error
  return normalizeDocumentSettings(data)
}
