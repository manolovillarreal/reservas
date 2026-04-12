<template>
  <div v-if="can('settings', 'edit')" class="relative space-y-6">
    <div class="flex items-center justify-between gap-3">
      <button type="button" class="btn-secondary text-sm" @click="goBack">Volver</button>
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Editor de mensaje</h1>
      <div class="hidden w-[72px] sm:block"></div>
    </div>

    <button
      v-if="message && !loading && !showDrawer"
      type="button"
      class="fixed left-0 top-1/2 z-40 -translate-y-1/2 rounded-r-full border border-l-0 border-indigo-200 bg-indigo-50 px-2 py-3 text-xs font-semibold tracking-wide text-indigo-700 shadow-sm transition hover:bg-indigo-100 sm:hidden"
      @click="showDrawer = true"
    >
      Variables
    </button>

    <div v-if="loading" class="card text-sm text-gray-600">Cargando mensaje...</div>

    <div v-else-if="!message" class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Mensaje no encontrado</h2>
      <p class="mt-2 text-sm text-amber-800">No se encontró el mensaje solicitado para esta cuenta.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:h-[calc(100dvh-10.5rem)] lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
      <!-- Panel izquierdo — oculto en mobile -->
      <aside class="hidden sm:block card space-y-5 lg:h-full lg:overflow-y-auto">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Variables</h2>
          <p class="mt-1 text-xs text-gray-500">Haz clic para insertar en la posición actual del cursor.</p>
        </div>

        <div class="space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Modo de inserción</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="mode in insertionModes"
              :key="mode.value"
              type="button"
              class="rounded-md border px-2 py-1.5 text-xs font-semibold transition"
              :class="insertionModeButtonClass(mode.value)"
              @click="insertionMode = mode.value"
            >{{ mode.label }}</button>
          </div>
        </div>

        <div class="space-y-4">
          <section v-for="group in variableGroups" :key="group.title" class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-900">{{ group.title }}</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in group.items"
                :key="item.token"
                type="button"
                class="rounded-full border px-3 py-1 text-xs font-medium transition"
                :class="variableChipClass"
                @click="insertVariable(item.token)"
              >{{ item.label }}</button>
            </div>
          </section>
        </div>

        <div class="space-y-3 border-t border-gray-200 pt-4">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Bloques</h2>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="block in blockSnippets"
              :key="block.label"
              type="button"
              class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
              @click="insertText(block.snippet)"
            >{{ block.label }}</button>
            <button
              type="button"
              class="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
              @click="insertText(elseBlockSnippet.snippet)"
            >{{ elseBlockSnippet.label }}</button>
          </div>
          <p class="text-xs text-gray-500">Reemplaza 'variable' con el nombre de la variable que quieres evaluar.</p>
        </div>

        <div class="space-y-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            class="flex w-full items-center justify-between text-left"
            @click="toggleEmojisSection"
          >
            <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Emojis</h2>
            <span class="text-xs text-gray-500">{{ emojisExpanded ? 'Ocultar' : 'Mostrar' }}</span>
          </button>
          <div v-if="emojisExpanded" class="space-y-2">
            <section v-for="group in emojiGroups" :key="group.title" class="space-y-1.5">
              <button
                type="button"
                class="flex w-full items-center justify-between text-left"
                @click="toggleEmojiGroup(group.title)"
              >
                <h3 class="text-xs font-medium text-gray-500">{{ group.title }}</h3>
                <span class="text-xs text-gray-400">{{ isEmojiGroupExpanded(group.title) ? '−' : '+' }}</span>
              </button>
              <div v-if="isEmojiGroupExpanded(group.title)" class="grid grid-cols-6 gap-1">
                <button
                  v-for="emoji in group.emojis"
                  :key="emoji"
                  type="button"
                  class="flex items-center justify-center rounded p-1 text-xl leading-none transition hover:bg-gray-100"
                  @click="insertText(emoji)"
                >{{ emoji }}</button>
              </div>
            </section>
          </div>
        </div>

      </aside>

      <!-- Panel editor -->
      <section class="card space-y-4 lg:h-full lg:overflow-y-auto">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">{{ message.type === 'system' ? 'Sistema' : 'Personalizado' }}</p>
            <h2 class="text-xl font-semibold text-gray-900">{{ message.name }}</h2>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="isSystemMessage"
              type="button"
              class="btn-secondary text-sm"
              :disabled="saving"
              @click="restoreDefaultMessage"
            >Restaurar por defecto</button>
            <button
              type="button"
              class="btn-secondary text-sm"
              @click="buildWithAI"
            >Construir con IA 🤖</button>
            <button type="button" class="btn-primary text-sm" :disabled="saving" @click="saveMessage">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>

        <!-- Encabezado de contexto para preview -->
        <div class="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Preview con:</span>
              <span v-if="contextInfo.isMock" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Mock</span>
            </div>
            <p class="truncate text-sm font-medium text-gray-900">{{ contextInfo.guestName }}</p>
            <p class="truncate text-xs text-gray-500">{{ contextInfo.dates }} · {{ contextInfo.reference }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="rounded px-1.5 py-1 text-sm text-gray-500 transition hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canPrev"
              @click="prevContext"
            >←</button>
            <span class="min-w-[44px] text-center text-xs text-gray-500">
              {{ usingMock ? 'mock' : (contextIndex + 1) + '/' + activeContextList.length }}
            </span>
            <button
              type="button"
              class="rounded px-1.5 py-1 text-sm text-gray-500 transition hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canNext"
              @click="nextContext"
            >→</button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition"
            :class="viewMode === 'raw' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="viewMode = 'raw'"
          >
            Raw
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition"
            :class="viewMode === 'render' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="viewMode = 'render'"
          >
            Render
          </button>
        </div>

        <textarea
          v-if="viewMode === 'raw'"
          ref="textareaRef"
          v-model="body"
          rows="35"
          class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Escribe el mensaje con variables como {{nombres}}"
          @click="syncCursor"
          @keyup="syncCursor"
          @select="syncCursor"
          @input="syncCursor"
        ></textarea>

        <div v-else class="min-h-[320px] whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          {{ renderedPreview.text }}
        </div>

        <p v-if="viewMode === 'render' && renderedPreview.missing.length" class="text-xs text-amber-700">
          Faltan variables: {{ renderedPreview.missing.join(', ') }}
        </p>
      </section>
    </div>

    <!-- Drawer mobile -->
    <Teleport to="body">
      <div v-if="showDrawer" class="fixed inset-0 z-50 flex sm:hidden">
        <div class="absolute inset-0 bg-black/40" @click="showDrawer = false"></div>
        <div class="relative z-10 flex h-full w-2/3 max-w-xs flex-col overflow-hidden bg-white shadow-xl">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-200 p-4">
            <h2 class="font-semibold text-gray-900">Variables y emojis</h2>
            <button type="button" class="text-xl leading-none text-gray-500 hover:text-gray-900" @click="showDrawer = false">✕</button>
          </div>
          <div class="flex-1 space-y-5 overflow-y-auto p-4">
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Variables</h2>
              <p class="mt-1 text-xs text-gray-500">Toca para insertar.</p>
            </div>

            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Modo de inserción</p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="mode in insertionModes"
                  :key="'d-mode-' + mode.value"
                  type="button"
                  class="rounded-md border px-2 py-1.5 text-[11px] font-semibold transition"
                  :class="insertionModeButtonClass(mode.value)"
                  @click="insertionMode = mode.value"
                >{{ mode.label }}</button>
              </div>
            </div>

            <div class="space-y-4">
              <section v-for="group in variableGroups" :key="'d-' + group.title" class="space-y-2">
                <h3 class="text-sm font-semibold text-gray-900">{{ group.title }}</h3>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="item in group.items"
                    :key="'d-' + item.token"
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-medium transition"
                    :class="variableChipClass"
                    @click="insertVariable(item.token, true)"
                  >{{ item.label }}</button>
                </div>
              </section>
            </div>

            <div class="space-y-3 border-t border-gray-200 pt-4">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Bloques</h2>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="block in blockSnippets"
                  :key="'d-' + block.label"
                  type="button"
                  class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                  @click="insertText(block.snippet, true)"
                >{{ block.label }}</button>
                <button
                  type="button"
                  class="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
                  @click="insertText(elseBlockSnippet.snippet, true)"
                >{{ elseBlockSnippet.label }}</button>
              </div>
              <p class="text-xs text-gray-500">Reemplaza 'variable' con el nombre de la variable que quieres evaluar.</p>
            </div>

            <div class="space-y-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                class="flex w-full items-center justify-between text-left"
                @click="toggleEmojisSection"
              >
                <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Emojis</h2>
                <span class="text-xs text-gray-500">{{ emojisExpanded ? 'Ocultar' : 'Mostrar' }}</span>
              </button>
              <div v-if="emojisExpanded" class="space-y-2">
                <section v-for="group in emojiGroups" :key="'d-' + group.title" class="space-y-1.5">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between text-left"
                    @click="toggleEmojiGroup(group.title)"
                  >
                    <h3 class="text-xs font-medium text-gray-500">{{ group.title }}</h3>
                    <span class="text-xs text-gray-400">{{ isEmojiGroupExpanded(group.title) ? '−' : '+' }}</span>
                  </button>
                  <div v-if="isEmojiGroupExpanded(group.title)" class="grid grid-cols-6 gap-1">
                    <button
                      v-for="emoji in group.emojis"
                      :key="'d-' + emoji"
                      type="button"
                      class="flex items-center justify-center rounded p-1 text-xl leading-none transition hover:bg-gray-100"
                      @click="insertText(emoji, true)"
                    >{{ emoji }}</button>
                  </div>
                </section>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <div v-else class="card border-amber-200 bg-amber-50/40">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
    <p class="mt-2 text-sm text-amber-800">No tienes permisos para gestionar mensajes.</p>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useAccountStore } from '../stores/account'
