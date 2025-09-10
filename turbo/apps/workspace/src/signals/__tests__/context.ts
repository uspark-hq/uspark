import { render, screen } from '@testing-library/react'
import { command, createStore, type Store } from 'ccstate'
import { afterEach, assert } from 'vitest'
import { setupRouter } from '../../views/main'
import { bootstrap$ } from '../bootstrap'
import { mockLocation } from '../location'
import { logger } from '../log'
import { enableDebugLogger } from './utils'

const L = logger('Test')

interface TestFixtureConfig {
  store: Store
  signal: AbortSignal

  debugLoggers?: string[]
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

export async function setupPage(url: string, config: TestFixtureConfig) {
  config.store.set(prepareFixture$, config)

  mockLocation(
    {
      pathname: url,
      search: '',
    },
    config.signal,
  )

  await bootstrap(config)
}
