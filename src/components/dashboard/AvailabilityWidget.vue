<template>
  <div class="card space-y-4">
    <h2 class="text-base font-semibold text-gray-900">Consulta de disponibilidad</h2>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="sm:col-span-2">
        <AppDateRangePicker
          v-model="dateRange"
          label-start="Check-in"
          label-end="Check-out"
          :min-date="todayIso"
          :error-start="touched.checkIn && !checkIn ? 'Requerido' : ''"
          :error-end="touched.checkOut ? checkOutError : ''"
          @update:modelValue="onDateChange"
          @blur="onDateBlur"
        />
      </div>
      <AppCounter
        v-model="personas"
        label="Personas"
        :min="1"
        :max="30"
      />
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="btn-primary"
        :disabled="loading"
        @click="verify"
      >
        {{ loading ? 'Verificando…' : 'Verificar disponibilidad' }}
      </button>
      <button
        v-if="checked"
        type="button"
        class="text-sm text-gray-500 underline"
        @click="handleReset"
      >
        Limpiar
      </button>
    </div>

    <!-- Error -->
    <AppInlineAlert v-if="error" type="error" :message="error" />

    <!-- Result: no availability -->
    <div v-if="checked && !loading && available.length === 0" class="space-y-3">
      <AppInlineAlert
        type="warning"
        :message="noAvailabilityMessage"
      >
        <template #actions>
          <button type="button" class="text-sm font-medium underline" @click="goToCalendar">
            Ver calendario
          </button>
        </template>
      </AppInlineAlert>

      <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Mensaje para WhatsApp</p>
        <button type="button" class="btn-primary mt-2 text-sm" @click="copyNegativeAvailabilityMessage">
          Copiar mensaje
        </button>
      </div>
    </div>

    <!-- Result: availability found -->
    <div v-if="checked && !loading && available.length > 0" class="space-y-3">
      <p class="text-sm font-medium text-emerald-700">
        {{ available.length }} {{ available.length === 1 ? 'unidad disponible' : 'unidades disponibles' }}
      </p>

      <div class="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
        <div
          v-for="unit in available"
          :key="unit.id"
          class="flex items-center justify-between px-3 py-2"
        >
          <label class="flex items-center gap-2">
            <input
              v-model="selectedUnitIds"
              type="checkbox"
              :value="unit.id"
              class="h-4 w-4 rounded border-gray-300"
            >
            <span class="text-sm font-medium text-gray-900">{{ unit.name }}</span>
            <span v-if="!singleVenue" class="ml-2 text-xs text-gray-500">{{ unit.venues?.name }}</span>
            <span class="ml-2 text-xs text-gray-400">· hasta {{ unit.capacity }} pers.</span>
          </label>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AppInput
          v-model="guestName"
          label="Nombre del huésped"
          placeholder="Nombre del huésped"
        />
        <AppInput
          v-model="pricePerNight"
          type="number"
          label="Precio por noche"
          placeholder="Precio por noche"
        />
      </div>

      <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Mensaje para WhatsApp</p>
        <button type="button" class="btn-primary mt-2 text-sm" @click="copyPositiveAvailabilityMessage">
          Copiar mensaje
        </button>
      </div>

      <div class="pt-1">
        <button type="button" class="btn-primary" @click="goToForm">
          + Nuevo Registro
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useToast } from '../../composables/useToast'
import { useAvailability } from '../../composables/useAvailability'
import {
  DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE,
  DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE,
  getPredefinedMessages,
} from '../../services/messageSettingsService'
import { buildGlobalVariables, resolveTemplate } from '../../utils/messageUtils'
import { formatCop, formatDateLongEs } from '../../utils/voucherUtils'
import { AppDateRangePicker, AppCounter, AppInlineAlert, AppInput } from '@/components/ui/forms'

const router = useRouter()
const accountStore = useAccountStore()
const toast = useToast()
const { loading, error, available, totalAvailableCapacity, insufficientCapacity, singleVenue, checked, checkAvailability, reset } = useAvailability()

const checkIn = ref('')
const checkOut = ref('')
const personas = ref(2)
const guestName = ref('')
const pricePerNight = ref('')
const selectedUnitIds = ref([])
const touched = ref({ checkIn: false, checkOut: false })
const profile = ref({})
const systemTemplates = ref({
  disponibilidad_negativa: DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE,
  disponibilidad_positiva: DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE,
})

const dateRange = computed({
  get: () => ({ start: checkIn.value || null, end: checkOut.value || null }),
  set: (value) => {
    checkIn.value = value?.start || ''
    checkOut.value = value?.end || ''
  }
})

const todayIso = new Date().toISOString().slice(0, 10)

