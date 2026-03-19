<template>
  <BaseModal :isOpen="isOpen" title="Registrar pago" size="md" @close="closeModal">
    <form class="space-y-4" @submit.prevent="submitPayment">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="text-sm text-gray-700">
          Monto
          <input
            v-model="form.amount"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 block w-full rounded-md border-gray-300 text-sm"
            placeholder="0"
          >
          <span v-if="errors.amount" class="mt-1 block text-xs text-red-600">{{ errors.amount }}</span>
        </label>

        <label class="text-sm text-gray-700">
          Metodo
          <select v-model="form.method" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            <option value="">Selecciona un metodo</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="nequi">Nequi</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="plataforma">Plataforma</option>
          </select>
          <span v-if="errors.method" class="mt-1 block text-xs text-red-600">{{ errors.method }}</span>
        </label>

        <label class="text-sm text-gray-700">
          Referencia
          <input
            v-model="form.reference"
            type="text"
            class="mt-1 block w-full rounded-md border-gray-300 text-sm"
            placeholder="Opcional"
          >
        </label>

        <label class="text-sm text-gray-700">
          Fecha del pago
          <input v-model="form.paymentDate" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          <span v-if="errors.paymentDate" class="mt-1 block text-xs text-red-600">{{ errors.paymentDate }}</span>
        </label>

        <label class="text-sm text-gray-700 md:col-span-2">
          Notas
          <textarea
            v-model="form.notes"
            rows="2"
            class="mt-1 block w-full rounded-md border-gray-300 text-sm"
            placeholder="Opcional"
          ></textarea>
        </label>
      </div>

      <div class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
        <p class="flex justify-between"><span>Total reserva:</span><span class="font-medium">{{ formatCop(totalAmount) }}</span></p>
        <p class="mt-1 flex justify-between"><span>Ya pagado:</span><span class="font-medium">{{ formatCop(paidAmount) }}</span></p>
        <p class="mt-1 flex justify-between"><span>Este pago:</span><span class="font-medium">{{ formatCop(liveAmount) }}</span></p>
        <p class="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold" :class="pendingAfterPayment > 0 ? 'text-red-600' : 'text-emerald-700'">
          <span>Quedara pendiente:</span>
          <span>{{ formatCop(pendingAfterPayment) }}</span>
        </p>
        <p v-if="pendingAfterPayment === 0" class="mt-2 text-xs font-medium text-emerald-700">Reserva quedaria saldada ✓</p>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 pt-4">
        <button type="button" class="btn-secondary" :disabled="saving" @click="closeModal">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="saving || !isFormValid || hasErrors">
          {{ saving ? 'Guardando...' : 'Guardar pago' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { supabase } from '../../services/supabase'
import { useAccountStore } from '../../stores/account'
import { useToast } from '../../composables/useToast'

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

const state = reactive({ saving: false })
const saving = computed(() => state.saving)

const resetForm = () => {
  form.amount = ''
  form.method = ''
  form.reference = ''
  form.paymentDate = todayIso()
  form.notes = ''

  errors.amount = ''
  errors.method = ''
  errors.paymentDate = ''
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

const hasErrors = computed(() => {
  return Boolean(errors.amount || errors.method || errors.paymentDate)
})

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
