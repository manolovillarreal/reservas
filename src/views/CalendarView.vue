<template>
  <div class="space-y-3 p-1 sm:space-y-6 sm:p-6">
    <div class="hidden flex-wrap items-center justify-between gap-4 sm:flex">
      <h1 class="text-2xl font-bold text-gray-800">Calendario</h1>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Vista</label>
          <select v-model="viewMode" class="mt-1 rounded-md border-gray-300 text-sm">
            <option value="clasica">Clásica</option>
            <option value="completa">Completa</option>
            <option value="por_unidad">Por unidad</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">Periodo</label>
          <select v-model="periodPreset" class="mt-1 rounded-md border-gray-300 text-sm">
            <option value="today">Hoy</option>
            <option value="this_week">Esta semana</option>
            <option value="this_month">Este mes</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <div v-if="periodPreset === 'custom'" class="w-full max-w-[420px]">
          <AppDateRangePicker
            v-model="customRangeModel"
            label-start="Desde"
            label-end="Hasta"
          />
        </div>
      </div>
    </div>

    <div class="space-y-2 sm:hidden">
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="option in mobileCalendarViewOptions"
          :key="`mobile-view-${option.value}`"
          type="button"
          class="rounded-md px-2 py-1.5 text-xs font-semibold transition"
          :class="viewMode === option.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          @click="viewMode = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5">
        <button
          v-for="option in mobilePeriodOptions"
          :key="`mobile-period-${option.value}`"
          type="button"
          class="rounded-md px-2 py-1.5 text-xs font-semibold transition"
          :class="periodPreset === option.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          @click="periodPreset = option.value"
        >
          {{ option.label }}
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md border px-2 py-1.5 text-gray-600 transition"
          :class="periodPreset === 'custom' || showMobileRangePicker ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white hover:bg-gray-50'"
          aria-label="Seleccionar rango personalizado"
          @click="toggleMobileRangePicker"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10m-13 9h16a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a1 1 0 0 0 1 1Z" />
          </svg>
        </button>
      </div>

      <div v-if="showMobileRangePicker" class="rounded-md border border-gray-200 bg-white p-2 shadow-sm">
        <AppDateRangePicker
          v-model="customRangeModel"
          label-start=""
          label-end=""
        />
      </div>
    </div>

    <div class="calendar-tabs view-mode-toggle">
      <button type="button" class="toggle-btn" :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'">Calendario</button>
      <button type="button" class="toggle-btn" :class="{ active: activeTab === 'entries' }" @click="activeTab = 'entries'">Entradas</button>
      <button type="button" class="toggle-btn" :class="{ active: activeTab === 'exits' }" @click="activeTab = 'exits'">Salidas</button>
    </div>

    <div v-if="activeTab === 'calendar'" class="space-y-3">

    <div
      v-if="viewMode === 'completa' && !showAgendaView"
      class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtro de sedes</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <label
          v-for="venue in venues"
          :key="`venue-filter-${venue.id}`"
          class="inline-flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
        >
          <input
            type="checkbox"
            :value="venue.id"
            :checked="selectedVenueIds.includes(venue.id)"
            @change="toggleVenueFilter(venue.id)"
            class="rounded border-gray-300 text-primary focus:ring-primary/30"
          >
          <span>{{ venue.name }}</span>
        </label>
      </div>
    </div>

    <div
      class="rounded-lg border border-gray-200 bg-white shadow-sm"
      :class="isMobile ? 'p-2' : 'overflow-x-auto p-6'"
    >
      <div class="mb-3 sm:mb-6">
        <button
          v-if="isMobile"
          type="button"
          class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          @click="mobileLegendOpen = !mobileLegendOpen"
        >
          {{ mobileLegendOpen ? 'Ocultar leyenda' : 'Ver leyenda' }}
          <span class="text-[10px]">{{ mobileLegendOpen ? '▲' : '▼' }}</span>
        </button>

        <transition name="legend-collapse">
          <div v-if="!isMobile || mobileLegendOpen" class="mt-2 flex flex-wrap gap-3 text-xs font-medium text-gray-600 sm:mt-0 sm:gap-4 sm:text-sm">
            <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-blue-500"></span> Reserva</span>
            <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-orange-500"></span> Mantenimiento</span>
            <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-purple-500"></span> Uso propietario</span>
            <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-amber-500"></span> Hold temporal</span>
            <span class="flex items-center"><span class="mr-2 h-3 w-3 rounded-full bg-gray-500"></span> Externo</span>
          </div>
        </transition>
      </div>

      <div v-if="calendarMetrics && !loading" class="mb-4 flex flex-wrap gap-6 rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <span>Ocupación: <span class="font-semibold text-gray-900">{{ calendarMetrics.occupancyPct }}%</span></span>
        <span>Entradas: <span class="font-semibold text-gray-900">{{ calendarMetrics.arrivals }}</span></span>
        <span>Salidas: <span class="font-semibold text-gray-900">{{ calendarMetrics.departures }}</span></span>
      </div>

      <div v-if="periodPreset === 'this_week'" class="mb-4 flex items-center justify-between gap-2">
        <button class="btn-secondary text-sm" @click="goToPreviousWeek">← Semana anterior</button>
        <span class="text-sm font-medium text-gray-700">{{ weekRangeLabel }}</span>
        <button class="btn-secondary text-sm" @click="goToNextWeek">Semana siguiente →</button>
      </div>

      <div v-if="periodPreset === 'this_month'" class="mb-4 flex items-center justify-between gap-2">
        <button class="btn-secondary text-sm" @click="goToPreviousMonth">← Mes anterior</button>
        <span class="text-sm font-medium text-gray-700">{{ monthLabel }}</span>
        <button class="btn-secondary text-sm" @click="goToNextMonth">Mes siguiente →</button>
      </div>

      <div v-if="showAgendaView" class="mb-4 flex items-center justify-between gap-2">
        <button class="btn-secondary text-sm" @click="goToPreviousDay">← Día anterior</button>
        <span class="text-sm font-medium text-gray-700">{{ agendaDayLabel }}</span>
        <button class="btn-secondary text-sm" @click="goToNextDay">Día siguiente →</button>
      </div>

      <div v-if="loading" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
        Cargando ocupaciones...
      </div>

      <div v-else-if="showAgendaView" class="space-y-3">
        <div v-if="todayAgendaEvents.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          <p class="flex items-center gap-2">
            <span class="text-base text-gray-400">◌</span>
            <span>No hay movimientos para este día.</span>
          </p>
        </div>

        <button
          v-for="event in todayAgendaEvents"
          :key="`agenda-${event.id}`"
          type="button"
          class="w-full rounded-md border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm"
          @click="goToOccupancyDetail(event.sourceOccupancy)"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold text-gray-900">{{ event.unitLabel }}</p>
            <span
              v-if="event.eventType !== 'Estadia'"
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="event.eventType === 'Entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'"
            >
              {{ event.eventType }}
            </span>
            <span v-else class="text-xs font-medium text-gray-500">Estadía</span>
          </div>

          <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
            <span>{{ event.pax }} pax</span>
            <span class="capitalize">{{ event.sourceDetail || 'Sin origen' }}</span>
            <span v-if="event.balance > 0" class="font-semibold text-red-600">Saldo: ${{ formatCurrency(event.balance) }}</span>
          </div>
        </button>
      </div>

      <div v-else-if="viewMode === 'clasica'" class="grid grid-cols-7 gap-px border border-gray-200 bg-gray-200">
        <div
          v-for="day in calendarDays"
          :key="`classic-day-${day.date}`"
          class="relative min-h-[120px] overflow-visible bg-white p-2 transition-colors hover:bg-gray-50"
          :class="isMobile ? 'cursor-pointer min-h-[60px] p-1' : ''"
          :style="!isMobile ? { minHeight: `${Math.max(120, 41 + (getClassicRowLaneCount(day.date) * 24))}px` } : undefined"
          @click="isMobile ? openDaySheet(day.date) : null"
        >
          <div class="text-right text-sm font-semibold text-gray-400">{{ day.dayNumber }}</div>

          <div v-if="isMobile" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="occ in getOccupanciesForDay(day.date).slice(0, 4)"
              :key="`dot-${day.date}-${occ.id}`"
              class="h-2 w-2 rounded-full"
              :class="occupancyDotColor(occ)"
            ></span>
            <span v-if="getOccupanciesForDay(day.date).length > 4" class="text-[10px] text-gray-500">+{{ getOccupanciesForDay(day.date).length - 4 }}</span>
          </div>

          <button
            v-for="segment in getClassicSegmentsForDay(day.date)"
            :key="`classic-occ-${day.date}-${segment.id}`"
            data-occ-trigger="true"
            type="button"
            class="absolute z-10 truncate rounded px-1.5 py-1 text-left text-xs leading-tight text-white shadow-sm"
            :class="[occupancyColor(segment), occupancyBorderClass(segment, segment.contextDate), isMobile ? 'px-1 py-0.5 text-[10px]' : '']"
            :style="!isMobile
              ? {
                  top: `${28 + (segment.lane * 24)}px`,
                  left: segment.leftStyle,
                  width: segment.widthStyle
                }
              : undefined"
            v-show="!isMobile"
            @mouseenter="openDesktopTooltip($event, segment, segment.contextDate)"
            @mousemove="openDesktopTooltip($event, segment, segment.contextDate)"
            @mouseleave="closeDesktopTooltip"
            @click="onOccupancyClick($event, segment, segment.contextDate)"
          >
            {{ getOccupancyDisplayLabel(segment, 'clasica') }}<span v-if="segment.occupancy_type === 'reservation' && (segment.reservations?.guests?.first_name || segment.reservations?.guests?.last_name)" class="opacity-80"> · {{ `${segment.reservations.guests.first_name || ''} ${segment.reservations.guests.last_name || ''}`.trim() }}</span><span v-else-if="segment.occupancy_type === 'external' && getExternalSource(segment)" class="opacity-80"> · {{ getExternalSource(segment) }}</span>
          </button>
        </div>
      </div>

      <div v-else-if="viewMode === 'completa' && isMobile" class="space-y-3">
        <div v-if="mobileCompleteUnits.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No hay unidades visibles para mostrar.
        </div>

        <section v-for="unitBlock in mobileCompleteUnits" :key="`mobile-complete-${unitBlock.unitId}`" class="rounded-md border border-gray-200 bg-white p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-gray-900">{{ unitBlock.unitName }}</p>
              <p class="truncate text-[11px] text-gray-500">{{ unitBlock.venueName }}</p>
            </div>
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="unitBlock.occupiedNow ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'">
              {{ unitBlock.occupiedNow ? 'Ocupada' : 'Libre' }}
            </span>
          </div>

          <div class="grid gap-1" :style="mobileBarsGridStyle">
            <button
              v-for="bar in unitBlock.dayBars"
              :key="`mobile-day-${unitBlock.unitId}-${bar.date}`"
              type="button"
              class="group rounded px-0.5 py-1"
              :class="bar.today ? 'bg-primary/10' : ''"
              :disabled="!bar.reservationId"
              @click="bar.reservationId ? router.push(`/reservas/${bar.reservationId}`) : null"
            >
              <span
                class="mx-auto block w-full rounded-sm transition"
                :class="[
                  bar.reservationId ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-gray-200',
                  bar.today ? 'ring-1 ring-primary/50' : ''
                ]"
                :style="{ height: bar.reservationId ? '18px' : '6px', minHeight: '6px' }"
              ></span>
              <span class="mt-1 block text-center text-[9px] text-gray-500">{{ bar.dayNumber }}</span>
            </button>
          </div>
        </section>
      </div>

      <div v-else-if="viewMode === 'completa'" class="space-y-4">
        <div v-if="visibleVenues.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No hay sedes seleccionadas para mostrar.
        </div>

        <div v-for="venue in visibleVenues" :key="`venue-box-${venue.id}`" class="rounded-md border border-gray-200 bg-white">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left"
            @click="toggleVenueCollapse(venue.id)"
          >
            <span class="font-semibold text-gray-800">{{ venue.name }}</span>
            <span class="text-sm text-gray-500">{{ isVenueCollapsed(venue.id) ? '+' : '-' }}</span>
          </button>

          <div v-if="!isVenueCollapsed(venue.id)" class="overflow-x-auto border-t border-gray-100 p-3">
            <!--
              Pure CSS grid: col 1 = unit name (7rem fixed), cols 2..N+1 = one per day (equal 1fr).
              Header cells and every unit row share this exact same grid → no misalignment possible.
            -->
            <div class="grid min-w-max border-l border-t border-gray-200 text-xs" :style="completeGridStyle">

              <!-- Header row: name label -->
              <div class="sticky left-0 z-30 border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                Habitacion
              </div>
              <!-- Header row: day numbers (one cell per day) -->
              <div
                v-for="day in calendarDays"
                :key="`ch-${venue.id}-${day.date}`"
                class="border-b border-r border-gray-200 bg-gray-50 px-1 py-2 text-center font-semibold text-gray-600"
              >
                {{ day.dayNumber }}
              </div>

              <!-- Unit rows -->
              <template v-for="(unit, ui) in getUnitsByVenue(venue.id)" :key="`unit-row-${unit.id}`">

                <!-- Unit name cell (col 1, sticky) -->
                <div
                  class="sticky left-0 z-20 border-b border-r border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700"
                  :style="{ gridRow: ui + 2, gridColumn: 1 }"
                >
                  {{ unit.name }}
                </div>

                <!-- Background day cells: define row height and vertical grid lines -->
                <div
                  v-for="(day, di) in calendarDays"
                  :key="`bg-${unit.id}-${day.date}`"
                  class="pointer-events-none border-b border-r border-gray-100"
                  :style="{ gridRow: ui + 2, gridColumn: di + 2, minHeight: '2rem' }"
                />

                <!-- Segments: colStart/colEnd from JS; +1 offset to skip the unit-name column -->
                <button
                  v-for="segment in getUnitSegmentsForComplete(unit.id)"
                  :key="`seg-${segment.id}-${segment.colStart}`"
                  data-occ-trigger="true"
                  type="button"
                  class="relative z-0 truncate rounded px-1 py-0.5 text-left text-[10px] text-white"
                  :class="[
                    occupancyColor(segment),
                    segment.checkinInView ? 'border-l-4 border-l-green-300' : '',
                    segment.checkoutInView ? 'border-r-4 border-r-red-300' : ''
                  ]"
                  :style="{ gridRow: ui + 2, gridColumn: `${segment.colStart + 1} / ${segment.colEnd + 1}`, margin: segment.segmentMargin }"
                  @mouseenter="openDesktopTooltip($event, segment, segment.contextDate)"
                  @mousemove="openDesktopTooltip($event, segment, segment.contextDate)"
                  @mouseleave="closeDesktopTooltip"
                  @click="onOccupancyClick($event, segment, segment.contextDate)"
                >
                  {{ getOccupancyDisplayLabel(segment, 'completa') }}<span v-if="segment.occupancy_type === 'external' && getExternalSource(segment)" class="opacity-90"> · {{ getExternalSource(segment) }}</span>
                </button>

              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div v-if="visibleVenues.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No hay sedes seleccionadas para mostrar.
        </div>

        <div v-for="venue in visibleVenues" :key="`unit-group-${venue.id}`" class="rounded-md border border-gray-200 bg-white">
          <button
            type="button"
            class="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left"
            @click="toggleVenueCollapse(venue.id)"
          >
            <h3 class="font-semibold text-gray-800">{{ venue.name }}</h3>
            <span class="text-sm text-gray-500">{{ isVenueCollapsed(venue.id) ? '+' : '-' }}</span>
          </button>

          <div v-if="!isVenueCollapsed(venue.id)" class="space-y-2 p-3">
            <div v-for="unit in getUnitsByVenue(venue.id)" :key="`unit-collapse-${unit.id}`" class="rounded-md border border-gray-200">
              <button
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left"
                @click="toggleUnitCollapse(unit.id)"
              >
                <span class="text-sm font-medium text-gray-800">{{ unit.name }}</span>
                <span class="text-sm text-gray-500">{{ isUnitCollapsed(unit.id) ? '+' : '-' }}</span>
              </button>

              <div v-if="!isUnitCollapsed(unit.id)" class="space-y-1 border-t border-gray-100 p-3">
                <button
                  v-for="occ in getUnitOccupancies(unit.id)"
                  :key="`unit-occ-${occ.id}`"
                  data-occ-trigger="true"
                  type="button"
                  class="block w-full truncate rounded px-2 py-1 text-left text-xs text-white"
                  :class="occupancyColor(occ)"
                  @mouseenter="openDesktopTooltip($event, occ, null)"
                  @mousemove="openDesktopTooltip($event, occ, null)"
                  @mouseleave="closeDesktopTooltip"
                  @click="onOccupancyClick($event, occ, null)"
                >
                  {{ getOccupancyDisplayLabel(occ, 'por_unidad') }} · {{ occ.start_date }} -> {{ occ.end_date }}
                </button>

                <p v-if="getUnitOccupancies(unit.id).length === 0" class="text-xs text-gray-500">Sin ocupaciones en el periodo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    </div>

    <div v-else-if="activeTab === 'entries'" class="space-y-2">
      <div v-if="loading" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
        Cargando entradas...
      </div>
      <div v-else-if="periodoEntradas.length === 0" class="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm italic text-gray-400">
        Sin entradas en el periodo.
      </div>
      <button
        v-for="item in periodoEntradas"
        v-else
        :key="`tab-entrada-${item.key}`"
        type="button"
        class="w-full rounded-md border border-gray-200 bg-white p-3 text-left shadow-sm transition-shadow hover:border-gray-300 hover:shadow"
        @click="router.push(`/reservas/${item.reservationId}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-500">{{ formatDate(item.date) }} · {{ item.checkInTimeLabel }}</p>
            <p class="truncate text-sm font-semibold text-gray-900">{{ item.guestName }}</p>
            <p class="truncate text-xs text-gray-600">{{ item.unitLabel }}</p>
            <p class="text-xs text-gray-500">{{ item.pax }} personas</p>
          </div>
          <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="preregistroBadgeClass(item.preregistroStatus)">
            {{ preregistroBadgeLabel(item.preregistroStatus) }}
          </span>
        </div>
      </button>
    </div>

    <div v-else class="space-y-2">
      <div v-if="loading" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
        Cargando salidas...
      </div>
      <div v-else-if="periodoSalidas.length === 0" class="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm italic text-gray-400">
        Sin salidas en el periodo.
      </div>
      <button
        v-for="item in periodoSalidas"
        v-else
        :key="`tab-salida-${item.key}`"
        type="button"
        class="w-full rounded-md border border-gray-200 bg-white p-3 text-left shadow-sm transition-shadow hover:border-gray-300 hover:shadow"
        @click="router.push(`/reservas/${item.reservationId}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-500">{{ formatDate(item.date) }} · {{ item.checkOutTimeLabel }}</p>
            <p class="truncate text-sm font-semibold text-gray-900">{{ item.guestName }}</p>
            <p class="truncate text-xs text-gray-600">{{ item.unitLabel }}</p>
            <p class="text-xs text-gray-500">{{ item.pax }} personas</p>
          </div>
          <ReservationBadge :status="item.status" />
        </div>
      </button>
    </div>

    <div
      v-if="tooltip.visible && periodPreset !== 'today'"
      ref="tooltipRef"
      class="fixed z-[120] w-80 rounded-md border border-gray-200 bg-white p-3 shadow-xl"
      :style="{ left: `${tooltip.position.x}px`, top: `${tooltip.position.y}px` }"
      @click.stop
    >
      <p class="text-sm font-semibold text-gray-900">{{ tooltipDetails.unitName }}</p>
      <p class="mt-1 text-xs font-medium text-gray-600">Tipo: {{ tooltipDetails.typeLabel }}</p>
      <p class="mt-1 text-xs text-gray-600">Fechas: {{ tooltipDetails.dateRange }}</p>
      <p class="mt-1 text-xs text-gray-600">Noches: {{ tooltipDetails.nights }}</p>
      <p v-if="tooltipDetails.holderName" class="mt-1 text-xs text-gray-600">Titular: {{ tooltipDetails.holderName }}</p>

      <p v-if="tooltipDetails.paxLabel" class="mt-1 text-xs text-gray-600">Personas: {{ tooltipDetails.paxLabel }}</p>
      <p v-if="tooltipDetails.sourceLabel" class="mt-1 text-xs text-gray-600">Origen: {{ tooltipDetails.sourceLabel }}</p>
      <p v-if="tooltipDetails.balance > 0" class="mt-1 text-xs font-semibold text-red-600">Saldo pendiente: ${{ formatCurrency(tooltipDetails.balance) }}</p>
      <p v-if="tooltipDetails.reason" class="mt-1 text-xs text-gray-600">Motivo: {{ tooltipDetails.reason }}</p>

      <div v-if="isTouchDevice" class="mt-3 border-t border-gray-100 pt-2">
        <button
          type="button"
          class="btn-secondary text-sm"
          @click="goToOccupancyDetail(tooltip.occupancy)"
        >
          Ver detalle
        </button>
      </div>
    </div>

    <BottomSheet
      v-model="daySheetOpen"
      title="Detalle del día"
    >
      <div class="space-y-3">
        <p class="text-sm text-gray-500">{{ formatDate(selectedDayForSheet) }}</p>
        <div v-if="daySheetOccupancies.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
          Sin ocupaciones para este día.
        </div>
        <button
          v-for="occ in daySheetOccupancies"
          :key="`sheet-occ-${occ.id}`"
          type="button"
          class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm"
          @click="goToOccupancyDetail(occ)"
        >
          <p class="font-medium text-gray-900">{{ getOccupancyDisplayLabel(occ, 'clasica') }}</p>
          <p class="text-xs text-gray-500">{{ getOccupancyTypeLabel(occ, selectedDayForSheet) }} · {{ occ.start_date }} -> {{ occ.end_date }}</p>
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { DEFAULT_MESSAGE_SETTINGS, getMessageSettings } from '../services/messageSettingsService'
import { useAccountStore } from '../stores/account'
import BottomSheet from '../components/ui/BottomSheet.vue'
import ReservationBadge from '../components/ui/ReservationBadge.vue'
import AppDateRangePicker from '../components/ui/forms/AppDateRangePicker.vue'
import { useBreakpoint } from '../composables/useBreakpoint'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const { isMobile } = useBreakpoint()
const CALENDAR_STATE_STORAGE_KEY = 'calendar_state'

