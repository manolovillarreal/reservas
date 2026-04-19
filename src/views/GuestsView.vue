<template>
  <div class="space-y-6">
    <!-- Header -->
     <div class="flex items-center justify-between gap-3">
       <h1 class="text-3xl font-semibold text-gray-900 tracking-tight">Huéspedes</h1>
       <div class="flex items-center gap-3">
         <ViewModeToggle v-if="!isMobile" v-model="viewMode" />
         <button v-if="can('guests', 'create')" @click="openCreateModal" class="btn-primary hidden sm:flex">
           + Nuevo Huésped
         </button>
       </div>
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
            class="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary/30 focus:border-primary sm:text-sm transition-shadow"
          >
        </div>
      </div>
    </div>

    <!-- Guests List -->
    <div v-if="isMobile" class="space-y-3">
      <div v-if="store.loading" class="card text-sm text-gray-500">Cargando huéspedes...</div>
      <div v-else-if="filteredGuests.length === 0" class="card text-sm text-gray-500">No hay huéspedes registrados.</div>

      <DataCard
        v-for="guest in filteredGuests"
        v-else
        :key="guest.id"
        :title="`${guest.first_name || ''} ${guest.last_name || ''}`.trim()"
        :subtitle="formatDocument(guest)"
        :badge="{ label: reservationsBadge(guest.id), type: 'neutral' }"
        :meta="guestMeta(guest)"
        :actions="[
          { label: 'Ver perfil', type: 'ghost', handler: () => goToGuestProfile(guest) },
          ...(can('guests', 'edit') ? [{ label: 'Editar', type: 'primary', handler: () => openEditModal(guest) }] : [])
        ]"
      />
    </div>

    <div v-if="!isMobile && isTable" class="card overflow-hidden">
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
              <td class="px-6 py-4 font-medium text-gray-900">{{ `${guest.first_name || ''} ${guest.last_name || ''}`.trim() }}</td>
              <td class="px-6 py-4 text-gray-600">{{ guest.email || '-' }}</td>
              <td class="px-6 py-4 text-gray-600">{{ guest.phone || '-' }}</td>
              <td class="px-6 py-4 text-gray-600">{{ formatDocument(guest) }}</td>
              <td class="px-6 py-4 text-gray-600">{{ getReservationCount(guest.id) }}</td>
              <td class="px-6 py-4 text-right">
                <button @click="goToGuestProfile(guest)" class="text-gray-400 hover:text-primary px-2 py-1 transition-colors">Ver perfil</button>
                <button v-if="can('guests', 'edit')" @click="openEditModal(guest)" class="text-gray-400 hover:text-primary px-2 py-1 transition-colors">Editar</button>
                <button v-if="can('guests', 'delete')" @click="removeGuest(guest)" class="text-gray-400 hover:text-red-600 px-2 py-1 transition-colors ml-2">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!isMobile && isCards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <DataCard
        v-for="guest in filteredGuests"
        :key="guest.id"
        :title="`${guest.first_name || ''} ${guest.last_name || ''}`.trim()"
        :subtitle="guestCardSubtitle(guest)"
        :badge="{ label: `${getReservationCount(guest.id)} reserva(s)`, type: 'neutral' }"
        :meta="buildGuestCardMeta(guest)"
        :actions="[
          { label: 'Ver perfil', type: 'ghost', handler: () => goToGuestProfile(guest) },
          ...(can('guests', 'edit') ? [{ label: 'Editar', type: 'primary', handler: () => openEditModal(guest) }] : [])
        ]"
        :onClick="() => goToGuestProfile(guest)"
      />
      <div
        v-if="!store.loading && filteredGuests.length === 0"
        class="col-span-full text-center py-12 text-neutral-secondary"
      >
        No hay huéspedes registrados.
      </div>
      <div
        v-if="store.loading"
        class="col-span-full text-center py-12 text-neutral-secondary"
      >
        Cargando huéspedes...
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal :isOpen="showModal" @close="closeModal" :title="editingGuest ? 'Editar huésped' : 'Nuevo huésped'" size="lg" :fullScreenOnMobile="true">
      <form @submit.prevent="submitForm" class="space-y-5">
        <AppFormSection title="Identidad" :divider="true">
          <AppFormGrid :columns="2">
            <AppInput
              v-model="form.first_name"
              label="Nombres"
              required
              :error="fieldError('first_name')"
              @blur="touchField('first_name')"
            />
            <AppInput
              v-model="form.last_name"
              label="Apellidos"
            />
          </AppFormGrid>
          <AppFormGrid :columns="2">
            <AppSelect
              v-model="form.document_type"
              label="Tipo documento"
              :options="documentTypeOptions"
              placeholder="Sin definir"
            />
            <AppInput
              v-model="form.document_number"
              label="Número documento"
            />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Contacto" :divider="true">
          <AppFormGrid :columns="2">
            <AppInput v-model="form.phone" type="tel" label="Teléfono" />
            <AppInput v-model="form.email" type="email" label="Email" />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Información adicional" :divider="false">
          <AppCountrySelect v-model="form.nationality" label="Nacionalidad" />
          <AppTextarea
            v-model="form.notes"
            label="Notas"
            :rows="2"
            :autoResize="true"
          />
        </AppFormSection>

        <AppFormActions
          :submit-label="editingGuest ? 'Actualizar huésped' : 'Guardar huésped'"
          cancel-label="Cancelar"
          :loading="submitting"
          :submit-disabled="submitting"
          @submit="submitForm"
          @cancel="closeModal"
        />
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
import { useRouter } from 'vue-router'
import { useGuestsStore } from '../stores/guests'
import { useReservationsStore } from '../stores/reservations'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import DataCard from '../components/ui/DataCard.vue'
import { usePermissions } from '../composables/usePermissions'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useViewMode } from '../composables/useViewMode'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import { useToast } from '../composables/useToast'
import {
  AppInput,
  AppSelect,
  AppTextarea,
  AppCountrySelect,
  AppFormSection,
  AppFormGrid,
  AppFormActions
} from '@/components/ui/forms'

