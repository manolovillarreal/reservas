<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    
    <!-- Top Nav Actions -->
    <div class="flex items-center justify-between">
      <button type="button" class="touch-target inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900" @click="goBackToReservations">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Volver
      </button>
      <div class="flex items-center gap-3">
        <button v-if="can('vouchers', 'generate')" class="btn-secondary touch-target text-sm" @click="openVoucher">Generar Voucher</button>
        <button
          v-if="can('reservations', 'edit') && res && res.status === 'confirmed' && !res.checkin_date"
          class="btn-primary touch-target text-sm"
          @click="router.push('/reservas/' + res.id + '/editar')"
        >Editar reserva</button>
        <button class="btn-secondary touch-target text-sm" @click="showMessagesPanel = true">Mensajes</button>
      </div>
    </div>

    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-32 bg-gray-200 rounded-xl"></div>
      <div class="grid grid-cols-3 gap-6">
        <div class="col-span-2 h-64 bg-gray-200 rounded-xl"></div>
        <div class="col-span-1 h-64 bg-gray-200 rounded-xl"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="!res" class="card text-center py-12">
      <h3 class="text-lg font-medium text-gray-900">Reserva no encontrada</h3>
      <p class="mt-1 text-sm text-gray-500">Es posible que haya sido eliminada o la URL no es válida.</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Main Content Column (2/3) -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Header Card -->
        <div class="card bg-white overflow-hidden !p-0">
          <div class="p-6 border-b border-gray-100 flex justify-between items-start">
            <div>
              <p class="mb-1 font-mono text-xs text-gray-500">{{ res.reservation_number || '' }} · {{ reservationReferenceDisplay }}</p>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-2xl font-semibold text-gray-900">{{ guestDisplayName }}</h1>
                <ReservationBadge :status="res.status" />
              </div>
              <p class="text-gray-500 text-sm flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {{ formatDate(res.check_in) }} &rarr; {{ formatDate(res.check_out) }} 
                <span class="text-gray-300">|</span> 
                {{ nightsCount }} noches 
                <span class="text-gray-300">|</span> 
                {{ Number(res.adults || 0) + Number(res.minors || 0) + Number(res.children || 0) + Number(res.infants || 0) }} personas
              </p>
            </div>
            <a
              v-if="whatsappGuestUrl"
              :href="whatsappGuestUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="lg:hidden touch-target flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shrink-0"
              aria-label="Ir a WhatsApp"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
            </a>
          </div>
          
          <div class="bg-gray-50 p-6 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <p class="text-gray-500 mb-1">Sede</p>
              <p class="font-medium text-gray-900">{{ res.venues?.name || '-' }}</p>
            </div>
            <div>
              <p class="text-gray-500 mb-1">Unidades</p>
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-gray-900">{{ unitNames || '-' }}</p>
                <button
                  v-if="!isEditLocked"
                  type="button"
                  class="touch-target inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark"
                  @click="openEditUnitsModal"
                >
                  Editar
                </button>
              </div>
            </div>
            <div>
              <p class="text-gray-500 mb-1">Origen</p>
              <p class="font-medium text-gray-900">{{ res.source_name ? `${res.source_detail_info?.label_es || 'Otro'} — ${res.source_name}` : (res.source_detail_info?.label_es || '-') }}</p>
            </div>
            <div>
              <p class="text-gray-500 mb-1">Registro</p>
              <p class="font-medium text-gray-900">{{ formatDate(res.created_at) }}</p>
            </div>
            <div v-if="canViewFinancial">
              <p class="text-gray-500 mb-1">Total</p>
              <p class="font-medium text-gray-900">${{ formatCurrency(res.total_amount) }}</p>
            </div>
            <div v-if="canViewFinancial">
              <p class="text-gray-500 mb-1">Comisión</p>
              <p class="font-medium text-gray-900">
                {{ commissionSummary.name }} ({{ commissionSummary.percentage }}%)
              </p>
              <p class="text-xs text-gray-500">${{ formatCurrency(commissionSummary.amount) }} → Neto: ${{ formatCurrency(commissionSummary.netAmount) }}</p>
            </div>
          </div>
        </div>

        <!-- Payments Section -->
        <div v-if="canViewPayments" class="card">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Historial de Pagos</h2>
            <button v-if="can('payments', 'create')" class="touch-target inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark" @click="openPaymentModal">+ Registrar Pago</button>
          </div>
          
          <div v-if="payments.length === 0" class="text-center py-6 text-gray-500 text-sm italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No hay pagos registrados aún.
          </div>
          
          <table v-else-if="!isMobile" class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th class="py-2 px-3">Fecha</th>
                <th class="py-2 px-3">Monto</th>
                <th class="py-2 px-3">Método</th>
                <th class="py-2 px-3">Referencia</th>
                <th class="py-2 px-3 text-right">Eliminar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 text-sm">
              <tr v-for="p in payments" :key="p.id">
                <td class="py-3 px-3 text-gray-900">{{ formatDate(p.payment_date) }}</td>
                <td class="py-3 px-3 font-medium text-gray-900">${{ formatCurrency(p.amount) }}</td>
                <td class="py-3 px-3 text-gray-500 capitalize">{{ p.method }}</td>
                <td class="py-3 px-3 text-gray-500">{{ p.reference || '-' }}</td>
                <td class="py-3 px-3 text-right">
                  <button
                    v-if="can('payments', 'delete')"
                    class="touch-target inline-flex items-center text-sm font-medium text-red-600 hover:text-red-800"
                    @click="openDeletePaymentModal(p)"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-else class="space-y-2">
            <div v-for="p in payments" :key="p.id" class="rounded-md border border-gray-200 bg-white p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900">{{ formatCop(p.amount) }}</p>
                  <p class="text-xs text-gray-500">{{ formatDate(p.payment_date) }} · {{ p.method || '-' }}</p>
                  <p class="text-xs text-gray-500">Ref: {{ p.reference || '-' }}</p>
                </div>
                <button
                  v-if="can('payments', 'delete')"
                  class="touch-target inline-flex items-center text-sm font-medium text-red-600"
                  @click="openDeletePaymentModal(p)"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
          
          <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <div class="w-full max-w-xs space-y-2 text-sm">
              <div class="flex justify-between text-gray-500">
                <span>Total Reserva:</span>
                <span>${{ formatCurrency(res.total_amount) }}</span>
              </div>
              <div class="flex justify-between text-gray-500">
                <span>Total Pagado:</span>
                <span>${{ formatCurrency(totalPaid) }}</span>
              </div>
              <div class="flex justify-between font-semibold pt-2 border-t border-gray-100 text-base" :class="remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'">
                <span>Saldo Pendiente:</span>
                <span>${{ formatCurrency(remainingBalance) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Personas adicionales (post-checkin) -->
        <div v-if="res.status === 'in_stay'" class="card">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">Personas adicionales</h2>
            <button
              v-if="can('reservations', 'edit')"
              class="touch-target inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark"
              @click="showAddPersonModal = true"
            >+ Agregar persona</button>
          </div>
          <div v-if="postCheckinGuests.length === 0" class="text-center py-4 text-gray-500 text-sm italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No hay personas adicionales registradas durante la estadía.
          </div>
          <div v-else class="space-y-2">
            <div v-for="p in postCheckinGuests" :key="p.id" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <p class="font-medium text-gray-900">{{ p.fullName }}</p>
              <p class="text-xs text-gray-500">{{ p.documentLabel }} · {{ p.categoryLabel }}</p>
              <p v-if="p.arrival_date || p.departure_date" class="text-xs text-gray-500">
                {{ p.arrival_date ? formatDate(p.arrival_date) : '—' }} → {{ p.departure_date ? formatDate(p.departure_date) : '—' }}
              </p>
            </div>
          </div>
        </div>

      </div>

      <!-- Side Column (1/3) -->
      <div class="space-y-6">

        <div class="card">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Pre-registro de huéspedes</h2>

          <div v-if="res.preregistro_completado" class="space-y-3 text-sm text-gray-700">
            <p v-if="preregistroEval.isComplete" class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Completo &#x2713;</p>
            <p v-else class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Incompleto &#x2717;</p>
            <p v-if="!preregistroEval.isComplete && preregistroEval.companionsExpected > 0" class="text-xs text-amber-700">
              Faltan {{ preregistroEval.companionsExpected - preregistroEval.companionsRegistered }} acompa&ntilde;ante(s) por registrar
            </p>
            <p>
              Completado el
              <span class="font-medium text-gray-900">{{ formatDateTime(res.preregistro_completado_at) }}</span>
            </p>

            <div v-if="!preregistroEval.isComplete && (res.status === 'confirmed' || res.status === 'in_stay')" class="space-y-2">
              <button v-if="can('reservations', 'edit')" class="touch-target w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200" @click="showPreregistroModal = true">
                Completar pre-registro
              </button>
              <button v-if="can('reservations', 'edit')" class="touch-target w-full rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15" @click="copyWhatsappPreregistroMessage">
                Copiar mensaje WhatsApp
              </button>
              <button v-if="can('reservations', 'edit')" class="touch-target w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200" @click="copyPreregistroLink">
                Copiar link
              </button>
              <button v-if="role === 'admin' || role === 'manager'" class="touch-target w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100" :disabled="regeneratingLink" @click="regeneratePreregistroLink">
                {{ regeneratingLink ? 'Regenerando...' : 'Regenerar link' }}
              </button>
            </div>

            <div class="rounded-md border border-gray-200 bg-gray-50">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100"
                @click="showRegisteredGuests = !showRegisteredGuests"
              >
                <span>Huéspedes registrados ({{ registeredGuests.length }})</span>
                <span>{{ showRegisteredGuests ? '▲' : '▼' }}</span>
              </button>
              <div v-if="showRegisteredGuests" class="p-3 pt-0">
                <div v-if="registeredGuests.length === 0" class="text-sm text-gray-500">No hay huéspedes nominales registrados.</div>
                <div v-else class="space-y-2">
                  <div v-for="guest in registeredGuests" :key="`rg-${guest.id}`" class="rounded border border-gray-200 bg-white px-3 py-2">
                    <p class="text-sm font-medium text-gray-900">{{ guest.name || 'Sin nombre' }}</p>
                    <p class="text-xs text-gray-600">{{ guest.documentLabel }}</p>
                    <p class="text-xs text-gray-600">{{ guest.nationality || 'Nacionalidad no registrada' }}</p>
                    <p class="text-xs font-semibold" :class="guest.is_primary ? 'text-indigo-700' : 'text-gray-500'">
                      {{ guest.is_primary ? 'Principal' : 'Acompañante' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="res.status === 'confirmed' || res.status === 'in_stay'" class="space-y-3 text-sm text-gray-700">
            <p class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Pendiente</p>
            <button v-if="can('reservations', 'edit')" class="touch-target w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200" @click="showPreregistroModal = true">
              Completar pre-registro
            </button>
            <button v-if="can('reservations', 'edit')" class="touch-target w-full rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15" @click="copyWhatsappPreregistroMessage">
              Copiar mensaje WhatsApp
            </button>
            <button v-if="can('reservations', 'edit')" class="touch-target w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200" @click="copyPreregistroLink">
              Copiar link
            </button>
            <button v-if="role === 'admin' || role === 'manager'" class="touch-target w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100" :disabled="regeneratingLink" @click="regeneratePreregistroLink">
              {{ regeneratingLink ? 'Regenerando...' : 'Regenerar link' }}
            </button>
          </div>

          <div v-else class="text-sm text-gray-500">
            El pre-registro solo está disponible para reservas confirmadas o en estadía.
          </div>
        </div>

        <!-- Acciones por estado -->
        <div class="card">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Acciones</h2>

          <!-- confirmed: registrar llegada -->
          <div v-if="res.status === 'confirmed'" class="space-y-3">
            <p class="text-sm text-gray-600">Registra la llegada física del huésped para cambiar la reserva a "En estadía".</p>
            <button
              v-if="can('reservations', 'checkin')"
              class="touch-target w-full rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              @click="showCheckinModal = true"
            >
              Registrar llegada
            </button>
          </div>

          <!-- in_stay: registrar salida o finalizar anticipado -->
          <div v-else-if="res.status === 'in_stay'" class="space-y-3">
            <div class="space-y-2 text-sm text-gray-700">
              <p v-if="res.checkin_date">Llegada: <span class="font-medium text-gray-900">{{ formatDateTime(res.checkin_date) }}</span></p>
            </div>
            <button
              v-if="can('reservations', 'edit') && isCheckoutDay"
              class="touch-target w-full rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              @click="showCheckoutModal = true"
            >
              Registrar salida
            </button>
            <p v-else-if="can('reservations', 'edit') && !isCheckoutDay" class="text-xs text-gray-400 text-center">
              Salida disponible el {{ formatDate(res.check_out) }}
            </p>
            <button
              v-if="can('reservations', 'edit')"
              class="touch-target w-full rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
              @click="showFinalizeModal = true"
            >
              Finalizar anticipadamente
            </button>
          </div>

          <!-- completed -->
          <div v-else-if="res.status === 'completed'" class="space-y-2 text-sm text-gray-700">
            <p class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Estadía completada</p>
            <p v-if="res.checkout_date">Salida: <span class="font-medium text-gray-900">{{ formatDateTime(res.checkout_date) }}</span></p>
            <p v-if="res.finalization_notes" class="text-xs text-gray-500">{{ res.finalization_notes }}</p>
          </div>

          <!-- finalized -->
          <div v-else-if="res.status === 'finalized'" class="space-y-2 text-sm text-gray-700">
            <p class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Finalizada anticipadamente</p>
            <p v-if="res.finalized_date">Salida: <span class="font-medium text-gray-900">{{ formatDateTime(res.finalized_date) }}</span></p>
            <p v-if="res.finalization_reason">Motivo: <span class="font-medium text-gray-900">{{ getFinalizationReasonLabel(res.finalization_reason) }}</span></p>
            <p v-if="res.finalization_notes" class="text-xs text-gray-500">{{ res.finalization_notes }}</p>
          </div>

          <!-- cancelled -->
          <div v-else-if="res.status === 'cancelled'" class="text-sm text-gray-500">
            Esta reserva ha sido cancelada.
          </div>

          <div v-else class="text-sm text-gray-500">
            No hay acciones disponibles.
          </div>
        </div>
        <!-- Occupancy sync alert -->
        <div v-if="isSyncMissing" class="card border-amber-100 bg-amber-50/30">
          <h2 class="text-sm font-semibold text-amber-800 mb-2">Ocupación desincronizada</h2>
          <p class="text-xs text-amber-700 mb-3">El calendario puede no reflejar esta reserva correctamente.</p>
          <button
            class="touch-target w-full rounded-md border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50"
            :disabled="syncingOccupancy"
            @click="syncOccupancy"
          >
            {{ syncingOccupancy ? 'Sincronizando…' : 'Re-sincronizar ocupación' }}
          </button>
        </div>
        <div class="card">
          <h2 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Huésped principal</h2>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
              {{ guestDisplayName.charAt(0) }}
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ guestDisplayName }}</p>
              <p class="text-sm text-gray-500">{{ res.guests?.email || 'Sin correo' }}</p>
            </div>
          </div>
          <div class="space-y-2 text-sm text-gray-600">
            <p class="flex items-center gap-2"><span class="w-4">📱</span> {{ guestDisplayPhone }}</p>
            <p class="flex items-center gap-2"><span class="w-4">🪪</span> {{ guestDocumentLabel }}</p>
          </div>
          <a
            v-if="whatsappGuestUrl"
            :href="whatsappGuestUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            Ir a WhatsApp
          </a>
          <button class="mt-2 w-full py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors">
            Ver perfil completo
          </button>
        </div>

        <!-- Danger Zone -->
        <div class="card border-red-100 bg-red-50/30">
          <h2 class="text-sm font-semibold text-red-800 mb-2">Zona de Peligro</h2>

          <!-- Cancelar: solo para confirmed -->
          <div v-if="res.status === 'confirmed'">
            <p class="text-xs text-red-600 mb-4">Al cancelar una reserva, se liberarán las fechas en el calendario inmediatamente.</p>
            <button @click="openCancelModal" class="touch-target w-full rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50">
              Cancelar Reserva
            </button>
          </div>

          <hr v-if="res.status === 'confirmed'" class="my-3 border-red-100">

          <!-- Eliminar: disponible en cualquier estado sin pagos -->
          <p class="text-xs text-red-600 mb-3">Eliminar borra permanentemente el registro del sistema. Solo úsalo si la reserva fue creada por error.</p>
          <button
            @click="showDeleteReservationModal = true"
            :disabled="payments.length > 0"
            :title="payments.length > 0 ? 'No se puede eliminar una reserva con pagos registrados' : ''"
            class="touch-target w-full rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Eliminar Reserva
          </button>
        </div>

      </div>
    </div>

    <BaseModal :isOpen="showPreregistroModal" title="Completar pre-registro" size="lg" :fullScreenOnMobile="true" @close="closePreregistroModal">
      <PreRegistroForm
        v-if="res"
        :reservation="preregistroReservation"
        :guestsCount="preregistroGuestsCount"
        :submitting="preregistroSubmitting"
        :initialPrimaryGuest="preregistroPrimaryGuest"
        :initialAdditionalGuests="preregistroAdditionalGuests"
        @submitted="handleAdminPreregistroSubmit"
      />
      <p v-if="preregistroErrorMessage" class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ preregistroErrorMessage }}
      </p>
    </BaseModal>

    <BaseModal :isOpen="showAddPersonModal" title="Agregar persona" :fullScreenOnMobile="true" @close="showAddPersonModal = false">
      <div class="space-y-4">
        <AppInput v-model="addPersonForm.full_name" label="Nombre completo" :required="true" />
        <AppFormGrid :columns="2">
          <AppSelect
            v-model="addPersonForm.document_type"
            label="Tipo de documento"
            :options="[{ value: 'cedula', label: 'Cédula' }, { value: 'passport', label: 'Pasaporte' }, { value: 'dni', label: 'DNI' }, { value: 'foreign_id', label: 'Documento extranjero' }]"
          />
          <AppInput v-model="addPersonForm.document_number" label="Número de documento" />
        </AppFormGrid>
        <AppFormGrid :columns="2">
          <AppDatePicker v-model="addPersonForm.arrival_date" label="Fecha de ingreso" hint="Opcional" />
          <AppDatePicker v-model="addPersonForm.departure_date" label="Fecha de salida" hint="Opcional" />
        </AppFormGrid>
        <AppSelect
          v-model="addPersonForm.category"
          label="Categoría"
          :options="ageCategoryOptions"
        />
        <p v-if="addPersonError" class="text-sm text-red-600 rounded-md border border-red-200 bg-red-50 px-3 py-2">{{ addPersonError }}</p>
        <div class="safe-area-bottom flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" :disabled="addPersonSaving" @click="showAddPersonModal = false">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="addPersonSaving" @click="submitAddPerson">
            {{ addPersonSaving ? 'Guardando...' : 'Agregar persona' }}
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal :isOpen="showEditUnitsModal" title="Editar unidades" :fullScreenOnMobile="true" @close="closeEditUnitsModal">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Selecciona las unidades para esta reserva. Se validará disponibilidad en el mismo rango de fechas.
        </p>

        <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p class="text-xs uppercase tracking-wide text-gray-500">Rango de estadía</p>
          <p class="text-sm font-medium text-gray-800">
            {{ formatDate(res?.check_in) }} → {{ formatDate(res?.check_out) }}
          </p>
        </div>

        <div class="max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
          <p v-if="editUnitsLoading" class="text-sm text-gray-500">Cargando unidades...</p>
          <p v-else-if="editUnitsAvailable.length === 0" class="text-sm text-gray-500">
            No hay unidades activas disponibles en esta sede.
          </p>

          <label
            v-for="unit in editUnitsAvailable"
            :key="unit.id"
            class="flex items-center gap-2 text-sm text-gray-700"
          >
            <input
              v-model="editUnitsSelection"
              type="checkbox"
              :value="unit.id"
              class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            >
            <span>{{ unit.name }}</span>
          </label>
        </div>

        <div
          v-if="editUnitsUnavailableNames.length > 0"
          class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          No disponibles en el rango seleccionado: {{ editUnitsUnavailableNames.join(', ') }}
        </div>

        <p v-if="editUnitsErrorMessage" class="text-sm text-red-600">{{ editUnitsErrorMessage }}</p>

        <div class="safe-area-bottom flex justify-end gap-2 border-t pt-4">
          <button type="button" class="btn-secondary" :disabled="editUnitsSaving" @click="closeEditUnitsModal">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="editUnitsSaving" @click="submitEditUnits">
            {{ editUnitsSaving ? 'Guardando...' : 'Guardar unidades' }}
          </button>
        </div>
      </div>
    </BaseModal>

    <PaymentModal
      v-if="res"
      :isOpen="showPaymentModal"
      :reservationId="res.id"
      :totalAmount="Number(res.total_amount || 0)"
      :paidAmount="Number(res.paid_amount || 0)"
      @close="closePaymentModal"
      @saved="handlePaymentSaved"
    />

    <ConfirmActionModal
      :isOpen="showDeletePaymentModal"
      title="Eliminar pago"
      :message="deletePaymentMessage"
      confirmLabel="Eliminar"
      :loading="deletingPayment"
      @close="closeDeletePaymentModal"
      @confirm="confirmDeletePayment"
    />

    <CheckinModal
      v-if="res"
      :isOpen="showCheckinModal"
      :reservation="res"
      @close="showCheckinModal = false"
      @saved="fetchReservation"
    />

    <CheckoutModal
      v-if="res"
      :isOpen="showCheckoutModal"
      :reservation="res"
      @close="showCheckoutModal = false"
      @saved="fetchReservation"
    />

    <FinalizeModal
      v-if="res"
      :isOpen="showFinalizeModal"
      :reservation="res"
      @close="showFinalizeModal = false"
      @saved="fetchReservation"
    />

    <ConfirmActionModal
      :isOpen="showDeleteReservationModal"
      title="Eliminar reserva"
      message="Esta acción elimina el registro del sistema. Solo úsala si la reserva fue creada por error. No se puede deshacer."
      confirmLabel="Eliminar"
      :loading="deletingReservation"
      :error="deleteReservationError"
      @close="showDeleteReservationModal = false"
      @confirm="confirmDeleteReservation"
    />

    <StatusChangeModal
      v-if="res"
      :isOpen="showStatusModal"
      :reservationId="res.id"
      :currentStatus="res.status"
      :guestName="guestDisplayName"
      :hasGuest="Boolean(res.guest_id)"
      :initialStatus="statusModalInitialStatus"
      @close="closeStatusModal"
      @updated="handleStatusUpdated"
    />

    <MessagesPanel
      v-model="showMessagesPanel"
      mode="reservation"
      :reservation="res"
      :profile="profile"
      :accountSettings="accountSettings"
      :systemSettings="systemMessageSettings"
      :messages="predefinedMessages"
      :voucherConditions="String(accountSettings?.voucher_conditions || '')"
      @copied="toast.success('Mensaje copiado al portapapeles.')"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { useReservationsStore } from '../stores/reservations'
