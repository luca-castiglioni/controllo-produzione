import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' permette di pubblicare l'app in una sottocartella (es. GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
})
