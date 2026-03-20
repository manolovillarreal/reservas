<template>
  <div class="space-y-6">
     <div class="flex items-center justify-between gap-3">
       <h1 class="text-3xl font-semibold tracking-tight text-gray-900">Pagos</h1>
       <ViewModeToggle v-model="viewMode" class="hidden sm:flex" />
     </div>

    <div v-if="!can('payments', 'view')" class="card border-amber-200 bg-amber-50/40">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-900">Sin acceso</h2>
      <p class="mt-2 text-sm text-amber-800">No tienes permisos para ver pagos.</p>
    </div>

    <template v-else>
      <div v-if="isMobile" class="card !py-3 flex items-center justify-between gap-3">
        <p class="text-sm text-gray-600">{{ payments.length }} pagos</p>
        <button type="button" class="btn-secondary text-sm" @click="showFiltersSheet = true">Filtros</button>
      </div>

      <div v-if="!isMobile" class="card !py-4">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-full md:w-64">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Buscar huésped</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Nombre del huésped"
              class="mt-1 block w-full rounded-md border-gray-300 text-sm"
            >
          </div>

          <div class="w-full md:w-44">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Desde</label>
            <input v-model="filters.from" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </div>

          <div class="w-full md:w-44">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Hasta</label>
            <input v-model="filters.to" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </div>

          <div class="w-full md:w-44">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Metodo</label>
            <select v-model="filters.method" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="plataforma">Plataforma</option>
            </select>
          </div>

          <button
            v-if="hasActiveFilters"
            type="button"
            class="text-sm font-medium text-gray-500 underline hover:text-gray-700"
            @click="clearFilters"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div v-if="!isMobile" class="card overflow-hidden !p-0">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th class="px-4 py-3 cursor-pointer select-none" @click="toggleDateSort">
                  <span class="inline-flex items-center gap-1">
                    <span>Fecha</span>
                    <span class="text-[10px]">{{ sortDir === 'desc' ? '↓' : '↑' }}</span>
                  </span>
                </th>
                <th class="px-4 py-3">Reserva</th>
                <th class="px-4 py-3">Huésped</th>
                <th class="px-4 py-3">Metodo</th>
                <th class="px-4 py-3">Referencia</th>
                <th class="px-4 py-3 text-right">Monto</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-if="loading" v-for="i in 6" :key="`skeleton-${i}`" class="animate-pulse">
                <td class="px-4 py-4"><div class="h-3 w-24 rounded bg-gray-200"></div></td>
                <td class="px-4 py-4"><div class="h-3 w-28 rounded bg-gray-200"></div></td>
                <td class="px-4 py-4"><div class="h-3 w-32 rounded bg-gray-200"></div></td>
                <td class="px-4 py-4"><div class="h-3 w-20 rounded bg-gray-200"></div></td>
                <td class="px-4 py-4"><div class="h-3 w-24 rounded bg-gray-200"></div></td>
                <td class="px-4 py-4"><div class="ml-auto h-3 w-20 rounded bg-gray-200"></div></td>
                <td class="px-4 py-4"><div class="ml-auto h-3 w-24 rounded bg-gray-200"></div></td>
              </tr>

              <tr v-else-if="paginatedPayments.length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-sm text-gray-500">
                  <div v-if="hasActiveFilters" class="space-y-2">
                    <p>No se encontraron pagos con los filtros aplicados.</p>
                    <button class="text-sm font-medium text-gray-500 underline hover:text-gray-700" @click="clearFilters">Limpiar filtros</button>
                  </div>
                  <p v-else>No hay pagos registrados aún.</p>
                </td>
              </tr>

              <tr v-for="payment in paginatedPayments" :key="payment.id">
                <td class="px-4 py-3 text-gray-900">{{ formatDateShort(payment.payment_date) }}</td>
                <td class="px-4 py-3">
                  <router-link class="font-medium text-indigo-600 hover:text-indigo-800" :to="`/reservas/${payment.reservation_id}`">
                    {{ payment.reservation_number || '-' }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-gray-700">{{ payment.guest_display_name }}</td>
                <td class="px-4 py-3 text-gray-700 capitalize">{{ payment.method || '-' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ payment.reference || '-' }}</td>
                <td class="px-4 py-3 text-right font-medium text-gray-900">{{ formatCop(payment.amount) }}</td>
                <td class="px-4 py-3 text-right">
                  <div class="inline-flex items-center gap-2">
                    <router-link class="text-sm font-medium text-indigo-600 hover:text-indigo-800" :to="`/reservas/${payment.reservation_id}`">Ver reserva</router-link>
                    <button class="text-sm font-medium text-red-600 hover:text-red-800" @click="openDeleteModal(payment)">Eliminar</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          <p>Página {{ page }} de {{ totalPages }}</p>
          <p>Total mostrado: <span class="font-semibold text-gray-900">{{ formatCop(totalShown) }}</span></p>
          <div class="flex items-center gap-2">
            <button v-if="page > 1" class="btn-secondary text-sm" @click="page -= 1">Anterior</button>
            <button v-if="page < totalPages" class="btn-secondary text-sm" @click="page += 1">Siguiente</button>
          </div>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div v-if="loading" class="card text-sm text-gray-500">Cargando pagos...</div>
        <div v-else-if="paginatedPayments.length === 0" class="card text-sm text-gray-500">
          No se encontraron pagos con los filtros aplicados.
        </div>

        <DataCard
          v-for="payment in paginatedPayments"
          v-else
          :key="payment.id"
          :title="payment.guest_display_name"
          :subtitle="`Reserva ${payment.reservation_number || '-'}`"
          :meta="[
            { label: 'Fecha', value: formatDateShort(payment.payment_date) },
            { label: 'Método', value: payment.method || '-' },
            { label: 'Referencia', value: payment.reference || '-' },
            { label: 'Monto', value: formatCop(payment.amount) }
          ]"
          :actions="[
            { label: 'Ver reserva', type: 'ghost', handler: () => goToReservation(payment) },
            { label: 'Eliminar', type: 'danger', handler: () => openDeleteModal(payment) }
          ]"
        />

        <div class="card flex items-center justify-between text-sm text-gray-600">
          <p>Página {{ page }} de {{ totalPages }}</p>
          <div class="flex items-center gap-2">
            <button v-if="page > 1" class="btn-secondary text-sm" @click="page -= 1">Anterior</button>
            <button v-if="page < totalPages" class="btn-secondary text-sm" @click="page += 1">Siguiente</button>
          </div>
        </div>
      </div>
    </template>

    <ConfirmActionModal
      v-if="!isMobile"
      :isOpen="showDeleteModal"
      title="Eliminar pago"
      :message="deleteModalMessage"
      confirmLabel="Eliminar"
      :loading="deleting"
      @close="closeDeleteModal"
      @confirm="confirmDeletePayment"
    />

    <BottomSheet
      v-if="isMobile"
      v-model="showDeleteModal"
      title="Eliminar pago"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-700">{{ deleteModalMessage }}</p>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="deleting" @click="closeDeleteModal">Cancelar</button>
          <button type="button" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" :disabled="deleting" @click="confirmDeletePayment">
            {{ deleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </BottomSheet>

    <BottomSheet
      v-model="showFiltersSheet"
      title="Filtros de pagos"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Buscar huésped</label>
          <input v-model="filters.search" type="text" placeholder="Nombre del huésped" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
        </div>
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Desde</label>
            <input v-model="filters.from" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Hasta</label>
            <input v-model="filters.to" type="date" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Método</label>
          <select v-model="filters.method" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
            <option value="">Todos</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="nequi">Nequi</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="plataforma">Plataforma</option>
          </select>
        </div>
        <div class="flex items-center justify-between pt-2">
          <button v-if="hasActiveFilters" type="button" class="text-sm font-medium text-gray-500 underline" @click="clearFilters">Limpiar filtros</button>
          <button type="button" class="btn-primary ml-auto" @click="showFiltersSheet = false">Aplicar</button>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useAccountStore } from '../stores/account'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import DataCard from '../components/ui/DataCard.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import ViewModeToggle from '../components/ui/ViewModeToggle.vue'
import { useViewMode } from '../composables/useViewMode'
import { useBreakpoint } from '../composables/useBreakpoint'

const accountStore = useAccountStore()
const { can } = usePermissions()
const toast = useToast()
const router = useRouter()
const { isMobile } = useBreakpoint()
const { viewMode, isTable, isCards } = useViewMode('pagos')

const filters = ref({
  search: '',
  from: '',
  to: '',
  method: '',
})

const loading = ref(false)
const deleting = ref(false)
const payments = ref([])
const page = ref(1)
const pageSize = 25
const sortDir = ref('desc')
const showDeleteModal = ref(false)
const selectedPayment = ref(null)
const showFiltersSheet = ref(false)

const hasActiveFilters = computed(() => {
  return Boolean(filters.value.search || filters.value.from || filters.value.to || filters.value.method)
})

const totalPages = computed(() => {
  const pages = Math.ceil(payments.value.length / pageSize)
  return pages > 0 ? pages : 1
})

const paginatedPayments = computed(() => {
  const start = (page.value - 1) * pageSize
  return payments.value.slice(start, start + pageSize)
})

const totalShown = computed(() => {
  return paginatedPayments.value.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
})

const deleteModalMessage = computed(() => {
  if (!selectedPayment.value) return ''
  return `¿Eliminar este pago de ${formatCop(selectedPayment.value.amount)} registrado el ${formatDateShort(selectedPayment.value.payment_date)}?`
})

const formatCop = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
}).format(Number(value || 0))

