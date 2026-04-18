<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="text-sm font-medium text-gray-500 hover:text-gray-900" @click="goBack">← Volver a Consultas</button>
        <button
          type="button"
          class="btn-secondary text-sm"
          :disabled="!previousInquiryId"
          @click="goToPreviousInquiry"
        >← Anterior</button>
        <button
          type="button"
          class="btn-secondary text-sm"
          :disabled="!nextInquiryId"
          @click="goToNextInquiry"
        >Siguiente →</button>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="inquiry"
          class="btn-secondary text-sm"
          @click="showMessagesPanel = true"
          :disabled="!inquiry"
        >Mensajes</button>
        <button v-if="can('inquiries', 'edit')" class="btn-secondary text-sm" :disabled="!inquiry" @click="router.push('/consultas/' + route.params.id + '/editar')">Editar</button>
      </div>
    </div>

    <div v-if="loading" class="card py-10 text-center text-gray-500">Cargando consulta...</div>

    <div v-else-if="!inquiry" class="card py-10 text-center">
      <h2 class="text-lg font-semibold text-gray-900">Consulta no encontrada</h2>
      <p class="mt-2 text-sm text-gray-500">La URL puede ser invalida o la consulta fue eliminada.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <div class="card">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="mb-0.5 font-mono text-xs text-gray-400">{{ inquiry.inquiry_number || '' }}</p>
              <p class="mb-0.5 font-mono text-xs text-gray-500">{{ inquiryReferenceDisplay }}</p>
              <h1 class="text-2xl font-semibold text-gray-900">{{ `${inquiry.guest_first_name || ''} ${inquiry.guest_last_name || ''}`.trim() || 'Sin nombre' }}</h1>
            </div>
            <div class="flex flex-shrink-0 items-center gap-2">
              <a
                v-if="whatsappGuestUrl"
                :href="whatsappGuestUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="lg:hidden touch-target flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                aria-label="Ir a WhatsApp"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
              </a>
              <span
                class="rounded-full border px-3 py-1 text-xs font-medium"
                :style="getInquiryStatusStyle(inquiry.status)"
              >{{ getInquiryStatusLabel(inquiry.status) }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <p><span class="font-medium text-gray-700">Teléfono:</span> {{ inquiry.guest_phone || '-' }}</p>
            <p><span class="font-medium text-gray-700">Origen:</span> {{ inquiry.source_display_label || '-' }}</p>
            <p><span class="font-medium text-gray-700">Check-in:</span> {{ formatDate(inquiry.check_in) }}</p>
            <p><span class="font-medium text-gray-700">Check-out:</span> {{ formatDate(inquiry.check_out) }}</p>
            <p><span class="font-medium text-gray-700">Adultos:</span> {{ inquiry.adults || '-' }}</p>
            <p><span class="font-medium text-gray-700">Menores:</span> {{ inquiry.minors ?? '-' }}</p>
            <p><span class="font-medium text-gray-700">Niños:</span> {{ inquiry.children ?? '-' }}</p>
            <p v-if="(inquiry.infants ?? 0) > 0"><span class="font-medium text-gray-700">Bebés:</span> {{ inquiry.infants }}</p>
            <p><span class="font-medium text-gray-700">Creada:</span> {{ formatDateTime(inquiry.created_at) }}</p>
            <p v-if="inquiry.price_per_night != null"><span class="font-medium text-gray-700">Precio por noche:</span> ${{ formatCurrency(inquiry.price_per_night) }}</p>
            <p v-if="inquiry.price_per_night != null"><span class="font-medium text-gray-700">Total cliente:</span> ${{ formatCurrency(inquiryCustomerTotal) }}</p>
            <p v-if="inquiry.quote_expires_at">
              <span class="font-medium text-gray-700">Cotización válida hasta:</span>
              <span :class="isQuoteExpired ? 'text-orange-600 font-medium' : ''"> {{ formatDate(inquiry.quote_expires_at) }}</span>
              <span v-if="isQuoteExpired" class="ml-1 text-xs text-orange-500">⚠ Vencida</span>
            </p>
            <p v-if="inquiry.status === 'convertida' && inquiry.reservation_info">
              <span class="font-medium text-gray-700">Reserva creada:</span>
              <router-link :to="`/reservas/${inquiry.reservation_info.id}`" class="ml-1 font-mono text-sm text-primary hover:underline">{{ inquiry.reservation_info.reservation_number }}</router-link>
            </p>
          </div>

          <div class="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            <p class="font-medium text-gray-800">Notas</p>
            <p class="mt-1 whitespace-pre-wrap">{{ inquiry.notes || 'Sin notas' }}</p>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div v-if="inquiry" class="card">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">Acciones</h2>
          <div class="space-y-2">
            <a
              v-if="whatsappGuestUrl"
              :href="whatsappGuestUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex w-full items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              <svg class="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
              Ir a WhatsApp
            </a>
            <button
              v-if="inquiry.guest_first_name || inquiry.guest_last_name"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="copyInquiryAsWhatsApp"
            >Copiar cotización (WhatsApp)</button>
            <button
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              :disabled="generatingToken"
              @click="handleQuoteLink"
            >{{ generatingToken ? 'Generando...' : (inquiry.quote_token ? 'Copiar link cotización' : 'Generar link cotización') }}</button>
            <button
              v-if="canViewQuotation"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              :title="quotationWarningTooltip"
              @click="goToQuotation"
            >Ver cotización</button>
            <button
              v-if="can('inquiries', 'convert') && inquiry.status !== 'convertida' && inquiry.status !== 'perdida'"
              class="w-full rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              @click="router.push('/consultas/' + inquiry.id + '/convertir')"
            >Convertir en reserva</button>
          </div>
        </div>

        <div class="card">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">Gestión de estado</h2>
            <div v-if="can('inquiries', 'edit')">
              <button
                v-if="inquiry.status !== 'perdida' && inquiry.status !== 'convertida'"
                class="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                @click="showLostSheet = true"
              >
                Marcar como perdida
              </button>
              <p v-else class="text-sm italic text-gray-500">Estado final — no se puede cambiar.</p>
            </div>
            <p v-else class="text-sm text-gray-500">No tienes permisos para editar estado.</p>
        </div>

        <div class="card" v-if="can('occupancies', 'create')">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">Bloqueo temporal</h2>
          <p class="mb-3 text-sm text-gray-600">Genera un hold desde esta consulta para bloquear la unidad hasta el vencimiento definido.</p>
          <button class="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100" @click="openHoldModal">
            Generar bloqueo
          </button>
        </div>

        <div v-if="can('inquiries', 'delete')" class="card border-red-100 bg-red-50/30">
          <h2 class="mb-2 text-sm font-semibold text-red-800">Zona de peligro</h2>
          <button class="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50" @click="showDeleteModal = true">Eliminar consulta</button>
        </div>
      </div>
    </div>

    <BaseModal :isOpen="showHoldModal" title="Generar bloqueo temporal" @close="closeHoldModal">
      <form class="space-y-4" @submit.prevent="submitHold">
        <div>
          <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label class="block text-sm font-medium text-gray-700">Unidades</label>
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                v-model="holdFullHouse"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              >
              Full House
            </label>
          </div>
          <div class="max-h-56 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
            <p v-if="units.length === 0" class="text-sm text-gray-500">No hay unidades activas disponibles.</p>
            <label v-for="unit in units" :key="unit.id" class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-white">
              <input
                type="checkbox"
                :value="unit.id"
                v-model="holdForm.unit_ids"
                :disabled="holdFullHouse"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              >
              <span>{{ unit.name }} - {{ venueNameById(unit.venue_id) }}</span>
            </label>
          </div>
          <p v-if="holdFullHouse" class="mt-2 text-xs text-indigo-700">
            Full House activo: se bloquearán todas las unidades disponibles.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">Check-in hold</label>
            <input v-model="holdForm.start_date" type="date" required class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Check-out hold</label>
            <input v-model="holdForm.end_date" type="date" required class="mt-1 block w-full rounded-md border-gray-300">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Vence el</label>
          <input v-model="holdForm.expires_at" type="datetime-local" required class="mt-1 block w-full rounded-md border-gray-300">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Notas</label>
          <textarea v-model="holdForm.notes" rows="3" class="mt-1 block w-full rounded-md border-gray-300" placeholder="Ejemplo: Hold por verificación de pago / espera de confirmación."></textarea>
        </div>

        <p v-if="holdError" class="text-sm text-red-600">{{ holdError }}</p>

        <div class="flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" @click="closeHoldModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="holdSubmitting">{{ holdSubmitting ? 'Guardando...' : 'Crear bloqueo' }}</button>
        </div>
      </form>
    </BaseModal>

    <ConfirmActionModal
      :isOpen="showDeleteModal"
      title="Eliminar consulta"
      :message="`¿Deseas eliminar la consulta de ${`${inquiry?.guest_first_name || ''} ${inquiry?.guest_last_name || ''}`.trim() || 'este registro'}?`"
      confirmLabel="Eliminar"
      :loading="deleting"
      :errorMessage="deleteError"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    />

    <MessagesPanel
      v-model="showMessagesPanel"
      mode="inquiry"
      :inquiry="inquiry"
      :profile="profile"
      :accountSettings="accountSettings"
      :systemSettings="systemMessageSettings"
      :messages="predefinedMessages"
      :availableUnits="units"
      :voucherConditions="String(accountSettings?.voucher_conditions || '')"
      @copied="toast.success('Mensaje copiado al portapapeles.')"
    />

      <BottomSheet v-model="showLostSheet" title="Marcar consulta como perdida" height="half">
        <div class="space-y-3">
          <p class="text-sm text-gray-600">Esta acción cambiará el estado de la consulta a perdida.</p>
          <AppTextarea
            v-model="lostMotivo"
            label="Motivo (opcional)"
            :rows="3"
            :autoResize="true"
            placeholder="Ej: Cliente no respondió / encontró otra opción"
          />
        </div>
        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="btn-secondary" @click="showLostSheet = false">Cancelar</button>
            <button type="button" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" @click="confirmMarkAsLost">
              Confirmar
            </button>
          </div>
        </template>
      </BottomSheet>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import MessagesPanel from '../components/messages/MessagesPanel.vue'
import SourceSelector from '../components/sources/SourceSelector.vue'
import { useInquiriesStore } from '../stores/inquiries'
import { usePermissions } from '../composables/usePermissions'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { useAgeCategorySettings } from '../composables/useAgeCategorySettings'
import { formatReferenceDisplay } from '../utils/referenceUtils'
import { copyQuotationAsWhatsApp, buildQuotePublicUrl } from '../utils/voucherUtils'
import { getMessageSettings, getPredefinedMessages } from '../services/messageSettingsService'
import {
  getInquiryStatusLabel,
  getInquiryStatusStyle,
  getAvailableInquiryTransitions
} from '../utils/inquiryUtils'
import {
  AppInput,
  AppPhoneInput,
  AppTextarea,
  AppDatePicker,
  AppCounter,
  AppFieldGroup,
  AppFormSection,
  AppFormActions,
  AppInlineAlert,
  AppFormGrid,
  PricingCalculatorPanel
} from '@/components/ui/forms'

const route = useRoute()
const router = useRouter()
const store = useInquiriesStore()
const { can } = usePermissions()
const accountStore = useAccountStore()
const toast = useToast()
const { loadAgeCategorySettings, activeCategories, ageCategoryLabels } = useAgeCategorySettings()

const loading = ref(true)
const inquiry = ref(null)
const profile = ref({})
const generatingToken = ref(false)

const quotePublicUrl = computed(() => buildQuotePublicUrl(inquiry.value?.quote_token))
const showMessagesPanel = ref(false)
const predefinedMessages = ref([])
const systemMessageSettings = ref({})
const accountSettings = ref({})
const inquiryNavigationIds = ref([])

const availableTransitions = computed(() => getAvailableInquiryTransitions(inquiry.value?.status))
const inquiryGuestFullName = computed(() => `${inquiry.value?.guest_first_name || ''} ${inquiry.value?.guest_last_name || ''}`.trim())
const inquiryReferenceDisplay = computed(() => formatReferenceDisplay(inquiry.value?.reference_code, inquiryGuestFullName.value))
const canViewQuotation = computed(() => !!inquiryGuestFullName.value)
const quotationWarningTooltip = computed(() => {
  if (!inquiry.value) return ''
  if (inquiry.value?.price_per_night == null || Number(inquiry.value?.price_per_night || 0) <= 0) {
    return 'La cotización no incluirá precio (no hay precio por noche definido)'
  }
  return ''
})
const isQuoteExpired = computed(() => {
  if (inquiry.value?.status !== 'cotizada') return false
  if (!inquiry.value?.quote_expires_at) return false
  return new Date(inquiry.value.quote_expires_at) < new Date()
})
const currentInquiryIndex = computed(() => inquiryNavigationIds.value.findIndex((id) => id === route.params.id))
const previousInquiryId = computed(() => {
  const index = currentInquiryIndex.value
  return index > 0 ? inquiryNavigationIds.value[index - 1] : ''
})
const nextInquiryId = computed(() => {
  const index = currentInquiryIndex.value
  return index >= 0 && index < inquiryNavigationIds.value.length - 1
    ? inquiryNavigationIds.value[index + 1]
    : ''
})

const whatsappGuestUrl = computed(() => {
  const raw = String(inquiry.value?.guest_phone || '')
  const digits = raw.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
})

const showLostSheet = ref(false)
const lostMotivo = ref('')

const showDeleteModal = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const venues = ref([])
const units = ref([])

const showHoldModal = ref(false)
const holdSubmitting = ref(false)
const holdError = ref('')
const holdFullHouse = ref(false)
const holdForm = ref({
  unit_ids: [],
  start_date: '',
  end_date: '',
  expires_at: '',
  notes: ''
})

const inquiryNights = computed(() => getNumericNights(inquiry.value?.check_in, inquiry.value?.check_out) || 0)
const inquirySubtotal = computed(() => Number(inquiry.value?.price_per_night || 0) * inquiryNights.value)
const inquiryDiscountAmount = computed(() => inquirySubtotal.value * Number(inquiry.value?.discount_percentage || 0) / 100)
const inquiryCustomerTotal = computed(() => Math.max(inquirySubtotal.value - inquiryDiscountAmount.value, 0))
const inquiryUnitsLabel = computed(() =>
  (inquiry.value?.unit_ids || [])
    .map(id => units.value.find(u => u.id === id)?.name)
    .filter(Boolean)
    .join(', ')
)
const inquiryQuotationNumber = computed(() => {
  const n = inquiry.value?.inquiry_number || ''
  return n.startsWith('INQ-') ? n.replace('INQ-', 'COT-') : (n || '-')
})
watch(holdFullHouse, (enabled) => {
  if (enabled) {
    holdForm.value.unit_ids = units.value.map(u => u.id)
  } else {
    holdForm.value.unit_ids = []
  }
})

const loadInquiry = async () => {
  loading.value = true
  try {
    inquiry.value = await store.getInquiryById(route.params.id)

    const accountId = accountStore.getRequiredAccountId()
    const [
      { data: profileData },
      { data: settingsData },
      loadedMessageSettings,
      loadedMessages,
    ] = await Promise.all([
      supabase
        .from('account_profile')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('settings')
        .select('voucher_conditions, property_name, price_general_min, anticipo_pct')
        .eq('account_id', accountId)
        .maybeSingle(),
      getMessageSettings(accountId),
      getPredefinedMessages(accountId),
    ])

    profile.value = profileData || {}
    accountSettings.value = settingsData || {}
    systemMessageSettings.value = loadedMessageSettings || {}
    predefinedMessages.value = loadedMessages || []
  } catch (err) {
    inquiry.value = null
    toast.error(err.message || 'No se pudo cargar la consulta')
  } finally {
    loading.value = false
  }
}

const loadInquiryNavigation = async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('inquiries')
      .select('id')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    inquiryNavigationIds.value = (data || []).map((item) => item.id)
  } catch {
    inquiryNavigationIds.value = []
  }
}

