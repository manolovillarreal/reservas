<template>
  <div :class="['doc-host', previewMode ? 'doc-host-preview' : 'doc-host-full']">
    <div :class="['doc-sheet-wrapper', previewMode ? 'is-preview' : '']">
      <article class="doc-sheet" :style="[cssVariables, fontFamilyStyle]">
        <!-- HEADER -->
        <header class="doc-header" :class="['header-' + preset.header.style, 'header-size-' + preset.header.size]" :style="headerContainerStyle">
          <!-- Logo-Left Layout -->
          <div v-if="preset.header.layout === 'logo-left'" class="header-layout-logo-left">
            <div v-if="showLogo" class="header-logo-wrap" :style="logoWrapStyle">
              <img v-if="profile.logo_url" :src="profile.logo_url" alt="Logo" class="header-logo">
              <div v-else class="header-logo-empty">Sin logo</div>
            </div>
            <div class="header-content" :style="headerContentStyle">
              <p v-if="headerValue('nombre_comercial')" class="header-commercial-name">{{ headerValue('nombre_comercial') }}</p>
              <p v-if="headerValue('nit')" class="header-nit">{{ headerValue('nit') }}</p>
              <p v-if="headerContactLine" class="header-contact">{{ headerContactLine }}</p>
              <p v-if="headerValue('ciudad')" class="header-city">{{ headerValue('ciudad') }}</p>
              <p v-if="headerValue('direccion')" class="header-address">{{ headerValue('direccion') }}</p>
              <p v-if="headerValue('website')" class="header-website">{{ headerValue('website') }}</p>
              <p v-if="headerValue('slogan')" class="header-slogan">{{ headerValue('slogan') }}</p>
              <p v-if="resolvedHeaderExtraText" class="header-extra-text" v-html="resolvedHeaderExtraText"></p>
            </div>
          </div>

          <!-- Centered Layout -->
          <div v-else-if="preset.header.layout === 'centered'" class="header-layout-centered" :style="headerCenteredStyle">
            <div v-if="showLogo" class="header-logo-wrap-centered" :style="logoWrapStyle">
              <img v-if="profile.logo_url" :src="profile.logo_url" alt="Logo" class="header-logo">
              <div v-else class="header-logo-empty">Sin logo</div>
            </div>
            <p v-if="headerValue('nombre_comercial')" class="header-commercial-name">{{ headerValue('nombre_comercial') }}</p>
            <p class="header-contact-line">{{ headerCompactLine }}</p>
            <p v-if="headerValue('direccion')" class="header-address">{{ headerValue('direccion') }}</p>
            <p v-if="headerValue('website')" class="header-website">{{ headerValue('website') }}</p>
            <p v-if="headerValue('slogan')" class="header-slogan">{{ headerValue('slogan') }}</p>
            <p v-if="resolvedHeaderExtraText" class="header-extra-text" v-html="resolvedHeaderExtraText"></p>
          </div>
        </header>

        <!-- MAIN CONTENT -->
        <section class="doc-main">
          <slot />
        </section>

        <!-- CONDITIONS -->
        <section v-if="shouldShowConditions" class="doc-section doc-section-conditions" :class="'section-' + preset.body.sectionStyle">
          <h2 class="section-title">Condiciones de hospedaje</h2>
          <p class="section-text section-text-padded">{{ conditionsText }}</p>
        </section>

        <!-- CUSTOM FIELD -->
        <section v-if="hasCustomField" class="doc-section" :class="'section-' + preset.body.sectionStyle">
          <h2 class="section-title">{{ customFieldLabel }}</h2>
          <p class="section-text" v-html="resolvedCustomFieldContent"></p>
        </section>

        <!-- FOOTER -->
        <footer class="doc-footer" :class="['footer-' + preset.footer.style]">
          <div class="footer-content">
            <p v-if="footerContactLine" class="footer-text">{{ footerContactLine }}</p>
            <p v-if="footerValue('website')" class="footer-text">{{ footerValue('website') }}</p>
            <p v-if="resolvedFooterFreeText" class="footer-text" v-html="resolvedFooterFreeText"></p>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  DEFAULT_DOCUMENT_SETTINGS,
  deriveThemeTokens,
  getDocumentThemeColors,
  getPresetConfig,
  normalizeDocumentSettings,
  resolvePresetColors,
  resolveVariables,
} from '../../utils/documentThemes'

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({})
  },
  profile: {
    type: Object,
    default: () => ({})
  },
  type: {
    type: String,
    default: 'voucher'
  },
  previewMode: {
    type: Boolean,
    default: false
  }
})

