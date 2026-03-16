<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Unidades</h1>
      <button @click="openCreateModal" class="btn-primary">
        + Nueva Unidad
      </button>
    </div>

    <div v-if="feedbackMessage" class="rounded-md border px-4 py-3 text-sm" :class="feedbackType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
      {{ feedbackMessage }}
    </div>

    <!-- Venue Filter -->
    <div class="card !py-4">
      <div class="w-full md:w-64">
        <label class="block text-sm font-medium text-gray-700 mb-2">Filtrar por Sede</label>
        <select v-model="selectedVenue" @change="fetchFilteredUnits" class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option value="">Todas las sedes</option>
          <option v-for="venue in venuesStore.venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
        </select>
      </div>
    </div>

    <!-- Units List -->
    <div class="card overflow-hidden">
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
                <button @click="openEditModal(unit)" class="text-gray-400 hover:text-indigo-600 px-2 py-1 transition-colors">Editar</button>
                <button @click="toggleActive(unit)" class="text-gray-400 hover:text-indigo-600 px-2 py-1 transition-colors ml-2">
                  {{ unit.is_active ? 'Desactivar' : 'Activar' }}
                </button>
                <button @click="removeUnit(unit)" class="text-gray-400 hover:text-red-600 px-2 py-1 transition-colors ml-2">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal :isOpen="showModal" @close="closeModal" :title="editingUnit ? 'Editar Unidad' : 'Nueva Unidad'">
      <form @submit.prevent="submitForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Sede</label>
          <select
            v-model="form.venue_id"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Seleccionar sede</option>
            <option v-for="venue in venuesStore.venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option>
          </select>
        </div>

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
      title="Eliminar unidad"
      :message="deleteMessage"
      confirmLabel="Eliminar unidad"
      :errorMessage="deleteErrorMessage"
      :loading="deleteLoading"
      @close="closeDeleteModal"
      @confirm="confirmDeleteUnit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUnitsStore } from '../stores/units'
import { useVenuesStore } from '../stores/venues'
import { useReservationsStore } from '../stores/reservations'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'

const store = useUnitsStore()
const venuesStore = useVenuesStore()
const reservationsStore = useReservationsStore()

const selectedVenue = ref('')
const showModal = ref(false)
const editingUnit = ref(null)
const submitting = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref('success')
const showDeleteModal = ref(false)
const unitToDelete = ref(null)
const deleteErrorMessage = ref('')
const deleteLoading = ref(false)
const deleteMessage = ref('')

const form = ref({
  venue_id: '',
  name: '',
  description: ''
})

onMounted(async () => {
  await venuesStore.fetchVenues()
  await reservationsStore.fetchReservations()
  await fetchFilteredUnits()
})

const setFeedback = (type, message) => {
  feedbackType.value = type
  feedbackMessage.value = message
}

const clearFeedback = () => {
  feedbackMessage.value = ''
}

const fetchFilteredUnits = async () => {
  await store.fetchUnits(selectedVenue.value || null)
}

const getActiveReservations = (unitId) => {
  return reservationsStore.reservations.filter(r =>
    r.reservation_units?.some(ru => ru.unit_id === unitId) &&
    ['confirmed', 'in_stay'].includes(r.status)
  ).length
}

const openCreateModal = () => {
  editingUnit.value = null
  form.value = { venue_id: selectedVenue.value, name: '', description: '' }
  clearFeedback()
  showModal.value = true
}

const openEditModal = (unit) => {
  editingUnit.value = unit
  form.value = { ...unit }
  clearFeedback()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingUnit.value = null
}

const submitForm = async () => {
  submitting.value = true
  clearFeedback()
  try {
    if (editingUnit.value) {
      await store.updateUnit(editingUnit.value.id, form.value)
      setFeedback('success', 'Unidad actualizada correctamente.')
    } else {
      await store.createUnit(form.value)
      setFeedback('success', 'Unidad creada correctamente.')
    }
    closeModal()
  } catch (err) {
    setFeedback('error', err.message)
  } finally {
    submitting.value = false
  }
}

const toggleActive = async (unit) => {
  clearFeedback()
  try {
    await store.updateUnit(unit.id, { is_active: !unit.is_active })
    setFeedback('success', `Unidad ${unit.is_active ? 'desactivada' : 'activada'} correctamente.`)
  } catch (err) {
    setFeedback('error', err.message)
  }
}

const removeUnit = async (unit) => {
  clearFeedback()
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
    setFeedback('success', 'Unidad eliminada correctamente.')
  } catch (err) {
    deleteErrorMessage.value = err.message
  } finally {
    deleteLoading.value = false
  }
}
</script>