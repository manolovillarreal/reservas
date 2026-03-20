<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Bloqueos</h1>
      <div class="flex items-center gap-3">
        <ViewModeToggle v-model="viewMode" class="hidden sm:flex" />
        <button v-if="can('occupancies', 'create')" class="btn-primary" @click="openCreateModal">+ Nuevo bloqueo</button>
      </div>
    </div>

    <div class="card !py-4 flex flex-wrap items-center gap-4 bg-white">
      <select v-model="selectedVenueId" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-72">
        <option value="">Todas las sedes</option>
        <option v-for="venue in venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
      </select>

      <input
        v-model="searchText"
        type="text"
        placeholder="Buscar por unidad o motivo..."
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-80"
      >

      <button v-if="searchText || selectedVenueId" class="text-sm font-medium text-gray-500 underline" @click="clearFilters">Limpiar filtros</button>
    </div>

    <div v-if="isMobile" class="space-y-3">
      <div v-if="store.loading" class="card text-sm text-gray-500">Cargando bloqueos...</div>
      <div v-else-if="filteredBlocks.length === 0" class="card text-sm text-gray-500">No hay bloqueos para mostrar.</div>

      <DataCard
        v-for="block in filteredBlocks"
        v-else
        :key="block.id"
        :title="block.units?.name || '-'"
        :subtitle="formatOccupancyType(block.occupancy_type)"
        :badge="{ label: `${formatDateShort(block.start_date)} - ${formatDateShort(block.end_date)}`, type: 'neutral' }"
        :meta="blockMeta(block)"
        :actions="[
          ...(can('occupancies', 'edit') ? [{ label: 'Editar', type: 'ghost', handler: () => openEditModal(block) }] : []),
          ...(can('occupancies', 'delete') ? [{ label: 'Eliminar', type: 'danger', handler: () => openDeleteModal(block) }] : [])
        ]"
      />
    </div>

    <div v-else class="card overflow-hidden !p-0">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-6 py-4">Unidad</th>
              <th class="px-6 py-4">Sede</th>
              <th class="px-6 py-4">Fechas</th>
              <th class="px-6 py-4">Tipo</th>
              <th class="px-6 py-4">Motivo</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="store.loading">
              <td colspan="6" class="px-6 py-10 text-center text-gray-400">Cargando bloqueos...</td>
            </tr>
            <tr v-else-if="filteredBlocks.length === 0">
              <td colspan="6" class="px-6 py-10 text-center text-gray-500 italic">No hay bloqueos para mostrar.</td>
            </tr>
            <tr v-for="block in filteredBlocks" :key="block.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900">{{ block.units?.name || '-' }}</td>
              <td class="px-6 py-4 text-gray-700">{{ block.units?.venues?.name || '-' }}</td>
              <td class="px-6 py-4 text-gray-700">
                <span class="block">{{ formatDate(block.start_date) }}</span>
                <span class="block text-xs text-gray-500">hasta {{ formatDate(block.end_date) }}</span>
              </td>
              <td class="px-6 py-4 text-gray-700">{{ formatOccupancyType(block.occupancy_type) }}</td>
              <td class="px-6 py-4 text-gray-700">{{ block.reason || '-' }}</td>
              <td class="px-6 py-4 text-right">
                <div class="inline-flex items-center gap-3" v-if="can('occupancies', 'edit') || can('occupancies', 'delete')">
                  <button v-if="can('occupancies', 'edit')" class="text-sm font-medium text-primary hover:text-primary-dark" @click="openEditModal(block)">Editar</button>
                  <button v-if="can('occupancies', 'delete')" class="text-sm font-medium text-red-600 hover:text-red-800" @click="openDeleteModal(block)">Eliminar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal :isOpen="showModal" :title="editingBlock ? 'Editar bloqueo' : 'Nuevo bloqueo'" :fullScreenOnMobile="true" @close="closeModal">
      <form class="space-y-5" @submit.prevent="submitForm">
        <AppFormSection title="Detalles del bloqueo" :divider="false">
          <AppSelect
            v-model="form.unit_id"
            label="Unidad"
            :options="unitOptions"
            placeholder="Seleccionar unidad"
            required
          />

          <AppSelect
            v-model="form.occupancy_type"
            label="Tipo de bloqueo"
            :options="blockTypeOptions"
            required
          />

          <AppFormGrid :columns="2">
            <AppDatePicker v-model="form.start_date" label="Fecha inicio" />
            <AppDatePicker v-model="form.end_date" label="Fecha fin" />
          </AppFormGrid>

          <p v-if="blockedDays > 0" class="text-sm text-[#6B7280]">{{ blockedDays }} días bloqueados</p>

          <AppTextarea v-model="form.notes" label="Notas o motivo" :rows="2" :autoResize="true" hint="Opcional" />
        </AppFormSection>

        <AppInlineAlert v-if="formError" type="error" :message="formError" />

        <AppFormActions
          :submit-label="editingBlock ? 'Actualizar bloqueo' : 'Guardar bloqueo'"
          cancel-label="Cancelar"
          :loading="submitting"
          :submit-disabled="submitting"
          @submit="submitForm"
          @cancel="closeModal"
        />
      </form>
    </BaseModal>

    <ConfirmActionModal
      v-if="!isMobile"
      :isOpen="showDeleteModal"
      title="Eliminar bloqueo"
      :message="`¿Deseas eliminar el bloqueo de ${blockToDelete?.units?.name || 'esta unidad'}?`"
      confirmLabel="Eliminar"
      :loading="deleting"
      :errorMessage="deleteError"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    />

    <BottomSheet v-if="isMobile" v-model="showDeleteModal" title="Eliminar bloqueo" height="half">
      <div class="space-y-4">
        <p class="text-sm text-gray-700">¿Deseas eliminar el bloqueo de {{ blockToDelete?.units?.name || 'esta unidad' }}?</p>
        <p v-if="deleteError" class="text-sm text-red-600">{{ deleteError }}</p>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="deleting" @click="closeDeleteModal">Cancelar</button>
          <button type="button" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Eliminando...' : 'Eliminar' }}
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
import DataCard from '../components/ui/DataCard.vue'
import { useRoomBlocksStore } from '../stores/roomBlocks'
import { usePermissions } from '../composables/usePermissions'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useViewMode } from '../composables/useViewMode'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import {
  AppSelect,
  AppDatePicker,
  AppTextarea,
  AppFormSection,
  AppFormGrid,
  AppFormActions,
  AppInlineAlert
} from '@/components/ui/forms'

