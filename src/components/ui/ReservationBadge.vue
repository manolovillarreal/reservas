<template>
  <span 
    class="px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap"
    :class="statusStyles"
  >
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { getStatusLabel } from '../../utils/reservationUtils'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

const config = {
  confirmed: {
    classes: 'bg-[#EEF2FF] text-[#2D1B69] border-[#C7D2FE]'
  },
  in_stay: {
    classes: 'bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7]'
  },
  completed: {
    classes: 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]'
  },
  cancelled: {
    classes: 'bg-[#F3F4F6] text-[#9CA3AF] border-[#E5E7EB]'
  }
}

const statusConfig = computed(() => {
  return config[props.status] || config.confirmed
})

const label = computed(() => getStatusLabel(props.status))
const statusStyles = computed(() => statusConfig.value.classes)
</script>
