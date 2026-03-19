<template>
  <div class="voucher-page min-h-screen bg-gray-100 px-4 py-6 text-gray-900">
    <div class="mx-auto w-full max-w-4xl">
      <div class="voucher-actions mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button class="btn-secondary text-sm" @click="goBack">← Volver a la reserva</button>
        <div class="flex items-center gap-2">
          <button class="btn-secondary text-sm" :disabled="loading || !reservation" @click="handleCopyWhatsApp">
            Copiar para WhatsApp
          </button>
          <button class="btn-primary text-sm" :disabled="loading || !reservation" @click="printVoucher">
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div v-if="loading" class="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        Cargando voucher...
      </div>

      <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        {{ loadError }}
      </div>

      <article v-else class="voucher-document rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <header class="voucher-section border-b border-gray-200 pb-5">
          <div class="flex items-start gap-4">
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded border border-gray-200 bg-white">
              <img v-if="profile.logo_url" :src="profile.logo_url" alt="Logo" class="h-full w-full object-contain">
              <div v-else class="flex h-full items-center justify-center text-xs text-gray-400">Sin logo</div>
            </div>
            <div class="min-w-0 space-y-1 text-sm text-gray-700">
              <p class="text-xl font-bold text-gray-900">{{ profile.commercial_name || profile.legal_name || 'Alojamiento' }}</p>
              <p v-if="formattedNit"><span class="font-semibold">NIT:</span> {{ formattedNit }}</p>
              <p v-if="profile.legal_name">{{ profile.legal_name }}</p>
              <p>{{ addressLine || '-' }}</p>
              <p>{{ contactLine || '-' }}</p>
              <p v-if="profile.slogan" class="italic text-gray-600">{{ profile.slogan }}</p>
            </div>
          </div>
        </header>

        <section class="voucher-section border-b border-gray-200 py-5">
          <h1 class="voucher-title text-2xl font-semibold">Comprobante de Reserva</h1>
          <div class="mt-3 grid grid-cols-1 gap-1 text-sm text-gray-700 md:grid-cols-3 md:gap-3">
            <p><span class="font-semibold">Reserva:</span> {{ reservation.reservation_number || '-' }}</p>
            <p><span class="font-semibold">Código:</span> {{ reservation.reference_code || '-' }}</p>
            <p><span class="font-semibold">Emitido:</span> {{ issuedAtLabel }}</p>
          </div>
        </section>

        <section class="voucher-section border-b border-gray-200 py-5">
          <h2 class="voucher-subtitle text-sm font-semibold uppercase tracking-wide">Datos de la reserva</h2>
          <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
            <p><span class="font-semibold">Unidad:</span> {{ unitLabel }}</p>
            <p><span class="font-semibold">Origen:</span> {{ sourceLabel }}</p>
            <p><span class="font-semibold">Check-in:</span> {{ formatDateShort(reservation.check_in) }}</p>
            <p><span class="font-semibold">Check-out:</span> {{ formatDateShort(reservation.check_out) }}</p>
            <p><span class="font-semibold">Noches:</span> {{ nights }}</p>
            <p><span class="font-semibold">Adultos:</span> {{ Number(reservation.adults || 0) }} · <span class="font-semibold">Niños:</span> {{ Number(reservation.children || 0) }}</p>
          </div>
        </section>

        <section class="voucher-section border-b border-gray-200 py-5">
          <h2 class="voucher-subtitle text-sm font-semibold uppercase tracking-wide">Datos del huésped</h2>
          <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
            <p><span class="font-semibold">Nombre:</span> {{ guestData.name }}</p>
            <p><span class="font-semibold">Documento:</span> {{ guestData.document }}</p>
            <p><span class="font-semibold">Teléfono:</span> {{ guestData.phone }}</p>
            <p><span class="font-semibold">Email:</span> {{ guestData.email }}</p>
          </div>
        </section>

        <section class="voucher-section border-b border-gray-200 py-5">
          <h2 class="voucher-subtitle text-sm font-semibold uppercase tracking-wide">Resumen financiero</h2>

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
                  <th class="py-1">Método</th>
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

        <section v-if="voucherConditions" class="voucher-section border-b border-gray-200 py-5">
          <h2 class="voucher-subtitle text-sm font-semibold uppercase tracking-wide">Condiciones</h2>
          <p class="mt-3 whitespace-pre-line text-sm text-gray-700">{{ voucherConditions }}</p>
        </section>

        <footer class="voucher-section pt-5 text-sm text-gray-700">
          <p>Este documento es un comprobante de reserva y no constituye factura de venta.</p>
          <p class="mt-2"><span class="font-semibold">Generado el:</span> {{ generatedAtLabel }}</p>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { formatNit } from '../utils/nitUtils'
