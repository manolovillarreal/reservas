<template>
  <div v-if="can('settings', 'edit')" class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <button type="button" class="btn-secondary text-sm" @click="goBack">Volver</button>
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Editor de mensaje</h1>
      <div class="w-[72px]"></div>
    </div>

    <div v-if="loading" class="card text-sm text-gray-600">Cargando mensaje...</div>

    <div v-else-if="!message" class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Mensaje no encontrado</h2>
      <p class="mt-2 text-sm text-amber-800">No se encontró el mensaje solicitado para esta cuenta.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside class="card space-y-5">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Variables</h2>
          <p class="mt-1 text-xs text-gray-500">Haz clic para insertar en la posición actual del cursor.</p>
        </div>

        <div class="space-y-4">
          <section v-for="group in variableGroups" :key="group.title" class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-900">{{ group.title }}</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in group.items"
                :key="item.token"
                type="button"
                class="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                @click="insertVariable(item.token)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>
        </div>

        <section v-if="isSystemMessage" class="space-y-3 border-t border-gray-200 pt-4">
          <h3 class="text-sm font-semibold text-gray-900">Bloques condicionales</h3>
          <AppToggle v-model="systemForm.show_unit_count" label="Mostrar numero de unidades" />
          <AppToggle v-model="systemForm.show_unit_name" label="Mostrar nombre de unidad" />
          <AppToggle v-model="systemForm.show_unit_description" label="Mostrar descripcion por unidad" />
        </section>
      </aside>

      <section class="card space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">{{ message.type === 'system' ? 'Sistema' : 'Personalizado' }}</p>
            <h2 class="text-xl font-semibold text-gray-900">{{ message.name }}</h2>
          </div>
          <button type="button" class="btn-primary text-sm" :disabled="saving" @click="saveMessage">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
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
          rows="16"
          class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Escribe el mensaje con variables como {{nombre_huesped}}"
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
  </div>

  <div v-else class="card border-amber-200 bg-amber-50/40">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
    <p class="mt-2 text-sm text-amber-800">No tienes permisos para gestionar mensajes.</p>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useAccountStore } from '../stores/account'
import AppToggle from '../components/ui/forms/AppToggle.vue'
import {
  DEFAULT_MESSAGE_SETTINGS,
  getMessageSettings,
  saveMessageSettings,
  savePredefinedMessage,
} from '../services/messageSettingsService'
import { buildGlobalVariables, resolveTemplate } from '../utils/messageUtils'

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
const textareaRef = ref(null)
const selectionStart = ref(0)
const selectionEnd = ref(0)

const profile = ref({})
const accountSettings = ref({})
const systemForm = ref({ ...DEFAULT_MESSAGE_SETTINGS })
const latestInquiry = ref(null)
const latestReservation = ref(null)

const variableGroups = [
  {
    title: 'Alojamiento',
    items: [
      { label: 'Nombre', token: 'nombre_alojamiento' },
      { label: 'Telefono', token: 'telefono' },
      { label: 'Ubicacion', token: 'ubicacion' },
      { label: 'Descripcion', token: 'descripcion_alojamiento' },
    ],
  },
  {
    title: 'Huesped',
    items: [
      { label: 'Nombre huesped', token: 'nombre_huesped' },
      { label: 'Telefono huesped', token: 'telefono_huesped' },
    ],
  },
  {
    title: 'Reserva / Consulta',
    items: [
      { label: 'Fechas', token: 'fechas' },
      { label: 'Noches', token: 'noches' },
      { label: 'Personas', token: 'personas' },
      { label: 'Codigo', token: 'codigo_referencia' },
      { label: 'Precio', token: 'precio_noche' },
      { label: 'Vigencia', token: 'fecha_vigencia' },
    ],
  },
]

const isSystemMessage = computed(() => message.value?.type === 'system')
const isQuotationMessage = computed(() => message.value?.key === 'quotation')

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

const diffNights = (checkIn, checkOut) => {
  const start = toDate(checkIn)
  const end = toDate(checkOut)
  if (!start || !end) return 0
  const diff = (end.getTime() - start.getTime()) / 86400000
  return diff > 0 ? Math.ceil(diff) : 0
}

