import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Keep production builds working when the optional Windows CSS binary is absent.
  build: { cssMinify: false },
})