const normalizedSettings = computed(() => normalizeDocumentSettings({
  ...DEFAULT_DOCUMENT_SETTINGS,
  ...props.settings,
}))

const preset = computed(() => getPresetConfig(normalizedSettings.value.preset))
const themeColors = computed(() => getDocumentThemeColors(normalizedSettings.value))
const themeTokens = computed(() => deriveThemeTokens(
  themeColors.value.primary,
  themeColors.value.accent,
  themeColors.value.background,
))
const presetColors = computed(() => resolvePresetColors(normalizedSettings.value.preset, themeTokens.value))

const fontFamilyStyle = computed(() => ({
  fontFamily: preset.value.body?.fontFamily || 'Inter, sans-serif'
}))

const cssVariables = computed(() => ({
  '--doc-primary': themeTokens.value.primary,
  '--doc-accent': themeTokens.value.accent,
  '--doc-background': themeTokens.value.background,
  '--doc-primary-dark': themeTokens.value.primaryDark,
  '--doc-header-bg': presetColors.value.headerBg,
  '--doc-header-text': presetColors.value.headerText,
  '--doc-footer-bg': presetColors.value.footerBg,
  '--doc-footer-text': presetColors.value.footerText,
  '--doc-body-text': '#111827',
  '--doc-label-text': '#6B7280',
}))

const profileData = computed(() => ({
  ...props.profile,
  nit_display: props.profile?.nit_display || props.profile?.nit || '',
}))

const showLogo = computed(() => normalizedSettings.value.header_show_logo)
const logoShape = computed(() => normalizedSettings.value.header_logo_shape || 'square')
const logoSizePx = computed(() => Number(normalizedSettings.value.header_logo_size_px) || 60)
const logoWidthPx = computed(() => (logoShape.value === 'rectangular' ? Math.round(logoSizePx.value * 1.6) : logoSizePx.value))
const logoBackground = computed(() => normalizedSettings.value.header_logo_bg_color || 'transparent')
const logoBorderRadius = computed(() => {
  if (logoShape.value === 'round') return '9999px'
  if (logoShape.value === 'rectangular') return '8px'
  return '4px'
})
const logoWrapStyle = computed(() => ({
  width: `${logoWidthPx.value}px`,
  height: `${logoSizePx.value}px`,
  background: logoBackground.value,
  borderRadius: logoBorderRadius.value,
}))

const headerTextAlignX = computed(() => normalizedSettings.value.header_text_align_x || 'left')
const headerTextAlignY = computed(() => normalizedSettings.value.header_text_align_y || 'top')

const resolveHorizontalAlign = (value) => {
  if (value === 'center') return 'center'
  if (value === 'right') return 'right'
  return 'left'
}

const resolveVerticalAlign = (value) => {
  if (value === 'middle') return 'center'
  if (value === 'bottom') return 'flex-end'
  return 'flex-start'
}

const resolveHorizontalItems = (value) => {
  if (value === 'center') return 'center'
  if (value === 'right') return 'flex-end'
  return 'flex-start'
}

const headerContainerStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: resolveVerticalAlign(headerTextAlignY.value),
}))

const headerContentStyle = computed(() => ({
  textAlign: resolveHorizontalAlign(headerTextAlignX.value),
  alignItems: resolveHorizontalItems(headerTextAlignX.value),
  justifyContent: resolveVerticalAlign(headerTextAlignY.value),
}))

const headerCenteredStyle = computed(() => ({
  width: '100%',
  textAlign: resolveHorizontalAlign(headerTextAlignX.value),
  alignItems: resolveHorizontalItems(headerTextAlignX.value),
  justifyContent: resolveVerticalAlign(headerTextAlignY.value),
}))

