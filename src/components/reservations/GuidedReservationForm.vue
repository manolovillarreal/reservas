<template>
  <div :class="inModal ? 'space-y-6' : 'space-y-6 max-w-2xl mx-auto'">

    <!-- Step progress indicator -->
    <nav class="flex items-center gap-1 text-sm" aria-label="Pasos del formulario">
      <template v-for="(step, i) in navSteps" :key="step.n">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded px-2 py-1 transition-colors"
          :class="stepButtonClass(step.n)"
          :disabled="step.n > maxReachedStep"
          @click="goToStep(step.n)"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            :class="stepCircleClass(step.n)"
          >{{ i + 1 }}</span>
          <span class="hidden sm:inline">{{ step.label }}</span>
        </button>
        <span v-if="i < navSteps.length - 1" class="text-gray-300">›</span>
      </template>
    </nav>

    <!-- ── STEP 1: Fechas ─────────────────────────── -->
    <template v-if="currentStep === 1">
      <p v-if="props.initialCheckIn && props.initialCheckOut" class="text-xs text-gray-400 rounded border border-gray-200 bg-gray-50 px-3 py-2">
        📅 Pre-cargado desde el widget – puedes ajustar antes de continuar.
      </p>

      <AppFormSection title="Fechas y personas" :divider="true">
        <AppDateRangePicker
          v-model="step1DateRange"
          label-start="Check-in"
          label-end="Check-out"
          :min-date="todayIso"
          :error-start="s1Touched.check_in && !form.check_in ? 'Requerido' : ''"
          :error-end="s1Touched.check_out ? checkOutError : ''"
          @update:modelValue="onDatesChange"
          @blur="onStep1DateBlur"
        />

        <!-- Personas — responsive: fila horizontal en sm+, una por fila en mobile -->
        <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] sm:gap-3">
          <!-- Adultos -->
          <div class="flex min-h-[44px] items-center justify-between py-1.5 sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:py-2">
            <div class="sm:text-center">
              <p class="text-sm font-medium text-gray-700">Adultos</p>
              <p class="text-xs text-gray-400">+18 años</p>
            </div>
            <AppCounter v-model="form.adults" :min="1" :max="20" size="sm" />
          </div>

          <!-- Menores -->
          <div
            v-if="activeCategories.includes('minors')"
            class="flex min-h-[44px] items-center justify-between py-1.5 sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:py-2"
          >
            <div class="sm:text-center">
              <p class="text-sm font-medium text-gray-700">Menores</p>
              <p class="text-xs text-gray-400">{{ categoryInfos.minors.range }}</p>
            </div>
            <AppCounter v-model="form.minors" :min="0" :max="20" size="sm" />
          </div>

          <!-- Niños -->
          <div
            v-if="activeCategories.includes('children')"
            class="flex min-h-[44px] items-center justify-between py-1.5 sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:py-2"
          >
            <div class="sm:text-center">
              <p class="text-sm font-medium text-gray-700">Niños</p>
              <p class="text-xs text-gray-400">{{ categoryInfos.children.range }}</p>
            </div>
            <AppCounter v-model="form.children" :min="0" :max="20" size="sm" />
          </div>

          <!-- Bebés -->
          <div
            v-if="activeCategories.includes('infants')"
            class="flex min-h-[44px] items-center justify-between py-1.5 sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:py-2"
          >
            <div class="sm:text-center">
              <p class="text-sm font-medium text-gray-700">Bebés</p>
              <p class="text-xs text-gray-400">{{ categoryInfos.infants.range }}</p>
            </div>
            <AppCounter v-model="form.infants" :min="0" :max="20" size="sm" />
          </div>
        </div>

        <p v-if="nights > 0" class="text-sm text-gray-500">
          {{ nights }} noche{{ nights !== 1 ? 's' : '' }}
        </p>

        <p class="text-sm text-gray-500">
          Total de personas: <strong class="text-gray-900">{{ totalPersonas }}</strong>
        </p>
      </AppFormSection>

      <!-- Availability results (post-check) -->
      <template v-if="avail.checked.value && !avail.loading.value">
        <AppInlineAlert
          v-if="avail.available.value.length === 0"
          type="warning"
          :message="availabilityWarningMessage"
        />
        <p v-else class="text-sm font-semibold text-emerald-700">
          ✓ {{ avail.available.value.length }} {{ avail.available.value.length === 1 ? 'unidad disponible' : 'unidades disponibles' }}
        </p>
      </template>

      <AppInlineAlert v-if="avail.error.value" type="error" :message="avail.error.value" />

      <div class="flex items-center gap-3">
        <button
          type="button"
          class="btn-primary"
          :disabled="!canProceedStep1 || avail.loading.value"
          @click="advanceStep1"
        >
          {{ avail.loading.value ? 'Verificando…' : 'Continuar' }}
        </button>
      </div>
    </template>

    <!-- ── STEP 2: Sede ──────────────────────────── -->
    <template v-if="currentStep === 2">
      <AppFormSection title="¿En qué sede?" :divider="true">
        <div class="space-y-2">
          <label
            v-for="venue in availableVenues"
            :key="venue.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
            :class="form.venue_id === venue.id ? 'border-primary/40 bg-primary/5' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input type="radio" :value="venue.id" v-model="form.venue_id" class="accent-primary" />
            <div>
              <p class="font-medium text-gray-900 text-sm">{{ venue.name }}</p>
              <p class="text-xs text-gray-400">{{ venue.count }} {{ venue.count === 1 ? 'unidad disponible' : 'unidades disponibles' }}</p>
            </div>
          </label>
        </div>
      </AppFormSection>

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="goToStep(1)">Atrás</button>
        <button type="button" class="btn-primary" :disabled="!form.venue_id" @click="goToStep(3)">Continuar</button>
      </div>
    </template>

    <!-- ── STEP 3: Huésped ──────────────────────── -->
    <template v-if="currentStep === 3">
      <AppFormSection title="Datos del huésped" :divider="true">
        <!-- Huésped existente indicador -->
        <div v-if="form.guest_id" class="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-1.5 text-xs text-primary">
          <span>Huésped existente</span>
          <div class="ml-auto flex items-center gap-3">
            <button type="button" class="underline hover:text-primary/70" @click="openEditGuestModal">Editar</button>
            <button type="button" class="underline hover:text-primary/70" @click="clearGuestSelection">Limpiar</button>
          </div>
        </div>

        <!-- Nombre con búsqueda integrada -->
        <AppFormGrid :columns="2">
            <div class="relative">
              <AppInput
                v-model="form.guest_first_name"
                label="Nombres"
                required
                :disabled="!!form.guest_id"
                hint="Escribe para buscar huéspedes existentes"
                :error="s3Touched.guest_first_name && !form.guest_first_name?.trim() ? 'El nombre es obligatorio.' : ''"
                @focus="guestSearchOpen = true"
                @blur="() => { s3Touched.guest_first_name = true; setTimeout(() => { guestSearchOpen = false }, 200) }"
              />
              <div
                v-if="guestSearchOpen && guestSearchResults.length > 0"
                class="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                <button
                  v-for="g in guestSearchResults"
                  :key="g.id"
                  type="button"
                  class="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  @mousedown.prevent
                  @click="selectGuest(g)"
                >
                  <span class="font-medium text-gray-900">{{ `${g.first_name || ''} ${g.last_name || ''}`.trim() }}</span>
                  <span class="text-xs text-gray-400">{{ g.phone || 'Sin teléfono' }}<span v-if="g.email"> · {{ g.email }}</span></span>
                </button>
              </div>
            </div>
            <AppInput
              v-model="form.guest_last_name"
              label="Apellidos"
              hint="Opcional"
            />
          </AppFormGrid>

          <AppFormGrid :columns="2">
            <AppPhoneInput
              :countryCode="form.guest_phone_country_code"
              :phoneNumber="form.guest_phone"
              label="Teléfono"
              :error="s3Touched.guest_phone && !form.guest_phone?.trim() ? 'El teléfono es obligatorio.' : ''"
              @update:countryCode="form.guest_phone_country_code = $event"
              @update:phoneNumber="e => { form.guest_phone = e; s3Touched.guest_phone = true }"
            />
            <AppInput
              v-model="form.guest_email"
              label="Email"
              type="email"
              hint="Opcional"
            />
          </AppFormGrid>

          <AppCountrySelect
            v-model="form.guest_nationality"
            label="Nacionalidad"
            hint="Opcional"
          />

          <AppFormGrid :columns="2">
            <AppSelect
              v-model="form.guest_document_type"
              label="Tipo de documento"
              :options="documentTypeOptions"
              placeholder="Sin definir"
              hint="Opcional"
            />
            <AppInput
              v-model="form.guest_document_number"
              label="Número de documento"
              hint="Opcional"
            />
          </AppFormGrid>

          <AppSelect
            v-model="form.guest_gender"
            label="Género"
            :options="[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' }, { value: 'unspecified', label: 'Prefiero no indicar' }]"
            placeholder="Sin definir"
            hint="Opcional"
          />

          <AppDatePicker v-model="form.guest_birth_date" label="Fecha de nacimiento" hint="Opcional" />

        <AppTextarea
          v-model="form.notes"
          label="Notas internas"
          :rows="2"
          :autoResize="true"
          hint="Opcional"
        />
      </AppFormSection>

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="prevFromStep3">Atrás</button>
        <button type="button" class="btn-primary" :disabled="!canProceedStep3" @click="advanceToStep4">Continuar</button>
      </div>
    </template>

    <!-- ── STEP 4: Origen ───────────────────────── -->
    <template v-if="currentStep === 4">
      <AppFormSection title="Canal de origen" :divider="true">
        <SourceSelector
          :modelValue="{ sourceTypeId: form.source_type_id, sourceDetailId: form.source_detail_id, sourceName: form.source_name }"
          @update:modelValue="onSourceChange"
          @suggestions="onSourceSuggestions"
        />
        <p v-if="s4Touched.source_type_id && sourceRequired" class="mt-1 text-sm text-red-600">El canal de origen es obligatorio.</p>
        <div v-if="Number(form.commission_percentage) > 0" class="mt-2 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Comisión sugerida: {{ form.commission_percentage }}%
        </div>
      </AppFormSection>

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="goToStep(3)">Atrás</button>
        <button type="button" class="btn-primary" @click="advanceStep4">Continuar</button>
      </div>
    </template>

    <!-- ── STEP 5: Paneles ──────────────────────── -->
    <template v-if="currentStep === 5">
      <!-- Mini resumen -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-0.5">
        <p><strong class="text-gray-900">{{ `${form.guest_first_name} ${form.guest_last_name}`.trim() }}</strong><span v-if="form.guest_phone" class="ml-2 text-gray-500">{{ form.guest_phone }}</span></p>
        <p>{{ form.check_in }} → {{ form.check_out }}<span v-if="nights > 0" class="ml-2 text-gray-400">({{ nights }} noches)</span> · {{ totalPersonas }} personas</p>
        <p v-if="venueName" class="text-gray-500">{{ venueName }}</p>
        <p v-if="form.commission_name || form.source_detail_id" class="text-gray-500">Canal: {{ form.commission_name || form.source_detail_id }}</p>
        <button type="button" class="mt-1 text-xs text-primary underline" @click="goToStep(1)">Editar</button>
      </div>

      <p class="text-xs text-gray-400">Sin pago: guarda como consulta, o usa "Guardar como reserva" si definiste unidad y precio. Con pago: crea reserva confirmada.</p>

      <!-- Panel: Selección de unidad -->
      <div class="rounded-lg border border-gray-200">
        <button type="button" class="flex w-full items-center justify-between p-4 text-left" @click="togglePanel('unit')">
          <span class="text-sm font-medium text-gray-900">Selección de unidad</span>
          <svg class="h-4 w-4 text-gray-400 transition-transform" :class="panels.unit ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div v-if="panels.unit" class="border-t border-gray-100 px-4 pb-4 pt-3 space-y-1">
          <label
            v-if="availableUnitsForVenue.length > 0"
            class="mb-2 flex cursor-pointer items-center gap-2 rounded border border-dashed px-2 py-2 text-sm"
            :class="isFullHouseSelected ? 'border-primary/50 bg-primary/5' : 'border-gray-300 hover:bg-gray-50'"
          >
            <input
              type="checkbox"
              :checked="isFullHouseSelected"
              class="rounded border-gray-300"
              @change="toggleFullHouseSelection($event.target.checked)"
            />
            <span class="font-semibold text-gray-900">Full house</span>
            <span class="text-xs text-gray-500">· Selecciona todas las unidades disponibles en estas fechas</span>
          </label>

          <label
            v-for="unit in availableUnitsForVenue"
            :key="unit.id"
            class="flex cursor-pointer items-center gap-2 rounded border border-transparent px-2 py-1.5 text-sm hover:bg-gray-50"
            :class="form.unit_ids.includes(unit.id) ? 'border-primary/30 bg-primary/5' : ''"
          >
            <input type="checkbox" :value="unit.id" v-model="form.unit_ids" class="rounded border-gray-300" />
            <span class="font-medium">{{ unit.name }}</span>
            <span class="text-xs text-gray-400">· hasta {{ unit.capacity }} pers.</span>
          </label>
          <p v-if="availableUnitsForVenue.length === 0" class="text-sm text-gray-400">No hay unidades para esta selección.</p>
        </div>
      </div>

      <!-- Panel: Detalle y precio -->
      <div class="rounded-lg border border-gray-200">
        <button type="button" class="flex w-full items-center justify-between p-4 text-left" @click="togglePanel('price')">
          <span class="text-sm font-medium text-gray-900">Detalle y precio</span>
          <svg class="h-4 w-4 text-gray-400 transition-transform" :class="panels.price ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div v-if="panels.price" class="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          <AppInput
            v-model="form.price_per_night"
            type="number"
            label="Precio por noche"
            prefix="$"
            :hint="suggestionHint || 'Opcional'"
          />

          <AppInlineAlert
            v-if="pricingSuggestion.estimatedLabel"
            type="info"
            :message="pricingSuggestion.estimatedLabel"
          />

          <div v-if="pricingSuggestion.unitBreakdown?.length" class="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-2">
            <p class="font-semibold text-gray-900">Sugerido por unidad</p>
            <div
              v-for="item in pricingSuggestion.unitBreakdown"
              :key="item.unitId"
              class="flex flex-wrap items-center justify-between gap-2"
            >
              <span>{{ item.unitName }} · {{ item.label }}</span>
              <span class="font-medium text-gray-900">{{ item.nightly === null ? 'Sin tarifa' : `$${Math.round(item.nightly).toLocaleString('es-CO')}/noche` }}</span>
            </div>
          </div>

          <div v-if="pricingSuggestion.extras" class="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 space-y-1">
            <p class="font-semibold text-gray-900">Adicional personas</p>
            <p>{{ pricingSuggestion.extras.capacityIncluded }} adultos incluidos en tarifa base</p>
            <p>{{ pricingSuggestion.extras.extraAdults }} adulto(s) adicional(es) · ${{ Math.round(pricingSuggestion.extras.extraRate).toLocaleString('es-CO') }}/noche</p>
            <p v-if="pricingSuggestion.extras.minorsCount > 0">{{ pricingSuggestion.extras.minorsCount }} menor(es) · ${{ Math.round(pricingSuggestion.extras.minorsRate).toLocaleString('es-CO') }}/noche ({{ pricingSuggestion.extras.minorsPct }}%)</p>
            <p v-if="pricingSuggestion.extras.childrenCount > 0">{{ pricingSuggestion.extras.childrenCount }} niño(s) · ${{ Math.round(pricingSuggestion.extras.childRate).toLocaleString('es-CO') }}/noche ({{ pricingSuggestion.extras.childrenPct }}%)</p>
            <p v-if="pricingSuggestion.extras.infantsCount > 0">{{ pricingSuggestion.extras.infantsCount }} bebé(s) · ${{ Math.round(pricingSuggestion.extras.infantsRate).toLocaleString('es-CO') }}/noche ({{ pricingSuggestion.extras.infantsPct }}%)</p>
            <p class="font-semibold text-gray-900">Adicional personas: ${{ Math.round(pricingSuggestion.extras.nightlyTotal).toLocaleString('es-CO') }}/noche</p>
          </div>

          <div v-if="showFullHouseToggle" class="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary-dark">
            Tarifa full house aplicada automaticamente
          </div>

          <div v-if="hasPeakPolicy" class="rounded-md border border-gray-200 p-3">
            <AppToggle v-model="usePeakPricing" label="Aplicar precio pico" description="Activa politica global de temporada pico" />
          </div>

          <AppFormGrid :columns="2">
            <AppInput v-model="form.discount_percentage" type="number" label="Descuento" suffix="%" hint="Opcional" />
            <AppInput v-model="form.commission_percentage" type="number" label="Comisión" suffix="%" hint="Opcional" />
          </AppFormGrid>
          <AppDatePicker v-model="form.quote_expires_at" label="Cotización válida hasta" hint="Opcional" />
          <PricingCalculatorPanel
            :checkIn="form.check_in"
            :checkOut="form.check_out"
            :pricePerNight="Number(form.price_per_night || 0)"
            :discountPercentage="Number(form.discount_percentage || 0)"
            :commissionPercentage="Number(form.commission_percentage || 0)"
            :adults="form.adults"
            :minors="Number(form.minors || 0)"
            :children="Number(form.children || 0)"
            :infants="Number(form.infants || 0)"
          />
        </div>
      </div>

      <!-- Panel: Registro de pago -->
      <div class="rounded-lg border border-gray-200">
        <button type="button" class="flex w-full items-center justify-between p-4 text-left" @click="togglePanel('payment')">
          <span class="text-sm font-medium text-gray-900">Registro de pago</span>
          <svg class="h-4 w-4 text-gray-400 transition-transform" :class="panels.payment ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div v-if="panels.payment" class="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          <AppFormGrid :columns="2">
            <AppInput
              v-model="payment.amount"
              type="number"
              label="Monto abonado"
              prefix="$"
              hint="Vacío = guardar como consulta"
            />
            <AppSelect v-model="payment.method" label="Método" :options="PAYMENT_METHOD_OPTIONS" />
          </AppFormGrid>
          <AppInput v-model="payment.reference" label="Referencia" hint="Opcional" />
          <AppDatePicker v-model="payment.payment_date" label="Fecha de pago" />
        </div>
      </div>

      <AppInlineAlert v-if="reservationValidationError" type="error" :message="reservationValidationError" />
      <AppInlineAlert v-if="saveAsReservationError" type="error" :message="saveAsReservationError" />
      <AppInlineAlert v-if="submitError" type="error" :message="submitError" />

      <!-- Hold toggle (solo para consultas sin pago) -->
      <div v-if="!hasPayment" class="space-y-2">
        <div class="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <input type="checkbox" id="holdInquiry" v-model="holdInquiry" class="h-4 w-4 accent-primary rounded" />
          <label for="holdInquiry" class="cursor-pointer select-none">Generar bloqueo de retención (hold) al guardar</label>
        </div>
        <div v-if="holdInquiry" class="flex items-center gap-2 rounded border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm text-gray-700">
          <span class="shrink-0">Retener por</span>
          <input id="holdDays" type="number" v-model.number="holdDays" :min="1" :max="30" class="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center" />
          <span>días desde hoy</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button type="button" class="btn-secondary" @click="prevFromPanels">Atrás</button>
        <button v-if="!hasPayment" type="button" class="btn-secondary" :disabled="saving" @click="saveAsReservation">
          {{ saving ? 'Guardando…' : 'Guardar como reserva' }}
        </button>
        <button type="button" class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Guardando…' : hasPayment ? 'Crear reserva' : 'Guardar consulta' }}
        </button>
        <button v-if="inModal" type="button" class="text-sm text-gray-500 underline" @click="emit('cancel')">Cancelar</button>
      </div>
    </template>

  </div>

  <!-- Modal: Editar huésped existente -->
  <BaseModal :isOpen="showEditGuestModal" @close="showEditGuestModal = false" title="Editar huésped" size="md">
    <form @submit.prevent="saveEditGuest" class="space-y-4">
      <AppFormGrid :columns="2">
        <AppInput v-model="editGuestForm.first_name" label="Nombres" required />
        <AppInput v-model="editGuestForm.last_name" label="Apellidos" />
      </AppFormGrid>
      <AppFormGrid :columns="2">
        <AppPhoneInput
          :countryCode="editGuestForm.phone_country_code"
          :phoneNumber="editGuestForm.phone"
          label="Teléfono"
          @update:countryCode="editGuestForm.phone_country_code = $event"
          @update:phoneNumber="editGuestForm.phone = $event"
        />
        <AppInput v-model="editGuestForm.email" label="Email" type="email" hint="Opcional" />
      </AppFormGrid>
      <AppCountrySelect v-model="editGuestForm.nationality" label="Nacionalidad" hint="Opcional" />
      <AppFormActions
        submit-label="Guardar cambios"
        cancel-label="Cancelar"
        :loading="editGuestSubmitting"
        :submit-disabled="editGuestSubmitting"
        @submit="saveEditGuest"
        @cancel="showEditGuestModal = false"
      />
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { DOCUMENT_TYPES_ADULT as documentTypeOptions } from '../../utils/documentTypes'
import SourceSelector from '../sources/SourceSelector.vue'
import BaseModal from '../ui/BaseModal.vue'
import {
  AppInput,
  AppPhoneInput,
  AppCountrySelect,
  AppTextarea,
  AppDateRangePicker,
  AppDatePicker,
  AppCounter,
  AppToggle,
  AppFormGrid,
  AppFormSection,
  AppInlineAlert,
  AppSelect,
  AppFormActions,
  PricingCalculatorPanel
} from '@/components/ui/forms'
import { useAvailability } from '../../composables/useAvailability'
import { useAccountStore } from '../../stores/account'
import { useReservationsStore } from '../../stores/reservations'
import { useInquiriesStore } from '../../stores/inquiries'
import { useGuestsStore } from '../../stores/guests'
import { useRoomBlocksStore } from '../../stores/roomBlocks'
import { useToast } from '../../composables/useToast'
import { buildPricingSuggestion } from '../../utils/pricingUtils'
import { useAgeCategorySettings } from '../../composables/useAgeCategorySettings'

