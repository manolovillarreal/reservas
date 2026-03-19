<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Configuracion</h1>
    </div>

    <div v-if="can('settings', 'edit')" class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Documentos</h2>
          <p class="text-sm text-gray-500">Personaliza header, footer, colores y secciones de vouchers/cotizaciones.</p>
        </div>
        <RouterLink to="/configuracion/documentos" class="btn-primary text-sm">
          Abrir configuracion de documentos
        </RouterLink>
      </div>
    </div>

    <div v-if="can('settings', 'edit')" class="card">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Perfil</h2>
          <p class="text-sm text-gray-500">Configura la informacion comercial y de contacto de tu cuenta.</p>
        </div>
      </div>

      <form class="space-y-6" @submit.prevent="saveProfile">
        <section class="space-y-3">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Informacion comercial</h3>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label class="text-sm text-gray-700">
              Nombre comercial
              <input v-model="profileForm.commercial_name" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
            <label class="text-sm text-gray-700">
              Razon social
              <input v-model="profileForm.legal_name" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
            <label class="text-sm text-gray-700 md:col-span-1">
              NIT
              <input
                v-model="profileForm.nit"
                type="text"
                inputmode="numeric"
                class="mt-1 block w-full rounded-md border-gray-300 text-sm"
                placeholder="900123456"
                @input="onNitInput"
              >
            </label>
            <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <p><span class="font-medium text-gray-900">Digito de verificacion:</span> {{ nitDigitPreview ?? '-' }}</p>
              <p class="mt-1"><span class="font-medium text-gray-900">Vista previa:</span> {{ nitFormattedPreview || '-' }}</p>
            </div>
            <label class="text-sm text-gray-700 md:col-span-2">
              Slogan
              <input v-model="profileForm.slogan" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
          </div>
        </section>

        <section class="space-y-3">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Contacto</h3>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label class="text-sm text-gray-700">
              Telefono
              <input v-model="profileForm.phone" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
            <label class="text-sm text-gray-700">
              Email
              <input v-model="profileForm.email" type="email" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
            <label class="text-sm text-gray-700">
              Website
              <input v-model="profileForm.website" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm" placeholder="https://...">
            </label>
          </div>
        </section>

        <section class="space-y-3">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Ubicacion</h3>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label class="text-sm text-gray-700 md:col-span-2">
              Direccion
              <input v-model="profileForm.address" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
            <label class="text-sm text-gray-700">
              Ciudad
              <input v-model="profileForm.city" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
            <label class="text-sm text-gray-700">
              Departamento
              <input v-model="profileForm.department" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
            <label class="text-sm text-gray-700 md:col-span-2">
              Pais
              <input v-model="profileForm.country" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            </label>
          </div>
        </section>

        <section class="space-y-3">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Logo</h3>
          <div class="flex flex-wrap items-start gap-4 rounded-md border border-gray-200 bg-gray-50 p-3">
            <div class="h-24 w-24 overflow-hidden rounded-md border border-gray-200 bg-white">
              <img
                v-if="logoPreviewUrl"
                :src="logoPreviewUrl"
                alt="Logo cuenta"
                class="h-full w-full object-contain"
              >
              <div v-else class="flex h-full items-center justify-center text-xs text-gray-400">Sin logo</div>
            </div>
            <div class="space-y-2">
              <input
                ref="logoInputRef"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                class="hidden"
                @change="onLogoSelected"
              >
              <button type="button" class="btn-secondary text-sm" @click="openLogoPicker">Cambiar logo</button>
              <p class="text-xs text-gray-500">Maximo 2MB. Formatos: PNG, JPG, JPEG, SVG, WEBP.</p>
            </div>
          </div>
        </section>

        <section class="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <p><span class="font-semibold">Tu prefijo de referencia:</span> {{ profilePrefix }}</p>
          <p><span class="font-semibold">Ejemplo de codigo:</span> {{ sampleReferenceCode }}</p>
        </section>

        <div class="flex justify-end">
          <button class="btn-primary" type="submit" :disabled="savingProfile || loadingProfile">
            {{ savingProfile ? 'Guardando...' : loadingProfile ? 'Cargando...' : 'Guardar perfil' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="can('settings', 'edit')" class="card">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Canales y origen</h2>
          <p class="text-sm text-gray-500">Administra los tipos base del sistema y los canales disponibles por cuenta.</p>
        </div>
      </div>

      <div class="space-y-6">
        <section class="space-y-3">
          <div>
            <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Tipos de origen</h3>
            <p class="text-sm text-gray-500">El catálogo base no se crea ni elimina. Solo se activa o desactiva por cuenta.</p>
          </div>

          <div v-if="loadingSourceCatalog" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            Cargando catálogo de origen...
          </div>

          <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label
              v-for="type in sourceTypesCatalog"
              :key="type.id"
              class="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
            >
              <div>
                <p class="font-medium text-gray-900">{{ type.label_es }}</p>
                <p class="text-xs text-gray-500">{{ type.name }}</p>
              </div>
              <input
                :checked="type.is_active"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                :disabled="savingSourceTypeId === type.id"
                @change="toggleSourceType(type, $event.target.checked)"
              >
            </label>
          </div>
        </section>

        <section class="space-y-4">
          <div>
            <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Canales por tipo</h3>
            <p class="text-sm text-gray-500">Configura comisión y descuento sugerido por canal. Solo se puede eliminar un canal sin reservas o consultas asociadas.</p>
          </div>

          <div v-if="!loadingSourceCatalog" class="space-y-4">
            <div v-for="group in groupedSourceDetails" :key="group.type.id" class="rounded-lg border border-gray-200 bg-white">
              <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                <div>
                  <h4 class="font-medium text-gray-900">{{ group.type.label_es }}</h4>
                  <p class="text-xs text-gray-500">{{ group.type.is_active ? 'Activo' : 'Inactivo' }}</p>
                </div>
                <button type="button" class="btn-secondary text-sm" @click="openCreateSourceDetailModal(group.type)">+ Agregar canal</button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-left text-sm">
                  <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th class="px-4 py-3">Canal</th>
                      <th class="px-4 py-3">Comisión sugerida</th>
                      <th class="px-4 py-3">Descuento sugerido</th>
                      <th class="px-4 py-3">Activo</th>
                      <th class="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-if="group.details.length === 0">
                      <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500">No hay canales configurados para este tipo.</td>
                    </tr>
                    <tr v-for="detail in group.details" :key="detail.id">
                      <td class="px-4 py-3">
                        <p class="font-medium text-gray-900">{{ detail.label_es }}</p>
                        <p class="text-xs text-gray-500">{{ detail.name }}</p>
                      </td>
                      <td class="px-4 py-3 text-gray-700">{{ Number(detail.suggested_commission_percentage || 0) }}%</td>
                      <td class="px-4 py-3 text-gray-700">{{ Number(detail.suggested_discount_percentage || 0) }}%</td>
                      <td class="px-4 py-3">
                        <input
                          :checked="detail.is_active"
                          type="checkbox"
                          class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                          :disabled="savingSourceDetailId === detail.id"
                          @change="toggleSourceDetail(detail, $event.target.checked)"
                        >
                      </td>
                      <td class="px-4 py-3 text-right">
                        <div class="flex justify-end gap-3">
                          <button type="button" class="text-sm font-medium text-primary hover:text-primary-dark" @click="openEditSourceDetailModal(detail)">Editar</button>
                          <button
                            type="button"
                            class="text-sm font-medium text-red-600 hover:text-red-800"
                            :disabled="deletingSourceDetailId === detail.id"
                            @click="removeSourceDetail(detail)"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div class="card">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-900">Cuenta activa</h2>
      <div class="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <p><span class="font-medium text-gray-700">Cuenta:</span> {{ accountStore.currentAccountName || '-' }}</p>
        <p><span class="font-medium text-gray-700">Rol:</span> {{ accountStore.currentUserRole || '-' }}</p>
        <p><span class="font-medium text-gray-700">Account ID:</span> {{ accountStore.currentAccountId || '-' }}</p>
      </div>
    </div>

    <div v-if="can('users', 'invite')" class="card">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Usuarios</h2>
          <p class="text-sm text-gray-500">Gestiona roles y asociaciones de usuarios en esta cuenta.</p>
        </div>
      </div>

      <p class="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        La creacion de usuarios se realiza en Supabase. Aqui solo gestionas la asociacion y rol dentro de la cuenta.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">Usuario</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Rol</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="4" class="px-4 py-8 text-center text-gray-400">Cargando usuarios...</td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-gray-500">No hay usuarios asociados a esta cuenta.</td>
            </tr>
            <tr v-for="item in users" :key="item.id">
              <td class="px-4 py-3 text-gray-900">{{ item.user_id }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.user_email || '-' }}</td>
              <td class="px-4 py-3">
                <select
                  :disabled="!can('users', 'edit_role') || savingRoleId === item.id"
                  :value="item.role"
                  class="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  @change="updateRole(item, $event.target.value)"
                >
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="staff">staff</option>
                </select>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="can('users', 'remove')"
                  class="text-sm font-medium text-red-600 hover:text-red-800"
                  :disabled="removingId === item.id"
                  @click="removeUser(item)"
                >
                  Quitar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <div v-else class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
      <p class="mt-2 text-sm text-amber-800">No tienes permisos para gestionar usuarios.</p>
    </div>

    <BaseModal :isOpen="showSourceDetailModal" :title="sourceDetailModalTitle" @close="closeSourceDetailModal">
      <form class="space-y-4" @submit.prevent="submitSourceDetail">
        <div>
          <label class="block text-sm font-medium text-gray-700">Tipo</label>
          <select v-model="sourceDetailForm.source_type_id" class="mt-1 block w-full rounded-md border-gray-300 text-sm" :disabled="sourceDetailModalMode === 'edit'">
            <option value="">Seleccionar tipo</option>
            <option v-for="type in sourceTypesCatalog" :key="type.id" :value="type.id">{{ type.label_es }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Canal</label>
          <input v-model="sourceDetailForm.label_es" type="text" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">% Comisión sugerida</label>
            <input v-model="sourceDetailForm.suggested_commission_percentage" type="number" min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">% Descuento sugerido</label>
            <input v-model="sourceDetailForm.suggested_discount_percentage" type="number" min="0" step="0.01" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </div>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-gray-700">
          <input v-model="sourceDetailForm.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30">
          <span>Canal activo</span>
        </label>

        <div class="flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" @click="closeSourceDetailModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="savingSourceDetail">
            {{ savingSourceDetail ? 'Guardando...' : sourceDetailModalMode === 'create' ? 'Crear canal' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { supabase } from '../services/supabase'
import BaseModal from '../components/ui/BaseModal.vue'
import { useAccountStore } from '../stores/account'
import { useSourcesStore } from '../stores/sources'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import {
  createSourceDetail,
  deleteSourceDetail,
  getSourceDetails,
  getSourceTypes,
  setSourceDetailActive,
  setSourceTypeActive,
  updateSourceDetail,
} from '../services/sourceService'
import { calculateNitDigit, formatNit } from '../utils/nitUtils'
import { generateReferenceCode } from '../utils/referenceUtils'

const accountStore = useAccountStore()
const sourcesStore = useSourcesStore()
const { can } = usePermissions()
const toast = useToast()

const users = ref([])
const loading = ref(false)
const savingRoleId = ref('')
const removingId = ref('')
const loadingProfile = ref(false)
const savingProfile = ref(false)
const loadingSourceCatalog = ref(false)
const savingSourceTypeId = ref('')
const savingSourceDetailId = ref('')
const deletingSourceDetailId = ref('')
const showSourceDetailModal = ref(false)
const savingSourceDetail = ref(false)
const sourceDetailModalMode = ref('create')
const sourceTypesCatalog = ref([])
const sourceDetailsCatalog = ref([])
const logoInputRef = ref(null)
const selectedLogoFile = ref(null)
const selectedLogoPreviewUrl = ref('')

const profileForm = ref({
  commercial_name: '',
  legal_name: '',
  nit: '',
  nit_digit: null,
  address: '',
  city: '',
  department: '',
  country: 'Colombia',
  phone: '',
  email: '',
  website: '',
  slogan: '',
  logo_url: '',
  reference_prefix: '',
})

const sourceDetailForm = ref({
  id: '',
  source_type_id: '',
  label_es: '',
  suggested_commission_percentage: 0,
  suggested_discount_percentage: 0,
  is_active: true,
})

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])

const sampleReferenceCode = ref('')

const nitDigitPreview = computed(() => {
  if (!profileForm.value.nit) return null
  return calculateNitDigit(profileForm.value.nit)
})

const nitFormattedPreview = computed(() => {
  if (!profileForm.value.nit) return ''
  return formatNit(profileForm.value.nit, nitDigitPreview.value)
})

const logoPreviewUrl = computed(() => selectedLogoPreviewUrl.value || profileForm.value.logo_url || '')

const groupedSourceDetails = computed(() => {
  return sourceTypesCatalog.value.map((type) => ({
    type,
    details: sourceDetailsCatalog.value.filter((detail) => detail.source_type_id === type.id),
  }))
})

const sourceDetailModalTitle = computed(() => {
  return sourceDetailModalMode.value === 'create' ? 'Agregar canal' : 'Editar canal'
})

watch(
  () => profileForm.value.reference_prefix,
  () => {
    sampleReferenceCode.value = generateReferenceCode()
  },
  { immediate: true }
)

const setProfileForm = (data = {}) => {
  profileForm.value = {
    commercial_name: data.commercial_name || '',
    legal_name: data.legal_name || '',
    nit: String(data.nit || '').replace(/\D/g, ''),
    nit_digit: Number.isInteger(data.nit_digit) ? data.nit_digit : null,
    address: data.address || '',
    city: data.city || '',
    department: data.department || '',
    country: data.country || 'Colombia',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    slogan: data.slogan || '',
    logo_url: data.logo_url || '',
    reference_prefix: data.reference_prefix || '',
  }
}

const loadProfile = async () => {
  if (!can('settings', 'edit')) return

  loadingProfile.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('account_profile')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) throw error
    setProfileForm(data || {})
  } catch (err) {
    toast.error(err.message || 'No se pudo cargar el perfil de la cuenta.')
  } finally {
    loadingProfile.value = false
  }
}

