import { command } from 'ccstate'
import { setRootSignal$ } from './root-signal'
import { initRoutes$ } from './route'

const ROUTE_CONFIG = [] as const

const setupRoutes$ = command(async ({ set }, signal: AbortSignal) => {
  await set(initRoutes$, ROUTE_CONFIG, signal)
})

export const bootstrap$ = command(
  async ({ set }, render: () => void, signal: AbortSignal) => {
    set(setRootSignal$, signal)

    render()

    await set(setupRoutes$, signal)
  },
)
