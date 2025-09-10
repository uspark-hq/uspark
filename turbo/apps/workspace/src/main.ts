import './polyfill'
import { createStore, type Store } from 'ccstate'
import { createRoot } from 'react-dom/client'
import { bootstrap$ } from './signals/bootstrap'
import { detach, Reason } from './signals/utils'
import { setupRouter } from './views/main'

async function setupMockServer(signal: AbortSignal) {
  const { worker } = await import('./mocks/browser')
  signal.throwIfAborted()

  signal.addEventListener('abort', () => {
    worker.stop()
  })
  await worker.start()
  signal.throwIfAborted()
}

// eslint-disable-next-line custom/no-store-in-params -- main function is the app entry point
async function main(rootEl: HTMLDivElement, store: Store, signal: AbortSignal) {
  if (import.meta.env.VITE_MOCK_SERVER === '1') {
    await setupMockServer(signal)
  }

  await store.set(
    bootstrap$,
    () => {
      setupRouter(store, (el) => {
        const root = createRoot(rootEl)
        root.render(el)
        signal.addEventListener('abort', () => {
          root.unmount()
        })
      })
    },
    signal,
  )
}

detach(
  main(
    document.getElementById('root') as HTMLDivElement,
    createStore(),
    AbortSignal.any([]),
  ),
  Reason.Entrance,
  'main',
)
