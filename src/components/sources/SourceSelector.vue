<template>
  <div class="space-y-3">
    <!-- Loading -->
    <div v-if="loading" class="text-sm text-gray-500">Cargando canales...</div>

    <template v-else>
      <!-- Type tabs -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="group in groups"
          :key="group.type?.name"
          type="button"
          class="rounded-full border px-3 py-1 text-sm font-medium transition"
          :class="selectedTypeName === group.type?.name
            ? 'border-primary bg-primary text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'"
          @click="selectType(group)"
        >
          {{ group.type?.label_es }}
        </button>
      </div>

      <!-- Channel grid -->
      <div v-if="selectedGroup" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          v-for="detail in activeDetails"
          :key="detail.id"
          type="button"
          class="rounded-lg border px-3 py-2.5 text-left text-sm transition"
          :class="props.modelValue?.sourceDetailId === detail.id
            ? 'border-primary bg-primary/5 font-medium text-primary'
            : 'border-gray-200 bg-white text-gray-700 hover:border-primary/60 hover:bg-primary/5'"
          @click="pickDetail(detail)"
        >
          {{ detail.label_es }}
        </button>
      </div>

      <!-- "¿Cuál?" input for is_other channels -->
      <div v-if="showOtherInput" class="space-y-2">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">¿Cuál?</label>
          <input
            v-model="otherName"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            placeholder="Escribe el canal específico"
            @input="emitWithOtherName"
          >
        </div>

        <!-- Commission % field -->
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">% Comisión</label>
          <input
            v-model.number="otherCommission"
            type="number"
            min="0"
            max="100"
            step="0.5"
            class="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            placeholder="0"
            @input="emitWithOtherName"
          >
        </div>

        <!-- Save as new channel -->
        <div class="flex items-center gap-2">
          <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input v-model="saveAsNew" type="checkbox" class="h-4 w-4 accent-primary rounded" />
            Guardar como nuevo canal
          </label>
        </div>

        <div v-if="saveAsNew" class="flex items-center gap-2">
          <button
            type="button"
            :disabled="!otherName.trim() || savingNew"
            class="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 disabled:opacity-40"
            @click="saveNewChannel"
          >
            {{ savingNew ? 'Guardando…' : 'Guardar canal' }}
          </button>
          <span v-if="saveNewError" class="text-xs text-red-600">{{ saveNewError }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAccountStore } from '../../stores/account'
import { getSystemSourceDetails, createSourceDetail } from '../../services/sourceService'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ sourceTypeId: '', sourceDetailId: '', sourceName: '' }),
  },
  showSuggestions: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'suggestions'])

const accountStore = useAccountStore()
const loading = ref(true)
const groups = ref([])
const selectedTypeName = ref('')
const otherName = ref('')
const otherCommission = ref(0)
const saveAsNew = ref(false)
const savingNew = ref(false)
const saveNewError = ref('')

const selectedGroup = computed(() => groups.value.find((g) => g.type?.name === selectedTypeName.value) || null)

const activeDetails = computed(() => {
  if (!selectedGroup.value) return []
  const details = selectedGroup.value.details.filter((d) => d.is_active)
  return [...details].sort((a, b) => {
    if (a.is_other === b.is_other) return 0
    return a.is_other ? 1 : -1
  })
})

const selectedDetail = computed(() => {
  const id = props.modelValue?.sourceDetailId
  if (!id) return null
  for (const g of groups.value) {
    const found = g.details.find((d) => d.id === id)
    if (found) return found
  }
  return null
})

const showOtherInput = computed(() => {
  return selectedDetail.value?.is_other === true && !!props.modelValue?.sourceDetailId
})

const load = async () => {
  loading.value = true
  try {
    const accountId = accountStore.currentAccountId
    if (accountId) {
      groups.value = await getSystemSourceDetails(accountId)
    }
  } catch {
    // silencioso — el selector sigue funcional sin datos
  } finally {
    loading.value = false
  }
}

