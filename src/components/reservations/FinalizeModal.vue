<template>
  <BaseModal :isOpen="isOpen" title="Finalizar reserva anticipadamente" size="md" :fullScreenOnMobile="true" @close="handleClose">
    <form class="space-y-5" @submit.prevent="submit">
      <AppFormSection title="Motivo de finalización" :divider="true">
        <AppSelect
          v-model="form.reason"
          label="Motivo"
          :options="reasonOptions"
          placeholder="Selecciona un motivo"
          :error="submitAttempted && !form.reason ? 'El motivo es obligatorio.' : ''"
        />

        <AppTextarea
          v-model="form.notes"
          :label="form.reason === 'other' ? 'Especificar razón' : 'Observación'"
          :hint="form.reason === 'other' ? '' : 'Opcional'"
          :rows="3"
          :autoResize="true"
          :error="notesError"
        />
      </AppFormSection>

      <AppFormSection title="Fecha y hora de salida anticipada" :divider="false">
        <AppFormGrid :columns="2">
          <AppDatePicker
            v-model="form.date"
            label="Fecha"
            :error="submitAttempted && !form.date ? 'La fecha es obligatoria.' : ''"
          />
          <AppInput
            v-model="form.time"
            type="time"
            label="Hora"
            :error="submitAttempted && !form.time ? 'La hora es obligatoria.' : ''"
          />
        </AppFormGrid>
      </AppFormSection>

      <AppInlineAlert v-if="errorMessage" type="error" :message="errorMessage" />

      <AppFormActions
        submit-label="Finalizar reserva"
        cancel-label="Cancelar"
        :loading="saving"
        :submit-disabled="saving || !isFormValid"
        :destructive="true"
        @submit="submit"
        @cancel="handleClose"
      />
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useToast } from '../../composables/useToast'
import { FINALIZATION_REASONS } from '../../utils/reservationUtils'
import BaseModal from '../ui/BaseModal.vue'
import {
  AppInput,
  AppSelect,
  AppTextarea,
  AppDatePicker,
  AppFormSection,
  AppFormGrid,
  AppFormActions,
  AppInlineAlert,
} from '@/components/ui/forms'

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  reservation: { type: Object, required: true },
})

const emit = defineEmits(['close', 'saved'])

const accountStore = useAccountStore()
const toast = useToast()

const reasonOptions = FINALIZATION_REASONS.map((r) => ({ value: r.value, label: r.label }))

const todayIso = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const form = reactive({ reason: '', notes: '', date: todayIso(), time: nowTime() })
const saving = ref(false)
const submitAttempted = ref(false)
const errorMessage = ref('')

const notesError = computed(() => {
  if (!submitAttempted.value) return ''
  if (form.reason === 'other' && !form.notes.trim()) return 'Debes especificar la razón.'
  return ''
})

const isFormValid = computed(() => {
  if (!form.reason || !form.date || !form.time) return false
  if (form.reason === 'other' && !form.notes.trim()) return false
  return true
})

watch(() => form.reason, () => {
  form.notes = ''
})

const resetForm = () => {
  form.reason = ''
  form.notes = ''
  form.date = todayIso()
  form.time = nowTime()
  saving.value = false
  submitAttempted.value = false
  errorMessage.value = ''
}

watch(() => props.isOpen, (val) => { if (val) resetForm() })

const handleClose = () => {
  if (saving.value) return
  emit('close')
}

const submit = async () => {
  submitAttempted.value = true
  if (!isFormValid.value) return

  saving.value = true
  errorMessage.value = ''

  try {
    const accountId = accountStore.getRequiredAccountId()
    const now = new Date().toISOString()
    const finalizedDate = `${form.date}T${form.time}:00`

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'finalized',
        finalization_reason: form.reason,
        finalization_notes: form.notes.trim() || null,
        finalized_at: now,
        finalized_date: finalizedDate,
      })
      .eq('account_id', accountId)
      .eq('id', props.reservation.id)

    if (updateError) throw updateError

    const { error: logError } = await supabase
      .from('reservation_status_logs')
      .insert({
        account_id: accountId,
        reservation_id: props.reservation.id,
        previous_status: props.reservation.status,
        new_status: 'finalized',
        notes: 'Finalización anticipada registrada',
      })

    if (logError) console.warn('Log error:', logError)

    toast.success('Reserva finalizada anticipadamente.')
    emit('saved')
    emit('close')
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo finalizar la reserva.'
  } finally {
    saving.value = false
  }
}
</script>
