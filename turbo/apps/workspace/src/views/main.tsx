import type { Store } from 'ccstate'
import { StoreProvider } from 'ccstate-react'
import { StrictMode } from 'react'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './error-boundary'
import { Router } from './router/router'
import './css/index.css'

export const setupRouter = (
  // eslint-disable-next-line custom/no-store-in-params -- setupRouter is the app entry point and needs to pass Store to StoreProvider
  store: Store,
  render: (children: React.ReactNode) => void,
) => {
  render(
    <StrictMode>
      <StoreProvider value={store}>
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e1e1e',
              border: '1px solid #3e3e42',
              color: '#cccccc',
            },
          }}
        />
      </StoreProvider>
    </StrictMode>,
  )
}
