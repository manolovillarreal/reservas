<template>
  <BaseModal :isOpen="isOpen" title="Convertir en reserva" size="lg" :fullScreenOnMobile="true" @close="handleClose">
    <form class="space-y-5" @submit.prevent="submitConversion">
      <p class="font-mono text-xs text-gray-500">Consulta: {{ props.inquiry?.inquiry_number || '-' }}</p>

      <AppInlineAlert
        type="info"
        message="La reserva se creará en estado Confirmada."
      />

      <AppFormSection title="Huésped" :divider="true">
        <AppFormGrid :columns="2">
          <AppInput
            v-model="form.guest_name"
            label="Nombre"
            required
            :error="fieldError('guest_name')"
            @blur="touchField('guest_name')"
          />
          <AppInput
            v-model="form.guest_phone"
            label="Teléfono"
            hint="Opcional"
          />
        </AppFormGrid>
      </AppFormSection>

      <AppFormSection title="Fechas y unidad" :divider="true">
        <AppFormGrid :columns="2">
          <AppDatePicker
            v-model="form.check_in"
            label="Check-in"
            :error="fieldError('check_in')"
            @update:modelValue="touchField('check_in')"
          />
          <AppDatePicker
            v-model="form.check_out"
            label="Check-out"
            :error="fieldError('check_out')"
            @update:modelValue="touchField('check_out')"
          />
        </AppFormGrid>

        <div v-if="nights > 0 && !hasAvailabilityConflict" class="flex items-center gap-2 text-sm font-medium text-[#10B981]">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.03-9.28a.75.75 0 10-1.06-1.06L9.25 10.38 8.03 9.16a.75.75 0 10-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.25-3.25z" clip-rule="evenodd" />
          </svg>
          {{ nights }} noche{{ nights !== 1 ? 's' : '' }} · Fechas disponibles
        </div>
        <div v-else-if="nights > 0" class="text-sm text-[#6B7280]">
          {{ nights }} noche{{ nights !== 1 ? 's' : '' }}
        </div>

        <AppInlineAlert
          v-if="hasAvailabilityConflict"
          type="error"
          title="Fechas ocupadas"
          :message="`Unidades no disponibles: ${selectedUnavailableNames.join(', ')}`"
        />

        <AppFieldGroup title="Unidad(es)" :border="true" :compact="true" :tone="fieldError('unit_ids') ? 'error' : 'neutral'">
          <div class="max-h-44 space-y-1 overflow-y-auto">
            <p v-if="units.length === 0" class="text-sm text-gray-500">No hay unidades activas.</p>
            <label
              v-for="unit in units"
              :key="unit.id"
              class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-white"
            >
              <input v-model="form.unit_ids" type="checkbox" :value="unit.id" class="rounded border-gray-300">
              <span>{{ unit.name }}</span>
            </label>
          </div>
          <template #footer>
            <p v-if="fieldError('unit_ids')" class="text-xs text-[#EF4444]">{{ fieldError('unit_ids') }}</p>
          </template>
        </AppFieldGroup>
      </AppFormSection>

      <AppFormSection title="Personas" :divider="true">
        <AppFormGrid :columns="2">
          <AppCounter v-model="form.adults" label="Adultos" :min="1" :max="20" />
          <AppCounter v-model="form.children" label="Niños" :min="0" :max="20" />
        </AppFormGrid>
        <p class="text-sm text-[#6B7280]">
          Total: <strong class="text-[#111827]">{{ guestsTotal }} persona{{ guestsTotal !== 1 ? 's' : '' }}</strong>
        </p>
      </AppFormSection>

      <AppFormSection title="Precio y comisión" :divider="true">
        <AppInput
          v-model="form.price_per_night"
          type="number"
          label="Precio por noche"
          prefix="$"
          hint="Opcional"
        />

        <AppFormGrid :columns="2">
          <AppInput v-model="form.discount_percentage" type="number" label="Descuento" suffix="%" hint="Opcional" />
          <AppInput v-model="form.commission_percentage" type="number" label="Comisión" suffix="%" hint="Opcional" />
        </AppFormGrid>

        <PricingCalculatorPanel
          :checkIn="form.check_in"
          :checkOut="form.check_out"
          :pricePerNight="Number(form.price_per_night || 0)"
          :discountPercentage="Number(form.discount_percentage || 0)"
          :commissionPercentage="Number(form.commission_percentage || 0)"
          :units="form.unit_ids"
          :adults="Number(form.adults || 1)"
          :children="Number(form.children || 0)"
        />

        <AppDatePicker
          v-model="form.payment_deadline"
          label="Fecha límite de pago"
          hint="Opcional"
        />
      </AppFormSection>

      <AppFormSection title="Origen" :divider="true">
        <AppFieldGroup title="Canal de origen" :border="false" :compact="true">
          <SourceSelector
            :modelValue="{ sourceTypeId: form.source_type_id, sourceDetailId: form.source_detail_id }"
            @update:modelValue="updateSourceSelection"
            @suggestions="applySourceSuggestions"
          />
        </AppFieldGroup>
        <AppFieldHint message="Copiado desde la consulta" type="hint" />
      </AppFormSection>

      <AppFormSection title="Notas" :divider="false">
        <AppTextarea
          v-model="form.notes"
          label="Notas"
          hint="Opcional"
          :rows="2"
          :autoResize="true"
        />
      </AppFormSection>

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
            @click="goManual"
          >
            Hacer manualmente
          </button>
        </template>
      </AppInlineAlert>

      <AppInlineAlert
        v-if="errorMessage"
        type="error"
        :message="errorMessage"
        :dismissible="true"
      />

      <AppFormActions
        submit-label="Crear reserva"
        cancel-label="Cancelar"
        :loading="submitting"
        :submit-disabled="submitting || hasAvailabilityConflict"
        @submit="submitConversion"
        @cancel="handleClose"
      />
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useReservationsStore } from '../../stores/reservations'
import { useInquiriesStore } from '../../stores/inquiries'
import { useGuestsStore } from '../../stores/guests'
import { useToast } from '../../composables/useToast'
import { generateUniqueReferenceCode } from '../../utils/referenceUtils'
import BaseModal from '../ui/BaseModal.vue'
import SourceSelector from '../sources/SourceSelector.vue'
import {
  AppInput,
  AppTextarea,
  AppDatePicker,
  AppCounter,
  AppFieldGroup,
  AppFormSection,
  AppFormActions,
  AppInlineAlert,
  AppFieldHint,
  AppFormGrid,
  PricingCalculatorPanel
} from '@/components/ui/forms'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  inquiry: { type: Object, default: null }
})

