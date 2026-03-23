<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div class="flex items-center justify-between">
      <router-link to="/consultas" class="text-sm font-medium text-gray-500 hover:text-gray-900">← Volver a Consultas</router-link>
      <div class="flex items-center gap-2">
        <button
          v-if="canViewQuotation"
          class="btn-secondary text-sm"
          :title="quotationWarningTooltip"
          @click="goToQuotation"
          :disabled="!inquiry"
        >Ver cotización</button>
        <button
          v-if="can('inquiries', 'convert') && inquiry && inquiry.status !== 'convertida' && inquiry.status !== 'perdida'"
          class="btn-primary text-sm"
          @click="openConversionModal"
          :disabled="!inquiry"
        >Convertir en reserva</button>
          <button
            v-if="inquiry && inquiry.guest_name"
            class="btn-secondary text-sm"
            @click="copyInquiryAsWhatsApp"
            :disabled="!inquiry"
          >Copiar para WhatsApp</button>
        <button v-if="can('inquiries', 'edit')" class="btn-secondary text-sm" @click="openEditModal" :disabled="!inquiry">Editar</button>
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
          <div class="mb-4 flex items-center justify-between">
            <div>
              <p class="mb-0.5 font-mono text-xs text-gray-400">{{ inquiry.inquiry_number || '' }}</p>
              <p class="mb-0.5 font-mono text-xs text-gray-500">{{ inquiryReferenceDisplay }}</p>
              <h1 class="text-2xl font-semibold text-gray-900">{{ inquiry.guest_name || 'Sin nombre' }}</h1>
            </div>
            <span
              class="rounded-full border px-3 py-1 text-xs font-medium"
              :style="getInquiryStatusStyle(inquiry.status)"
            >{{ getInquiryStatusLabel(inquiry.status) }}</span>
          </div>

          <div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <p><span class="font-medium text-gray-700">Teléfono:</span> {{ inquiry.guest_phone || '-' }}</p>
            <p><span class="font-medium text-gray-700">Origen:</span> {{ inquiry.source_display_label || inquiry.source || '-' }}</p>
            <p><span class="font-medium text-gray-700">Check-in:</span> {{ formatDate(inquiry.check_in) }}</p>
            <p><span class="font-medium text-gray-700">Check-out:</span> {{ formatDate(inquiry.check_out) }}</p>
            <p><span class="font-medium text-gray-700">Adultos:</span> {{ inquiry.adults || '-' }}</p>
            <p><span class="font-medium text-gray-700">Niños:</span> {{ inquiry.children ?? '-' }}</p>
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

    <BaseModal :isOpen="showEditModal" title="Editar consulta" size="lg" @close="closeEditModal">
      <form class="space-y-5" @submit.prevent="submitEdit">
        <AppFormSection title="Solicitante" :divider="true">
          <AppFormGrid :columns="2">
            <AppInput
              v-model="editForm.guest_name"
              label="Nombre"
              required
              :error="editFieldError('guest_name')"
              @blur="touchEditField('guest_name')"
            />
            <AppInput v-model="editForm.guest_phone" label="Teléfono" hint="Opcional" />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Fechas de interés" :divider="true">
          <AppFormGrid :columns="2">
            <AppDatePicker v-model="editForm.check_in" label="Check-in" hint="Opcional" />
            <AppDatePicker v-model="editForm.check_out" label="Check-out" hint="Opcional" />
          </AppFormGrid>
          <p v-if="editNights > 0" class="text-sm text-[#6B7280]">{{ editNights }} noches</p>

          <AppFieldGroup title="¿Qué unidades te interesan?" subtitle="Opcional" :compact="true" :border="true">
            <div class="max-h-40 space-y-1 overflow-y-auto">
              <p v-if="units.length === 0" class="text-sm text-gray-500">No hay unidades activas.</p>
              <label v-for="unit in units" :key="unit.id" class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-white">
                <input type="checkbox" :value="unit.id" v-model="editForm.unit_ids" class="rounded border-gray-300">
                <span>{{ unit.name }}<span v-if="venueNameById(unit.venue_id)" class="text-gray-400"> · {{ venueNameById(unit.venue_id) }}</span></span>
              </label>
            </div>
          </AppFieldGroup>
        </AppFormSection>

        <AppFormSection title="Personas" :divider="true">
          <AppFormGrid :columns="2">
            <AppCounter v-model="editForm.adults" label="Adultos" :min="1" :max="20" />
            <AppCounter v-model="editForm.children" label="Niños" :min="0" :max="20" />
          </AppFormGrid>
          <p class="text-sm text-[#6B7280]">Total: <strong class="text-[#111827]">{{ Number(editForm.adults || 0) + Number(editForm.children || 0) }}</strong></p>
        </AppFormSection>

        <AppFormSection title="Cotización" :divider="true">
          <AppInput v-model="editForm.price_per_night" type="number" label="Precio por noche" prefix="$" hint="Opcional" />
          <AppFormGrid :columns="2">
            <AppInput v-model="editForm.discount_percentage" type="number" label="Descuento" suffix="%" hint="Opcional" />
            <AppInput v-model="editForm.commission_percentage" type="number" label="Comisión" suffix="%" hint="Opcional" />
          </AppFormGrid>
          <AppDatePicker v-model="editForm.quote_expires_at" label="Cotización válida hasta" hint="Opcional" />
          <PricingCalculatorPanel
            :checkIn="editForm.check_in"
            :checkOut="editForm.check_out"
            :pricePerNight="Number(editForm.price_per_night || 0)"
            :discountPercentage="Number(editForm.discount_percentage || 0)"
            :commissionPercentage="Number(editForm.commission_percentage || 0)"
            :units="editForm.unit_ids || []"
            :adults="Number(editForm.adults || 1)"
            :children="Number(editForm.children || 0)"
          />
        </AppFormSection>

        <AppFormSection title="Origen" :divider="true">
          <AppFieldGroup title="Canal de origen" :border="false" :compact="true">
            <SourceSelector
              :modelValue="{ sourceTypeId: editForm.source_type_id, sourceDetailId: editForm.source_detail_id }"
              @update:modelValue="updateEditSourceSelection"
              @suggestions="applyEditSourceSuggestions"
            />
          </AppFieldGroup>
          <AppInput v-model="editForm.commission_name" label="Comisión" placeholder="Booking, agencia..." hint="Opcional" />
        </AppFormSection>

        <AppFormSection title="Notas" :divider="false">
          <AppTextarea
            v-model="editForm.notes"
            label="Notas"
            :rows="2"
            :autoResize="true"
          />
        </AppFormSection>

        <AppInlineAlert v-if="editError" type="error" :message="editError" />

        <AppFormActions
          submit-label="Actualizar consulta"
          cancel-label="Cancelar"
          :loading="saving"
          :submit-disabled="saving"
          @submit="submitEdit"
          @cancel="closeEditModal"
        />
      </form>
    </BaseModal>

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
      :message="`¿Deseas eliminar la consulta de ${inquiry?.guest_name || 'este registro'}?`"
      confirmLabel="Eliminar"
      :loading="deleting"
      :errorMessage="deleteError"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    />

    <InquiryConversionModal
      v-if="inquiry"
      :isOpen="showConversionModal"
      :inquiry="inquiry"
      @close="showConversionModal = false"
      @converted="onReservationCreated"
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
import SourceSelector from '../components/sources/SourceSelector.vue'
import InquiryConversionModal from '../components/inquiries/InquiryConversionModal.vue'
import { useInquiriesStore } from '../stores/inquiries'
import { usePermissions } from '../composables/usePermissions'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { formatReferenceDisplay } from '../utils/referenceUtils'
import { copyQuotationAsWhatsApp } from '../utils/voucherUtils'
import {
  getInquiryStatusLabel,
  getInquiryStatusStyle,
  getAvailableInquiryTransitions
} from '../utils/inquiryUtils'
import {
  AppInput,
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

const loading = ref(true)
const inquiry = ref(null)
const profile = ref({})

const availableTransitions = computed(() => getAvailableInquiryTransitions(inquiry.value?.status))
const inquiryReferenceDisplay = computed(() => formatReferenceDisplay(inquiry.value?.reference_code, inquiry.value?.guest_name))
const canViewQuotation = computed(() => !!String(inquiry.value?.guest_name || '').trim())
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

const showConversionModal = ref(false)
const showLostSheet = ref(false)
const lostMotivo = ref('')

const showEditModal = ref(false)
const editForm = ref({})
const editError = ref('')
const saving = ref(false)
const editTouched = ref({})
const editSubmitAttempted = ref(false)

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
const editNights = computed(() => getNumericNights(editForm.value.check_in, editForm.value.check_out) || 0)
const editSubtotal = computed(() => Number(editForm.value.price_per_night || 0) * editNights.value)
const editDiscountAmount = computed(() => editSubtotal.value * Number(editForm.value.discount_percentage || 0) / 100)
const editCustomerTotal = computed(() => Math.max(editSubtotal.value - editDiscountAmount.value, 0))
const editCommissionAmount = computed(() => editCustomerTotal.value * Number(editForm.value.commission_percentage || 0) / 100)
const editNetAmount = computed(() => Math.max(editCustomerTotal.value - editCommissionAmount.value, 0))
const showEditCalculationPanel = computed(() => {
  return editNights.value > 0 && editForm.value.price_per_night !== '' && editForm.value.price_per_night !== null
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
    const { data: profileData } = await supabase
      .from('account_profile')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    profile.value = profileData || {}
  } catch (err) {
    inquiry.value = null
    toast.error(err.message || 'No se pudo cargar la consulta')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadInquiry(), fetchMasterData()])
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
    supabase.from('units').select('id, name, venue_id').eq('account_id', accountId).eq('is_active', true).order('name', { ascending: true })
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
    await copyQuotationAsWhatsApp(
      {
        ...inquiry.value,
        quotation_number: inquiryQuotationNumber.value,
        nights: inquiryNights.value,
        units_label: inquiryUnitsLabel.value,
        total_amount: inquiryCustomerTotal.value,
      },
      profile.value
    )
    toast.success('Mensaje de WhatsApp copiado al portapapeles.')
  } catch (error) {
    toast.error(error.message || 'No se pudo copiar el mensaje de WhatsApp.')
  }
}

