<template>
  <AppToast />
  <router-view v-if="route.meta.plainLayout" />
  <AppLayout v-else />
</template>

<script setup>
import { useRoute } from 'vue-router'
import AppLayout from './components/layout/AppLayout.vue'
import AppToast from './components/ui/AppToast.vue'

const route = useRoute()
</script>