const emit = defineEmits(['close', 'converted'])

const router = useRouter()
const accountStore = useAccountStore()
const reservationsStore = useReservationsStore()
const inquiriesStore = useInquiriesStore()
const guestsStore = useGuestsStore()
const toast = useToast()

const units = ref([])
const submitting = ref(false)
const errorMessage = ref('')
const selectedUnavailableNames = ref([])
const syncIssue = ref(null)

const form = ref(buildEmptyForm())
const touched = reactive({ guest_name: false, check_in: false, check_out: false, unit_ids: false })
const submitAttempted = ref(false)

function buildEmptyForm() {
  return {
    guest_name: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    adults: 1,
    children: 0,
    unit_ids: [],
    price_per_night: '',
    commission_name: '',
    commission_percentage: '',
    discount_percentage: '',
    source: null,
    source_type_id: '',
    source_detail_id: '',
    payment_deadline: '',
    notes: ''
  }
}

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const start = new Date(form.value.check_in)
  const end = new Date(form.value.check_out)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const subtotal = computed(() => Number(form.value.price_per_night || 0) * nights.value)
const discountAmount = computed(() => subtotal.value * Number(form.value.discount_percentage || 0) / 100)
const customerTotal = computed(() => Math.max(subtotal.value - discountAmount.value, 0))
const guestsTotal = computed(() => Number(form.value.adults || 0) + Number(form.value.children || 0))
const hasAvailabilityConflict = computed(() => selectedUnavailableNames.value.length > 0)