import ReservationBadge from '../components/ui/ReservationBadge.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import ConfirmActionModal from '../components/ui/ConfirmActionModal.vue'
import PreRegistroForm from '../components/preregistro/PreRegistroForm.vue'
import PaymentModal from '../components/payments/PaymentModal.vue'
import StatusChangeModal from '../components/reservations/StatusChangeModal.vue'
import CheckinModal from '../components/reservations/CheckinModal.vue'
import CheckoutModal from '../components/reservations/CheckoutModal.vue'
import FinalizeModal from '../components/reservations/FinalizeModal.vue'
import { getFinalizationReasonLabel } from '../utils/reservationUtils'
import MessagesPanel from '../components/messages/MessagesPanel.vue'
import { completeReservationPreregistro } from '../services/preregistro'
import { getCommissionSummary, getReservationGuestName, getReservationGuestPhone } from '../utils/reservations'
import { formatReferenceDisplay } from '../utils/referenceUtils'
import { usePermissions } from '../composables/usePermissions'
import { useAccountStore } from '../stores/account'
import { useToast } from '../composables/useToast'
import { useBreakpoint } from '../composables/useBreakpoint'
import { notifyCheckinRealizado } from '../services/notificationService'
import { getMessageSettings, getPredefinedMessages } from '../services/messageSettingsService'
import { resolveTemplate } from '../utils/messageUtils'
import { DEFAULT_PREREGISTRO_TEMPLATE, formatDateLongEs } from '../utils/voucherUtils'
import { syncReservationOccupancy } from '../services/reservationService'
import { useAgeCategorySettings } from '../composables/useAgeCategorySettings'
import { AppInput, AppSelect, AppDatePicker, AppFormGrid } from '../components/ui/forms'