const props = defineProps({
  initialCheckIn: { type: String, default: '' },
  initialCheckOut: { type: String, default: '' },
  initialPersonas: { type: Number, default: 2 },
  inModal: { type: Boolean, default: false }
})

const emit = defineEmits(['saved', 'cancel'])

const router = useRouter()
const accountStore = useAccountStore()
const reservationsStore = useReservationsStore()
const inquiriesStore = useInquiriesStore()
const guestsStore = useGuestsStore()
const toast = useToast()
const roomBlocksStore = useRoomBlocksStore()
const avail = useAvailability()
const { ageCategorySettings, loadAgeCategorySettings, activeCategories, ageCategoryLabels } = useAgeCategorySettings()

const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'plataforma', label: 'Plataforma' },
]

const todayIso = new Date().toISOString().slice(0, 10)

// ── Navigation state ───────────────────────────────────
const currentStep = ref(1)
const maxReachedStep = ref(1)

// ── UI state ───────────────────────────────────────────
const saving = ref(false)
const submitError = ref('')
const saveAsReservationError = ref('')
const guestSearchOpen = ref(false)
const holdInquiry = ref(false)
const holdDays = ref(1)
const panels = ref({ unit: true, price: false, payment: false })
const useFullHousePricing = ref(false)
const usePeakPricing = ref(false)

