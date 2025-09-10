import type { Store } from 'ccstate'
import { StoreProvider } from 'ccstate-react'
import { StrictMode } from 'react'
import { ErrorBoundary } from './error-boundary'
import { Router } from './router/router'
import './css/index.css'

// eslint-disable-next-line custom/no-store-in-params -- setupRouter is the app entry point and needs to pass Store to StoreProvider
export const setupRouter = (
  store: Store,
  render: (children: React.ReactNode) => void,
) => {
  render(
    <StrictMode>
      <StoreProvider value={store}>
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
      </StoreProvider>
    </StrictMode>,
  )
}
