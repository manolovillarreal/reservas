<template>
  <div :class="['doc-host', previewMode ? 'doc-host-preview' : 'doc-host-full']">
    <div :class="['doc-sheet-wrapper', previewMode ? 'is-preview' : '']">
      <article class="doc-sheet" :style="cssVariables">
        <header class="doc-header doc-block">
          <template v-if="normalizedSettings.header_layout === 1">
            <div class="doc-header-row doc-header-layout-1">
              <div v-if="showLogo" class="doc-logo-wrap" :style="logoStyle">
                <img v-if="profile.logo_url" :src="profile.logo_url" alt="Logo" class="doc-logo">
                <div v-else class="doc-logo-empty">Sin logo</div>
              </div>
              <div class="doc-header-content">
                <p v-if="headerValue('nombre_comercial')" class="doc-brand">{{ headerValue('nombre_comercial') }}</p>
                <p v-if="headerValue('nit')">{{ headerValue('nit') }}</p>
                <p v-if="headerContactLine">{{ headerContactLine }}</p>
                <p v-if="headerValue('ciudad')">{{ headerValue('ciudad') }}</p>
                <p v-if="headerValue('direccion')">{{ headerValue('direccion') }}</p>
                <p v-if="headerValue('website')">{{ headerValue('website') }}</p>
                <p v-if="headerValue('slogan')" class="doc-slogan">{{ headerValue('slogan') }}</p>
                <p v-if="resolvedHeaderExtraText" class="doc-extra-text" v-html="resolvedHeaderExtraText"></p>
              </div>
            </div>
          </template>

          <template v-else-if="normalizedSettings.header_layout === 2">
            <div class="doc-header-layout-2">
              <div v-if="showLogo" class="doc-logo-wrap" :style="logoStyle">
                <img v-if="profile.logo_url" :src="profile.logo_url" alt="Logo" class="doc-logo">
                <div v-else class="doc-logo-empty">Sin logo</div>
              </div>
              <p v-if="headerValue('nombre_comercial')" class="doc-brand">{{ headerValue('nombre_comercial') }}</p>
              <p>{{ compactHeaderLine }}</p>
              <p v-if="resolvedHeaderExtraText" class="doc-extra-text" v-html="resolvedHeaderExtraText"></p>
            </div>
          </template>

          <template v-else>
            <div class="doc-header-layout-3">
              <p v-if="headerValue('nombre_comercial')" class="doc-brand">{{ headerValue('nombre_comercial') }}</p>
              <p>{{ compactHeaderLine }}</p>
              <p v-if="headerValue('direccion')">{{ headerValue('direccion') }}</p>
              <p v-if="headerValue('website')">{{ headerValue('website') }}</p>
              <p v-if="headerValue('slogan')" class="doc-slogan">{{ headerValue('slogan') }}</p>
              <p v-if="resolvedHeaderExtraText" class="doc-extra-text" v-html="resolvedHeaderExtraText"></p>
            </div>
          </template>
        </header>

        <section class="doc-main doc-block">
          <slot />
        </section>

        <section v-if="shouldShowConditions" class="doc-section doc-block">
          <h2 class="doc-section-title">Condiciones</h2>
          <p class="doc-paragraph">{{ conditionsText }}</p>
        </section>

        <section v-if="hasCustomField" class="doc-section doc-block">
          <h2 class="doc-section-title">{{ customFieldLabel }}</h2>
          <p class="doc-paragraph" v-html="resolvedCustomFieldContent"></p>
        </section>

        <footer class="doc-footer doc-block">
          <template v-if="normalizedSettings.footer_layout === 1">
            <div class="doc-footer-centered">
              <p class="doc-footer-title">Gracias por preferirnos</p>
              <p>{{ footerSimpleLine }}</p>
            </div>
          </template>

          <template v-else-if="normalizedSettings.footer_layout === 2">
            <div class="doc-footer-grid">
              <div>
                <p class="doc-footer-column-title">Contacto</p>
                <p v-if="footerValue('telefono')">{{ footerValue('telefono') }}</p>
                <p v-if="footerValue('email')">{{ footerValue('email') }}</p>
                <p v-if="footerValue('website')">{{ footerValue('website') }}</p>
              </div>
              <div>
                <p class="doc-footer-column-title">Direccion</p>
                <p v-if="footerValue('ciudad')">{{ footerValue('ciudad') }}</p>
                <p v-if="footerValue('direccion')">{{ footerValue('direccion') }}</p>
              </div>
            </div>
          </template>

          <template v-else>
            <p class="doc-paragraph" v-html="resolvedFooterFreeText"></p>
          </template>
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
  getLogoHeightPx,
  normalizeDocumentSettings,
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

