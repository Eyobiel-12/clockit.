import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Tijdens `npm run dev` gaan API-verzoeken naar de backend (lokaal of in Docker).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
