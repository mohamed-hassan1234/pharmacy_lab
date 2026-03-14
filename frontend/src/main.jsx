import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://saalim.somzaki.com').replace(/\/+$/, '')

axios.defaults.baseURL = apiBaseUrl
axios.defaults.withCredentials = true

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
