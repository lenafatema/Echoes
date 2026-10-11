import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/three/') || id.includes('/@react-three/fiber/')) return 'r3f-core';
          if (id.includes('/@react-three/drei/')) return 'r3f-drei';
          if (id.includes('/gsap/')) return 'gsap';
        },
      },
    },
  },
});
