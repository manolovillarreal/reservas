<template>
  <div class="max-w-md mx-auto">
    <div class="bg-white p-8 rounded border border-gray-200 shadow-sm" id="print-area">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-black tracking-widest text-gray-800">MARMANU HOUSE</h2>
      </div>

      <div class="space-y-4 text-sm mb-8 text-gray-700">
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="font-bold">Reserva:</span>
          <span>{{ res.reservation_number || '-' }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="font-bold">Huésped:</span>
          <span>{{ guestName }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="font-bold">Fechas:</span>
          <span>{{ res.check_in }} al {{ res.check_out }} ({{ res.nights }} Noches)</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="font-bold">Valor Total:</span>
          <span>${{ res.total_amount }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="font-bold">Pagado:</span>
          <span>${{ res.paid_amount || 0 }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2 font-black text-lg">
          <span class="text-gray-900">Saldo Pendiente:</span>
          <span :class="res.balance > 0 ? 'text-red-600' : 'text-emerald-600'">${{ res.balance }}</span>
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded text-xs text-gray-500 text-center">
        Check-in: 15:00 hs | Check-out: 11:00 hs
      </div>
    </div>

    <div class="flex justify-center gap-3 mt-6 print:hidden">
      <button @click="copyForWhatsApp" class="flex-1 bg-green-500 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 font-semibold shadow-sm transition-colors">
        Copiar para WhatsApp
      </button>
      <button @click="printVoucher" class="flex-1 bg-gray-800 text-white px-4 py-2.5 rounded-lg hover:bg-gray-900 font-semibold shadow-sm transition-colors">
        Exportar PDF / Imprimir
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ res: { type: Object, required: true } })

const guestName = props.res.guests?.name || props.res.guest_name || 'Sin nombre'

const copyForWhatsApp = async () => {
  const text = `🏨 *RESERVA MARMANU HOUSE*
👤 Titular: ${guestName}
📅 Fecha: ${props.res.check_in} al ${props.res.check_out}
🌙 Noches: ${props.res.nights} | 👥 Personas: ${Number(props.res.adults || 0) + Number(props.res.children || 0)}
💰 Total: $${props.res.total_amount}
✅ Pagado: $${props.res.paid_amount || 0}
⚠️ Saldo Pendiente: $${props.res.balance}

¡Gracias por elegirnos! Quedamos atentos.`

  await navigator.clipboard.writeText(text)
  alert('¡Plantilla copiada al portapapeles!')
}

const printVoucher = () => window.print()
</script>

<style scoped>
@media print {
  body * { visibility: hidden; }
  #print-area, #print-area * { visibility: visible; }
  #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
}
</style>
