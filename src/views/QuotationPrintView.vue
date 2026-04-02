<template>
  <div class="print-page">
    <div v-if="loading" class="p-8 text-center text-sm text-gray-500">
      Cargando cotizacion...
    </div>

    <div v-else-if="loadError" class="p-8 text-center text-sm text-red-700">
      {{ loadError }}
    </div>

    <DocumentTemplate
      v-else
      :settings="documentTemplateSettings"
      :profile="profile"
      type="quotation"
    >
      <section class="doc-content-section border-b pb-4">
        <h1 class="doc-content-title text-2xl font-semibold">Cotizacion</h1>
        <p class="mt-2 text-base font-semibold text-gray-900">Codigo de referencia: {{ formattedReferenceDisplay }}</p>
        <div class="mt-3 grid grid-cols-1 gap-1 text-sm text-gray-700 md:grid-cols-3 md:gap-3">
          <p><span class="font-semibold">Numero:</span> {{ quotationNumber }}</p>
          <p><span class="font-semibold">Fecha:</span> {{ formatDateShort(now) }}</p>
          <p v-if="inquiry?.quote_expires_at"><span class="font-semibold">Valida hasta:</span> {{ formatDateShort(inquiry.quote_expires_at) }}</p>
        </div>
      </section>

      <section class="doc-content-section border-b py-4">
        <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Datos del solicitante</h2>
        <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
          <p><span class="font-semibold">Nombre:</span> {{ inquiry?.guest_name || '-' }}</p>
          <p><span class="font-semibold">Telefono:</span> {{ inquiry?.guest_phone || '-' }}</p>
        </div>
      </section>

      <section v-if="showStaySection" class="doc-content-section border-b py-4">
        <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Detalle de la estadia</h2>
        <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
          <p v-if="unitsLabel"><span class="font-semibold">Unidades:</span> {{ unitsLabel }}</p>
          <p><span class="font-semibold">Check-in:</span> {{ formatDateShort(inquiry?.check_in) }}</p>
          <p><span class="font-semibold">Check-out:</span> {{ formatDateShort(inquiry?.check_out) }}</p>
          <p><span class="font-semibold">Noches:</span> {{ nights }}</p>
          <p><span class="font-semibold">Adultos:</span> {{ Number(inquiry?.adults || 0) }} · <span class="font-semibold">Ninos:</span> {{ Number(inquiry?.children || 0) }}</p>
        </div>
      </section>

      <section v-if="showFinancialSection" class="doc-content-section border-b py-4">
        <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Resumen financiero</h2>
        <div class="mt-3 space-y-1 text-sm text-gray-700">
          <p class="flex justify-between gap-3"><span>Precio por noche:</span> <span class="font-medium">{{ formatCop(pricePerNight) }}</span></p>
          <p class="flex justify-between gap-3"><span>Subtotal:</span> <span class="font-medium">{{ formatCop(subtotal) }}</span></p>
          <p v-if="discountPercentage > 0" class="flex justify-between gap-3"><span>Descuento ({{ discountPercentage }}%):</span> <span class="font-medium">-{{ formatCop(discountAmount) }}</span></p>
        </div>

        <div class="my-4 border-t border-dashed border-gray-300"></div>

        <div class="space-y-1 text-sm text-gray-700">
          <p class="flex justify-between gap-3 font-semibold text-gray-900"><span>Total:</span> <span>{{ formatCop(totalCustomer) }}</span></p>
        </div>
      </section>

      <section class="doc-content-section border-b py-4">
        <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Notas</h2>
        <p class="mt-3 text-sm text-gray-700">Esta cotizacion no constituye una reserva confirmada.</p>
        <p v-if="inquiry?.quote_expires_at" class="mt-2 text-sm text-gray-700">Valida hasta el {{ formatDateShort(inquiry.quote_expires_at) }}.</p>
      </section>

      <footer class="pt-4 text-sm text-gray-700">
        <p>{{ footerContactLine || '-' }}</p>
        <p class="mt-2"><span class="font-semibold">Generado el:</span> {{ formatDateTime(now) }}</p>
      </footer>
    </DocumentTemplate>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DocumentTemplate from '../components/documents/DocumentTemplate.vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { formatCop } from '../utils/voucherUtils'
