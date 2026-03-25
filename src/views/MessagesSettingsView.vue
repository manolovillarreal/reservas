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
        <button type="button" class="btn-primary text-sm" :disabled="savingSystem" @click="saveSystemSettings">
          {{ savingSystem ? 'Guardando...' : 'Guardar configuración' }}
        </button>
      </div>

      <div class="space-y-4">
        <div class="rounded-md border border-gray-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-gray-900">Cotización</p>
            <div class="flex items-center gap-2">
              <button type="button" class="btn-secondary text-xs" @click="toggleSystemEditor('quotation')">
                {{ openSystemEditor === 'quotation' ? 'Cerrar' : 'Editar' }}
              </button>
              <button type="button" class="btn-secondary text-xs" @click="resetQuotationDefaults">Restablecer valores predeterminados</button>
            </div>
          </div>
          <pre class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ quotationPreview.text }}</pre>
          <p v-if="quotationPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ quotationPreview.missing.join(', ') }}
          </p>

          <div v-if="openSystemEditor === 'quotation'" class="mt-4 space-y-3 rounded border border-gray-100 p-3">
            <AppTextarea v-model="systemForm.quotation_greeting" label="Saludo" :rows="2" :autoResize="true" />
            <AppTextarea v-model="systemForm.quotation_intro" label="Introducción" :rows="2" :autoResize="true" />
            <AppTextarea v-model="systemForm.quotation_closing" label="Cierre" :rows="2" :autoResize="true" />
            <AppTextarea v-model="systemForm.quotation_signature" label="Firma" :rows="2" :autoResize="true" />
          </div>
        </div>

        <div class="rounded-md border border-gray-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-gray-900">Voucher</p>
            <div class="flex items-center gap-2">
              <button type="button" class="btn-secondary text-xs" @click="toggleSystemEditor('voucher')">
                {{ openSystemEditor === 'voucher' ? 'Cerrar' : 'Editar' }}
              </button>
              <button type="button" class="btn-secondary text-xs" @click="resetVoucherDefaults">Restablecer valores predeterminados</button>
            </div>
          </div>
          <pre class="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-800">{{ voucherPreview.text }}</pre>
          <p v-if="voucherPreview.missing.length" class="mt-2 text-xs text-amber-700">
            Faltan variables: {{ voucherPreview.missing.join(', ') }}
          </p>

          <div v-if="openSystemEditor === 'voucher'" class="mt-4 space-y-3 rounded border border-gray-100 p-3">
            <AppTextarea v-model="systemForm.voucher_greeting" label="Saludo" :rows="2" :autoResize="true" />
            <AppTextarea v-model="systemForm.voucher_intro" label="Introducción" :rows="2" :autoResize="true" />
            <AppTextarea v-model="systemForm.voucher_closing" label="Cierre" :rows="2" :autoResize="true" />
            <AppTextarea v-model="systemForm.voucher_signature" label="Firma" :rows="2" :autoResize="true" />
            <AppToggle
              v-model="systemForm.show_unit_amenities"
              label="Mostrar amenidades por unidad"
              description="Cuando está activo, se incluye descripción por unidad en el mensaje de voucher."
            />
            <AppFormGrid :columns="2">
              <AppInput v-model="systemForm.checkin_time" label="Hora check-in" placeholder="3:00 PM" />
              <AppInput v-model="systemForm.checkout_time" label="Hora check-out" placeholder="12:00 PM" />
            </AppFormGrid>
          </div>
        </div>
      </div>
    </div>

    <div class="card space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-900">Mensajes personalizados</h2>
        <button type="button" class="btn-primary text-sm" @click="openNewCustom">Nuevo mensaje</button>
      </div>

      <div class="flex flex-wrap gap-2 rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-600">
        <span class="font-semibold text-gray-700">Variables disponibles:</span>
        <span v-pre class="rounded bg-gray-100 px-2 py-1">{{nombre_alojamiento}}</span>
        <span v-pre class="rounded bg-gray-100 px-2 py-1">{{telefono}}</span>
        <span v-pre class="rounded bg-gray-100 px-2 py-1">{{ubicacion}}</span>
        <span v-pre class="rounded bg-gray-100 px-2 py-1">{{descripcion_alojamiento}}</span>
      </div>

      <div v-if="customMessages.length === 0" class="rounded-md border border-dashed border-gray-300 p-5 text-sm text-gray-500">
        No hay mensajes personalizados aún.
      </div>

      <div v-else class="space-y-3">
        <div v-for="(msg, index) in customMessages" :key="msg.id" class="rounded-md border border-gray-200 p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-gray-900">{{ msg.name }}</p>
              <p class="mt-1 line-clamp-2 text-sm text-gray-600">{{ msg.body }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button type="button" class="btn-secondary text-xs" @click="moveMessage(index, -1)" :disabled="index === 0">↑</button>
              <button type="button" class="btn-secondary text-xs" @click="moveMessage(index, 1)" :disabled="index === customMessages.length - 1">↓</button>
              <button type="button" class="btn-secondary text-xs" @click="openEditCustom(msg)">Editar</button>
              <button type="button" class="btn-secondary text-xs text-red-700" @click="removeCustom(msg.id)">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseModal :isOpen="showCustomModal" :title="editingCustomId ? 'Editar mensaje' : 'Nuevo mensaje'" @close="closeCustomModal">
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
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import BaseModal from '../components/ui/BaseModal.vue'
import {
  AppInput,
  AppTextarea,
  AppToggle,
  AppFormGrid,
} from '@/components/ui/forms'
import {
  DEFAULT_MESSAGE_SETTINGS,
  getMessageSettings,
  saveMessageSettings,
  getPredefinedMessages,
  savePredefinedMessage,
  deletePredefinedMessage,
  reorderPredefinedMessages,
} from '../services/messageSettingsService'
import {
  buildGlobalVariables,
  buildQuotationMessage,
  buildVoucherMessage,
} from '../utils/messageUtils'

const { can } = usePermissions()
const accountStore = useAccountStore()
const toast = useToast()

const openSystemEditor = ref('')
const savingSystem = ref(false)
const savingCustom = ref(false)
const showCustomModal = ref(false)
const editingCustomId = ref('')

const profile = ref({})
const accountSettings = ref({})
const systemForm = ref({ ...DEFAULT_MESSAGE_SETTINGS })
const messages = ref([])

const customForm = ref({ name: '', body: '' })

const customMessages = computed(() => {
  return messages.value.filter((msg) => msg.type === 'custom')
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

const quotationPreview = computed(() => buildQuotationMessage({
  inquiry: sampleInquiry.value,
  systemSettings: systemForm.value,
  globalVariables: globalVars.value,
  selectedUnits: [],
  venueUnits: [],
}))

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
    supabase.from('settings').select('voucher_conditions, property_name, price_general_min').eq('account_id', accountId).maybeSingle(),
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

const toggleSystemEditor = (key) => {
  openSystemEditor.value = openSystemEditor.value === key ? '' : key
}

const resetQuotationDefaults = () => {
  systemForm.value.quotation_greeting = DEFAULT_MESSAGE_SETTINGS.quotation_greeting
  systemForm.value.quotation_intro = DEFAULT_MESSAGE_SETTINGS.quotation_intro
  systemForm.value.quotation_closing = DEFAULT_MESSAGE_SETTINGS.quotation_closing
  systemForm.value.quotation_signature = DEFAULT_MESSAGE_SETTINGS.quotation_signature
}

const resetVoucherDefaults = () => {
  systemForm.value.voucher_greeting = DEFAULT_MESSAGE_SETTINGS.voucher_greeting
  systemForm.value.voucher_intro = DEFAULT_MESSAGE_SETTINGS.voucher_intro
  systemForm.value.voucher_closing = DEFAULT_MESSAGE_SETTINGS.voucher_closing
  systemForm.value.voucher_signature = DEFAULT_MESSAGE_SETTINGS.voucher_signature
  systemForm.value.show_unit_amenities = DEFAULT_MESSAGE_SETTINGS.show_unit_amenities
  systemForm.value.checkin_time = DEFAULT_MESSAGE_SETTINGS.checkin_time
  systemForm.value.checkout_time = DEFAULT_MESSAGE_SETTINGS.checkout_time
}

const saveSystemSettings = async () => {
  savingSystem.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    systemForm.value = await saveMessageSettings(accountId, systemForm.value)
    toast.success('Mensajes del sistema actualizados.')
  } catch (err) {
    toast.error(err.message || 'No se pudieron guardar los mensajes del sistema.')
  } finally {
    savingSystem.value = false
  }
}

const openNewCustom = () => {
  editingCustomId.value = ''
  customForm.value = { name: '', body: '' }
  showCustomModal.value = true
}

const openEditCustom = (message) => {
  editingCustomId.value = message.id
  customForm.value = {
    name: message.name || '',
    body: message.body || '',
  }
  showCustomModal.value = true
}

const closeCustomModal = () => {
  if (savingCustom.value) return
  showCustomModal.value = false
}

const saveCustomMessage = async () => {
  savingCustom.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const existing = customMessages.value
    const sortOrder = editingCustomId.value
      ? existing.find((row) => row.id === editingCustomId.value)?.sort_order || 0
      : ((existing[existing.length - 1]?.sort_order || 0) + 1)

    await savePredefinedMessage(accountId, {
      id: editingCustomId.value || undefined,
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
