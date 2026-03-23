<template>
  <BaseModal :isOpen="isOpen" title="Cambiar estado de la reserva" :fullScreenOnMobile="true" @close="handleClose">
    <form class="space-y-5" @submit.prevent="submitChange">
      <div class="space-y-1">
        <p class="text-sm text-[#6B7280]">
          {{ guestName || 'Sin huésped' }} · estado actual:
          <span class="ml-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold" :class="statusBadgeClass(currentStatus)">
            {{ getStatusLabel(currentStatus) }}
          </span>
        </p>
      </div>

      <AppFormSection title="Nuevo estado" :divider="true">
        <AppSelect
          v-model="form.newStatus"
          label="Seleccionar estado"
          :options="statusOptions"
          placeholder="Selecciona un estado"
          :error="fieldError('newStatus')"
          @update:modelValue="touchField('newStatus')"
        />

        <div v-if="form.newStatus" class="text-sm text-[#6B7280]">
          Se aplicará:
          <span class="ml-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold" :class="statusBadgeClass(form.newStatus)">
            {{ getStatusLabel(form.newStatus) }}
          </span>
        </div>

        <AppInlineAlert
          v-if="form.newStatus === 'cancelled'"
          type="warning"
          message="Esta acción no puede deshacerse."
        />

        <AppInlineAlert
          v-if="form.newStatus === 'confirmed' && !hasGuest"
          type="error"
          message="Debes vincular un huésped antes de confirmar la reserva."
        />

        <AppTextarea
          v-if="form.newStatus === 'cancelled'"
          v-model="form.cancellationReason"
          label="Motivo de cancelación"
          :rows="2"
          :autoResize="true"
          :error="fieldError('cancellationReason')"
          @blur="touchField('cancellationReason')"
        />
      </AppFormSection>

      <AppInlineAlert v-if="errorMessage" type="error" :message="errorMessage" />

      <AppFormActions
        submit-label="Confirmar cambio"
        cancel-label="Cancelar"
        :loading="saving"
        :submit-disabled="submitDisabled"
        :destructive="form.newStatus === 'cancelled'"
        @submit="submitChange"
        @cancel="handleClose"
      />
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useToast } from '../../composables/useToast'
import { getAvailableTransitions, getStatusLabel } from '../../utils/reservationUtils'
import { notifyReservaCancelada } from '../../services/notificationService'
import BaseModal from '../ui/BaseModal.vue'
import {
  AppSelect,
  AppTextarea,
  AppFormSection,
  AppFormActions,
  AppInlineAlert
} from '@/components/ui/forms'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  reservationId: { type: String, required: true },
  currentStatus: { type: String, default: '' },
  guestName: { type: String, default: '' },
  hasGuest: { type: Boolean, default: false },
  initialStatus: { type: String, default: '' }
})

const emit = defineEmits(['close', 'updated'])

const accountStore = useAccountStore()
const toast = useToast()

const saving = ref(false)
const errorMessage = ref('')
const submitAttempted = ref(false)
const touched = ref({})
const form = ref({
  newStatus: '',
  cancellationReason: ''
})

const statusOptions = computed(() => {
  return getAvailableTransitions(props.currentStatus).map((status) => ({
    value: status,
    label: getStatusLabel(status)
  }))
})

const submitDisabled = computed(() => {
  if (!form.value.newStatus) return true
  if (form.value.newStatus === 'confirmed' && !props.hasGuest) return true
  if (form.value.newStatus === 'cancelled' && !String(form.value.cancellationReason || '').trim()) return true
  return false
})

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    form.value.newStatus = props.initialStatus || ''
    form.value.cancellationReason = ''
    errorMessage.value = ''
    submitAttempted.value = false
    touched.value = {}
  }
)

const touchField = (field) => {
  touched.value[field] = true
}

const fieldError = (field) => {
  if (!touched.value[field] && !submitAttempted.value) return ''

  if (field === 'newStatus' && !form.value.newStatus) {
    return 'Debes seleccionar un estado.'
  }

  if (field === 'cancellationReason' && form.value.newStatus === 'cancelled' && !String(form.value.cancellationReason || '').trim()) {
    return 'El motivo de cancelación es obligatorio.'
  }

  return ''
}

const statusBadgeClass = (status) => {
  if (status === 'confirmed') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'in_stay') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'completed') return 'border-gray-200 bg-gray-100 text-gray-700'
  if (status === 'cancelled') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-gray-200 bg-white text-gray-700'
}

const handleClose = () => {
  if (saving.value) return
  emit('close')
}

const submitChange = async () => {
  submitAttempted.value = true
  errorMessage.value = ''

  if (fieldError('newStatus')) return
  if (fieldError('cancellationReason')) return
  if (submitDisabled.value) return

  saving.value = true

  try {
    const accountId = accountStore.getRequiredAccountId()

    const payload = {
      status: form.value.newStatus
    }

    if (form.value.newStatus === 'cancelled') {
      payload.cancelled_at = new Date().toISOString()
      payload.cancellation_reason = form.value.cancellationReason.trim()
    }

    const { error: reservationError } = await supabase
      .from('reservations')
      .update(payload)
      .eq('account_id', accountId)
      .eq('id', props.reservationId)

    if (reservationError) throw reservationError

    const { error: logError } = await supabase
      .from('reservation_status_logs')
      .insert({
        account_id: accountId,
        reservation_id: props.reservationId,
        previous_status: props.currentStatus,
        new_status: form.value.newStatus,
        notes: form.value.newStatus === 'cancelled'
          ? `Cancelación: ${form.value.cancellationReason.trim()}`
          : 'Cambio de estado manual desde modal'
      })

    if (logError) throw logError

    if (form.value.newStatus === 'cancelled') {
      try { await notifyReservaCancelada(accountId, { id: props.reservationId, guest_name: props.guestName }) } catch (e) { /* silencioso */ }
    }
    toast.success(`Estado actualizado → ${getStatusLabel(form.value.newStatus)}`)
    emit('updated', form.value.newStatus)
    emit('close')
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo actualizar el estado.'
  } finally {
    saving.value = false
  }
}
</script>