import { copyAsWhatsApp, formatCop } from '../utils/voucherUtils'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const toast = useToast()

const loading = ref(true)
const loadError = ref('')
const reservation = ref(null)
const payments = ref([])
const profile = ref({})
const voucherConditions = ref('')
const issuedAt = ref(new Date())

const fetchData = async () => {
  loading.value = true
  loadError.value = ''

  try {
    const accountId = accountStore.getRequiredAccountId()

    const [{ data: reservationData, error: reservationError }, { data: profileData }, { data: settingsData }] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, account_id, reservation_number, reference_code, check_in, check_out, adults, children, source, source_type_info:source_types!reservations_source_type_id_fkey(id, name, label_es), source_detail_info:source_details!reservations_source_detail_id_fkey(id, name, label_es), guest_id, guest_name, guest_phone, guest_email, total_amount, paid_amount, guests!reservations_guest_id_fkey(name, phone, email, document_type, document_number), reservation_units(unit_id, units(name))')
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
    issuedAt.value = new Date()
  } catch (error) {
    loadError.value = error.message || 'No se pudo cargar el voucher.'
    reservation.value = null
  } finally {
    loading.value = false
  }
}

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

const formattedNit = computed(() => {
  const nitValue = profile.value?.nit
  if (!nitValue) return ''
  return formatNit(nitValue, profile.value?.nit_digit)
})

const addressLine = computed(() => {
  const parts = [profile.value?.address, profile.value?.city, profile.value?.department].filter(Boolean)
  return parts.join(' · ')
})

const contactLine = computed(() => {
  const parts = [profile.value?.phone, profile.value?.email].filter(Boolean)
  return parts.join(' · ')
})

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
  router.push(`/reservas/${route.params.id}`)
}

const printVoucher = () => {
  window.print()
}

const handleCopyWhatsApp = async () => {
  if (!reservation.value) return

  try {
    await copyAsWhatsApp(
      {
        ...reservation.value,
        voucher_conditions: voucherConditions.value,
        nights: nights.value,
        paid_amount: totalPaid.value,
        total_amount: totalAmount.value,
        adults: reservation.value?.adults,
        children: reservation.value?.children,
        unitName: unitLabel.value,
        guestName: guestData.value.name,
      },
      profile.value
    )

    toast.success('Copiado al portapapeles')
  } catch (error) {
    toast.error(error.message || 'No se pudo copiar el mensaje.')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.voucher-title,
.voucher-subtitle {
  color: #4C2FFF;
}

.voucher-section {
  break-inside: avoid;
  page-break-inside: avoid;
}

@page {
  size: A4;
  margin: 15mm;
}

@media print {
  .voucher-page {
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0;
  }

  .voucher-actions {
    display: none !important;
  }

  .voucher-document {
    margin: 0;
    width: 100%;
    max-width: none;
    border: none;
    box-shadow: none;
    background: #ffffff;
  }

  .voucher-document,
  .voucher-document * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 11px;
  }

  .voucher-title {
    font-size: 22px;
  }
}
</style>