import {
  DEFAULT_MESSAGE_SETTINGS,
  getMessageSettings,
  savePredefinedMessage,
} from '../services/messageSettingsService'
import { buildGlobalVariables, resolveTemplate, VARIABLE_CATALOG, generateAiPrompt } from '../utils/messageUtils'
import {
  buildQuotePublicUrl,
  buildQuotationWhatsAppMessage,
  DEFAULT_QUOTATION_TEMPLATE,
  DEFAULT_VOUCHER_TEMPLATE,
  DEFAULT_PREREGISTRO_TEMPLATE,
} from '../utils/voucherUtils'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const accountStore = useAccountStore()
const { can } = usePermissions()

const loading = ref(true)
const saving = ref(false)
const message = ref(null)
const body = ref('')
const viewMode = ref('raw')
const insertionMode = ref('insert')
const textareaRef = ref(null)
const selectionStart = ref(0)
const selectionEnd = ref(0)
const showDrawer = ref(false)

const profile = ref({})
const accountSettings = ref({})
const systemForm = ref({ ...DEFAULT_MESSAGE_SETTINGS })
const inquiryList = ref([])
const reservationList = ref([])
const contextIndex = ref(0)

const CATEGORY_LABELS = {
  huesped: 'Huésped',
  fechas: 'Fechas',
  disponibilidad: 'Disponibilidad',
  precio: 'Precio',
  alojamiento: 'Alojamiento',
  checkin: 'Check-in / Check-out',
  preregistro: 'Pre-registro',
}