watch(() => props.isOpen, async (open) => {
  if (!open) return
  await loadUnits()
  hydrateForm()
  await evaluateAvailability()
}, { immediate: true })

watch(
  () => [form.value.check_in, form.value.check_out, (form.value.unit_ids || []).join(',')],
  async () => {
    await evaluateAvailability()
  }
)

const touchField = (field) => {
  touched[field] = true
}

const fieldError = (field) => {
  if (!touched[field] && !submitAttempted.value) return ''

  if (field === 'guest_name' && !form.value.guest_name?.trim()) {
    return 'El nombre del huésped es obligatorio.'
  }

  if (field === 'check_in' && !form.value.check_in) {
    return 'Debes completar check-in.'
  }

  if (field === 'check_out') {
    if (!form.value.check_out) return 'Debes completar check-out.'
    if (form.value.check_in && new Date(form.value.check_in) >= new Date(form.value.check_out)) {
      return 'El check-out debe ser posterior al check-in.'
    }
  }

  if (field === 'unit_ids' && form.value.unit_ids.length === 0) {
    return 'Debes seleccionar al menos una unidad.'
  }

  return ''
}

const loadUnits = async () => {
  const accountId = accountStore.getRequiredAccountId()
  const { data } = await supabase
    .from('units')
    .select('id, name, venue_id')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('name', { ascending: true })
  units.value = data || []
}

const hydrateForm = () => {
  const inquiry = props.inquiry || {}
  form.value = {
    guest_name: inquiry.guest_name || '',
    guest_phone: inquiry.guest_phone || '',
    check_in: inquiry.check_in || '',
    check_out: inquiry.check_out || '',
    adults: inquiry.adults ?? 1,
    children: inquiry.children ?? 0,
    unit_ids: [...(inquiry.unit_ids || [])],
    price_per_night: inquiry.price_per_night ?? '',
    commission_name: inquiry.commission_name || '',
    commission_percentage: inquiry.commission_percentage ?? '',
    discount_percentage: inquiry.discount_percentage ?? '',
    source: inquiry.source || null,
    source_type_id: inquiry.source_type_id || '',
    source_detail_id: inquiry.source_detail_id || '',
    payment_deadline: '',
    notes: ''
  }
  touched.guest_name = false
  touched.check_in = false
  touched.check_out = false
  touched.unit_ids = false
  submitAttempted.value = false
  errorMessage.value = ''
  syncIssue.value = null
}

const updateSourceSelection = (value) => {
  form.value.source_type_id = value?.sourceTypeId || ''
  form.value.source_detail_id = value?.sourceDetailId || ''
  if (!form.value.source_detail_id) form.value.source = null
}

const applySourceSuggestions = (payload) => {
  form.value.source = payload.sourceDetailName || payload.sourceDetailLabel || null
  if (!String(form.value.commission_name || '').trim()) form.value.commission_name = payload.sourceDetailLabel || ''
  if (form.value.commission_percentage === '' || form.value.commission_percentage == null) form.value.commission_percentage = Number(payload.commissionPercentage || 0)
  if (form.value.discount_percentage === '' || form.value.discount_percentage == null) form.value.discount_percentage = Number(payload.discountPercentage || 0)
}

const evaluateAvailability = async () => {
  selectedUnavailableNames.value = []
  if (!form.value.check_in || !form.value.check_out || form.value.unit_ids.length === 0) return

  const availability = await reservationsStore.getUnitAvailability(form.value.unit_ids, form.value.check_in, form.value.check_out)
  if (availability.unavailableUnitIds.length === 0) return

  selectedUnavailableNames.value = units.value
    .filter(unit => availability.unavailableUnitIds.includes(unit.id))
    .map(unit => unit.name)
}

const resolveVenueId = () => {
  if (form.value.unit_ids.length === 0) return null
  const firstUnit = units.value.find(u => u.id === form.value.unit_ids[0])
  return firstUnit?.venue_id || null
}

