import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.jpg', 'bg.png', 'robots.txt'],
      manifest: {
        name: 'The CueStation',
        short_name: 'CueStation',
        description: 'Management Software for CueStation',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Precaching: Matches your "RULE 3 & 4" for local static assets and pages
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        
        // Don't fallback on index.html for API routes (Safety measure)
        navigateFallbackDenylist: [/^\/auth/, /^\/rest/, /^\/realtime/],

        runtimeCaching: [
          // -----------------------------------------------------------
          // RULE 1: CRITICAL - Mutations (POST/PATCH/DELETE)
          // Matches your Next.js "NetworkOnly" rule
          // -----------------------------------------------------------
          {
            urlPattern: ({ url, request }) => {
              // Target Supabase API or any backend URL
              return url.hostname.includes('supabase.co') && 
                     (request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE');
            },
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'mutation-queue',
                options: {
                  maxRetentionTime: 24 * 60 // Retry for up to 24 hours if offline
                }
              }
            }
          },

          // -----------------------------------------------------------
          // RULE 2: Data Fetching (GET requests)
          // Matches your Next.js "NetworkFirst" rule for fresh data
          // -----------------------------------------------------------
          {
            urlPattern: ({ url, request }) => {
              return url.hostname.includes('supabase.co') && request.method === 'GET';
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supa-data-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },

          // -----------------------------------------------------------
          // RULE 3: External Images (Supabase Storage bucket)
          // Matches your Next.js "CacheFirst" rule for images
          // -----------------------------------------------------------
          {
            urlPattern: ({ url }) => {
              return url.pathname.includes('/storage/v1/object/public');
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'supa-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));