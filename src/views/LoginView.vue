<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-6">
    <div class="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
        <p class="text-sm text-gray-500 mt-1">Accede para gestionar reservas</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Correo</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          >
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-gray-900 text-white py-2.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>

      <button
        @click="handleSignUp"
        :disabled="loading"
        class="w-full mt-3 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
      >
        Crear usuario con este correo
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const redirectTo = () => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  return '/'
}

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error
    router.push(redirectTo())
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo iniciar sesión.'
  } finally {
    loading.value = false
  }
}

const handleSignUp = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value
    })

    if (error) throw error
    errorMessage.value = 'Usuario creado. Ahora puedes iniciar sesión.'
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo crear el usuario.'
  } finally {
    loading.value = false
  }
}
</script>
