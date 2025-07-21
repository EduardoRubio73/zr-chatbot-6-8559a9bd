
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'offline.html',
        'manifest.json'
      ],
      manifest: {
        name: 'ZRChat - Mensagens Instantâneas',
        short_name: 'ZRChat',
        description: 'Sistema de chat inteligente para comunicação empresarial e pessoal',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#25D366',
        orientation: 'portrait-primary',
        scope: '/',
        lang: 'pt-BR',
        categories: ['business', 'productivity', 'communication', 'social'],
        icons: [
          {
            src: 'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Nova Conversa',
            short_name: 'Nova',
            description: 'Iniciar uma nova conversa',
            url: '/chat?action=new',
            icons: [
              {
                src: 'https://bwplxdikxtnsoavmijpi.supabase.co/storage/v1/object/public/chat-imagens/whatsapp.png',
                sizes: '96x96'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/bwplxdikxtnsoavmijpi\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-avatar']
        }
      }
    }
  }
}));
