<template>
  <BaseModal :isOpen="isOpen" title="Registrar pago" size="md" :fullScreenOnMobile="true" @close="closeModal">
    <form class="space-y-5" @submit.prevent="submitPayment">
      <AppFormSection title="Datos del pago" :divider="true">
        <AppFormGrid :columns="2">
          <AppInput
            v-model="form.amount"
            type="number"
            label="Monto"
            prefix="$"
            required
            :error="fieldError('amount')"
            @blur="touchField('amount')"
          />

          <AppSelect
            v-model="form.method"
            label="Método"
            :options="methodOptions"
            placeholder="Selecciona un método"
            :error="fieldError('method')"
            @blur="touchField('method')"
          />

          <AppInput
            v-model="form.reference"
            label="Referencia"
            placeholder="Opcional"
            hint="Número de transferencia u otro ID"
          />

          <AppDatePicker
            v-model="form.paymentDate"
            label="Fecha del pago"
            :error="fieldError('paymentDate')"
            @blur="touchField('paymentDate')"
          />
        </AppFormGrid>

        <AppTextarea
          v-model="form.notes"
          label="Notas"
          hint="Opcional"
          :rows="2"
          :autoResize="true"
        />
      </AppFormSection>

      <AppFormSection title="Resumen financiero" :divider="false">
        <AppFieldGroup :compact="true" :border="true">
          <div class="space-y-2 text-sm text-[#111827]">
            <p class="flex justify-between"><span>Total reserva:</span><span class="font-medium">{{ formatCop(totalAmount) }}</span></p>
            <p class="flex justify-between"><span>Ya pagado:</span><span class="font-medium">{{ formatCop(paidAmount) }}</span></p>
            <p class="flex justify-between"><span>Este pago:</span><span class="font-medium">{{ formatCop(liveAmount) }}</span></p>
          </div>
          <template #footer>
            <p class="flex justify-between text-sm font-semibold" :class="pendingAfterPayment > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'">
              <span>Quedará pendiente:</span>
              <span>{{ formatCop(pendingAfterPayment) }}</span>
            </p>
            <AppInlineAlert
              v-if="pendingAfterPayment === 0 && Number(form.amount || 0) > 0"
              type="success"
              message="Reserva quedaría saldada ✓"
            />
          </template>
        </AppFieldGroup>
      </AppFormSection>

      <AppFormActions
        submit-label="Registrar pago"
        cancel-label="Cancelar"
        :loading="saving"
        :submit-disabled="saving || !isFormValid"
        @submit="submitPayment"
        @cancel="closeModal"
      />
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useToast } from '../../composables/useToast'
import { notifyAnticipoRegistrado } from '../../services/notificationService'
import {
  AppInput,
  AppSelect,
  AppTextarea,
  AppDatePicker,
  AppFormSection,
  AppFormGrid,
  AppFieldGroup,
  AppInlineAlert,
  AppFormActions
} from '@/components/ui/forms'

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  reservationId: { type: String, required: true },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
})

const emit = defineEmits(['close', 'saved'])

const accountStore = useAccountStore()
const toast = useToast()

const todayIso = () => {
  const date = new Date()
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}

const form = reactive({
  amount: '',
  method: '',
  reference: '',
  paymentDate: todayIso(),
  notes: '',
})

const errors = reactive({
  amount: '',
  method: '',
  paymentDate: '',
})

const touched = reactive({
  amount: false,
  method: false,
  paymentDate: false,
})

const submitAttempted = computed(() => state.submitAttempted)

const state = reactive({ saving: false, submitAttempted: false })
const saving = computed(() => state.saving)

const methodOptions = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'plataforma', label: 'Plataforma' },
]

const resetForm = () => {
  form.amount = ''
  form.method = ''
  form.reference = ''
  form.paymentDate = todayIso()
  form.notes = ''

  errors.amount = ''
  errors.method = ''
  errors.paymentDate = ''

  touched.amount = false
  touched.method = false
  touched.paymentDate = false
  state.submitAttempted = false
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) resetForm()
  }
)

const formatCop = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(Number(value || 0))

const liveAmount = computed(() => {
  const value = Number(form.amount || 0)
  return value > 0 ? value : 0
})

const pendingAfterPayment = computed(() => {
  const pending = Number(props.totalAmount || 0) - Number(props.paidAmount || 0) - liveAmount.value
  return pending > 0 ? pending : 0
})

const validate = () => {
  errors.amount = ''
  errors.method = ''
  errors.paymentDate = ''

  const amount = Number(form.amount)
  if (!form.amount || Number.isNaN(amount) || amount <= 0) {
    errors.amount = 'El monto debe ser mayor a 0.'
  }

  if (!form.method) {
    errors.method = 'Selecciona un metodo de pago.'
  }

  if (!form.paymentDate) {
    errors.paymentDate = 'La fecha del pago es obligatoria.'
  }

  return !errors.amount && !errors.method && !errors.paymentDate
}

const touchField = (field) => {
  touched[field] = true
}

const fieldError = (field) => {
  if (!touched[field] && !submitAttempted.value) return ''
  return errors[field] || ''
}

const isFormValid = computed(() => {
  const amount = Number(form.amount)
  return amount > 0 && Boolean(form.method) && Boolean(form.paymentDate)
})

const recalculatePaidAmount = async (reservationId, accountId) => {
  const { data: paymentRows, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('account_id', accountId)
    .eq('reservation_id', reservationId)

  if (paymentsError) throw paymentsError

  const paidAmount = (paymentRows || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const { error: updateError } = await supabase
    .from('reservations')
    .update({ paid_amount: paidAmount })
    .eq('account_id', accountId)
    .eq('id', reservationId)

  if (updateError) throw updateError
  return paidAmount
}

const closeModal = () => {
  if (state.saving) return
  emit('close')
}

const submitPayment = async () => {
  state.submitAttempted = true
  if (!validate()) return

  state.saving = true

  try {
    const accountId = accountStore.getRequiredAccountId()

    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        account_id: accountId,
        reservation_id: props.reservationId,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || null,
        payment_date: form.paymentDate,
        notes: form.notes || null,
      })

    if (insertError) throw insertError

    const newPaidAmount = await recalculatePaidAmount(props.reservationId, accountId)

    try { await notifyAnticipoRegistrado(accountId, { amount: Number(form.amount) }, { id: props.reservationId }) } catch (e) { /* silencioso */ }

    emit('saved', { paidAmount: newPaidAmount })
    emit('close')
    toast.success('Pago registrado correctamente')
  } catch (error) {
    toast.error(error.message || 'No se pudo registrar el pago.')
  } finally {
    state.saving = false
  }
}
</script>
