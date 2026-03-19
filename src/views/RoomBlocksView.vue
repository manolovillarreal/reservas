<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Bloqueos</h1>
      <button v-if="can('occupancies', 'create')" class="btn-primary" @click="openCreateModal">+ Nuevo bloqueo</button>
    </div>

    <div v-if="feedbackMessage" class="rounded-md border px-4 py-3 text-sm" :class="feedbackType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
      {{ feedbackMessage }}
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

    <div class="card overflow-hidden !p-0">
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
                  <button v-if="can('occupancies', 'edit')" class="text-sm font-medium text-indigo-600 hover:text-indigo-800" @click="openEditModal(block)">Editar</button>
                  <button v-if="can('occupancies', 'delete')" class="text-sm font-medium text-red-600 hover:text-red-800" @click="openDeleteModal(block)">Eliminar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal :isOpen="showModal" :title="editingBlock ? 'Editar bloqueo' : 'Nuevo bloqueo'" @close="closeModal">
      <form class="space-y-4" @submit.prevent="submitForm">
        <div>
          <label class="block text-sm font-medium text-gray-700">Unidad</label>
          <select v-model="form.unit_id" required class="mt-1 block w-full rounded-md border-gray-300">
            <option value="">Seleccionar unidad</option>
            <option v-for="unit in units" :key="unit.id" :value="unit.id">
              {{ unit.name }} - {{ venueNameById(unit.venue_id) }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">Fecha inicio</label>
            <input v-model="form.start_date" type="date" required class="mt-1 block w-full rounded-md border-gray-300">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Fecha fin</label>
            <input v-model="form.end_date" type="date" required class="mt-1 block w-full rounded-md border-gray-300">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Motivo</label>
          <input v-model="form.reason" type="text" class="mt-1 block w-full rounded-md border-gray-300" placeholder="Mantenimiento, uso interno...">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Tipo de ocupación</label>
          <select v-model="form.occupancy_type" class="mt-1 block w-full rounded-md border-gray-300">
            <option value="maintenance">Mantenimiento</option>
            <option value="owner_use">Uso propietario</option>
            <option value="external">Externo</option>
            <option value="inquiry_hold">Hold de consulta</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Notas</label>
          <textarea v-model="form.notes" rows="3" class="mt-1 block w-full rounded-md border-gray-300"></textarea>
        </div>

        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>

        <div class="flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="submitting">{{ submitting ? 'Guardando...' : 'Guardar bloqueo' }}</button>
        </div>
      </form>
    </BaseModal>

    <ConfirmActionModal
      :isOpen="showDeleteModal"
      title="Eliminar bloqueo"
      :message="`¿Deseas eliminar el bloqueo de ${blockToDelete?.units?.name || 'esta unidad'}?`"
      confirmLabel="Eliminar"
      :loading="deleting"
      :errorMessage="deleteError"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import { useRoomBlocksStore } from '../stores/roomBlocks'
import { usePermissions } from '../composables/usePermissions'
import { useAccountStore } from '../stores/account'

const route = useRoute()
const router = useRouter()
const store = useRoomBlocksStore()
const { can } = usePermissions()
const accountStore = useAccountStore()

const venues = ref([])
const units = ref([])
const selectedVenueId = ref('')
const searchText = ref('')

const feedbackMessage = ref('')
const feedbackType = ref('success')

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

const formatOccupancyType = (type) => {
  return {
    maintenance: 'Mantenimiento',
    owner_use: 'Uso propietario',
    inquiry_hold: 'Hold consulta',
    external: 'Externo'
  }[type] || type
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
    feedbackType.value = 'error'
    feedbackMessage.value = 'No se encontró el bloqueo solicitado.'
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
      feedbackType.value = 'success'
      feedbackMessage.value = 'Bloqueo actualizado correctamente.'
    } else {
      await store.createRoomBlock(form.value)
      feedbackType.value = 'success'
      feedbackMessage.value = 'Bloqueo creado correctamente.'
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
    feedbackType.value = 'success'
    feedbackMessage.value = 'Bloqueo eliminado correctamente.'
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
