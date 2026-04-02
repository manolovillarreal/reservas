<template>
  <BaseModal :isOpen="isOpen" title="Registrar llegada" size="md" :fullScreenOnMobile="true" @close="handleClose">
    <form class="space-y-5" @submit.prevent="submit">
      <AppFormSection title="Fecha y hora de llegada" :divider="true">
        <AppFormGrid :columns="2">
          <AppDatePicker
            v-model="form.date"
            label="Fecha"
            :error="form.date ? '' : (submitAttempted ? 'La fecha es obligatoria.' : '')"
          />
          <AppInput
            v-model="form.time"
            type="time"
            label="Hora"
            :error="form.time ? '' : (submitAttempted ? 'La hora es obligatoria.' : '')"
          />
        </AppFormGrid>
      </AppFormSection>

      <AppFormSection title="Notas" :divider="false">
        <AppTextarea
          v-model="form.notes"
          label="Observaciones"
          hint="Opcional"
          :rows="2"
          :autoResize="true"
        />
      </AppFormSection>

      <AppInlineAlert v-if="errorMessage" type="error" :message="errorMessage" />

      <AppFormActions
        submit-label="Registrar llegada"
        cancel-label="Cancelar"
        :loading="saving"
        :submit-disabled="saving || !isFormValid"
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
import BaseModal from '../ui/BaseModal.vue'
import {
  AppInput,
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

const todayIso = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const form = reactive({ date: todayIso(), time: nowTime(), notes: '' })
const saving = ref(false)
const submitAttempted = ref(false)
const errorMessage = ref('')

const isFormValid = computed(() => Boolean(form.date) && Boolean(form.time))

const resetForm = () => {
  form.date = todayIso()
  form.time = nowTime()
  form.notes = ''
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
    const checkinDate = `${form.date}T${form.time}:00`

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'in_stay',
        checkin_at: now,
        checkin_date: checkinDate,
        checkin_notes: form.notes.trim() || null,
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
        new_status: 'in_stay',
        notes: 'Check-in físico registrado',
      })

    if (logError) console.warn('Log error:', logError)

    toast.success('Llegada registrada correctamente.')
    emit('saved')
    emit('close')
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo registrar la llegada.'
  } finally {
    saving.value = false
  }
}
</script>
