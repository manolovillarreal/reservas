<template>
  <div class="quotation-page min-h-screen bg-gray-100 px-4 py-6 text-gray-900" :class="isMobile ? 'pb-28' : ''">
    <div class="mx-auto w-full max-w-5xl">
      <DocumentActionBar
        :mobile="isMobile"
        :disabled="loading || !inquiry"
        back-label="← Volver a la consulta"
        @back="goBack"
        @copy="handleCopyWhatsApp"
        @print="printQuotation"
      />

      <div v-if="loading" class="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        Cargando cotizacion...
      </div>

      <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DocumentTemplate from '../components/documents/DocumentTemplate.vue'
import DocumentActionBar from '../components/documents/DocumentActionBar.vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { copyQuotationAsWhatsApp, formatCop, buildQuotePublicUrl } from '../utils/voucherUtils'
import { formatReferenceDisplay } from '../utils/referenceUtils'
import { getDocumentSettings } from '../services/documentSettingsService'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const { isMobile } = useBreakpoint()
const toast = useToast()

const loading = ref(true)
const loadError = ref('')
const inquiry = ref(null)
const profile = ref({})
const voucherConditions = ref('')
const now = ref(new Date())
const documentSettings = ref(null)

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
    ] = await Promise.all([
      supabase
        .from('inquiries')
        .select('id, account_id, inquiry_number, reference_code, quote_token, guest_name, guest_phone, check_in, check_out, adults, children, price_per_night, discount_percentage, quote_expires_at, source_detail_info:source_details!inquiries_source_detail_id_fkey(id, name, label_es), inquiry_units(unit_id, units(name))') 
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
        .select('voucher_conditions')
        .eq('account_id', accountId)
        .maybeSingle(),
      getDocumentSettings(accountId),
    ])

    if (inquiryError) throw inquiryError

    inquiry.value = inquiryData
    profile.value = profileData || {}
    voucherConditions.value = String(settingsData?.voucher_conditions || '').trim()
    documentSettings.value = loadedDocumentSettings
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

const goBack = () => {
  router.push(`/consultas/${route.params.id}`)
}

const printQuotation = () => {
  window.print()
}

const handleCopyWhatsApp = async () => {
  if (!inquiry.value) return

  try {
    await copyQuotationAsWhatsApp(
      {
        ...inquiry.value,
        quotation_number: quotationNumber.value,
        nights: nights.value,
        units_label: unitsLabel.value,
        total_amount: totalCustomer.value,
      },
      profile.value,
      buildQuotePublicUrl(inquiry.value.quote_token)
    )

    toast.success('Copiado al portapapeles')
  } catch (error) {
    toast.error(error.message || 'No se pudo copiar el mensaje.')
  }
}

onMounted(fetchData)
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