const quoteContext = computed(() => {
  if (latestInquiry.value) {
    const inquiry = latestInquiry.value
    return {
      nombre_huesped: inquiry.guest_name || '-',
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
  if (latestReservation.value) {
    const reservation = latestReservation.value
    return {
      nombre_huesped: reservation.guest_name || '-',
      telefono_huesped: reservation.guest_phone || '-',
      fechas: formatDateRange(reservation.check_in, reservation.check_out),
      noches: diffNights(reservation.check_in, reservation.check_out),
      personas: Number(reservation.adults || 0) + Number(reservation.children || 0),
      codigo_referencia: reservation.reference_code || reservation.reservation_number || 'RES-0000',
      precio_noche: moneyFormatter.format(Number(reservation.price_per_night || 0)),
      fecha_vigencia: '-',
    }
  }

  return {
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
  const globalVars = buildGlobalVariables({
    profile: profile.value,
    accountSettings: accountSettings.value,
    context: {
      guest_name: context.nombre_huesped,
      check_in: isQuotationMessage.value ? latestInquiry.value?.check_in : latestReservation.value?.check_in,
      check_out: isQuotationMessage.value ? latestInquiry.value?.check_out : latestReservation.value?.check_out,
      nights: context.noches,
      personas: context.personas,
      reference: context.codigo_referencia,
      total: isQuotationMessage.value ? Number(latestInquiry.value?.price_per_night || 0) * Number(context.noches || 0) : Number(latestReservation.value?.total_amount || 0),
      paid: Number(latestReservation.value?.paid_amount || 0),
      balance: Math.max(0, Number(latestReservation.value?.total_amount || 0) - Number(latestReservation.value?.paid_amount || 0)),
    },
  })

  return {
    ...globalVars,
    ...context,
  }
})

const renderedPreview = computed(() => resolveTemplate(body.value, previewVariables.value))

const goBack = () => {
  router.push('/mensajes')
}

const syncCursor = () => {
  const node = textareaRef.value
  if (!node) return
  selectionStart.value = node.selectionStart ?? 0
  selectionEnd.value = node.selectionEnd ?? selectionStart.value
}

const insertVariable = async (token) => {
  if (viewMode.value !== 'raw') {
    viewMode.value = 'raw'
    await nextTick()
  }

  const node = textareaRef.value
  const insertion = `{{${token}}}`

  if (!node) {
    body.value = `${body.value}${insertion}`
    return
  }

  const start = node.selectionStart ?? selectionStart.value
  const end = node.selectionEnd ?? selectionEnd.value

  body.value = `${body.value.slice(0, start)}${insertion}${body.value.slice(end)}`

  await nextTick()
  const nextPos = start + insertion.length
  node.focus()
  node.setSelectionRange(nextPos, nextPos)
  selectionStart.value = nextPos
  selectionEnd.value = nextPos
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

    if (isSystemMessage.value) {
      systemForm.value = await saveMessageSettings(accountId, {
        ...systemForm.value,
        show_unit_count: Boolean(systemForm.value.show_unit_count),
        show_unit_name: Boolean(systemForm.value.show_unit_name),
        show_unit_description: Boolean(systemForm.value.show_unit_description),
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
      { data: inquiryData, error: inquiryError },
      { data: reservationData, error: reservationError },
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
        .select('property_name, price_general_min, voucher_conditions')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('inquiries')
        .select('id, guest_name, guest_phone, check_in, check_out, adults, children, reference_code, price_per_night, quote_expires_at, created_at')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('reservations')
        .select('id, guest_name, guest_phone, check_in, check_out, adults, children, reference_code, reservation_number, price_per_night, total_amount, paid_amount, created_at')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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
    latestInquiry.value = inquiryData || null
    latestReservation.value = reservationData || null
    systemForm.value = { ...DEFAULT_MESSAGE_SETTINGS, ...messageSettings }

    const persistedBody = String(row?.body || '')
    if (persistedBody.trim()) {
      body.value = persistedBody
    } else if (row?.type === 'system') {
      body.value = buildSystemTemplateFromSettings(row.key, systemForm.value)
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
