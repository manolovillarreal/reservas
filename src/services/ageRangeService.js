import { supabase } from './supabase'

const DEFAULT_SETTINGS = {
  minors_active: true,
  minors_min_age: 10,
  minors_price_pct: 80,
  children_active: true,
  children_min_age: 2,
  children_max_age: 9,
  children_price_pct: 60,
  infants_active: true,
  infants_max_age: 1,
  infants_price_pct: 0,
}

const clampInteger = (value, fallback) => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return fallback
  return Math.trunc(parsed)
}

const normalizeAgeSettings = (settings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings }

  const minorsMinAge = Math.min(Math.max(clampInteger(merged.minors_min_age, DEFAULT_SETTINGS.minors_min_age), 1), 17)
  const childrenMinAge = Math.max(clampInteger(merged.children_min_age, DEFAULT_SETTINGS.children_min_age), 1)
  const childrenMaxAge = Math.max(clampInteger(merged.children_max_age, DEFAULT_SETTINGS.children_max_age), childrenMinAge)
  const infantsUpperBound = Math.min(5, Math.max(childrenMinAge - 1, 0))
  const infantsMaxAge = Math.min(
    Math.max(clampInteger(merged.infants_max_age, DEFAULT_SETTINGS.infants_max_age), 0),
    infantsUpperBound
  )

  return {
    ...merged,
    minors_min_age: Math.max(minorsMinAge, childrenMaxAge + 1),
    minors_price_pct: clampInteger(merged.minors_price_pct, DEFAULT_SETTINGS.minors_price_pct),
    children_min_age: childrenMinAge,
    children_max_age: childrenMaxAge,
    children_price_pct: clampInteger(merged.children_price_pct, DEFAULT_SETTINGS.children_price_pct),
    infants_max_age: infantsMaxAge,
    infants_price_pct: clampInteger(merged.infants_price_pct, DEFAULT_SETTINGS.infants_price_pct),
  }
}

export async function getAgeCategorySettings(accountId) {
  const { data, error } = await supabase
    .from('age_category_settings')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()

  if (error) throw error
  return data
    ? { ...normalizeAgeSettings(data), account_id: data.account_id ?? accountId }
    : { ...DEFAULT_SETTINGS, account_id: accountId }
}

export async function saveAgeCategorySettings(accountId, settings) {
  const normalized = normalizeAgeSettings(settings)
  const payload = {
    account_id: accountId,
    minors_active: normalized.minors_active,
    minors_min_age: normalized.minors_min_age,
    minors_price_pct: normalized.minors_price_pct,
    children_active: normalized.children_active,
    children_min_age: normalized.children_min_age,
    children_max_age: normalized.children_max_age,
    children_price_pct: normalized.children_price_pct,
    infants_active: normalized.infants_active,
    infants_max_age: normalized.infants_max_age,
    infants_price_pct: normalized.infants_price_pct,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('age_category_settings')
    .upsert(payload, { onConflict: 'account_id' })

  if (error) throw error
}

export function getAgeRangeLabels(settings) {
  const s = normalizeAgeSettings(settings)
  return {
    minors: `Menores (${s.minors_min_age} a 17 años)`,
    children: `Niños (${s.children_min_age} a ${s.children_max_age} años)`,
    infants: `Bebés (0 a ${s.infants_max_age} años)`,
  }
}