onMounted(async () => {
  await Promise.all([loadInquiry(), loadInquiryNavigation(), fetchMasterData(), loadAgeCategorySettings()])
})

watch(() => route.params.id, async (newId, oldId) => {
  if (!newId || newId === oldId) return
  await Promise.all([loadInquiry(), loadInquiryNavigation()])
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatCurrency = (value) => Number(value || 0).toLocaleString('es-CO')

const getNumericNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return nights >= 0 ? nights : 0
}

const toDateTimeLocalValue = (value) => {
  const date = value ? new Date(value) : new Date(Date.now() + (24 * 60 * 60 * 1000))
  if (Number.isNaN(date.getTime())) return ''

  const adjusted = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return adjusted.toISOString().slice(0, 16)
}

const fetchMasterData = async () => {
  const accountId = accountStore.getRequiredAccountId()
  const [{ data: venuesData }, { data: unitsData }] = await Promise.all([
    supabase.from('venues').select('id, name').eq('account_id', accountId).order('name', { ascending: true }),
    supabase.from('units').select('id, name, description, capacity, venue_id').eq('account_id', accountId).eq('is_active', true).order('name', { ascending: true })
  ])

  venues.value = venuesData || []
  units.value = unitsData || []
}

const venueNameById = (venueId) => venues.value.find(v => v.id === venueId)?.name || ''

const changeStatus = async (status) => {
  if (!inquiry.value || inquiry.value.status === status) return

  try {
    await store.updateInquiryStatus(inquiry.value.id, status)
    inquiry.value.status = status
    toast.success('Estado actualizado.')
  } catch (err) {
    toast.error(err.message || 'No se pudo actualizar el estado')
  }
}

const confirmMarkAsLost = async () => {
  await changeStatus('perdida')
  showLostSheet.value = false
  lostMotivo.value = ''
}

const copyInquiryAsWhatsApp = async () => {
  if (!inquiry.value) return
  try {
    const quotationTemplate = String(
      predefinedMessages.value.find((msg) => msg.type === 'system' && msg.key === 'quotation')?.body || ''
    ).trim()

    await copyQuotationAsWhatsApp(
      {
        ...inquiry.value,
        quotation_number: inquiryQuotationNumber.value,
        nights: inquiryNights.value,
        units_label: inquiryUnitsLabel.value,
        total_amount: inquiryCustomerTotal.value,
      },
      profile.value,
      quotePublicUrl.value || '',
      {
        systemTemplate: quotationTemplate,
        accountSettings: accountSettings.value,
        units: (inquiry.value?.unit_ids || [])
          .map((id) => units.value.find((unit) => unit.id === id))
          .filter(Boolean),
      }
    )
    toast.success('Mensaje de WhatsApp copiado al portapapeles.')
  } catch (error) {
    toast.error(error.message || 'No se pudo copiar el mensaje de WhatsApp.')
  }
}

const handleQuoteLink = async () => {
  if (!inquiry.value) return
  // If token already exists — just copy the URL
  if (inquiry.value.quote_token) {
    try {
      await navigator.clipboard.writeText(quotePublicUrl.value)
      toast.success('Link de cotización copiado al portapapeles.')
    } catch {
      toast.error('No se pudo copiar el link.')
    }
    return
  }
  // Generate token, persist in DB, then copy
  generatingToken.value = true
  try {
    const token = await store.generateInquiryQuoteToken(inquiry.value.id)
    inquiry.value = { ...inquiry.value, quote_token: token }
    const url = buildQuotePublicUrl(token)
    await navigator.clipboard.writeText(url)
    toast.success('Link de cotización generado y copiado al portapapeles.')
  } catch (err) {
    toast.error(err.message || 'No se pudo generar el link de cotización.')
  } finally {
    generatingToken.value = false
  }
}

const openHoldModal = () => {
  holdFullHouse.value = false
  holdForm.value = {
    unit_ids: [],
    start_date: inquiry.value?.check_in || '',
    end_date: inquiry.value?.check_out || '',
    expires_at: toDateTimeLocalValue(),
    notes: ''
  }
  holdError.value = ''
  showHoldModal.value = true
}

const closeHoldModal = () => {
  if (holdSubmitting.value) return
  showHoldModal.value = false
}

const submitHold = async () => {
  if (!inquiry.value?.id) return

  const unitIds = holdFullHouse.value ? units.value.map(u => u.id) : holdForm.value.unit_ids
  if (unitIds.length === 0) {
    holdError.value = 'Debes seleccionar al menos una unidad.'
    return
  }

  holdSubmitting.value = true
  holdError.value = ''

  try {
    for (const unitId of unitIds) {
      await store.createInquiryHold({
        inquiry_id: inquiry.value.id,
        unit_id: unitId,
        start_date: holdForm.value.start_date,
        end_date: holdForm.value.end_date,
        expires_at: holdForm.value.expires_at,
        notes: holdForm.value.notes
      })
    }

    showHoldModal.value = false
    toast.success(`Bloqueo temporal creado para ${unitIds.length} unidad${unitIds.length > 1 ? 'es' : ''}.`)
  } catch (err) {
    holdError.value = err.message
  } finally {
    holdSubmitting.value = false
  }
}

const closeDeleteModal = () => {
  if (deleting.value) return
  showDeleteModal.value = false
  deleteError.value = ''
}

const confirmDelete = async () => {
  if (!inquiry.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await store.deleteInquiry(inquiry.value.id)
    showDeleteModal.value = false
    router.push('/consultas')
  } catch (err) {
    deleteError.value = err.message
  } finally {
    deleting.value = false
  }
}

const goToPreviousInquiry = () => {
  if (!previousInquiryId.value) return
  router.push(`/consultas/${previousInquiryId.value}`)
}

const goToNextInquiry = () => {
  if (!nextInquiryId.value) return
  router.push(`/consultas/${nextInquiryId.value}`)
}

const goBack = () => {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/consultas')
}

const goToQuotation = () => {
  if (!inquiry.value?.id) return
  router.push(`/consultas/${inquiry.value.id}/cotizacion`)
}

</script>
