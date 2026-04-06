<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Canales de origen</h1>
        <p class="text-sm text-gray-500">Activa canales y define comisiones. Los canales activos aparecen en el selector al registrar reservas y consultas.</p>
      </div>
      <RouterLink to="/configuracion" class="btn-secondary text-sm">Volver a configuración</RouterLink>
    </div>

    <div v-if="loading" class="card">
      <p class="text-sm text-gray-500">Cargando canales...</p>
    </div>

    <AppInlineAlert v-if="loadError" type="error" :message="loadError" class="mb-4" />

    <template v-else-if="!loading">
      <div v-for="group in groups" :key="group.type?.name" class="card space-y-4">
        <div>
          <h2 class="text-base font-semibold text-gray-900">{{ group.type?.label_es }}</h2>
          <p class="text-sm text-gray-500">{{ typeDescriptions[group.type?.name] }}</p>
        </div>

        <div class="space-y-2">
          <div
            v-for="detail in group.details"
            :key="detail.id"
            class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">
                {{ detail.label_es }}
                <span v-if="detail.is_other" class="ml-1.5 text-xs font-normal text-gray-400">(comodín)</span>
                <span v-if="!detail.is_system" class="ml-1.5 text-xs font-normal text-primary">personalizado</span>
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-4">
              <div class="flex items-center gap-1.5">
                <label :for="`commission-${detail.id}`" class="text-xs text-gray-500">Comisión %</label>
                <input
                  :id="`commission-${detail.id}`"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  class="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  :value="detail.commission_pct"
                  :disabled="savingId === detail.id"
                  @change="onCommissionChange(group, detail, $event.target.value)"
                >
              </div>

              <AppToggle
                :model-value="detail.is_active"
                :loading="savingId === detail.id"
                @update:model-value="onToggle(group, detail, $event)"
              />

              <button
                v-if="!detail.is_system"
                type="button"
                class="text-gray-400 hover:text-red-500 disabled:opacity-40"
                :disabled="deletingId === detail.id"
                title="Eliminar canal"
                @click="confirmDelete(group, detail)"
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
                </svg>
              </button>
              <div v-else class="w-4" />
            </div>
          </div>
        </div>

        <!-- Agregar canal personalizado (solo en Referidos) -->
        <div v-if="group.type?.name === 'referral'" class="border-t border-gray-100 pt-4">
          <button
            v-if="!showNewReferralForm"
            type="button"
            class="text-sm font-medium text-primary hover:underline"
            @click="showNewReferralForm = true"
          >
            + Agregar referido personalizado
          </button>

          <form v-else class="flex flex-wrap items-end gap-3" @submit.prevent="addReferral(group)">
            <div class="flex-1">
              <label class="mb-1 block text-xs font-medium text-gray-700">Nombre del referido</label>
              <input
                v-model="newReferral.name"
                type="text"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Ej: Agencia XYZ"
                :disabled="addingReferral"
                required
              >
            </div>
            <div class="w-28">
              <label class="mb-1 block text-xs font-medium text-gray-700">Comisión %</label>
              <input
                v-model="newReferral.commission_pct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="0"
                :disabled="addingReferral"
              >
            </div>
            <div class="flex gap-2">
              <button type="submit" class="btn-primary text-sm" :disabled="addingReferral">
                {{ addingReferral ? 'Guardando...' : 'Agregar' }}
              </button>
              <button
                type="button"
                class="btn-secondary text-sm"
                :disabled="addingReferral"
                @click="cancelNewReferral"
              >
                Cancelar
              </button>
            </div>
          </form>

          <AppInlineAlert v-if="addReferralError" type="error" :message="addReferralError" class="mt-2" />
        </div>
      </div>
    </template>

    <AppInlineAlert v-if="deleteError" type="error" :message="deleteError" class="fixed bottom-6 right-6 z-50 max-w-sm shadow-lg" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { AppToggle, AppInlineAlert } from '../components/ui/forms/index.js'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { getSystemSourceDetails, saveSourceSettings, createCustomSource, deleteSourceDetail } from '../services/sourceService'

const accountStore = useAccountStore()
const toast = useToast()

const loading = ref(true)
const loadError = ref('')
const groups = ref([])
const savingId = ref(null)
const deletingId = ref(null)
const deleteError = ref('')
const showNewReferralForm = ref(false)
const newReferral = ref({ name: '', commission_pct: '' })
const addingReferral = ref(false)
const addReferralError = ref('')
const debounceTimers = new Map()

const typeDescriptions = {
  direct: 'Reservas recibidas directamente sin intermediarios.',
  ota: 'Plataformas de reserva en línea como Airbnb o Booking.com.',
  social: 'Redes sociales como Instagram o Facebook.',
  referral: 'Agencias, colaboradores u otras referencias.',
}

const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const accountId = accountStore.getRequiredAccountId()
    groups.value = await getSystemSourceDetails(accountId)
  } catch (e) {
    loadError.value = e.message || 'No se pudo cargar los canales.'
  } finally {
    loading.value = false
  }
}

const onToggle = async (group, detail, value) => {
  const prev = detail.is_active
  detail.is_active = value
  savingId.value = detail.id
  try {
    const accountId = accountStore.getRequiredAccountId()
    await saveSourceSettings(accountId, detail.id, { is_active: value, commission_pct: detail.commission_pct })
  } catch (e) {
    detail.is_active = prev
    toast.error(e.message || 'No se pudo guardar.')
  } finally {
    savingId.value = null
  }
}

const onCommissionChange = (group, detail, rawValue) => {
  const value = parseFloat(rawValue) || 0
  detail.commission_pct = value

  if (debounceTimers.has(detail.id)) {
    clearTimeout(debounceTimers.get(detail.id))
  }

  debounceTimers.set(
    detail.id,
    setTimeout(async () => {
      savingId.value = detail.id
      try {
        const accountId = accountStore.getRequiredAccountId()
        await saveSourceSettings(accountId, detail.id, { is_active: detail.is_active, commission_pct: value })
      } catch (e) {
        toast.error(e.message || 'No se pudo guardar la comisión.')
      } finally {
        savingId.value = null
        debounceTimers.delete(detail.id)
      }
    }, 500)
  )
}

const confirmDelete = async (group, detail) => {
  if (!confirm(`¿Eliminar el canal "${detail.label_es}"? Esta acción no se puede deshacer.`)) return

  deleteError.value = ''
  deletingId.value = detail.id
  try {
    const accountId = accountStore.getRequiredAccountId()
    await deleteSourceDetail(accountId, detail.id)
    group.details = group.details.filter((d) => d.id !== detail.id)
    toast.success('Canal eliminado.')
  } catch (e) {
    deleteError.value = e.message || 'No se pudo eliminar el canal.'
    setTimeout(() => { deleteError.value = '' }, 5000)
  } finally {
    deletingId.value = null
  }
}

const cancelNewReferral = () => {
  showNewReferralForm.value = false
  newReferral.value = { name: '', commission_pct: '' }
  addReferralError.value = ''
}

const addReferral = async (group) => {
  addReferralError.value = ''
  addingReferral.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const created = await createCustomSource(
      accountId,
      group.type.id,
      newReferral.value.name,
      parseFloat(newReferral.value.commission_pct) || 0
    )
    group.details.push(created)
    cancelNewReferral()
    toast.success('Canal agregado correctamente.')
  } catch (e) {
    addReferralError.value = e.message || 'No se pudo agregar el canal.'
  } finally {
    addingReferral.value = false
  }
}

onMounted(load)
</script>