const formatDateShort = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const toggleDateSort = () => {
  sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
}

const clearFilters = () => {
  filters.value = { search: '', from: '', to: '', method: '' }
}

const goToReservation = (payment) => {
  if (!payment?.reservation_id) return
  router.push(`/reservas/${payment.reservation_id}`)
}

const mapPaymentRow = (row) => {
  const guestName = row.reservations?.guests?.name || row.reservations?.guest_name || 'Sin huésped'

  return {
    id: row.id,
    reservation_id: row.reservation_id,
    reservation_number: row.reservations?.reservation_number || '-',
    guest_display_name: guestName,
    payment_date: row.payment_date,
    amount: Number(row.amount || 0),
    method: row.method,
    reference: row.reference,
  }
}

const fetchPayments = async () => {
  if (!can('payments', 'view')) return

  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    let query = supabase
      .from('payments')
      .select('id, reservation_id, payment_date, amount, method, reference, reservations!inner(id, reservation_number, guest_name, guests!reservations_guest_id_fkey(name))')
      .eq('account_id', accountId)

    if (filters.value.from) {
      query = query.gte('payment_date', filters.value.from)
    }

    if (filters.value.to) {
      query = query.lte('payment_date', filters.value.to)
    }

    if (filters.value.method) {
      query = query.eq('method', filters.value.method)
    }

    query = query.order('payment_date', { ascending: sortDir.value === 'asc' })

    const { data, error } = await query
    if (error) throw error

    const mapped = (data || []).map(mapPaymentRow)

    const search = filters.value.search.trim().toLowerCase()
    payments.value = search
      ? mapped.filter((row) => row.guest_display_name.toLowerCase().includes(search))
      : mapped

    if (page.value > totalPages.value) {
      page.value = totalPages.value
    }
  } catch (error) {
    toast.error(error.message || 'No se pudieron cargar los pagos.')
  } finally {
    loading.value = false
  }
}

