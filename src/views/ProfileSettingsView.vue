<template>
  <div v-if="can('settings', 'edit')" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Personalización</h1>
        <p class="text-sm text-gray-500">Configura la informacion comercial, contacto y condiciones de tu cuenta.</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="btn-secondary text-sm" @click="goBack">Volver a configuracion</button>
        <button
          type="submit"
          form="profile-settings-form"
          class="btn-primary text-sm"
          :disabled="savingProfile || loadingProfile"
        >
          {{ savingProfile ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>

    <div class="card">
      <form id="profile-settings-form" class="space-y-6" @submit.prevent="saveProfile">
          <AppFormSection title="Logo" description="Se usa en documentos y vistas compartidas." :collapsible="isMobile" :defaultOpen="!isMobile">
          <AppFieldGroup tone="info" compact>
            <div class="flex flex-wrap items-start gap-4">
              <div class="h-24 w-24 overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
                <img
                  v-if="logoPreviewUrl"
                  :src="logoPreviewUrl"
                  alt="Logo cuenta"
                  class="h-full w-full object-contain"
                >
                <div v-else class="flex h-full items-center justify-center text-xs text-[#9CA3AF]">Sin logo</div>
              </div>
              <div class="space-y-2">
                <input
                  ref="logoInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  class="hidden"
                  @change="onLogoSelected"
                >
                <button type="button" class="btn-secondary min-h-[44px] px-4 text-sm" @click="openLogoPicker">Cambiar logo</button>
                <AppFieldHint message="Maximo 2MB. Formatos permitidos: PNG, JPG, JPEG, SVG y WEBP." />
              </div>
            </div>
          </AppFieldGroup>
          <AppInlineAlert v-if="logoError" type="error" :message="logoError" />
        </AppFormSection>

        
        <AppFormSection title="Informacion comercial" :divider="false" :collapsible="isMobile" :defaultOpen="true">
          <AppFormGrid :columns="2">
            <AppInput v-model="profileForm.commercial_name" label="Nombre comercial" />
            <AppInput v-model="profileForm.legal_name" label="Razon social" />
            <AppInput
              v-model="profileForm.nit"
              label="NIT"
              placeholder="900123456"
              inputmode="numeric"
              :suffix="nitDigitPreview !== null ? `DV ${nitDigitPreview}` : ''"
              @input="onNitInput"
            />
            <AppFieldGroup title="Vista previa NIT" compact>
              <p class="text-sm text-[#374151]"><span class="font-medium text-[#111827]">Digito de verificacion:</span> {{ nitDigitPreview ?? '-' }}</p>
              <p class="text-sm text-[#374151]"><span class="font-medium text-[#111827]">Formato:</span> {{ nitFormattedPreview || '-' }}</p>
            </AppFieldGroup>
          </AppFormGrid>
          <AppInput v-model="profileForm.slogan" label="Slogan" />
        </AppFormSection>

        <AppFormSection title="Contacto" description="Canales principales de comunicacion." :collapsible="isMobile" :defaultOpen="true">
          <AppFormGrid :columns="3">
            <AppInput v-model="profileForm.phone" label="Telefono" />
            <AppInput v-model="profileForm.email" label="Email" type="email" />
            <AppInput v-model="profileForm.website" label="Website" placeholder="https://..." />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Ubicacion" description="Direccion comercial para documentos y comprobantes." :collapsible="isMobile" :defaultOpen="!isMobile">
          <AppFormGrid :columns="2">
            <AppInput v-model="profileForm.address" label="Direccion" class="md:col-span-2" />
            <AppInput v-model="profileForm.city" label="Ciudad" />
            <AppInput v-model="profileForm.department" label="Departamento" />
            <AppInput v-model="profileForm.country" label="Pais" class="md:col-span-2" />
          </AppFormGrid>
        </AppFormSection>

        <AppFormSection title="Informacion publica" description="Estos campos se usan en mensajes y contenido compartido." :collapsible="isMobile" :defaultOpen="!isMobile">
          <AppTextarea
            v-model="profileForm.short_description"
            label="Descripcion corta"
            :rows="3"
            :autoResize="true"
            placeholder="Nuestra casa está ubicada en el corazón de la isla, a pocos pasos de la playa..."
          />
          <div class="space-y-2">
            <AppTextarea
              v-model="profileForm.amenidades_generales"
              label="Amenidades generales"
              :rows="4"
              :autoResize="true"
              placeholder="WiFi, piscina, parqueadero..."
            />
            <AppFieldHint message="Se usa en cotizaciones sin unidades seleccionadas" />
          </div>
          <AppTextarea
            v-model="profileForm.common_amenities"
            label="Amenidades comunes"
            :rows="4"
            :autoResize="true"
            placeholder="Piscina · WiFi · Zona BBQ · Parqueadero · Acceso a playa"
          />
          <AppInput
            v-model="profileForm.location_url"
            label="Ubicacion (Google Maps)"
            placeholder="https://maps.app.goo.gl/xxxxx"
          />
        </AppFormSection>

      
        <div :class="isMobile ? 'sticky bottom-0 z-20 -mx-4 border-t border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_-6px_18px_rgba(15,23,42,0.06)]' : ''">
          <AppFormActions
            submit-label="Guardar"
            cancel-label="Restablecer"
            :loading="savingProfile || loadingProfile"
            :submit-disabled="savingProfile || loadingProfile"
            @submit="saveProfile"
            @cancel="loadProfile"
          />
        </div>
      </form>
    </div>
  </div>

  <div v-else class="card border-amber-200 bg-amber-50/40">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
    <p class="mt-2 text-sm text-amber-800">No tienes permisos para editar la personalización.</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { calculateNitDigit, formatNit } from '../utils/nitUtils'
import {
  AppInput,
  AppTextarea,
  AppFieldHint,
  AppFieldGroup,
  AppFormSection,
  AppFormGrid,
  AppFormActions,
  AppInlineAlert,
} from '@/components/ui/forms'

const accountStore = useAccountStore()
const router = useRouter()
const { can } = usePermissions()
const { isMobile } = useBreakpoint()
const toast = useToast()

const loadingProfile = ref(false)
const savingProfile = ref(false)
const logoInputRef = ref(null)
const selectedLogoFile = ref(null)
const selectedLogoPreviewUrl = ref('')
const logoError = ref('')
const voucherConditions = ref('')

const goBack = () => {
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/configuracion')
}

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
  short_description: '',
  common_amenities: '',
  amenidades_generales: '',
  descripcion_detallada: '',
  politica_reserva: '',
  location_url: '',
})

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])

