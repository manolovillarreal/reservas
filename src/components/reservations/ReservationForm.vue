<template>
  <div class="max-w-3xl mx-auto">
    <h2 class="mb-6 text-2xl font-bold text-gray-800">Nueva Reserva</h2>

  <form @submit.prevent="submitForm" class="space-y-3 sm:space-y-6">

      <!-- ── 1. Huésped ────────────────────────────────────────── -->
      <AppFormSection title="Huésped" :divider="true" :collapsible="isMobile" :defaultOpen="true">
        <AppSelect
          :modelValue="form.venue_id"
          label="Sede"
          :options="venueOptions"
          placeholder="Seleccionar sede"
          @update:modelValue="handleVenueChange"
        />

        <!-- Linked guest badge -->
        <div v-if="selectedGuest" class="flex items-center gap-3 rounded-lg border border-[#4C2FFF]/20 bg-[#4C2FFF]/5 px-4 py-3">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 shrink-0 text-[#4C2FFF]" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
          </svg>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-[#4C2FFF]">Huésped vinculado</p>
            <p class="truncate text-sm font-medium text-[#111827]">{{ selectedGuest.name }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md border border-[#E5E7EB] px-2 py-1 text-xs text-[#6B7280] transition hover:border-red-300 hover:text-red-600"
            @click="unlinkGuest"
          >
            × Desvincular
          </button>
        </div>

        <!-- Free-form guest name with autocomplete -->
        <div v-else class="relative">
          <AppInput
            v-model="form.guest_name"
            label="Nombre del huésped"
            placeholder="Escribe al menos 3 caracteres"
            :required="true"
            :error="fieldError('guest_name')"
            @focus="showSuggestions = true"
            @blur="onGuestNameBlur"
            >
              <template #suffix>
                <button
                  type="button"
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#4C2FFF] text-white hover:bg-[#3d26cc] transition-colors"
                  title="Crear nuevo huésped"
                  @click.stop="openCreateGuestModal"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                  </svg>
                </button>
              </template>
            </AppInput>
          <div
            v-if="showSuggestions && (autocompleteLoading || guestSuggestions.length > 0)"
            class="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-[#E5E7EB] bg-white shadow-lg"
          >
            <p v-if="autocompleteLoading" class="px-3 py-2 text-sm text-[#6B7280]">Buscando huéspedes...</p>
            <button
              v-for="guest in guestSuggestions"
              :key="guest.id"
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#F8F9FC]"
              @click="selectGuestSuggestion(guest)"
            >
              <span class="font-medium text-[#111827]">{{ guest.name }}</span>
              <span class="text-xs text-[#6B7280]">{{ guest.phone || 'Sin teléfono' }}</span>
            </button>
          </div>
        </div>

        <AppInput
          v-model="form.guest_phone"
          label="Teléfono"
          placeholder="Ej: +57 300 123 4567"
          hint="Opcional"
        />
      </AppFormSection>
      <!-- ── 2. Origen ──────────────────────────────────────────── -->
      <AppFormSection title="Origen" :divider="true" :collapsible="isMobile" :defaultOpen="!isMobile">
        <AppFieldGroup title="Canal de origen" :border="false" :compact="true">
          <SourceSelector
            :modelValue="{ sourceTypeId: form.source_type_id, sourceDetailId: form.source_detail_id }"
            @update:modelValue="updateSourceSelection"
            @suggestions="applySourceSuggestions"
          />
        </AppFieldGroup>

        <AppInput
          v-model="form.commission_name"
          label="Nombre de comisión"
          placeholder="Booking, agencia..."
          hint="Opcional"
        />
          <div class="space-y-1">
            <AppInput
              v-model="form.commission_percentage"
              type="number"
              label="Comisión"
              suffix="%"
              hint="Opcional"
            />
            <AppFieldHint
              v-if="sourceSuggestions.commissionPercentage !== null"
              :message="`Sugerido por ${sourceSuggestions.sourceDetailLabel}: ${sourceSuggestions.commissionPercentage}%`"
              type="hint"
            />
          </div>
        </AppFormSection>
      <!-- ── 3. Fechas y unidad ─────────────────────────────────── -->
      <AppFormSection title="Fechas y unidad" :divider="true" :collapsible="isMobile" :defaultOpen="true">
        <AppFormGrid :columns="2">
          <AppDatePicker
            v-model="form.check_in"
            label="Check-in"
            :error="fieldError('check_in')"
            @update:modelValue="onTouched('check_in')"
          />
          <AppDatePicker
            v-model="form.check_out"
            label="Check-out"
            :error="fieldError('check_out')"
            @update:modelValue="onTouched('check_out')"
          />
        </AppFormGrid>

        <!-- Nights summary -->
        <div v-if="computedNights > 0 && !hasUnavailableConflict" class="flex items-center gap-2 text-sm font-medium text-[#10B981]">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.03-9.28a.75.75 0 10-1.06-1.06L9.25 10.38 8.03 9.16a.75.75 0 10-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.25-3.25z" clip-rule="evenodd" />
          </svg>
          {{ computedNights }} noche{{ computedNights !== 1 ? 's' : '' }} · Fechas disponibles
        </div>
        <div v-else-if="computedNights > 0" class="text-sm text-[#6B7280]">
          {{ computedNights }} noche{{ computedNights !== 1 ? 's' : '' }}
        </div>

        <!-- Overlap alert -->
        <AppInlineAlert
          v-if="hasUnavailableConflict"
          type="error"
          title="Fechas ocupadas"
          :message="conflictMessage"
        />

        <!-- Units field group -->
        <AppFieldGroup title="Unidad(es)" :border="true" :compact="true" :tone="unitFieldError ? 'error' : 'neutral'">
          <div class="mb-3">
            <AppToggle
              v-model="fullHouseEnabled"
              label="Casa completa"
              description="Selecciona automáticamente todas las unidades disponibles"
            />
          </div>
          <div>
            <p v-if="!form.venue_id" class="text-sm text-[#6B7280]">Selecciona una sede para elegir unidades.</p>
            <p v-else-if="availableUnits.length === 0" class="text-sm text-[#6B7280]">No hay unidades activas en esta sede.</p>
            <div v-else class="max-h-52 space-y-2 overflow-y-auto">
              <label
                v-for="unit in availableUnits"
                :key="unit.id"
                class="flex cursor-pointer items-center gap-2 text-sm text-[#111827]"
              >
                <input
                  type="checkbox"
                  :value="unit.id"
                  v-model="form.unit_ids"
                  :disabled="fullHouseEnabled"
                  class="rounded border-[#E5E7EB] text-[#4C2FFF] focus:ring-[#4C2FFF]/30"
                >
                <span>{{ unit.name }}</span>
              </label>
            </div>
          </div>
          <template #footer>
            <p v-if="fullHouseEnabled" class="text-xs text-[#4C2FFF]">
              Full House activo: se seleccionan automáticamente todas las unidades disponibles de la sede en ese rango.
            </p>
            <p v-if="unitFieldError" class="text-xs text-[#EF4444]">{{ unitFieldError }}</p>
          </template>
        </AppFieldGroup>
      </AppFormSection>

      <!-- ── 4. Personas ───────────────────────────────────────── -->
      <AppFormSection title="Personas" :divider="true" :collapsible="isMobile" :defaultOpen="!isMobile">
        <AppFormGrid :columns="2">
          <AppCounter
            v-model="form.adults"
            label="Adultos"
            :min="1"
            :max="99"
          />
          <AppCounter
            v-model="form.children"
            label="Niños"
            :min="0"
            :max="99"
          />
        </AppFormGrid>
        <p class="text-sm text-[#6B7280]">
          Total: <strong class="text-[#111827]">{{ guestsTotal }} persona{{ guestsTotal !== 1 ? 's' : '' }}</strong>
        </p>
      </AppFormSection>

      <!-- ── 5. Precio y comisión ──────────────────────────────── -->
      <AppFormSection title="Precio y comisión" :divider="true" :collapsible="isMobile" :defaultOpen="!isMobile">
          <AppInput
            v-model="form.price_per_night"
            type="number"
            label="Precio por noche"
            prefix="$"
            :required="true"
            :error="fieldError('price_per_night')"
            :hint="suggestedNightlyPrice > 0 ? `Sugerido: $${formatCurrency(suggestedNightlyPrice)}` : ''"
            @blur="onTouched('price_per_night')"
          />

          <div class="space-y-1">
            <AppInput
              v-model="form.discount_percentage"
              type="number"
              label="Descuento"
              suffix="%"
              hint="Opcional"
            />
            <AppFieldHint
              v-if="sourceSuggestions.discountPercentage !== null"
              :message="`Sugerido por ${sourceSuggestions.sourceDetailLabel}: ${sourceSuggestions.discountPercentage}%`"
              type="hint"
            />
          </div>

        <PricingCalculatorPanel
          :checkIn="form.check_in"
          :checkOut="form.check_out"
          :pricePerNight="Number(form.price_per_night || 0)"
          :discountPercentage="Number(form.discount_percentage || 0)"
          :commissionPercentage="Number(form.commission_percentage || 0)"
          :units="form.unit_ids"
          :adults="Number(form.adults || 1)"
          :children="Number(form.children || 0)"
          @update="onCalculatorUpdate"
        />

      </AppFormSection>  
      <!-- ── 6. Notas ───────────────────────────────────────────── -->
      <AppFormSection title="Notas" :divider="false" :collapsible="isMobile" :defaultOpen="!isMobile">
        <AppTextarea
          v-model="form.notes"
          label="Notas internas"
          hint="Solo visibles para el administrador"
          :autoResize="true"
          :rows="2"
        />
      </AppFormSection>

      <AppFormSection
        title="Pago inicial"
        description="Opcional — registrar si el huésped ya realizó un pago"
        :divider="false"
        :collapsible="true"
        :defaultOpen="false"
      >
        <AppInput
          v-model="form.initial_payment_amount"
          type="number"
          prefix="$"
          label="Monto del pago"
          hint="Dejar vacío si no hay pago aún"
        />

        <AppSelect
          v-model="form.initial_payment_method"
          label="Método de pago"
          :options="initialPaymentMethodOptions"
          placeholder="Seleccionar método"
        />

        <AppInput
          v-model="form.initial_payment_reference"
          label="Referencia"
          hint="Número de transferencia u otro ID"
        />

        <AppDatePicker
          v-model="form.initial_payment_date"
          label="Fecha del pago"
        />

        <AppFieldGroup v-if="showInitialPaymentSummary" title="Resumen de pago" :compact="true" :border="true">
          <div class="space-y-1 text-sm text-[#4B5563]">
            <p><span class="font-medium text-[#111827]">Total reserva:</span> ${{ formatCurrency(customerTotal) }}</p>
            <p><span class="font-medium text-[#111827]">Este pago:</span> ${{ formatCurrency(initialPaymentAmount) }}</p>
            <p><span class="font-medium text-[#111827]">Saldo pendiente:</span> ${{ formatCurrency(initialPaymentPendingBalance) }}</p>
          </div>
          <template #footer>
            <AppInlineAlert
              v-if="initialPaymentPendingBalance === 0"
              type="success"
              message="Reserva quedaría saldada ✓"
            />
          </template>
        </AppFieldGroup>
      </AppFormSection>

      <!-- Sync issue alert -->
      <AppInlineAlert
        v-if="syncIssue"
        type="warning"
        title="Reserva creada con problema de sincronización"
        :message="syncIssue.message"
      >
        <template #actions>
          <button
            type="button"
            class="rounded-md border border-current px-3 py-1 text-xs font-medium transition hover:opacity-80"
            @click="retrySync"
          >
            Reintentar
          </button>
          <button
            type="button"
            class="rounded-md border border-current px-3 py-1 text-xs font-medium transition hover:opacity-80"
            @click="openManualOccupancyModal"
          >
            Hacer manualmente
          </button>
        </template>
      </AppInlineAlert>

      <!-- General error -->
      <AppInlineAlert
        v-if="errorMessage"
        type="error"
        :message="errorMessage"
        :dismissible="true"
      />

      <!-- Form footer -->
      <div :class="isMobile ? 'sticky bottom-0 z-20 -mx-4 border-t border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_-6px_18px_rgba(15,23,42,0.06)]' : ''">
        <AppFormActions
          submit-label="Guardar reserva"
          cancel-label="Cancelar"
          :loading="loading"
          :submit-disabled="!canSubmit"
          @submit="submitForm"
          @cancel="router.push('/reservas')"
        />
      </div>
    </form>

    <BaseModal :isOpen="showCreateGuestModal" title="Crear huésped" :fullScreenOnMobile="true" @close="closeCreateGuestModal">
      <form class="space-y-4" @submit.prevent="submitCreateGuest">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre</label>
          <input v-model="newGuestForm.name" type="text" required class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Teléfono</label>
          <input v-model="newGuestForm.phone" type="text" class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input v-model="newGuestForm.email" type="email" class="mt-1 block w-full rounded-md border-gray-300">
        </div>

        <p v-if="newGuestErrorMessage" class="text-sm text-red-600">{{ newGuestErrorMessage }}</p>

        <div class="flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" @click="closeCreateGuestModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="creatingGuest">{{ creatingGuest ? 'Guardando...' : 'Crear huésped' }}</button>
        </div>
      </form>
    </BaseModal>

    <BaseModal :isOpen="showManualOccupancyModal" title="Crear ocupación manual" :fullScreenOnMobile="true" @close="closeManualOccupancyModal">
      <form class="space-y-4" @submit.prevent="submitManualOccupancy">
        <p class="text-sm text-gray-600">Se crearán ocupaciones tipo <strong>reservation</strong> para las unidades seleccionadas.</p>
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha inicio</label>
          <input v-model="manualOccupancy.start_date" type="date" required class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha fin</label>
          <input v-model="manualOccupancy.end_date" type="date" required class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <p v-if="manualOccupancyError" class="text-sm text-red-600">{{ manualOccupancyError }}</p>
        <div class="flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" @click="closeManualOccupancyModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="manualOccupancyLoading">{{ manualOccupancyLoading ? 'Guardando...' : 'Crear ocupación' }}</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReservationsStore } from '../../stores/reservations'
import { supabase } from '../../services/supabase'
import BaseModal from '../ui/BaseModal.vue'
import SourceSelector from '../sources/SourceSelector.vue'
import { useAccountStore } from '../../stores/account'
import { useGuestsStore } from '../../stores/guests'
import { useToast } from '../../composables/useToast'
import { useBreakpoint } from '../../composables/useBreakpoint'
import {
  AppInput, AppSelect, AppTextarea, AppDatePicker,
  AppCounter, AppToggle, AppFieldGroup, AppFormSection,
  AppFormActions, AppInlineAlert, AppFormGrid, AppFieldHint,
  PricingCalculatorPanel
} from '../ui/forms/index.js'

const store = useReservationsStore()
const accountStore = useAccountStore()
const guestsStore = useGuestsStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { isMobile } = useBreakpoint()

const loading = ref(false)
const errorMessage = ref('')
const touched = ref({})
const submitAttempted = ref(false)
const sourceSuggestions = ref({ commissionPercentage: null, discountPercentage: null, sourceDetailLabel: '' })

const venues = ref([])
const units = ref([])
const availableUnits = ref([])
const suggestedPrice = ref(0)
const computedNights = ref(0)

const fullHouseEnabled = ref(false)
const fullHouseUnavailableNames = ref([])
const selectedUnavailableNames = ref([])

const guestSuggestions = ref([])
const autocompleteLoading = ref(false)
const showSuggestions = ref(false)
let autocompleteTimer = null
const selectedGuest = ref(null)

const showCreateGuestModal = ref(false)
const creatingGuest = ref(false)
const newGuestErrorMessage = ref('')
const newGuestForm = ref({ name: '', phone: '', email: '' })
const syncIssue = ref(null)
const lastCreatedReservation = ref(null)
const showManualOccupancyModal = ref(false)
const manualOccupancyLoading = ref(false)
const manualOccupancyError = ref('')
const manualOccupancy = ref({ start_date: '', end_date: '' })

const form = ref({
  venue_id: '',
  unit_ids: [],
  guest_id: null,
  guest_name: '',
  guest_phone: '',
  check_in: '',
  check_out: '',
  price_per_night: '',
  total_amount: '',
  paid_amount: 0,
  status: 'confirmed',
  source: 'whatsapp',
  source_type_id: '',
  source_detail_id: '',
  adults: 1,
  children: 0,
  commission_name: '',
  commission_percentage: '',
  discount_percentage: '',
  initial_payment_amount: '',
  initial_payment_method: 'efectivo',
  initial_payment_reference: '',
  initial_payment_date: normalizeDate(new Date()),
  notes: '',
  inquiry_id: null
})

const subtotalAmount = computed(() => Number(form.value.price_per_night || 0) * Number(computedNights.value || 0))
const discountAmount = computed(() => {
  return subtotalAmount.value * Number(form.value.discount_percentage || 0) / 100
})
const customerTotal = computed(() => Math.max(subtotalAmount.value - discountAmount.value, 0))
const commissionAmount = computed(() => {
  return customerTotal.value * Number(form.value.commission_percentage || 0) / 100
})
const netAmount = computed(() => Math.max(customerTotal.value - commissionAmount.value, 0))
const initialPaymentAmount = computed(() => Number(form.value.initial_payment_amount || 0))
const initialPaymentPendingBalance = computed(() => Math.max(Number(customerTotal.value || 0) - initialPaymentAmount.value, 0))
const showInitialPaymentSummary = computed(() => initialPaymentAmount.value > 0)

const initialPaymentMethodOptions = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'plataforma', label: 'Plataforma' },
]

function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return trimmed.slice(0, 10)
}

const onTouched = (field) => {
  touched.value[field] = true
}

const onGuestNameBlur = () => {
  onTouched('guest_name')
  setTimeout(() => { showSuggestions.value = false }, 200)
}

const unlinkGuest = () => {
  selectedGuest.value = null
  form.value.guest_id = null
}

const handleVenueChange = async (newVenueId) => {
  form.value.venue_id = newVenueId
  await onVenueChange()
}

const onCalculatorUpdate = (_calcs) => {
  // total_amount is already synced via the watch on price_per_night/nights/discount
}

const getAccountId = () => accountStore.getRequiredAccountId()

const isDateRangeValid = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return false
  return new Date(form.value.check_in) < new Date(form.value.check_out)
})