const onNitInput = () => {
  profileForm.value.nit = String(profileForm.value.nit || '').replace(/\D/g, '')
}

const openLogoPicker = () => {
  logoInputRef.value?.click()
}

const revokeSelectedLogoPreview = () => {
  if (selectedLogoPreviewUrl.value) {
    URL.revokeObjectURL(selectedLogoPreviewUrl.value)
    selectedLogoPreviewUrl.value = ''
  }
}

const onLogoSelected = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    toast.error('Formato de logo no permitido. Usa PNG, JPG, JPEG, SVG o WEBP.')
    event.target.value = ''
    return
  }

  if (file.size > MAX_LOGO_BYTES) {
    toast.error('El logo supera 2MB. Selecciona un archivo mas liviano.')
    event.target.value = ''
    return
  }

  selectedLogoFile.value = file
  revokeSelectedLogoPreview()
  selectedLogoPreviewUrl.value = URL.createObjectURL(file)
}

const parseStoragePath = (url) => {
  if (!url) return ''
  const marker = '/object/public/account-assets/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return ''
  return decodeURIComponent(url.slice(markerIndex + marker.length))
}

const removePreviousLogo = async (accountId) => {
  const explicitPath = parseStoragePath(profileForm.value.logo_url)
  if (explicitPath) {
    await supabase.storage.from('account-assets').remove([explicitPath])
    return
  }

  const candidates = ['png', 'jpg', 'jpeg', 'svg', 'webp'].map((ext) => `accounts/${accountId}/logo.${ext}`)
  await supabase.storage.from('account-assets').remove(candidates)
}