const route = useRoute()
const router = useRouter()
const store = useRoomBlocksStore()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const { viewMode, isTable, isCards } = useViewMode('bloqueos')
const accountStore = useAccountStore()
const toast = useToast()

const venues = ref([])
const units = ref([])
const selectedVenueId = ref('')
const searchText = ref('')

const showModal = ref(false)
const editingBlock = ref(null)
const submitting = ref(false)
const formError = ref('')
const form = ref({
  unit_id: '',
  start_date: '',
  end_date: '',
  occupancy_type: 'maintenance',
  reason: '',
  notes: ''
})

const blockTypeOptions = [
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'owner_use', label: 'Uso del propietario' },
  { value: 'inquiry_hold', label: 'Hold de consulta' },
  { value: 'external', label: 'Externo' },
]

const unitOptions = computed(() => {
  return units.value.map((unit) => ({
    value: unit.id,
    label: `${unit.name} - ${venueNameById(unit.venue_id)}`
  }))
})

const blockedDays = computed(() => {
  if (!form.value.start_date || !form.value.end_date) return 0
  const from = new Date(form.value.start_date)
  const to = new Date(form.value.end_date)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0
  const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const showDeleteModal = ref(false)
const blockToDelete = ref(null)
const deleting = ref(false)
const deleteError = ref('')

onMounted(async () => {
  await Promise.all([fetchMasterData(), store.fetchRoomBlocks()])
  openEditModalFromRoute(route.params.id)
})

const fetchMasterData = async () => {
  const accountId = accountStore.getRequiredAccountId()
  const [{ data: venuesData }, { data: unitsData }] = await Promise.all([
    supabase.from('venues').select('id, name').eq('account_id', accountId).order('name', { ascending: true }),
    supabase.from('units').select('id, name, venue_id').eq('account_id', accountId).eq('is_active', true).order('name', { ascending: true })
  ])

  venues.value = venuesData || []
  units.value = unitsData || []
}

const venueNameById = (venueId) => {
  return venues.value.find(venue => venue.id === venueId)?.name || 'Sin sede'
}

const filteredBlocks = computed(() => {
  const q = searchText.value.trim().toLowerCase()

  return store.roomBlocks.filter(block => {
    if (selectedVenueId.value && block.units?.venue_id !== selectedVenueId.value) return false

    if (q) {
      const haystack = `${block.units?.name || ''} ${block.reason || ''} ${block.notes || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
})

const clearFilters = () => {
  selectedVenueId.value = ''
  searchText.value = ''
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const formatDateShort = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

const formatOccupancyType = (type) => {
  return {
    maintenance: 'Mantenimiento',
    owner_use: 'Uso propietario',
    inquiry_hold: 'Hold consulta',
    external: 'Externo'
  }[type] || type
}

const blockMeta = (block) => {
  const meta = [
    { label: 'Desde', value: formatDate(block.start_date) },
    { label: 'Hasta', value: formatDate(block.end_date) },
    { label: 'Días', value: `${getDays(block.start_date, block.end_date)} días bloqueados` }
  ]

  const notes = block.notes || block.reason
  if (notes) {
    meta.push({ label: 'Notas', value: notes })
  }

  return meta
}

const getDays = (fromValue, toValue) => {
  if (!fromValue || !toValue) return 0
  const from = new Date(fromValue)
  const to = new Date(toValue)
  const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

const openCreateModal = () => {
  editingBlock.value = null
  formError.value = ''
  form.value = {
    unit_id: '',
    start_date: '',
    end_date: '',
    occupancy_type: 'maintenance',
    reason: '',
    notes: ''
  }
  showModal.value = true
}

const openEditModal = (block) => {
  editingBlock.value = block
  formError.value = ''
  form.value = {
    unit_id: block.unit_id,
    start_date: block.start_date,
    end_date: block.end_date,
    occupancy_type: block.occupancy_type || 'maintenance',
    reason: block.reason || '',
    notes: block.notes || ''
  }
  showModal.value = true
}

const openEditModalFromRoute = (blockId) => {
  if (!blockId) return

  const block = store.roomBlocks.find(item => item.id === blockId)
  if (!block) {
    toast.error('No se encontró el bloqueo solicitado.')
    return
  }

  openEditModal(block)
}

const closeModal = () => {
  if (submitting.value) return
  showModal.value = false

  if (route.params.id) {
    router.replace({ name: 'bloqueos' })
  }
}

const submitForm = async () => {
  submitting.value = true
  formError.value = ''

  try {
    if (new Date(form.value.start_date) >= new Date(form.value.end_date)) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio.')
    }

    if (editingBlock.value) {
      await store.updateRoomBlock(editingBlock.value.id, form.value)
      toast.success('Bloqueo actualizado correctamente.')
    } else {
      await store.createRoomBlock(form.value)
      toast.success('Bloqueo creado correctamente.')
    }

    showModal.value = false

    if (route.params.id) {
      router.replace({ name: 'bloqueos' })
    }
  } catch (err) {
    formError.value = err.message
  } finally {
    submitting.value = false
  }
}

const openDeleteModal = (block) => {
  blockToDelete.value = block
  deleteError.value = ''
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (deleting.value) return
  showDeleteModal.value = false
}

const confirmDelete = async () => {
  if (!blockToDelete.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await store.deleteRoomBlock(blockToDelete.value.id)
    showDeleteModal.value = false
    toast.success('Bloqueo eliminado correctamente.')
  } catch (err) {
    deleteError.value = err.message
  } finally {
    deleting.value = false
  }
}

watch(
  () => route.params.id,
  (blockId) => {
    if (!store.roomBlocks.length) return
    openEditModalFromRoute(blockId)
  }
)

watch(
  () => store.roomBlocks,
  () => {
    if (route.params.id) {
      openEditModalFromRoute(route.params.id)
    }
  },
  { deep: true }
)
</script>