import { formatReferenceDisplay } from '../utils/referenceUtils'
import { getDocumentSettings } from '../services/documentSettingsService'
import { getMessageSettings, getPredefinedMessages } from '../services/messageSettingsService'

const route = useRoute()
const accountStore = useAccountStore()

const loading = ref(true)
const loadError = ref('')
const inquiry = ref(null)
const profile = ref({})
const voucherConditions = ref('')
const accountSettings = ref({})
const now = ref(new Date())
const documentSettings = ref(null)
const systemMessageSettings = ref({})
const predefinedMessages = ref([])

const fetchData = async () => {
  loading.value = true
  loadError.value = ''

  try {
    const accountId = accountStore.getRequiredAccountId()

    const [
      { data: inquiryData, error: inquiryError },
      { data: profileData },
      { data: settingsData },
      loadedDocumentSettings,
      loadedMessageSettings,
      loadedMessages,
    ] = await Promise.all([
      supabase
        .from('inquiries')
        .select('id, account_id, inquiry_number, reference_code, quote_token, guest_name, guest_phone, check_in, check_out, adults, children, price_per_night, discount_percentage, quote_expires_at, source_detail_info:source_details!inquiries_source_detail_id_fkey(id, name, label_es), inquiry_units(unit_id, units(name, description))')
        .eq('account_id', accountId)
        .eq('id', route.params.id)
        .single(),
      supabase
        .from('account_profile')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('settings')
        .select('voucher_conditions, property_name, price_general_min, anticipo_pct')
        .eq('account_id', accountId)
        .maybeSingle(),
      getDocumentSettings(accountId),
      getMessageSettings(accountId),
      getPredefinedMessages(accountId),
    ])

    if (inquiryError) throw inquiryError

    inquiry.value = inquiryData
    profile.value = profileData || {}
    accountSettings.value = settingsData || {}
    voucherConditions.value = String(settingsData?.voucher_conditions || '').trim()
    documentSettings.value = loadedDocumentSettings
    systemMessageSettings.value = loadedMessageSettings || {}
    predefinedMessages.value = loadedMessages || []
    now.value = new Date()
  } catch (error) {
    loadError.value = error.message || 'No se pudo cargar la cotizacion.'
    inquiry.value = null
  } finally {
    loading.value = false
  }
}

const documentTemplateSettings = computed(() => ({
  ...(documentSettings.value || {}),
  conditions_text: voucherConditions.value,
}))

const footerContactLine = computed(() => {
  const parts = [profile.value?.phone, profile.value?.email, profile.value?.website].filter(Boolean)
  return parts.join(' · ')
})

const quotationNumber = computed(() => {
  const inquiryNumber = inquiry.value?.inquiry_number || ''
  if (!inquiryNumber.startsWith('INQ-')) return inquiryNumber || '-'
  return inquiryNumber.replace('INQ-', 'COT-')
})

const formattedReferenceDisplay = computed(() => formatReferenceDisplay(inquiry.value?.reference_code, inquiry.value?.guest_name))

const unitsLabel = computed(() => {
  const names = (inquiry.value?.inquiry_units || [])
    .map((row) => row.units?.name)
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : ''
})