// ── Touched trackers ───────────────────────────────────
const s1Touched = ref({ check_in: false, check_out: false })
const s3Touched = ref({ guest_first_name: false, guest_phone: false })
const s4Touched = ref({ source_type_id: false })

// ── Form data ──────────────────────────────────────────
const form = ref({
  check_in: props.initialCheckIn || '',
  check_out: props.initialCheckOut || '',
  adults: Number(props.initialPersonas) || 2,
  minors: 0,
  children: 0,
  infants: 0,
  venue_id: '',
  guest_id: null,
  guest_first_name: '',
  guest_last_name: '',
  guest_phone: '',
  guest_phone_country_code: '+57',
  guest_email: '',
  guest_nationality: '',
  guest_document_type: '',
  guest_document_number: '',
  guest_gender: '',
  guest_birth_date: '',
  notes: '',
  price_per_night: '',
  discount_percentage: '',
  commission_percentage: '',
  commission_name: '',
  quote_expires_at: '',
  source_type_id: '',
  source_detail_id: '',
  source_name: '',
  unit_ids: []
})

const payment = ref({
  amount: '',
  method: 'transferencia',
  reference: '',
  payment_date: todayIso
})

const accountPricing = ref({
  price_general_base: null,
  price_general_min: null,
  price_general_extra: null,
  price_per_person_base: null,
  price_weekend_pct: null,
  price_peak_pct: null,
  price_child_pct: 50,
  price_full_house_min: null,
  price_full_house_base: null,
  price_full_house_peak: null,
})

