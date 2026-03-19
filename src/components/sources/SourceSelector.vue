<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700">Tipo de origen</label>
      <select v-model="selectedTypeId" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
        <option value="">Seleccionar tipo</option>
        <option v-for="type in sourceTypes" :key="type.id" :value="type.id">{{ type.label_es }}</option>
      </select>
    </div>

    <div v-if="selectedTypeId" class="relative">
      <label class="block text-sm font-medium text-gray-700">Canal</label>
      <input
        v-model="searchText"
        type="text"
        class="mt-1 block w-full rounded-md border-gray-300 text-sm"
        placeholder="Selecciona o escribe un canal"
        autocomplete="off"
        @focus="isOpen = true"
        @blur="closeDropdown"
      >

      <div
        v-if="isOpen"
        class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
      >
        <button
          v-for="detail in filteredDetails"
          :key="detail.id"
          type="button"
          class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
          @mousedown.prevent="selectDetail(detail)"
        >
          <span class="font-medium text-gray-800">{{ detail.label_es }}</span>
          <span class="text-xs text-gray-500">
            {{ Number(detail.suggested_commission_percentage || 0) }}% com. · {{ Number(detail.suggested_discount_percentage || 0) }}% desc.
          </span>
        </button>

        <button
          v-if="canCreateOption"
          type="button"
          class="w-full px-3 py-2 text-left text-sm font-medium text-primary hover:bg-gray-50"
          @mousedown.prevent="createAndSelectDetail"
        >
          Crear "{{ searchText.trim() }}"
        </button>

        <p v-if="filteredDetails.length === 0 && !canCreateOption" class="px-3 py-2 text-sm text-gray-500">
          No hay canales activos para este tipo.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAccountStore } from '../../stores/account'
import { useSourcesStore } from '../../stores/sources'
import { normalizeSourceName } from '../../services/sourceService'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ sourceTypeId: '', sourceDetailId: '' }),
  },
  showSuggestions: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'suggestions'])

const accountStore = useAccountStore()
const sourcesStore = useSourcesStore()
const toast = useToast()

const isOpen = ref(false)
const searchText = ref('')
const isCreating = ref(false)

const sourceTypes = computed(() => sourcesStore.sourceTypes)

const selectedTypeId = computed({
  get: () => props.modelValue?.sourceTypeId || '',
  set: (value) => {
    searchText.value = ''
    emit('update:modelValue', {
      sourceTypeId: value || '',
      sourceDetailId: '',
    })
  },
})

const selectedDetail = computed(() => {
    const detailId = props.modelValue?.sourceDetailId || ''
    if (!detailId) return null
    return sourcesStore.sourceDetailsById[detailId] || null
})

const detailsForType = computed(() => {
  if (!selectedTypeId.value) return []
  return sourcesStore.getDetailsByTypeId(selectedTypeId.value)
})

const filteredDetails = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query) return detailsForType.value

  return detailsForType.value.filter((detail) => {
    return detail.label_es.toLowerCase().includes(query) || detail.name.toLowerCase().includes(query)
  })
})

const normalizedQuery = computed(() => normalizeSourceName(searchText.value))

const canCreateOption = computed(() => {
  const query = searchText.value.trim()
  if (!selectedTypeId.value || !query || isCreating.value) return false

  return !detailsForType.value.some((detail) => {
    return detail.name === normalizedQuery.value || detail.label_es.toLowerCase() === query.toLowerCase()
  })
})

const applySuggestions = (detail) => {
  if (!props.showSuggestions || !detail) return

  emit('suggestions', {
    commissionPercentage: Number(detail.suggested_commission_percentage || 0),
    discountPercentage: Number(detail.suggested_discount_percentage || 0),
    sourceDetailLabel: detail.label_es,
    sourceDetailName: detail.name,
  })
}

const syncInputWithSelection = () => {
  if (selectedDetail.value) {
    searchText.value = selectedDetail.value.label_es
    return
  }

  if (!props.modelValue?.sourceDetailId) {
    searchText.value = ''
  }
}

const selectDetail = (detail) => {
  emit('update:modelValue', {
    sourceTypeId: selectedTypeId.value,
    sourceDetailId: detail.id,
  })
  searchText.value = detail.label_es
  isOpen.value = false
  applySuggestions(detail)
}

const createAndSelectDetail = async () => {
  isCreating.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const detail = await sourcesStore.createDetail(accountId, {
      source_type_id: selectedTypeId.value,
      label_es: searchText.value.trim(),
      name: normalizedQuery.value,
    })

    selectDetail(detail)
    toast.success('Canal creado correctamente.')
  } catch (error) {
    toast.error(error.message || 'No se pudo crear el canal.')
  } finally {
    isCreating.value = false
  }
}

const closeDropdown = () => {
  window.setTimeout(() => {
    isOpen.value = false
    syncInputWithSelection()
  }, 120)
}

watch(
  () => props.modelValue,
  () => {
    syncInputWithSelection()
  },
  { deep: true, immediate: true }
)

watch(selectedTypeId, () => {
  syncInputWithSelection()
})

onMounted(async () => {
  const accountId = accountStore.currentAccountId
  if (accountId) {
    await sourcesStore.preload(accountId)
  }
  syncInputWithSelection()
})
</script>