import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"


// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    // 或者更保守：
    // target: 'es2015',
    cssTarget: ['chrome61', 'firefox60', 'safari11', 'edge79'],
  }
});