// ── Computeds ──────────────────────────────────────────
const totalPersonas = computed(() =>
  Number(form.value.adults || 0) +
  Number(form.value.minors || 0) +
  Number(form.value.children || 0) +
  Number(form.value.infants || 0)
)

const categoryInfos = computed(() => {
  const s = ageCategorySettings.value
  return {
    minors:   { range: `${s?.minors_min_age ?? 10} a 17 años` },
    children: { range: `${s?.children_min_age ?? 2} a ${s?.children_max_age ?? 9} años` },
    infants:  { range: `0 a ${s?.infants_max_age ?? 2} años` },
  }
})

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const diff = (new Date(form.value.check_out) - new Date(form.value.check_in)) / 86400000
  return diff > 0 ? Math.ceil(diff) : 0
})

const checkOutError = computed(() => {
  if (!form.value.check_out) return 'Requerido'
  if (form.value.check_in && form.value.check_out <= form.value.check_in) return 'Debe ser posterior al check-in'
  return ''
})

const canProceedStep1 = computed(() => !!form.value.check_in && !checkOutError.value)

const step1DateRange = computed({
  get: () => ({ start: form.value.check_in || null, end: form.value.check_out || null }),
  set: (value) => {
    form.value.check_in = value?.start || ''
    form.value.check_out = value?.end || ''
  }
})

