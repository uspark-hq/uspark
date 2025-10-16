import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import monacoEditor from 'vite-plugin-monaco-editor'

export const generateVitePlugins = (): PluginOption[] => {
  const monacoPlugin = (
    monacoEditor as {
      default: (options: Record<string, unknown>) => PluginOption
    }
  ).default
  return [
    tailwindcss(),
    react(),
    monacoPlugin({
      languageWorkers: ['typescript', 'json'],
    }),
  ] as PluginOption[]
}
