<template>
  <div class="card overflow-hidden !p-0">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
          <tr>
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" @click="sortBy('reservation_number')">Nro</th>
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" @click="sortBy('guest_display_name')">Huésped</th>
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" @click="sortBy('unit_names_display')">Unidades</th>
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" @click="sortBy('check_in')">Fechas</th>
            <th class="px-6 py-4">Estadía</th>
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" @click="sortBy('status')">Estado</th>
            <th class="px-6 py-4">Montos</th>
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" @click="sortBy('balance')">Saldo</th>
            <th class="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-200 text-sm">
          <tr v-if="loading">
            <td colspan="9" class="px-6 py-12 text-center text-gray-400">Cargando reservas...</td>
          </tr>
          <tr v-else-if="reservations.length === 0">
            <td colspan="9" class="px-6 py-12 text-center text-gray-500 italic">No hay reservas para mostrar.</td>
          </tr>
          
          <tr 
            v-for="res in sortedReservations" 
            :key="res.id"
            class="hover:bg-gray-50 transition-colors group"
            :class="getRowClass(res)"
          >
            <td class="px-6 py-4 font-mono text-xs text-gray-600">
              {{ res.reservation_number || '-' }}
            </td>

            <!-- Huésped -->
            <td class="px-6 py-4 font-medium text-gray-900 border-l-[3px] border-transparent" :class="getLeftBorderClass(res)">
              {{ res.guest_display_name || 'Desconocido' }}
            </td>
            
            <!-- Unidades -->
            <td class="px-6 py-4 text-gray-600">{{ res.unit_names_display || 'Sin unidades' }}</td>
            
            <!-- Fechas -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="block text-gray-900" :class="{'font-bold': isToday(res.check_in)}">{{ formatDate(res.check_in) }}</span>
              <span class="block text-gray-500 text-xs">hasta {{ formatDate(res.check_out) }}</span>
            </td>
            
            <!-- Estadía -->
            <td class="px-6 py-4 text-gray-600">
              <span class="block">{{ Number(res.adults || 0) + Number(res.children || 0) }} pax</span>
              <span class="block text-xs text-gray-400">{{ Number(res.adults || 0) }} ad / {{ Number(res.children || 0) }} ni</span>
              <span class="block text-xs text-gray-400">{{ formatSource(res.source) }}</span>
            </td>
            
            <!-- Estado -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <ReservationBadge :status="res.status" />
                <span v-if="isDeadlineOverdue(res)" title="Deadline vencido" class="text-xs">⚠️</span>
              </div>
            </td>
            
            <!-- Total -->
            <td class="px-6 py-4 text-gray-900">
              <span class="block whitespace-nowrap">Total: {{ res.total_amount != null ? `$${formatCurrency(res.total_amount)}` : '—' }}</span>
              <span class="block whitespace-nowrap text-xs text-gray-500">Pagado: ${{ formatCurrency(res.paid_amount || 0) }}</span>
              <span v-if="Number(res.commission_percentage || 0) > 0" class="mt-1 block text-xs text-gray-500">
                Comisión {{ getCommissionSummary(res).name }} ({{ getCommissionSummary(res).percentage }}%): ${{ formatCurrency(getCommissionSummary(res).amount) }} → Neto: ${{ formatCurrency(getCommissionSummary(res).netAmount) }}
              </span>
            </td>
            
            <!-- Saldo -->
            <td class="px-6 py-4 whitespace-nowrap font-medium">
               <span v-if="res.balance === 0 || res.balance === '0'" class="text-emerald-600">Pagado</span>
               <span v-else-if="res.balance != null" class="text-red-600">${{ formatCurrency(res.balance) }}</span>
               <span v-else class="text-gray-400">—</span>
            </td>
            
            <!-- Acciones -->
            <td class="px-6 py-4 text-right">
              <button class="text-gray-400 hover:text-indigo-600 px-2 py-1 transition-colors" @click="$emit('view', res)">Ver detalle</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ReservationBadge from '../ui/ReservationBadge.vue'
import { getCommissionSummary, getReservationGuestName } from '../../utils/reservations'

const props = defineProps({
  reservations: { type: Array, required: true },
  loading: { type: Boolean, default: false }
})

defineEmits(['view'])

const sortKey = ref('check_in')
const sortDesc = ref(false)

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
  } else {
    sortKey.value = key
    sortDesc.value = false
  }
}

const sortedReservations = computed(() => {
  return [...props.reservations].sort((a, b) => {
    let valA = getNestedValue(a, sortKey.value)
    let valB = getNestedValue(b, sortKey.value)
    
    // Treat nulls
    if (valA === null) valA = ''
    if (valB === null) valB = ''

    if (valA < valB) return sortDesc.value ? 1 : -1
    if (valA > valB) return sortDesc.value ? -1 : 1
    return 0
  })
})

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj)
}

const isToday = (dateStr) => {
  const d = new Date()
  const today = d.toISOString().split('T')[0]
  return dateStr === today
}

const isDeadlineOverdue = (res) => {
  if (res.status !== 'confirmed' || !res.payment_deadline) return false
  const d = new Date()
  const today = d.toISOString().split('T')[0]
  return res.payment_deadline < today
}

const getRowClass = (res) => {
  if (isDeadlineOverdue(res)) return 'bg-orange-50/50 hover:bg-orange-50'
  if (res.status === 'in_stay' && isToday(res.check_in)) return 'bg-emerald-50/30'
  return ''
}

const getLeftBorderClass = (res) => {
  if (isDeadlineOverdue(res)) return '!border-orange-400'
  return ''
}

const formatDate = (ds) => {
  if(!ds) return '-'
  return new Date(ds).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

const formatCurrency = (val) => Number(val).toLocaleString('es-CO')

const formatSource = (src) => {
  const map = { whatsapp: 'WhatsApp', instagram: 'Instagram', telefono: 'Teléfono', directo: 'Directo', agencia: 'Agencia' }
  return map[src] || src
}
</script>
