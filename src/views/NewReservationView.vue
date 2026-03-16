<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-black text-gray-800">Registrar Nueva Reserva</h1>
      <router-link to="/reservas" class="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
        ← Volver a Reservas
      </router-link>
    </div>
    
    <ReservationForm />
  </div>
</template>

<script setup>
import ReservationForm from '../components/reservations/ReservationForm.vue'
</script>
