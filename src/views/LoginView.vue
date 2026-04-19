<template>
  <div class="min-h-screen flex items-center justify-center p-6" style="background:#101828;">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div class="mb-8 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style="background:#4b3197;">
          <img :src="logoSrc" alt="Tekmi Inn" class="h-10 w-10 object-contain" >
        </div>
        <p class="mt-3 text-xl font-bold text-gray-900">Tekmi <span style="color:#4b3197;">Inn</span></p>
      </div>

      <template v-if="activeView === 'login'">
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
          <p class="mt-1 text-sm text-gray-500">Inicia sesión para gestionar tus reservas.</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <div>
            <label class="block text-sm font-medium text-gray-700">Correo electrónico</label>
            <input v-model="email" type="email" required autocomplete="email" class="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary/30">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Contraseña</label>
            <input v-model="password" type="password" required autocomplete="current-password" class="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary/30">
          </div>

          <div class="text-right">
            <button type="button" class="text-sm font-medium hover:underline" style="color:#4b3197;" @click="activeView = 'forgot'">¿Olvidaste tu contraseña?</button>
          </div>

          <p v-if="errorMessage" class="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ errorMessage }}
          </p>

          <button type="submit" :disabled="loading" class="w-full rounded-md py-2.5 text-white disabled:opacity-50" style="background:#4b3197;">
            {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
          </button>
        </form>

        <div class="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
          <div class="h-px flex-1 bg-gray-200"></div>
          <span>o continúa con</span>
          <div class="h-px flex-1 bg-gray-200"></div>
        </div>

        <button type="button" :disabled="loading" class="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50" @click="handleGoogleLogin">
          <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.8S6.8 21.2 12 21.2c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.9-.1-1.3H12Z"/>
          </svg>
          Continuar con Google
        </button>

        <p class="mt-5 text-center text-sm text-gray-500">
          ¿No tienes cuenta?
          <button type="button" class="font-semibold hover:underline" style="color:#4b3197;" @click="activeView = 'register'">Regístrate</button>
        </p>
      </template>

      <template v-else-if="activeView === 'register'">
        <button type="button" class="mb-4 text-sm font-medium text-gray-500 hover:text-gray-900" @click="activeView = 'login'">← Volver</button>

        <div class="mb-6 text-center">
          <h1 class="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p class="mt-1 text-sm text-gray-500">Empieza a gestionar tu alojamiento hoy.</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleSignUp">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input v-model="name" type="text" autocomplete="name" class="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary/30">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Correo electrónico</label>
            <input v-model="email" type="email" required autocomplete="email" class="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary/30">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Contraseña</label>
            <input v-model="password" type="password" required autocomplete="new-password" class="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary/30">
          </div>

          <p v-if="errorMessage" class="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ errorMessage }}
          </p>

          <button type="submit" :disabled="loading" class="w-full rounded-md py-2.5 text-white disabled:opacity-50" style="background:#4b3197;">
            {{ loading ? 'Creando...' : 'Crear cuenta' }}
          </button>
        </form>

        <div class="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
          <div class="h-px flex-1 bg-gray-200"></div>
          <span>o continúa con</span>
          <div class="h-px flex-1 bg-gray-200"></div>
        </div>

        <button type="button" :disabled="loading" class="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50" @click="handleGoogleLogin">
          <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.8S6.8 21.2 12 21.2c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.9-.1-1.3H12Z"/>
          </svg>
          Continuar con Google
        </button>

        <p class="mt-5 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?
          <button type="button" class="font-semibold hover:underline" style="color:#4b3197;" @click="activeView = 'login'">Inicia sesión</button>
        </p>
      </template>

      <template v-else-if="activeView === 'forgot'">
        <button type="button" class="mb-4 text-sm font-medium text-gray-500 hover:text-gray-900" @click="activeView = 'login'">← Volver</button>

        <div class="mb-6 text-center">
          <h1 class="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p class="mt-1 text-sm text-gray-500">Te enviaremos un enlace para restablecer tu contraseña.</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleForgotPassword">
          <div>
            <label class="block text-sm font-medium text-gray-700">Correo electrónico</label>
            <input v-model="email" type="email" required autocomplete="email" class="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary/30">
          </div>

          <p v-if="errorMessage" class="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ errorMessage }}
          </p>

          <button type="submit" :disabled="loading" class="w-full rounded-md py-2.5 text-white disabled:opacity-50" style="background:#4b3197;">
            {{ loading ? 'Enviando...' : 'Enviar enlace' }}
          </button>
        </form>

        <p class="mt-5 text-center text-sm text-gray-500">
          <button type="button" class="font-semibold hover:underline" style="color:#4b3197;" @click="activeView = 'login'">Volver al inicio de sesión</button>
        </p>
      </template>

      <template v-else-if="activeView === 'forgot-sent'">
        <div class="text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold text-gray-900">Revisa tu correo</h1>
          <p class="mt-2 text-sm text-gray-500">Si encontramos una cuenta asociada, te enviamos un enlace para recuperar tu contraseña.</p>
          <button type="button" class="mt-6 w-full rounded-md py-2.5 text-white" style="background:#4b3197;" @click="activeView = 'login'">Volver al inicio</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { warmPriorityOfflineData } from '../services/offlineWarmup'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import logoSrc from '../assets/logo.jpeg'

const router = useRouter()
const route = useRoute()
const accountStore = useAccountStore()

const activeView = ref('login')
const name = ref('')
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

    const accountReady = await accountStore.initializeFromSession()
    if (!accountReady) {
      router.push({ name: 'account-association-error' })
      return
    }

    void warmPriorityOfflineData()
    router.push(redirectTo())
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo iniciar sesión.'
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + redirectTo()
      }
    })
    if (error) throw error
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo iniciar sesión con Google.'
  } finally {
    loading.value = false
  }
}

const handleForgotPassword = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: window.location.origin + '/reset-password'
    })
    if (error) throw error
    activeView.value = 'forgot-sent'
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo enviar el enlace.'
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
      password: password.value,
      options: {
        data: { full_name: name.value }
      }
    })

    if (error) throw error
    errorMessage.value = 'Usuario creado. Ahora puedes iniciar sesión.'
    activeView.value = 'login'
  } catch (err) {
    errorMessage.value = err.message || 'No se pudo crear el usuario.'
  } finally {
    loading.value = false
  }
}
</script>