const variableGroups = Object.entries(VARIABLE_CATALOG.simples).map(([key, vars]) => ({
  title: CATEGORY_LABELS[key] || key,
  items: vars.map((v) => ({ label: v.label, token: v.key })),
}))

const insertionModes = [
  { value: 'insert', label: 'Insertar' },
  { value: 'if_exists', label: 'Si existe' },
  { value: 'if_not_exists', label: 'Si no existe' },
]

const insertionModeButtonClass = (mode) => {
  if (insertionMode.value !== mode) {
    return 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
  }

  if (mode === 'if_exists') {
    return 'bg-green-100 border-green-400 text-green-700'
  }

  if (mode === 'if_not_exists') {
    return 'bg-purple-100 border-purple-400 text-purple-700'
  }

  return 'bg-indigo-100 border-indigo-400 text-indigo-700'
}

const variableChipClass = computed(() => {
  if (insertionMode.value === 'if_exists') {
    return 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
  }
  if (insertionMode.value === 'if_not_exists') {
    return 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
  }
  return 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
})

const blockSnippets = VARIABLE_CATALOG.bloques.map((b) => ({ label: b.label, snippet: b.template }))
const elseBlockSnippet = {
  label: 'Else / Si no existe',
  snippet: '{{^variable}}\nContenido alternativo\n{{/variable}}',
}