const route = useRoute()
const router = useRouter()
const reservationsStore = useReservationsStore()
const accountStore = useAccountStore()
const { can, role } = usePermissions()
const { isMobile } = useBreakpoint()
const toast = useToast()
const { activeCategories, ageCategoryLabels, loadAgeCategorySettings } = useAgeCategorySettings()
const loading = ref(true)
const res = ref(null)
const payments = ref([])
const showStatusModal = ref(false)
const statusModalInitialStatus = ref('')
const showPreregistroModal = ref(false)
const preregistroSubmitting = ref(false)
const preregistroErrorMessage = ref('')
const showEditUnitsModal = ref(false)
const editUnitsLoading = ref(false)
const editUnitsSaving = ref(false)
const editUnitsErrorMessage = ref('')
const editUnitsAvailable = ref([])
const editUnitsSelection = ref([])
const editUnitsUnavailableNames = ref([])
const showPaymentModal = ref(false)
const showDeletePaymentModal = ref(false)
const deletingPayment = ref(false)
const selectedPayment = ref(null)
const showCheckinModal = ref(false)
const showCheckoutModal = ref(false)
const showFinalizeModal = ref(false)
const showCheckinConfirmModal = ref(false)
const checkinSubmitting = ref(false)
const occupancyRowCount = ref(0)
const syncingOccupancy = ref(false)
const showMessagesPanel = ref(false)
const showRegisteredGuests = ref(false)
const regeneratingLink = ref(false)
const showDeleteReservationModal = ref(false)
const deletingReservation = ref(false)
const deleteReservationError = ref('')
const showAddPersonModal = ref(false)
const addPersonSaving = ref(false)
const addPersonError = ref('')
const addPersonForm = ref({ full_name: '', document_type: 'cedula', document_number: '', arrival_date: '', departure_date: '', category: 'adult' })
const profile = ref({})
const accountSettings = ref({})
const predefinedMessages = ref([])
const systemMessageSettings = ref({})

