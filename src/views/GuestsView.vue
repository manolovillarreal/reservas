<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Huéspedes</h1>
      <button @click="openCreateModal" class="btn-primary">
        + Nuevo Huésped
      </button>
    </div>

    <div v-if="feedbackMessage" class="rounded-md border px-4 py-3 text-sm" :class="feedbackType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
      {{ feedbackMessage }}
    </div>

    <!-- Search -->
    <div class="card !py-4">
      <div class="w-full md:w-64">
        <label class="sr-only">Buscar huésped</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre..."
            class="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
          >
        </div>
      </div>
    </div>

    <!-- Guests List -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th class="px-6 py-4">Nombre</th>
              <th class="px-6 py-4">Email</th>
              <th class="px-6 py-4">Teléfono</th>
              <th class="px-6 py-4">Documento</th>
              <th class="px-6 py-4">Reservas</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 text-sm">
            <tr v-if="store.loading">
              <td colspan="6" class="px-6 py-12 text-center text-gray-400">Cargando huéspedes...</td>
            </tr>
            <tr v-else-if="filteredGuests.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500 italic">No hay huéspedes registrados.</td>
            </tr>

            <tr v-for="guest in filteredGuests" :key="guest.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 font-medium text-gray-900">{{ guest.name }}</td>
              <td class="px-6 py-4 text-gray-600">{{ guest.email || '-' }}</td>
              <td class="px-6 py-4 text-gray-600">{{ guest.phone || '-' }}</td>
              <td class="px-6 py-4 text-gray-600">{{ formatDocument(guest) }}</td>
              <td class="px-6 py-4 text-gray-600">{{ getReservationCount(guest.id) }}</td>
              <td class="px-6 py-4 text-right">
                <button @click="openEditModal(guest)" class="text-gray-400 hover:text-indigo-600 px-2 py-1 transition-colors">Editar</button>
                <button @click="removeGuest(guest)" class="text-gray-400 hover:text-red-600 px-2 py-1 transition-colors ml-2">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal :isOpen="showModal" @close="closeModal" :title="editingGuest ? 'Editar Huésped' : 'Nuevo Huésped'">
      <form @submit.prevent="submitForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre Completo</label>
          <input
            v-model="form.name"
            type="text"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input
              v-model="form.email"
              type="email"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              v-model="form.phone"
              type="tel"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nacionalidad</label>
            <input
              v-model="form.nationality"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo documento</label>
            <select
              v-model="form.document_type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Sin definir</option>
              <option value="passport">Pasaporte</option>
              <option value="cedula">Cédula</option>
              <option value="dni">DNI</option>
              <option value="foreign_id">Documento extranjero</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Número documento</label>
            <input
              v-model="form.document_number"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Notas</label>
          <textarea
            v-model="form.notes"
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
      title="Eliminar huésped"
      :message="deleteMessage"
      confirmLabel="Eliminar huésped"
      :errorMessage="deleteErrorMessage"
      :loading="deleteLoading"
      @close="closeDeleteModal"
      @confirm="confirmDeleteGuest"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useGuestsStore } from '../stores/guests'
import { useReservationsStore } from '../stores/reservations'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'

const store = useGuestsStore()
const reservationsStore = useReservationsStore()

const searchQuery = ref('')
const showModal = ref(false)
const editingGuest = ref(null)
const submitting = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref('success')
const showDeleteModal = ref(false)
const guestToDelete = ref(null)
const deleteErrorMessage = ref('')
const deleteLoading = ref(false)
const deleteMessage = ref('')

const form = ref({
  name: '',
  email: '',
  phone: '',
  nationality: '',
  document_type: '',
  document_number: '',
  notes: ''
})

onMounted(async () => {
  await store.fetchGuests()
  await reservationsStore.fetchReservations()
})

const setFeedback = (type, message) => {
  feedbackType.value = type
  feedbackMessage.value = message
}

const clearFeedback = () => {
  feedbackMessage.value = ''
}

const filteredGuests = computed(() => {
  if (!searchQuery.value) return store.guests
  const q = searchQuery.value.toLowerCase()
  return store.guests.filter(g => g.name.toLowerCase().includes(q))
})

const getReservationCount = (guestId) => {
  return reservationsStore.reservations.filter(r => r.guest_id === guestId).length
}

const openCreateModal = () => {
  editingGuest.value = null
  form.value = { name: '', email: '', phone: '', nationality: '', document_type: '', document_number: '', notes: '' }
  clearFeedback()
  showModal.value = true
}

const openEditModal = (guest) => {
  editingGuest.value = guest
  form.value = { ...guest }
  clearFeedback()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingGuest.value = null
}

const submitForm = async () => {
  submitting.value = true
  clearFeedback()
  try {
    if (editingGuest.value) {
      await store.updateGuest(editingGuest.value.id, form.value)
      setFeedback('success', 'Huésped actualizado correctamente.')
    } else {
      await store.createGuest(form.value)
      setFeedback('success', 'Huésped creado correctamente.')
    }
    closeModal()
  } catch (err) {
    setFeedback('error', err.message)
  } finally {
    submitting.value = false
  }
}

const removeGuest = async (guest) => {
  clearFeedback()
  guestToDelete.value = guest
  deleteMessage.value = `¿Estás seguro de que deseas eliminar al huésped "${guest.name}"?`
  deleteErrorMessage.value = ''
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (deleteLoading.value) return
  showDeleteModal.value = false
  guestToDelete.value = null
  deleteErrorMessage.value = ''
}

const confirmDeleteGuest = async () => {
  if (!guestToDelete.value) return

  deleteLoading.value = true
  try {
    await store.deleteGuest(guestToDelete.value.id)
    showDeleteModal.value = false
    guestToDelete.value = null
    deleteErrorMessage.value = ''
    setFeedback('success', 'Huésped eliminado correctamente.')
  } catch (err) {
    deleteErrorMessage.value = err.message
  } finally {
    deleteLoading.value = false
  }
}

const formatDocument = (guest) => {
  if (!guest.document_number) return '-'
  return [guest.document_type, guest.document_number].filter(Boolean).join(' · ')
}
</script>