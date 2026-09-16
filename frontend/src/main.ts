import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { modalFocus } from './directives/modalFocus'

createApp(App).directive('modal-focus', modalFocus).mount('#app')
