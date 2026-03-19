<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    
    <!-- Top Nav Actions -->
    <div class="flex items-center justify-between">
      <router-link to="/reservas" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Volver a Reservas
      </router-link>
      <div class="flex items-center gap-3">
        <button v-if="can('vouchers', 'generate')" class="btn-secondary text-sm" @click="openVoucher">Generar Voucher</button>
      </div>
    </div>

    <div v-if="feedbackMessage" class="rounded-md border px-4 py-3 text-sm" :class="feedbackType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
      {{ feedbackMessage }}
    </div>

    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-32 bg-gray-200 rounded-xl"></div>
      <div class="grid grid-cols-3 gap-6">
        <div class="col-span-2 h-64 bg-gray-200 rounded-xl"></div>
        <div class="col-span-1 h-64 bg-gray-200 rounded-xl"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="!res" class="card text-center py-12">
      <h3 class="text-lg font-medium text-gray-900">Reserva no encontrada</h3>
      <p class="mt-1 text-sm text-gray-500">Es posible que haya sido eliminada o la URL no es válida.</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Main Content Column (2/3) -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Header Card -->
        <div class="card bg-white overflow-hidden !p-0">
          <div class="p-6 border-b border-gray-100 flex justify-between items-start">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-2xl font-semibold text-gray-900">{{ guestDisplayName }}</h1>
                <ReservationBadge :status="res.status" class="cursor-pointer hover:ring-2 ring-offset-1 transition-all" @click="openStatusModal" title="Cambiar estado" />
              </div>
              <p class="text-gray-500 text-sm flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {{ formatDate(res.check_in) }} &rarr; {{ formatDate(res.check_out) }} 
                <span class="text-gray-300">|</span> 
                {{ nightsCount }} noches 
                <span class="text-gray-300">|</span> 
                {{ Number(res.adults || 0) + Number(res.children || 0) }} personas
              </p>
            </div>
          </div>
          
          <div class="bg-gray-50 p-6 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <p class="text-gray-500 mb-1">Sede</p>
              <p class="font-medium text-gray-900">{{ res.venues?.name || '-' }}</p>
            </div>
            <div>
              <p class="text-gray-500 mb-1">Unidades</p>
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-gray-900">{{ unitNames || '-' }}</p>
                <button
                  type="button"
                  class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  @click="openEditUnitsModal"
                >
                  Editar
                </button>
              </div>
            </div>
            <div>
              <p class="text-gray-500 mb-1">Origen</p>
              <p class="font-medium text-gray-900">{{ res.source_detail_info?.label_es || res.source || '-' }}</p>
            </div>
            <div>
              <p class="text-gray-500 mb-1">Registro</p>
              <p class="font-medium text-gray-900">{{ formatDate(res.created_at) }}</p>
            </div>
            <div v-if="canViewFinancial">
              <p class="text-gray-500 mb-1">Total</p>
              <p class="font-medium text-gray-900">${{ formatCurrency(res.total_amount) }}</p>
            </div>
            <div v-if="canViewFinancial">
              <p class="text-gray-500 mb-1">Comisión</p>
              <p class="font-medium text-gray-900">
                {{ commissionSummary.name }} ({{ commissionSummary.percentage }}%)
              </p>
              <p class="text-xs text-gray-500">${{ formatCurrency(commissionSummary.amount) }} → Neto: ${{ formatCurrency(commissionSummary.netAmount) }}</p>
            </div>
          </div>
        </div>

        <!-- Payments Section -->
        <div v-if="canViewPayments" class="card">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Historial de Pagos</h2>
            <button v-if="can('payments', 'create')" class="text-sm font-medium text-indigo-600 hover:text-indigo-800" @click="openPaymentModal">+ Registrar Pago</button>
          </div>
          
          <div v-if="payments.length === 0" class="text-center py-6 text-gray-500 text-sm italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No hay pagos registrados aún.
          </div>
          
          <table v-else class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th class="py-2 px-3">Fecha</th>
                <th class="py-2 px-3">Monto</th>
                <th class="py-2 px-3">Método</th>
                <th class="py-2 px-3">Referencia</th>
                <th class="py-2 px-3 text-right">Eliminar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 text-sm">
              <tr v-for="p in payments" :key="p.id">
                <td class="py-3 px-3 text-gray-900">{{ formatDate(p.payment_date) }}</td>
                <td class="py-3 px-3 font-medium text-gray-900">${{ formatCurrency(p.amount) }}</td>
                <td class="py-3 px-3 text-gray-500 capitalize">{{ p.method }}</td>
                <td class="py-3 px-3 text-gray-500">{{ p.reference || '-' }}</td>
                <td class="py-3 px-3 text-right">
                  <button
                    v-if="can('payments', 'delete')"
                    class="text-sm font-medium text-red-600 hover:text-red-800"
                    @click="openDeletePaymentModal(p)"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <div class="w-full max-w-xs space-y-2 text-sm">
              <div class="flex justify-between text-gray-500">
                <span>Total Reserva:</span>
                <span>${{ formatCurrency(res.total_amount) }}</span>
              </div>
              <div class="flex justify-between text-gray-500">
                <span>Total Pagado:</span>
                <span>${{ formatCurrency(totalPaid) }}</span>
              </div>
              <div class="flex justify-between font-semibold pt-2 border-t border-gray-100 text-base" :class="remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'">
                <span>Saldo Pendiente:</span>
                <span>${{ formatCurrency(remainingBalance) }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Side Column (1/3) -->
      <div class="space-y-6">
        
        <!-- Alerts -->
        <DeadlineAlert v-if="isDeadlineOverdue" :show="true">
          El plazo de pago ($ {{ formatCurrency(res.balance) }}) venció el {{ formatDate(res.payment_deadline) }}.
        </DeadlineAlert>

        <div class="card">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Pre-registro de huéspedes</h2>

          <div v-if="res.preregistro_completado" class="space-y-3 text-sm text-gray-700">
            <p class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Completado ✓</p>
            <p>
              Completado el
              <span class="font-medium text-gray-900">{{ formatDateTime(res.preregistro_completado_at) }}</span>
            </p>

            <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Huéspedes registrados</p>
              <div v-if="registeredGuests.length === 0" class="text-sm text-gray-500">No hay huéspedes nominales registrados.</div>
              <div v-else class="space-y-2">
                <div v-for="guest in registeredGuests" :key="`rg-${guest.id}`" class="rounded border border-gray-200 bg-white px-3 py-2">
                  <p class="text-sm font-medium text-gray-900">{{ guest.name || 'Sin nombre' }}</p>
                  <p class="text-xs text-gray-600">{{ guest.documentLabel }}</p>
                  <p class="text-xs text-gray-600">{{ guest.nationality || 'Nacionalidad no registrada' }}</p>
                  <p class="text-xs font-semibold" :class="guest.is_primary ? 'text-indigo-700' : 'text-gray-500'">
                    {{ guest.is_primary ? 'Principal' : 'Acompañante' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="res.status === 'confirmed'" class="space-y-3 text-sm text-gray-700">
            <p class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Pendiente</p>
            <button v-if="can('reservations', 'edit')" class="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200" @click="showPreregistroModal = true">
              Completar pre-registro
            </button>
            <button v-if="can('reservations', 'edit')" class="w-full rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100" @click="copyPreregistroLink">
              Copiar link de pre-registro
            </button>
            <p class="text-xs text-gray-500">El link es válido 48 horas después del check-in declarado.</p>
          </div>

          <div v-else class="text-sm text-gray-500">
            El pre-registro solo está disponible para reservas en estado confirmed.
          </div>
        </div>

        <div class="card">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Check-in físico</h2>

          <div v-if="res.checkin_at" class="space-y-2 text-sm text-gray-700">
            <p class="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">Llegada registrada</p>
            <p>Registrado: <span class="font-medium text-gray-900">{{ formatDateTime(res.checkin_at) }}</span></p>
          </div>

          <div v-else-if="res.status === 'confirmed'" class="space-y-3 text-sm text-gray-700">
            <p class="text-gray-600">Registrar la llegada real del huésped cambia el estado de la reserva a in_stay.</p>
            <button
              v-if="can('reservations', 'checkin')"
              class="w-full rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              @click="openCheckinConfirmModal"
            >
              Registrar llegada
            </button>
          </div>

          <div v-else class="text-sm text-gray-500">
            La llegada física solo se registra desde estado confirmed.
          </div>
        </div>

        <div class="card">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Huésped principal</h2>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
              {{ guestDisplayName.charAt(0) }}
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ guestDisplayName }}</p>
              <p class="text-sm text-gray-500">{{ res.guests?.email || 'Sin correo' }}</p>
            </div>
          </div>
          <div class="space-y-2 text-sm text-gray-600">
            <p class="flex items-center gap-2"><span class="w-4">📱</span> {{ guestDisplayPhone }}</p>
            <p class="flex items-center gap-2"><span class="w-4">🪪</span> {{ guestDocumentLabel }}</p>
          </div>
          <button class="mt-4 w-full py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors">
            Ver perfil completo
          </button>
        </div>

        <!-- Danger Zone -->
        <div class="card border-red-100 bg-red-50/30">
          <h2 class="text-sm font-semibold text-red-800 mb-2">Zona de Peligro</h2>
          <p class="text-xs text-red-600 mb-4">Al cancelar una reserva, se liberarán las fechas en el calendario inmediatamente.</p>
          <button @click="openCancelModal" class="w-full py-2 px-4 border border-red-200 text-red-700 bg-white hover:bg-red-50 rounded-md font-medium text-sm transition-colors">
            Cancelar Reserva
          </button>
        </div>

      </div>
    </div>

    <BaseModal :isOpen="showPreregistroModal" title="Completar pre-registro" size="lg" @close="closePreregistroModal">
      <PreRegistroForm
        v-if="res"
        :reservation="preregistroReservation"
        :guestsCount="preregistroGuestsCount"
        :submitting="preregistroSubmitting"
        :initialPrimaryGuest="preregistroPrimaryGuest"
        :initialAdditionalGuests="preregistroAdditionalGuests"
        @submitted="handleAdminPreregistroSubmit"
      />
      <p v-if="preregistroErrorMessage" class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ preregistroErrorMessage }}
      </p>
    </BaseModal>

    <BaseModal :isOpen="showEditUnitsModal" title="Editar unidades" @close="closeEditUnitsModal">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Selecciona las unidades para esta reserva. Se validará disponibilidad en el mismo rango de fechas.
        </p>

        <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p class="text-xs uppercase tracking-wide text-gray-500">Rango de estadía</p>
          <p class="text-sm font-medium text-gray-800">
            {{ formatDate(res?.check_in) }} → {{ formatDate(res?.check_out) }}
          </p>
        </div>

        <div class="max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
          <p v-if="editUnitsLoading" class="text-sm text-gray-500">Cargando unidades...</p>
          <p v-else-if="editUnitsAvailable.length === 0" class="text-sm text-gray-500">
            No hay unidades activas disponibles en esta sede.
          </p>

          <label
            v-for="unit in editUnitsAvailable"
            :key="unit.id"
            class="flex items-center gap-2 text-sm text-gray-700"
          >
            <input
              v-model="editUnitsSelection"
              type="checkbox"
              :value="unit.id"
              class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            >
            <span>{{ unit.name }}</span>
          </label>
        </div>

        <div
          v-if="editUnitsUnavailableNames.length > 0"
          class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          No disponibles en el rango seleccionado: {{ editUnitsUnavailableNames.join(', ') }}
        </div>

        <p v-if="editUnitsErrorMessage" class="text-sm text-red-600">{{ editUnitsErrorMessage }}</p>

        <div class="flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" :disabled="editUnitsSaving" @click="closeEditUnitsModal">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="editUnitsSaving" @click="submitEditUnits">
            {{ editUnitsSaving ? 'Guardando...' : 'Guardar unidades' }}
          </button>
        </div>
      </div>
    </BaseModal>

    <PaymentModal
      v-if="res"
      :isOpen="showPaymentModal"
      :reservationId="res.id"
      :totalAmount="Number(res.total_amount || 0)"
      :paidAmount="Number(res.paid_amount || 0)"
      @close="closePaymentModal"
      @saved="handlePaymentSaved"
    />

    <ConfirmActionModal
      :isOpen="showDeletePaymentModal"
      title="Eliminar pago"
      :message="deletePaymentMessage"
      confirmLabel="Eliminar"
      :loading="deletingPayment"
      @close="closeDeletePaymentModal"
      @confirm="confirmDeletePayment"
    />

    <ConfirmActionModal
      :isOpen="showCheckinConfirmModal"
      title="Registrar llegada"
      :message="checkinConfirmationMessage"
      confirmLabel="Confirmar llegada"
      :loading="checkinSubmitting"
      @close="closeCheckinConfirmModal"
      @confirm="confirmCheckin"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useReservationsStore } from '../stores/reservations'