const openEditModal = () => {
  editForm.value = {
    guest_name: inquiry.value?.guest_name || '',
    guest_phone: inquiry.value?.guest_phone || '',
    check_in: inquiry.value?.check_in || '',
    check_out: inquiry.value?.check_out || '',
    adults: inquiry.value?.adults ?? 1,
    children: inquiry.value?.children ?? 0,
    unit_ids: [...(inquiry.value?.unit_ids || [])],
    price_per_night: inquiry.value?.price_per_night ?? '',
    quote_expires_at: inquiry.value?.quote_expires_at ? inquiry.value.quote_expires_at.slice(0, 10) : '',
    commission_name: inquiry.value?.commission_name || '',
    commission_percentage: inquiry.value?.commission_percentage ?? '',
    discount_percentage: inquiry.value?.discount_percentage ?? '',
    source: inquiry.value?.source || '',
    source_type_id: inquiry.value?.source_type_id || '',
    source_detail_id: inquiry.value?.source_detail_id || '',
    notes: inquiry.value?.notes || ''
  }
  editError.value = ''
  editTouched.value = {}
  editSubmitAttempted.value = false
  showEditModal.value = true
}

const closeEditModal = () => {
  if (saving.value) return
  showEditModal.value = false
}

const updateEditSourceSelection = (value) => {
  editForm.value.source_type_id = value?.sourceTypeId || ''
  editForm.value.source_detail_id = value?.sourceDetailId || ''

  if (!editForm.value.source_detail_id) {
    editForm.value.source = null
  }
}

