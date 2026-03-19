<template>
  <div class="card overflow-hidden !p-0">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
          <tr>
            <th class="px-6 py-4">Nro</th>
            <th class="px-6 py-4">Huésped</th>
            <th class="px-6 py-4">Unidades</th>
            <th class="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" @click="sortBy('check_in')">
              <span class="inline-flex items-center gap-1">
                <span>Fechas</span>
                <span class="text-[10px] leading-none text-gray-400" :class="sortKey === 'check_in' ? 'text-gray-700' : ''">
                  {{ sortKey === 'check_in' ? (sortDir === 'asc' ? '^' : 'v') : '^/v' }}
                </span>
              </span>
            </th>
            <th class="px-6 py-4">Noches</th>
            <th class="px-6 py-4">Estadía</th>
            <th class="px-6 py-4">Estado</th>
            <th v-if="showFinancialColumns" class="px-6 py-4">Montos</th>
            <th v-if="showFinancialColumns" class="px-6 py-4">Saldo</th>
            <th class="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-200 text-sm">
          <tr v-if="loading">
            <td :colspan="tableColumnCount" class="px-6 py-12 text-center text-gray-400">Cargando reservas...</td>
          </tr>
          <tr v-else-if="reservations.length === 0">
            <td :colspan="tableColumnCount" class="px-6 py-12 text-center text-gray-500 italic">No hay reservas para mostrar.</td>
          </tr>
          
          <tr 
            v-for="res in reservations" 
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

            <!-- Noches -->
            <td class="px-6 py-4 text-gray-700">
              {{ Number(res.nights || 0) }}
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
            <td v-if="showFinancialColumns" class="px-6 py-4 text-gray-900">
              <span class="block whitespace-nowrap">Total: {{ res.total_amount != null ? `$${formatCurrency(res.total_amount)}` : '—' }}</span>
              <span class="block whitespace-nowrap text-xs text-gray-500">Pagado: ${{ formatCurrency(res.paid_amount || 0) }}</span>
              <span v-if="Number(res.commission_percentage || 0) > 0" class="mt-1 block text-xs text-gray-500">
                Comisión {{ getCommissionSummary(res).name }} ({{ getCommissionSummary(res).percentage }}%): ${{ formatCurrency(getCommissionSummary(res).amount) }} → Neto: ${{ formatCurrency(getCommissionSummary(res).netAmount) }}
              </span>
            </td>
            
            <!-- Saldo -->
            <td v-if="showFinancialColumns" class="px-6 py-4 whitespace-nowrap font-medium">
               <span v-if="res.balance === 0 || res.balance === '0'" class="text-emerald-600">Pagado</span>
               <span v-else-if="res.balance != null" class="text-red-600">${{ formatCurrency(res.balance) }}</span>
               <span v-else class="text-gray-400">—</span>
            </td>
            
            <!-- Acciones -->
            <td class="px-6 py-4 text-right">
              <div class="relative inline-block text-left">
                <button
                  class="rounded px-2 py-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  type="button"
                  @click="toggleMenu(res.id)"
                >
                  ...
                </button>

                <div
                  v-if="openMenuId === res.id"
                  class="absolute right-0 z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                >
                  <button class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" @click="handleView(res)">
                    Ver detalle
                  </button>
                  <button
                    v-if="can('payments', 'create')"
                    class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    @click="handleRegisterPayment(res)"
                  >
                    Registrar pago
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3 text-sm text-gray-600">
      <p>
        Mostrando {{ reservations.length }} de {{ totalCount }} reservas · Pagina {{ page }} de {{ totalPages }}
      </p>
      <div class="flex items-center gap-2">
        <button v-if="page > 1" class="btn-secondary text-sm" :disabled="loading" @click="$emit('page-change', page - 1)">Anterior</button>
        <button v-if="page < totalPages" class="btn-secondary text-sm" :disabled="loading" @click="$emit('page-change', page + 1)">Siguiente</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ReservationBadge from '../ui/ReservationBadge.vue'
import { getCommissionSummary } from '../../utils/reservations'
import { usePermissions } from '../../composables/usePermissions'

const { can } = usePermissions()

const props = defineProps({
  reservations: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  sortKey: { type: String, default: 'check_in' },
  sortDir: { type: String, default: 'desc' },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 25 },
  totalCount: { type: Number, default: 0 }
})

const emit = defineEmits(['view', 'sort-change', 'page-change', 'register-payment'])
const openMenuId = ref('')

const totalPages = computed(() => {
  if (!props.pageSize || props.pageSize <= 0) return 1
  const pages = Math.ceil((props.totalCount || 0) / props.pageSize)
  return pages > 0 ? pages : 1
})

const showFinancialColumns = computed(() => {
  return can('payments', 'view') || can('reports', 'view_financial')
})

const tableColumnCount = computed(() => (showFinancialColumns.value ? 10 : 8))

const sortBy = (key) => {
  if (key === 'check_in') {
    emit('sort-change', 'check_in')
  }
}

const toggleMenu = (reservationId) => {
  openMenuId.value = openMenuId.value === reservationId ? '' : reservationId
}

const handleView = (reservation) => {
  openMenuId.value = ''
  emit('view', reservation)
}

const handleRegisterPayment = (reservation) => {
  openMenuId.value = ''
  emit('register-payment', reservation)
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
