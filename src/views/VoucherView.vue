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
        <section class="doc-content-section border-b pb-4">
          <div class="flex items-baseline justify-between gap-3">
            <h1 class="doc-content-title text-xl font-semibold">Comprobante de Reserva</h1>
            <span class="text-xs text-gray-400 font-mono">{{ reservation.reference_code || '-' }} · {{ guestData.name }} · Emitido {{ issuedAtLabel }}</span>
          </div>

          <div class="mt-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Titular</p>
            <div class="grid grid-cols-2 gap-x-6 gap-y-1 print:grid-cols-2 text-sm text-gray-700">
              <p><span class="font-semibold">Nombre:</span> {{ guestData.name }}</p>
              <p><span class="font-semibold">Documento:</span> {{ guestData.document }}</p>
              <p><span class="font-semibold">Teléfono:</span> {{ guestData.phone }}</p>
              <p><span class="font-semibold">Email:</span> {{ guestData.email }}</p>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700 print:grid-cols-3 md:grid-cols-3">
            <p><span class="font-semibold">Unidad:</span> {{ unitLabel }}</p>
            <p><span class="font-semibold">Check-in:</span> {{ formatDateShort(reservation.check_in) }}</p>
            <p><span class="font-semibold">Check-out:</span> {{ formatDateShort(reservation.check_out) }}</p>
            <p><span class="font-semibold">Origen:</span> {{ sourceLabel }}</p>
            <p><span class="font-semibold">Noches:</span> {{ nights }}</p>
            <p><span class="font-semibold">Huéspedes:</span> {{ Number(reservation.adults || 0) }} · <span class="font-semibold">Ninos:</span> {{ Number(reservation.children || 0) }}</p>
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
import { copyAsWhatsApp, formatCop } from '../utils/voucherUtils'
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
