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
        <QuotationSlotContent
          :guest-name="[inquiry?.guest_first_name, inquiry?.guest_last_name].filter(Boolean).join(' ') || '-'"
          :reference-display="formattedReferenceDisplay"
          :quotation-number="quotationNumber"
          :is-quote-expired="isQuoteExpired"
          :current-date-label="formatDateShort(now)"
          :quote-expires-label="inquiry?.quote_expires_at ? formatDateShort(inquiry.quote_expires_at) : ''"
          :check-in-label="formatDateShort(inquiry?.check_in)"
          :check-out-label="formatDateShort(inquiry?.check_out)"
          :nights="nights"
          :total-persons="totalPersons"
          :guest-phone="inquiry?.guest_phone || '-'"
          :units-label="unitsLabel"
          :adults="Number(inquiry?.adults || 0)"
          :children="Number(inquiry?.children || 0)"
          :show-stay-section="showStaySection"
          :show-financial-section="showFinancialSection"
          :price-per-night="pricePerNight"
          :subtotal="subtotal"
          :discount-percentage="discountPercentage"
          :discount-amount="discountAmount"
          :total-customer="totalCustomer"
          :footer-contact-line="footerContactLine"
          :generated-at-label="formatDateTime(now)"
        />
      </DocumentTemplate>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DocumentTemplate from '../components/documents/DocumentTemplate.vue'
import DocumentActionBar from '../components/documents/DocumentActionBar.vue'
import QuotationSlotContent from '../components/documents/QuotationSlotContent.vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { copyQuotationAsWhatsApp, buildQuotePublicUrl } from '../utils/voucherUtils'
import { formatReferenceDisplay } from '../utils/referenceUtils'
import { getDocumentSettings } from '../services/documentSettingsService'
import { getMessageSettings, getPredefinedMessages } from '../services/messageSettingsService'

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
        .select('id, account_id, inquiry_number, reference_code, quote_token, guest_first_name, guest_last_name, guest_phone, check_in, check_out, adults, children, price_per_night, discount_percentage, quote_expires_at, source_detail_info:source_details!inquiries_source_detail_id_fkey(id, name, label_es), inquiry_units(unit_id, units(name, description))') 
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
  reservation_policy_text: String(profile.value?.politica_reserva || '').trim(),
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

const isQuoteExpired = computed(() => {
  if (!inquiry.value?.quote_expires_at) return false
  return new Date(inquiry.value.quote_expires_at) < new Date()
})
const totalPersons = computed(() =>
  Number(inquiry.value?.adults || 0) +
  Number(inquiry.value?.children || 0) +
  Number(inquiry.value?.minors || 0)
)

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
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/consultas')
}

const printQuotation = () => {
  window.open(`/consultas/${route.params.id}/cotizacion/print`, '_blank')
}

const handleCopyWhatsApp = async () => {
  if (!inquiry.value) return

  try {
    const quotationTemplate = String(
      predefinedMessages.value.find((msg) => msg.type === 'system' && msg.key === 'quotation')?.body || ''
    ).trim()

    await copyQuotationAsWhatsApp(
      {
        ...inquiry.value,
        quotation_number: quotationNumber.value,
        nights: nights.value,
        units_label: unitsLabel.value,
        total_amount: totalCustomer.value,
      },
      profile.value,
      buildQuotePublicUrl(inquiry.value.quote_token),
      {
        systemTemplate: quotationTemplate,
        accountSettings: accountSettings.value,
        units: (inquiry.value?.inquiry_units || []).map((row) => row.units).filter(Boolean),
      }
    )

    toast.success('Copiado al portapapeles')
  } catch (error) {
    toast.error(error.message || 'No se pudo copiar el mensaje.')
  }
}

onMounted(fetchData)
</script>


