<template>
  <div v-if="can('settings', 'edit')" class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Mensajes</h1>
        <p class="text-sm text-gray-500">Configura mensajes del sistema y tu repositorio de mensajes personalizados.</p>
      </div>
    </div>

    <div class="card space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-900">Mensajes del sistema</h2>
      </div>

      <div class="space-y-4">
        <div class="rounded-md border border-gray-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-gray-900">Cotización</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                @click="toggleSystemPreview('quotation')"
                :aria-label="showQuotationPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
                :title="showQuotationPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="hidden sm:inline">{{ showQuotationPreview ? 'Ocultar mensaje' : 'Ver mensaje' }}</span>
              </button>
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                :disabled="!systemMessageByKey.quotation"
                @click="openMessageEditor(systemMessageByKey.quotation)"
                aria-label="Editar mensaje"
                title="Editar mensaje"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                <span class="hidden sm:inline">Editar</span>
              </button>
            </div>
          </div>
          <pre v-if="showQuotationPreview" class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ quotationPreview.text }}</pre>
          <p v-if="showQuotationPreview && quotationPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ quotationPreview.missing.join(', ') }}
          </p>
        </div>

        <div class="rounded-md border border-gray-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-gray-900">Voucher</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                @click="toggleSystemPreview('voucher')"
                :aria-label="showVoucherPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
                :title="showVoucherPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="hidden sm:inline">{{ showVoucherPreview ? 'Ocultar mensaje' : 'Ver mensaje' }}</span>
              </button>
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                :disabled="!systemMessageByKey.voucher"
                @click="openMessageEditor(systemMessageByKey.voucher)"
                aria-label="Editar mensaje"
                title="Editar mensaje"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                <span class="hidden sm:inline">Editar</span>
              </button>
            </div>
          </div>
          <pre v-if="showVoucherPreview" class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ voucherPreview.text }}</pre>
          <p v-if="showVoucherPreview && voucherPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ voucherPreview.missing.join(', ') }}
          </p>
        </div>

        <div class="rounded-md border border-gray-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-gray-900">Pre-registro</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                @click="toggleSystemPreview('preregistro')"
                :aria-label="showPreregistroPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
                :title="showPreregistroPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="hidden sm:inline">{{ showPreregistroPreview ? 'Ocultar mensaje' : 'Ver mensaje' }}</span>
              </button>
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                :disabled="!systemMessageByKey.preregistro"
                @click="openMessageEditor(systemMessageByKey.preregistro)"
                aria-label="Editar mensaje"
                title="Editar mensaje"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                <span class="hidden sm:inline">Editar</span>
              </button>
            </div>
          </div>
          <pre v-if="showPreregistroPreview" class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ preregistroPreview.text }}</pre>
          <p v-if="showPreregistroPreview && preregistroPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ preregistroPreview.missing.join(', ') }}
          </p>
        </div>

        <div class="rounded-md border border-gray-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-gray-900">Sin disponibilidad</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                @click="toggleSystemPreview('disponibilidad_negativa')"
                :aria-label="showDisponibilidadNegativaPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
                :title="showDisponibilidadNegativaPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="hidden sm:inline">{{ showDisponibilidadNegativaPreview ? 'Ocultar mensaje' : 'Ver mensaje' }}</span>
              </button>
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                :disabled="!systemMessageByKey.disponibilidad_negativa"
                @click="openMessageEditor(systemMessageByKey.disponibilidad_negativa)"
                aria-label="Editar mensaje"
                title="Editar mensaje"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                <span class="hidden sm:inline">Editar</span>
              </button>
            </div>
          </div>
          <pre v-if="showDisponibilidadNegativaPreview" class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ disponibilidadNegativaPreview.text }}</pre>
          <p v-if="showDisponibilidadNegativaPreview && disponibilidadNegativaPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ disponibilidadNegativaPreview.missing.join(', ') }}
          </p>
        </div>

        <div class="rounded-md border border-gray-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-gray-900">Con disponibilidad</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                @click="toggleSystemPreview('disponibilidad_positiva')"
                :aria-label="showDisponibilidadPositivaPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
                :title="showDisponibilidadPositivaPreview ? 'Ocultar mensaje' : 'Ver mensaje'"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="hidden sm:inline">{{ showDisponibilidadPositivaPreview ? 'Ocultar mensaje' : 'Ver mensaje' }}</span>
              </button>
              <button
                type="button"
                class="btn-secondary inline-flex items-center gap-1 text-xs"
                :disabled="!systemMessageByKey.disponibilidad_positiva"
                @click="openMessageEditor(systemMessageByKey.disponibilidad_positiva)"
                aria-label="Editar mensaje"
                title="Editar mensaje"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                <span class="hidden sm:inline">Editar</span>
              </button>
            </div>
          </div>
          <pre v-if="showDisponibilidadPositivaPreview" class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ disponibilidadPositivaPreview.text }}</pre>
          <p v-if="showDisponibilidadPositivaPreview && disponibilidadPositivaPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ disponibilidadPositivaPreview.missing.join(', ') }}
          </p>
        </div>
      </div>
    </div>

    <div class="card space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-900">Mensajes personalizados</h2>
        <button type="button" class="btn-primary text-sm" @click="openNewCustom">Nuevo mensaje</button>
      </div>

      <div v-if="customMessages.length === 0" class="rounded-md border border-dashed border-gray-300 p-5 text-sm text-gray-500">
        No hay mensajes personalizados aún.
      </div>

      <div v-else class="space-y-3">
        <div v-for="msg in renderedCustomMessages" :key="msg.id" class="relative">
          <div v-if="showDropIndicator(msg.id, 'before')" class="mb-2 h-0.5 rounded-full bg-indigo-500"></div>

          <div
            :data-message-id="msg.id"
            class="rounded-md border p-3 transition select-none"
            :class="isDraggingMessage(msg.id)
              ? 'border-indigo-300 bg-indigo-50/50 opacity-60 shadow-sm'
              : 'border-gray-200 bg-white'"
            @dragover.prevent="onDragOver($event, msg.id)"
            @drop.prevent="onDrop(msg.id)"
          >
            <div class="flex items-start gap-3">
              <button
                type="button"
                draggable="true"
                class="mt-0.5 inline-flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:cursor-grabbing"
                aria-label="Reordenar mensaje"
                title="Arrastra para reordenar"
                @dragstart="onDragStart($event, msg.id)"
                @dragend="onDragEnd"
                @touchstart.prevent="onTouchStart($event, msg.id)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="9" cy="6" r="1.5"></circle>
                  <circle cx="15" cy="6" r="1.5"></circle>
                  <circle cx="9" cy="12" r="1.5"></circle>
                  <circle cx="15" cy="12" r="1.5"></circle>
                  <circle cx="9" cy="18" r="1.5"></circle>
                  <circle cx="15" cy="18" r="1.5"></circle>
                </svg>
              </button>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium text-gray-900">{{ msg.name }}</p>
                  </div>
                  <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      class="btn-secondary inline-flex items-center gap-1 text-xs"
                      @click="toggleCustomPreview(msg.id)"
                      :aria-label="isCustomPreviewOpen(msg.id) ? 'Ocultar mensaje' : 'Ver mensaje'"
                      :title="isCustomPreviewOpen(msg.id) ? 'Ocultar mensaje' : 'Ver mensaje'"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span class="hidden sm:inline">{{ isCustomPreviewOpen(msg.id) ? 'Ocultar mensaje' : 'Ver mensaje' }}</span>
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                      @click="copyToClipboard(msg.renderedText)"
                      title="Copiar mensaje"
                      :aria-label="`Copiar ${msg.name}`"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-secondary inline-flex items-center gap-1 text-xs"
                      @click="openMessageEditor(msg.id)"
                      aria-label="Editar mensaje"
                      title="Editar mensaje"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                      </svg>
                      <span class="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      type="button"
                      class="btn-secondary inline-flex items-center gap-1 text-xs text-red-700"
                      @click="removeCustom(msg.id)"
                      aria-label="Eliminar mensaje"
                      title="Eliminar mensaje"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 6h18"></path>
                        <path d="M8 6V4h8v2"></path>
                        <path d="M19 6l-1 14H6L5 6"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                      </svg>
                      <span class="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
                <div v-if="isCustomPreviewOpen(msg.id)" class="mt-3 border-t border-gray-100 pt-3">
                  <pre class="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ msg.renderedText }}</pre>
                  <p v-if="msg.missing.length" class="mt-2 text-xs text-amber-700">
                    Faltan variables: {{ msg.missing.join(', ') }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="showDropIndicator(msg.id, 'after')" class="mt-2 h-0.5 rounded-full bg-indigo-500"></div>
        </div>
      </div>
    </div>

    <BaseModal :isOpen="showCustomModal" title="Nuevo mensaje" @close="closeCustomModal">
      <form class="space-y-4" @submit.prevent="saveCustomMessage">
        <AppInput v-model="customForm.name" label="Nombre del mensaje" placeholder="Seguimiento 24h" required />
        <AppTextarea
          v-model="customForm.body"
          label="Cuerpo del mensaje"
          :rows="7"
          :autoResize="true"
          placeholder="Hola {{nombres}}, te compartimos la información..."
        />

        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="closeCustomModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="savingCustom">{{ savingCustom ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </BaseModal>
  </div>

  <div v-else class="card border-amber-200 bg-amber-50/40">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
    <p class="mt-2 text-sm text-amber-800">No tienes permisos para gestionar mensajes.</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import BaseModal from '../components/ui/BaseModal.vue'
import {
  AppInput,
  AppTextarea,
} from '@/components/ui/forms'
import {
  DEFAULT_MESSAGE_SETTINGS,
  DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE,
  DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE,
  getMessageSettings,
  getPredefinedMessages,
  savePredefinedMessage,
  deletePredefinedMessage,
  reorderPredefinedMessages,
} from '../services/messageSettingsService'
import {
  buildGlobalVariables,
  buildVoucherMessage,
  resolveTemplate,
} from '../utils/messageUtils'
import { buildQuotationWhatsAppMessage, DEFAULT_PREREGISTRO_TEMPLATE } from '../utils/voucherUtils'

const { can } = usePermissions()
const accountStore = useAccountStore()
const toast = useToast()
const router = useRouter()

const showQuotationPreview = ref(false)
const showVoucherPreview = ref(false)
const showPreregistroPreview = ref(false)
const showDisponibilidadNegativaPreview = ref(false)
const showDisponibilidadPositivaPreview = ref(false)
const openCustomPreviewIds = ref(new Set())
const savingCustom = ref(false)
const showCustomModal = ref(false)
const activeDragMessageId = ref('')
const dropIndicator = ref({ id: '', position: 'before' })
const touchDragActive = ref(false)

const profile = ref({})
const accountSettings = ref({})
const systemForm = ref({ ...DEFAULT_MESSAGE_SETTINGS })
const messages = ref([])

const customForm = ref({ name: '', body: '' })

const customMessages = computed(() => {
  return messages.value.filter((msg) => msg.type === 'custom')
})

const renderedCustomMessages = computed(() => {
  return customMessages.value.map((msg) => {
    const resolved = resolveTemplate(msg.body || '', globalVars.value)
    return {
      id: msg.id,
      name: msg.name,
      renderedText: resolved.text,
      missing: resolved.missing,
    }
  })
})

const systemMessageByKey = computed(() => {
  const systemMessages = messages.value.filter((msg) => msg.type === 'system')
  return {
    quotation: systemMessages.find((msg) => msg.key === 'quotation')?.id || '',
    voucher: systemMessages.find((msg) => msg.key === 'voucher')?.id || '',
    preregistro: systemMessages.find((msg) => msg.key === 'preregistro')?.id || '',
    disponibilidad_negativa: systemMessages.find((msg) => msg.key === 'disponibilidad_negativa')?.id || '',
    disponibilidad_positiva: systemMessages.find((msg) => msg.key === 'disponibilidad_positiva')?.id || '',
  }
})

const sampleInquiry = computed(() => ({
  guest_name: 'Carlos Pérez',
  check_in: '2026-04-10',
  check_out: '2026-04-13',
  adults: 2,
  children: 1,
  reference_code: 'TKM-ABC123',
  price_per_night: 450000,
  discount_percentage: 10,
  quote_expires_at: '2026-04-01',
  unit_ids: [],
}))

const sampleReservation = computed(() => ({
  guest_name: 'Laura Gómez',
  check_in: '2026-05-01',
  check_out: '2026-05-04',
  adults: 2,
  children: 0,
  reference_code: 'TKM-RES55',
  total_amount: 1200000,
  paid_amount: 600000,
  reservation_units: [
    { units: { name: 'Habitación Coral', description: 'Vista al mar y aire acondicionado' } },
    { units: { name: 'Habitación Arena', description: 'Terraza privada y ventilación natural' } },
  ],
}))

const globalVars = computed(() => buildGlobalVariables({
  profile: profile.value,
  accountSettings: accountSettings.value,
  context: {
    guest_name: sampleInquiry.value.guest_name,
    check_in: sampleInquiry.value.check_in,
    check_out: sampleInquiry.value.check_out,
    nights: 3,
    personas: 3,
    reference: sampleInquiry.value.reference_code,
    total: 1215000,
    paid: 600000,
    balance: 615000,
  },
}))

const quotationPreview = computed(() => {
  const quotationTemplate = String(
    messages.value.find((msg) => msg.type === 'system' && msg.key === 'quotation')?.body || ''
  ).trim()

  return {
    text: buildQuotationWhatsAppMessage(
      {
        ...sampleInquiry.value,
        nights: 3,
      },
      profile.value,
      'https://example.com/public-quote?token=demo',
      {
        systemTemplate: quotationTemplate,
        accountSettings: accountSettings.value,
        units: [
          { name: 'Cabaña 1', description: 'Vista al mar y jacuzzi' },
          { name: 'Cabaña 2', description: 'Balcón y cocina equipada' },
        ],
      }
    ),
    missing: [],
  }
})

const voucherPreview = computed(() => buildVoucherMessage({
  reservation: sampleReservation.value,
  systemSettings: systemForm.value,
  globalVariables: globalVars.value,
  showUnitAmenities: Boolean(systemForm.value.show_unit_amenities),
  voucherConditions: String(accountSettings.value.voucher_conditions || ''),
}))

const preregistroPreview = computed(() => {
  const template = String(
    messages.value.find((msg) => msg.type === 'system' && msg.key === 'preregistro')?.body || DEFAULT_PREREGISTRO_TEMPLATE
  ).trim()
  return resolveTemplate(template, {
    nombres: 'Carlos',
    apellidos: 'Pérez',
    nombre_huesped: 'Carlos Pérez',
    nombre_alojamiento: profile.value?.commercial_name || profile.value?.legal_name || 'Marmanu House',
    fecha_checkin_larga: 'viernes, 10 de abril de 2026',
    link_preregistro: 'https://app.tekmiinn.com/prerregistro/abc123...',
    telefono: profile.value?.phone || '3102040245',
  })
})

const disponibilidadVariables = computed(() => ({
  ...globalVars.value,
  nombre_alojamiento: profile.value?.commercial_name || profile.value?.legal_name || 'Marmanu House',
  telefono: profile.value?.phone || '3102040245',
  fecha_checkin_larga: 'viernes, 10 de abril de 2026',
  fecha_checkout_larga: 'lunes, 13 de abril de 2026',
  noches: 3,
  personas: 3,
  unidades: [
    { nombre_unidad: 'Cabaña 1', descripcion_unidad: '2 camas dobles, balcón y aire acondicionado' },
    { nombre_unidad: 'Cabaña 2', descripcion_unidad: '1 cama king, jacuzzi y vista al jardín' },
  ],
  precio_noche: '$450.000',
  nombre_huesped: 'Carlos Pérez',
}))

const disponibilidadNegativaPreview = computed(() => {
  const template = String(
    messages.value.find((msg) => msg.type === 'system' && msg.key === 'disponibilidad_negativa')?.body || DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE
  ).trim()
  return resolveTemplate(template, disponibilidadVariables.value)
})

const disponibilidadPositivaPreview = computed(() => {
  const template = String(
    messages.value.find((msg) => msg.type === 'system' && msg.key === 'disponibilidad_positiva')?.body || DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE
  ).trim()
  return resolveTemplate(template, disponibilidadVariables.value)
})

const loadProfileAndSettings = async (accountId) => {
  const [{ data: profileData }, { data: settingsData }] = await Promise.all([
    supabase.from('account_profile').select('*').eq('account_id', accountId).maybeSingle(),
    supabase.from('settings').select('voucher_conditions, property_name, price_general_min, anticipo_pct').eq('account_id', accountId).maybeSingle(),
  ])

  profile.value = profileData || {}
  accountSettings.value = settingsData || {}
}

const loadData = async () => {
  if (!can('settings', 'edit')) return

  try {
    const accountId = accountStore.getRequiredAccountId()
    const [settings, allMessages] = await Promise.all([
      getMessageSettings(accountId),
      getPredefinedMessages(accountId),
      loadProfileAndSettings(accountId),
    ])

    systemForm.value = { ...DEFAULT_MESSAGE_SETTINGS, ...settings }
    messages.value = allMessages
  } catch (err) {
    toast.error(err.message || 'No se pudieron cargar los mensajes.')
  }
}

const toggleCustomPreview = (id) => {
  const next = new Set(openCustomPreviewIds.value)
  if (next.has(id)) { next.delete(id) } else { next.add(id) }
  openCustomPreviewIds.value = next
}

const isCustomPreviewOpen = (id) => openCustomPreviewIds.value.has(id)
const isDraggingMessage = (id) => String(activeDragMessageId.value) === String(id)
const showDropIndicator = (id, position) => String(dropIndicator.value.id) === String(id) && dropIndicator.value.position === position

const clearDragState = () => {
  activeDragMessageId.value = ''
  dropIndicator.value = { id: '', position: 'before' }
  touchDragActive.value = false
}

const getCustomMessageIndex = (id) => customMessages.value.findIndex((msg) => String(msg.id) === String(id))

const setDropIndicatorFromPoint = (clientY) => {
  const elements = Array.from(document.querySelectorAll('[data-message-id]'))
  if (!elements.length) {
    dropIndicator.value = { id: '', position: 'before' }
    return
  }

  for (const element of elements) {
    const rect = element.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2

    if (clientY < midpoint) {
      dropIndicator.value = {
        id: element.dataset.messageId || '',
        position: 'before',
      }
      return
    }
  }

  const lastElement = elements[elements.length - 1]
  dropIndicator.value = {
    id: lastElement?.dataset.messageId || '',
    position: 'after',
  }
}

const reorderCustomMessages = async (fromId, toId = dropIndicator.value.id, position = dropIndicator.value.position) => {
  const fromIndex = getCustomMessageIndex(fromId)
  const toIndex = getCustomMessageIndex(toId)

  if (fromIndex < 0 || toIndex < 0) {
    clearDragState()
    return
  }

  const list = [...customMessages.value]
  const [moved] = list.splice(fromIndex, 1)
  let destinationIndex = position === 'after' ? toIndex + 1 : toIndex

  if (fromIndex < toIndex) {
    destinationIndex -= 1
  }

  list.splice(destinationIndex, 0, moved)

  const didChange = list.some((item, index) => item.id !== customMessages.value[index]?.id)
  if (!didChange) {
    clearDragState()
    return
  }

  try {
    const accountId = accountStore.getRequiredAccountId()
    await reorderPredefinedMessages(accountId, list.map((item) => item.id))
    messages.value = await getPredefinedMessages(accountId)
  } catch (err) {
    toast.error(err.message || 'No se pudo reordenar el mensaje.')
  } finally {
    clearDragState()
  }
}

const onDragStart = (event, id) => {
  activeDragMessageId.value = String(id)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(id))
}

