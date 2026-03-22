<template>
  <div :class="inModal ? 'space-y-6' : 'space-y-6 max-w-2xl mx-auto'">

    <!-- Step progress indicator (pasos 1–4) -->
    <nav class="flex items-center gap-1 text-sm" aria-label="Pasos del formulario">
      <template v-for="(step, i) in navSteps" :key="step.n">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded px-2 py-1 transition-colors"
          :class="stepButtonClass(step.n)"
          :disabled="step.n > maxReachedStep"
          @click="goToStep(step.n)"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            :class="stepCircleClass(step.n)"
          >{{ step.n }}</span>
          <span class="hidden sm:inline">{{ step.label }}</span>
        </button>
        <span v-if="i < navSteps.length - 1" class="text-gray-300">›</span>
      </template>
    </nav>

    <!-- ── STEP 1: Fechas ─────────────────────────── -->
    <template v-if="currentStep === 1">
      <p v-if="props.initialCheckIn && props.initialCheckOut" class="text-xs text-gray-400 rounded border border-gray-200 bg-gray-50 px-3 py-2">
        📅 Pre-cargado desde el widget – puedes ajustar antes de continuar.
      </p>

      <AppFormSection title="Fechas y personas" :divider="true">
        <AppFormGrid :columns="2">
          <AppDatePicker
            v-model="form.check_in"
            label="Check-in"
            :min="todayIso"
            :error="s1Touched.check_in && !form.check_in ? 'Requerido' : ''"
            @blur="s1Touched.check_in = true"
            @update:modelValue="onDatesChange"
          />
          <AppDatePicker
            v-model="form.check_out"
            label="Check-out"
            :min="form.check_in || todayIso"
            :error="s1Touched.check_out ? checkOutError : ''"
            @blur="s1Touched.check_out = true"
            @update:modelValue="onDatesChange"
          />
        </AppFormGrid>

        <AppFormGrid :columns="2">
          <AppCounter v-model="form.adults" label="Adultos" :min="1" :max="20" />
          <AppCounter v-model="form.children" label="Niños" :min="0" :max="20" />
        </AppFormGrid>

        <p class="text-sm text-gray-500">
          Total de personas: <strong class="text-gray-900">{{ totalPersonas }}</strong>
        </p>
      </AppFormSection>

      <!-- Availability results (post-check) -->
      <template v-if="avail.checked && !avail.loading">
        <AppInlineAlert
          v-if="avail.available.length === 0"
          type="warning"
          message="No hay unidades disponibles para ese rango y número de personas."
        />
        <p v-else class="text-sm font-semibold text-emerald-700">
          ✓ {{ avail.available.length }} {{ avail.available.length === 1 ? 'unidad disponible' : 'unidades disponibles' }}
        </p>
      </template>

      <AppInlineAlert v-if="avail.error" type="error" :message="avail.error" />

      <div class="flex items-center gap-3">
        <button
          type="button"
          class="btn-primary"
          :disabled="!canProceedStep1 || avail.loading"
          @click="advanceStep1"
        >
          {{ avail.loading ? 'Verificando…' : 'Continuar' }}
        </button>
      </div>
    </template>

    <!-- ── STEP 2: Sede ──────────────────────────── -->
    <template v-if="currentStep === 2">
      <AppFormSection title="¿En qué sede?" :divider="true">
        <div class="space-y-2">
          <label
            v-for="venue in availableVenues"
            :key="venue.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
            :class="form.venue_id === venue.id ? 'border-primary/40 bg-primary/5' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input type="radio" :value="venue.id" v-model="form.venue_id" class="accent-primary" />
            <div>
              <p class="font-medium text-gray-900 text-sm">{{ venue.name }}</p>
              <p class="text-xs text-gray-400">{{ venue.count }} {{ venue.count === 1 ? 'unidad disponible' : 'unidades disponibles' }}</p>
            </div>
          </label>
        </div>
      </AppFormSection>

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="goToStep(1)">Atrás</button>
        <button type="button" class="btn-primary" :disabled="!form.venue_id" @click="goToStep(3)">Continuar</button>
      </div>
    </template>

    <!-- ── STEP 3: Huésped ──────────────────────── -->
    <template v-if="currentStep === 3">
      <AppFormSection title="Datos del huésped" :divider="true">
        <!-- Guest selected chip -->
        <div v-if="form.guest_id" class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span class="font-medium text-primary">{{ form.guest_name }}</span>
          <span v-if="form.guest_phone" class="text-gray-400">· {{ form.guest_phone }}</span>
          <button type="button" class="ml-auto text-xs text-gray-400 underline hover:text-gray-700" @click="clearGuestSelection">Cambiar</button>
        </div>

        <!-- Guest search (only when no guest selected) -->
        <div v-else class="relative">
          <AppInput
            v-model="guestSearchQuery"
            label="Buscar huésped existente"
            hint="Escribe nombre o teléfono (mín. 2 caracteres)"
            @focus="guestSearchOpen = true"
            @blur="() => setTimeout(() => { guestSearchOpen = false }, 150)"
          />
          <div
            v-if="guestSearchOpen && guestSearchResults.length > 0"
            class="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <button
              v-for="g in guestSearchResults"
              :key="g.id"
              type="button"
              class="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              @click="selectGuest(g)"
            >
              <span class="font-medium text-gray-900">{{ g.name }}</span>
              <span class="text-xs text-gray-400">{{ g.phone || 'Sin teléfono' }}<span v-if="g.email"> · {{ g.email }}</span></span>
            </button>
          </div>
        </div>

        <AppFormGrid :columns="2">
          <AppInput
            v-model="form.guest_name"
            label="Nombre"
            required
            :disabled="!!form.guest_id"
            :error="s3Touched.guest_name && !form.guest_name?.trim() ? 'El nombre es obligatorio.' : ''"
            @blur="s3Touched.guest_name = true"
          />
          <AppInput
            v-model="form.guest_phone"
            label="Teléfono"
            :disabled="!!form.guest_id"
            :error="s3Touched.guest_phone && !form.guest_phone?.trim() ? 'El teléfono es obligatorio.' : ''"
            @blur="s3Touched.guest_phone = true"
          />
        </AppFormGrid>

        <AppInput
          v-model="form.guest_email"
          label="Email"
          type="email"
          hint="Opcional"
          :disabled="!!form.guest_id"
        />

        <AppTextarea
          v-model="form.notes"
          label="Notas internas"
          :rows="2"
          :autoResize="true"
          hint="Opcional"
        />
      </AppFormSection>

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="prevFromStep3">Atrás</button>
        <button type="button" class="btn-primary" :disabled="!canProceedStep3" @click="advanceToStep4">Continuar</button>
      </div>
    </template>

    <!-- ── STEP 4: Origen ───────────────────────── -->
    <template v-if="currentStep === 4">
      <AppFormSection title="Canal de origen" :divider="true">
        <SourceSelector
          :modelValue="{ sourceTypeId: form.source_type_id, sourceDetailId: form.source_detail_id }"
          @update:modelValue="onSourceChange"
          @suggestions="onSourceSuggestions"
        />
        <p v-if="s4Touched.source_type_id && sourceRequired" class="mt-1 text-sm text-red-600">El canal de origen es obligatorio.</p>
        <div v-if="Number(form.commission_percentage) > 0" class="mt-2 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Comisión sugerida: {{ form.commission_percentage }}%
        </div>
      </AppFormSection>

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="goToStep(3)">Atrás</button>
        <button type="button" class="btn-primary" @click="advanceStep4">Continuar</button>
      </div>
    </template>

    <!-- ── STEP 5: Paneles ──────────────────────── -->
    <template v-if="currentStep === 5">
      <!-- Mini resumen -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-0.5">
        <p><strong class="text-gray-900">{{ form.guest_name }}</strong><span v-if="form.guest_phone" class="ml-2 text-gray-500">{{ form.guest_phone }}</span></p>
        <p>{{ form.check_in }} → {{ form.check_out }}<span v-if="nights > 0" class="ml-2 text-gray-400">({{ nights }} noches)</span> · {{ totalPersonas }} personas</p>
        <p v-if="venueName" class="text-gray-500">{{ venueName }}</p>
        <p v-if="form.commission_name || form.source_type_id" class="text-gray-500">Canal: {{ form.commission_name || form.source_type_id }}</p>
        <button type="button" class="mt-1 text-xs text-primary underline" @click="goToStep(1)">Editar</button>
      </div>

      <p class="text-xs text-gray-400">Sin pago registrado → se guarda como consulta. Con pago → se crea como reserva confirmada (requiere unidad y precio).</p>

      <!-- Panel: Selección de unidad -->
      <div class="rounded-lg border border-gray-200">
        <button type="button" class="flex w-full items-center justify-between p-4 text-left" @click="togglePanel('unit')">
          <span class="text-sm font-medium text-gray-900">Selección de unidad</span>
          <svg class="h-4 w-4 text-gray-400 transition-transform" :class="panels.unit ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div v-if="panels.unit" class="border-t border-gray-100 px-4 pb-4 pt-3 space-y-1">
          <label
            v-for="unit in availableUnitsForVenue"
            :key="unit.id"
            class="flex cursor-pointer items-center gap-2 rounded border border-transparent px-2 py-1.5 text-sm hover:bg-gray-50"
            :class="form.unit_ids.includes(unit.id) ? 'border-primary/30 bg-primary/5' : ''"
          >
            <input type="checkbox" :value="unit.id" v-model="form.unit_ids" class="rounded border-gray-300" />
            <span class="font-medium">{{ unit.name }}</span>
            <span class="text-xs text-gray-400">· hasta {{ unit.capacity }} pers.</span>
          </label>
          <p v-if="availableUnitsForVenue.length === 0" class="text-sm text-gray-400">No hay unidades para esta selección.</p>
        </div>
      </div>

      <!-- Panel: Detalle y precio -->
      <div class="rounded-lg border border-gray-200">
        <button type="button" class="flex w-full items-center justify-between p-4 text-left" @click="togglePanel('price')">
          <span class="text-sm font-medium text-gray-900">Detalle y precio</span>
          <svg class="h-4 w-4 text-gray-400 transition-transform" :class="panels.price ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div v-if="panels.price" class="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          <AppInput v-model="form.price_per_night" type="number" label="Precio por noche" prefix="$" hint="Opcional" />
          <AppFormGrid :columns="2">
            <AppInput v-model="form.discount_percentage" type="number" label="Descuento" suffix="%" hint="Opcional" />
            <AppInput v-model="form.commission_percentage" type="number" label="Comisión" suffix="%" hint="Opcional" />
          </AppFormGrid>
          <AppDatePicker v-model="form.quote_expires_at" label="Cotización válida hasta" hint="Opcional" />
          <PricingCalculatorPanel
            :checkIn="form.check_in"
            :checkOut="form.check_out"
            :pricePerNight="Number(form.price_per_night || 0)"
            :discountPercentage="Number(form.discount_percentage || 0)"
            :commissionPercentage="Number(form.commission_percentage || 0)"
            :adults="form.adults"
            :children="form.children"
          />
        </div>
      </div>

      <!-- Panel: Registro de pago -->
      <div class="rounded-lg border border-gray-200">
        <button type="button" class="flex w-full items-center justify-between p-4 text-left" @click="togglePanel('payment')">
          <span class="text-sm font-medium text-gray-900">Registro de pago</span>
          <svg class="h-4 w-4 text-gray-400 transition-transform" :class="panels.payment ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div v-if="panels.payment" class="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          <AppFormGrid :columns="2">
            <AppInput
              v-model="payment.amount"
              type="number"
              label="Monto abonado"
              prefix="$"
              hint="Vacío = guardar como consulta"
            />
            <AppSelect v-model="payment.method" label="Método" :options="PAYMENT_METHOD_OPTIONS" />
          </AppFormGrid>
          <AppInput v-model="payment.reference" label="Referencia" hint="Opcional" />
          <AppDatePicker v-model="payment.payment_date" label="Fecha de pago" />
          <AppDatePicker v-model="form.payment_deadline" label="Límite de pago" hint="Opcional" />
        </div>
      </div>

      <AppInlineAlert v-if="reservationValidationError" type="error" :message="reservationValidationError" />
      <AppInlineAlert v-if="submitError" type="error" :message="submitError" />

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="prevFromPanels">Atrás</button>
        <button type="button" class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Guardando…' : hasPayment ? 'Crear reserva' : 'Guardar consulta' }}
        </button>
        <button v-if="inModal" type="button" class="text-sm text-gray-500 underline" @click="emit('cancel')">Cancelar</button>
      </div>
    </template>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SourceSelector from '../sources/SourceSelector.vue'