const emojiGroups = [
  {
    title: 'Saludos y cortesía',
    emojis: ['👋', '😊', '🙏', '✨', '🌟', '💫', '😄', '🤗', '😍', '🥰', '💝', '🎊'],
  },
  {
    title: 'Confirmación y positivo',
    emojis: ['✅', '🎉', '👍', '💯', '🔑', '🏆', '🥳', '🎁', '👏', '💪', '🌈', '⭐'],
  },
  {
    title: 'Información y datos',
    emojis: ['📋', '📅', '📍', '💰', '🏠', '📞', '📱', '💬', '📝', '🗓️', '🔐', '📎'],
  },
  {
    title: 'Viajes y alojamiento',
    emojis: ['🏡', '🛏️', '🛁', '🏊', '🌴', '🌊', '🏖️', '🗺️', '🧳', '✈️', '🚗', '🌅'],
  },
  {
    title: 'Comida y servicios',
    emojis: ['☕', '🍽️', '🥂', '🍾', '🧹', '🔧', '🛒️', '🌿', '🕯️', '🎶', '🌙', '🌞'],
  },
  {
    title: 'Alertas y recordatorios',
    emojis: ['⚠️', '⏰', '📌', '🔔', '❗', '❓', '🔴', '🟡', '🟢', '📣', '🚨', '💡'],
  },
  {
    title: 'Corazones y sentimientos',
    emojis: ['❤️', '🧡', '📛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓', '💗'],
  },
]

const emojisExpanded = ref(true)
const emojiGroupsExpanded = ref(
  Object.fromEntries(emojiGroups.map((group) => [group.title, true]))
)

const toggleEmojisSection = () => {
  emojisExpanded.value = !emojisExpanded.value
}

const isEmojiGroupExpanded = (title) => Boolean(emojiGroupsExpanded.value[title])

const toggleEmojiGroup = (title) => {
  emojiGroupsExpanded.value = {
    ...emojiGroupsExpanded.value,
    [title]: !isEmojiGroupExpanded(title),
  }
}

const isSystemMessage = computed(() => message.value?.type === 'system')
const isQuotationMessage = computed(() => message.value?.key === 'quotation')

const activeContextList = computed(() =>
  isQuotationMessage.value ? inquiryList.value : reservationList.value
)

const activeRecord = computed(() => {
  if (activeContextList.value.length === 0) return null
  return activeContextList.value[contextIndex.value] ?? null
})

const usingMock = computed(() => activeContextList.value.length === 0)
const canPrev = computed(() => !usingMock.value && contextIndex.value > 0)
const canNext = computed(() => !usingMock.value && contextIndex.value < activeContextList.value.length - 1)

const prevContext = () => { if (canPrev.value) contextIndex.value -= 1 }
const nextContext = () => { if (canNext.value) contextIndex.value += 1 }

const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const longDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const longDateWithWeekdayFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateRange = (checkIn, checkOut, fallback = '-') => {
  const start = toDate(checkIn)
  const end = toDate(checkOut)
  if (!start || !end) return fallback
  return `${longDateFormatter.format(start)} al ${longDateFormatter.format(end)}`
}

const formatDateLongWithWeekday = (value, fallback = '-') => {
  const date = toDate(value)
  if (!date) return fallback
  return longDateWithWeekdayFormatter.format(date)
}

const diffNights = (checkIn, checkOut) => {
  const start = toDate(checkIn)
  const end = toDate(checkOut)
  if (!start || !end) return 0
  const diff = (end.getTime() - start.getTime()) / 86400000
  return diff > 0 ? Math.ceil(diff) : 0
}

const contextInfo = computed(() => {
  if (usingMock.value) {
    return isQuotationMessage.value
      ? { guestName: 'Maria Garcia', dates: '15 al 20 de abril', reference: 'INQ-202604-0001', isMock: true }
      : { guestName: 'Carlos Suarez', dates: '10 al 15 de mayo', reference: 'RES-202605-0012', isMock: true }
  }
  const record = activeRecord.value
  if (!record) return { guestName: '-', dates: '-', reference: '-', isMock: false }
  const isInquiry = isQuotationMessage.value
  const guestName = isInquiry
    ? ([record.guest_first_name, record.guest_last_name].filter(Boolean).join(' ') || '-')
    : ([record.guests?.first_name, record.guests?.last_name].filter(Boolean).join(' ') || '-')
  return {
    guestName,
    dates: formatDateRange(record.check_in, record.check_out),
    reference: record.reference_code || record.reservation_number || '-',
    isMock: false,
  }
})

