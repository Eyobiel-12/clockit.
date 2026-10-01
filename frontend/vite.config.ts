import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Zelfde adres als de Docker-website, zodat `npm start` de site met live verversen op 8090 draait.
    port: 8090,
    strictPort: true,
    // Tijdens `npm run dev` gaan API-verzoeken naar de backend (lokaal of in Docker).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