const checkOutError = computed(() => {
  if (!checkOut.value) return 'Requerido'
  if (checkIn.value && checkOut.value <= checkIn.value) return 'Debe ser posterior al check-in'
  return ''
})

const noAvailabilityMessage = computed(() => {
  if (available.value.length > 0) return ''
  if (insufficientCapacity.value) {
    return `No hay capacidad suficiente para ${personas.value} persona(s) en ese rango. La suma de cupos disponibles es ${totalAvailableCapacity.value}.`
  }

  return 'No hay unidades disponibles para el rango y número de personas indicados.'
})

const nights = computed(() => {
  if (!checkIn.value || !checkOut.value) return 0
  const start = new Date(checkIn.value)
  const end = new Date(checkOut.value)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.ceil((end - start) / 86400000)
  return diff > 0 ? diff : 0
})

const selectedAvailableUnits = computed(() => {
  const selected = new Set(selectedUnitIds.value)
  return available.value.filter((unit) => selected.has(unit.id))
})

const templateVariablesBase = computed(() => {
  const global = buildGlobalVariables({
    profile: profile.value,
    context: {
      check_in: checkIn.value,
      check_out: checkOut.value,
      nights: nights.value,
      personas: personas.value,
    },
  })

  const parsedPrice = Number(pricePerNight.value)
  const hasPrice = !Number.isNaN(parsedPrice) && parsedPrice > 0
  const normalizedGuestName = String(guestName.value || '').trim()

  return {
    ...global,
    nombre_alojamiento: profile.value?.commercial_name || profile.value?.legal_name || global.nombre_alojamiento,
    telefono: profile.value?.phone || global.telefono,
    fecha_checkin_larga: formatDateLongEs(checkIn.value),
    fecha_checkout_larga: formatDateLongEs(checkOut.value),
    noches: nights.value,
    personas: Number(personas.value || 0),
    unidades: selectedAvailableUnits.value.map((unit) => ({ nombre_unidad: unit.name })),
    precio_noche: hasPrice ? formatCop(parsedPrice) : null,
    nombre_huesped: normalizedGuestName || null,
  }
})

const buildResolvedMessage = (templateKey) => {
  const template = String(systemTemplates.value?.[templateKey] || '').trim()
  return resolveTemplate(template, templateVariablesBase.value)
}

const onDateChange = () => {
  // Reset results when dates change so stale data isn't shown
  if (checked.value) reset()
  selectedUnitIds.value = []
}

const onDateBlur = () => {
  touched.value.checkIn = true
  touched.value.checkOut = true
}

const verify = async () => {
  touched.value = { checkIn: true, checkOut: true }
  if (!checkIn.value || checkOutError.value) return

  const accountId = accountStore.getRequiredAccountId()
  await checkAvailability({ accountId, checkIn: checkIn.value, checkOut: checkOut.value, personas: personas.value })
  selectedUnitIds.value = available.value.map((unit) => unit.id)
}

const handleReset = () => {
  reset()
  touched.value = { checkIn: false, checkOut: false }
  guestName.value = ''
  pricePerNight.value = ''
  selectedUnitIds.value = []
}

const goToCalendar = () => {
  router.push({ path: '/calendar', query: { from: checkIn.value, to: checkOut.value } })
}

const goToForm = () => {
  router.push({
    path: '/reservar',
    query: { check_in: checkIn.value, check_out: checkOut.value, personas: String(personas.value) }
  })
}

const copyNegativeAvailabilityMessage = async () => {
  const { text } = buildResolvedMessage('disponibilidad_negativa')
  await navigator.clipboard.writeText(text)
  toast.success('Mensaje copiado al portapapeles')
}

const copyPositiveAvailabilityMessage = async () => {
  const { text } = buildResolvedMessage('disponibilidad_positiva')
  await navigator.clipboard.writeText(text)
  toast.success('Mensaje copiado al portapapeles')
}

watch(available, (units) => {
  selectedUnitIds.value = units.map((unit) => unit.id)
})

onMounted(async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const [{ data: profileData }, messages] = await Promise.all([
      supabase.from('account_profile').select('commercial_name, legal_name, phone').eq('account_id', accountId).maybeSingle(),
      getPredefinedMessages(accountId),
    ])

    profile.value = profileData || {}

    const system = (messages || []).filter((msg) => msg.type === 'system')
    const negative = system.find((msg) => msg.key === 'disponibilidad_negativa')
    const positive = system.find((msg) => msg.key === 'disponibilidad_positiva')

    systemTemplates.value = {
      disponibilidad_negativa: String(negative?.body || DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE),
      disponibilidad_positiva: String(positive?.body || DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE),
    }
  } catch {
    systemTemplates.value = {
      disponibilidad_negativa: DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE,
      disponibilidad_positiva: DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE,
    }
  }
})
</script>
