import './index.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAccountStore } from './stores/account'
import { useSourcesStore } from './stores/sources'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const bootstrap = async () => {
	const accountStore = useAccountStore(pinia)
	const sourcesStore = useSourcesStore(pinia)
	await accountStore.initializeFromSession()
	if (accountStore.currentAccountId) {
		await sourcesStore.preload(accountStore.currentAccountId)
	}
	app.mount('#app')
}

bootstrap()
