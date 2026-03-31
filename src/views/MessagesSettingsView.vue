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
              <button type="button" class="btn-secondary text-xs" @click="toggleSystemPreview('quotation')">
                {{ showQuotationPreview ? 'Ocultar mensaje' : 'Ver mensaje' }}
              </button>
              <button type="button" class="btn-secondary text-xs" :disabled="!systemMessageByKey.quotation" @click="openMessageEditor(systemMessageByKey.quotation)">Editar</button>
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
              <button type="button" class="btn-secondary text-xs" @click="toggleSystemPreview('voucher')">
                {{ showVoucherPreview ? 'Ocultar mensaje' : 'Ver mensaje' }}
              </button>
              <button type="button" class="btn-secondary text-xs" :disabled="!systemMessageByKey.voucher" @click="openMessageEditor(systemMessageByKey.voucher)">Editar</button>
            </div>
          </div>
          <pre v-if="showVoucherPreview" class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ voucherPreview.text }}</pre>
          <p v-if="showVoucherPreview && voucherPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ voucherPreview.missing.join(', ') }}
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
        <div v-for="(msg, index) in customMessages" :key="msg.id" class="rounded-md border border-gray-200 p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-gray-900">{{ msg.name }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button type="button" class="btn-secondary text-xs" @click="moveMessage(index, -1)" :disabled="index === 0">↑</button>
              <button type="button" class="btn-secondary text-xs" @click="moveMessage(index, 1)" :disabled="index === customMessages.length - 1">↓</button>
              <button type="button" class="btn-secondary text-xs" @click="openMessageEditor(msg.id)">Editar</button>
              <button type="button" class="btn-secondary text-xs text-red-700" @click="removeCustom(msg.id)">Eliminar</button>
            </div>
          </div>
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
          placeholder="Hola {{nombre_huesped}}, te compartimos la información..."
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
import { computed, onMounted, ref } from 'vue'
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
  getMessageSettings,
  getPredefinedMessages,
  savePredefinedMessage,
  deletePredefinedMessage,
  reorderPredefinedMessages,
} from '../services/messageSettingsService'
import {
  buildGlobalVariables,
  buildVoucherMessage,
} from '../utils/messageUtils'
import { buildQuotationWhatsAppMessage } from '../utils/voucherUtils'

const { can } = usePermissions()
const accountStore = useAccountStore()
const toast = useToast()
const router = useRouter()

const showQuotationPreview = ref(false)
const showVoucherPreview = ref(false)
const savingCustom = ref(false)
const showCustomModal = ref(false)

const profile = ref({})
const accountSettings = ref({})
const systemForm = ref({ ...DEFAULT_MESSAGE_SETTINGS })
const messages = ref([])

const customForm = ref({ name: '', body: '' })

const customMessages = computed(() => {
  return messages.value.filter((msg) => msg.type === 'custom')
})

const systemMessageByKey = computed(() => {
  const systemMessages = messages.value.filter((msg) => msg.type === 'system')
  return {
    quotation: systemMessages.find((msg) => msg.key === 'quotation')?.id || '',
    voucher: systemMessages.find((msg) => msg.key === 'voucher')?.id || '',
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

const toggleSystemPreview = (key) => {
  if (key === 'quotation') {
    showQuotationPreview.value = !showQuotationPreview.value
    return
  }

  if (key === 'voucher') {
    showVoucherPreview.value = !showVoucherPreview.value
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

const moveMessage = async (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= customMessages.value.length) return

  const list = [...customMessages.value]
  const [moved] = list.splice(index, 1)
  list.splice(targetIndex, 0, moved)

  try {
    const accountId = accountStore.getRequiredAccountId()
    await reorderPredefinedMessages(accountId, list.map((item) => item.id))
    messages.value = await getPredefinedMessages(accountId)
  } catch (err) {
    toast.error(err.message || 'No se pudo reordenar el mensaje.')
  }
}

onMounted(loadData)
</script>