import {
  AppInput,
  AppTextarea,
  AppDatePicker,
  AppCounter,
  AppFormGrid,
  AppFormSection,
  AppInlineAlert,
  AppSelect,
  PricingCalculatorPanel
} from '@/components/ui/forms'
import { useAvailability } from '../../composables/useAvailability'
import { useAccountStore } from '../../stores/account'
import { useReservationsStore } from '../../stores/reservations'
import { useInquiriesStore } from '../../stores/inquiries'
import { useGuestsStore } from '../../stores/guests'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  initialCheckIn: { type: String, default: '' },
  initialCheckOut: { type: String, default: '' },
  initialPersonas: { type: Number, default: 2 },
  inModal: { type: Boolean, default: false }
})

const emit = defineEmits(['saved', 'cancel'])

const router = useRouter()
const accountStore = useAccountStore()
const reservationsStore = useReservationsStore()
const inquiriesStore = useInquiriesStore()
const guestsStore = useGuestsStore()
const toast = useToast()
const avail = useAvailability()

const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'plataforma', label: 'Plataforma' },
]

const todayIso = new Date().toISOString().slice(0, 10)

// ── Navigation state ───────────────────────────────────
const currentStep = ref(1)
const maxReachedStep = ref(1)

// ── UI state ───────────────────────────────────────────
const saving = ref(false)
const submitError = ref('')
const guestSearchQuery = ref('')
const guestSearchOpen = ref(false)
const panels = ref({ unit: true, price: false, payment: false })

