// oxlint-disable no-console 这个文件就是要接管全局的 console 方法

import { afterAll, beforeAll } from 'vitest'
import { worker } from './src/mocks/browser'

const controller = new AbortController()
beforeAll(async () => {
  controller.signal.addEventListener('abort', () => {
    worker.stop()
  })
  await worker.start({
    quiet: true,
    onUnhandledRequest: 'bypass',
  })
  controller.signal.throwIfAborted()

  {
    const originalConsoleError = console.error
    console.error = (...message: unknown[]) => {
      originalConsoleError(...message, '\n')
    }

    const originalConsoleLog = console.log
    console.log = (...message: unknown[]) => {
      originalConsoleLog(...message, '\n')
    }

    const originalConsoleWarn = console.warn
    console.warn = (...message: unknown[]) => {
      originalConsoleWarn(...message, '\n')
    }

    const originalConsoleInfo = console.info
    console.info = (...message: unknown[]) => {
      originalConsoleInfo(...message, '\n')
    }
  }
})

afterAll(() => {
  controller.abort()
})
