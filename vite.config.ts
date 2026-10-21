import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function suppressViteLogsPlugin(): Plugin {
  return {
    name: 'suppress-vite-client-logs',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            injectTo: 'head-prepend',
            children: `
              (function() {
                const isViteWs = (msg) => {
                  if (!msg) return false;
                  try {
                    const s = typeof msg === 'object' ? (msg.message || msg.reason || '') : String(msg);
                    return s.includes('[vite]') || s.includes('failed to connect') || s.includes('WebSocket') || s.includes('server connection lost');
                  } catch (e) {
                    return false;
                  }
                };
                ['error', 'warn', 'log', 'info', 'debug'].forEach(function(m) {
                  const orig = console[m];
                  if (typeof orig === 'function') {
                    console[m] = function(...args) {
                      if (args.some(isViteWs)) return;
                      orig.apply(console, args);
                    };
                  }
                });
                window.addEventListener('error', function(e) {
                  if (isViteWs(e.message) || isViteWs(e.filename)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  if (isViteWs(e.reason)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              })();
            `,
          },
        ];
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      suppressViteLogsPlugin(),
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'OH Store POS',
          short_name: 'OH Store',
          description: 'Sistema de punto de venta y gestión de inventario.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            }
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-ui': ['lucide-react', 'motion', 'react-hot-toast'],
          },
        },
      },
    },
    server: {
      hmr: false,
    },
  };
});
