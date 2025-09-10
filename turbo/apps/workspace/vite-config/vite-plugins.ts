import tailwindcss from '@tailwindcss/vite'
import type { PluginOption } from 'vite'

export const generateVitePlugins = (): PluginOption[] => {
  return [tailwindcss()] as PluginOption[]
}