const occupancies = ref([])
const units = ref([])
const venues = ref([])
const loading = ref(false)

const viewMode = ref('completa')
const periodPreset = ref('this_month')
const periodFrom = ref('')
const periodTo = ref('')
const activeTab = ref('calendar')
const weekStart = ref(getWeekStartMonday(new Date()))
const monthStart = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const mobileLegendOpen = ref(false)
const showMobileRangePicker = ref(false)
const messageSettings = ref({ ...DEFAULT_MESSAGE_SETTINGS })

const selectedVenueIds = ref([])
const collapsedVenues = ref({})
const collapsedUnits = ref({})

const tooltip = ref({
  visible: false,
  occupancy: null,
  contextDate: null,
  position: { x: 0, y: 0 }
})
const tooltipRef = ref(null)
const isTouchDevice = ref(false)
const selectedDayForSheet = ref('')
const daySheetOpen = ref(false)

const mobileCalendarViewOptions = [
  { value: 'clasica', label: 'Clásica' },
  { value: 'completa', label: 'Completa' },
  { value: 'por_unidad', label: 'Por unidad' }
]

const mobilePeriodOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'this_week', label: 'Semana' },
  { value: 'this_month', label: 'Este mes' }
]

const customRangeModel = computed({
  get: () => ({
    start: periodFrom.value || null,
    end: periodTo.value || null,
  }),
  set: (range) => {
    const start = normalizeIsoDate(range?.start)
    const end = normalizeIsoDate(range?.end)
    if (!start && !end) return

    periodPreset.value = 'custom'
    if (start) periodFrom.value = start
    if (end) periodTo.value = end
  }
})