const onDragOver = (event, id) => {
  if (!activeDragMessageId.value) return

  const rect = event.currentTarget.getBoundingClientRect()
  dropIndicator.value = {
    id,
    position: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after',
  }
}

const onDrop = async (id) => {
  if (!activeDragMessageId.value) return
  const position = dropIndicator.value.id === id ? dropIndicator.value.position : 'after'
  await reorderCustomMessages(activeDragMessageId.value, id, position)
}

const onDragEnd = () => {
  if (!touchDragActive.value) {
    clearDragState()
  }
}

const handleTouchMove = (event) => {
  if (!touchDragActive.value || !event.touches?.length) return
  event.preventDefault()
  setDropIndicatorFromPoint(event.touches[0].clientY)
}

const handleTouchEnd = async () => {
  if (!touchDragActive.value || !activeDragMessageId.value || !dropIndicator.value.id) {
    clearDragState()
    return
  }

  await reorderCustomMessages(activeDragMessageId.value, dropIndicator.value.id, dropIndicator.value.position)
}

const onTouchStart = (event, id) => {
  activeDragMessageId.value = String(id)
  touchDragActive.value = true
  setDropIndicatorFromPoint(event.touches[0].clientY)
}

const toggleSystemPreview = (key) => {
  if (key === 'quotation') {
    showQuotationPreview.value = !showQuotationPreview.value
    return
  }

  if (key === 'voucher') {
    showVoucherPreview.value = !showVoucherPreview.value
    return
  }

  if (key === 'preregistro') {
    showPreregistroPreview.value = !showPreregistroPreview.value
    return
  }

  if (key === 'disponibilidad_negativa') {
    showDisponibilidadNegativaPreview.value = !showDisponibilidadNegativaPreview.value
    return
  }

  if (key === 'disponibilidad_positiva') {
    showDisponibilidadPositivaPreview.value = !showDisponibilidadPositivaPreview.value
  }
}