const uploadLogoIfNeeded = async (accountId) => {
  if (!selectedLogoFile.value) return profileForm.value.logo_url || null

  const file = selectedLogoFile.value
  const extension = (file.name.split('.').pop() || 'png').toLowerCase()
  const storagePath = `accounts/${accountId}/logo.${extension}`

  await removePreviousLogo(accountId)

  const { error: uploadError } = await supabase.storage
    .from('account-assets')
    .upload(storagePath, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('account-assets').getPublicUrl(storagePath)
  return data?.publicUrl || null
}

const saveProfile = async () => {
  if (!can('settings', 'edit')) return

  savingProfile.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const nitValue = String(profileForm.value.nit || '').replace(/\D/g, '')
    const nitDigit = nitValue ? calculateNitDigit(nitValue) : null
    const logoUrl = await uploadLogoIfNeeded(accountId)

    const payload = {
      account_id: accountId,
      commercial_name: profileForm.value.commercial_name || null,
      legal_name: profileForm.value.legal_name || null,
      nit: nitValue || null,
      nit_digit: nitDigit,
      address: profileForm.value.address || null,
      city: profileForm.value.city || null,
      department: profileForm.value.department || null,
      country: profileForm.value.country || 'Colombia',
      phone: profileForm.value.phone || null,
      email: profileForm.value.email || null,
      website: profileForm.value.website || null,
      slogan: profileForm.value.slogan || null,
      logo_url: logoUrl,
      reference_prefix: profilePrefix.value,
    }

    const { error } = await supabase
      .from('account_profile')
      .upsert(payload, { onConflict: 'account_id' })

    if (error) throw error

    profileForm.value.logo_url = logoUrl || ''
    profileForm.value.nit_digit = nitDigit

    if (logoInputRef.value) logoInputRef.value.value = ''
    selectedLogoFile.value = null
    revokeSelectedLogoPreview()

    toast.success('Perfil actualizado correctamente.')
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar el perfil.')
  } finally {
    savingProfile.value = false
  }
}