const canProceedStep3 = computed(() =>
  !!form.value.guest_first_name?.trim() && !!form.value.guest_phone?.trim()
)

const sourceRequired = computed(() => !form.value.source_detail_id)

const hasPayment = computed(() => Number(payment.value.amount || 0) > 0)

const reservationValidationError = computed(() => {
  if (!hasPayment.value) return ''
  if (form.value.unit_ids.length === 0) return 'Selecciona al menos una unidad para crear la reserva.'
  if (!form.value.price_per_night || Number(form.value.price_per_night) <= 0) return 'El precio por noche es requerido para crear una reserva con pago.'
  return ''
})

const availabilityWarningMessage = computed(() => {
  if (avail.available.value.length > 0) return ''
  if (avail.insufficientCapacity.value) {
    return `No hay capacidad suficiente para ${totalPersonas.value} persona(s) en ese rango. La suma de cupos disponibles es ${avail.totalAvailableCapacity.value}.`
  }

  return 'No hay unidades disponibles para ese rango y número de personas.'
})

// Sedes derivadas de las unidades disponibles (con count por sede)
const availableVenues = computed(() => {
  const map = new Map()
  for (const unit of avail.available.value) {
    if (!unit.venue_id) continue
    if (!map.has(unit.venue_id)) {
      map.set(unit.venue_id, { id: unit.venue_id, name: unit.venues?.name || unit.venue_id, count: 0 })
    }
    map.get(unit.venue_id).count++
  }
  return [...map.values()]
})

const skipVenueStep = computed(() => avail.singleVenue.value)

// Unidades disponibles filtradas por la sede elegida
const availableUnitsForVenue = computed(() => {
  const units = avail.available.value
  if (!form.value.venue_id) return units
  return units.filter(u => u.venue_id === form.value.venue_id)
})

const allUnitsSelected = computed(() => {
  const venueUnits = availableUnitsForVenue.value
  if (!venueUnits.length) return false
  const selectedSet = new Set(form.value.unit_ids || [])
  return venueUnits.every((unit) => selectedSet.has(unit.id))
})

const isFullHouseSelected = computed(() => allUnitsSelected.value)

const hasFullHouseTariff = computed(() => {
  const config = accountPricing.value
  return config.price_full_house_base !== null || config.price_full_house_peak !== null || config.price_full_house_min !== null
})

const hasPeakPolicy = computed(() => accountPricing.value.price_peak_pct !== null && accountPricing.value.price_peak_pct !== 0)

const showFullHouseToggle = computed(() => allUnitsSelected.value && hasFullHouseTariff.value)

const selectedUnitsForPricing = computed(() => {
  const selectedSet = new Set(form.value.unit_ids || [])
  return availableUnitsForVenue.value.filter((unit) => selectedSet.has(unit.id))
})

const pricingSuggestion = computed(() => buildPricingSuggestion({
  selectedUnits: selectedUnitsForPricing.value,
  settings: accountPricing.value,
  checkIn: form.value.check_in,
  checkOut: form.value.check_out,
  adults: Number(form.value.adults || 0),
  minors: Number(form.value.minors || 0),
  children: Number(form.value.children || 0),
  infants: Number(form.value.infants || 0),
  ageSettings: ageCategorySettings.value,
  usePeak: usePeakPricing.value,
  useFullHouse: useFullHousePricing.value,
  allUnitsSelected: allUnitsSelected.value,
}))

const suggestionHint = computed(() => pricingSuggestion.value.originLabel || '')

watch(showFullHouseToggle, (enabled) => {
  useFullHousePricing.value = enabled
}, { immediate: true })

watch(hasPeakPolicy, (enabled) => {
  if (!enabled) {
    usePeakPricing.value = false
  }
})

