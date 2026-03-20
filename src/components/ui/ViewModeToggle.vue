<template>
  <div class="view-mode-toggle">
    <button
      type="button"
      :class="['toggle-btn', 'toggle-table', { active: modelValue === 'table' }]"
      @click="$emit('update:modelValue', 'table')"
      title="Vista tabla"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="6" height="6" fill="currentColor" opacity="0.3" />
        <rect x="9" y="1" width="6" height="6" fill="currentColor" opacity="0.3" />
        <rect x="1" y="9" width="6" height="6" fill="currentColor" opacity="0.3" />
        <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.3" />
      </svg>
      <span>Tabla</span>
    </button>
    <button
      type="button"
      :class="['toggle-btn', 'toggle-cards', { active: modelValue === 'cards' }]"
      @click="$emit('update:modelValue', 'cards')"
      title="Vista tarjetas"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="14" height="3" fill="currentColor" opacity="0.3" />
        <rect x="1" y="6" width="14" height="3" fill="currentColor" opacity="0.3" />
        <rect x="1" y="11" width="14" height="3" fill="currentColor" opacity="0.3" />
      </svg>
      <span>Tarjetas</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true,
    validator: (value) => ['table', 'cards'].includes(value)
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.view-mode-toggle {
  display: inline-flex;
  gap: 0;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 400;
  border: 1px solid #E5E7EB;
  margin: -1px;
  background: #FFFFFF;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:first-child {
  border-radius: 6px 0 0 6px;
}

.toggle-btn:last-child {
  border-radius: 0 6px 6px 0;
}

.toggle-btn:hover {
  background: #F9FAFB;
  color: #4B5563;
}

.toggle-btn.active {
  background: #EEF2FF;
  border-color: #4C2FFF;
  color: #4C2FFF;
  font-weight: 500;
}

.toggle-btn svg {
  width: 16px;
  height: 16px;
  color: inherit;
}
</style>