const canSubmit = computed(() => {
  const hasGuestReference = !!form.value.guest_name?.trim()
  const hasUnits = form.value.unit_ids.length > 0
  const hasAmounts = Number(form.value.price_per_night) >= 0
  const hasNoSelectedConflicts = selectedUnavailableNames.value.length === 0
  const fullHouseReady = !fullHouseEnabled.value || fullHouseUnavailableNames.value.length === 0

  return hasGuestReference && hasUnits && hasAmounts && hasNoSelectedConflicts && fullHouseReady && isDateRangeValid.value
})

const suggestedNightlyPrice = computed(() => {
  if (computedNights.value <= 0) return 0
  return Number(suggestedPrice.value || 0) / computedNights.value
})

const guestsTotal = computed(() => Number(form.value.adults || 0) + Number(form.value.children || 0))

const amountPerUnit = computed(() => {
  const unitCount = Number(form.value.unit_ids.length || 0)
  if (unitCount <= 0) return 0
  return Number(customerTotal.value || 0) / unitCount
})

const amountPerGuest = computed(() => {
  const totalGuests = guestsTotal.value
  if (totalGuests <= 0) return 0
  return Number(customerTotal.value || 0) / totalGuests
})

const showCalculationPanel = computed(() => {
  return computedNights.value > 0 && form.value.price_per_night !== '' && form.value.price_per_night !== null
})

