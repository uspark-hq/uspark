import { afterAll, beforeAll } from 'vitest'
import { onUnhandledRequest } from './src/mocks/handlers'
import { server } from './src/mocks/node'

beforeAll(() => {
  server.listen({
    onUnhandledRequest,
  })

  // oxlint-disable-next-line no-console
  console.error = (...message: unknown[]) => {
    const found = message.find((m) => {
      return (
        String(m).includes('NotSupportedError') ||
        String(m).includes('AbortError')
      )
    })

    if (!found) {
      throw message[0] as Error
    }
  }
})

afterAll(() => {
  server.close()
})
