import './index.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import router from './router'
import App from './App.vue'
import { clearPwaUpdateAvailable, notifyPwaUpdateAvailable } from './composables/useConnectivity'
import { warmPriorityOfflineData } from './services/offlineWarmup'
import { useAccountStore } from './stores/account'
import { useSourcesStore } from './stores/sources'

const app = createApp(App)
const pinia = createPinia()

const updateServiceWorker = registerSW({
	immediate: true,
	onNeedRefresh() {
		notifyPwaUpdateAvailable(async () => {
			clearPwaUpdateAvailable()
			await updateServiceWorker(true)
		})
	},
})

app.use(pinia)
app.use(router)

const bootstrap = async () => {
	const accountStore = useAccountStore(pinia)
	const sourcesStore = useSourcesStore(pinia)
	await accountStore.initializeFromSession()
	if (accountStore.currentAccountId) {
		await sourcesStore.preload(accountStore.currentAccountId)
		void warmPriorityOfflineData(pinia)
	}
	app.mount('#app')
}

bootstrap()