// ── Touched trackers ───────────────────────────────────
const s1Touched = ref({ check_in: false, check_out: false })
const s3Touched = ref({ guest_name: false, guest_phone: false })
const s4Touched = ref({ source_type_id: false })

// ── Form data ──────────────────────────────────────────
const form = ref({
  check_in: props.initialCheckIn || '',
  check_out: props.initialCheckOut || '',
  adults: Math.max(1, props.initialPersonas > 1 ? props.initialPersonas - 1 : props.initialPersonas),
  children: 0,
  venue_id: '',
  guest_id: null,
  guest_name: '',
  guest_phone: '',
  guest_email: '',
  notes: '',
  price_per_night: '',
  discount_percentage: '',
  commission_percentage: '',
  commission_name: '',
  quote_expires_at: '',
  source: null,
  source_type_id: '',
  source_detail_id: '',
  unit_ids: [],
  payment_deadline: ''
})

const payment = ref({
  amount: '',
  method: 'transferencia',
  reference: '',
  payment_date: todayIso
})

// ── Computeds ──────────────────────────────────────────
const totalPersonas = computed(() => Number(form.value.adults || 0) + Number(form.value.children || 0))

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const diff = (new Date(form.value.check_out) - new Date(form.value.check_in)) / 86400000
  return diff > 0 ? Math.ceil(diff) : 0
})