const syncTypeFromDetail = () => {
  const detailId = props.modelValue?.sourceDetailId
  if (!detailId) {
    if (props.modelValue?.sourceTypeId) {
      const group = groups.value.find((g) => g.type?.id === props.modelValue.sourceTypeId)
      if (group) selectedTypeName.value = group.type?.name || ''
    }
    return
  }
  for (const g of groups.value) {
    if (g.details.some((d) => d.id === detailId)) {
      selectedTypeName.value = g.type?.name || ''
      break
    }
  }
}

const selectType = (group) => {
  selectedTypeName.value = group.type?.name || ''
  otherName.value = ''
  otherCommission.value = 0
  saveAsNew.value = false
  saveNewError.value = ''
  emit('update:modelValue', {
    sourceTypeId: group.type?.id || '',
    sourceDetailId: '',
    sourceName: '',
  })
}

const pickDetail = (detail) => {
  otherName.value = detail.is_other ? (props.modelValue?.sourceName || '') : ''
  if (!detail.is_other) {
    otherCommission.value = 0
    saveAsNew.value = false
    saveNewError.value = ''
  }
  emit('update:modelValue', {
    sourceTypeId: selectedGroup.value?.type?.id || '',
    sourceDetailId: detail.id,
    sourceName: detail.is_other ? otherName.value : '',
  })

  if (props.showSuggestions) {
    emit('suggestions', {
      commissionPercentage: Number(detail.commission_pct ?? detail.suggested_commission_percentage ?? 0),
      discountPercentage: Number(detail.suggested_discount_percentage ?? 0),
      sourceDetailLabel: detail.label_es,
      sourceDetailName: detail.name,
    })
  }
}

const emitWithOtherName = () => {
  emit('update:modelValue', {
    sourceTypeId: selectedGroup.value?.type?.id || '',
    sourceDetailId: props.modelValue?.sourceDetailId || '',
    sourceName: otherName.value,
  })
}

const saveNewChannel = async () => {
  if (!otherName.value.trim()) return
  const accountId = accountStore.currentAccountId
  if (!accountId) return
  savingNew.value = true
  saveNewError.value = ''
  try {
    const created = await createSourceDetail(accountId, {
      source_type_id: selectedGroup.value?.type?.id || '',
      label_es: otherName.value.trim(),
      suggested_commission_percentage: Number(otherCommission.value || 0),
    })
    // Add the new detail to the local group so the grid shows it
    const group = groups.value.find((g) => g.type?.id === selectedGroup.value?.type?.id)
    if (group) {
      group.details.push(created)
    }
    // Select the new channel
    emit('update:modelValue', {
      sourceTypeId: selectedGroup.value?.type?.id || '',
      sourceDetailId: created.id,
      sourceName: '',
    })
    if (props.showSuggestions) {
      emit('suggestions', {
        commissionPercentage: Number(created.suggested_commission_percentage ?? 0),
        discountPercentage: Number(created.suggested_discount_percentage ?? 0),
        sourceDetailLabel: created.label_es,
        sourceDetailName: created.name,
      })
    }
    saveAsNew.value = false
    otherName.value = ''
    otherCommission.value = 0
  } catch (err) {
    saveNewError.value = err.message || 'Error al guardar el canal.'
  } finally {
    savingNew.value = false
  }
}

watch(
  () => props.modelValue?.sourceName,
  (val) => {
    if (selectedDetail.value?.is_other && val !== otherName.value) {
      otherName.value = val || ''
    }
  },
  { immediate: true }
)

watch(groups, () => {
  syncTypeFromDetail()
})

watch(
  () => props.modelValue?.sourceDetailId,
  () => {
    syncTypeFromDetail()
  }
)

onMounted(async () => {
  await load()
  syncTypeFromDetail()
  otherName.value = props.modelValue?.sourceName || ''
})
</script>