const availableValues = computed(() => ({
  nombre_comercial: profileData.value.commercial_name || profileData.value.legal_name || '',
  razon_social: profileData.value.legal_name || '',
  nit: profileData.value.nit_display || '',
  telefono: profileData.value.phone || '',
  email: profileData.value.email || '',
  ciudad: profileData.value.city || '',
  direccion: profileData.value.address || '',
  website: profileData.value.website || '',
  slogan: profileData.value.slogan || '',
}))

const isFieldEnabled = (fieldKey, scope) => {
  const config = scope === 'footer'
    ? normalizedSettings.value.footer_fields || {}
    : normalizedSettings.value.header_fields || {}
  return Boolean(config[fieldKey])
}

const headerValue = (fieldKey) => (isFieldEnabled(fieldKey, 'header') ? availableValues.value[fieldKey] : '')
const footerValue = (fieldKey) => (isFieldEnabled(fieldKey, 'footer') ? availableValues.value[fieldKey] : '')

const headerContactLine = computed(() => {
  const parts = [headerValue('telefono'), headerValue('email')].filter(Boolean)
  return parts.join(' · ')
})

const headerCompactLine = computed(() => {
  const parts = [
    headerValue('nit'),
    headerValue('telefono'),
    headerValue('email'),
  ].filter(Boolean)
  return parts.join(' · ')
})

const footerContactLine = computed(() => {
  const parts = [
    footerValue('telefono'),
    footerValue('email'),
    footerValue('ciudad'),
  ].filter(Boolean)
  return parts.join(' · ')
})

const conditionsText = computed(() => String(
  props.settings?.conditions_text || props.settings?.voucher_conditions || ''
).trim())

const shouldShowConditions = computed(() => normalizedSettings.value.show_conditions && !!conditionsText.value)

const customFieldLabel = computed(() => String(normalizedSettings.value.custom_field_label || 'Informacion adicional').trim() || 'Informacion adicional')
const hasCustomField = computed(() => !!String(normalizedSettings.value.custom_field_content || '').trim())

const resolvedHeaderExtraText = computed(() => resolveVariables(normalizedSettings.value.header_extra_text || '', profileData.value))
const resolvedFooterFreeText = computed(() => resolveVariables(normalizedSettings.value.footer_free_text || '', profileData.value))
const resolvedCustomFieldContent = computed(() => resolveVariables(normalizedSettings.value.custom_field_content || '', profileData.value))
</script>

<style scoped>
/* ==================== LAYOUT & HOST ==================== */

.doc-host {
  width: 100%;
}

.doc-host-full {
  background: #f3f4f6;
  padding: 20px;
}

.doc-host-preview {
  overflow: auto;
  background: linear-gradient(155deg, #eef2ff 0%, #f8fafc 55%, #ecfeff 100%);
  border-radius: 16px;
  border: 1px solid #dbeafe;
  padding: 12px;
}

.doc-sheet-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

.doc-sheet {
  width: 8.5in;
  min-height: 11in;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.09);
  padding: 0;
  font-size: 11px;
  line-height: 1.5;
}

/* ==================== HEADER ==================== */

.doc-header {
  flex-shrink: 0;
  color: var(--doc-header-text);
  background-color: var(--doc-header-bg);
  padding: v-bind('preset.header.padding');
  border-radius: v-bind('preset.header.borderRadius');
}

/* Header Size Variants */
.header-size-sm {
  min-height: 64px;
}

.header-size-md {
  min-height: 88px;
}

.header-size-lg {
  min-height: 112px;
}

/* Header Style: Filled */
.header-filled {
  background-color: var(--doc-header-bg);
  color: #FFFFFF;
  border: none;
  border-radius: v-bind('preset.header.borderRadius');
}

/* Header Style: Filled Dark */
.header-filled-dark {
  background-color: var(--doc-primary-dark);
  color: #FFFFFF;
  border: none;
  border-radius: v-bind('preset.header.borderRadius');
}

/* Header Style: Filled Light */
.header-filled-light {
  background-color: rgba(var(--doc-primary), 0.12);
  color: var(--doc-primary);
  border: none;
  border-radius: v-bind('preset.header.borderRadius');
}