const isSyncMissing = computed(() =>
  res.value != null
  && res.value.status !== 'cancelled'
  && occupancyRowCount.value === 0
)

const isEditLocked = computed(() =>
  ['in_stay', 'completed', 'finalized'].includes(res.value?.status)
)

onMounted(async () => {
  await Promise.all([fetchReservation(), loadAgeCategorySettings()])
})

const fetchReservation = async () => {
  loading.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()
    const [
      { data, error },
      { data: profileData },
      { data: settingsData },
      loadedMessageSettings,
      loadedMessages,
    ] = await Promise.all([
      supabase
        .from('reservations')
        .select('*, source_detail_info:source_details!reservations_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active), guests!reservations_guest_id_fkey(*), venues(name), reservation_units(unit_id, units(*)), reservation_guests(is_primary, guest_id, arrival_date, departure_date, category, added_post_checkin, guests!reservation_guests_guest_id_fkey(*))')
        .eq('account_id', accountId)
        .eq('id', route.params.id)
        .single(),
      supabase
        .from('account_profile')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('settings')
        .select('voucher_conditions, property_name, price_general_min')
        .eq('account_id', accountId)
        .maybeSingle(),
      getMessageSettings(accountId),
      getPredefinedMessages(accountId),
    ])

    if (error) throw error

    profile.value = profileData || {}
    accountSettings.value = settingsData || {}
    systemMessageSettings.value = loadedMessageSettings || {}
    predefinedMessages.value = loadedMessages || []
      
    if (data) {
      res.value = data
      await fetchPayments()
      // Check occupancy sync status
      const accountId2 = accountStore.getRequiredAccountId()
      const { count } = await supabase
        .from('occupancies')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId2)
        .eq('reservation_id', route.params.id)
        .eq('occupancy_type', 'reservation')
      occupancyRowCount.value = count ?? 0
    }
  } catch (err) {
    res.value = null
    console.error(err)
  } finally {
    loading.value = false
  }
}

