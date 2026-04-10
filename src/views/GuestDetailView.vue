<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <button type="button" class="text-sm font-medium text-gray-500 hover:text-gray-900" @click="goBack">
        ← Volver a huéspedes
      </button>
      <button v-if="can('guests', 'edit') && guest" type="button" class="btn-secondary text-sm" @click="openEditModal">
        Editar
      </button>
    </div>

    <div v-if="loading" class="card text-sm text-gray-500">Cargando huésped...</div>
    <div v-else-if="!guest" class="card text-sm text-gray-500">No se encontró el huésped.</div>

    <template v-else>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="card lg:col-span-1">
          <h1 class="text-2xl font-semibold text-gray-900">{{ `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Sin nombre' }}</h1>
          <p class="mt-1 text-sm text-gray-600">{{ formatDocument(guest) }}</p>

          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-gray-500">Teléfono</dt>
              <dd class="text-gray-900">{{ [guest.phone_country_code, guest.phone].filter(Boolean).join(' ') || '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-gray-500">Email</dt>
              <dd class="text-gray-900">{{ guest.email || '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-gray-500">País</dt>
              <dd class="text-gray-900">{{ nationalityDisplay(guest.nationality) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-gray-500">Fecha de nacimiento</dt>
              <dd class="text-gray-900">{{ guest.birth_date ? formatDate(guest.birth_date) : '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-gray-500">Género</dt>
              <dd class="text-gray-900">{{ genderLabel(guest.gender) }}</dd>
            </div>
          </dl>
        </div>

        <div class="space-y-3 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900">Historial de reservas</h2>

          <div v-if="guestReservations.length === 0" class="card text-sm text-gray-500">
            No hay reservas asociadas.
          </div>

          <DataCard
            v-for="reservation in guestReservations"
            :key="reservation.id"
            :title="reservation.reservation_number || '-'"
            :subtitle="`${formatDate(reservation.check_in)} → ${formatDate(reservation.check_out)}`"
            :badge="statusBadge(reservation.status)"
            :meta="[
              { label: 'Personas', value: `${Number(reservation.adults || 0) + Number(reservation.children || 0)} pax` },
              { label: 'Total', value: formatCop(reservation.total_amount || 0) }
            ]"
            :actions="[{ label: 'Ver reserva', type: 'ghost', handler: () => goToReservation(reservation.id) }]"
          />
        </div>
      </div>
    </template>

    <BaseModal
      :isOpen="showEditModal"
      title="Editar huésped"
      size="lg"
      :fullScreenOnMobile="true"
      @close="closeEditModal"
    >
      <form class="space-y-5" @submit.prevent="saveGuest">
        <AppFormSection title="Identidad" :divider="true">
          <AppFormGrid :columns="2">
            <AppInput v-model="editForm.first_name" label="Nombres" required />
            <AppInput v-model="editForm.last_name" label="Apellidos" />
          </AppFormGrid>
          <AppFormGrid :columns="2">
            <AppSelect
              v-model="editForm.document_type"
              label="Tipo documento"
              :options="documentTypeOptions"
              placeholder="Sin definir"
            />
            <AppInput v-model="editForm.document_number" label="Número documento" />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Contacto" :divider="true">
          <AppFormGrid :columns="2">
            <AppPhoneInput
              :countryCode="editForm.phone_country_code"
              :phoneNumber="editForm.phone"
              label="Teléfono"
              @update:countryCode="editForm.phone_country_code = $event"
              @update:phoneNumber="editForm.phone = $event"
            />
            <AppInput v-model="editForm.email" type="email" label="Email" />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Información adicional" :divider="false">
          <AppCountrySelect v-model="editForm.nationality" label="Nacionalidad" />
          <AppInput v-model="editForm.birth_date" type="date" label="Fecha de nacimiento" />
          <AppSelect
            v-model="editForm.gender"
            label="Género"
            :options="[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' }, { value: 'unspecified', label: 'Prefiero no indicar' }]"
            placeholder="Sin definir"
            hint="Opcional"
          />
          <AppTextarea v-model="editForm.notes" label="Notas" :rows="2" :autoResize="true" />
        </AppFormSection>

        <AppFormActions
          submit-label="Guardar cambios"
          cancel-label="Cancelar"
          :loading="saving"
          :submit-disabled="saving"
          @submit="saveGuest"
          @cancel="closeEditModal"
        />
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { countries, getEmojiFlag } from 'countries-list'
import BaseModal from '../components/ui/BaseModal.vue'
import DataCard from '../components/ui/DataCard.vue'
import { useGuestsStore } from '../stores/guests'
import { useReservationsStore } from '../stores/reservations'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import {
  AppInput,
  AppPhoneInput,
  AppSelect,
  AppTextarea,
  AppFormSection,
  AppFormGrid,
  AppFormActions,
  AppCountrySelect
} from '@/components/ui/forms'
import { DOCUMENT_TYPES_ALL as documentTypeOptions } from '../utils/documentTypes'

const route = useRoute()
const router = useRouter()
const guestsStore = useGuestsStore()
const reservationsStore = useReservationsStore()
const { can } = usePermissions()
const toast = useToast()

const loading = ref(true)
const showEditModal = ref(false)
const saving = ref(false)
const editForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  phone_country_code: '+57',
  nationality: '',
  birth_date: '',
  document_type: '',
  document_number: '',
  gender: '',
  notes: ''
})

const guest = computed(() => guestsStore.guests.find((item) => item.id === route.params.id) || null)

const guestReservations = computed(() => {
  if (!guest.value?.id) return []
  return reservationsStore.reservations
    .filter((reservation) => reservation.guest_id === guest.value.id)
    .sort((a, b) => String(b.check_in || '').localeCompare(String(a.check_in || '')))
})

const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([
      guestsStore.fetchGuests(),
      reservationsStore.fetchReservations()
    ])
  } finally {
    loading.value = false
  }
}

const openEditModal = () => {
  if (!guest.value) return
  editForm.value = {
    first_name: guest.value.first_name || '',
    last_name: guest.value.last_name || '',
    email: guest.value.email || '',
    phone: guest.value.phone || '',
    phone_country_code: guest.value.phone_country_code || '+57',
    nationality: guest.value.nationality || '',
    birth_date: guest.value.birth_date || '',
    document_type: guest.value.document_type || '',
    document_number: guest.value.document_number || '',
    gender: guest.value.gender || '',
    notes: guest.value.notes || ''
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  if (saving.value) return
  showEditModal.value = false
}

const saveGuest = async () => {
  if (!guest.value) return
  saving.value = true
  try {
    await guestsStore.updateGuest(guest.value.id, editForm.value)
    toast.success('Huésped actualizado correctamente.')
    showEditModal.value = false
  } catch (error) {
    toast.error(error.message || 'No se pudo guardar el huésped.')
  } finally {
    saving.value = false
  }
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

const formatCop = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
}).format(Number(value || 0))

const nationalityDisplay = (code) => {
  if (!code) return '-'
  const country = countries[code]
  if (!country) return code
  return `${getEmojiFlag(code)} ${country.name}`
}

const genderLabel = (gender) => {
  if (gender === 'male') return 'Masculino'
  if (gender === 'female') return 'Femenino'
  if (gender === 'unspecified') return 'Prefiero no indicar'
  return '-'
}

const formatDocument = (item) => {
  if (!item?.document_number) return '-'
  return [item.document_type, item.document_number].filter(Boolean).join(' · ')
}

const statusBadge = (status) => {
  const map = {
    confirmed: { label: 'Confirmada', type: 'info' },
    in_stay: { label: 'En estadía', type: 'success' },
    completed: { label: 'Finalizada', type: 'neutral' },
    cancelled: { label: 'Cancelada', type: 'danger' }
  }
  return map[status] || { label: status || 'Sin estado', type: 'neutral' }
}

const goToReservation = (id) => {
  if (!id) return
  router.push(`/reservas/${id}`)
}

const goBack = () => {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/huespedes')
}

onMounted(loadData)
</script>
