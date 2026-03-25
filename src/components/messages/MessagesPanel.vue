<template>
  <BottomSheet
    :modelValue="modelValue"
    title="Mensajes"
    description="Usa este panel para revisar mensajes de sistema y copiar mensajes personalizados."
    height="full"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Sistema: Cotización</p>
        <pre class="mt-2 whitespace-pre-wrap text-sm text-gray-800">{{ systemQuotation.text }}</pre>
        <p v-if="systemQuotation.missing.length" class="mt-2 text-xs text-amber-700">
          Faltan variables: {{ systemQuotation.missing.join(', ') }}
        </p>
        <p class="mt-2 text-xs text-gray-500">Disponible para visualización. Usa el botón de WhatsApp del flujo para compartir.</p>
      </div>

      <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Sistema: Voucher</p>
        <pre class="mt-2 whitespace-pre-wrap text-sm text-gray-800">{{ systemVoucher.text }}</pre>
        <p v-if="systemVoucher.missing.length" class="mt-2 text-xs text-amber-700">
          Faltan variables: {{ systemVoucher.missing.join(', ') }}
        </p>
        <p class="mt-2 text-xs text-gray-500">Disponible para visualización. Usa el botón de WhatsApp del flujo para compartir.</p>
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Mensajes personalizados</p>
          <span class="text-xs text-gray-400">{{ customMessages.length }} mensaje(s)</span>
        </div>

        <div v-if="customMessages.length === 0" class="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
          No hay mensajes personalizados configurados.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="msg in renderedCustomMessages"
            :key="msg.id"
            class="rounded-md border border-gray-200 bg-white p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-gray-900">{{ msg.name }}</p>
              <button type="button" class="btn-secondary text-xs" @click="copyText(msg.text)">Copiar</button>
            </div>
            <pre class="whitespace-pre-wrap text-sm text-gray-800">{{ msg.text }}</pre>
            <p v-if="msg.missing.length" class="mt-2 text-xs text-amber-700">
              Faltan variables: {{ msg.missing.join(', ') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </BottomSheet>
</template>

<script setup>
import { computed } from 'vue'
import BottomSheet from '../ui/BottomSheet.vue'
import {
  buildGlobalVariables,
  buildQuotationMessage,
  buildVoucherMessage,
  resolveTemplate,
} from '../../utils/messageUtils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'inquiry' },
  inquiry: { type: Object, default: null },
  reservation: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  accountSettings: { type: Object, default: () => ({}) },
  systemSettings: { type: Object, default: () => ({}) },
  messages: { type: Array, default: () => [] },
  availableUnits: { type: Array, default: () => [] },
  voucherConditions: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'copied'])

const currentContext = computed(() => {
  if (props.mode === 'reservation') {
    const reservation = props.reservation || {}
    const nights = reservation?.check_in && reservation?.check_out
      ? Math.max(0, Math.ceil((new Date(reservation.check_out) - new Date(reservation.check_in)) / 86400000))
      : 0
    const total = Number(reservation.total_amount || 0)
    const paid = Number(reservation.paid_amount || 0)
    const balance = Math.max(0, total - paid)
    return {
      guest_name: reservation.guest_name || reservation.guests?.name || '',
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      nights,
      personas: Number(reservation.adults || 0) + Number(reservation.children || 0),
      reference: reservation.reference_code || reservation.reservation_number || '-',
      total,
      paid,
      balance,
    }
  }

  const inquiry = props.inquiry || {}
  const nights = inquiry?.check_in && inquiry?.check_out
    ? Math.max(0, Math.ceil((new Date(inquiry.check_out) - new Date(inquiry.check_in)) / 86400000))
    : 0
  const subtotal = Number(inquiry.price_per_night || 0) * nights
  const discountAmount = subtotal * (Number(inquiry.discount_percentage || 0) / 100)
  const total = Math.max(0, subtotal - discountAmount)

  return {
    guest_name: inquiry.guest_name || '',
    check_in: inquiry.check_in,
    check_out: inquiry.check_out,
    nights,
    personas: Number(inquiry.adults || 0) + Number(inquiry.children || 0),
    reference: inquiry.reference_code || inquiry.inquiry_number || '-',
    total,
  }
})

const globalVars = computed(() => buildGlobalVariables({
  profile: props.profile,
  accountSettings: props.accountSettings,
  context: currentContext.value,
}))

const systemQuotation = computed(() => {
  if (props.mode === 'inquiry') {
    return buildQuotationMessage({
      inquiry: props.inquiry,
      systemSettings: props.systemSettings,
      globalVariables: globalVars.value,
      selectedUnits: props.availableUnits,
      venueUnits: props.availableUnits,
    })
  }

  return {
    text: 'Este mensaje requiere contexto de cotización activa.',
    missing: [],
  }
})

const systemVoucher = computed(() => {
  if (props.mode === 'reservation') {
    return buildVoucherMessage({
      reservation: props.reservation,
      systemSettings: props.systemSettings,
      globalVariables: globalVars.value,
      showUnitAmenities: Boolean(props.systemSettings?.show_unit_amenities),
      voucherConditions: props.voucherConditions,
    })
  }

  return {
    text: 'Este mensaje requiere una reserva confirmada.',
    missing: [],
  }
})

const customMessages = computed(() => {
  return (props.messages || []).filter((msg) => msg.type === 'custom')
})

const renderedCustomMessages = computed(() => {
  return customMessages.value.map((msg) => {
    const resolved = resolveTemplate(msg.body, globalVars.value)
    return {
      id: msg.id,
      name: msg.name,
      text: resolved.text,
      missing: resolved.missing,
    }
  })
})

const copyText = async (text) => {
  await navigator.clipboard.writeText(String(text || ''))
  emit('copied')
}
</script>