const checkOutError = computed(() => {
  if (!form.value.check_out) return 'Requerido'
  if (form.value.check_in && form.value.check_out <= form.value.check_in) return 'Debe ser posterior al check-in'
  return ''
})

const canProceedStep1 = computed(() => !!form.value.check_in && !checkOutError.value)

const canProceedStep3 = computed(() =>
  !!form.value.guest_name?.trim() && !!form.value.guest_phone?.trim()
)

const sourceRequired = computed(() => !form.value.source_type_id)

const hasPayment = computed(() => Number(payment.value.amount || 0) > 0)

const reservationValidationError = computed(() => {
  if (!hasPayment.value) return ''
  if (form.value.unit_ids.length === 0) return 'Selecciona al menos una unidad para crear la reserva.'
  if (!form.value.price_per_night || Number(form.value.price_per_night) <= 0) return 'El precio por noche es requerido para crear una reserva con pago.'
  return ''
})

// Sedes derivadas de las unidades disponibles (con count por sede)
const availableVenues = computed(() => {
  const map = new Map()
  for (const unit of avail.available.value) {
    if (!unit.venue_id) continue
    if (!map.has(unit.venue_id)) {
      map.set(unit.venue_id, { id: unit.venue_id, name: unit.venues?.name || unit.venue_id, count: 0 })
    }
    map.get(unit.venue_id).count++
  }
  return [...map.values()]
})

