<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    
    <!-- Top Nav Actions -->
    <div class="flex items-center justify-between">
      <router-link to="/reservas" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Volver a Reservas
      </router-link>
      <div class="flex items-center gap-3">
        <button v-if="can('reservations', 'edit')" class="btn-secondary text-sm" @click="copyPreregistroLink">Copiar link pre-registro</button>
        <button v-if="can('reservations', 'edit')" class="btn-secondary text-sm" @click="showPreregistroModal = true">Completar pre-registro</button>
        <button v-if="can('reservations', 'checkin')" class="btn-secondary text-sm" @click="registerArrival">Registrar llegada</button>
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
              <p class="font-medium text-gray-900 capitalize">{{ res.source }}</p>
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
        <div v-if="canViewFinancial" class="card">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Historial de Pagos</h2>
            <button v-if="can('payments', 'create')" class="text-sm font-medium text-indigo-600 hover:text-indigo-800" @click="openPaymentModal">+ Registrar Pago</button>
          </div>
          
          <div v-if="payments.length === 0" class="text-center py-6 text-gray-500 text-sm italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
            Aún no hay pagos registrados para esta reserva.
          </div>
          
          <table v-else class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th class="py-2 px-3">Fecha</th>
                <th class="py-2 px-3">Monto</th>
                <th class="py-2 px-3">Método</th>
                <th class="py-2 px-3">Referencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 text-sm">
              <tr v-for="p in payments" :key="p.id">
                <td class="py-3 px-3 text-gray-900">{{ formatDate(p.payment_date) }}</td>
                <td class="py-3 px-3 font-medium text-gray-900">${{ formatCurrency(p.amount) }}</td>
                <td class="py-3 px-3 text-gray-500 capitalize">{{ p.method }}</td>
                <td class="py-3 px-3 text-gray-500">{{ p.reference || '-' }}</td>
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

        <!-- Guest Card -->
        <div class="card">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Pre-registro</h2>
          <div class="space-y-2 text-sm text-gray-600">
            <p>Estado: <span class="font-medium text-gray-900">{{ res.preregistro_completado ? 'Completado' : 'Pendiente' }}</span></p>
            <p>Fecha: <span class="font-medium text-gray-900">{{ res.preregistro_completado_at ? formatDate(res.preregistro_completado_at) : 'Sin completar' }}</span></p>
            <p>Llegada física: <span class="font-medium text-gray-900">{{ res.checkin_at ? formatDateTime(res.checkin_at) : 'No registrada' }}</span></p>
          </div>
          <div class="mt-4 grid gap-2">
            <button class="w-full rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100" @click="copyPreregistroLink">
              Copiar link
            </button>
            <button class="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200" @click="showPreregistroModal = true">
              Completar desde admin
            </button>
            <button class="w-full rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100" @click="registerArrival">
              Registrar llegada física
            </button>
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
        :initialGuests="initialPreregistroGuests"
        :loading="preregistroSubmitting"
        :errorMessage="preregistroErrorMessage"
        submitLabel="Guardar pre-registro"
        @submit="handleAdminPreregistroSubmit"
      />
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
import PreRegistroForm from '../components/preregistro/PreRegistroForm.vue'
import { completeReservationPreregistro } from '../services/preregistro'
import { getCommissionSummary, getReservationGuestName, getReservationGuestPhone } from '../utils/reservations'
import { usePermissions } from '../composables/usePermissions'
import { useAccountStore } from '../stores/account'

const route = useRoute()
const router = useRouter()
const reservationsStore = useReservationsStore()
const accountStore = useAccountStore()
const { can } = usePermissions()
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

onMounted(async () => {
  await fetchReservation()
})

const fetchReservation = async () => {
  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('reservations')
      .select('*, guests!reservations_guest_id_fkey(*), venues(name), reservation_units(unit_id, units(*)), reservation_guests(is_primary, guest_id, guests!reservation_guests_guest_id_fkey(*))')
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
    nationality: '',
    document_type: '',
    document_number: ''
  }]
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
const openPaymentModal = () => { console.log('Abrir modal de pagos') }
const openStatusModal = () => { console.log('Abrir modal de estado') }
const openCancelModal = () => { console.log('Abrir modal de cancelacion') }
const openVoucher = () => {
  if (!res.value?.id) return
  router.push(`/reservas/${res.value.id}/voucher`)
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
      base_url: window.location.origin,
    }
  })

  if (error) {
    setFeedback('error', await parseFunctionError(error))
    return
  }

  await navigator.clipboard.writeText(data.url)
  setFeedback('success', 'Link de pre-registro copiado al portapapeles.')
}

const handleAdminPreregistroSubmit = async ({ guests }) => {
  preregistroSubmitting.value = true
  preregistroErrorMessage.value = ''

  try {
    await completeReservationPreregistro({ reservationId: res.value.id, guests })
    await fetchReservation()
    showPreregistroModal.value = false
    setFeedback('success', 'Pre-registro completado correctamente.')
  } catch (error) {
    preregistroErrorMessage.value = error.message
  } finally {
    preregistroSubmitting.value = false
  }
}

const registerArrival = async () => {
  if (!res.value?.guest_id) {
    setFeedback('error', 'Debes vincular un huésped registrado antes de marcar la llegada física.')
    return
  }

  const accountId = accountStore.getRequiredAccountId()
  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      checkin_at: new Date().toISOString(),
      status: 'in_stay'
    })
    .eq('account_id', accountId)
    .eq('id', res.value.id)

  if (updateError) {
    setFeedback('error', updateError.message)
    return
  }

  await supabase.from('reservation_status_logs').insert({
    account_id: accountId,
    reservation_id: res.value.id,
    previous_status: res.value.status,
    new_status: 'in_stay',
    notes: 'Registro de llegada física'
  })

  await fetchReservation()
  setFeedback('success', 'Llegada física registrada correctamente.')
}

</script>
