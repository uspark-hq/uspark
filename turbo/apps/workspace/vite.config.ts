import { defineConfig } from 'vite'
import { devServerOptions } from './vite-config/vite-dev-server'
import { generateVitePlugins } from './vite-config/vite-plugins'
import { vitestOptions } from './vite-config/vite-test'

export default defineConfig(() => {
  return {
    publicDir: 'public',
    plugins: generateVitePlugins(),
    server: devServerOptions(),
    test: vitestOptions,
  }
})
