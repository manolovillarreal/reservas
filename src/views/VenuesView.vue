<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
          <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Sedes</h1>
          <div class="flex items-center gap-3">
            <ViewModeToggle v-model="viewMode" class="hidden sm:flex" />
            <button v-if="can('venues', 'create')" class="btn-primary" @click="openCreateModal">+ Nueva sede</button>
          </div>
    </div>

    <!-- Venues List -->
    <div v-if="isMobile" class="space-y-3">
      <div v-if="store.loading" class="card text-sm text-gray-500">Cargando sedes...</div>
      <div v-else-if="store.venues.length === 0" class="card text-sm text-gray-500">No hay sedes registradas.</div>

      <DataCard
        v-for="venue in store.venues"
        v-else
        :key="venue.id"
        :title="venue.name"
        :subtitle="venue.description || '-'"
        :badge="{ label: venue.is_active ? 'Activa' : 'Inactiva', type: venue.is_active ? 'success' : 'neutral' }"
        :meta="[{ label: 'Unidades', value: `${getUnitCount(venue.id)} unidades` }]"
        :actions="[
          ...(can('settings', 'edit') ? [{ label: 'Editar', type: 'ghost', handler: () => openEditModal(venue) }] : []),
          ...(can('settings', 'edit') ? [{ label: 'Eliminar', type: 'danger', handler: () => removeVenue(venue) }] : [])
        ]"
      />
    </div>

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th class="px-6 py-4">Nombre</th>
              <th class="px-6 py-4">Dirección</th>
              <th class="px-6 py-4">Estado</th>
              <th class="px-6 py-4">Unidades</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 text-sm">
            <tr v-if="store.loading">
              <td colspan="5" class="px-6 py-12 text-center text-gray-400">Cargando sedes...</td>
            </tr>
            <tr v-else-if="store.venues.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-gray-500 italic">No hay sedes registradas.</td>
            </tr>

            <tr v-for="venue in store.venues" :key="venue.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 font-medium text-gray-900">{{ venue.name }}</td>
              <td class="px-6 py-4 text-gray-600">{{ venue.address || '-' }}</td>
              <td class="px-6 py-4">
                <span :class="venue.is_active ? 'text-emerald-600' : 'text-red-600'">
                  {{ venue.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-600">{{ getUnitCount(venue.id) }}</td>
              <td class="px-6 py-4 text-right">
                <button v-if="can('settings', 'edit')" @click="openEditModal(venue)" class="text-gray-400 hover:text-primary px-2 py-1 transition-colors">Editar</button>
                <button v-if="can('settings', 'edit')" @click="toggleActive(venue)" class="text-gray-400 hover:text-primary px-2 py-1 transition-colors ml-2">
                  {{ venue.is_active ? 'Desactivar' : 'Activar' }}
                </button>
                <button v-if="can('settings', 'edit')" @click="removeVenue(venue)" class="text-gray-400 hover:text-red-600 px-2 py-1 transition-colors ml-2">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal :isOpen="showModal" @close="closeModal" :title="editingVenue ? 'Editar sede' : 'Nueva sede'" :fullScreenOnMobile="true">
      <form @submit.prevent="submitForm" class="space-y-5">
        <AppFormSection title="Datos de la sede" :divider="false">
          <AppInput v-model="form.name" label="Nombre" required />
          <AppInput v-model="form.address" label="Dirección" />
          <AppTextarea v-model="form.description" label="Descripción" :rows="2" :autoResize="true" />
          <AppToggle v-model="form.is_active" label="Sede activa" />
        </AppFormSection>

        <AppFormActions
          :submit-label="editingVenue ? 'Actualizar sede' : 'Guardar sede'"
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
      title="Eliminar sede"
      :message="deleteMessage"
      confirmLabel="Eliminar sede"
      :confirmationText="deleteConfirmationText"
      :modelValue="deleteConfirmationInput"
      :errorMessage="deleteErrorMessage"
      :loading="deleteLoading"
      @update:modelValue="deleteConfirmationInput = $event"
      @close="closeDeleteModal"
      @confirm="confirmDeleteVenue"
    />

    <BottomSheet v-if="isMobile" v-model="showDeleteModal" title="Eliminar sede" height="half">
      <div class="space-y-3">
        <p class="text-sm text-gray-700">{{ deleteMessage }}</p>
        <p class="text-xs text-gray-500">Escribe: {{ deleteConfirmationText }}</p>
        <input v-model="deleteConfirmationInput" type="text" class="w-full rounded-md border-gray-300 text-sm" placeholder="Confirmación">
        <p v-if="deleteErrorMessage" class="text-sm text-red-600">{{ deleteErrorMessage }}</p>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="deleteLoading" @click="closeDeleteModal">Cancelar</button>
          <button type="button" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" :disabled="deleteLoading || deleteConfirmationInput.trim() !== deleteConfirmationText" @click="confirmDeleteVenue">Eliminar sede</button>
        </div>
      </template>
    </BottomSheet>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useVenuesStore } from '../stores/venues'
import { useUnitsStore } from '../stores/units'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import DataCard from '../components/ui/DataCard.vue'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useViewMode } from '../composables/useViewMode'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import { AppInput, AppTextarea, AppToggle, AppFormSection, AppFormActions } from '@/components/ui/forms'