const skipVenueStep = computed(() => avail.singleVenue.value)

// Unidades disponibles filtradas por la sede elegida
const availableUnitsForVenue = computed(() => {
  const units = avail.available.value
  if (!form.value.venue_id) return units
  return units.filter(u => u.venue_id === form.value.venue_id)
})

// Nav dinámico: omite paso 2 si hay una sola sede
const navSteps = computed(() => {
  const all = [
    { n: 1, label: 'Fechas' },
    { n: 2, label: 'Sede' },
    { n: 3, label: 'Huésped' },
    { n: 4, label: 'Origen' },
  ]
  return skipVenueStep.value ? all.filter(s => s.n !== 2) : all
})

// Nombre de la sede elegida para el mini-resumen
const venueName = computed(() =>
  availableVenues.value.find(v => v.id === form.value.venue_id)?.name || ''
)

// Búsqueda local de huéspedes
const guestSearchResults = computed(() => {
  if (guestSearchQuery.value.length < 2) return []
  const q = guestSearchQuery.value.toLowerCase()
  return guestsStore.guests
    .filter(g => g.name?.toLowerCase().includes(q) || g.phone?.toLowerCase().includes(q))
    .slice(0, 6)
})

// ── Navigation helpers ─────────────────────────────────
const stepButtonClass = (stepN) => {
  if (currentStep.value === 5) return 'text-gray-400 cursor-default'
  if (stepN === currentStep.value) return 'text-primary font-semibold'
  if (stepN < currentStep.value) return 'text-gray-600 hover:text-gray-900'
  if (stepN > maxReachedStep.value) return 'text-gray-300 cursor-not-allowed'
  return 'text-gray-500 hover:text-gray-700'
}

const stepCircleClass = (stepN) => {
  if (currentStep.value === 5) return 'bg-green-100 text-green-700'
  if (stepN === currentStep.value) return 'bg-primary text-white'
  if (stepN < currentStep.value) return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-400'
}

const goToStep = (step) => {
  if (step <= maxReachedStep.value) currentStep.value = step
}

const advanceStep1 = async () => {
  s1Touched.value = { check_in: true, check_out: true }
  if (!canProceedStep1.value) return

  const accountId = accountStore.getRequiredAccountId()
  await avail.checkAvailability({
    accountId,
    checkIn: form.value.check_in,
    checkOut: form.value.check_out,
    personas: totalPersonas.value
  })

  if (!avail.available.value.length) return // bloqueado – no hay disponibilidad

  if (skipVenueStep.value) {
    form.value.venue_id = availableVenues.value[0]?.id || ''
    maxReachedStep.value = Math.max(maxReachedStep.value, 3)
    currentStep.value = 3
  } else {
    maxReachedStep.value = Math.max(maxReachedStep.value, 2)
    currentStep.value = 2
  }
}

const advanceToStep4 = () => {
  s3Touched.value = { guest_name: true, guest_phone: true }
  if (!canProceedStep3.value) return
  maxReachedStep.value = Math.max(maxReachedStep.value, 4)
  currentStep.value = 4
}

const advanceStep4 = () => {
  s4Touched.value.source_type_id = true
  if (sourceRequired.value) return
  maxReachedStep.value = Math.max(maxReachedStep.value, 5)
  currentStep.value = 5
}

const prevFromStep3 = () => {
  currentStep.value = skipVenueStep.value ? 1 : 2
}

const prevFromPanels = () => {
  currentStep.value = 4
}

const onDatesChange = () => {
  if (avail.checked.value) avail.reset()
}

// ── Guest search ───────────────────────────────────────
const selectGuest = (guest) => {
  form.value.guest_id = guest.id
  form.value.guest_name = guest.name || ''
  form.value.guest_phone = guest.phone || ''
  form.value.guest_email = guest.email || ''
  guestSearchQuery.value = ''
  guestSearchOpen.value = false
}

const clearGuestSelection = () => {
  form.value.guest_id = null
  form.value.guest_name = ''
  form.value.guest_phone = ''
  form.value.guest_email = ''
}

// ── Source helpers ─────────────────────────────────────
const onSourceChange = (value) => {
  form.value.source_type_id = value?.sourceTypeId || ''
  form.value.source_detail_id = value?.sourceDetailId || ''
  if (!form.value.source_detail_id) form.value.source = null
}