const syncOccupancy = async () => {
  syncingOccupancy.value = true
  try {
    const r = await reservationsStore.retryReservationOccupancySync(res.value.id)
    if (r.synced) {
      occupancyRowCount.value = 1
      toast.success('Ocupación sincronizada correctamente.')
    } else {
      toast.error('No se pudo sincronizar la ocupación. Intenta de nuevo más tarde.')
    }
  } finally {
    syncingOccupancy.value = false
  }
}

const fetchPayments = async () => {
  const accountId = accountStore.getRequiredAccountId()
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('account_id', accountId)
    .eq('reservation_id', res.value.id)
    .order('payment_date', { ascending: false })
  payments.value = data || []
}

// Computeds
const nightsCount = computed(() => {
  if (!res.value?.check_in || !res.value?.check_out) return 0
  const start = new Date(res.value.check_in)
  const end = new Date(res.value.check_out)
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
})

const isCheckoutDay = computed(() => {
  if (!res.value?.check_out) return false
  const today = new Date().toISOString().slice(0, 10)
  return res.value.check_out.slice(0, 10) <= today
})

const totalPaid = computed(() => {
  return Number(res.value?.paid_amount || 0)
})

const guestDisplayName = computed(() => getReservationGuestName(res.value))
const guestDisplayPhone = computed(() => getReservationGuestPhone(res.value))
const reservationReferenceDisplay = computed(() => formatReferenceDisplay(res.value?.reference_code, guestDisplayName.value))

