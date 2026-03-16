<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Sedes</h1>
      <button @click="openCreateModal" class="btn-primary">
        + Nueva Sede
      </button>
    </div>

    <div v-if="feedbackMessage" class="rounded-md border px-4 py-3 text-sm" :class="feedbackType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
      {{ feedbackMessage }}
    </div>

    <!-- Venues List -->
    <div class="card overflow-hidden">
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
                <button @click="openEditModal(venue)" class="text-gray-400 hover:text-indigo-600 px-2 py-1 transition-colors">Editar</button>
                <button @click="toggleActive(venue)" class="text-gray-400 hover:text-indigo-600 px-2 py-1 transition-colors ml-2">
                  {{ venue.is_active ? 'Desactivar' : 'Activar' }}
                </button>
                <button @click="removeVenue(venue)" class="text-gray-400 hover:text-red-600 px-2 py-1 transition-colors ml-2">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal :isOpen="showModal" @close="closeModal" :title="editingVenue ? 'Editar Sede' : 'Nueva Sede'">
      <form @submit.prevent="submitForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            v-model="form.name"
            type="text"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Dirección</label>
          <input
            v-model="form.address"
            type="text"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          ></textarea>
        </div>

        <div class="flex justify-end pt-4 border-t">
          <button type="button" @click="closeModal" class="btn-secondary mr-3">Cancelar</button>
          <button type="submit" :disabled="submitting" class="btn-primary">
            {{ submitting ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </BaseModal>

    <ConfirmActionModal
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useVenuesStore } from '../stores/venues'
import { useUnitsStore } from '../stores/units'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'

const store = useVenuesStore()
const unitsStore = useUnitsStore()

const showModal = ref(false)
const editingVenue = ref(null)
const submitting = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref('success')
const showDeleteModal = ref(false)
const venueToDelete = ref(null)
const deleteConfirmationInput = ref('')
const deleteErrorMessage = ref('')
const deleteLoading = ref(false)

const form = ref({
  name: '',
  address: '',
  description: ''
})

onMounted(async () => {
  await store.fetchVenues()
  await unitsStore.fetchUnits()
})

const setFeedback = (type, message) => {
  feedbackType.value = type
  feedbackMessage.value = message
}

const clearFeedback = () => {
  feedbackMessage.value = ''
}

const deleteConfirmationText = ref('')
const deleteMessage = ref('')

const getUnitCount = (venueId) => {
  return unitsStore.units.filter(u => u.venue_id === venueId).length
}

const openCreateModal = () => {
  editingVenue.value = null
  form.value = { name: '', address: '', description: '' }
  clearFeedback()
  showModal.value = true
}

const openEditModal = (venue) => {
  editingVenue.value = venue
  form.value = { ...venue }
  clearFeedback()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingVenue.value = null
}

const submitForm = async () => {
  submitting.value = true
  clearFeedback()
  try {
    if (editingVenue.value) {
      await store.updateVenue(editingVenue.value.id, form.value)
      setFeedback('success', 'Sede actualizada correctamente.')
    } else {
      await store.createVenue(form.value)
      setFeedback('success', 'Sede creada correctamente.')
    }
    closeModal()
  } catch (err) {
    setFeedback('error', err.message)
  } finally {
    submitting.value = false
  }
}

const toggleActive = async (venue) => {
  clearFeedback()
  try {
    await store.updateVenue(venue.id, { is_active: !venue.is_active })
    setFeedback('success', `Sede ${venue.is_active ? 'desactivada' : 'activada'} correctamente.`)
  } catch (err) {
    setFeedback('error', err.message)
  }
}

const removeVenue = async (venue) => {
  clearFeedback()
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
    setFeedback('success', 'Sede eliminada correctamente.')
  } catch (err) {
    deleteErrorMessage.value = err.message
  } finally {
    deleteLoading.value = false
  }
}
</script>