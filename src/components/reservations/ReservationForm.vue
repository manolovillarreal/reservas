<template>
  <div class="max-w-3xl mx-auto rounded-lg border border-gray-100 bg-white p-6 shadow-md">
    <h2 class="mb-6 text-2xl font-bold text-gray-800">Nueva Reserva</h2>

    <form @submit.prevent="submitForm" class="space-y-5">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700">Sede</label>
          <select v-model="form.venue_id" @change="onVenueChange" required class="mt-1 block w-full rounded-md border-gray-300">
            <option value="">Seleccionar sede</option>
            <option v-for="venue in venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Teléfono de referencia</label>
          <input
            type="text"
            v-model="form.guest_phone"
            placeholder="Ej: +54 11 1234-5678"
            class="mt-1 block w-full rounded-md border-gray-300"
          >
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between gap-3">
          <label class="block text-sm font-medium text-gray-700">Huésped (nombre libre)</label>
          <button
            type="button"
            class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            @click="openCreateGuestModal"
          >
            + Crear huésped
          </button>
        </div>
        <div class="relative mt-1">
          <input
            type="text"
            v-model="form.guest_name"
            placeholder="Escribe al menos 3 caracteres"
            class="block w-full rounded-md border-gray-300"
            autocomplete="off"
            @focus="showSuggestions = true"
          >
          <div
            v-if="showSuggestions && (autocompleteLoading || guestSuggestions.length > 0)"
            class="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
          >
            <p v-if="autocompleteLoading" class="px-3 py-2 text-sm text-gray-500">Buscando huéspedes...</p>
            <button
              v-for="guest in guestSuggestions"
              :key="guest.id"
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              @click="selectGuestSuggestion(guest)"
            >
              <span class="font-medium text-gray-800">{{ guest.name }}</span>
              <span class="text-xs text-gray-500">{{ guest.phone || 'Sin teléfono' }}</span>
            </button>
          </div>
        </div>
        <p class="mt-1 text-xs text-gray-500">
          Si seleccionas una sugerencia se vincula con guest_id. Si escribes un nombre nuevo, queda como referencia sin huésped vinculado.
        </p>
      </div>

      <div>
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <label class="block text-sm font-medium text-gray-700">Unidades de la sede</label>
          <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              v-model="fullHouseEnabled"
              class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            >
            Casa completa
          </label>
        </div>

        <div class="max-h-56 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
          <p v-if="!form.venue_id" class="text-sm text-gray-500">Selecciona una sede para elegir unidades.</p>
          <p v-else-if="availableUnits.length === 0" class="text-sm text-gray-500">No hay unidades activas en esta sede.</p>

          <label v-for="unit in availableUnits" :key="unit.id" class="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              :value="unit.id"
              v-model="form.unit_ids"
              :disabled="fullHouseEnabled"
              class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            >
            <span>{{ unit.name }}</span>
          </label>
        </div>

        <p v-if="fullHouseEnabled" class="mt-2 text-xs text-indigo-700">
          Full House activo: se seleccionan automáticamente todas las unidades disponibles de la sede en ese rango.
        </p>

        <div v-if="fullHouseUnavailableNames.length > 0" class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          No se puede confirmar Casa completa. Unidades ocupadas/bloqueadas: {{ fullHouseUnavailableNames.join(', ') }}.
        </div>

        <div v-if="selectedUnavailableNames.length > 0" class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Las unidades seleccionadas no están disponibles en el rango: {{ selectedUnavailableNames.join(', ') }}.
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700">Check-in</label>
          <input type="date" v-model="form.check_in" required class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Check-out</label>
          <input type="date" v-model="form.check_out" required class="mt-1 block w-full rounded-md border-gray-300">
        </div>
      </div>

      <p v-if="!isDateRangeValid && form.check_in && form.check_out" class="text-sm text-red-600">
        El Check-out debe ser posterior al Check-in.
      </p>

      <div v-if="computedNights > 0" class="rounded bg-blue-50 p-3 text-sm font-medium text-blue-800">
        Estadía proyectada: {{ computedNights }} noche(s). Unidades seleccionadas: {{ form.unit_ids.length }}.
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700">Precio por noche (Sugerido: ${{ suggestedNightlyPrice }})</label>
          <input type="number" v-model="form.price_per_night" required min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Estado Inicial</label>
          <select v-model="form.status" required class="mt-1 block w-full rounded-md border-gray-300">
            <option value="confirmed">Confirmada</option>
            <option value="in_stay">En estadía</option>
            <option value="completed">Finalizada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
      </div>

      <SourceSelector
        :modelValue="{ sourceTypeId: form.source_type_id, sourceDetailId: form.source_detail_id }"
        @update:modelValue="updateSourceSelection"
        @suggestions="applySourceSuggestions"
      />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700">Adultos</label>
          <input type="number" v-model="form.adults" min="1" class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Niños</label>
          <input type="number" v-model="form.children" min="0" class="mt-1 block w-full rounded-md border-gray-300">
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label class="block text-sm font-medium text-gray-700">Comisión</label>
          <input type="text" v-model="form.commission_name" placeholder="Booking, agencia..." class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">% Comisión</label>
          <input type="number" v-model="form.commission_percentage" min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">% Descuento</label>
          <input type="number" v-model="form.discount_percentage" min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300">
        </div>
      </div>

      <div v-if="showCalculationPanel" class="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p>Noches: <strong>{{ computedNights }}</strong></p>
        <p>Precio por noche: <strong>${{ formatCurrency(form.price_per_night || 0) }}</strong></p>
        <p>Subtotal: <strong>${{ formatCurrency(subtotalAmount) }}</strong></p>
        <p>Descuento ({{ Number(form.discount_percentage || 0) }}%): <strong>-${{ formatCurrency(discountAmount) }}</strong></p>
        <p>Total cliente: <strong>${{ formatCurrency(customerTotal) }}</strong></p>
        <p>Comisión ({{ Number(form.commission_percentage || 0) }}%): <strong>-${{ formatCurrency(commissionAmount) }}</strong></p>
        <p>Ingreso neto: <strong>${{ formatCurrency(netAmount) }}</strong></p>
      </div>

      <div v-if="errorMessage" class="rounded bg-red-50 p-3 text-red-600 shadow-inner">
        {{ errorMessage }}
      </div>

      <div v-if="syncIssue" class="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p>La reserva se creó, pero falló la sincronización de ocupación.</p>
        <p class="mt-1">{{ syncIssue.message }}</p>
        <div class="mt-3 flex gap-2">
          <button type="button" class="btn-secondary" @click="retrySync">Reintentar</button>
          <button type="button" class="btn-secondary" @click="openManualOccupancyModal">Hacer manualmente</button>
        </div>
      </div>

      <div class="mt-6 flex justify-end border-t pt-4">
        <button
          type="submit"
          :disabled="loading || !canSubmit"
          class="rounded-md bg-gray-900 px-6 py-2 text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {{ loading ? 'Validando...' : 'Crear Reserva' }}
        </button>
      </div>
    </form>

    <BaseModal :isOpen="showCreateGuestModal" title="Crear huésped" @close="closeCreateGuestModal">
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

    <BaseModal :isOpen="showManualOccupancyModal" title="Crear ocupación manual" @close="closeManualOccupancyModal">
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

