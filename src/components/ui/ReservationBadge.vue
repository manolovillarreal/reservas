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
    classes: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  in_stay: {
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  completed: {
    classes: 'bg-gray-50 text-gray-500 border-gray-200'
  },
  cancelled: {
    classes: 'bg-gray-100 text-gray-400 border-gray-200'
  }
}

const statusConfig = computed(() => {
  return config[props.status] || config.confirmed
})

const label = computed(() => getStatusLabel(props.status))
const statusStyles = computed(() => statusConfig.value.classes)
</script>
