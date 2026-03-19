<template>
  <div v-if="can('settings', 'edit')" class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Documentos</h1>
        <p class="text-sm text-gray-500">Personaliza vouchers y cotizaciones con vista previa en tiempo real.</p>
      </div>
      <RouterLink to="/configuracion" class="btn-secondary text-sm">Volver a configuracion</RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div class="space-y-6 xl:col-span-5">
        <div class="card space-y-6">
          <section class="space-y-3">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Tema de color</h2>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                v-for="option in themeOptions"
                :key="option.key"
                type="button"
                class="rounded-lg border p-3 text-left transition"
                :class="form.color_theme === option.key ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-primary/30'"
                @click="selectTheme(option.key)"
              >
                <p class="text-sm font-semibold text-gray-900">{{ option.label }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <span class="h-4 w-4 rounded-full border border-gray-200" :style="{ backgroundColor: option.primary || form.color_primary }"></span>
                  <span class="h-4 w-4 rounded-full border border-gray-200" :style="{ backgroundColor: option.accent || form.color_accent }"></span>
                  <span class="h-4 w-4 rounded-full border border-gray-200" :style="{ backgroundColor: option.background || form.color_background }"></span>
                </div>
              </button>
            </div>

            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label class="text-xs font-medium text-gray-600">
                Color primario
                <input v-model="form.color_primary" type="color" class="mt-1 h-10 w-full rounded-md border border-gray-300" :disabled="!isCustomTheme">
              </label>
              <label class="text-xs font-medium text-gray-600">
                Color acento
                <input v-model="form.color_accent" type="color" class="mt-1 h-10 w-full rounded-md border border-gray-300" :disabled="!isCustomTheme">
              </label>
              <label class="text-xs font-medium text-gray-600">
                Color fondo
                <input v-model="form.color_background" type="color" class="mt-1 h-10 w-full rounded-md border border-gray-300" :disabled="!isCustomTheme">
              </label>
            </div>
            <p class="text-xs text-gray-500">Los colores solo son editables cuando el tema es Personalizada.</p>
          </section>

          <section class="space-y-3 border-t border-gray-200 pt-4">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Header</h2>
            <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
              <button
                v-for="layout in headerLayouts"
                :key="layout.value"
                type="button"
                class="rounded-lg border p-2 text-xs"
                :class="form.header_layout === layout.value ? 'border-primary bg-primary/10 text-primary-dark' : 'border-gray-200 text-gray-700'"
                @click="form.header_layout = layout.value"
              >
                {{ layout.label }}
              </button>
            </div>

            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input v-model="form.header_show_logo" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30">
              Mostrar logo
            </label>

            <label v-if="form.header_show_logo" class="text-sm text-gray-700">
              Tamano de logo
              <select v-model="form.header_logo_size" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
                <option value="small">small</option>
                <option value="medium">medium</option>
                <option value="large">large</option>
              </select>
            </label>

            <div class="grid grid-cols-2 gap-2">
              <label v-for="field in profileFields" :key="`header-${field.key}`" class="inline-flex items-center gap-2 text-xs text-gray-700">
                <input v-model="form.header_fields[field.key]" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30">
                {{ field.label }}
              </label>
            </div>

            <div>
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Variables disponibles</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="token in variableTokens"
                  :key="`header-token-${token}`"
                  type="button"
                  class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-primary/30"
                  @click="insertToken('header', token)"
                >
                  Insertar {{ token }}
                </button>
              </div>
            </div>

            <label class="text-sm text-gray-700">
              Texto adicional
              <textarea v-model="form.header_extra_text" rows="3" class="mt-1 block w-full rounded-md border-gray-300 text-sm"></textarea>
            </label>
          </section>

          <section class="space-y-3 border-t border-gray-200 pt-4">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Footer</h2>
            <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
              <button
                v-for="layout in footerLayouts"
                :key="layout.value"
                type="button"
                class="rounded-lg border p-2 text-xs"
                :class="form.footer_layout === layout.value ? 'border-primary bg-primary/10 text-primary-dark' : 'border-gray-200 text-gray-700'"
                @click="form.footer_layout = layout.value"
              >
                {{ layout.label }}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <label v-for="field in profileFields" :key="`footer-${field.key}`" class="inline-flex items-center gap-2 text-xs text-gray-700">
                <input v-model="form.footer_fields[field.key]" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30">
                {{ field.label }}
              </label>
            </div>

            <div>
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Variables disponibles</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="token in variableTokens"
                  :key="`footer-token-${token}`"
                  type="button"
                  class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-primary/30"
                  @click="insertToken('footer', token)"
                >
                  Insertar {{ token }}
                </button>
              </div>
            </div>

            <label v-if="form.footer_layout === 3" class="text-sm text-gray-700">
              Texto libre del footer
              <textarea v-model="form.footer_free_text" rows="4" class="mt-1 block w-full rounded-md border-gray-300 text-sm"></textarea>
            </label>
          </section>

          <section class="space-y-3 border-t border-gray-200 pt-4">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Secciones opcionales</h2>
            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input v-model="form.show_conditions" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30">
              Incluir condiciones del alojamiento
            </label>
            <RouterLink to="/configuracion" class="text-sm font-medium text-primary hover:text-primary-dark">Editar condiciones</RouterLink>

            <label class="text-sm text-gray-700">
              Etiqueta campo personalizado
              <input v-model="form.custom_field_label" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm" placeholder="Informacion adicional">
            </label>

            <label class="text-sm text-gray-700">
              Contenido campo personalizado
              <textarea v-model="form.custom_field_content" rows="4" class="mt-1 block w-full rounded-md border-gray-300 text-sm"></textarea>
            </label>
          </section>

          <div class="flex justify-end border-t border-gray-200 pt-4">
            <button class="btn-primary" :disabled="saving || loading" @click="saveSettings">
              {{ saving ? 'Guardando...' : 'Guardar configuracion' }}
            </button>
          </div>
        </div>
      </div>

      <div class="xl:col-span-7">
        <div class="card h-full space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Preview en tiempo real</h2>
            <span class="text-xs text-gray-500">Vista tipo voucher</span>
          </div>

          <DocumentTemplate
            :settings="previewSettings"
            :profile="profile"
            type="voucher"
            :previewMode="true"
          >
            <section class="doc-content-section border-b pb-4">
              <h1 class="doc-content-title text-2xl font-semibold">Comprobante de Reserva</h1>
              <p class="mt-2 text-base font-semibold text-gray-900">Codigo de reserva: REF-AB12CD</p>
              <div class="mt-3 grid grid-cols-1 gap-1 text-sm text-gray-700 md:grid-cols-3 md:gap-3">
                <p><span class="font-semibold">Reserva:</span> RSV-202603-0012</p>
                <p><span class="font-semibold">Codigo:</span> AB12CD</p>
                <p><span class="font-semibold">Emitido:</span> {{ issuedAtPreview }}</p>
              </div>
            </section>

            <section class="doc-content-section border-b py-4">
              <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Datos de la reserva</h2>
              <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
                <p><span class="font-semibold">Unidad:</span> Suite 301</p>
                <p><span class="font-semibold">Origen:</span> Directo</p>
                <p><span class="font-semibold">Check-in:</span> 22/03/2026</p>
                <p><span class="font-semibold">Check-out:</span> 25/03/2026</p>
                <p><span class="font-semibold">Noches:</span> 3</p>
                <p><span class="font-semibold">Adultos:</span> 2 · <span class="font-semibold">Ninos:</span> 1</p>
              </div>
            </section>

            <section class="doc-content-section py-4">
              <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Resumen financiero</h2>
              <div class="mt-3 space-y-1 text-sm text-gray-700">
                <p class="flex justify-between gap-3"><span>Precio por noche:</span> <span class="font-medium">$320.000</span></p>
                <p class="flex justify-between gap-3"><span>Total reserva:</span> <span class="font-medium">$960.000</span></p>
              </div>
            </section>
          </DocumentTemplate>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="card border-amber-200 bg-amber-50/40">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
    <p class="mt-2 text-sm text-amber-800">No tienes permisos para editar configuracion de documentos.</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DocumentTemplate from '../components/documents/DocumentTemplate.vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { getDocumentSettings, saveDocumentSettings } from '../services/documentSettingsService'
import {
  DOCUMENT_THEMES,
  DOCUMENT_VARIABLES,
  DEFAULT_DOCUMENT_SETTINGS,
  normalizeDocumentSettings,
} from '../utils/documentThemes'

const accountStore = useAccountStore()
const { can } = usePermissions()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const profile = ref({})
const voucherConditions = ref('')

const form = ref(normalizeDocumentSettings(DEFAULT_DOCUMENT_SETTINGS))

const themeOptions = computed(() => Object.entries(DOCUMENT_THEMES).map(([key, value]) => ({
  key,
  label: value.label,
  primary: value.primary,
  accent: value.accent,
  background: value.background,
})))

const isCustomTheme = computed(() => form.value.color_theme === 'custom')
const variableTokens = computed(() => Object.keys(DOCUMENT_VARIABLES))

const profileFields = [
  { key: 'nombre_comercial', label: 'Nombre comercial' },
  { key: 'nit', label: 'NIT' },
  { key: 'razon_social', label: 'Razon social' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'email', label: 'Email' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'direccion', label: 'Direccion' },
  { key: 'website', label: 'Website' },
  { key: 'slogan', label: 'Slogan' },
]

const headerLayouts = [
  { value: 1, label: 'Layout 1: logo izquierda' },
  { value: 2, label: 'Layout 2: centrado' },
  { value: 3, label: 'Layout 3: sin logo' },
]

const footerLayouts = [
  { value: 1, label: 'Layout 1: centrado' },
  { value: 2, label: 'Layout 2: dos columnas' },
  { value: 3, label: 'Layout 3: texto libre' },
]

const previewSettings = computed(() => ({
  ...form.value,
  conditions_text: voucherConditions.value,
}))

const issuedAtPreview = computed(() => new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date()))

