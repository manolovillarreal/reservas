<template>
  <div class="space-y-6">
    <AppFieldGroup :border="true" :compact="false" title="Pre-registro de huéspedes">
      <p class="text-sm text-gray-600">{{ reservation?.accommodationName || reservation?.venue_name || 'Alojamiento' }}</p>
      <p class="text-sm text-gray-500">{{ formatDate(reservation?.check_in) }} -> {{ formatDate(reservation?.check_out) }}</p>
      <p class="text-xs uppercase tracking-wide text-gray-500">Personas declaradas: {{ normalizedGuestsCount }}</p>
    </AppFieldGroup>

    <AppInlineAlert
      v-if="normalizedGuestsCount > 1"
      type="info"
      :message="`Faltan ${missingCompanions} acompañantes por registrar`"
    />

    <form class="space-y-6" @submit.prevent="submitForm">
      <AppInlineAlert
        v-if="submitAttempted && validationMessage"
        type="warning"
        :message="validationMessage"
      />

      <AppFormSection title="Huésped principal" :divider="true" :collapsible="true" :defaultOpen="true">
        <AppInput v-model="primaryGuest.first_name" label="Nombres" required />
        <AppInput v-model="primaryGuest.last_name" label="Apellidos" />

        <AppFormGrid :columns="2">
          <div v-if="isPublic && initialPrimaryGuest?.phone" class="space-y-1">
            <label class="block text-sm font-medium text-[#6B7280]">Teléfono</label>
            <div class="block min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-[#F8F9FC] px-3 py-2.5 text-sm text-[#111827]">
              {{ [initialPrimaryGuest.phone_country_code, initialPrimaryGuest.phone].filter(Boolean).join(' ') }}
            </div>
            <p class="text-xs text-gray-400">Si necesitas actualizar tu número de contacto, comunícate con el alojamiento.</p>
          </div>
          <AppPhoneInput
            v-else
            :countryCode="primaryGuest.phone_country_code"
            :phoneNumber="primaryGuest.phone"
            label="Teléfono"
            required
            @update:countryCode="primaryGuest.phone_country_code = $event"
            @update:phoneNumber="primaryGuest.phone = $event"
          />
          <AppInput v-model="primaryGuest.email" type="email" label="Email" required />
        </AppFormGrid>

        <AppFormGrid :columns="3">
          <AppCountrySelect v-model="primaryGuest.nationality" label="Nacionalidad" required />
          <AppSelect
            v-model="primaryGuest.document_type"
            label="Tipo de documento"
            :options="DOCUMENT_TYPES_ADULT"
            placeholder="Sin definir"
            required
          />
          <AppInput v-model="primaryGuest.document_number" label="Número de documento" inputmode="numeric" required />
        </AppFormGrid>

        <AppFormGrid :columns="2">
          <AppSelect
            v-model="primaryGuest.gender"
            label="Género"
            :options="[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' }, { value: 'unspecified', label: 'Prefiero no indicar' }]"
            placeholder="Sin definir"
            hint="Opcional"
          />
          <AppInput v-model="primaryGuest.birth_date" type="date" label="Fecha de nacimiento" required />
        </AppFormGrid>
      </AppFormSection>

      <AppFieldGroup :border="true" :compact="true" title="Acompañantes" subtitle="Opcional">
        <template #footer>
          <button type="button" class="btn-secondary min-h-[44px] w-full text-sm sm:w-auto" @click="addCompanion">+ Agregar acompañante</button>
        </template>

        <div v-if="additionalGuests.length === 0" class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500">
          No hay acompañantes cargados todavía.
        </div>

        <AppFormSection
          v-for="(guest, index) in additionalGuests"
          :key="`companion-${index}`"
          :title="`Acompañante ${index + 1}`"
          :divider="index !== additionalGuests.length - 1"
          :collapsible="true"
          :defaultOpen="index === additionalGuests.length - 1"
        >
          <template #actions>
            <button type="button" class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-800" @click="removeCompanion(index)">× Eliminar</button>
          </template>

          <AppInput v-model="guest.first_name" label="Nombres" required />
          <AppInput v-model="guest.last_name" label="Apellidos" />

          <AppPhoneInput
            :countryCode="guest.phone_country_code"
            :phoneNumber="guest.phone"
            label="Teléfono"
            hint="Opcional"
            @update:countryCode="guest.phone_country_code = $event"
            @update:phoneNumber="guest.phone = $event"
          />

          <AppFormGrid :columns="3">
            <AppCountrySelect v-model="guest.nationality" label="Nacionalidad" required />
            <AppSelect
              v-model="guest.document_type"
              label="Tipo de documento"
              :options="DOCUMENT_TYPES_ALL"
              placeholder="Sin definir"
              required
            />
            <AppInput v-model="guest.document_number" label="Número de documento" inputmode="numeric" required />
          </AppFormGrid>

          <AppFormGrid :columns="2">
            <AppSelect
              v-model="guest.gender"
              label="Género"
              :options="[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' }, { value: 'unspecified', label: 'Prefiero no indicar' }]"
              placeholder="Sin definir"
              required
            />
            <AppInput v-model="guest.birth_date" type="date" label="Fecha de nacimiento" required />
          </AppFormGrid>
        </AppFormSection>
      </AppFieldGroup>

      <div class="pb-20 sm:pb-0">
        <AppFormActions
          submit-label="Guardar"
          cancel-label="Cancelar"
          :loading="submitting"
          :submit-disabled="false"
          @submit="submitForm"
          @cancel="emit('cancel')"
        />
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  AppInput,
  AppSelect,
  AppPhoneInput,
  AppFieldGroup,
  AppFormSection,
  AppInlineAlert,
  AppFormGrid,
  AppFormActions,
  AppCountrySelect
} from '@/components/ui/forms'
import { DOCUMENT_TYPES_ADULT, DOCUMENT_TYPES_ALL } from '../../utils/documentTypes'