const venueOptions = computed(() => venues.value.map(v => ({ value: v.id, label: v.name })))

const hasUnavailableConflict = computed(() =>
  selectedUnavailableNames.value.length > 0 || fullHouseUnavailableNames.value.length > 0
)

const conflictMessage = computed(() => {
  const names = [...new Set([...selectedUnavailableNames.value, ...fullHouseUnavailableNames.value])]
  return `Unidades no disponibles en el rango seleccionado: ${names.join(', ')}.`
})

const unitFieldError = computed(() => {
  if ((touched.value.unit_ids || submitAttempted.value) && form.value.unit_ids.length === 0 && form.value.venue_id) {
    return 'Selecciona al menos una unidad'
  }
  return ''
})

const fieldError = (field) => {
  if (!touched.value[field] && !submitAttempted.value) return ''
  switch (field) {
    case 'guest_name':
      if (!form.value.guest_id && !form.value.guest_name?.trim()) return 'El nombre del huésped es requerido'
      return ''
    case 'check_in':
      return !form.value.check_in ? 'La fecha de check-in es requerida' : ''
    case 'check_out':
      if (!form.value.check_out) return 'La fecha de check-out es requerida'
      if (form.value.check_in && !isDateRangeValid.value) return 'El check-out debe ser posterior al check-in'
      return ''
    case 'price_per_night':
      if (form.value.price_per_night === '' || form.value.price_per_night === null) {
        return 'El precio por noche es requerido'
      }
      return ''
    default:
      return ''
  }
}

