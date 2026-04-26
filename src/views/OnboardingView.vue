<template>
  <div class="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
    <div class="w-full max-w-md">

      <div class="text-center mb-8">
        <img src="/icons/apple-touch-icon.png" alt="TekMi Inn" class="mx-auto mb-4 h-14 w-14 rounded-2xl shadow-sm" />
        <h1 class="text-2xl font-semibold text-[#111827]">Configura tu alojamiento</h1>
        <p class="mt-2 text-sm text-[#6B7280]">
          Completa estos datos para empezar a usar TekMi Inn.
        </p>
      </div>

      <div class="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <form class="space-y-5" @submit.prevent="handleSubmit">

          <AppInput
            v-model="form.accountName"
            label="Nombre del alojamiento"
            placeholder="p. ej. Hotel Marmanu, Casa Sol…"
            required
            :error="errors.accountName"
          />

          <AppInput
            v-model="form.fullName"
            label="Nombre completo"
            placeholder="Tu nombre completo"
            required
            :error="errors.fullName"
          />

          <AppPhoneInput
            :countryCode="form.phoneCountry"
            :phoneNumber="form.phoneNumber"
            label="Teléfono de contacto"
            placeholder="Número de teléfono"
            required
            :error="errors.phoneNumber"
            @update:countryCode="form.phoneCountry = $event"
            @update:phoneNumber="form.phoneNumber = $event"
          />

          <button
            type="submit"
            class="btn-primary flex w-full items-center justify-center gap-2"
            :disabled="saving"
          >
            <svg
              v-if="saving"
              class="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {{ saving ? 'Guardando…' : 'Comenzar' }}
          </button>

        </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import AppInput from '../components/ui/forms/AppInput.vue'
import AppPhoneInput from '../components/ui/forms/AppPhoneInput.vue'

const router = useRouter()
const accountStore = useAccountStore()
const toast = useToast()

const form = reactive({
  accountName: '',
  fullName: '',
  phoneCountry: '+57',
  phoneNumber: '',
})

const errors = reactive({
  accountName: '',
  fullName: '',
  phoneNumber: '',
})

const saving = ref(false)

const validate = () => {
  errors.accountName = form.accountName.trim() ? '' : 'Campo obligatorio'
  errors.fullName = form.fullName.trim() ? '' : 'Campo obligatorio'
  errors.phoneNumber = form.phoneNumber.trim() ? '' : 'Campo obligatorio'
  return !errors.accountName && !errors.fullName && !errors.phoneNumber
}

const handleSubmit = async () => {
  if (!validate()) return

  saving.value = true
  try {
    const { error: accountError } = await supabase
      .from('accounts')
      .update({ name: form.accountName.trim(), status: 'active' })
      .eq('id', accountStore.currentAccountId)

    if (accountError) throw accountError

    const { error: userError } = await supabase
      .from('account_users')
      .update({
        full_name: form.fullName.trim(),
        phone_country: form.phoneCountry,
        phone_number: form.phoneNumber.trim().replace(/\s+/g, ''),
        status: 'active',
      })
      .eq('account_id', accountStore.currentAccountId)
      .eq('user_id', accountStore.currentUserId)

    if (userError) throw userError

    accountStore.patchAccountContext({
      accountName: form.accountName.trim(),
      accountStatus: 'active',
    })

    router.push({ name: 'dashboard' })
  } catch (err) {
    toast.error(err?.message || 'Error al guardar. Intenta de nuevo.')
  } finally {
    saving.value = false
  }
}
</script>