const applyThemePalette = (themeKey) => {
  const selectedTheme = DOCUMENT_THEMES[themeKey]
  if (!selectedTheme || themeKey === 'custom') return

  form.value.color_primary = selectedTheme.primary
  form.value.color_accent = selectedTheme.accent
  form.value.color_background = selectedTheme.background
}

const selectTheme = (themeKey) => {
  if (themeKey === form.value.color_theme) return

  if (themeKey === 'custom' && form.value.color_theme !== 'custom') {
    const previousTheme = DOCUMENT_THEMES[form.value.color_theme]
    if (previousTheme) {
      form.value.color_primary = previousTheme.primary
      form.value.color_accent = previousTheme.accent
      form.value.color_background = previousTheme.background
    }
  }

  form.value.color_theme = themeKey
  applyThemePalette(themeKey)
}

const insertToken = (scope, token) => {
  if (scope === 'header') {
    form.value.header_extra_text = `${form.value.header_extra_text || ''}${token}`
    return
  }

  if (form.value.footer_layout === 3) {
    form.value.footer_free_text = `${form.value.footer_free_text || ''}${token}`
  }
}

const loadData = async () => {
  if (!can('settings', 'edit')) return

  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    const [{ data: profileData }, { data: settingsData }, settings] = await Promise.all([
      supabase
        .from('account_profile')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('settings')
        .select('voucher_conditions')
        .eq('account_id', accountId)
        .maybeSingle(),
      getDocumentSettings(accountId),
    ])

    profile.value = profileData || {}
    voucherConditions.value = String(settingsData?.voucher_conditions || '').trim()
    form.value = normalizeDocumentSettings(settings)
    applyThemePalette(form.value.color_theme)
  } catch (error) {
    toast.error(error.message || 'No se pudo cargar la configuracion de documentos.')
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  if (!can('settings', 'edit')) return

  saving.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const saved = await saveDocumentSettings(accountId, form.value)
    form.value = normalizeDocumentSettings(saved)
    toast.success('Configuracion de documentos guardada.')
  } catch (error) {
    toast.error(error.message || 'No se pudo guardar la configuracion de documentos.')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.doc-content-title,
.doc-content-subtitle {
  color: var(--doc-accent);
}

.doc-content-section {
  break-inside: avoid;
  page-break-inside: avoid;
}
</style>