function toggleMobileRangePicker() {
  showMobileRangePicker.value = !showMobileRangePicker.value
  if (showMobileRangePicker.value && periodPreset.value !== 'custom') {
    periodPreset.value = 'custom'
  }
}

const daySheetOccupancies = computed(() => {
  if (!selectedDayForSheet.value) return []
  return getOccupanciesForDay(selectedDayForSheet.value)
})

const showAgendaView = computed(() => {
  if (!periodFrom.value || !periodTo.value) return false
  return periodFrom.value === periodTo.value
})

const agendaDayLabel = computed(() => {
  if (!periodFrom.value) return ''
  return new Date(periodFrom.value).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).replace(/^./, (char) => char.toUpperCase())
})

function toIsoDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}

function normalizeIsoDate(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const direct = raw.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct
  return toIsoDate(raw)
}

function addDays(value, days) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

// UTC-safe +n days for ISO date strings.
// addDays(new Date(isoString), n) breaks in UTC- timezones: new Date("YYYY-MM-DD")
// parses as UTC midnight, which in e.g. UTC-5 is the previous local day, causing
// getDate() to return d-1 and setDate to advance from the wrong base.
function addIsoDays(isoDate, n) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function getWeekStartMonday(value) {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(date, diff)
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO')
}

function formatTimeFromDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEntryTimeLabel(occ) {
  const checkinDateTime = occ?.reservations?.checkin_date
  const fromDateTime = formatTimeFromDateTime(checkinDateTime)
  if (fromDateTime) return fromDateTime

  const fromSettings = String(messageSettings.value?.checkin_time || '').trim()
  if (fromSettings) return fromSettings

  return 'Sin hora definida'
}