const syncReservationAmounts = () => {
  form.value.total_amount = customerTotal.value
}

const loadInquiryPrefill = async () => {
  const inquiryId = route.query.inquiryId
  if (!inquiryId) return

  const accountId = getAccountId()

  const { data, error } = await supabase
    .from('inquiries')
    .select('*, inquiry_units(unit_id)')
    .eq('account_id', accountId)
    .eq('id', inquiryId)
    .single()

  if (error || !data) return

  form.value.inquiry_id = data.id
  form.value.guest_name = data.guest_name || ''
  form.value.guest_phone = data.guest_phone || ''
  form.value.check_in = data.check_in || ''
  form.value.check_out = data.check_out || ''
  form.value.adults = Number(data.adults || data.guests_count || 1)
  form.value.children = Number(data.children || 0)
  form.value.price_per_night = data.price_per_night != null ? Number(data.price_per_night) : form.value.price_per_night
  form.value.source_type_id = data.source_type_id || ''
  form.value.source_detail_id = data.source_detail_id || ''
  form.value.source = data.source || 'whatsapp'
  form.value.commission_name = data.commission_name || ''
  form.value.commission_percentage = data.commission_percentage != null ? Number(data.commission_percentage) : ''
  form.value.discount_percentage = data.discount_percentage != null ? Number(data.discount_percentage) : ''
  form.value.status = 'confirmed'

  const inquiryUnitIds = (data.inquiry_units || []).map((row) => row.unit_id).filter(Boolean)
  if (inquiryUnitIds.length > 0) {
    const matchedUnit = units.value.find((unit) => inquiryUnitIds.includes(unit.id))
    if (matchedUnit?.venue_id) {
      form.value.venue_id = matchedUnit.venue_id
      await onVenueChange({ preserveUnits: true })
    }

    form.value.unit_ids = inquiryUnitIds.filter((unitId) => availableUnits.value.some((unit) => unit.id === unitId))
  }
}