const loadSourceCatalog = async () => {
  if (!can('settings', 'edit')) return

  loadingSourceCatalog.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const [types, details] = await Promise.all([
      getSourceTypes(accountId, { includeInactive: true }),
      getSourceDetails(accountId, null, { includeInactive: true }),
    ])

    sourceTypesCatalog.value = types
    sourceDetailsCatalog.value = details
  } catch (err) {
    toast.error(err.message || 'No se pudo cargar el catálogo de origen.')
  } finally {
    loadingSourceCatalog.value = false
  }
}

const syncActiveSourceStore = async () => {
  const accountId = accountStore.currentAccountId
  if (!accountId) return
  await sourcesStore.preload(accountId, { force: true })
}

const resetSourceDetailForm = () => {
  sourceDetailForm.value = {
    id: '',
    source_type_id: '',
    label_es: '',
    suggested_commission_percentage: 0,
    suggested_discount_percentage: 0,
    is_active: true,
  }
}

const openCreateSourceDetailModal = (type) => {
  sourceDetailModalMode.value = 'create'
  resetSourceDetailForm()
  sourceDetailForm.value.source_type_id = type?.id || ''
  showSourceDetailModal.value = true
}

const openEditSourceDetailModal = (detail) => {
  sourceDetailModalMode.value = 'edit'
  sourceDetailForm.value = {
    id: detail.id,
    source_type_id: detail.source_type_id,
    label_es: detail.label_es,
    suggested_commission_percentage: Number(detail.suggested_commission_percentage || 0),
    suggested_discount_percentage: Number(detail.suggested_discount_percentage || 0),
    is_active: Boolean(detail.is_active),
  }
  showSourceDetailModal.value = true
}

