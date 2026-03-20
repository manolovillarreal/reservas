<template>
  <div class="space-y-6">
    <!-- Header -->
     <div class="flex items-center justify-between gap-3">
       <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Unidades</h1>
       <div class="flex items-center gap-3">
         <ViewModeToggle v-model="viewMode" class="hidden sm:flex" />
         <button v-if="can('units', 'create')" @click="openCreateModal" class="btn-primary">
           + Nueva Unidad
         </button>
       </div>
     </div>

    <!-- Venue Filter -->
    <div class="card !py-4">
      <div class="w-full md:w-64">
        <label class="block text-sm font-medium text-gray-700 mb-2">Filtrar por Sede</label>
        <select v-model="selectedVenue" @change="fetchFilteredUnits" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary/30 focus:border-primary sm:text-sm rounded-md">
          <option value="">Todas las sedes</option>
          <option v-for="venue in venuesStore.venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
        </select>
      </div>
    </div>

    <!-- Units List -->
    <div v-if="isMobile" class="space-y-3">
      <div v-if="store.loading" class="card text-sm text-gray-500">Cargando unidades...</div>
      <div v-else-if="store.units.length === 0" class="card text-sm text-gray-500">No hay unidades registradas.</div>

      <DataCard
        v-for="unit in store.units"
        v-else
        :key="unit.id"
        :title="unit.name"
        :subtitle="unit.venues?.name || '-'"
        :badge="{ label: unit.is_active ? 'Activa' : 'Inactiva', type: unit.is_active ? 'success' : 'neutral' }"
        :meta="unitMeta(unit)"
        :actions="[
          ...(can('units', 'edit') ? [{ label: 'Editar', type: 'ghost', handler: () => openEditModal(unit) }] : []),
          ...(can('units', 'delete') ? [{ label: 'Eliminar', type: 'danger', handler: () => removeUnit(unit) }] : [])
        ]"
      />
    </div>

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th class="px-6 py-4">Nombre</th>
              <th class="px-6 py-4">Sede</th>
              <th class="px-6 py-4">Estado</th>
              <th class="px-6 py-4">Reservas Activas</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 text-sm">
            <tr v-if="store.loading">
              <td colspan="5" class="px-6 py-12 text-center text-gray-400">Cargando unidades...</td>
            </tr>
            <tr v-else-if="store.units.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-gray-500 italic">No hay unidades registradas.</td>
            </tr>

            <tr v-for="unit in store.units" :key="unit.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 font-medium text-gray-900">{{ unit.name }}</td>
              <td class="px-6 py-4 text-gray-600">{{ unit.venues?.name }}</td>
              <td class="px-6 py-4">
                <span :class="unit.is_active ? 'text-emerald-600' : 'text-red-600'">
                  {{ unit.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-600">{{ getActiveReservations(unit.id) }}</td>
              <td class="px-6 py-4 text-right">
                <button v-if="can('units', 'edit')" @click="openEditModal(unit)" class="text-gray-400 hover:text-primary px-2 py-1 transition-colors">Editar</button>
                <button v-if="can('units', 'edit')" @click="toggleActive(unit)" class="text-gray-400 hover:text-primary px-2 py-1 transition-colors ml-2">
                  {{ unit.is_active ? 'Desactivar' : 'Activar' }}
                </button>
                <button v-if="can('units', 'delete')" @click="removeUnit(unit)" class="text-gray-400 hover:text-red-600 px-2 py-1 transition-colors ml-2">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal :isOpen="showModal" @close="closeModal" :title="editingUnit ? 'Editar unidad' : 'Nueva unidad'" :fullScreenOnMobile="true">
      <form @submit.prevent="submitForm" class="space-y-5">
        <AppFormSection title="Datos de la unidad" :divider="false">
          <AppSelect
            v-model="form.venue_id"
            label="Sede"
            :options="venueOptions"
            placeholder="Seleccionar sede"
          />
          <AppInput v-model="form.name" label="Nombre" required />
          <AppTextarea v-model="form.description" label="Descripción" :rows="2" :autoResize="true" />
          <AppToggle v-model="form.is_active" label="Unidad activa" />
        </AppFormSection>

        <AppFormActions
          :submit-label="editingUnit ? 'Actualizar unidad' : 'Guardar unidad'"
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
      title="Eliminar unidad"
      :message="deleteMessage"
      confirmLabel="Eliminar unidad"
      :errorMessage="deleteErrorMessage"
      :loading="deleteLoading"
      @close="closeDeleteModal"
      @confirm="confirmDeleteUnit"
    />

    <BottomSheet v-if="isMobile" v-model="showDeleteModal" title="Eliminar unidad" height="half">
      <div class="space-y-4">
        <p class="text-sm text-gray-700">{{ deleteMessage }}</p>
        <p v-if="deleteErrorMessage" class="text-sm text-red-600">{{ deleteErrorMessage }}</p>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="deleteLoading" @click="closeDeleteModal">Cancelar</button>
          <button type="button" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" :disabled="deleteLoading" @click="confirmDeleteUnit">Eliminar unidad</button>
        </div>
      </template>
    </BottomSheet>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUnitsStore } from '../stores/units'
import { useVenuesStore } from '../stores/venues'
import { useReservationsStore } from '../stores/reservations'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import DataCard from '../components/ui/DataCard.vue'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useViewMode } from '../composables/useViewMode'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import { AppInput, AppSelect, AppTextarea, AppToggle, AppFormSection, AppFormActions } from '@/components/ui/forms'