/* Header Style: Bordered */
.header-bordered {
  background-color: #FFFFFF;
  color: var(--doc-primary);
  border: none;
  border-bottom: 3px solid var(--doc-primary);
  border-radius: 0;
}

/* Header Style: Line Top */
.header-line-top {
  background-color: #FFFFFF;
  color: var(--doc-primary);
  border: none;
  border-top: 4px solid var(--doc-accent);
  border-radius: 0;
}

/* Header Layouts */
.header-layout-logo-left {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: stretch;
}

.header-layout-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
}

.header-logo-wrap,
.header-logo-wrap-centered {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.header-logo-wrap-centered {
  margin: 0 auto 4px;
}

.header-logo {
  height: 100%;
  width: 100%;
  object-fit: contain;

}

.header-logo-empty {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.3);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.header-content p,
.header-layout-centered p {
  margin: 0;
  line-height: 1.3;
}

.header-commercial-name {
  font-size: 18px;
  font-weight: 700;
  color: inherit;
}

.header-contact,
.header-contact-line,
.header-nit {
  font-size: 10px;
  color: inherit;
  opacity: 0.9;
}

.header-address,
.header-city,
.header-website {
  font-size: 9px;
  color: inherit;
  opacity: 0.85;
}

.header-slogan {
  font-size: 9px;
  color: inherit;
  opacity: 0.75;
  font-style: italic;
}

.header-extra-text {
  margin-top: 4px;
  font-size: 9px;
  color: inherit;
  white-space: pre-wrap;
}

/* ==================== MAIN CONTENT ==================== */

.doc-main {
  flex: 1;
  padding: 16px v-bind('preset.body.padding || "20px 32px"');
  color: var(--doc-body-text);
  overflow-y: auto;
}

/* ==================== SECTIONS & CONTENT ==================== */

.doc-section {
  margin: 12px 0;
  padding: 12px;
  background: #FFFFFF;
  border-radius: v-bind('preset.body.borderRadius');
}

/* Section Style: Line */
.section-line {
  background: transparent;
  border: none;
  padding: 12px 0;
  border-top: 1px solid #E5E7EB;
}

.section-line .section-title {
  border-bottom: 1px solid #D1D5DB;
  padding-bottom: 6px;
}

/* Section Style: Box */
.section-box {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  padding: 12px;
  border-radius: 4px;
}

.section-box .section-title {
  background: rgba(var(--doc-primary), 0.06);
  padding: 6px 8px;
  margin: -12px -12px 8px -12px;
  border-radius: 3px 3px 0 0;
}

/* Section Style: Space */
.section-space {
  background: transparent;
  border: none;
  padding: 24px 0;
}

/* Section Style: Accent Line */
.section-accent-line {
  background: transparent;
  border: none;
  border-left: 3px solid var(--doc-accent);
  padding-left: 12px;
  padding: 12px 0 12px 12px;
}

/* Section Style: Rounded Box */
.section-rounded-box {
  background: rgba(var(--doc-primary), 0.08);
  border: 1px solid rgba(var(--doc-primary), 0.15);
  padding: 12px;
  border-radius: v-bind('preset.body.borderRadius');
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--doc-primary);
}

.section-text {
  margin: 0;
  font-size: 10px;
  color: var(--doc-body-text);
  white-space: pre-wrap;
  line-height: 1.4;
}

.section-text-padded {
  padding-inline: 10px;
}

.doc-section-conditions.section-line,
.doc-section-conditions.section-space {
  padding-left: 12px;
  padding-right: 12px;
}

/* ==================== FOOTER ==================== */

.doc-footer {
  flex-shrink: 0;
  color: var(--doc-footer-text);
  background-color: var(--doc-footer-bg);
  padding: v-bind('preset.footer.padding');
  border-radius: v-bind('preset.footer.borderRadius');
  border-top: 1px solid #E5E7EB;
}

.footer-filled {
  background-color: var(--doc-primary);
  color: #FFFFFF;
  border: none;
  border-radius: 0;
}