const props = defineProps({
  reservation: { type: Object, default: () => ({}) },
  guestsCount: { type: Number, default: 1 },
  isPublic: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  initialPrimaryGuest: { type: Object, default: () => ({}) },
  initialAdditionalGuests: { type: Array, default: () => [] },
})

const emit = defineEmits(['submitted', 'cancel'])

const buildGuest = () => ({
  first_name: '',
  last_name: '',
  nationality: '',
  document_type: '',
  document_number: '',
  phone: '',
  phone_country_code: '+57',
  email: '',
  birth_date: '',
  gender: '',
})

const primaryGuest = reactive(buildGuest())
const additionalGuests = reactive([])
const submitAttempted = ref(false)

const normalizedGuestsCount = computed(() => {
  const count = Number(props.guestsCount || 1)
  return count > 0 ? count : 1
})

const expectedAdditionalCount = computed(() => {
  const count = normalizedGuestsCount.value - 1
  return count > 0 ? count : 0
})

const missingCompanions = computed(() => {
  const missing = expectedAdditionalCount.value - additionalGuests.length
  return missing > 0 ? missing : 0
})

const collectMissingFields = () => {
  const missing = []

  if (!String(primaryGuest.first_name || '').trim()) missing.push('nombres del huésped principal')
  if (!String(primaryGuest.document_type || '').trim()) missing.push('tipo de documento del huésped principal')
  if (!String(primaryGuest.document_number || '').trim()) missing.push('número de documento del huésped principal')
  if (!String(primaryGuest.email || '').trim()) missing.push('email del huésped principal')
  if (!String(primaryGuest.nationality || '').trim()) missing.push('nacionalidad del huésped principal')
  if (!String(primaryGuest.birth_date || '').trim()) missing.push('fecha de nacimiento del huésped principal')
  if (!String(primaryGuest.phone || props.initialPrimaryGuest?.phone || '').trim()) missing.push('teléfono del huésped principal')

  additionalGuests.forEach((g, index) => {
    const fields = []
    if (!String(g.first_name || '').trim()) fields.push('nombres')
    if (!String(g.document_type || '').trim()) fields.push('tipo de documento')
    if (!String(g.document_number || '').trim()) fields.push('número de documento')
    if (!String(g.nationality || '').trim()) fields.push('nacionalidad')
    if (!String(g.birth_date || '').trim()) fields.push('fecha de nacimiento')
    if (!String(g.gender || '').trim()) fields.push('género')
    if (fields.length) missing.push(`acompañante ${index + 1}: ${fields.join(', ')}`)
  })

  return missing
}

const validationMessage = computed(() => {
  const missing = collectMissingFields()
  return missing.length > 0
    ? `Falta información obligatoria por diligenciar antes de guardar: ${missing.join(' · ')}`
    : ''
})

const resetGuests = () => {
  Object.assign(primaryGuest, buildGuest(), props.initialPrimaryGuest || {})

  additionalGuests.splice(0, additionalGuests.length)
  const seedGuests = Array.isArray(props.initialAdditionalGuests) ? props.initialAdditionalGuests : []
  seedGuests.forEach((guest) => additionalGuests.push({ ...buildGuest(), ...guest }))
}

watch(
  () => [props.initialPrimaryGuest, props.initialAdditionalGuests, props.reservation],
  () => {
    resetGuests()
  },
  { immediate: true, deep: true }
)

const addCompanion = () => {
  additionalGuests.push(buildGuest())
}

const removeCompanion = (index) => {
  if (index < 0 || index >= additionalGuests.length) return
  additionalGuests.splice(index, 1)
}

const trimGuest = (g) => ({
  ...g,
  first_name: g.first_name?.trim(),
  last_name: g.last_name?.trim(),
  phone: g.phone?.replace(/\s+/g, '').trim(),
  email: g.email?.trim(),
  document_number: g.document_number?.trim(),
})

const submitForm = () => {
  submitAttempted.value = true

  if (collectMissingFields().length > 0) {
    return
  }

  emit('submitted', {
    primary_guest: trimGuest({ ...primaryGuest }),
    additional_guests: additionalGuests.map((guest) => trimGuest({ ...guest })),
  })
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
</script>