const store = useUnitsStore()
const venuesStore = useVenuesStore()
const reservationsStore = useReservationsStore()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const { viewMode, isTable, isCards } = useViewMode('unidades')
const toast = useToast()

const selectedVenue = ref('')
const showModal = ref(false)
const editingUnit = ref(null)
const submitting = ref(false)
const showDeleteModal = ref(false)
const unitToDelete = ref(null)
const deleteErrorMessage = ref('')
const deleteLoading = ref(false)
const deleteMessage = ref('')

const form = ref({
  venue_id: '',
  name: '',
  description: '',
  is_active: true
})

const venueOptions = ref([])

onMounted(async () => {
  await venuesStore.fetchVenues()
  venueOptions.value = venuesStore.venues.map((venue) => ({ value: venue.id, label: venue.name }))
  await reservationsStore.fetchReservations()
  await fetchFilteredUnits()
})

const fetchFilteredUnits = async () => {
  await store.fetchUnits(selectedVenue.value || null)
}

const getActiveReservations = (unitId) => {
  return reservationsStore.reservations.filter(r =>
    r.reservation_units?.some(ru => ru.unit_id === unitId) &&
    ['confirmed', 'in_stay'].includes(r.status)
  ).length
}

const unitMeta = (unit) => {
  const meta = []
  if (unit.description) {
    meta.push({ label: 'Descripción', value: unit.description })
  }
  return meta
}

const openCreateModal = () => {
  editingUnit.value = null
  form.value = { venue_id: selectedVenue.value, name: '', description: '', is_active: true }
  showModal.value = true
}

const openEditModal = (unit) => {
  editingUnit.value = unit
  form.value = { ...unit, is_active: unit.is_active !== false }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingUnit.value = null
}

const submitForm = async () => {
  submitting.value = true
  try {
    if (editingUnit.value) {
      await store.updateUnit(editingUnit.value.id, form.value)
      toast.success('Unidad actualizada correctamente.')
    } else {
      await store.createUnit(form.value)
      toast.success('Unidad creada correctamente.')
    }
    closeModal()
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar la unidad.')
  } finally {
    submitting.value = false
  }
}

const toggleActive = async (unit) => {
  try {
    await store.updateUnit(unit.id, { is_active: !unit.is_active })
    toast.success(`Unidad ${unit.is_active ? 'desactivada' : 'activada'} correctamente.`)
  } catch (err) {
    toast.error(err.message || 'No se pudo actualizar la unidad.')
  }
}

const removeUnit = async (unit) => {
  unitToDelete.value = unit
  deleteMessage.value = `¿Estás seguro de que deseas eliminar la unidad "${unit.name}"?`
  deleteErrorMessage.value = ''
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (deleteLoading.value) return
  showDeleteModal.value = false
  unitToDelete.value = null
  deleteErrorMessage.value = ''
}

const confirmDeleteUnit = async () => {
  if (!unitToDelete.value) return

  deleteLoading.value = true
  try {
    await store.deleteUnit(unitToDelete.value.id)
    await fetchFilteredUnits()
    showDeleteModal.value = false
    unitToDelete.value = null
    deleteErrorMessage.value = ''
    toast.success('Unidad eliminada correctamente.')
  } catch (err) {
    deleteErrorMessage.value = err.message
  } finally {
    deleteLoading.value = false
  }
}
</script>