import ReservationBadge from '../components/ui/ReservationBadge.vue'
import DeadlineAlert from '../components/ui/DeadlineAlert.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import PreRegistroForm from '../components/preregistro/PreRegistroForm.vue'
import PaymentModal from '../components/payments/PaymentModal.vue'
import { completeReservationPreregistro } from '../services/preregistro'
import { getCommissionSummary, getReservationGuestName, getReservationGuestPhone } from '../utils/reservations'
import { usePermissions } from '../composables/usePermissions'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const reservationsStore = useReservationsStore()
const accountStore = useAccountStore()
const { can } = usePermissions()
const toast = useToast()
const loading = ref(true)
const res = ref(null)
const payments = ref([])
const feedbackMessage = ref('')
const feedbackType = ref('success')
const showPreregistroModal = ref(false)
const preregistroSubmitting = ref(false)
const preregistroErrorMessage = ref('')
const showEditUnitsModal = ref(false)
const editUnitsLoading = ref(false)
const editUnitsSaving = ref(false)
const editUnitsErrorMessage = ref('')
const editUnitsAvailable = ref([])
const editUnitsSelection = ref([])
const editUnitsUnavailableNames = ref([])
const showPaymentModal = ref(false)
const showDeletePaymentModal = ref(false)
const deletingPayment = ref(false)
const selectedPayment = ref(null)
const showCheckinConfirmModal = ref(false)
const checkinSubmitting = ref(false)