const quoteContext = computed(() => {
  const inquiry = activeRecord.value
  if (inquiry) {
    return {
      guest_first_name: inquiry.guest_first_name || '',
      guest_last_name: inquiry.guest_last_name || '',
      nombre_huesped: [inquiry.guest_first_name, inquiry.guest_last_name].filter(Boolean).join(' ') || '-',
      telefono_huesped: inquiry.guest_phone || '-',
      fechas: formatDateRange(inquiry.check_in, inquiry.check_out),
      noches: diffNights(inquiry.check_in, inquiry.check_out),
      personas: Number(inquiry.adults || 0) + Number(inquiry.children || 0),
      codigo_referencia: inquiry.reference_code || 'INQ-0000',
      precio_noche: moneyFormatter.format(Number(inquiry.price_per_night || 0)),
      fecha_vigencia: inquiry.quote_expires_at ? longDateFormatter.format(new Date(inquiry.quote_expires_at)) : '-',
    }
  }

  return {
    guest_first_name: 'Maria',
    guest_last_name: 'Garcia',
    nombre_huesped: 'Maria Garcia',
    telefono_huesped: '-',
    fechas: '15 al 20 de abril',
    noches: 5,
    personas: 3,
    codigo_referencia: 'INQ-202604-0001',
    precio_noche: '$210,000',
    fecha_vigencia: '20 de abril de 2026',
  }
})

const reservationContext = computed(() => {
  const reservation = activeRecord.value
  if (reservation) {
    return {
      guest_first_name: reservation.guests?.first_name || '',
      guest_last_name: reservation.guests?.last_name || '',
      nombre_huesped: [reservation.guests?.first_name, reservation.guests?.last_name].filter(Boolean).join(' ') || '-',
      telefono_huesped: reservation.guests?.phone || '-',
      fechas: formatDateRange(reservation.check_in, reservation.check_out),
      noches: diffNights(reservation.check_in, reservation.check_out),
      personas: Number(reservation.adults || 0) + Number(reservation.children || 0),
      codigo_referencia: reservation.reference_code || reservation.reservation_number || 'RES-0000',
      precio_noche: moneyFormatter.format(Number(reservation.price_per_night || 0)),
      fecha_vigencia: '-',
    }
  }

  return {
    guest_first_name: 'Carlos',
    guest_last_name: 'Suarez',
    nombre_huesped: 'Carlos Suarez',
    telefono_huesped: '-',
    fechas: '10 al 15 de mayo',
    noches: 5,
    personas: 4,
    codigo_referencia: 'RES-202605-0012',
    precio_noche: '$250,000',
    fecha_vigencia: '-',
  }
})

const buildSystemTemplateFromSettings = (key, settings) => {
  if (key === 'preregistro') return DEFAULT_PREREGISTRO_TEMPLATE

  if (!settings || (key !== 'quotation' && key !== 'voucher')) return ''

  if (key === 'quotation') {
    return [
      String(settings.quotation_greeting || '').trim(),
      String(settings.quotation_intro || '').trim(),
      String(settings.quotation_closing || '').trim(),
      String(settings.quotation_signature || '').trim(),
    ].filter(Boolean).join('\n\n')
  }

  return [
    String(settings.voucher_greeting || '').trim(),
    String(settings.voucher_intro || '').trim(),
    String(settings.voucher_closing || '').trim(),
    String(settings.voucher_signature || '').trim(),
  ].filter(Boolean).join('\n\n')
}