function getExitTimeLabel(occ) {
  const checkoutDateTime = occ?.reservations?.checkout_date
  const fromDateTime = formatTimeFromDateTime(checkoutDateTime)
  if (fromDateTime) return fromDateTime

  const fromSettings = String(messageSettings.value?.checkout_time || '').trim()
  if (fromSettings) return fromSettings

  return 'Sin hora definida'
}

function saveCalendarState() {
  const state = {
    viewMode: showAgendaView.value ? 'agenda' : viewMode.value,
    periodPreset: periodPreset.value,
    activeTab: activeTab.value,
  }

  if (periodPreset.value === 'custom') {
    state.periodFrom = periodFrom.value
    state.periodTo = periodTo.value
  }

  localStorage.setItem(CALENDAR_STATE_STORAGE_KEY, JSON.stringify(state))
}

function restoreCalendarState() {
  const rawState = localStorage.getItem(CALENDAR_STATE_STORAGE_KEY)
  if (!rawState) return false

  let parsedState = null
  try {
    parsedState = JSON.parse(rawState)
  } catch {
    return false
  }

  const allowedViewModes = new Set(['clasica', 'completa', 'por_unidad', 'agenda'])
  const allowedPresets = new Set(['today', 'this_week', 'custom', 'this_month'])
  const allowedTabs = new Set(['calendar', 'entries', 'exits'])

  const restoredViewMode = String(parsedState?.viewMode || '')
  const restoredPresetRaw = String(parsedState?.periodPreset || '')
  const restoredPreset = restoredPresetRaw === 'next_30' ? 'this_month' : restoredPresetRaw
  const restoredTab = String(parsedState?.activeTab || '')

  if (allowedTabs.has(restoredTab)) {
    activeTab.value = restoredTab
  }

  if (allowedViewModes.has(restoredViewMode) && restoredViewMode !== 'agenda') {
    viewMode.value = restoredViewMode
  }

  if (restoredViewMode === 'agenda') {
    const restoredFrom = normalizeIsoDate(parsedState?.periodFrom)
    const restoredTo = normalizeIsoDate(parsedState?.periodTo)
    const fallbackDate = toIsoDate(new Date())

    periodPreset.value = 'custom'
    periodFrom.value = restoredFrom || fallbackDate
    periodTo.value = restoredTo || periodFrom.value
    return true
  }

  if (!allowedPresets.has(restoredPreset)) return false

  periodPreset.value = restoredPreset
  if (restoredPreset === 'custom') {
    const restoredFrom = normalizeIsoDate(parsedState?.periodFrom)
    const restoredTo = normalizeIsoDate(parsedState?.periodTo)
    const fallbackDate = toIsoDate(new Date())

    periodFrom.value = restoredFrom || fallbackDate
    periodTo.value = restoredTo || periodFrom.value
    return true
  }

  applyPreset()
  return true
}

function applyQueryPeriodOverrides() {
  const queryFrom = normalizeIsoDate(route.query.from)
  const queryTo = normalizeIsoDate(route.query.to)
  if (!queryFrom || !queryTo) return false

  periodPreset.value = 'custom'
  periodFrom.value = queryFrom
  periodTo.value = queryTo
  return true
}

function applyPreset() {
  const today = new Date()

  if (periodPreset.value === 'today') {
    const todayIso = toIsoDate(today)
    periodFrom.value = todayIso
    periodTo.value = todayIso
    return
  }

  if (periodPreset.value === 'this_week') {
    periodFrom.value = toIsoDate(weekStart.value)
    periodTo.value = toIsoDate(addDays(weekStart.value, 6))
    return
  }

  if (periodPreset.value === 'this_month') {
    periodFrom.value = toIsoDate(monthStart.value)
    periodTo.value = toIsoDate(new Date(monthStart.value.getFullYear(), monthStart.value.getMonth() + 1, 0))
    return
  }

  if (periodPreset.value === 'custom') {
    if (!periodFrom.value || !periodTo.value) {
      periodFrom.value = toIsoDate(today)
      periodTo.value = toIsoDate(addDays(today, 29))
    }
    return
  }

  periodFrom.value = toIsoDate(monthStart.value)
  periodTo.value = toIsoDate(new Date(monthStart.value.getFullYear(), monthStart.value.getMonth() + 1, 0))
}

