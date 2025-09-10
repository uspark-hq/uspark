import fs from 'fs'
import path from 'path'
import type { ServerOptions } from 'vite'

const SSL_KEY_PAIR = {
  key: path.resolve(__dirname, '../../../../.certs/uspark.dev-key.pem'),
  cert: path.resolve(__dirname, '../../../../.certs/uspark.dev.pem'),
} as const

function checkCertExists() {
  const isCertExist =
    fs.existsSync(SSL_KEY_PAIR.key) && fs.existsSync(SSL_KEY_PAIR.cert)

  if (!isCertExist) {
    // oxlint-disable-next-line no-console
    console.warn(
      `generate certs first, run following command in repository ROOT directory:
mkdir -p .certs && mkcert -cert-file .certs/uspark.dev.pem -key-file .certs/uspark.dev-key.pem uspark.dev
`,
    )
  }
}

/**
 * 开发时的本地服务配置
 *
 * @param mode
 * @returns
 */
export function devServerOptions(): ServerOptions {
  checkCertExists()

  return {
    open: 'https://uspark.dev:5173/workspace',
    port: 5173,
    strictPort: true,
    host: 'uspark.dev',
    https: SSL_KEY_PAIR,
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
