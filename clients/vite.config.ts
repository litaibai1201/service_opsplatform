import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles')
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }
          
          // UI libraries
          if (id.includes('@headlessui') || id.includes('@heroicons') || id.includes('framer-motion')) {
            return 'ui-vendor';
          }
          
          // Editor and design tools
          if (id.includes('monaco') || id.includes('flow-renderer') || id.includes('d3') || id.includes('konva')) {
            return 'editor-vendor';
          }
          
          // State management and data fetching
          if (id.includes('redux') || id.includes('axios') || id.includes('@reduxjs')) {
            return 'data-vendor';
          }
          
          // Utility libraries
          if (id.includes('dayjs') || id.includes('uuid') || id.includes('clsx') || id.includes('lodash')) {
            return 'utils-vendor';
          }
          
          // Admin pages
          if (id.includes('/pages/admin/')) {
            return 'admin-pages';
          }
          
          // Design tools pages
          if (id.includes('/pages/design-tools/')) {
            return 'design-pages';
          }
          
          // Auth pages
          if (id.includes('/pages/auth/')) {
            return 'auth-pages';
          }
          
          // Main app pages
          if (id.includes('/pages/')) {
            return 'app-pages';
          }
          
          // Components
          if (id.includes('/components/')) {
            return 'components';
          }
          
          // Node modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.[^.]+$/, '')
            : 'unknown';
          return `js/[name]-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return 'images/[name]-[hash][extname]';
          }
          if (/css/i.test(extType || '')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  }
})