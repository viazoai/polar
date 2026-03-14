import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg", "apple-touch-icon.svg"],
      manifest: {
        name: "Polar — 가족 추억 기록소",
        short_name: "Polar",
        description: "가족 사진을 폴라로이드 감성 타임라인으로 기록하세요",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        runtimeCaching: [
          {
            // 썸네일 이미지: Cache First (30일)
            urlPattern: /^\/api\/photos\/\d+\/thumbnail\//,
            handler: "CacheFirst",
            options: {
              cacheName: "photo-thumbnails",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 순간 API: Network First (1일 캐시)
            urlPattern: /^\/api\/moments/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-moments",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: "/offline.html",
        navigateFallbackAllowlist: [/^(?!\/api)/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["polar.zoai.uk"],
    proxy: {
      "/api": {
        target: "http://polar-api:8000",
        changeOrigin: true,
      },
    },
  },
})