const store = useGuestsStore()
const reservationsStore = useReservationsStore()
const router = useRouter()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const { viewMode, isTable, isCards } = useViewMode('huespedes')
const toast = useToast()

const searchQuery = ref('')
const showModal = ref(false)
const editingGuest = ref(null)
const submitting = ref(false)
const touched = ref({})
const submitAttempted = ref(false)
const showDeleteModal = ref(false)
const guestToDelete = ref(null)
const deleteErrorMessage = ref('')
const deleteLoading = ref(false)
const deleteMessage = ref('')

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  nationality: '',
  document_type: '',
  document_number: '',
  notes: ''
})

const documentTypeOptions = [
  { value: 'passport', label: 'Pasaporte' },
  { value: 'cedula', label: 'Cédula' },
  { value: 'dni', label: 'DNI' },
  { value: 'foreign_id', label: 'Documento extranjero' },
]

onMounted(async () => {
  await store.fetchGuests()
  await reservationsStore.fetchReservations()
})

const touchField = (field) => {
  touched.value[field] = true
}

const fieldError = (field) => {
  if (!touched.value[field] && !submitAttempted.value) return ''

  if (field === 'first_name' && !form.value.first_name?.trim()) {
    return 'El nombre es obligatorio.'
  }

  return ''
}

const filteredGuests = computed(() => {
  if (!searchQuery.value) return store.guests
  const q = searchQuery.value.toLowerCase()
  return store.guests.filter(g => `${g.first_name || ''} ${g.last_name || ''}`.trim().toLowerCase().includes(q))
})

const getReservationCount = (guestId) => {
  return reservationsStore.reservations.filter(r => r.guest_id === guestId).length
}

const reservationsBadge = (guestId) => {
  const total = getReservationCount(guestId)
  return `${total} reserva${total === 1 ? '' : 's'}`
}

const guestMeta = (guest) => {
  const meta = [
    { label: 'Teléfono', value: guest.phone || '-' },
    { label: 'Email', value: guest.email || '-' }
  ]

  if (guest.nationality) {
    meta.push({ label: 'País', value: guest.nationality })
  }

  return meta
}

const guestCardSubtitle = (guest) => {
  const type = guest.document_type || ''
  const number = guest.document_number || ''
  return `${type} ${number}`.trim() || '-'
}

const buildGuestCardMeta = (guest) => {
  return [
    guest.phone ? { label: 'Teléfono', value: guest.phone } : null,
    guest.email ? { label: 'Email', value: guest.email } : null,
    guest.nationality ? { label: 'Nacionalidad', value: guest.nationality } : null
  ].filter(Boolean)
}

const goToGuestProfile = (guest) => {
  if (!guest?.id) return
  router.push(`/huespedes/${guest.id}`)
}

const openCreateModal = () => {
  editingGuest.value = null
  form.value = { first_name: '', last_name: '', email: '', phone: '', nationality: '', document_type: '', document_number: '', notes: '' }
  touched.value = {}
  submitAttempted.value = false
  showModal.value = true
}

const openEditModal = (guest) => {
  editingGuest.value = guest
  form.value = { ...guest }
  touched.value = {}
  submitAttempted.value = false
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingGuest.value = null
}

const submitForm = async () => {
  submitAttempted.value = true
  if (fieldError('first_name')) return

  submitting.value = true
  try {
    if (editingGuest.value) {
      await store.updateGuest(editingGuest.value.id, form.value)
      toast.success('Huésped actualizado correctamente.')
    } else {
      await store.createGuest(form.value)
      toast.success('Huésped creado correctamente.')
    }
    closeModal()
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar el huésped.')
  } finally {
    submitting.value = false
  }
}

const removeGuest = async (guest) => {
  guestToDelete.value = guest
  deleteMessage.value = `¿Estás seguro de que deseas eliminar al huésped "${`${guest.first_name || ''} ${guest.last_name || ''}`.trim()}"?`
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
    toast.success('Huésped eliminado correctamente.')
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