import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createSourceDetail, getSourceDetails, getSourceTypes } from '../services/sourceService'

export const useSourcesStore = defineStore('sources', () => {
  const sourceTypes = ref([])
  const sourceDetails = ref([])
  const initializedAccountId = ref('')
  const loading = ref(false)

  const sourceTypesById = computed(() => {
    return sourceTypes.value.reduce((accumulator, item) => {
      accumulator[item.id] = item
      return accumulator
    }, {})
  })

  const sourceDetailsById = computed(() => {
    return sourceDetails.value.reduce((accumulator, item) => {
      accumulator[item.id] = item
      return accumulator
    }, {})
  })

  const clear = () => {
    sourceTypes.value = []
    sourceDetails.value = []
    initializedAccountId.value = ''
    loading.value = false
  }

  const preload = async (accountId, options = {}) => {
    if (!accountId) {
      clear()
      return
    }

    const force = options.force === true
    if (!force && initializedAccountId.value === accountId && sourceTypes.value.length > 0) {
      return
    }

    loading.value = true
    try {
      const [types, details] = await Promise.all([
        getSourceTypes(accountId),
        getSourceDetails(accountId),
      ])

      sourceTypes.value = types
      sourceDetails.value = details
      initializedAccountId.value = accountId
    } finally {
      loading.value = false
    }
  }

  const getDetailsByTypeId = (sourceTypeId) => {
    return sourceDetails.value.filter((item) => item.source_type_id === sourceTypeId)
  }

  const upsertDetail = (detail) => {
    const existingIndex = sourceDetails.value.findIndex((item) => item.id === detail.id)
    if (existingIndex === -1) {
      sourceDetails.value = [...sourceDetails.value, detail].sort((left, right) => left.label_es.localeCompare(right.label_es, 'es'))
      return
    }

    const nextDetails = [...sourceDetails.value]
    nextDetails.splice(existingIndex, 1, detail)
    sourceDetails.value = nextDetails.sort((left, right) => left.label_es.localeCompare(right.label_es, 'es'))
  }

  const createDetail = async (accountId, payload) => {
    const detail = await createSourceDetail(accountId, payload)
    if (detail.is_active) {
      upsertDetail(detail)
    }
    return detail
  }

  return {
    sourceTypes,
    sourceDetails,
    sourceTypesById,
    sourceDetailsById,
    loading,
    clear,
    preload,
    getDetailsByTypeId,
    createDetail,
    upsertDetail,
  }
})