const nights = computed(() => {
  if (!inquiry.value?.check_in || !inquiry.value?.check_out) return 0
  const checkIn = new Date(inquiry.value.check_in)
  const checkOut = new Date(inquiry.value.check_out)
  const diff = checkOut.getTime() - checkIn.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const showStaySection = computed(() => !!inquiry.value?.check_in && !!inquiry.value?.check_out && nights.value > 0)

const pricePerNight = computed(() => Number(inquiry.value?.price_per_night || 0))
const subtotal = computed(() => pricePerNight.value * nights.value)
const discountPercentage = computed(() => Number(inquiry.value?.discount_percentage || 0))
const discountAmount = computed(() => subtotal.value * discountPercentage.value / 100)
const totalCustomer = computed(() => Math.max(subtotal.value - discountAmount.value, 0))

const showFinancialSection = computed(() => showStaySection.value && pricePerNight.value > 0)

const formatDateShort = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

onMounted(async () => {
  await fetchData()
  await nextTick()
  window.print()
  window.close()
})
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

@media print {
  @page {
    margin: 1.2cm 1.5cm;
  }

  /*
   * html/body con height:auto evita que el navegador interprete
   * la altura de la ventana (1 página) como el mínimo del documento,
   * lo que genera una página 2 en blanco cuando el contenido es menor.
   */
  html, body {
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Quitar chrome de pantalla */
  :deep(.doc-host),
  :deep(.doc-host-full) {
    background: transparent !important;
    padding: 0 !important;
    min-height: 0 !important;
    height: auto !important;
  }

  :deep(.doc-sheet-wrapper) {
    display: block !important;
    padding: 0 !important;
    height: auto !important;
  }

  /*
   * CSS table trick: header y footer se repiten en cada página.
   * Nota: display:table-header/footer-group ignoran padding en el elemento
   * grupo — por eso el padding se aplica a los hijos directos del layout.
   */
  :deep(.doc-sheet) {
    display: table !important;
    width: 100% !important;
    min-height: 0 !important;
    height: auto !important;
    border: none !important;
    box-shadow: none !important;
    font-size: 10px !important;
    line-height: 1.35 !important;
  }

  :deep(.doc-header) {
    display: table-header-group !important;
  }

  /* min-height reserva demasiado espacio en pantalla, no tiene sentido en print */
  :deep(.header-size-sm),
  :deep(.header-size-md),
  :deep(.header-size-lg) {
    min-height: unset !important;
  }

  /* El padding va en los divs interiores porque table-header-group no lo acepta */
  :deep(.header-layout-logo-left) {
    padding: 6px 12px !important;
    gap: 10px !important;
  }

  :deep(.header-layout-centered) {
    padding: 6px 12px !important;
    gap: 2px !important;
  }

  :deep(.header-commercial-name) {
    font-size: 13px !important;
  }

  :deep(.header-logo-wrap),
  :deep(.header-logo-wrap-centered) {
    height: 36px !important;
    width: 46px !important;
  }

  :deep(.doc-main) {
    display: table-row-group !important;
    overflow: visible !important;
  }

  /* Condiciones y campo personalizado */
  :deep(.doc-section) {
    display: table-row-group !important;
    margin: 0 !important;
  }

  /* El padding en los elementos interiores (table-row-group ignora padding del grupo) */
  :deep(.section-title) {
    padding-left: 12px !important;
    padding-right: 12px !important;
    margin-bottom: 2px !important;
  }

  :deep(.section-text) {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  :deep(.doc-footer) {
    display: table-footer-group !important;
  }

  /* El padding en el contenedor interior del footer */
  :deep(.footer-content) {
    padding: 5px 12px !important;
  }

  /*
   * Secciones de contenido de la cotización.
   * Se añade padding horizontal porque doc-main (table-row-group)
   * no transfiere su propio padding a los hijos.
   */
  .doc-content-section {
    padding-top: 5px !important;
    padding-bottom: 5px !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  /* Título principal más compacto */
  .doc-content-title {
    font-size: 14px !important;
    margin-bottom: 2px !important;
  }

  /* Reducir márgenes superiores de Tailwind */
  .mt-2 { margin-top: 2px !important; }
  .mt-3 { margin-top: 4px !important; }
  .mt-4 { margin-top: 5px !important; }

  /* Tighten grids */
  .gap-1 { gap: 1px !important; }
  .gap-2 { gap: 2px !important; }
  .gap-3 { gap: 4px !important; }

  /* Divisores */
  .my-4 {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }

  /* space-y */
  .space-y-1 > * + * { margin-top: 1px !important; }
  .space-y-2 > * + * { margin-top: 2px !important; }

  /* Filas de tabla de pagos */
  td, th {
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }

  /* Nota de pie en template */
  footer.pt-4 { padding-top: 5px !important; }
}
</style>