const nitDigitPreview = computed(() => {
  if (!profileForm.value.nit) return null
  return calculateNitDigit(profileForm.value.nit)
})

const nitFormattedPreview = computed(() => {
  if (!profileForm.value.nit) return ''
  return formatNit(profileForm.value.nit, nitDigitPreview.value)
})

const logoPreviewUrl = computed(() => selectedLogoPreviewUrl.value || profileForm.value.logo_url || '')

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
    short_description: data.short_description || '',
    common_amenities: data.common_amenities || '',
    amenidades_generales: data.amenidades_generales || '',
    descripcion_detallada: data.descripcion_detallada || '',
    politica_reserva: data.politica_reserva || '',
    location_url: data.location_url || '',
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

const loadVoucherConditions = async () => {
  if (!can('settings', 'edit')) return

  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('settings')
      .select('voucher_conditions')
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) throw error
    voucherConditions.value = String(data?.voucher_conditions || '')
  } catch (err) {
    toast.error(err.message || 'No se pudieron cargar las condiciones del alojamiento.')
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
  logoError.value = ''

  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    logoError.value = 'Formato de logo no permitido. Usa PNG, JPG, JPEG, SVG o WEBP.'
    event.target.value = ''
    return
  }

  if (file.size > MAX_LOGO_BYTES) {
    logoError.value = 'El logo supera 2MB. Selecciona un archivo mas liviano.'
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
      reference_prefix: profileForm.value.reference_prefix,
      short_description: profileForm.value.short_description || null,
      common_amenities: profileForm.value.common_amenities || null,
      amenidades_generales: profileForm.value.amenidades_generales || null,
      descripcion_detallada: profileForm.value.descripcion_detallada || null,
      politica_reserva: profileForm.value.politica_reserva || null,
      location_url: profileForm.value.location_url || null,
    }

    const { error } = await supabase
      .from('account_profile')
      .upsert(payload, { onConflict: 'account_id' })

    if (error) throw error

    const settingsPayload = {
      account_id: accountId,
      voucher_conditions: String(voucherConditions.value || '').trim(),
    }

    const { error: settingsError } = await supabase
      .from('settings')
      .upsert(settingsPayload, { onConflict: 'account_id' })

    if (settingsError) throw settingsError

    profileForm.value.logo_url = logoUrl || ''
    profileForm.value.nit_digit = nitDigit

    if (logoInputRef.value) logoInputRef.value.value = ''
    selectedLogoFile.value = null
    revokeSelectedLogoPreview()
    logoError.value = ''

    toast.success('Personalización actualizada correctamente.')
  } catch (err) {
    toast.error(err.message || 'No se pudo guardar el perfil.')
  } finally {
    savingProfile.value = false
  }
}

onBeforeUnmount(() => {
  revokeSelectedLogoPreview()
})

onMounted(async () => {
  await Promise.all([loadProfile(), loadVoucherConditions()])
})
</script>
