import { render, screen } from '@testing-library/react'
import { command, createStore, type Store } from 'ccstate'
import { afterEach, assert } from 'vitest'
import { setupRouter } from '../../views/main'
import { bootstrap$ } from '../bootstrap'
import { logger } from '../log'
import { enableDebugLogger } from './utils'

const L = logger('Test')

export interface TestFixtureConfig {
  store: Store
  signal: AbortSignal

  docId?: string
  debugLoggers?: string[]

  /**
   * withoutRender 对于调试一些 React 引起的 Bug 会很有用
   * 因为默认情况下 setupDesignPage 会渲染整个设计页面，
   * 开启 withoutRender 后会跳过渲染步骤，这时我们可以 render 自己单独的组件，
   * 同时也可以拿到整个 store 中的状态
   */
  withoutRender?: boolean
}

export const prepareFixture$ = command(
  ({}, config: Omit<TestFixtureConfig, 'store'>) => {
    if (config.debugLoggers?.length) {
      enableDebugLogger(...config.debugLoggers)
    }
  },
)

// eslint-disable-next-line moxt/no-store-in-params -- Test bootstrap needs config with store for app initialization
export async function bootstrap(config: TestFixtureConfig) {
  const { store, signal } = config

  await store.set(
    bootstrap$,
    () => {
      setupRouter(store, (el) => {
        if (config.withoutRender) {
          return
        }

        const { unmount } = render(el)
        signal.addEventListener('abort', () => {
          unmount()
        })
      })
    },
    signal,
  )

  assert(screen)
}

export function testContext() {
  let store: Store | null = null
  let controller = new AbortController()

  const context = {
    get signal(): AbortSignal {
      return controller.signal
    },
    get store(): Store {
      if (!store) {
        L.debug('create store')
        store = createStore()
        context.signal.addEventListener('abort', () => {
          store = null
        })
      }
      return store
    },
  }

  afterEach(() => {
    L.debug('cleanup context')
    const error = new Error('Aborted due to finished test')
    error.name = 'AbortError'
    controller.abort(error)
    controller = new AbortController()
  })

  return Object.freeze(context)
}
