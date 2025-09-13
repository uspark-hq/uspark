import type { ServerOptions } from 'vite'

/**
 * 开发时的本地服务配置
 *
 * Note: HTTPS is handled by Caddy proxy (app.uspark.dev -> localhost:5173)
 * No need to configure HTTPS directly in Vite
 *
 * @param mode
 * @returns
 */
export function devServerOptions(): ServerOptions {
  return {
    port: 5173,
    strictPort: true,
    host: true, // Listen on all addresses including localhost
    hmr: {
      // HMR through Caddy proxy
      clientPort: 8443,
      host: 'app.uspark.dev',
      protocol: 'wss',
    },
    watch: {
      ignored: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.btest.tsx',
        '**/*.btest.ts',
      ],
    },
  }
}