const calendarDays = computed(() => {
  // Normalize defensively: ensure pure YYYY-MM-DD strings regardless of how the refs were set
  const from = periodFrom.value ? String(periodFrom.value).slice(0, 10) : ''
  const to = periodTo.value ? String(periodTo.value).slice(0, 10) : ''
  if (!from || !to || from > to) return []

  const days = []
  let current = from
  while (current <= to) {
    days.push({ date: current, dayNumber: Number(current.slice(8, 10)) })
    const [y, m, d] = current.split('-').map(Number)
    current = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  }

  return days
})

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart.value, i)
    days.push({
      date: toIsoDate(date),
      dayName: date.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '').replace(/^./, (char) => char.toUpperCase()),
      dayNumber: date.getDate()
    })
  }
  return days
})

const weekRangeLabel = computed(() => {
  const start = new Date(toIsoDate(weekStart.value))
  const end = new Date(toIsoDate(addDays(weekStart.value, 6)))
  const monthYear = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(end).replace('.', '')
  return `${start.getDate()} - ${end.getDate()} ${monthYear}`
})

const monthLabel = computed(() => {
  const formatted = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(monthStart.value)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
})

const timelineGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(calendarDays.value.length, 1)}, minmax(0, 1fr))`
}))

// Single CSS grid shared by header and every unit row → guaranteed perfect alignment.
// Weekly mode uses wider day columns for a true week-like view while preserving room column.
// Longer ranges remain compact to keep density.
const completeGridStyle = computed(() => ({
  '--complete-segment-gap': '5px',
  '--complete-day-col-width': periodPreset.value === 'this_week' ? 'clamp(3rem, 7vw, 5.25rem)' : '1.7rem',
  gridTemplateColumns: periodPreset.value === 'this_week'
    ? `9rem repeat(${Math.max(calendarDays.value.length, 1)}, var(--complete-day-col-width))`
    : `7rem repeat(${Math.max(calendarDays.value.length, 1)}, var(--complete-day-col-width))`
}))

const calendarDayIndexMap = computed(() => {
  const map = new Map()
  calendarDays.value.forEach((day, index) => {
    map.set(day.date, index + 1)
  })
  return map
})

const classicRowLayoutMap = computed(() => {
  const layout = new Map()
  if (calendarDays.value.length === 0) return layout

  for (let rowStartIndex = 0; rowStartIndex < calendarDays.value.length; rowStartIndex += 7) {
    const rowStart = calendarDays.value[rowStartIndex]?.date
    if (!rowStart) continue

    const rowEndDay = calendarDays.value[Math.min(rowStartIndex + 6, calendarDays.value.length - 1)]?.date
    if (!rowEndDay) continue

    const rowEndExclusive = addIsoDays(rowEndDay, 1)

    const segments = filteredOccupancies.value
      .map((occ) => {
        const occStart = normalizeIsoDate(occ.start_date)
        const occEnd = normalizeIsoDate(occ.end_date)

        if (occEnd <= rowStart || occStart >= rowEndExclusive) return null

        const startClamped = occStart > rowStart ? occStart : rowStart
        const endClamped = occEnd < rowEndExclusive ? occEnd : rowEndExclusive
        const rowColStart = getIsoDayDiff(rowStart, startClamped) + 1
        const spanDays = Math.max(1, getIsoDayDiff(startClamped, endClamped))

        const checkinInView = occStart >= rowStart
        const checkoutInView = occEnd < rowEndExclusive
        const gap = 3
        let leftStyle, widthStyle
        if (checkinInView) {
          leftStyle = `calc(50% + ${gap}px)`
          widthStyle = checkoutInView
            ? `calc(${spanDays * 100}% - ${gap * 2}px)`
            : `calc(${(spanDays - 0.5) * 100}% - ${gap}px)`
        } else {
          leftStyle = `${gap}px`
          widthStyle = checkoutInView
            ? `calc(${(spanDays + 0.5) * 100}% - ${gap * 2}px)`
            : `calc(${spanDays * 100}% - ${gap * 2}px)`
        }

        return {
          ...occ,
          contextDate: startClamped,
          rowColStart,
          spanDays,
          checkinInView,
          checkoutInView,
          leftStyle,
          widthStyle
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.rowColStart !== b.rowColStart) return a.rowColStart - b.rowColStart
        return b.spanDays - a.spanDays
      })

    const laneEndCols = []
    segments.forEach((segment) => {
      // Include checkout day in lane occupancy to avoid overlap with next checkin on same day
      const segEndCol = segment.rowColStart + segment.spanDays + (segment.checkoutInView ? 1 : 0)
      let lane = 0
      while (lane < laneEndCols.length && segment.rowColStart < laneEndCols[lane]) {
        lane++
      }
      laneEndCols[lane] = segEndCol
      segment.lane = lane
    })

    layout.set(rowStart, {
      segments,
      laneCount: laneEndCols.length
    })
  }

  return layout
})

const selectedVenueSet = computed(() => new Set(selectedVenueIds.value))

const visibleVenues = computed(() => {
  if (selectedVenueSet.value.size === 0) return venues.value
  return venues.value.filter((venue) => selectedVenueSet.value.has(venue.id))
})

const mobileBarsGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(calendarDays.value.length, 1)}, minmax(0, 1fr))`
}))

const mobileCompleteUnits = computed(() => {
  if (!isMobile.value || viewMode.value !== 'completa') return []

  const todayIso = toIsoDate(new Date())
  const allUnits = visibleVenues.value.flatMap((venue) =>
    getUnitsByVenue(venue.id).map((unit) => ({
      unitId: unit.id,
      unitName: unit.name,
      venueName: venue.name,
    }))
  )

  return allUnits.map((unitMeta) => {
    const occupiedNow = getUnitOccupanciesForDay(unitMeta.unitId, todayIso)
      .some((occ) => occ.occupancy_type === 'reservation')

    const dayBars = calendarDays.value.map((day) => {
      const unitOccs = getUnitOccupanciesForDay(unitMeta.unitId, day.date)
      const reservationOcc = unitOccs.find((occ) => occ.occupancy_type === 'reservation' && occ.reservation_id)

      return {
        date: day.date,
        dayNumber: day.dayNumber,
        today: day.date === todayIso,
        reservationId: reservationOcc?.reservation_id || null,
      }
    })

    return {
      ...unitMeta,
      occupiedNow,
      dayBars,
    }
  })
})

const filteredOccupancies = computed(() => {
  if (selectedVenueSet.value.size === 0) return occupancies.value
  return occupancies.value.filter((occ) => selectedVenueSet.value.has(occ.units?.venue_id))
})

const calendarMetrics = computed(() => {
  if (calendarDays.value.length === 0 || !periodFrom.value || !periodTo.value) return null

  const totalDays = calendarDays.value.length
  const visibleUnitCount = visibleVenues.value.reduce((sum, v) => sum + getUnitsByVenue(v.id).length, 0)
  const totalUnitDays = totalDays * visibleUnitCount

  const [ey, em, ed] = periodTo.value.split('-').map(Number)
  const toExclusive = new Date(Date.UTC(ey, em - 1, ed + 1)).toISOString().slice(0, 10)

  let occupiedUnitDays = 0
  let arrivals = 0
  let departures = 0
  const seenArrivals = new Set()
  const seenDepartures = new Set()

  filteredOccupancies.value.forEach((occ) => {
    if (occ.occupancy_type !== 'reservation') return

    const start = occ.start_date > periodFrom.value ? occ.start_date : periodFrom.value
    const end = occ.end_date < toExclusive ? occ.end_date : toExclusive
    if (end <= start) return

    occupiedUnitDays += Math.round((new Date(end) - new Date(start)) / 86400000)

    const resId = occ.reservation_id || occ.id
    const checkIn = occ.reservations?.check_in || occ.start_date
    if (!seenArrivals.has(resId) && checkIn >= periodFrom.value && checkIn <= periodTo.value) {
      seenArrivals.add(resId)
      arrivals++
    }

    const checkOut = occ.reservations?.check_out || occ.end_date
    if (!seenDepartures.has(resId) && checkOut >= periodFrom.value && checkOut <= periodTo.value) {
      seenDepartures.add(resId)
      departures++
    }
  })

  const occupancyPct = totalUnitDays > 0 ? Math.round((occupiedUnitDays / totalUnitDays) * 100) : 0
  return { occupancyPct, arrivals, departures }
})

