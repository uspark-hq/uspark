import { command, type Command } from 'ccstate'
import { clerk$, setupClerk$ } from './auth'
import { setPageSignal$ } from './page-signal'
import { setupProjectPage$ } from './project/project-page'
import { setRootSignal$ } from './root-signal'
import { initRoutes$ } from './route'
import { setupWorkspacePage$ } from './workspace/workspace-page'

const setupPageWrapper = (fn: Command<Promise<void> | void, [AbortSignal]>) => {
  return command(async ({ set }, signal: AbortSignal) => {
    set(setPageSignal$, signal)

    await set(fn, signal)
  })
}

const setupAuthPageWrapper = (
  fn: Command<Promise<void> | void, [AbortSignal]>,
) => {
  return command(async ({ get, set }, signal: AbortSignal) => {
    const clerk = await get(clerk$)
    signal.throwIfAborted()

    if (!clerk.user) {
      clerk.openSignIn()
      return
    }

    await set(setupPageWrapper(fn), signal)
  })
}

const ROUTE_CONFIG = [
  {
    path: '/',
    setup: setupAuthPageWrapper(setupWorkspacePage$),
  },
  {
    path: '/projects/:projectId',
    setup: setupAuthPageWrapper(setupProjectPage$),
  },
] as const

const setupRoutes$ = command(async ({ set }, signal: AbortSignal) => {
  await set(initRoutes$, ROUTE_CONFIG, signal)
})

export const bootstrap$ = command(
  async ({ set }, render: () => void, signal: AbortSignal) => {
    set(setRootSignal$, signal)

    render()

    await Promise.all([set(setupClerk$, signal), set(setupRoutes$, signal)])
    signal.throwIfAborted()
  },
)
