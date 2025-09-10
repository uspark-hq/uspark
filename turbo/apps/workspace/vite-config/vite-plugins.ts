import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'

export const generateVitePlugins = (): PluginOption[] => {
  return [tailwindcss(), react()] as PluginOption[]
}
