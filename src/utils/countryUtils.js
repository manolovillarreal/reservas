import { countries, getEmojiFlag } from 'countries-list'

/**
 * ISO codes that appear at the top of country lists.
 * Shared by AppCountrySelect and AppPhoneInput.
 */
export const PRIORITY_COUNTRY_CODES = [
  'CO', // Colombia
  'AR', // Argentina
  'BO', // Bolivia
  'BR', // Brasil
  'CA', // Canadá
  'CL', // Chile
  'CR', // Costa Rica
  'CU', // Cuba
  'DO', // República Dominicana
  'EC', // Ecuador
  'ES', // España
  'GT', // Guatemala
  'HN', // Honduras
  'IT', // Italia
  'MX', // México
  'NI', // Nicaragua
  'PA', // Panamá
  'PE', // Perú
  'PY', // Paraguay
  'SV', // El Salvador
  'US', // Estados Unidos
  'UY', // Uruguay
  'VE', // Venezuela
]

/**
 * All countries with code, name and emoji flag.
 * Priority countries appear first, then the rest sorted alphabetically.
 * Used by AppCountrySelect.
 */
export const allCountries = (() => {
  const list = Object.entries(countries).map(([code, data]) => ({
    code,
    name: data.name,
    emoji: getEmojiFlag(code),
  }))

  const priority = PRIORITY_COUNTRY_CODES
    .map((code) => list.find((c) => c.code === code))
    .filter(Boolean)

  const rest = list
    .filter((c) => !PRIORITY_COUNTRY_CODES.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...priority, ...rest]
})()

/**
 * All countries with code, name, emoji flag and dial code (e.g. '+57').
 * Priority countries appear first, then the rest sorted alphabetically.
 * Used by AppPhoneInput.
 */
export const dialCountries = (() => {
  const list = Object.entries(countries)
    .map(([code, data]) => {
      const dialNumber = Array.isArray(data.phone) ? data.phone[0] : null
      if (!dialNumber) return null
      return {
        code,
        name: data.name,
        emoji: getEmojiFlag(code),
        dialCode: `+${dialNumber}`,
      }
    })
    .filter(Boolean)

  const priority = PRIORITY_COUNTRY_CODES
    .map((code) => list.find((c) => c.code === code))
    .filter(Boolean)

  const rest = list
    .filter((c) => !PRIORITY_COUNTRY_CODES.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...priority, ...rest]
})()