const themeColors = computed(() => getDocumentThemeColors(normalizedSettings.value))
const themeTokens = computed(() => deriveThemeTokens(
  themeColors.value.primary,
  themeColors.value.accent,
  themeColors.value.background,
))

const cssVariables = computed(() => ({
  '--doc-primary': themeTokens.value.primary,
  '--doc-accent': themeTokens.value.accent,
  '--doc-background': themeTokens.value.background,
  '--doc-primary-light': themeTokens.value.primaryLight,
  '--doc-text-secondary': themeTokens.value.textSecondary,
  '--doc-border': themeTokens.value.borderColor,
  '--doc-section-bg': themeTokens.value.sectionBg,
  '--doc-hover-primary': themeTokens.value.hoverPrimary,
}))

const profileData = computed(() => ({
  ...props.profile,
  nit_display: props.profile?.nit_display || props.profile?.nit || '',
}))

const logoHeight = computed(() => getLogoHeightPx(normalizedSettings.value.header_logo_size))
const showLogo = computed(() => normalizedSettings.value.header_show_logo)

const logoStyle = computed(() => ({
  height: `${logoHeight.value}px`,
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

const compactHeaderLine = computed(() => {
  const parts = [
    headerValue('nit'),
    headerValue('telefono'),
    headerValue('email'),
    headerValue('ciudad')
  ].filter(Boolean)

  return parts.join(' · ')
})

const headerContactLine = computed(() => {
  const parts = [headerValue('telefono'), headerValue('email')].filter(Boolean)
  return parts.join(' · ')
})

const footerSimpleLine = computed(() => {
  const parts = [footerValue('telefono'), footerValue('email'), footerValue('website')].filter(Boolean)
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
.doc-host {
  width: 100%;
}

.doc-host-full {
  background: #f3f4f6;
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
}

.doc-sheet-wrapper.is-preview {
  justify-content: flex-start;
  transform: scale(0.72);
  transform-origin: top left;
  width: 138%;
}

.doc-sheet {
  width: 794px;
  min-height: 1123px;
  background: var(--doc-background);
  color: #111827;
  border: 1px solid var(--doc-border);
  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.09);
  padding: 28px;
}

.doc-block {
  break-inside: avoid;
  page-break-inside: avoid;
}

.doc-header {
  border-bottom: 1px solid var(--doc-border);
  padding-bottom: 16px;
}

.doc-header-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
}

.doc-header-layout-2,
.doc-header-layout-3 {
  text-align: center;
}

.doc-header-layout-3 {
  text-align: left;
}

.doc-logo-wrap {
  width: 120px;
  border: 1px solid var(--doc-border);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
}

.doc-logo {
  height: 100%;
  width: 100%;
  object-fit: contain;
}

.doc-logo-empty {
  font-size: 11px;
  color: var(--doc-text-secondary);
}

.doc-header-content p,
.doc-header-layout-2 p,
.doc-header-layout-3 p {
  margin: 0;
  line-height: 1.4;
}

.doc-brand {
  font-size: 24px;
  font-weight: 700;
  color: var(--doc-primary);
}

.doc-slogan {
  color: var(--doc-text-secondary);
  font-style: italic;
}

.doc-extra-text {
  margin-top: 8px;
  white-space: pre-line;
  color: #1f2937;
}

.doc-main {
  margin-top: 18px;
}

.doc-section {
  margin-top: 16px;
  border: 1px solid var(--doc-border);
  border-radius: 12px;
  background: var(--doc-section-bg);
  padding: 14px;
}

.doc-section-title {
  margin: 0 0 8px;
  color: var(--doc-accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  font-weight: 700;
}

.doc-paragraph {
  margin: 0;
  white-space: pre-line;
  line-height: 1.55;
}

.doc-footer {
  margin-top: 16px;
  border-top: 1px solid var(--doc-border);
  padding-top: 14px;
  color: #1f2937;
}

.doc-footer-centered {
  text-align: center;
}

.doc-footer-title,
.doc-footer-column-title {
  margin: 0 0 4px;
  font-weight: 700;
  color: var(--doc-primary);
}

.doc-footer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@page {
  size: A4;
  margin: 15mm;
}

@media print {
  .doc-host,
  .doc-host-full,
  .doc-host-preview,
  .doc-sheet-wrapper,
  .doc-sheet-wrapper.is-preview {
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    width: 100% !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .doc-sheet {
    width: 100% !important;
    min-height: auto;
    border: none !important;
    box-shadow: none !important;
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0 !important;
  }

  .doc-sheet,
  .doc-sheet * {
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .doc-brand,
  .doc-section-title,
  .doc-footer-title,
  .doc-footer-column-title {
    color: var(--doc-accent) !important;
  }

  .doc-section {
    background: #ffffff !important;
  }
}
</style>