onMounted(async () => {
  const accountId = getAccountId()
  const [{ data: venueData }, { data: unitData }] = await Promise.all([
    supabase.from('venues').select('id, name, is_active').eq('account_id', accountId).eq('is_active', true),
    supabase.from('units').select('id, venue_id, name, is_active').eq('account_id', accountId).eq('is_active', true)
  ])

  venues.value = venueData || []
  units.value = unitData || []

  if (venues.value.length > 0) {
    form.value.venue_id = venues.value[0].id
    onVenueChange()
  }

  await loadInquiryPrefill()
  await calculateDetails()
})

onBeforeUnmount(() => {
  if (autocompleteTimer) {
    clearTimeout(autocompleteTimer)
    autocompleteTimer = null
  }
})

const onVenueChange = async (options = {}) => {
  const preserveUnits = options?.preserveUnits === true
  availableUnits.value = units.value.filter(unit => unit.venue_id === form.value.venue_id)

  if (!fullHouseEnabled.value && !preserveUnits) {
    form.value.unit_ids = []
  }

  await calculateDetails()

  if (fullHouseEnabled.value) {
    await applyFullHouseSelection()
  }
}

const evaluateSelectedUnitAvailability = async () => {
  selectedUnavailableNames.value = []

  if (!form.value.check_in || !form.value.check_out || form.value.unit_ids.length === 0) return

  const availability = await store.getUnitAvailability(form.value.unit_ids, form.value.check_in, form.value.check_out)
  if (availability.unavailableUnitIds.length === 0) return

  selectedUnavailableNames.value = availableUnits.value
    .filter(unit => availability.unavailableUnitIds.includes(unit.id))
    .map(unit => unit.name)
}

