import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 👇 IMPORTANTE: debe coincidir EXACTAMENTE con el nombre de tu repo en GitHub
const REPO_NAME = 'Datos-de-estudiantes';
const BASE_PATH = `/${REPO_NAME}/`;

export default defineConfig(() => {
  return {
    base: BASE_PATH,  // 👈 CLAVE para GitHub Pages
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: BASE_PATH,
          name: 'Gestión Escolar Sheets',
          short_name: 'EscolarApp',
          description: 'Gestión de estudiantes, notas y asistencia sincronizado con Google Sheets',
          theme_color: '#2563eb',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          start_url: BASE_PATH,   // 👈 antes era '/'
          scope: BASE_PATH,       // 👈 antes era '/'
          icons: [
            {
              src: `${BASE_PATH}pwa-192x192.png`,  // 👈 antes era '/...'
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${BASE_PATH}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${BASE_PATH}pwa-maskable-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