const previewVariables = computed(() => {
  const context = isQuotationMessage.value ? quoteContext.value : reservationContext.value
  const record = activeRecord.value
  const reservationUnits = (record?.reservation_units || []).map((row) => row.units).filter(Boolean)
  const total = isQuotationMessage.value
    ? Number(record?.price_per_night || 0) * Number(context.noches || 0)
    : Number(record?.total_amount || 0)
  const paid = Number(record?.paid_amount || 0)
  const balance = Math.max(0, total - paid)
  const conditionsText = String(accountSettings.value?.voucher_conditions || '').trim()
  const fallbackNombreCompleto = String(context.nombre_huesped || context.nombre_completo || '').trim()
  const fallbackParts = fallbackNombreCompleto ? fallbackNombreCompleto.split(/\s+/) : []
  const nombres = String(context.guest_first_name || context.nombres || fallbackParts[0] || '').trim()
  const apellidos = String(
    context.guest_last_name
      || context.apellidos
      || (fallbackParts.length > 1 ? fallbackParts.slice(1).join(' ') : '')
  ).trim()
  const nombreCompleto = `${nombres} ${apellidos}`.trim() || fallbackNombreCompleto

  const globalVars = buildGlobalVariables({
    profile: profile.value,
    accountSettings: accountSettings.value,
    context: {
      nombres,
      apellidos,
      nombre_completo: nombreCompleto,
      guest_first_name: context.guest_first_name,
      guest_last_name: context.guest_last_name,
      check_in: record?.check_in,
      check_out: record?.check_out,
      nights: context.noches,
      personas: context.personas,
      reference: context.codigo_referencia,
      total,
      paid,
      balance,
    },
  })

  return {
    ...globalVars,
    ...context,
    fecha_checkin_larga: formatDateLongWithWeekday(record?.check_in),
    fecha_checkout_larga: formatDateLongWithWeekday(record?.check_out),
    hora_checkin: systemForm.value?.checkin_time || '3:00 PM',
    hora_checkout: systemForm.value?.checkout_time || '12:00 PM',
    condiciones: conditionsText,
    link_preregistro: '[Link de pre-registro]',
    unidades: reservationUnits.map((unit) => ({
      nombre_unidad: unit?.name || 'Unidad',
      descripcion_unidad: unit?.description || '',
    })),
    pago_completo: total > 0 && paid >= total ? { total: globalVars.total, pagado: globalVars.pagado } : null,
    saldo_pendiente: paid > 0 && balance > 0
      ? { total: globalVars.total, pagado: globalVars.pagado, saldo_pendiente: globalVars.saldo_pendiente }
      : null,
    sin_pagos: paid <= 0 ? { total: globalVars.total } : null,
  }
})

const renderedPreview = computed(() => {
  if (isSystemMessage.value && isQuotationMessage.value) {
    const record = activeRecord.value
    const nights = quoteContext.value.noches
    const text = buildQuotationWhatsAppMessage(
      {
        ...record,
        guest_name: [record?.guest_first_name, record?.guest_last_name].filter(Boolean).join(' ') || ([record?.guests?.first_name, record?.guests?.last_name].filter(Boolean).join(' ')) || quoteContext.value.nombre_huesped,
        guest_phone: record?.guest_phone || record?.guests?.phone || quoteContext.value.telefono_huesped,
        check_in: record?.check_in,
        check_out: record?.check_out,
        adults: Number(record?.adults || 0),
        children: Number(record?.children || 0),
        reference_code: record?.reference_code || quoteContext.value.codigo_referencia,
        quotation_number: record?.inquiry_number,
        price_per_night: Number(record?.price_per_night || 0),
        discount_percentage: Number(record?.discount_percentage || 0),
        quote_expires_at: record?.quote_expires_at,
        nights,
      },
      profile.value,
      buildQuotePublicUrl(record?.quote_token),
      {
        systemTemplate: body.value,
        accountSettings: accountSettings.value,
        units: (record?.inquiry_units || []).map((row) => row.units).filter(Boolean),
      }
    )

    return {
      text,
      missing: resolveTemplate(body.value, previewVariables.value).missing,
    }
  }

  return resolveTemplate(body.value, previewVariables.value)
})

watch([body, previewVariables], ([currentBody, vars]) => {
  if (!import.meta.env.DEV) return
  if (!/{{\s*(nombres|apellidos|nombre_completo)\s*}}/.test(String(currentBody || ''))) return
  if (String(vars?.nombres || '').trim() && String(vars?.apellidos || '').trim()) return

  console.debug('[MessageEditor] Variables de nombre incompletas en preview', {
    nombres: vars?.nombres,
    apellidos: vars?.apellidos,
    nombre_completo: vars?.nombre_completo,
    contextIndex: contextIndex.value,
    usingMock: usingMock.value,
    messageKey: message.value?.key,
  })
})

const restoreDefaultMessage = () => {
  if (!isSystemMessage.value) return

  if (isQuotationMessage.value) {
    body.value = DEFAULT_QUOTATION_TEMPLATE
    return
  }

  if (message.value?.key === 'voucher') {
    body.value = DEFAULT_VOUCHER_TEMPLATE
    return
  }

  if (message.value?.key === 'preregistro') {
    body.value = DEFAULT_PREREGISTRO_TEMPLATE
    return
  }

  body.value = buildSystemTemplateFromSettings(message.value?.key, systemForm.value)
}

const goBack = () => {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/configuracion')
}

const buildWithAI = async () => {
  const prompt = generateAiPrompt()
  await navigator.clipboard.writeText(prompt)
  toast.success('Prompt copiado — pégalo en tu IA favorita 🤖')
}