onMounted(async () => {
  await fetchReservation()
})

const fetchReservation = async () => {
  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('reservations')
      .select('*, source_type_info:source_types!reservations_source_type_id_fkey(id, name, label_es, is_active), source_detail_info:source_details!reservations_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active), guests!reservations_guest_id_fkey(*), venues(name), reservation_units(unit_id, units(*)), reservation_guests(is_primary, guest_id, guests!reservation_guests_guest_id_fkey(*))')
      .eq('account_id', accountId)
      .eq('id', route.params.id)
      .single()

    if (error) throw error
      
    if (data) {
      res.value = data
      await fetchPayments()
    }
  } catch (err) {
    res.value = null
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchPayments = async () => {
  const accountId = accountStore.getRequiredAccountId()
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('account_id', accountId)
    .eq('reservation_id', res.value.id)
    .order('payment_date', { ascending: false })
  payments.value = data || []
}

// Computeds
const nightsCount = computed(() => {
  if (!res.value?.check_in || !res.value?.check_out) return 0
  const start = new Date(res.value.check_in)
  const end = new Date(res.value.check_out)
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
})

const totalPaid = computed(() => {
  return Number(res.value?.paid_amount || 0)
})

const guestDisplayName = computed(() => getReservationGuestName(res.value))
const guestDisplayPhone = computed(() => getReservationGuestPhone(res.value))

const guestDocumentLabel = computed(() => {
  if (!res.value?.guests?.document_number) {
    return 'Sin documento'
  }

  return [res.value.guests.document_type, res.value.guests.document_number].filter(Boolean).join(' · ')
})

const commissionSummary = computed(() => getCommissionSummary(res.value))

const unitNames = computed(() => {
  return (res.value?.reservation_units || [])
    .map(ru => ru.units?.name)
    .filter(Boolean)
    .join(', ')
})

const currentUnitIds = computed(() => {
  return (res.value?.reservation_units || []).map((row) => row.unit_id).filter(Boolean)
})

const remainingBalance = computed(() => {
  const bal = Number(res.value?.total_amount || 0) - Number(res.value?.paid_amount || 0)
  return bal > 0 ? bal : 0
})

const initialPreregistroGuests = computed(() => {
  const guests = (res.value?.reservation_guests || [])
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map(item => item.guests)
    .filter(Boolean)

  if (guests.length > 0) {
    return guests
  }

  if (res.value?.guests) {
    return [res.value.guests]
  }

  return [{
    name: res.value?.guest_name || '',
    phone: res.value?.guest_phone || '',
    email: res.value?.guest_email || '',
    nationality: '',
    document_type: '',
    document_number: ''
  }]
})

const preregistroGuestsCount = computed(() => {
  const total = Number(res.value?.adults || 0) + Number(res.value?.children || 0)
  return total > 0 ? total : 1
})

const preregistroPrimaryGuest = computed(() => {
  return initialPreregistroGuests.value[0] || {
    name: res.value?.guest_name || '',
    phone: res.value?.guest_phone || '',
    email: res.value?.guest_email || '',
    nationality: '',
    document_type: '',
    document_number: '',
  }
})

const preregistroAdditionalGuests = computed(() => {
  return initialPreregistroGuests.value.slice(1)
})

const registeredGuests = computed(() => {
  return (res.value?.reservation_guests || [])
    .map((row) => ({
      id: row.guest_id || row.guests?.id,
      is_primary: Boolean(row.is_primary),
      name: row.guests?.name || '-',
      nationality: row.guests?.nationality || '',
      documentLabel: [row.guests?.document_type, row.guests?.document_number].filter(Boolean).join(' ') || 'Sin documento',
    }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
})

const preregistroReservation = computed(() => ({
  venue_name: res.value?.venues?.name || 'Alojamiento',
  check_in: res.value?.check_in,
  check_out: res.value?.check_out,
  guests_count: Number(res.value?.adults || 0) + Number(res.value?.children || 0) || 1,
}))

const isDeadlineOverdue = computed(() => {
  if (res.value?.status !== 'confirmed' || !res.value?.payment_deadline) return false
  const today = new Date().toISOString().split('T')[0]
  return res.value.payment_deadline < today
})

const canViewFinancial = computed(() => {
  return can('payments', 'view') || can('reports', 'view_financial')
})

const canViewPayments = computed(() => can('payments', 'view'))

const deletePaymentMessage = computed(() => {
  if (!selectedPayment.value) return ''
  return `¿Eliminar este pago de $${formatCurrency(selectedPayment.value.amount)} registrado el ${formatDate(selectedPayment.value.payment_date)}?`
})

const checkinConfirmationMessage = computed(() => {
  const nowLabel = formatDateTime(new Date().toISOString())
  return `¿Confirmar llegada de ${guestDisplayName.value}?\nHora de registro: ${nowLabel}`
})

// Formatting
const formatDate = (ds) => {
  if(!ds) return '-'
  return new Date(ds).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const formatCurrency = (val) => Number(val).toLocaleString('es-CO')

const formatDateTime = (ds) => {
  if (!ds) return '-'
  return new Date(ds).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const setFeedback = (type, message) => {
  feedbackType.value = type
  feedbackMessage.value = message
}

const parseFunctionError = async (error) => {
  if (!error) return 'Ocurrió un error inesperado.'

  if (typeof error.context?.json === 'function') {
    const payload = await error.context.json()
    return payload.message || 'Ocurrió un error inesperado.'
  }

  return error.message || 'Ocurrió un error inesperado.'
}

// Interactions
const openPaymentModal = () => {
  showPaymentModal.value = true
}
const openStatusModal = () => { console.log('Abrir modal de estado') }
const openCancelModal = () => { console.log('Abrir modal de cancelacion') }
const openVoucher = () => {
  if (!res.value?.id) return
  router.push(`/reservas/${res.value.id}/voucher`)
}

const closePaymentModal = () => {
  showPaymentModal.value = false
}

const handlePaymentSaved = async () => {
  await fetchReservation()
}

const recalculatePaidAmount = async (reservationId, accountId) => {
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('account_id', accountId)
    .eq('reservation_id', reservationId)

  if (error) throw error

  const paidAmount = (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const { error: updateError } = await supabase
    .from('reservations')
    .update({ paid_amount: paidAmount })
    .eq('account_id', accountId)
    .eq('id', reservationId)

  if (updateError) throw updateError
  return paidAmount
}

const openDeletePaymentModal = (payment) => {
  selectedPayment.value = payment
  showDeletePaymentModal.value = true
}

const closeDeletePaymentModal = () => {
  if (deletingPayment.value) return
  showDeletePaymentModal.value = false
  selectedPayment.value = null
}

const openCheckinConfirmModal = () => {
  if (!res.value) return
  showCheckinConfirmModal.value = true
}

const closeCheckinConfirmModal = () => {
  if (checkinSubmitting.value) return
  showCheckinConfirmModal.value = false
}

const confirmDeletePayment = async () => {
  if (!selectedPayment.value || !res.value) return

  deletingPayment.value = true

  try {
    const accountId = accountStore.getRequiredAccountId()

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('account_id', accountId)
      .eq('id', selectedPayment.value.id)

    if (error) throw error

    await recalculatePaidAmount(res.value.id, accountId)
    await fetchReservation()

    toast.success('Pago eliminado correctamente')
    closeDeletePaymentModal()
  } catch (error) {
    toast.error(error.message || 'No se pudo eliminar el pago.')
  } finally {
    deletingPayment.value = false
  }
}

const validateEditUnitsSelection = async () => {
  editUnitsUnavailableNames.value = []

  if (!res.value || editUnitsSelection.value.length === 0) return

  const availability = await reservationsStore.getUnitAvailability(
    editUnitsSelection.value,
    res.value.check_in,
    res.value.check_out,
    res.value.id
  )

  if (availability.unavailableUnitIds.length === 0) return

  editUnitsUnavailableNames.value = editUnitsAvailable.value
    .filter((unit) => availability.unavailableUnitIds.includes(unit.id))
    .map((unit) => unit.name)
}

const openEditUnitsModal = async () => {
  if (!res.value?.venue_id) {
    setFeedback('error', 'No se pudo identificar la sede de la reserva.')
    return
  }

  editUnitsErrorMessage.value = ''
  editUnitsUnavailableNames.value = []
  editUnitsSaving.value = false
  editUnitsLoading.value = true
  showEditUnitsModal.value = true

  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('units')
      .select('id, name, is_active')
      .eq('account_id', accountId)
      .eq('venue_id', res.value.venue_id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    editUnitsAvailable.value = data || []
    editUnitsSelection.value = currentUnitIds.value.slice()
    await validateEditUnitsSelection()
  } catch (err) {
    editUnitsErrorMessage.value = err.message
  } finally {
    editUnitsLoading.value = false
  }
}

const closeEditUnitsModal = () => {
  if (editUnitsSaving.value) return
  showEditUnitsModal.value = false
  editUnitsErrorMessage.value = ''
  editUnitsUnavailableNames.value = []
}

const submitEditUnits = async () => {
  editUnitsErrorMessage.value = ''

  if (!res.value) {
    editUnitsErrorMessage.value = 'No se encontró la reserva para actualizar.'
    return
  }

  if (editUnitsSelection.value.length === 0) {
    editUnitsErrorMessage.value = 'Selecciona al menos una unidad.'
    return
  }

  await validateEditUnitsSelection()
  if (editUnitsUnavailableNames.value.length > 0) {
    editUnitsErrorMessage.value = 'Hay unidades sin disponibilidad en el rango actual.'
    return
  }

  editUnitsSaving.value = true

  try {
    const result = await reservationsStore.updateReservationUnits(res.value.id, editUnitsSelection.value)
    await fetchReservation()
    showEditUnitsModal.value = false

    if (result?.syncResult?.synced === false) {
      setFeedback('error', 'Se actualizaron las unidades, pero falló la sincronización de ocupación.')
      return
    }

    setFeedback('success', 'Unidades actualizadas correctamente.')
  } catch (err) {
    editUnitsErrorMessage.value = err.message
  } finally {
    editUnitsSaving.value = false
  }
}

const closePreregistroModal = () => {
  if (preregistroSubmitting.value) return
  showPreregistroModal.value = false
  preregistroErrorMessage.value = ''
}

watch(
  () => editUnitsSelection.value.slice(),
  async () => {
    if (!showEditUnitsModal.value) return
    await validateEditUnitsSelection()
  }
)

const copyPreregistroLink = async () => {
  const { data, error } = await supabase.functions.invoke('generate-preregistro-token', {
    body: {
      reservation_id: res.value.id,
    }
  })

  if (error) {
    setFeedback('error', await parseFunctionError(error))
    return
  }

  const rawPath = String(data?.checkin_url || '')
  const fullUrl = rawPath.startsWith('http') ? rawPath : `${window.location.origin}${rawPath}`

  await navigator.clipboard.writeText(fullUrl)
  toast.success('Link copiado al portapapeles')
}

const handleAdminPreregistroSubmit = async ({ primary_guest, additional_guests }) => {
  preregistroSubmitting.value = true
  preregistroErrorMessage.value = ''

  try {
    const guests = [primary_guest, ...(Array.isArray(additional_guests) ? additional_guests : [])]
    await completeReservationPreregistro({ reservationId: res.value.id, guests })
    await fetchReservation()
    showPreregistroModal.value = false
    toast.success('Pre-registro completado correctamente')
  } catch (error) {
    preregistroErrorMessage.value = error.message
  } finally {
    preregistroSubmitting.value = false
  }
}

const confirmCheckin = async () => {
  if (!res.value?.guest_id) {
    setFeedback('error', 'Debes vincular un huésped registrado antes de marcar la llegada física.')
    return
  }

  checkinSubmitting.value = true

  try {
    const accountId = accountStore.getRequiredAccountId()
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        checkin_at: new Date().toISOString(),
        status: 'in_stay'
      })
      .eq('account_id', accountId)
      .eq('id', res.value.id)

    if (updateError) throw updateError

    const { error: logError } = await supabase
      .from('reservation_status_logs')
      .insert({
        account_id: accountId,
        reservation_id: res.value.id,
        previous_status: res.value.status,
        new_status: 'in_stay',
        notes: 'Check-in físico registrado'
      })

    if (logError) throw logError

    await fetchReservation()
    closeCheckinConfirmModal()
    toast.success('Llegada registrada')
  } catch (error) {
    setFeedback('error', error.message || 'No se pudo registrar la llegada.')
  } finally {
    checkinSubmitting.value = false
  }
}

</script>
