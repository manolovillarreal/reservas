<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm font-medium transition-colors" :class="labelClass">
      {{ label }}
      <span v-if="required" class="ml-0.5 text-[#EF4444]">*</span>
    </label>

    <div
      ref="containerRef"
      class="flex min-h-[44px] w-full overflow-hidden rounded-md border transition"
      :class="wrapperClass"
    >
      <!-- ── Selector de indicativo ── -->
      <div class="relative flex-shrink-0">
        <button
          type="button"
          :disabled="disabled"
          class="flex h-full min-h-[44px] items-center gap-1.5 border-r px-3 text-sm transition"
          :class="disabled ? 'cursor-not-allowed bg-[#F8F9FC] text-[#9CA3AF] border-[#E5E7EB]' : 'bg-white hover:bg-gray-50 border-[#E5E7EB] text-[#111827]'"
          @click="toggleDropdown"
        >
          <span class="text-base leading-none">{{ selectedDialCountry?.emoji || '🌐' }}</span>
          <span class="font-medium">{{ countryCode || '+57' }}</span>
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5 text-[#6B7280]" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Dropdown -->
        <div
          v-if="isOpen"
          class="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-md border border-[#E5E7EB] bg-white shadow-lg"
        >
          <!-- Buscador -->
          <div class="border-b border-[#E5E7EB] px-3 py-2">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Buscar país o código (+57)…"
              autocomplete="off"
              class="block w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#4C2FFF] focus:ring-2 focus:ring-[rgba(76,47,255,0.20)]"
            >
          </div>

          <!-- Lista -->
          <div class="max-h-56 overflow-y-auto">
            <button
              v-for="country in filteredDialCountries"
              :key="country.code"
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111827] hover:bg-gray-50"
              :class="{ 'bg-indigo-50 font-medium': country.dialCode === countryCode }"
              @mousedown.prevent="selectDialCountry(country)"
            >
              <span class="w-6 text-center text-base leading-none">{{ country.emoji }}</span>
              <span class="font-medium tabular-nums text-[#374151]">{{ country.dialCode }}</span>
              <span class="min-w-0 truncate text-[#6B7280]">{{ country.name }}</span>
            </button>

            <p v-if="filteredDialCountries.length === 0" class="px-3 py-2 text-sm text-[#6B7280]">
              No se encontraron países.
            </p>
          </div>
        </div>
      </div>

      <!-- ── Input del número local ── -->
      <input
        v-model="localPhoneNumber"
        type="tel"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        autocomplete="off"
        inputmode="tel"
        class="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
        :class="disabled ? 'cursor-not-allowed' : ''"
        @input="emit('update:phoneNumber', localPhoneNumber)"
        @focus="isFocused = true"
        @blur="isFocused = false"
      >
    </div>

    <AppFieldHint v-if="error || hint" :message="error || hint" :type="error ? 'error' : 'hint'" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppFieldHint from './AppFieldHint.vue'
import { PRIORITY_COUNTRY_CODES, dialCountries } from '../../../utils/countryUtils'

const props = defineProps({
  countryCode: { type: String, default: '+57' },
  phoneNumber: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Número de teléfono' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['update:countryCode', 'update:phoneNumber'])

const containerRef = ref(null)
const searchInputRef = ref(null)
const searchQuery = ref('')
const isOpen = ref(false)
const isFocused = ref(false)
const localPhoneNumber = ref(props.phoneNumber)

watch(() => props.phoneNumber, (val) => {
  if (val !== localPhoneNumber.value) localPhoneNumber.value = val
})

const selectedDialCountry = computed(() =>
  dialCountries.find((c) => c.dialCode === props.countryCode) || null
)

const filteredDialCountries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) {
    return dialCountries.filter((c) => PRIORITY_COUNTRY_CODES.includes(c.code))
  }
  return dialCountries
    .filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    )
    .slice(0, 10)
})

const toggleDropdown = () => {
  if (props.disabled) return
  if (isOpen.value) {
    closeDropdown()
  } else {
    isOpen.value = true
    searchQuery.value = ''
    nextTick(() => searchInputRef.value?.focus())
  }
}

const closeDropdown = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const selectDialCountry = (country) => {
  emit('update:countryCode', country.dialCode)
  closeDropdown()
}

const handleOutsideClick = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    closeDropdown()
    isFocused.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))

const wrapperClass = computed(() => {
  if (props.disabled) return 'border-[#E5E7EB] bg-[#F8F9FC]'
  if (props.error) return 'border-[#EF4444] ring-[3px] ring-[rgba(239,68,68,0.20)]'
  if (isFocused.value || isOpen.value) return 'border-[#4C2FFF] ring-[3px] ring-[rgba(76,47,255,0.20)]'
  return 'border-[#E5E7EB] bg-[#FFFFFF]'
})

const labelClass = computed(() => {
  if (props.error) return 'text-[#EF4444]'
  if (isFocused.value || isOpen.value) return 'text-[#4C2FFF]'
  return 'text-[#6B7280]'
})
</script>
