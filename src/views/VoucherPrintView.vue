<template>
  <div class="print-page">
    <div v-if="loading" class="p-8 text-center text-sm text-gray-500">
      Cargando voucher...
    </div>

    <div v-else-if="loadError" class="p-8 text-center text-sm text-red-700">
      {{ loadError }}
    </div>

    <DocumentTemplate
      v-else
      :settings="documentTemplateSettings"
      :profile="profile"
      type="voucher"
    >
      <div class="doc-content-wrapper">
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
      </div>
    </DocumentTemplate>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DocumentTemplate from '../components/documents/DocumentTemplate.vue'
import VoucherSlotContent from '../components/documents/VoucherSlotContent.vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { formatReferenceDisplay } from '../utils/referenceUtils'
import { getDocumentSettings } from '../services/documentSettingsService'

const route = useRoute()
const accountStore = useAccountStore()

const loading = ref(true)
const loadError = ref('')
const reservation = ref(null)
const payments = ref([])
const profile = ref({})
const voucherConditions = ref('')
const issuedAt = ref(new Date())
const documentSettings = ref(null)

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
    ] = await Promise.all([
      supabase
        .from('reservations')
.select('id, account_id, reservation_number, reference_code, check_in, check_out, adults, children, source_detail_info:source_details!reservations_source_detail_id_fkey(id, name, label_es), guest_id, total_amount, paid_amount, guests!reservations_guest_id_fkey(first_name, last_name, phone, email, document_type, document_number), reservation_units(unit_id, units(name))') 
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
    voucherConditions.value = String(settingsData?.voucher_conditions || '').trim()
    documentSettings.value = loadedDocumentSettings
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

onMounted(async () => {
  await fetchData()
  await nextTick()
  window.print()
  window.close()
})
</script>

<style scoped>
:deep(.doc-content-title),
:deep(.doc-content-subtitle) {
  color: var(--doc-accent);
}

:deep(.doc-content-section) {
  break-inside: avoid;
  page-break-inside: avoid;
}

@media print {
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
    min-height: calc(100vh - 2.4cm) !important;
  }

  /*
   * CSS table trick: header y footer se repiten en cada página.
   * Nota: display:table-header/footer-group ignoran padding en el elemento
   * grupo — por eso el padding se aplica a los hijos directos del layout.
   */

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

  .doc-content-wrapper {
    display: table-row !important;
    height: 100% !important;
  }

  /* Condiciones y campo personalizado */

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
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* El padding en el contenedor interior del footer */
  :deep(.footer-content) {
    padding: 5px 12px !important;
  }

  /*
   * Secciones de contenido del voucher.
   * Se añade padding horizontal porque doc-main (table-row-group)
   * no transfiere su propio padding a los hijos.
   */
  :deep(.doc-content-section) {
    padding-top: 5px !important;
    padding-bottom: 5px !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  /* Título principal más compacto */
  :deep(.doc-content-title) {
    font-size: 14px !important;
    margin-bottom: 2px !important;
  }

  /* Reducir márgenes superiores de Tailwind */
  :deep(.mt-2) { margin-top: 2px !important; }
  :deep(.mt-3) { margin-top: 4px !important; }
  :deep(.mt-4) { margin-top: 5px !important; }

  /* Tighten grids */
  :deep(.gap-1) { gap: 1px !important; }
  :deep(.gap-2) { gap: 2px !important; }
  :deep(.gap-3) { gap: 4px !important; }

  /* Divisores */
  :deep(.my-4) {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }

  /* space-y */
  :deep(.space-y-1 > * + *) { margin-top: 1px !important; }
  :deep(.space-y-2 > * + *) { margin-top: 2px !important; }

  /* Filas de tabla de pagos */
  :deep(td), :deep(th) {
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }

  /* Nota de pie en template */
  :deep(footer.pt-4) { padding-top: 5px !important; }
}
</style>
