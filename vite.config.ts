import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { version } from './package.json'

// base './' permette di pubblicare l'app in una sottocartella (es. GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __VERSIONE_APP__: JSON.stringify(version),
  },
})
