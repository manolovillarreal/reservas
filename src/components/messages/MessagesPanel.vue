<template>
  <BottomSheet
    :modelValue="modelValue"
    title="Mensajes"
    description="Usa este panel para revisar mensajes de sistema y copiar mensajes personalizados."
    height="full"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ allMessages.length }} mensaje(s)</p>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          @click="closePanel"
          aria-label="Cerrar panel de mensajes"
          title="Cerrar"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6L6 18"></path>
            <path d="M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div v-if="allMessages.length === 0" class="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        No hay mensajes configurados.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="msg in allMessages"
          :key="msg.id"
          class="rounded-md border border-gray-200 bg-white"
        >
          <div class="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              class="flex flex-1 items-center justify-between text-left"
              @click="toggleMessage(msg.id)"
              :aria-expanded="String(isMessageOpen(msg.id))"
            >
              <p class="text-sm font-semibold text-gray-900">{{ msg.name }}</p>
              <svg
                class="h-4 w-4 text-gray-500 transition-transform"
                :class="isMessageOpen(msg.id) ? 'rotate-180' : ''"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6"></path>
              </svg>
            </button>

            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              @click.stop="copyText(msg.text)"
              :aria-label="`Copiar ${msg.name}`"
              title="Copiar mensaje"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>

          <div v-if="isMessageOpen(msg.id)" class="border-t border-gray-100 px-3 pb-3 pt-2">
            <pre class="whitespace-pre-wrap text-sm text-gray-800">{{ msg.text }}</pre>
            <p v-if="msg.missing.length" class="mt-2 text-xs text-amber-700">
              Faltan variables: {{ msg.missing.join(', ') }}
            </p>
            <p v-if="msg.note" class="mt-2 text-xs text-gray-500">{{ msg.note }}</p>
          </div>
        </div>
      </div>
    </div>
  </BottomSheet>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BottomSheet from '../ui/BottomSheet.vue'
import {
  buildReservationContext,
  buildVoucherMessage,
  resolveTemplate,
} from '../../utils/messageUtils'
import { buildQuotePublicUrl, buildQuotationWhatsAppMessage } from '../../utils/voucherUtils'

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
const openMessageIds = ref([])

const globalVars = computed(() => buildReservationContext({
  reservation: props.mode === 'reservation' ? props.reservation : null,
  inquiry: props.mode === 'inquiry'
    ? {
        ...(props.inquiry || {}),
        units: (props.availableUnits || [])
          .filter((unit) => (props.inquiry?.unit_ids || []).includes(unit.id)),
      }
    : null,
  accountProfile: {
    ...(props.accountSettings || {}),
    ...props.profile,
    voucher_conditions: props.voucherConditions || props.accountSettings?.voucher_conditions || '',
  },
  messageSettings: {
    ...(props.accountSettings || {}),
    ...(props.systemSettings || {}),
    voucher_conditions: props.voucherConditions || props.accountSettings?.voucher_conditions || '',
  },
}))

const systemQuotation = computed(() => {
  if (props.mode === 'inquiry') {
    const inquiry = props.inquiry || {}
    const quotationTemplate = String(
      (props.messages || []).find((msg) => msg.type === 'system' && msg.key === 'quotation')?.body || ''
    ).trim()

    const text = buildQuotationWhatsAppMessage(
      {
        ...inquiry,
        nights: globalVars.value.noches,
      },
      props.profile,
      buildQuotePublicUrl(inquiry.quote_token),
      {
        systemTemplate: quotationTemplate,
        accountSettings: props.accountSettings,
        units: (props.availableUnits || [])
          .filter((unit) => (inquiry?.unit_ids || []).includes(unit.id)),
      }
    )

    return {
      text,
      missing: [],
    }
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

const allMessages = computed(() => {
  const systemMessages = [
    {
      id: 'system-quotation',
      name: 'Sistema: Cotización',
      text: systemQuotation.value.text,
      missing: systemQuotation.value.missing || [],
      note: 'Disponible para visualización. Usa el botón de WhatsApp del flujo para compartir.'
    },
    {
      id: 'system-voucher',
      name: 'Sistema: Voucher',
      text: systemVoucher.value.text,
      missing: systemVoucher.value.missing || [],
      note: 'Disponible para visualización. Usa el botón de WhatsApp del flujo para compartir.'
    }
  ]

  const custom = renderedCustomMessages.value.map((msg) => ({
    ...msg,
    note: ''
  }))

  return [...systemMessages, ...custom]
})

const closePanel = () => emit('update:modelValue', false)

const toggleMessage = (messageId) => {
  if (openMessageIds.value.includes(messageId)) {
    openMessageIds.value = openMessageIds.value.filter((id) => id !== messageId)
    return
  }

  openMessageIds.value = [...openMessageIds.value, messageId]
}

const isMessageOpen = (messageId) => openMessageIds.value.includes(messageId)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    openMessageIds.value = []
  }
})

const copyText = async (text) => {
  await navigator.clipboard.writeText(String(text || ''))
  emit('copied')
}
</script>
