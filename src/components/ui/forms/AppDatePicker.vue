<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm font-medium transition-colors" :class="labelClass">
      {{ label }}
    </label>

    <div class="relative">
      <input
        :value="inputValue"
        type="date"
        :min="effectiveMin"
        :max="max || null"
        :placeholder="placeholder"
        :disabled="disabled"
        class="block min-h-[44px] w-full rounded-md border bg-[#FFFFFF] px-3 pr-5 py-2 text-sm text-[#111827] transition outline-none"
        :class="inputClass"
        @input="onInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
      >

     
    </div>

    <AppFieldHint :message="error || hint || ''" :type="error ? 'error' : 'hint'" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import AppFieldHint from './AppFieldHint.vue'
import { useOperationalSettings } from '../../../composables/useOperationalSettings'

const props = defineProps({
  modelValue: { type: String, default: null },
  label: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const { operationalSettings, loadOperationalSettings } = useOperationalSettings()
const todayIso = new Date().toISOString().slice(0, 10)

const isFocused = ref(false)

const effectiveMin = computed(() => {
  const allowPast = operationalSettings.value.allow_past_dates_in_pickers
  if (allowPast) return null
  if (!props.min) return todayIso
  return props.min > todayIso ? props.min : todayIso
})

const inputValue = computed(() => props.modelValue || '')

const labelClass = computed(() => {
  if (props.error) return 'text-[#EF4444]'
  if (isFocused.value) return 'text-[#4C2FFF]'
  return 'text-[#6B7280]'
})

const inputClass = computed(() => {
  if (props.disabled) return 'cursor-not-allowed border-[#E5E7EB] bg-[#F8F9FC] text-[#9CA3AF]'
  if (props.error) return 'border-[#EF4444] ring-[3px] ring-[rgba(239,68,68,0.20)]'
  return 'border-[#E5E7EB] focus:border-[#4C2FFF] focus:ring-[3px] focus:ring-[rgba(76,47,255,0.20)]'
})

const onInput = (event) => {
  const value = event.target.value
  emit('update:modelValue', value === '' ? null : value)
}

onMounted(loadOperationalSettings)
</script>