.footer-filled-dark {
  background-color: var(--doc-primary-dark);
  color: #FFFFFF;
  border: none;
  border-radius: 0;
}

.footer-filled-light {
  background-color: rgba(var(--doc-primary), 0.12);
  color: var(--doc-primary);
  border: none;
  border-radius: 0;
}

.footer-bordered {
  background-color: #FFFFFF;
  color: #1F2937;
  border-top: 3px solid var(--doc-primary);
  border-radius: 0;
}

.footer-line-top {
  background-color: #FFFFFF;
  color: #1F2937;
  border-top: 2px solid var(--doc-accent);
  border-radius: 0;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}

.footer-text {
  margin: 0;
  font-size: 9px;
  color: inherit;
  line-height: 1.3;
}

/* ==================== DATA STYLES (TABLES/LISTS) ==================== */

/* Data Style: List - label and value pairs */
.data-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 8px;
  font-size: 10px;
}

.data-list-label {
  font-weight: 600;
  color: var(--doc-label-text);
  text-align: right;
}

.data-list-value {
  color: var(--doc-body-text);
}

/* Data Style: Table - bordered */
table.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 8px 0;
}

table.data-table-bordered th,
table.data-table-bordered td {
  border: 1px solid #D1D5DB;
  padding: 6px 8px;
  text-align: left;
}

table.data-table-bordered th {
  background: #F3F4F6;
  font-weight: 700;
  color: var(--doc-body-text);
}

/* Data Style: Clean - no external borders */
table.data-table-clean {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 8px 0;
}

table.data-table-clean th,
table.data-table-clean td {
  border: none;
  border-bottom: 1px solid #E5E7EB;
  padding: 6px 0;
  text-align: left;
}

table.data-table-clean th {
  font-weight: 700;
  color: var(--doc-body-text);
  border-bottom: 2px solid #D1D5DB;
}

/* Data Style: Minimal - only horizontal lines between rows */
table.data-table-minimal {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 8px 0;
}

table.data-table-minimal th,
table.data-table-minimal td {
  border: none;
  padding: 4px 0;
  text-align: left;
}

table.data-table-minimal tbody tr {
  border-bottom: 1px solid #E5E7EB;
}

table.data-table-minimal th {
  font-weight: 700;
  color: var(--doc-body-text);
  border-bottom: 2px solid #D1D5DB;
}

/* Data Style: Striped - alternating row colors */
table.data-table-striped {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 8px 0;
}

table.data-table-striped th,
table.data-table-striped td {
  border: none;
  padding: 6px 8px;
  text-align: left;
}

table.data-table-striped th {
  font-weight: 700;
  color: var(--doc-body-text);
  background: #F9FAFB;
}

table.data-table-striped tbody tr:nth-child(even) {
  background: rgba(var(--doc-primary), 0.04);
}

/* Data Style: Rounded - with border-radius */
table.data-table-rounded {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 10px;
  margin: 8px 0;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  overflow: hidden;
}

table.data-table-rounded th,
table.data-table-rounded td {
  border: none;
  border-right: 1px solid #D1D5DB;
  border-bottom: 1px solid #D1D5DB;
  padding: 6px 8px;
  text-align: left;
}

table.data-table-rounded th:last-child,
table.data-table-rounded td:last-child {
  border-right: none;
}

table.data-table-rounded tbody tr:last-child td {
  border-bottom: none;
}

table.data-table-rounded th {
  font-weight: 700;
  color: var(--doc-body-text);
  background: #F3F4F6;
}

/* ==================== PRINT STYLES ==================== */

@page {
  size: Letter;
  margin: 0;
}

@media print {
  .doc-host,
  .doc-host-full,
  .doc-host-preview,
  .doc-sheet-wrapper,
  .doc-sheet-wrapper.is-preview {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .doc-sheet {
    width: 8.5in !important;
    min-height: 11in !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    background: #FFFFFF !important;
    page-break-after: always;
  }

  .doc-sheet,
  .doc-sheet * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .doc-header {
    page-break-inside: avoid;
  }

  .doc-footer {
    page-break-inside: avoid;
  }

  .doc-main,
  .doc-section {
    page-break-inside: avoid;
  }
}
</style>