const applyFullHouseSelection = async () => {
  fullHouseUnavailableNames.value = []

  if (!fullHouseEnabled.value) return
  if (!form.value.check_in || !form.value.check_out || !form.value.venue_id) return

  const allUnitIds = availableUnits.value.map(unit => unit.id)
  if (allUnitIds.length === 0) return

  const availability = await store.getUnitAvailability(allUnitIds, form.value.check_in, form.value.check_out)
  const unavailableSet = new Set(availability.unavailableUnitIds)

  form.value.unit_ids = allUnitIds.filter(unitId => !unavailableSet.has(unitId))

  fullHouseUnavailableNames.value = availableUnits.value
    .filter(unit => unavailableSet.has(unit.id))
    .map(unit => unit.name)

  await evaluateSelectedUnitAvailability()
}

const calculateDetails = async () => {
  if (!form.value.check_in || !form.value.check_out || !isDateRangeValid.value) {
    computedNights.value = 0
    suggestedPrice.value = 0
    await evaluateSelectedUnitAvailability()
    return
  }

  const inDate = new Date(form.value.check_in)
  const outDate = new Date(form.value.check_out)
  const diffDays = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24))

  computedNights.value = diffDays

  if (form.value.unit_ids.length === 0) {
    suggestedPrice.value = 0
    await evaluateSelectedUnitAvailability()
    return
  }

  try {
    const accountId = getAccountId()
    const seasonRequests = form.value.unit_ids.map(unitId =>
      supabase
        .from('pricing_seasons')
        .select('price_per_night')
        .eq('account_id', accountId)
        .eq('unit_id', unitId)
        .lte('start_date', form.value.check_in)
        .gte('end_date', form.value.check_in)
        .limit(1)
        .maybeSingle()
    )

    const seasonResults = await Promise.all(seasonRequests)
    const nightlyTotal = seasonResults.reduce((sum, result) => {
      if (result.error || !result.data) return sum
      return sum + Number(result.data.price_per_night)
    }, 0)

    suggestedPrice.value = nightlyTotal * diffDays
    if (!form.value.price_per_night) {
      form.value.price_per_night = nightlyTotal
    }
  } catch (err) {
    console.error(err)
  }

  syncReservationAmounts()

  await evaluateSelectedUnitAvailability()
}