const closeSourceDetailModal = () => {
  if (savingSourceDetail.value) return
  showSourceDetailModal.value = false
}

const submitSourceDetail = async () => {
  savingSourceDetail.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    if (sourceDetailModalMode.value === 'create') {
      await createSourceDetail(accountId, sourceDetailForm.value)
      toast.success('Canal creado correctamente.')
    } else {
      await updateSourceDetail(accountId, sourceDetailForm.value.id, sourceDetailForm.value)
      toast.success('Canal actualizado correctamente.')
    }

    showSourceDetailModal.value = false
    await Promise.all([loadSourceCatalog(), syncActiveSourceStore()])
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar el canal.')
  } finally {
    savingSourceDetail.value = false
  }
}

const toggleSourceType = async (type, isActive) => {
  savingSourceTypeId.value = type.id
  try {
    await setSourceTypeActive(accountStore.getRequiredAccountId(), type.id, isActive)
    type.is_active = isActive
    toast.success(`Tipo ${isActive ? 'activado' : 'desactivado'} correctamente.`)
    await syncActiveSourceStore()
  } catch (err) {
    toast.error(err.message || 'No se pudo actualizar el tipo.')
  } finally {
    savingSourceTypeId.value = ''
  }
}

const toggleSourceDetail = async (detail, isActive) => {
  savingSourceDetailId.value = detail.id
  try {
    const updated = await setSourceDetailActive(accountStore.getRequiredAccountId(), detail.id, isActive)
    const index = sourceDetailsCatalog.value.findIndex((item) => item.id === detail.id)
    if (index !== -1) {
      sourceDetailsCatalog.value.splice(index, 1, updated)
    }
    toast.success(`Canal ${isActive ? 'activado' : 'desactivado'} correctamente.`)
    await syncActiveSourceStore()
  } catch (err) {
    toast.error(err.message || 'No se pudo actualizar el canal.')
  } finally {
    savingSourceDetailId.value = ''
  }
}