const periodoEntradas = computed(() => {
  if (!periodFrom.value || !periodTo.value) return []
  const map = new Map()
  filteredOccupancies.value
    .filter((occ) => occ.occupancy_type === 'reservation')
    .forEach((occ) => {
      const checkIn = occ.reservations?.check_in || occ.start_date
      if (checkIn < periodFrom.value || checkIn > periodTo.value) return
      const key = occ.reservation_id || occ.id
      if (!map.has(key)) {
        map.set(key, {
          key,
          date: checkIn,
          guestName: `${occ.reservations?.guests?.first_name || ''} ${occ.reservations?.guests?.last_name || ''}`.trim() || '-',
          pax: Number(occ.reservations?.adults || 0) + Number(occ.reservations?.minors || 0) + Number(occ.reservations?.children || 0) + Number(occ.reservations?.infants || 0),
          status: occ.reservations?.status || '',
          preregistroStatus: occ.reservations?.preregistro_status || '',
          checkInTimeLabel: getEntryTimeLabel(occ),
          unitNames: [],
          reservationId: occ.reservation_id,
        })
      }
      const name = occ.units?.name
      if (name && !map.get(key).unitNames.includes(name)) map.get(key).unitNames.push(name)
    })
  return Array.from(map.values())
    .map((e) => ({ ...e, unitLabel: e.unitNames.join(', ') }))
    .sort((a, b) => a.date.localeCompare(b.date))
})

const periodoSalidas = computed(() => {
  if (!periodFrom.value || !periodTo.value) return []
  const map = new Map()
  filteredOccupancies.value
    .filter((occ) => occ.occupancy_type === 'reservation')
    .forEach((occ) => {
      const checkOut = occ.reservations?.check_out || occ.end_date
      if (checkOut < periodFrom.value || checkOut > periodTo.value) return
      const key = occ.reservation_id || occ.id
      if (!map.has(key)) {
        map.set(key, {
          key,
          date: checkOut,
          guestName: `${occ.reservations?.guests?.first_name || ''} ${occ.reservations?.guests?.last_name || ''}`.trim() || '-',
          pax: Number(occ.reservations?.adults || 0) + Number(occ.reservations?.minors || 0) + Number(occ.reservations?.children || 0) + Number(occ.reservations?.infants || 0),
          status: occ.reservations?.status || '',
          checkOutTimeLabel: getExitTimeLabel(occ),
          unitNames: [],
          reservationId: occ.reservation_id,
        })
      }
      const name = occ.units?.name
      if (name && !map.get(key).unitNames.includes(name)) map.get(key).unitNames.push(name)
    })
  return Array.from(map.values())
    .map((e) => ({ ...e, unitLabel: e.unitNames.join(', ') }))
    .sort((a, b) => a.date.localeCompare(b.date))
})

const todayAgendaEvents = computed(() => {
  const todayIso = periodFrom.value
  const grouped = new Map()

  filteredOccupancies.value
    .filter((occ) => occ.occupancy_type === 'reservation')
    .forEach((occ) => {
      const checkIn = occ.reservations?.check_in || occ.start_date
      const checkOut = occ.reservations?.check_out || occ.end_date
      const isEntry = checkIn === todayIso
      const isExit = checkOut === todayIso
      const inStay = todayIso > checkIn && todayIso < checkOut

      if (!isEntry && !isExit && !inStay) return

      const key = occ.reservation_id || occ.id
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          sourceOccupancy: occ,
          unitNames: new Set(),
          eventType: isEntry ? 'Entrada' : isExit ? 'Salida' : 'Estadia',
          pax: Number(occ.reservations?.adults || 0) + Number(occ.reservations?.minors || 0) + Number(occ.reservations?.children || 0) + Number(occ.reservations?.infants || 0),
          sourceDetail: occ.reservations?.source_detail_info?.label_es || '',
          balance: Math.max(0, Number(occ.reservations?.total_amount || 0) - Number(occ.reservations?.paid_amount || 0))
        })
      }

      grouped.get(key).unitNames.add(occ.units?.name || 'Unidad')
    })

  return Array.from(grouped.values()).map((event) => ({
    ...event,
    unitLabel: Array.from(event.unitNames).join(', ')
  }))
  .sort((a, b) => {
    const priority = { Entrada: 1, Salida: 2, Estadia: 3 }
    return (priority[a.eventType] || 99) - (priority[b.eventType] || 99)
  })
})

async function fetchMasterData() {
  const accountId = accountStore.getRequiredAccountId()
  const [{ data: venuesData }, { data: unitsData }] = await Promise.all([
    supabase.from('venues').select('id, name').eq('account_id', accountId).order('name', { ascending: true }),
    supabase.from('units').select('id, name, venue_id, venues(name)').eq('account_id', accountId).eq('is_active', true).order('name', { ascending: true })
  ])

  const mergedVenues = [...(venuesData || [])]
  const knownVenueIds = new Set(mergedVenues.map((venue) => venue.id))
  const normalizedUnits = unitsData || []

  for (const unit of normalizedUnits) {
    if (!unit?.venue_id || knownVenueIds.has(unit.venue_id)) continue
    mergedVenues.push({
      id: unit.venue_id,
      name: unit.venues?.name || String(unit.venue_id),
    })
    knownVenueIds.add(unit.venue_id)
  }

  venues.value = mergedVenues
  units.value = normalizedUnits

  selectedVenueIds.value = selectedVenueIds.value.filter((venueId) => knownVenueIds.has(venueId))

  if (selectedVenueIds.value.length === 0) {
    selectedVenueIds.value = Array.from(knownVenueIds)
  }
}

async function fetchOccupancies() {
  if (!periodFrom.value || !periodTo.value) return

  loading.value = true

  try {
    const toExclusive = addIsoDays(periodTo.value, 1)

    const accountId = accountStore.getRequiredAccountId()
    const { data } = await supabase
      .from('occupancies')
      .select('id, unit_id, start_date, end_date, occupancy_type, reservation_id, inquiry_id, notes, units(name, venue_id, venues(name)), reservations(id, guests!reservations_guest_id_fkey(first_name, last_name), adults, minors, children, infants, source_detail_info:source_details!reservations_source_detail_id_fkey(label_es), total_amount, paid_amount, check_in, check_out, checkin_date, checkout_date, status)')
      .eq('account_id', accountId)
      .lt('start_date', toExclusive)
      .gte('end_date', periodFrom.value)
      .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')

    occupancies.value = (data || [])
      .filter((occ) => occ.occupancy_type !== 'reservation' || occ.reservations?.status !== 'cancelled')
      .map((occ) => ({
      ...occ,
      start_date: normalizeIsoDate(occ.start_date),
      end_date: normalizeIsoDate(occ.end_date),
      reservations: occ.reservations
        ? {
            ...occ.reservations,
            check_in: normalizeIsoDate(occ.reservations.check_in),
            check_out: normalizeIsoDate(occ.reservations.check_out)
          }
        : occ.reservations
    }))
  } finally {
    loading.value = false
  }
}