watch(
  () => [form.value.price_per_night, computedNights.value, form.value.discount_percentage],
  () => {
    syncReservationAmounts()
  }
)

watch(
  () => [form.value.check_in, form.value.check_out],
  async () => {
    await calculateDetails()
    if (fullHouseEnabled.value) {
      await applyFullHouseSelection()
    }
  }
)

watch(
  () => form.value.unit_ids.slice(),
  async () => {
    await evaluateSelectedUnitAvailability()
  }
)

watch(fullHouseEnabled, async (enabled) => {
  if (enabled) {
    await applyFullHouseSelection()
    return
  }

  fullHouseUnavailableNames.value = []
  await evaluateSelectedUnitAvailability()
})

const searchGuestSuggestions = async (query) => {
  const accountId = getAccountId()
  autocompleteLoading.value = true
  const { data } = await supabase
    .from('guests')
    .select('id, name, phone')
    .eq('account_id', accountId)
    .ilike('name', `${query}%`)
    .limit(5)

  guestSuggestions.value = data || []
  autocompleteLoading.value = false
}

watch(
  () => form.value.guest_name,
  (name) => {
    if (selectedGuest.value && selectedGuest.value.name !== name) {
      form.value.guest_id = null
      selectedGuest.value = null
    }

    if (autocompleteTimer) {
      clearTimeout(autocompleteTimer)
      autocompleteTimer = null
    }

    const query = (name || '').trim()
    if (query.length < 3) {
      guestSuggestions.value = []
      return
    }

    autocompleteTimer = setTimeout(() => {
      searchGuestSuggestions(query)
    }, 400)
  }
)

const selectGuestSuggestion = (guest) => {
  selectedGuest.value = guest
  form.value.guest_id = guest.id
  form.value.guest_name = guest.name
  form.value.guest_phone = guest.phone || form.value.guest_phone
  guestSuggestions.value = []
  showSuggestions.value = false
}

const openCreateGuestModal = () => {
  newGuestForm.value = { name: form.value.guest_name || '', phone: form.value.guest_phone || '', email: '' }
  newGuestErrorMessage.value = ''
  showCreateGuestModal.value = true
}

const closeCreateGuestModal = () => {
  if (creatingGuest.value) return
  showCreateGuestModal.value = false
}

const updateSourceSelection = (value) => {
  form.value.source_type_id = value?.sourceTypeId || ''
  form.value.source_detail_id = value?.sourceDetailId || ''

  if (!form.value.source_detail_id) {
    form.value.source = null
  }
}

const applySourceSuggestions = (payload) => {
  form.value.source = payload.sourceDetailName || payload.sourceDetailLabel || null

  if (!String(form.value.commission_name || '').trim()) {
    form.value.commission_name = payload.sourceDetailLabel || ''
  }

  if (form.value.commission_percentage === '' || form.value.commission_percentage === null) {
    form.value.commission_percentage = Number(payload.commissionPercentage || 0)
  }

  if (form.value.discount_percentage === '' || form.value.discount_percentage === null) {
    form.value.discount_percentage = Number(payload.discountPercentage || 0)
  }

  sourceSuggestions.value = {
    commissionPercentage: Number(payload.commissionPercentage || 0),
    discountPercentage: Number(payload.discountPercentage || 0),
    sourceDetailLabel: payload.sourceDetailLabel || ''
  }
}

const submitCreateGuest = async () => {
  creatingGuest.value = true
  newGuestErrorMessage.value = ''

  try {
    const payload = {
      name: newGuestForm.value.name?.trim(),
      phone: newGuestForm.value.phone?.trim() || null,
      email: newGuestForm.value.email?.trim() || null,
    }

    if (!payload.name && !payload.phone && !payload.email) {
      throw new Error('El nombre del huésped es obligatorio.')
    }

    const guest = await guestsStore.getOrCreateGuestByPhone(payload)
    if (!guest?.id) {
      throw new Error('No se pudo crear o vincular el huésped.')
    }

    selectGuestSuggestion(guest)
    showCreateGuestModal.value = false
  } catch (err) {
    newGuestErrorMessage.value = err.message
  } finally {
    creatingGuest.value = false
  }
}