const syncCursor = () => {
  const node = textareaRef.value
  if (!node) return
  selectionStart.value = node.selectionStart ?? 0
  selectionEnd.value = node.selectionEnd ?? selectionStart.value
}

const insertText = async (text, closeDrawer = false) => {
  if (viewMode.value !== 'raw') {
    viewMode.value = 'raw'
    await nextTick()
  }

  const node = textareaRef.value

  if (!node) {
    body.value = `${body.value}${text}`
    if (closeDrawer) showDrawer.value = false
    return
  }

  const start = node.selectionStart ?? selectionStart.value
  const end = node.selectionEnd ?? selectionEnd.value

  body.value = `${body.value.slice(0, start)}${text}${body.value.slice(end)}`

  await nextTick()
  const nextPos = start + text.length
  node.focus()
  node.setSelectionRange(nextPos, nextPos)
  selectionStart.value = nextPos
  selectionEnd.value = nextPos

  if (closeDrawer) showDrawer.value = false
}

const insertVariable = async (token, closeDrawer = false) => {
  if (insertionMode.value === 'if_exists') {
    await insertText(`{{#${token}}}\nContenido\n{{/${token}}}`, closeDrawer)
    insertionMode.value = 'insert'
    return
  }

  if (insertionMode.value === 'if_not_exists') {
    await insertText(`{{^${token}}}\nContenido alternativo\n{{/${token}}}`, closeDrawer)
    insertionMode.value = 'insert'
    return
  }

  await insertText(`{{${token}}}`, closeDrawer)
}

const saveMessage = async () => {
  if (!message.value) return

  saving.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    const trimmedBody = String(body.value || '').trim()

    if (trimmedBody || message.value.type !== 'system') {
      await savePredefinedMessage(accountId, {
        id: message.value.id,
        name: message.value.name,
        body: body.value,
        type: message.value.type,
        key: message.value.key,
        sort_order: message.value.sort_order,
      })
    }

    toast.success('Mensaje guardado.')
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar el mensaje.')
  } finally {
    saving.value = false
  }
}

const loadData = async () => {
  if (!can('settings', 'edit')) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const messageId = String(route.params.id || '')

    const [
      { data: row, error: messageError },
      { data: profileData, error: profileError },
      { data: settingsData, error: settingsError },
      { data: inquiriesData, error: inquiryError },
      { data: reservationsData, error: reservationError },
      messageSettings,
    ] = await Promise.all([
      supabase
        .from('predefined_messages')
        .select('*')
        .eq('account_id', accountId)
        .eq('id', messageId)
        .maybeSingle(),
      supabase
        .from('account_profile')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('settings')
        .select('property_name, price_general_min, anticipo_pct, voucher_conditions')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('inquiries')
        .select('id, guest_first_name, guest_last_name, guest_phone, check_in, check_out, adults, children, reference_code, inquiry_number, price_per_night, discount_percentage, quote_expires_at, quote_token, created_at, inquiry_units(unit_id, units(name, description))')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('reservations')
        .select('id, guest_id, check_in, check_out, adults, children, reference_code, reservation_number, price_per_night, total_amount, paid_amount, created_at, guests!reservations_guest_id_fkey(first_name, last_name, phone), reservation_units(unit_id, units(name, description))')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(10),
      getMessageSettings(accountId),
    ])

    if (messageError) throw messageError
    if (profileError) throw profileError
    if (settingsError) throw settingsError
    if (inquiryError) throw inquiryError
    if (reservationError) throw reservationError

    message.value = row || null
    profile.value = profileData || {}
    accountSettings.value = settingsData || {}
    inquiryList.value = inquiriesData || []
    reservationList.value = reservationsData || []
    contextIndex.value = 0
    systemForm.value = { ...DEFAULT_MESSAGE_SETTINGS, ...messageSettings }

    const persistedBody = String(row?.body || '')
    if (persistedBody.trim()) {
      body.value = persistedBody
    } else if (row?.type === 'system') {
      body.value = row.key === 'quotation'
        ? DEFAULT_QUOTATION_TEMPLATE
        : row.key === 'voucher'
          ? DEFAULT_VOUCHER_TEMPLATE
          : buildSystemTemplateFromSettings(row.key, systemForm.value)
    } else {
      body.value = ''
    }
  } catch (err) {
    toast.error(err.message || 'No se pudo cargar el editor de mensajes.')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
