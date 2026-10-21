import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pruebas (npm test). happy-dom simula el navegador; setup.js agrega los
  // matchers de Testing Library (toBeInTheDocument, etc.).
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // Zona horaria de Colombia: el bug de las fechas corridas un día solo
    // aparece con un desfase negativo respecto a UTC. En UTC (como en CI)
    // la prueba pasaría aunque el bug volviera.
    env: { TZ: 'America/Bogota' },
    // La cobertura se mide sobre TODO src, no solo sobre los archivos que
    // alguna prueba importa: si no, el porcentaje engaña.
    coverage: {
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}', 'src/main.jsx'],
    },
  },
})
