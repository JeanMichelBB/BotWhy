import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createProxyMiddleware } from 'http-proxy-middleware';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy configuration for API requests
      '/api': {
        target: 'http://localhost:8000', // Replace with your backend server URL
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Referrer-Policy'] = 'no-referrer-when-downgrade';
          });
        },
      },
    },
  },
});