watch(
  () => pricingSuggestion.value.nightly,
  (nightly) => {
    if (form.value.price_per_night !== '' && form.value.price_per_night !== null) return
    if (nightly === null) return
    form.value.price_per_night = Math.round(nightly)
  }
)

const loadAccountPricing = async () => {
  try {
    const accountId = accountStore.getRequiredAccountId()
    const { data } = await supabase
      .from('settings')
      .select('price_general_base, price_general_min, price_general_extra, price_per_person_base, price_weekend_pct, price_peak_pct, price_child_pct, price_full_house_min, price_full_house_base, price_full_house_peak')
      .eq('account_id', accountId)
      .maybeSingle()

    accountPricing.value = {
      price_general_base: data?.price_general_base ?? null,
      price_general_min: data?.price_general_min ?? null,
      price_general_extra: data?.price_general_extra ?? null,
      price_per_person_base: data?.price_per_person_base ?? null,
      price_weekend_pct: data?.price_weekend_pct ?? null,
      price_peak_pct: data?.price_peak_pct ?? null,
      price_child_pct: data?.price_child_pct ?? 50,
      price_full_house_min: data?.price_full_house_min ?? null,
      price_full_house_base: data?.price_full_house_base ?? null,
      price_full_house_peak: data?.price_full_house_peak ?? null,
    }
  } catch (_err) {
    accountPricing.value = {
      price_general_base: null,
      price_general_min: null,
      price_general_extra: null,
      price_per_person_base: null,
      price_weekend_pct: null,
      price_peak_pct: null,
      price_child_pct: 50,
      price_full_house_min: null,
      price_full_house_base: null,
      price_full_house_peak: null,
    }
  }
}

// Nav dinámico: omite paso 2 si hay una sola sede
const navSteps = computed(() => {
  const all = [
    { n: 1, label: 'Fechas' },
    { n: 2, label: 'Sede' },
    { n: 3, label: 'Huésped' },
    { n: 4, label: 'Origen' },    { n: 5, label: 'Detalles' },  ]
  return skipVenueStep.value ? all.filter(s => s.n !== 2) : all
})

// Nombre de la sede elegida para el mini-resumen
const venueName = computed(() =>
  availableVenues.value.find(v => v.id === form.value.venue_id)?.name || ''
)

// Búsqueda local de huéspedes
const guestSearchResults = computed(() => {
  if ((form.value.guest_first_name?.length ?? 0) < 2 || form.value.guest_id) return []
  const q = `${form.value.guest_first_name || ''} ${form.value.guest_last_name || ''}`.trim().toLowerCase()
  return guestsStore.guests
    .filter(g => `${g.first_name || ''} ${g.last_name || ''}`.trim().toLowerCase().includes(q) || g.phone?.toLowerCase().includes(q))
    .slice(0, 6)
})

// ── Navigation helpers ─────────────────────────────────
const stepButtonClass = (stepN) => {
  if (stepN === currentStep.value) return 'text-primary font-semibold'
  if (stepN < currentStep.value) return 'text-gray-600 hover:text-gray-900'
  if (stepN > maxReachedStep.value) return 'text-gray-300 cursor-not-allowed'
  return 'text-gray-500 hover:text-gray-700'
}

const stepCircleClass = (stepN) => {
  if (stepN === currentStep.value) return 'bg-primary text-white'
  if (stepN < currentStep.value) return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-400'
}

const goToStep = (step) => {
  if (step <= maxReachedStep.value) currentStep.value = step
}

const advanceStep1 = async () => {
  s1Touched.value = { check_in: true, check_out: true }
  if (!canProceedStep1.value) return

  const accountId = accountStore.getRequiredAccountId()
  await avail.checkAvailability({
    accountId,
    checkIn: form.value.check_in,
    checkOut: form.value.check_out,
    personas: totalPersonas.value
  })

  if (!avail.available.value.length) return // bloqueado – no hay disponibilidad

  if (skipVenueStep.value) {
    form.value.venue_id = availableVenues.value[0]?.id || ''
    maxReachedStep.value = Math.max(maxReachedStep.value, 3)
    currentStep.value = 3
  } else {
    maxReachedStep.value = Math.max(maxReachedStep.value, 2)
    currentStep.value = 2
  }
}

const advanceToStep4 = () => {
  s3Touched.value = { guest_first_name: true, guest_phone: true }
  if (!canProceedStep3.value) return
  if (!form.value.quote_expires_at) {
    const d = new Date()
    d.setHours(d.getHours() + 48)
    form.value.quote_expires_at = d.toISOString().slice(0, 10)
  }
  maxReachedStep.value = Math.max(maxReachedStep.value, 4)
  currentStep.value = 4
}

const advanceStep4 = () => {
  s4Touched.value.source_type_id = true
  if (sourceRequired.value) return
  maxReachedStep.value = Math.max(maxReachedStep.value, 5)
  currentStep.value = 5
}

const prevFromStep3 = () => {
  currentStep.value = skipVenueStep.value ? 1 : 2
}

const prevFromPanels = () => {
  currentStep.value = 4
}

const onDatesChange = () => {
  if (avail.checked.value) avail.reset()
}

const onStep1DateBlur = () => {
  s1Touched.value.check_in = true
  s1Touched.value.check_out = true
}

// ── Guest search ───────────────────────────────────────
watch(() => form.value.guest_first_name, (val) => {
  if ((val?.length ?? 0) >= 1 && !form.value.guest_id) {
    guestSearchOpen.value = true
  }
})

const selectGuest = (guest) => {
  form.value.guest_id = guest.id
  form.value.guest_first_name = guest.first_name || ''
  form.value.guest_last_name = guest.last_name || ''
  form.value.guest_phone = guest.phone || ''
  form.value.guest_phone_country_code = guest.phone_country_code || '+57'
  form.value.guest_email = guest.email || ''
  form.value.guest_nationality = guest.nationality || ''
  form.value.guest_document_type = guest.document_type || ''
  form.value.guest_document_number = guest.document_number || ''
  form.value.guest_gender = guest.gender || ''
  form.value.guest_birth_date = guest.birth_date || ''
  guestSearchOpen.value = false
}