const openNewCustom = () => {
  customForm.value = { name: '', body: '' }
  showCustomModal.value = true
}

const closeCustomModal = () => {
  if (savingCustom.value) return
  showCustomModal.value = false
}

const openMessageEditor = (id) => {
  if (!id) return
  router.push(`/mensajes/${id}/editar`)
}

const copyToClipboard = async (text) => {
  await navigator.clipboard.writeText(String(text || ''))
  toast.success('Mensaje copiado al portapapeles.')
}

const saveCustomMessage = async () => {
  savingCustom.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const existing = customMessages.value
    const sortOrder = (existing[existing.length - 1]?.sort_order || 0) + 1

    await savePredefinedMessage(accountId, {
      name: customForm.value.name,
      body: customForm.value.body,
      type: 'custom',
      sort_order: sortOrder,
    })

    messages.value = await getPredefinedMessages(accountId)
    showCustomModal.value = false
    toast.success('Mensaje guardado.')
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar el mensaje.')
  } finally {
    savingCustom.value = false
  }
}

const removeCustom = async (id) => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    await deletePredefinedMessage(accountId, id)
    messages.value = await getPredefinedMessages(accountId)
    toast.success('Mensaje eliminado.')
  } catch (err) {
    toast.error(err.message || 'No se pudo eliminar el mensaje.')
  }
}

onMounted(() => {
  loadData()
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('touchcancel', clearDragState)
})

onBeforeUnmount(() => {
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', clearDragState)
})
</script>