const store = useReservationsStore()
const accountStore = useAccountStore()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref('')

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

const normalizeDate = (value) => {
  if (!value) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return trimmed.slice(0, 10)
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

const syncReservationAmounts = () => {
  form.value.total_amount = customerTotal.value
}

const loadInquiryPrefill = async () => {
  const inquiryId = route.query.inquiryId
  if (!inquiryId) return

  const accountId = getAccountId()

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
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

const onVenueChange = async () => {
  availableUnits.value = units.value.filter(unit => unit.venue_id === form.value.venue_id)

  if (!fullHouseEnabled.value) {
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
}

const submitCreateGuest = async () => {
  creatingGuest.value = true
  newGuestErrorMessage.value = ''

  try {
    const accountId = getAccountId()
    const payload = {
      account_id: accountId,
      name: newGuestForm.value.name?.trim(),
      phone: newGuestForm.value.phone?.trim() || null,
      email: newGuestForm.value.email?.trim() || null
    }

    if (!payload.name) {
      throw new Error('El nombre del huésped es obligatorio.')
    }

    const { data, error } = await supabase
      .from('guests')
      .insert(payload)
      .select('id, name, phone')
      .single()

    if (error) throw error

    selectGuestSuggestion(data)
    showCreateGuestModal.value = false
  } catch (err) {
    newGuestErrorMessage.value = err.message
  } finally {
    creatingGuest.value = false
  }
}

const submitForm = async () => {
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
      payment_deadline: null,
      adults: Number(form.value.adults || 1),
      children: Number(form.value.children || 0),
      price_per_night: Number(form.value.price_per_night || 0),
      total_amount: Number(customerTotal.value || 0),
      paid_amount: Number(form.value.paid_amount || 0),
      commission_percentage: form.value.commission_percentage === '' ? null : Number(form.value.commission_percentage || 0),
      discount_percentage: form.value.discount_percentage === '' ? 0 : Number(form.value.discount_percentage || 0)
    }

    if (!payload.check_in || !payload.check_out) {
      throw new Error('Debes indicar fechas válidas para Check-in y Check-out.')
    }

    const createdReservation = await store.createReservation(payload)
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
      return
    }

    router.push('/reservas')
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
    router.push('/reservas')
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

    const { error } = await supabase.from('occupancies').insert(payload)
    if (error) throw error

    showManualOccupancyModal.value = false
    router.push('/reservas')
  } catch (err) {
    manualOccupancyError.value = err.message
  } finally {
    manualOccupancyLoading.value = false
  }
}

const formatCurrency = (value) => Number(value || 0).toLocaleString('es-CO')
</script>