const applyEditSourceSuggestions = (payload) => {
  editForm.value.source = payload.sourceDetailName || payload.sourceDetailLabel || null

  if (!String(editForm.value.commission_name || '').trim()) {
    editForm.value.commission_name = payload.sourceDetailLabel || ''
  }

  if (editForm.value.commission_percentage === '' || editForm.value.commission_percentage === null) {
    editForm.value.commission_percentage = Number(payload.commissionPercentage || 0)
  }

  if (editForm.value.discount_percentage === '' || editForm.value.discount_percentage === null) {
    editForm.value.discount_percentage = Number(payload.discountPercentage || 0)
  }
}

const submitEdit = async () => {
  if (!inquiry.value) return

  editSubmitAttempted.value = true
  if (editFieldError('guest_name')) return

  saving.value = true
  editError.value = ''

  try {
    const updated = await store.updateInquiry(inquiry.value.id, editForm.value)
    inquiry.value = updated
    showEditModal.value = false
    toast.success('Consulta actualizada.')
  } catch (err) {
    editError.value = err.message
  } finally {
    saving.value = false
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
    router.push('/consultas')
  } catch (err) {
    deleteError.value = err.message
  } finally {
    deleting.value = false
  }
}

const openConversionModal = () => {
  showConversionModal.value = true
}

const onReservationCreated = async (reservationId) => {
  showConversionModal.value = false
  // Refresh inquiry to show updated status and reservation link
  try {
    inquiry.value = await store.getInquiryById(route.params.id)
  } catch (err) {
    // swallow — navigation handled in modal
  }
}

const goToQuotation = () => {
  if (!inquiry.value?.id) return
  router.push(`/consultas/${inquiry.value.id}/cotizacion`)
}

const touchEditField = (field) => {
  editTouched.value[field] = true
}

const editFieldError = (field) => {
  if (!editTouched.value[field] && !editSubmitAttempted.value) return ''

  if (field === 'guest_name' && !String(editForm.value.guest_name || '').trim()) {
    return 'El nombre es obligatorio.'
  }

  return ''
}

</script>
