<template>
  <div class="voucher-page min-h-screen bg-gray-100 px-4 py-6 text-gray-900" :class="isMobile ? 'pb-28' : ''">
    <div class="mx-auto w-full max-w-5xl">
      <DocumentActionBar
        :mobile="isMobile"
        :disabled="loading || !reservation"
        back-label="← Volver a la reserva"
        @back="goBack"
        @copy="handleCopyWhatsApp"
        @print="printVoucher"
      />

      <div v-if="loading" class="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        Cargando voucher...
      </div>

      <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        {{ loadError }}
      </div>

      <DocumentTemplate
        v-else
        :settings="documentTemplateSettings"
        :profile="profile"
        type="voucher"
      >
        <VoucherSlotContent
          :reference-code="reservation.reference_code || '-'"
          :issued-at-label="issuedAtLabel"
          :guest-data="guestData"
          :unit-label="unitLabel"
          :check-in-label="formatDateShort(reservation.check_in)"
          :check-out-label="formatDateShort(reservation.check_out)"
          :source-label="sourceLabel"
          :nights="nights"
          :adults="Number(reservation.adults || 0)"
          :children="Number(reservation.children || 0)"
          :price-per-night="pricePerNight"
          :total-amount="totalAmount"
          :total-paid="totalPaid"
          :balance="balance"
          :payments="payments.map((payment) => ({ ...payment, payment_date: formatDateShort(payment.payment_date) }))"
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
import VoucherSlotContent from '../components/documents/VoucherSlotContent.vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { copyAsWhatsApp } from '../utils/voucherUtils'
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
const reservation = ref(null)
const payments = ref([])
const profile = ref({})
const voucherConditions = ref('')
const issuedAt = ref(new Date())
const documentSettings = ref(null)
const accountSettings = ref({})
const messageSettings = ref(null)
const voucherTemplate = ref('')

const fetchData = async () => {
  loading.value = true
  loadError.value = ''

  try {
    const accountId = accountStore.getRequiredAccountId()

    const [
      { data: reservationData, error: reservationError },
      { data: profileData },
      { data: settingsData },
      loadedDocumentSettings,
      loadedMessageSettings,
      predefinedMessages,
    ] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, account_id, reservation_number, reference_code, check_in, check_out, adults, children, source_detail_info:source_details!reservations_source_detail_id_fkey(id, name, label_es), guest_id, total_amount, paid_amount, guests!reservations_guest_id_fkey(first_name, last_name, phone, email, document_type, document_number), reservation_units(unit_id, units(name, description))')
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
        .select('property_name, anticipo_pct, voucher_conditions')
        .eq('account_id', accountId)
        .maybeSingle(),
      getDocumentSettings(accountId),
      getMessageSettings(accountId),
      getPredefinedMessages(accountId),
    ])

    if (reservationError) throw reservationError

    const { data: paymentRows, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, method, reference, payment_date')
      .eq('account_id', accountId)
      .eq('reservation_id', reservationData.id)
      .order('payment_date', { ascending: true })

    if (paymentsError) throw paymentsError

    reservation.value = reservationData
    payments.value = paymentRows || []
    profile.value = profileData || {}
    accountSettings.value = settingsData || {}
    voucherConditions.value = String(settingsData?.voucher_conditions || '').trim()
    documentSettings.value = loadedDocumentSettings
    messageSettings.value = loadedMessageSettings
    voucherTemplate.value = String(
      (predefinedMessages || []).find((msg) => msg.type === 'system' && msg.key === 'voucher')?.body || ''
    ).trim()
    issuedAt.value = new Date()
  } catch (error) {
    loadError.value = error.message || 'No se pudo cargar el voucher.'
    reservation.value = null
  } finally {
    loading.value = false
  }
}

const documentTemplateSettings = computed(() => ({
  ...(documentSettings.value || {}),
  conditions_text: voucherConditions.value,
  reservation_policy_text: String(profile.value?.politica_reserva || '').trim(),
}))

const nights = computed(() => {
  if (!reservation.value?.check_in || !reservation.value?.check_out) return 0
  const checkIn = new Date(reservation.value.check_in)
  const checkOut = new Date(reservation.value.check_out)
  const diff = checkOut.getTime() - checkIn.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const totalAmount = computed(() => Number(reservation.value?.total_amount || 0))
const totalPaid = computed(() => Number(reservation.value?.paid_amount || 0))
const balance = computed(() => Math.max(0, totalAmount.value - totalPaid.value))

const pricePerNight = computed(() => {
  if (!nights.value) return totalAmount.value
  return totalAmount.value / nights.value
})

const unitLabel = computed(() => {
  const names = (reservation.value?.reservation_units || [])
    .map((row) => row.units?.name)
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : '-'
})

const guestData = computed(() => {
  const guest = reservation.value?.guests
  const fullName = guest ? [guest.first_name, guest.last_name].filter(Boolean).join(' ') : ''
  return {
    name: fullName || 'Sin nombre',
    document: guest?.document_number
      ? [guest.document_type, guest.document_number].filter(Boolean).join(' ')
      : '-',
    phone: guest?.phone || '-',
    email: guest?.email || '-',
  }
})

const sourceLabel = computed(() => reservation.value?.source_detail_info?.label_es || '-')
const formattedReferenceDisplay = computed(() => formatReferenceDisplay(reservation.value?.reference_code, guestData.value?.name))

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

const issuedAtLabel = computed(() => formatDateTime(issuedAt.value))
const generatedAtLabel = computed(() => formatDateTime(new Date()))

const goBack = () => {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/reservas')
}

const printVoucher = () => {
  window.open(`/reservas/${route.params.id}/voucher/print`, '_blank')
}

const handleCopyWhatsApp = async () => {
  if (!reservation.value) return

  try {
    await copyAsWhatsApp(
      reservation.value,
      profile.value,
      {
        nights: nights.value,
        voucherConditions: voucherConditions.value,
        accountSettings: accountSettings.value,
        systemSettings: messageSettings.value,
        systemTemplate: voucherTemplate.value,
      }
    )

    toast.success('Copiado al portapapeles')
  } catch (error) {
    toast.error(error.message || 'No se pudo copiar el mensaje.')
  }
}

onMounted(fetchData)
</script>


