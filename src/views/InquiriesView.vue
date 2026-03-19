<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Consultas</h1>
      <button v-if="can('inquiries', 'create')" class="btn-primary" @click="openCreateModal">+ Nueva consulta</button>
    </div>

    <div v-if="feedbackMessage" class="rounded-md border px-4 py-3 text-sm" :class="feedbackType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
      {{ feedbackMessage }}
    </div>

    <div class="card !py-4 flex flex-wrap items-center gap-4 bg-white">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Buscar por nombre o teléfono..."
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-72"
      >

      <select v-model="filters.status" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-56">
        <option value="">Todos los estados</option>
        <option value="new">Nueva</option>
        <option value="contacted">Contactada</option>
        <option value="quoted">Cotizada</option>
        <option value="converted">Convertida</option>
        <option value="lost">Perdida</option>
      </select>

      <button v-if="hasFilters" class="text-sm font-medium text-gray-500 underline" @click="clearFilters">Limpiar filtros</button>
    </div>

    <div class="card overflow-hidden !p-0">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-6 py-4">Huesped</th>
              <th class="px-6 py-4">Fechas</th>
              <th class="px-6 py-4">Noches</th>
              <th class="px-6 py-4">Personas</th>
              <th class="px-6 py-4">Origen</th>
              <th class="px-6 py-4">Estado</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="store.loading">
              <td colspan="7" class="px-6 py-10 text-center text-gray-400">Cargando consultas...</td>
            </tr>
            <tr v-else-if="filteredInquiries.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-500 italic">No hay consultas para mostrar.</td>
            </tr>
            <tr v-for="inquiry in filteredInquiries" :key="inquiry.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <p class="font-medium text-gray-900">{{ inquiry.guest_name || 'Sin nombre' }}</p>
                <p class="text-xs text-gray-500">{{ inquiry.guest_phone || 'Sin telefono' }}</p>
              </td>
              <td class="px-6 py-4 text-gray-700">
                <span class="block">{{ formatDate(inquiry.check_in) }}</span>
                <span class="block text-xs text-gray-500">hasta {{ formatDate(inquiry.check_out) }}</span>
              </td>
              <td class="px-6 py-4 text-gray-700">{{ getNights(inquiry.check_in, inquiry.check_out) }}</td>
              <td class="px-6 py-4 text-gray-700">{{ inquiry.guests_count || '-' }}</td>
              <td class="px-6 py-4 text-gray-700">{{ inquiry.source_display_label || inquiry.source || '-' }}</td>
              <td class="px-6 py-4">
                <span class="rounded-full border px-2 py-1 text-xs font-medium" :class="statusClasses(inquiry.status)">
                  {{ statusLabel(inquiry.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <router-link :to="`/consultas/${inquiry.id}`" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">Ver detalle</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal :isOpen="showCreateModal" title="Nueva consulta" @close="closeCreateModal">
      <form class="space-y-4" @submit.prevent="submitCreate">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input v-model="createForm.guest_name" type="text" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Telefono</label>
            <input v-model="createForm.guest_phone" type="text" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Check-in</label>
            <input v-model="createForm.check_in" type="date" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Check-out</label>
            <input v-model="createForm.check_out" type="date" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Personas</label>
            <input v-model="createForm.guests_count" type="number" min="1" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Precio por noche</label>
            <input v-model="createForm.price_per_night" type="number" min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
        </div>

        <SourceSelector
          :modelValue="{ sourceTypeId: createForm.source_type_id, sourceDetailId: createForm.source_detail_id }"
          @update:modelValue="updateCreateSourceSelection"
          @suggestions="applyCreateSourceSuggestions"
        />

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="block text-sm font-medium text-gray-700">Comisión</label>
            <input v-model="createForm.commission_name" type="text" class="mt-1 block w-full rounded-md border-gray-300" placeholder="Booking, agencia...">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">% Comisión</label>
            <input v-model="createForm.commission_percentage" type="number" min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">% Descuento</label>
            <input v-model="createForm.discount_percentage" type="number" min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300">
          </div>
        </div>

        <div v-if="showCreateCalculationPanel" class="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p>Noches: <strong>{{ createNights }}</strong></p>
          <p>Precio por noche: <strong>${{ formatCurrency(createForm.price_per_night || 0) }}</strong></p>
          <p>Subtotal: <strong>${{ formatCurrency(createSubtotal) }}</strong></p>
          <p>Descuento ({{ Number(createForm.discount_percentage || 0) }}%): <strong>-${{ formatCurrency(createDiscountAmount) }}</strong></p>
          <p>Total cliente: <strong>${{ formatCurrency(createCustomerTotal) }}</strong></p>
          <p>Comisión ({{ Number(createForm.commission_percentage || 0) }}%): <strong>-${{ formatCurrency(createCommissionAmount) }}</strong></p>
          <p>Ingreso neto: <strong>${{ formatCurrency(createNetAmount) }}</strong></p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Notas</label>
          <textarea v-model="createForm.notes" rows="3" class="mt-1 block w-full rounded-md border-gray-300"></textarea>
        </div>

        <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>

        <div class="flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" @click="closeCreateModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="creating">{{ creating ? 'Guardando...' : 'Guardar consulta' }}</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import BaseModal from '../components/ui/BaseModal.vue'
import SourceSelector from '../components/sources/SourceSelector.vue'
import { useInquiriesStore } from '../stores/inquiries'
import { usePermissions } from '../composables/usePermissions'

const store = useInquiriesStore()
const { can } = usePermissions()

const filters = ref({ search: '', status: '' })
const feedbackMessage = ref('')
const feedbackType = ref('success')

const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = ref({
  guest_name: '',
  guest_phone: '',
  check_in: '',
  check_out: '',
  guests_count: 1,
  price_per_night: '',
  commission_name: '',
  commission_percentage: '',
  discount_percentage: '',
  source: 'whatsapp',
  source_type_id: '',
  source_detail_id: '',
  notes: ''
})

onMounted(async () => {
  await store.fetchInquiries()
})

const hasFilters = computed(() => !!filters.value.search || !!filters.value.status)
const createNights = computed(() => getNumericNights(createForm.value.check_in, createForm.value.check_out))
const createSubtotal = computed(() => Number(createForm.value.price_per_night || 0) * createNights.value)
const createDiscountAmount = computed(() => createSubtotal.value * Number(createForm.value.discount_percentage || 0) / 100)
const createCustomerTotal = computed(() => Math.max(createSubtotal.value - createDiscountAmount.value, 0))
const createCommissionAmount = computed(() => createCustomerTotal.value * Number(createForm.value.commission_percentage || 0) / 100)
const createNetAmount = computed(() => Math.max(createCustomerTotal.value - createCommissionAmount.value, 0))
const showCreateCalculationPanel = computed(() => {
  return createNights.value > 0 && createForm.value.price_per_night !== '' && createForm.value.price_per_night !== null
})

const filteredInquiries = computed(() => {
  return store.inquiries.filter(inquiry => {
    if (filters.value.status && inquiry.status !== filters.value.status) return false

    if (filters.value.search) {
      const q = filters.value.search.toLowerCase()
      const haystack = `${inquiry.guest_name || ''} ${inquiry.guest_phone || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
})

const clearFilters = () => {
  filters.value = { search: '', status: '' }
}

const statusLabel = (status) => {
  return {
    new: 'Nueva',
    contacted: 'Contactada',
    quoted: 'Cotizada',
    converted: 'Convertida',
    lost: 'Perdida'
  }[status] || status
}

const statusClasses = (status) => {
  return {
    new: 'border-slate-200 bg-slate-100 text-slate-700',
    contacted: 'border-blue-200 bg-blue-50 text-blue-700',
    quoted: 'border-amber-200 bg-amber-50 text-amber-700',
    converted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    lost: 'border-red-200 bg-red-50 text-red-700'
  }[status] || 'border-slate-200 bg-slate-100 text-slate-700'
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const getNights = (checkIn, checkOut) => {
  const nights = getNumericNights(checkIn, checkOut)
  return nights === null ? '-' : nights
}

const getNumericNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null

  const start = new Date(checkIn)
  const end = new Date(checkOut)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return nights >= 0 ? nights : 0
}

const formatCurrency = (value) => Number(value || 0).toLocaleString('es-CO')

const updateCreateSourceSelection = (value) => {
  createForm.value.source_type_id = value?.sourceTypeId || ''
  createForm.value.source_detail_id = value?.sourceDetailId || ''

  if (!createForm.value.source_detail_id) {
    createForm.value.source = null
  }
}

const applyCreateSourceSuggestions = (payload) => {
  createForm.value.source = payload.sourceDetailName || payload.sourceDetailLabel || null

  if (!String(createForm.value.commission_name || '').trim()) {
    createForm.value.commission_name = payload.sourceDetailLabel || ''
  }

  if (createForm.value.commission_percentage === '' || createForm.value.commission_percentage === null) {
    createForm.value.commission_percentage = Number(payload.commissionPercentage || 0)
  }

  if (createForm.value.discount_percentage === '' || createForm.value.discount_percentage === null) {
    createForm.value.discount_percentage = Number(payload.discountPercentage || 0)
  }
}

const openCreateModal = () => {
  createForm.value = {
    guest_name: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    guests_count: 1,
    price_per_night: '',
    commission_name: '',
    commission_percentage: '',
    discount_percentage: '',
    source: 'whatsapp',
    source_type_id: '',
    source_detail_id: '',
    notes: ''
  }
  createError.value = ''
  showCreateModal.value = true
}

const closeCreateModal = () => {
  if (creating.value) return
  showCreateModal.value = false
}

const submitCreate = async () => {
  creating.value = true
  createError.value = ''

  try {
    await store.createInquiry(createForm.value)
    showCreateModal.value = false
    feedbackType.value = 'success'
    feedbackMessage.value = 'Consulta creada correctamente.'
  } catch (err) {
    createError.value = err.message
  } finally {
    creating.value = false
  }
}
</script>