async function fetchMessageSettingsData() {
  const accountId = accountStore.getRequiredAccountId()
  try {
    const settings = await getMessageSettings(accountId)
    messageSettings.value = {
      ...DEFAULT_MESSAGE_SETTINGS,
      ...settings,
    }
  } catch {
    messageSettings.value = { ...DEFAULT_MESSAGE_SETTINGS }
  }
}

function getUnitsByVenue(venueId) {
  return units.value.filter((unit) => unit.venue_id === venueId)
}

function getOccupanciesForDay(dateStr) {
  return filteredOccupancies.value.filter((occ) => dateStr >= occ.start_date && dateStr < occ.end_date)
}

function getIsoDayDiff(startIso, endIso) {
  const [sy, sm, sd] = startIso.split('-').map(Number)
  const [ey, em, ed] = endIso.split('-').map(Number)
  const startMs = Date.UTC(sy, sm - 1, sd)
  const endMs = Date.UTC(ey, em - 1, ed)
  return Math.round((endMs - startMs) / 86400000)
}

function getClassicSegmentsForDay(dateStr) {
  const dayIndex = (calendarDayIndexMap.value.get(dateStr) || 1) - 1
  const rowStartIndex = dayIndex - (dayIndex % 7)
  const rowStart = calendarDays.value[rowStartIndex]?.date
  if (!rowStart) return []

  const dayInRow = dayIndex - rowStartIndex
  const rowLayout = classicRowLayoutMap.value.get(rowStart)
  if (!rowLayout) return []

  return rowLayout.segments.filter((segment) => segment.rowColStart === dayInRow + 1)
}

function getClassicRowLaneCount(dateStr) {
  const dayIndex = (calendarDayIndexMap.value.get(dateStr) || 1) - 1
  const rowStartIndex = dayIndex - (dayIndex % 7)
  const rowStart = calendarDays.value[rowStartIndex]?.date
  if (!rowStart) return 0
  return classicRowLayoutMap.value.get(rowStart)?.laneCount || 0
}

function getUnitOccupanciesForDay(unitId, dateStr) {
  return filteredOccupancies.value.filter((occ) => occ.unit_id === unitId && dateStr >= occ.start_date && dateStr < occ.end_date)
}

function getUnitOccupancies(unitId) {
  return filteredOccupancies.value
    .filter((occ) => occ.unit_id === unitId)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
}

function getUnitSegmentsForComplete(unitId) {
  if (!periodFrom.value || !periodTo.value || calendarDays.value.length === 0) return []

  const rangeStart = periodFrom.value
  const rangeEndExclusive = addIsoDays(periodTo.value, 1)
  const totalDays = calendarDays.value.length
  const indexMap = calendarDayIndexMap.value

  return getUnitOccupancies(unitId)
    .map((occ) => {
      const occStart = normalizeIsoDate(occ.start_date)
      const occEnd = normalizeIsoDate(occ.end_date)

      const startClamped = occStart > rangeStart ? occStart : rangeStart
      const endClamped = occEnd < rangeEndExclusive ? occEnd : rangeEndExclusive

      const colStart = indexMap.get(startClamped) || 1
      const colEnd = endClamped >= rangeEndExclusive
        ? totalDays + 1
        : (indexMap.get(endClamped) || totalDays + 1)

      if (colEnd <= colStart) return null

      const checkoutInView = occEnd < rangeEndExclusive
      const checkinInView = occStart >= rangeStart
      const marginLeft = checkinInView ? 'calc(var(--complete-day-col-width) / 3)' : '0px'
      const marginRight = checkoutInView && colEnd < totalDays
        ? 'calc((-1 * var(--complete-day-col-width) / 3) + var(--complete-segment-gap))'
        : '0px'

      return {
        ...occ,
        colStart,
        colEnd,
        contextDate: startClamped,
        // true when the checkout falls within the visible range (not clamped to the right edge)
        checkoutInView,
        // true when the check-in falls within the visible range (not clamped to the left edge)
        checkinInView,
        segmentMargin: `6px ${marginRight} 6px ${marginLeft}`
      }
    })
    .filter(Boolean)
}

function occupancyColor(occ) {
  return {
    reservation: 'bg-blue-500',
    maintenance: 'bg-orange-500',
    owner_use: 'bg-purple-500',
    inquiry_hold: 'bg-amber-500',
    external: 'bg-gray-500'
  }[occ.occupancy_type] || 'bg-gray-400'
}

function occupancyDotColor(occ) {
  return occupancyColor(occ).replace('bg-', 'bg-')
}

function occupancyBorderClass(occ, date) {
  const type = getOccupancyTypeLabel(occ, date)
  if (type === 'Entrada') return 'border-l-4 border-l-green-300'
  if (type === 'Salida') return 'border-l-4 border-l-red-400'
  return ''
}

function getOccupancyDisplayLabel(occ, mode) {
  if (mode === 'por_unidad' && occ.occupancy_type === 'reservation') {
    return occ.reservations?.guests?.first_name ? `${occ.reservations.guests.first_name || ''} ${occ.reservations.guests.last_name || ''}`.trim() : 'Reserva'
  }

  return occ.units?.name || 'Unidad'
}

function getExternalSource(occ) {
  if (!occ?.notes) return ''
  const notesFirstLine = String(occ.notes).split('\n')[0].trim()
  return notesFirstLine.match(/\(([^)]+)\)/)?.[1] || notesFirstLine
}

function getOccupancyTypeLabel(occ, contextDate = null) {
  if (occ.occupancy_type === 'reservation') {
    const checkIn = occ.reservations?.check_in || occ.start_date
    const checkOut = occ.reservations?.check_out || occ.end_date

    if (contextDate && contextDate === checkIn) return 'Entrada'
    if (contextDate && contextDate === checkOut) return 'Salida'
    return 'Estadia'
  }

  if (occ.occupancy_type === 'inquiry_hold') return 'Hold'
  return 'Bloqueo'
}

function goToOccupancyDetail(occ) {
  if (!occ) return

  if (occ.occupancy_type === 'reservation' && occ.reservation_id) {
    router.push(`/reservas/${occ.reservation_id}`)
    return
  }

  if (occ.occupancy_type === 'inquiry_hold' && occ.inquiry_id) {
    router.push(`/consultas/${occ.inquiry_id}`)
    return
  }

  router.push(`/bloqueos/${occ.id}`)
}

function openDaySheet(dateStr) {
  selectedDayForSheet.value = dateStr
  daySheetOpen.value = true
}

function getPointerPosition(event) {
  const targetRect = event.currentTarget?.getBoundingClientRect?.()

  const x = typeof event.clientX === 'number' && event.clientX > 0
    ? event.clientX
    : (targetRect ? targetRect.left + targetRect.width / 2 : 120)

  const y = typeof event.clientY === 'number' && event.clientY > 0
    ? event.clientY
    : (targetRect ? targetRect.top + targetRect.height / 2 : 120)

  return { x, y }
}

function setTooltipPosition(event) {
  const pointer = getPointerPosition(event)
  const tooltipWidth = 320
  const tooltipHeight = 220
  const spacing = 14

  let x = pointer.x + spacing
  let y = pointer.y + spacing

  if (x + tooltipWidth > window.innerWidth - 8) {
    x = Math.max(8, pointer.x - tooltipWidth - spacing)
  }

  if (y + tooltipHeight > window.innerHeight - 8) {
    y = Math.max(8, pointer.y - tooltipHeight - spacing)
  }

  tooltip.value.position = { x, y }
}

