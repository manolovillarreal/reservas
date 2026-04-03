<template>
  <div class="space-y-1">
    <label v-if="label" :for="inputId" class="block text-sm font-medium transition-colors" :class="labelClass">
      {{ label }}
      <span v-if="required" class="ml-0.5 text-[#EF4444]">*</span>
    </label>

    <div ref="containerRef" class="relative">
      <div class="relative">
        <input
          :id="inputId"
          v-model="searchQuery"
          type="text"
          :placeholder="selectedDisplay || placeholder"
          :disabled="disabled"
          :required="required"
          autocomplete="off"
          class="block min-h-[44px] w-full rounded-md border bg-[#FFFFFF] py-2 pl-9 pr-10 text-sm text-[#111827] placeholder:text-[#9CA3AF] transition outline-none"
          :class="inputClass"
          @focus="openDropdown"
          @blur="handleBlur"
          @input="onInput"
        >

        <!-- Flag / globe icon on the left -->
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base leading-none">
          <span>{{ selectedFlag || '🌐' }}</span>
        </div>

        <!-- Chevron on the right -->
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7280]">
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <!-- Dropdown list -->
      <div
        v-if="isOpen && filteredCountries.length > 0"
        class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-[#E5E7EB] bg-white shadow-lg"
      >
        <button
          v-for="country in filteredCountries"
          :key="country.code"
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111827] hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
          :class="{ 'bg-indigo-50 font-medium': country.code === modelValue }"
          @mousedown.prevent="selectCountry(country)"
        >
          <span class="text-base leading-none">{{ country.emoji }}</span>
          <span>{{ country.name }}</span>
        </button>
      </div>

      <div
        v-else-if="isOpen && searchQuery.length > 0 && filteredCountries.length === 0"
        class="absolute z-50 mt-1 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 shadow-lg"
      >
        <p class="text-sm text-[#6B7280]">No se encontraron países.</p>
      </div>
    </div>

    <AppFieldHint v-if="error || hint" :message="error || hint" :type="error ? 'error' : 'hint'" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppFieldHint from './AppFieldHint.vue'
import { PRIORITY_COUNTRY_CODES, allCountries } from '../../../utils/countryUtils'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Seleccionar país' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const inputId = `app-country-select-${Math.random().toString(36).slice(2, 10)}`
const containerRef = ref(null)
const searchQuery = ref('')
const isOpen = ref(false)
const isFocused = ref(false)

// Priority countries shown first (imported from countryUtils for centralized management)

const selectedCountry = computed(() =>
  props.modelValue ? allCountries.find((c) => c.code === props.modelValue) || null : null
)

const selectedDisplay = computed(() =>
  selectedCountry.value ? selectedCountry.value.name : ''
)

const selectedFlag = computed(() =>
  selectedCountry.value ? selectedCountry.value.emoji : ''
)

const filteredCountries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allCountries.slice(0, PRIORITY_COUNTRY_CODES.length)
  return allCountries
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 8)
})

const labelClass = computed(() => {
  if (props.error) return 'text-[#EF4444]'
  if (isFocused.value) return 'text-[#4C2FFF]'
  return 'text-[#6B7280]'
})

const inputClass = computed(() => {
  if (props.disabled) {
    return 'cursor-not-allowed border-[#E5E7EB] bg-[#F8F9FC] text-[#9CA3AF]'
  }
  if (props.error) {
    return 'border-[#EF4444] ring-[3px] ring-[rgba(239,68,68,0.20)]'
  }
  if (isFocused.value) {
    return 'border-[#4C2FFF] ring-[3px] ring-[rgba(76,47,255,0.20)]'
  }
  return 'border-[#E5E7EB]'
})

const openDropdown = () => {
  isFocused.value = true
  isOpen.value = true
  searchQuery.value = ''
}

const handleBlur = () => {
  isFocused.value = false
  // Use timeout to allow mousedown on options to fire first
  setTimeout(() => {
    isOpen.value = false
    searchQuery.value = ''
  }, 150)
}

const onInput = () => {
  isOpen.value = true
}

const selectCountry = (country) => {
  emit('update:modelValue', country.code)
  searchQuery.value = ''
  isOpen.value = false
  isFocused.value = false
}

// Close on outside click
const handleOutsideClick = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false
    searchQuery.value = ''
    isFocused.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>