const recalculatePaidAmount = async (reservationId, accountId) => {
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('account_id', accountId)
    .eq('reservation_id', reservationId)

  if (error) throw error

  const paidAmount = (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const { error: updateError } = await supabase
    .from('reservations')
    .update({ paid_amount: paidAmount })
    .eq('account_id', accountId)
    .eq('id', reservationId)

  if (updateError) throw updateError
}

const openDeleteModal = (payment) => {
  selectedPayment.value = payment
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (deleting.value) return
  showDeleteModal.value = false
  selectedPayment.value = null
}

const confirmDeletePayment = async () => {
  if (!selectedPayment.value) return

  deleting.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('account_id', accountId)
      .eq('id', selectedPayment.value.id)

    if (error) throw error

    await recalculatePaidAmount(selectedPayment.value.reservation_id, accountId)
    await fetchPayments()

    toast.success('Pago eliminado correctamente')
    closeDeleteModal()
  } catch (error) {
    toast.error(error.message || 'No se pudo eliminar el pago.')
  } finally {
    deleting.value = false
  }
}

watch(
  () => [filters.value.search, filters.value.from, filters.value.to, filters.value.method, sortDir.value],
  async () => {
    page.value = 1
    await fetchPayments()
  }
)

watch(page, async () => {
  if (page.value < 1) page.value = 1
})

onMounted(fetchPayments)
</script>