const whatsappGuestUrl = computed(() => {
  const guest = res.value?.guests
  if (!guest?.phone) return null
  const digits = `${guest.phone_country_code || ''}${guest.phone}`.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
})

const guestDocumentLabel = computed(() => {
  if (!res.value?.guests?.document_number) {
    return 'Sin documento'
  }

  return [res.value.guests.document_type, res.value.guests.document_number].filter(Boolean).join(' · ')
})

const commissionSummary = computed(() => getCommissionSummary(res.value))

const unitNames = computed(() => {
  return (res.value?.reservation_units || [])
    .map(ru => ru.units?.name)
    .filter(Boolean)
    .join(', ')
})

const currentUnitIds = computed(() => {
  return (res.value?.reservation_units || []).map((row) => row.unit_id).filter(Boolean)
})

const remainingBalance = computed(() => {
  const bal = Number(res.value?.total_amount || 0) - Number(res.value?.paid_amount || 0)
  return bal > 0 ? bal : 0
})

const initialPreregistroGuests = computed(() => {
  const guests = (res.value?.reservation_guests || [])
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map(item => item.guests)
    .filter(Boolean)

  if (guests.length > 0) {
    return guests
  }

  if (res.value?.guests) {
    return [res.value.guests]
  }

  return [{
    name: res.value?.guests?.name || '',
    phone: '',
    email: '',
    nationality: '',
    document_type: '',
    document_number: ''
  }]
})

const preregistroGuestsCount = computed(() => {
  const total = Number(res.value?.adults || 0) + Number(res.value?.minors || 0) + Number(res.value?.children || 0) + Number(res.value?.infants || 0)
  return total > 0 ? total : 1
})

const preregistroPrimaryGuest = computed(() => {
  return initialPreregistroGuests.value[0] || {
    name: res.value?.guests?.name || '',
    phone: '',
    email: '',
    nationality: '',
    document_type: '',
    document_number: '',
  }
})

const preregistroAdditionalGuests = computed(() => {
  return initialPreregistroGuests.value.slice(1)
})