const removeSourceDetail = async (detail) => {
  deletingSourceDetailId.value = detail.id
  try {
    await deleteSourceDetail(accountStore.getRequiredAccountId(), detail.id)
    sourceDetailsCatalog.value = sourceDetailsCatalog.value.filter((item) => item.id !== detail.id)
    toast.success('Canal eliminado correctamente.')
    await syncActiveSourceStore()
  } catch (err) {
    toast.error(err.message || 'No se pudo eliminar el canal.')
  } finally {
    deletingSourceDetailId.value = ''
  }
}

const fetchUsers = async () => {
  if (!can('users', 'invite')) return

  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    const { data, error } = await supabase
      .from('account_users')
      .select('id, account_id, user_id, role')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })

    if (error) throw error

    users.value = (data || []).map(item => ({
      ...item,
      user_email: ''
    }))
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

const updateRole = async (item, role) => {
  if (!can('users', 'edit_role') || item.role === role) return

  savingRoleId.value = item.id
  try {
    const { error } = await supabase
      .from('account_users')
      .update({ role })
      .eq('id', item.id)

    if (error) throw error

    item.role = role
    toast.success('Rol actualizado correctamente.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingRoleId.value = ''
  }
}

const removeUser = async (item) => {
  if (!can('users', 'remove')) return

  removingId.value = item.id
  try {
    const { error } = await supabase
      .from('account_users')
      .delete()
      .eq('id', item.id)

    if (error) throw error

    users.value = users.value.filter(user => user.id !== item.id)
    toast.success('Usuario removido de la cuenta.')
  } catch (err) {
    toast.error(err.message)
  } finally {
    removingId.value = ''
  }
}

onBeforeUnmount(() => {
  revokeSelectedLogoPreview()
})

onMounted(async () => {
  await Promise.all([fetchUsers(), loadProfile(), loadSourceCatalog()])
})
</script>