const submitForm = async () => {
  submitAttempted.value = true
  loading.value = true
  errorMessage.value = ''
  syncIssue.value = null

  try {
    if (!canSubmit.value) {
      throw new Error('Completa los campos requeridos y corrige conflictos de disponibilidad antes de continuar.')
    }

    const payload = {
      ...form.value,
      guest_name: form.value.guest_name?.trim() || null,
      guest_phone: form.value.guest_phone?.trim() || null,
      check_in: normalizeDate(form.value.check_in),
      check_out: normalizeDate(form.value.check_out),
      adults: Number(form.value.adults || 1),
      children: Number(form.value.children || 0),
      price_per_night: Number(form.value.price_per_night || 0),
      total_amount: Number(customerTotal.value || 0),
      paid_amount: 0,
      commission_percentage: form.value.commission_percentage === '' ? null : Number(form.value.commission_percentage || 0),
      discount_percentage: form.value.discount_percentage === '' ? 0 : Number(form.value.discount_percentage || 0)
    }

    const initialPaymentData = {
      amount: Number(form.value.initial_payment_amount || 0),
      method: form.value.initial_payment_method || 'efectivo',
      reference: form.value.initial_payment_reference?.trim() || null,
      payment_date: normalizeDate(form.value.initial_payment_date) || normalizeDate(new Date()),
    }

    if (!payload.check_in || !payload.check_out) {
      throw new Error('Debes indicar fechas válidas para Check-in y Check-out.')
    }

    const createdReservation = await store.createReservationWithPayment(payload, initialPaymentData)
    lastCreatedReservation.value = createdReservation

    if (createdReservation?.syncResult?.synced === false) {
      syncIssue.value = {
        reservationId: createdReservation.id,
        message: createdReservation.syncResult.error || 'No se pudo sincronizar la ocupación.'
      }
      manualOccupancy.value = {
        start_date: payload.check_in,
        end_date: payload.check_out
      }
      toast.warning('Reserva creada, pero la ocupación no se pudo sincronizar. Usa Reintentar.')
      return
    }

    if (createdReservation?.hadInitialPayment) {
      toast.success('Reserva creada con pago inicial ✓')
    } else {
      toast.success('Reserva creada correctamente')
    }

    router.push(`/reservas/${createdReservation.id}`)
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
}

const retrySync = async () => {
  if (!syncIssue.value?.reservationId) return

  const result = await store.retryReservationOccupancySync(syncIssue.value.reservationId)
  if (result.synced) {
    router.push(`/reservas/${syncIssue.value.reservationId}`)
    return
  }

  syncIssue.value = {
    reservationId: syncIssue.value.reservationId,
    message: result.error || 'Falló nuevamente la sincronización.'
  }
}

const openManualOccupancyModal = () => {
  manualOccupancyError.value = ''
  showManualOccupancyModal.value = true
}

const closeManualOccupancyModal = () => {
  if (manualOccupancyLoading.value) return
  showManualOccupancyModal.value = false
}

const submitManualOccupancy = async () => {
  manualOccupancyLoading.value = true
  manualOccupancyError.value = ''

  try {
    const accountId = getAccountId()
    if (!syncIssue.value?.reservationId) {
      throw new Error('No hay reserva asociada para crear ocupación manual.')
    }

    const startDate = normalizeDate(manualOccupancy.value.start_date)
    const endDate = normalizeDate(manualOccupancy.value.end_date)

    if (!startDate || !endDate || new Date(startDate) >= new Date(endDate)) {
      throw new Error('Las fechas de ocupación manual son inválidas.')
    }

    const payload = form.value.unit_ids.map(unitId => ({
      account_id: accountId,
      unit_id: unitId,
      start_date: startDate,
      end_date: endDate,
      occupancy_type: 'reservation',
      reservation_id: syncIssue.value.reservationId,
      notes: 'Creada manualmente desde formulario'
    }))
    await supabase.from('occupancies').insert(payload)
  } finally {
    manualOccupancyLoading.value = false
  }
}

const formatCurrency = (value) => Number(value || 0).toLocaleString('es-CO')
</script>
