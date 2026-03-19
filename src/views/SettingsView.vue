<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Configuracion</h1>
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
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { calculateNitDigit, formatNit } from '../utils/nitUtils'
import { generateAccountPrefix, generateReferenceCode } from '../utils/referenceUtils'

const accountStore = useAccountStore()
const { can } = usePermissions()
const toast = useToast()

const users = ref([])
const loading = ref(false)
const savingRoleId = ref('')
const removingId = ref('')
const loadingProfile = ref(false)
const savingProfile = ref(false)
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

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])

const profilePrefix = computed(() => {
  if (profileForm.value.reference_prefix) return profileForm.value.reference_prefix
  return generateAccountPrefix(accountStore.currentAccountId || '')
})

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

watch(
  profilePrefix,
  (prefix) => {
    sampleReferenceCode.value = generateReferenceCode(prefix)
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
    reference_prefix: data.reference_prefix || generateAccountPrefix(accountStore.currentAccountId || ''),
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
  await Promise.all([fetchUsers(), loadProfile()])
})
</script>