const onSourceSuggestions = (payload) => {
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
}

// ── Panel toggle ───────────────────────────────────────
const togglePanel = (panel) => {
  panels.value[panel] = !panels.value[panel]
}

// ── Save ───────────────────────────────────────────────
const save = async () => {
  submitError.value = ''
  if (reservationValidationError.value) return

  saving.value = true
  try {
    if (hasPayment.value) {
      // Crear perfil de huésped solo si no viene de uno existente
      const guestRecord = form.value.guest_id
        ? { id: form.value.guest_id }
        : await guestsStore.createGuest({
            name: form.value.guest_name,
            phone: form.value.guest_phone || null,
            email: form.value.guest_email || null
          })

      const result = await reservationsStore.createReservationWithPayment(
        {
          check_in: form.value.check_in,
          check_out: form.value.check_out,
          adults: form.value.adults,
          children: form.value.children,
          venue_id: form.value.venue_id || null,
          guest_id: guestRecord.id,
          guest_name: form.value.guest_name,
          guest_phone: form.value.guest_phone,
          unit_ids: form.value.unit_ids,
          price_per_night: form.value.price_per_night !== '' ? Number(form.value.price_per_night) : null,
          discount_percentage: Number(form.value.discount_percentage || 0),
          commission_percentage: Number(form.value.commission_percentage || 0),
          commission_name: form.value.commission_name || null,
          source: form.value.source,
          source_type_id: form.value.source_type_id || null,
          source_detail_id: form.value.source_detail_id || null,
          status: 'confirmed',
          payment_deadline: form.value.payment_deadline || null,
          notes: form.value.notes || null
        },
        payment.value
      )

      emit('saved', result)
      if (!props.inModal) router.push(`/reservas/${result.id}`)

      if (result.syncResult?.synced === false) {
        toast.withActions(
          'Reserva creada, pero la ocupación no pudo sincronizarse.',
          [{
            label: 'Reintentar',
            callback: async () => {
              const r = await reservationsStore.retryReservationOccupancySync(result.id)
              if (r.synced) toast.success('Ocupación sincronizada.')
              else toast.error('No se pudo sincronizar la ocupación. Intenta de nuevo más tarde.')
            }
          }]
        )
      } else {
        toast.success('Reserva creada correctamente.')
      }
    } else {
      // Sin pago → consulta (no se crea perfil guest)
      const result = await inquiriesStore.createInquiry({
        check_in: form.value.check_in,
        check_out: form.value.check_out,
        adults: form.value.adults,
        children: form.value.children,
        guest_name: form.value.guest_name,
        guest_phone: form.value.guest_phone,
        price_per_night: form.value.price_per_night !== '' ? Number(form.value.price_per_night) : null,
        discount_percentage: form.value.discount_percentage !== '' ? Number(form.value.discount_percentage) : 0,
        commission_percentage: form.value.commission_percentage !== '' ? Number(form.value.commission_percentage) : 0,
        commission_name: form.value.commission_name || null,
        quote_expires_at: form.value.quote_expires_at || null,
        source: form.value.source,
        source_type_id: form.value.source_type_id || null,
        source_detail_id: form.value.source_detail_id || null,
        notes: form.value.notes || null
      })

      toast.success('Consulta guardada correctamente.')
      emit('saved', result)
      if (!props.inModal) router.push(`/consultas/${result.id}`)
    }
  } catch (err) {
    submitError.value = err.message || 'Ocurrió un error al guardar.'
  } finally {
    saving.value = false
  }
}

// ── onMounted ──────────────────────────────────────────
onMounted(async () => {
  const accountId = accountStore.getRequiredAccountId()
  await guestsStore.fetchGuests()

  if (props.initialCheckIn && props.initialCheckOut) {
    await avail.checkAvailability({
      accountId,
      checkIn: props.initialCheckIn,
      checkOut: props.initialCheckOut,
      personas: props.initialPersonas
    })
    if (avail.available.value.length > 0) {
      if (skipVenueStep.value) {
        form.value.venue_id = availableVenues.value[0]?.id || ''
        maxReachedStep.value = 3
        currentStep.value = 3
      } else {
        maxReachedStep.value = 2
        currentStep.value = 2
      }
    }
  }
})
</script>