const clearGuestSelection = () => {
  form.value.guest_id = null
  form.value.guest_first_name = ''
  form.value.guest_last_name = ''
  form.value.guest_phone = ''
  form.value.guest_phone_country_code = '+57'
  form.value.guest_email = ''
  form.value.guest_nationality = ''
  form.value.guest_document_type = ''
  form.value.guest_document_number = ''
  form.value.guest_gender = ''
  form.value.guest_birth_date = ''
}

// ── Edit guest modal ───────────────────────────────────
const showEditGuestModal = ref(false)
const editGuestSubmitting = ref(false)
const editGuestForm = ref({
  first_name: '',
  last_name: '',
  phone: '',
  phone_country_code: '+57',
  email: '',
  nationality: ''
})

const openEditGuestModal = () => {
  editGuestForm.value = {
    first_name: form.value.guest_first_name,
    last_name: form.value.guest_last_name,
    phone: form.value.guest_phone,
    phone_country_code: form.value.guest_phone_country_code,
    email: form.value.guest_email,
    nationality: form.value.guest_nationality
  }
  showEditGuestModal.value = true
}

const saveEditGuest = async () => {
  if (!form.value.guest_id) return
  editGuestSubmitting.value = true
  try {
    await guestsStore.updateGuest(form.value.guest_id, editGuestForm.value)
    // Sync back into the reservation form
    form.value.guest_first_name = editGuestForm.value.first_name
    form.value.guest_last_name = editGuestForm.value.last_name
    form.value.guest_phone = editGuestForm.value.phone
    form.value.guest_phone_country_code = editGuestForm.value.phone_country_code
    form.value.guest_email = editGuestForm.value.email
    form.value.guest_nationality = editGuestForm.value.nationality
    showEditGuestModal.value = false
    toast.success('Huésped actualizado correctamente.')
  } catch (err) {
    toast.error(err.message || 'No se pudo actualizar el huésped.')
  } finally {
    editGuestSubmitting.value = false
  }
}

// ── Source helpers ─────────────────────────────────────
const onSourceChange = (value) => {
  form.value.source_type_id = value?.sourceTypeId || ''
  form.value.source_detail_id = value?.sourceDetailId || ''
  form.value.source_name = value?.sourceName || ''
}

const onSourceSuggestions = (payload) => {
  if (!String(form.value.commission_name || '').trim()) {
    form.value.commission_name = payload.sourceDetailLabel || ''
  }
  if (form.value.commission_percentage === '' || form.value.commission_percentage === null) {
    form.value.commission_percentage = Number(payload.commissionPercentage || 0)
  }
  if (form.value.discount_percentage === '' || form.value.discount_percentage === null) {
    form.value.discount_percentage = Number(payload.discountPercentage || 0)
  }
}

// ── Panel toggle ───────────────────────────────────────
const togglePanel = (panel) => {
  panels.value[panel] = !panels.value[panel]
}

const toggleFullHouseSelection = (enabled) => {
  const venueUnitIds = availableUnitsForVenue.value.map((unit) => unit.id)
  if (!venueUnitIds.length) return

  const current = new Set(form.value.unit_ids || [])
  if (enabled) {
    for (const unitId of venueUnitIds) {
      current.add(unitId)
    }
  } else {
    for (const unitId of venueUnitIds) {
      current.delete(unitId)
    }
  }

  form.value.unit_ids = [...current]
}

// ── Save As Reservation (no payment) ──────────────────
const saveAsReservation = async () => {
  saveAsReservationError.value = ''
  submitError.value = ''

  if (!form.value.unit_ids.length || !form.value.price_per_night) {
    saveAsReservationError.value = 'Para guardar como reserva sin pago debes seleccionar una unidad y un precio por noche.'
    return
  }

  saving.value = true
  try {
    let guestRecord
    if (form.value.guest_id) {
      await guestsStore.updateGuest(form.value.guest_id, {
        first_name: form.value.guest_first_name,
        last_name: form.value.guest_last_name,
        phone: form.value.guest_phone,
        phone_country_code: form.value.guest_phone_country_code,
        email: form.value.guest_email || null,
        document_type: form.value.guest_document_type || null,
        document_number: form.value.guest_document_number?.trim() || null,
        nationality: form.value.guest_nationality || null,
        gender: form.value.guest_gender || null,
        birth_date: form.value.guest_birth_date || null,
      })
      guestRecord = { id: form.value.guest_id }
    } else {
      guestRecord = await guestsStore.getOrCreateGuestByPhone({
            first_name: form.value.guest_first_name,
            last_name: form.value.guest_last_name,
            document_type: form.value.guest_document_type || null,
            document_number: form.value.guest_document_number?.trim() || null,
            gender: form.value.guest_gender || null,
      })
    }

    const result = await reservationsStore.createReservationWithPayment(
      {
        check_in: form.value.check_in,
        check_out: form.value.check_out,
        adults: form.value.adults,
        minors: form.value.minors,
        children: form.value.children,
        infants: form.value.infants,
        venue_id: form.value.venue_id || null,
        guest_id: guestRecord.id,
        guest_first_name: form.value.guest_first_name,
        guest_last_name: form.value.guest_last_name,
        guest_phone_country_code: form.value.guest_phone_country_code,
        unit_ids: form.value.unit_ids,
        price_per_night: Number(form.value.price_per_night),
        discount_percentage: Number(form.value.discount_percentage || 0),
        commission_percentage: Number(form.value.commission_percentage || 0),
        commission_name: form.value.commission_name || null,
        source_detail_id: form.value.source_detail_id || null,
        source_name: form.value.source_name || null,
        status: 'confirmed',
        notes: form.value.notes || null
      },
      { amount: 0, method: 'transferencia', reference: '', payment_date: todayIso }
    )

    emit('saved', result)
    if (!props.inModal) router.push(`/reservas/${result.id}`)
    toast.success('Reserva creada correctamente.')
  } catch (err) {
    saveAsReservationError.value = err.message || 'Ocurrió un error al guardar.'
  } finally {
    saving.value = false
  }
}