const submitConversion = async () => {
  submitting.value = true
  submitAttempted.value = true
  errorMessage.value = ''
  syncIssue.value = null

  try {
    if (fieldError('guest_name')) throw new Error(fieldError('guest_name'))
    if (fieldError('check_in')) throw new Error(fieldError('check_in'))
    if (fieldError('check_out')) throw new Error(fieldError('check_out'))
    if (fieldError('unit_ids')) throw new Error(fieldError('unit_ids'))
    if (selectedUnavailableNames.value.length > 0) throw new Error('Hay unidades no disponibles para las fechas seleccionadas.')

    const accountId = accountStore.getRequiredAccountId()

    let referenceCode = props.inquiry?.reference_code || null
    if (!referenceCode) {
      referenceCode = await generateUniqueReferenceCode(accountId)
      await inquiriesStore.updateInquiry(props.inquiry.id, { reference_code: referenceCode })
    }

    const guestRecord = await guestsStore.getOrCreateGuestByPhone({
      name: form.value.guest_name?.trim() || null,
      phone: form.value.guest_phone?.trim() || null,
      email: null,
    })

    const payload = {
      venue_id: resolveVenueId(),
      unit_ids: [...form.value.unit_ids],
      guest_id: guestRecord?.id || null,
      guest_name: form.value.guest_name?.trim() || null,
      guest_phone: form.value.guest_phone?.trim() || null,
      check_in: form.value.check_in,
      check_out: form.value.check_out,
      adults: Number(form.value.adults || 1),
      children: Number(form.value.children || 0),
      price_per_night: Number(form.value.price_per_night || 0),
      total_amount: Number(customerTotal.value || 0),
      paid_amount: 0,
      commission_name: form.value.commission_name || null,
      commission_percentage: form.value.commission_percentage === '' ? null : Number(form.value.commission_percentage || 0),
      discount_percentage: form.value.discount_percentage === '' ? 0 : Number(form.value.discount_percentage || 0),
      source: form.value.source || null,
      source_type_id: form.value.source_type_id || null,
      source_detail_id: form.value.source_detail_id || null,
      payment_deadline: form.value.payment_deadline || null,
      notes: form.value.notes || null,
      status: 'confirmed',
      inquiry_id: props.inquiry.id,
      reference_code: referenceCode
    }

    if (!payload.venue_id) throw new Error('No se pudo determinar la sede a partir de las unidades seleccionadas.')

    const result = await reservationsStore.createReservation(payload)

    await inquiriesStore.updateInquiry(props.inquiry.id, {
      status: 'convertida',
      reservation_id: result.id,
      reference_code: referenceCode
    })

    if (result?.syncResult?.synced === false) {
      syncIssue.value = {
        reservationId: result.id,
        message: result.syncResult.error || 'No se pudo sincronizar la ocupación.'
      }
      toast.error('Reserva creada, pero falló la sincronización de ocupación.')
      return
    }

    toast.success('Reserva creada correctamente')
    emit('converted', result.id)
    emit('close')
    router.push(`/reservas/${result.id}`)
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo convertir la consulta.'
  } finally {
    submitting.value = false
  }
}

const retrySync = async () => {
  if (!syncIssue.value?.reservationId) return

  const result = await reservationsStore.retryReservationOccupancySync(syncIssue.value.reservationId)
  if (result.synced) {
    toast.success('Ocupación sincronizada correctamente.')
    emit('converted', syncIssue.value.reservationId)
    emit('close')
    router.push(`/reservas/${syncIssue.value.reservationId}`)
    return
  }

  syncIssue.value = {
    reservationId: syncIssue.value.reservationId,
    message: result.error || 'Falló nuevamente la sincronización.'
  }
}

const goManual = () => {
  if (!syncIssue.value?.reservationId) return
  toast.warning('Gestiona la ocupación manualmente desde el detalle de la reserva.')
  emit('converted', syncIssue.value.reservationId)
  emit('close')
  router.push(`/reservas/${syncIssue.value.reservationId}`)
}

const handleClose = () => {
  if (submitting.value) return
  emit('close')
}
</script>