const registeredGuests = computed(() => {
  return (res.value?.reservation_guests || [])
    .map((row) => ({
      id: row.guest_id || row.guests?.id,
      is_primary: Boolean(row.is_primary),
      name: row.guests?.name || '-',
      nationality: row.guests?.nationality || '',
      email: row.guests?.email || '',
      document_type: row.guests?.document_type || '',
      document_number: row.guests?.document_number || '',
      birth_date: row.guests?.birth_date || '',
      documentLabel: [row.guests?.document_type, row.guests?.document_number].filter(Boolean).join(' ') || 'Sin documento',
    }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
})

const preregistroEval = computed(() => {
  const guestsCount = (Number(res.value?.adults || 0) + Number(res.value?.minors || 0) + Number(res.value?.children || 0) + Number(res.value?.infants || 0)) || 1
  const companionsExpected = Math.max(0, guestsCount - 1)
  const guests = registeredGuests.value
  const primary = guests.find((g) => g.is_primary)
  const companions = guests.filter((g) => !g.is_primary)
  const primaryComplete = Boolean(
    primary?.name && primary?.document_type && primary?.document_number &&
    primary?.email && primary?.nationality && primary?.birth_date,
  )
  const companionsRegistered = companions.length
  const isComplete = primaryComplete && companionsRegistered >= companionsExpected
  return { isComplete, primaryComplete, companionsExpected, companionsRegistered }
})

const preregistroReservation = computed(() => ({
  venue_name: res.value?.venues?.name || 'Alojamiento',
  check_in: res.value?.check_in,
  check_out: res.value?.check_out,
  guests_count: Number(res.value?.adults || 0) + Number(res.value?.minors || 0) + Number(res.value?.children || 0) + Number(res.value?.infants || 0) || 1,
}))

const canViewFinancial = computed(() => {
  return can('payments', 'view') || can('reports', 'view_financial')
})

const canViewPayments = computed(() => can('payments', 'view'))

const ageCategoryOptions = computed(() => {
  const opts = [{ value: 'adult', label: ageCategoryLabels.value.adult || 'Adulto' }]
  if (activeCategories.value.includes('minors')) opts.push({ value: 'minors', label: ageCategoryLabels.value.minors || 'Menor' })
  if (activeCategories.value.includes('children')) opts.push({ value: 'children', label: ageCategoryLabels.value.children || 'Niño' })
  if (activeCategories.value.includes('infants')) opts.push({ value: 'infants', label: ageCategoryLabels.value.infants || 'Bebé' })
  return opts
})

const postCheckinGuests = computed(() => {
  return (res.value?.reservation_guests || [])
    .filter(row => row.added_post_checkin === true)
    .map(row => ({
      id: row.guest_id,
      fullName: row.guests?.name || row.guests?.first_name || '-',
      documentLabel: [row.guests?.document_type, row.guests?.document_number].filter(Boolean).join(' ') || 'Sin documento',
      categoryLabel: ageCategoryLabels.value?.[row.category] || row.category || 'Adulto',
      arrival_date: row.arrival_date,
      departure_date: row.departure_date,
    }))
})

const deletePaymentMessage = computed(() => {
  if (!selectedPayment.value) return ''
  return `¿Eliminar este pago de $${formatCurrency(selectedPayment.value.amount)} registrado el ${formatDate(selectedPayment.value.payment_date)}?`
})

const checkinConfirmationMessage = computed(() => {
  const nowLabel = formatDateTime(new Date().toISOString())
  return `¿Confirmar llegada de ${guestDisplayName.value}?\nHora de registro: ${nowLabel}`
})

// Formatting
const formatDate = (ds) => {
  if(!ds) return '-'
  return new Date(ds).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const formatCurrency = (val) => Number(val).toLocaleString('es-CO')

const formatCop = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
}).format(Number(value || 0))

const formatDateTime = (ds) => {
  if (!ds) return '-'
  return new Date(ds).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const parseFunctionError = async (error) => {
  if (!error) return 'Ocurrió un error inesperado.'

  if (typeof error.context?.json === 'function') {
    const payload = await error.context.json()
    return payload.message || 'Ocurrió un error inesperado.'
  }

  return error.message || 'Ocurrió un error inesperado.'
}

// Interactions
const openPaymentModal = () => {
  showPaymentModal.value = true
}
const openStatusModal = () => {
  statusModalInitialStatus.value = ''
  showStatusModal.value = true
}
const openCancelModal = () => {
  statusModalInitialStatus.value = 'cancelled'
  showStatusModal.value = true
}

const confirmDeleteReservation = async () => {
  if (!res.value) return
  deletingReservation.value = true
  deleteReservationError.value = ''
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { error } = await supabase
      .from('reservations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', res.value.id)
      .eq('account_id', accountId)
    if (error) throw error

    // Limpiar occupancy (best-effort, igual que al cancelar)
    try { await syncReservationOccupancy(res.value.id) } catch (e) { /* silencioso */ }

    router.push('/reservas')
  } catch (err) {
    deleteReservationError.value = err.message || 'Error al eliminar la reserva.'
  } finally {
    deletingReservation.value = false
  }
}

const submitAddPerson = async () => {
  if (!res.value) return
  addPersonError.value = ''
  if (!addPersonForm.value.full_name?.trim()) {
    addPersonError.value = 'El nombre es requerido.'
    return
  }
  addPersonSaving.value = true
  try {
    const accountId = accountStore.getRequiredAccountId()

    // Crear o buscar el guest
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .insert({
        account_id: accountId,
        name: addPersonForm.value.full_name.trim(),
        document_type: addPersonForm.value.document_type || null,
        document_number: addPersonForm.value.document_number?.trim() || null,
      })
      .select('id')
      .single()
    if (guestError) throw guestError

    // Registrar en reservation_guests como post-checkin
    const { error: rgError } = await supabase
      .from('reservation_guests')
      .insert({
        reservation_id: res.value.id,
        guest_id: guestData.id,
        account_id: accountId,
        is_primary: false,
        added_post_checkin: true,
        arrival_date: addPersonForm.value.arrival_date || null,
        departure_date: addPersonForm.value.departure_date || null,
        category: addPersonForm.value.category || 'adult',
      })
    if (rgError) throw rgError

    await fetchReservation()
    showAddPersonModal.value = false
    addPersonForm.value = { full_name: '', document_type: 'cedula', document_number: '', arrival_date: '', departure_date: '', category: 'adult' }
    toast.success('Persona agregada correctamente.')
  } catch (err) {
    addPersonError.value = err.message || 'Error al agregar la persona.'
  } finally {
    addPersonSaving.value = false
  }
}
const openVoucher = () => {
  if (!res.value?.id) return
  router.push(`/reservas/${res.value.id}/voucher`)
}

const goBackToReservations = () => {
  if (window.history.state?.back) {
    router.back()
    return
  }

  router.push('/reservas')
}

const closePaymentModal = () => {
  showPaymentModal.value = false
}

const closeStatusModal = () => {
  showStatusModal.value = false
  statusModalInitialStatus.value = ''
}

const handleStatusUpdated = async () => {
  await fetchReservation()
}

const handlePaymentSaved = async () => {
  await fetchReservation()
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
  return paidAmount
}

const openDeletePaymentModal = (payment) => {
  selectedPayment.value = payment
  showDeletePaymentModal.value = true
}

const closeDeletePaymentModal = () => {
  if (deletingPayment.value) return
  showDeletePaymentModal.value = false
  selectedPayment.value = null
}

const openCheckinConfirmModal = () => {
  if (!res.value) return
  showCheckinConfirmModal.value = true
}

const closeCheckinConfirmModal = () => {
  if (checkinSubmitting.value) return
  showCheckinConfirmModal.value = false
}

const confirmDeletePayment = async () => {
  if (!selectedPayment.value || !res.value) return

  deletingPayment.value = true

  try {
    const accountId = accountStore.getRequiredAccountId()

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('account_id', accountId)
      .eq('id', selectedPayment.value.id)

    if (error) throw error

    await recalculatePaidAmount(res.value.id, accountId)
    await fetchReservation()

    toast.success('Pago eliminado correctamente')
    closeDeletePaymentModal()
  } catch (error) {
    toast.error(error.message || 'No se pudo eliminar el pago.')
  } finally {
    deletingPayment.value = false
  }
}

const validateEditUnitsSelection = async () => {
  editUnitsUnavailableNames.value = []

  if (!res.value || editUnitsSelection.value.length === 0) return

  const availability = await reservationsStore.getUnitAvailability(
    editUnitsSelection.value,
    res.value.check_in,
    res.value.check_out,
    res.value.id
  )

  if (availability.unavailableUnitIds.length === 0) return

  editUnitsUnavailableNames.value = editUnitsAvailable.value
    .filter((unit) => availability.unavailableUnitIds.includes(unit.id))
    .map((unit) => unit.name)
}

const openEditUnitsModal = async () => {
  if (!res.value?.venue_id) {
    toast.error('No se pudo identificar la sede de la reserva.')
    return
  }

  editUnitsErrorMessage.value = ''
  editUnitsUnavailableNames.value = []
  editUnitsSaving.value = false
  editUnitsLoading.value = true
  showEditUnitsModal.value = true

  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error } = await supabase
      .from('units')
      .select('id, name, is_active')
      .eq('account_id', accountId)
      .eq('venue_id', res.value.venue_id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    editUnitsAvailable.value = data || []
    editUnitsSelection.value = currentUnitIds.value.slice()
    await validateEditUnitsSelection()
  } catch (err) {
    editUnitsErrorMessage.value = err.message
  } finally {
    editUnitsLoading.value = false
  }
}