// ── Save ───────────────────────────────────────────────
const save = async () => {
  submitError.value = ''
  if (reservationValidationError.value) return

  saving.value = true
  try {
    if (hasPayment.value) {
      // Actualizar perfil de huésped si ya existe, o crear uno nuevo
      let guestRecord
      if (form.value.guest_id) {
        await guestsStore.updateGuest(form.value.guest_id, {
          first_name: form.value.guest_first_name,
          last_name: form.value.guest_last_name,
          phone: form.value.guest_phone,
          phone_country_code: form.value.guest_phone_country_code,
          email: form.value.guest_email || null,
          document_type: form.value.guest_document_type || null,
          document_number: form.value.guest_document_number?.trim() || null,
          nationality: form.value.guest_nationality || null,
          gender: form.value.guest_gender || null,
          birth_date: form.value.guest_birth_date || null,
        })
        guestRecord = { id: form.value.guest_id }
      } else {
        guestRecord = await guestsStore.getOrCreateGuestByPhone({
              first_name: form.value.guest_first_name,
              last_name: form.value.guest_last_name,
              document_type: form.value.guest_document_type || null,
              document_number: form.value.guest_document_number?.trim() || null,
              gender: form.value.guest_gender || null,
          })
      }

      const result = await reservationsStore.createReservationWithPayment(
        {
          check_in: form.value.check_in,
          check_out: form.value.check_out,
          adults: form.value.adults,
          minors: form.value.minors,
          children: form.value.children,
          infants: form.value.infants,
          venue_id: form.value.venue_id || null,
          guest_id: guestRecord.id,
          guest_first_name: form.value.guest_first_name,
          guest_last_name: form.value.guest_last_name,
          guest_phone_country_code: form.value.guest_phone_country_code,
          unit_ids: form.value.unit_ids,
          price_per_night: form.value.price_per_night !== '' ? Number(form.value.price_per_night) : null,
          discount_percentage: Number(form.value.discount_percentage || 0),
          commission_percentage: Number(form.value.commission_percentage || 0),
          commission_name: form.value.commission_name || null,
          source_detail_id: form.value.source_detail_id || null,
          source_name: form.value.source_name || null,
          status: 'confirmed',
          notes: form.value.notes || null
        },
        payment.value
      )

      emit('saved', result)
      if (!props.inModal) router.push(`/reservas/${result.id}`)

      if (result.syncResult?.synced === false) {
        toast.withActions(
          'Reserva creada, pero la ocupación no pudo sincronizarse.',
          [{
            label: 'Reintentar',
            callback: async () => {
              const r = await reservationsStore.retryReservationOccupancySync(result.id)
              if (r.synced) toast.success('Ocupación sincronizada.')
              else toast.error('No se pudo sincronizar la ocupación. Intenta de nuevo más tarde.')
            }
          }]
        )
      } else {
        toast.success('Reserva creada correctamente.')
      }
    } else {
      // Sin pago → consulta
      if (form.value.guest_id) {
        await guestsStore.updateGuest(form.value.guest_id, {
          first_name: form.value.guest_first_name,
          last_name: form.value.guest_last_name,
          phone: form.value.guest_phone,
          phone_country_code: form.value.guest_phone_country_code,
          email: form.value.guest_email || null,
          document_type: form.value.guest_document_type || null,
          document_number: form.value.guest_document_number?.trim() || null,
          nationality: form.value.guest_nationality || null,
          gender: form.value.guest_gender || null,
          birth_date: form.value.guest_birth_date || null,
        })
      }
      const result = await inquiriesStore.createInquiry({
        check_in: form.value.check_in,
        check_out: form.value.check_out,
        adults: form.value.adults,
        minors: form.value.minors,
        children: form.value.children,
        infants: form.value.infants,
        guest_first_name: form.value.guest_first_name,
        guest_last_name: form.value.guest_last_name,
        guest_phone: form.value.guest_phone,
        guest_email: form.value.guest_email || null,
        phone_country_code: form.value.guest_phone_country_code,
        price_per_night: form.value.price_per_night !== '' ? Number(form.value.price_per_night) : null,
        discount_percentage: form.value.discount_percentage !== '' ? Number(form.value.discount_percentage) : 0,
        commission_percentage: form.value.commission_percentage !== '' ? Number(form.value.commission_percentage) : 0,
        commission_name: form.value.commission_name || null,
        quote_expires_at: form.value.quote_expires_at || null,
        source_detail_id: form.value.source_detail_id || null,
        source_name: form.value.source_name || null,
        notes: form.value.notes || null
      })

      if (holdInquiry.value && form.value.unit_ids.length > 0) {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + Number(holdDays.value || 1))
        for (const unitId of form.value.unit_ids) {
          await roomBlocksStore.createRoomBlock({
            unit_id: unitId,
            start_date: form.value.check_in,
            end_date: form.value.check_out,
            occupancy_type: 'inquiry_hold',
          reason: `Hold: ${`${form.value.guest_first_name} ${form.value.guest_last_name}`.trim() || 'Consulta'}`,
            expires_at: expiresAt.toISOString(),
          })
        }
      }
      toast.success('Consulta guardada correctamente.')
      emit('saved', result)
      if (!props.inModal) router.push(`/consultas/${result.id}`)
    }
  } catch (err) {
    submitError.value = err.message || 'Ocurrió un error al guardar.'
  } finally {
    saving.value = false
  }
}

// ── onMounted ──────────────────────────────────────────
onMounted(async () => {
  const accountId = accountStore.getRequiredAccountId()
  await guestsStore.fetchGuests()
  await Promise.all([loadAccountPricing(), loadAgeCategorySettings()])

  if (props.initialCheckIn && props.initialCheckOut) {
    await avail.checkAvailability({
      accountId,
      checkIn: props.initialCheckIn,
      checkOut: props.initialCheckOut,
      personas: props.initialPersonas
    })
    if (avail.available.value.length > 0) {
      if (skipVenueStep.value) {
        form.value.venue_id = availableVenues.value[0]?.id || ''
        maxReachedStep.value = 3
        currentStep.value = 3
      } else {
        maxReachedStep.value = 2
        currentStep.value = 2
      }
    }
  }
})
</script>