const store = useVenuesStore()
const unitsStore = useUnitsStore()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const { viewMode, isTable, isCards } = useViewMode('sedes')
const toast = useToast()

const showModal = ref(false)
const editingVenue = ref(null)
const submitting = ref(false)
const showDeleteModal = ref(false)
const venueToDelete = ref(null)
const deleteConfirmationInput = ref('')
const deleteErrorMessage = ref('')
const deleteLoading = ref(false)

const form = ref({
  name: '',
  address: '',
  description: '',
  is_active: true
})

onMounted(async () => {
  await store.fetchVenues()
  await unitsStore.fetchUnits()
})

const deleteConfirmationText = ref('')
const deleteMessage = ref('')

const getUnitCount = (venueId) => {
  return unitsStore.units.filter(u => u.venue_id === venueId).length
}

const openCreateModal = () => {
  editingVenue.value = null
  form.value = { name: '', address: '', description: '', is_active: true }
  showModal.value = true
}

const openEditModal = (venue) => {
  editingVenue.value = venue
  form.value = { ...venue, is_active: venue.is_active !== false }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingVenue.value = null
}

const submitForm = async () => {
  submitting.value = true
  try {
    if (editingVenue.value) {
      await store.updateVenue(editingVenue.value.id, form.value)
      toast.success('Sede actualizada correctamente.')
    } else {
      await store.createVenue(form.value)
      toast.success('Sede creada correctamente.')
    }
    closeModal()
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar la sede.')
  } finally {
    submitting.value = false
  }
}

const toggleActive = async (venue) => {
  try {
    await store.updateVenue(venue.id, { is_active: !venue.is_active })
    toast.success(`Sede ${venue.is_active ? 'desactivada' : 'activada'} correctamente.`)
  } catch (err) {
    toast.error(err.message || 'No se pudo actualizar la sede.')
  }
}

const removeVenue = async (venue) => {
  venueToDelete.value = venue
  deleteConfirmationText.value = `ELIMINAR ${venue.name}`
  deleteMessage.value = 'Esta acción eliminará la sede y sus unidades asociadas. Solo se completará si no existe relación con reservas ni historial.'
  deleteConfirmationInput.value = ''
  deleteErrorMessage.value = ''
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (deleteLoading.value) return
  showDeleteModal.value = false
  venueToDelete.value = null
  deleteConfirmationInput.value = ''
  deleteErrorMessage.value = ''
}

const confirmDeleteVenue = async () => {
  if (!venueToDelete.value) return

  deleteLoading.value = true
  try {
    await store.deleteVenue(venueToDelete.value.id)
    await unitsStore.fetchUnits()
    showDeleteModal.value = false
    venueToDelete.value = null
    deleteConfirmationInput.value = ''
    deleteErrorMessage.value = ''
    toast.success('Sede eliminada correctamente.')
  } catch (err) {
    deleteErrorMessage.value = err.message
  } finally {
    deleteLoading.value = false
  }
}
</script>