function openDesktopTooltip(event, occ, contextDate) {
  if (isTouchDevice.value || periodPreset.value === 'today') return

  tooltip.value.visible = true
  tooltip.value.occupancy = occ
  tooltip.value.contextDate = contextDate
  setTooltipPosition(event)
}

function closeDesktopTooltip() {
  if (isTouchDevice.value) return
  tooltip.value.visible = false
}

function onOccupancyClick(event, occ, contextDate) {
  if (!occ) return

  if (isTouchDevice.value) {
    tooltip.value.visible = true
    tooltip.value.occupancy = occ
    tooltip.value.contextDate = contextDate
    setTooltipPosition(event)
    return
  }

  goToOccupancyDetail(occ)
}

function onOutsideClick(event) {
  if (!tooltip.value.visible || !isTouchDevice.value) return

  const inTooltip = tooltipRef.value?.contains(event.target)
  const inTrigger = event.target?.closest?.('[data-occ-trigger="true"]')

  if (!inTooltip && !inTrigger) {
    tooltip.value.visible = false
  }
}

const tooltipDetails = computed(() => {
  const occ = tooltip.value.occupancy
  if (!occ) {
    return {
      unitName: '',
      typeLabel: '',
      dateRange: '',
      nights: 0,
      holderName: '',
      paxLabel: '',
      sourceLabel: '',
      balance: 0,
      reason: ''
    }
  }

  const pax = Number(occ.reservations?.adults || 0) + Number(occ.reservations?.minors || 0) + Number(occ.reservations?.children || 0) + Number(occ.reservations?.infants || 0)
  const balance = occ.occupancy_type === 'reservation'
    ? Math.max(0, Number(occ.reservations?.total_amount || 0) - Number(occ.reservations?.paid_amount || 0))
    : 0
  const nights = Math.max(
    0,
    Math.ceil((new Date(occ.end_date) - new Date(occ.start_date)) / (1000 * 60 * 60 * 24))
  )
  const notesFirstLine = occ.notes ? String(occ.notes).split('\n')[0].trim() : ''
  const externalSource = occ.occupancy_type === 'external' ? getExternalSource(occ) : ''
  const reason = ['maintenance', 'owner_use'].includes(occ.occupancy_type)
    ? notesFirstLine
    : ''

  return {
    unitName: occ.units?.name || 'Unidad',
    typeLabel: getOccupancyTypeLabel(occ, tooltip.value.contextDate),
    dateRange: `${occ.start_date} -> ${occ.end_date}`,
    nights,
    holderName: occ.occupancy_type === 'reservation' ? (`${occ.reservations?.guests?.first_name || ''} ${occ.reservations?.guests?.last_name || ''}`.trim() || '') : '',
    paxLabel: occ.occupancy_type === 'reservation' ? String(pax) : '',
    sourceLabel: occ.occupancy_type === 'reservation'
      ? (occ.reservations?.source_detail_info?.label_es || '')
      : occ.occupancy_type === 'external' ? externalSource : '',
    balance,
    reason
  }
})

function toggleVenueFilter(venueId) {
  if (selectedVenueIds.value.includes(venueId)) {
    selectedVenueIds.value = selectedVenueIds.value.filter((id) => id !== venueId)
    return
  }

  selectedVenueIds.value = [...selectedVenueIds.value, venueId]
}

function toggleVenueCollapse(venueId) {
  collapsedVenues.value = {
    ...collapsedVenues.value,
    [venueId]: !collapsedVenues.value[venueId]
  }
}

function isVenueCollapsed(venueId) {
  return Boolean(collapsedVenues.value[venueId])
}

function toggleUnitCollapse(unitId) {
  collapsedUnits.value = {
    ...collapsedUnits.value,
    [unitId]: !collapsedUnits.value[unitId]
  }
}

function isUnitCollapsed(unitId) {
  return Boolean(collapsedUnits.value[unitId])
}

function goToPreviousWeek() {
  weekStart.value = addDays(weekStart.value, -7)
}

function goToNextWeek() {
  weekStart.value = addDays(weekStart.value, 7)
}

function goToPreviousMonth() {
  monthStart.value = new Date(monthStart.value.getFullYear(), monthStart.value.getMonth() - 1, 1)
}

function goToNextMonth() {
  monthStart.value = new Date(monthStart.value.getFullYear(), monthStart.value.getMonth() + 1, 1)
}

function goToPreviousDay() {
  if (!periodFrom.value) return
  const previous = addIsoDays(periodFrom.value, -1)
  periodFrom.value = previous
  periodTo.value = previous
  if (periodPreset.value !== 'custom') {
    periodPreset.value = 'custom'
  }
}

function goToNextDay() {
  if (!periodFrom.value) return
  const next = addIsoDays(periodFrom.value, 1)
  periodFrom.value = next
  periodTo.value = next
  if (periodPreset.value !== 'custom') {
    periodPreset.value = 'custom'
  }
}

function preregistroBadgeLabel(status) {
  if (!status) return 'Sin preregistro'

  const map = {
    completo: 'Pre-registro completo',
    incompleto: 'Pre-registro incompleto',
    pendiente: 'Pre-registro pendiente',
    rechazado: 'Pre-registro rechazado',
  }

  return map[String(status).toLowerCase()] || String(status)
}

function preregistroBadgeClass(status) {
  if (!status) return 'bg-gray-100 text-gray-600'

  const normalized = String(status).toLowerCase()
  if (normalized === 'completo') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'incompleto' || normalized === 'pendiente') return 'bg-amber-100 text-amber-700'
  if (normalized === 'rechazado') return 'bg-red-100 text-red-700'
  return 'bg-indigo-100 text-indigo-700'
}

onMounted(async () => {
  isTouchDevice.value = Boolean(window.matchMedia?.('(pointer: coarse)')?.matches || 'ontouchstart' in window)

  const restored = restoreCalendarState()
  const queryOverrideApplied = applyQueryPeriodOverrides()

  if (!restored && !queryOverrideApplied) {
    applyPreset()
  }

  await Promise.all([fetchMasterData(), fetchMessageSettingsData()])
  await fetchOccupancies()

  document.addEventListener('click', onOutsideClick)
})

onBeforeUnmount(() => {
  saveCalendarState()
  document.removeEventListener('click', onOutsideClick)
})

watch(periodPreset, async () => {
  applyPreset()
  if (periodPreset.value !== 'custom') {
    showMobileRangePicker.value = false
  }
  tooltip.value.visible = false
  saveCalendarState()
  await fetchOccupancies()
})

watch(viewMode, () => {
  saveCalendarState()
})

watch(activeTab, () => {
  saveCalendarState()
})

watch(weekStart, async () => {
  if (periodPreset.value !== 'this_week') return
  applyPreset()
  await fetchOccupancies()
})

watch(monthStart, async () => {
  if (periodPreset.value !== 'this_month') return
  applyPreset()
  await fetchOccupancies()
})

watch([periodFrom, periodTo], async () => {
  if (periodPreset.value !== 'custom') return
  saveCalendarState()
  await fetchOccupancies()
})
</script>

<style scoped>
.view-mode-toggle {
  display: inline-flex;
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}

.calendar-tabs {
  width: fit-content;
}

.toggle-btn {
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 400;
  border: 1px solid #e5e7eb;
  margin: -1px;
  background: #ffffff;
  color: #6b7280;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  background: #eef2ff;
  border-color: #4c2fff;
  color: #4c2fff;
  font-weight: 500;
}

.legend-collapse-enter-active,
.legend-collapse-leave-active {
  transition: all 0.2s ease;
}

.legend-collapse-enter-from,
.legend-collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.legend-collapse-enter-to,
.legend-collapse-leave-from {
  max-height: 120px;
  opacity: 1;
}
</style>
