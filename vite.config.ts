import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { version } from './package.json'

// base './' permette di pubblicare l'app in una sottocartella (es. GitHub Pages).
// "npm run dev:https" avvia in HTTPS: serve per usare la fotocamera dal telefono in Wi-Fi.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  base: './',
  // scanner ed Excel sono grandi ma si scaricano solo quando servono
  build: { chunkSizeWarningLimit: 1000 },
  define: {
    __VERSIONE_APP__: JSON.stringify(version),
  },
}))