const closeEditUnitsModal = () => {
  if (editUnitsSaving.value) return
  showEditUnitsModal.value = false
  editUnitsErrorMessage.value = ''
  editUnitsUnavailableNames.value = []
}

const submitEditUnits = async () => {
  editUnitsErrorMessage.value = ''

  if (!res.value) {
    editUnitsErrorMessage.value = 'No se encontró la reserva para actualizar.'
    return
  }

  if (editUnitsSelection.value.length === 0) {
    editUnitsErrorMessage.value = 'Selecciona al menos una unidad.'
    return
  }

  await validateEditUnitsSelection()
  if (editUnitsUnavailableNames.value.length > 0) {
    editUnitsErrorMessage.value = 'Hay unidades sin disponibilidad en el rango actual.'
    return
  }

  editUnitsSaving.value = true

  try {
    const result = await reservationsStore.updateReservationUnits(res.value.id, editUnitsSelection.value)
    await fetchReservation()
    showEditUnitsModal.value = false

    if (result?.syncResult?.synced === false) {
      toast.error('Se actualizaron las unidades, pero falló la sincronización de ocupación.')
      return
    }

    toast.success('Unidades actualizadas correctamente.')
  } catch (err) {
    editUnitsErrorMessage.value = err.message
  } finally {
    editUnitsSaving.value = false
  }
}

const closePreregistroModal = () => {
  if (preregistroSubmitting.value) return
  showPreregistroModal.value = false
  preregistroErrorMessage.value = ''
}

watch(
  () => editUnitsSelection.value.slice(),
  async () => {
    if (!showEditUnitsModal.value) return
    await validateEditUnitsSelection()
  }
)

const regeneratePreregistroLink = async () => {
  regeneratingLink.value = true
  try {
    const { data, error } = await supabase.functions.invoke('generate-preregistro-token', {
      body: { reservation_id: res.value.id, regenerate: true },
    })
    if (error) {
      toast.error(await parseFunctionError(error))
      return
    }
    const rawPath = String(data?.checkin_url || '')
    const appOrigin = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
    const fullUrl = rawPath.startsWith('http') ? rawPath : `${appOrigin}${rawPath}`
    await navigator.clipboard.writeText(fullUrl)
    toast.success('Link regenerado correctamente y copiado al portapapeles')
  } catch {
    toast.error('No se pudo regenerar el link.')
  } finally {
    regeneratingLink.value = false
  }
}

const copyWhatsappPreregistroMessage = async () => {
  const { data, error } = await supabase.functions.invoke('generate-preregistro-token', {
    body: { reservation_id: res.value.id },
  })

  if (error) {
    toast.error(await parseFunctionError(error))
    return
  }

  const rawPath = String(data?.checkin_url || '')
  const appOrigin = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
  const link_preregistro = rawPath.startsWith('http') ? rawPath : `${appOrigin}${rawPath}`

  const preregistroBody = predefinedMessages.value.find((m) => m.key === 'preregistro')?.body || DEFAULT_PREREGISTRO_TEMPLATE

  const vars = {
    nombres: res.value?.guests?.first_name || '-',
    apellidos: res.value?.guests?.last_name || '-',
    nombre_huesped: [res.value?.guests?.first_name, res.value?.guests?.last_name].filter(Boolean).join(' ') || '-',
    nombre_alojamiento: profile.value?.commercial_name || profile.value?.legal_name || 'Alojamiento',
    fecha_checkin_larga: formatDateLongEs(res.value?.check_in),
    link_preregistro,
    telefono: profile.value?.phone || '-',
  }

  const { text } = resolveTemplate(preregistroBody, vars)
  await navigator.clipboard.writeText(text)
  toast.success('Mensaje copiado al portapapeles')
}

const copyPreregistroLink = async () => {
  const { data, error } = await supabase.functions.invoke('generate-preregistro-token', {
    body: {
      reservation_id: res.value.id,
    }
  })

  if (error) {
    toast.error(await parseFunctionError(error))
    return
  }

  const rawPath = String(data?.checkin_url || '')
  const appOrigin = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
  const fullUrl = rawPath.startsWith('http') ? rawPath : `${appOrigin}${rawPath}`

  await navigator.clipboard.writeText(fullUrl)
  toast.success('Link copiado al portapapeles')
}

const handleAdminPreregistroSubmit = async ({ primary_guest, additional_guests }) => {
  preregistroSubmitting.value = true
  preregistroErrorMessage.value = ''

  try {
    const guests = [primary_guest, ...(Array.isArray(additional_guests) ? additional_guests : [])]
    await completeReservationPreregistro({ reservationId: res.value.id, guests })
    await fetchReservation()
    showPreregistroModal.value = false
    toast.success('Pre-registro completado correctamente')
  } catch (error) {
    preregistroErrorMessage.value = error.message
  } finally {
    preregistroSubmitting.value = false
  }
}

const confirmCheckin = async () => {
  if (!res.value?.guest_id) {
    toast.error('Debes vincular un huésped registrado antes de marcar la llegada física.')
    return
  }

  checkinSubmitting.value = true

  try {
    const accountId = accountStore.getRequiredAccountId()
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        checkin_at: new Date().toISOString(),
        status: 'in_stay'
      })
      .eq('account_id', accountId)
      .eq('id', res.value.id)

    if (updateError) throw updateError

    const { error: logError } = await supabase
      .from('reservation_status_logs')
      .insert({
        account_id: accountId,
        reservation_id: res.value.id,
        previous_status: res.value.status,
        new_status: 'in_stay',
        notes: 'Check-in físico registrado'
      })

    if (logError) throw logError

    await fetchReservation()
    try { await notifyCheckinRealizado(accountId, res.value) } catch (e) { /* silencioso */ }
    closeCheckinConfirmModal()
    toast.success('Llegada registrada')
  } catch (error) {
    toast.error(error.message || 'No se pudo registrar la llegada.')
  } finally {
    checkinSubmitting.value = false
  }
}

</script>











