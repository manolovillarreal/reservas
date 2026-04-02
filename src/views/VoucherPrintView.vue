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
      <section class="doc-content-section border-b pb-4">
        <h1 class="doc-content-title text-2xl font-semibold">Comprobante de Reserva</h1>
        <p class="mt-2 text-base font-semibold text-gray-900">Codigo de reserva: {{ formattedReferenceDisplay }}</p>
        <div class="mt-3 grid grid-cols-1 gap-1 text-sm text-gray-700 md:grid-cols-3 md:gap-3">
          <p><span class="font-semibold">Reserva:</span> {{ reservation.reservation_number || '-' }}</p>
          <p><span class="font-semibold">Codigo:</span> {{ reservation.reference_code || '-' }}</p>
          <p><span class="font-semibold">Emitido:</span> {{ issuedAtLabel }}</p>
        </div>
      </section>

      <section class="doc-content-section border-b py-4">
        <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Datos de la reserva</h2>
        <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
          <p><span class="font-semibold">Unidad:</span> {{ unitLabel }}</p>
          <p><span class="font-semibold">Origen:</span> {{ sourceLabel }}</p>
          <p><span class="font-semibold">Check-in:</span> {{ formatDateShort(reservation.check_in) }}</p>
          <p><span class="font-semibold">Check-out:</span> {{ formatDateShort(reservation.check_out) }}</p>
          <p><span class="font-semibold">Noches:</span> {{ nights }}</p>
          <p><span class="font-semibold">Adultos:</span> {{ Number(reservation.adults || 0) }} · <span class="font-semibold">Ninos:</span> {{ Number(reservation.children || 0) }}</p>
        </div>
      </section>

      <section class="doc-content-section border-b py-4">
        <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Datos del huesped</h2>
        <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
          <p><span class="font-semibold">Nombre:</span> {{ guestData.name }}</p>
          <p><span class="font-semibold">Documento:</span> {{ guestData.document }}</p>
          <p><span class="font-semibold">Telefono:</span> {{ guestData.phone }}</p>
          <p><span class="font-semibold">Email:</span> {{ guestData.email }}</p>
        </div>
      </section>

      <section class="doc-content-section border-b py-4">
        <h2 class="doc-content-subtitle text-sm font-semibold uppercase tracking-wide">Resumen financiero</h2>

        <div class="mt-3 space-y-1 text-sm text-gray-700">
          <p class="flex justify-between gap-3"><span>Precio por noche:</span> <span class="font-medium">{{ formatCop(pricePerNight) }}</span></p>
          <p class="flex justify-between gap-3"><span>Total reserva:</span> <span class="font-medium">{{ formatCop(totalAmount) }}</span></p>
        </div>

        <div class="my-4 border-t border-dashed border-gray-300"></div>

        <div class="space-y-2 text-sm text-gray-700">
          <p class="font-semibold">Pagos registrados:</p>
          <div v-if="payments.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
            No hay pagos registrados.
          </div>
          <table v-else class="w-full text-left text-sm">
            <thead class="text-xs uppercase text-gray-500">
              <tr>
                <th class="py-1">Fecha</th>
                <th class="py-1">Metodo</th>
                <th class="py-1">Ref</th>
                <th class="py-1 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in payments" :key="payment.id" class="border-t border-gray-100">
                <td class="py-2">{{ formatDateShort(payment.payment_date) }}</td>
                <td class="py-2 capitalize">{{ payment.method || '-' }}</td>
                <td class="py-2">{{ payment.reference || '-' }}</td>
                <td class="py-2 text-right font-medium">{{ formatCop(payment.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="my-4 border-t border-dashed border-gray-300"></div>

        <div class="space-y-1 text-sm">
          <p class="flex justify-between gap-3 text-gray-700"><span>Total pagado:</span> <span class="font-medium">{{ formatCop(totalPaid) }}</span></p>
          <p class="flex justify-between gap-3 font-semibold" :class="balance > 0 ? 'text-red-600' : 'text-emerald-700'">
            <span>Saldo pendiente:</span>
            <span>{{ formatCop(balance) }}</span>
          </p>
        </div>
      </section>

      <footer class="pt-4 text-sm text-gray-700">
        <p>Este documento es un comprobante de reserva y no constituye factura de venta.</p>
        <p class="mt-2"><span class="font-semibold">Generado el:</span> {{ generatedAtLabel }}</p>
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
        .select('id, account_id, reservation_number, reference_code, check_in, check_out, adults, children, source, source_type_info:source_types!reservations_source_type_id_fkey(id, name, label_es), source_detail_info:source_details!reservations_source_detail_id_fkey(id, name, label_es), guest_id, guest_name, guest_phone, total_amount, paid_amount, guests!reservations_guest_id_fkey(name, phone, email, document_type, document_number), reservation_units(unit_id, units(name))')
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
  const fallbackPhone = reservation.value?.guest_phone || '-'
  const fallbackName = reservation.value?.guest_name || 'Sin nombre'

  return {
    name: guest?.name || fallbackName,
    document: guest?.document_number
      ? [guest.document_type, guest.document_number].filter(Boolean).join(' ')
      : '-',
    phone: guest?.phone || fallbackPhone,
    email: guest?.email || reservation.value?.guest_email || '-',
  }
})

const sourceLabel = computed(() => reservation.value?.source_detail_info?.label_es || reservation.value?.source || '-')
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
   * Secciones de contenido del voucher.
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
