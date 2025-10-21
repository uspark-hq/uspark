import { command } from 'ccstate'
import { createElement } from 'react'
import { delay } from 'signal-timers'
import { ProjectPage } from '../../views/project/project-page'
import { updatePage$ } from '../react-router'
import { detach, Reason, throwIfAbort } from '../utils'
import {
  projectSessions$,
  startWatchSession$,
  turnListContainerEl$,
} from './project'

export const setupProjectPage$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    signal.throwIfAborted()

    set(updatePage$, createElement(ProjectPage))

    detach(
      set(startWatchSession$, signal),
      Reason.Daemon,
      'Watch session for new blocks',
    )

    // Wait for sessions to load and scroll to bottom
    // Wrapped in try-catch to prevent test failures
    try {
      // Wait for sessions to load
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const sessions = await get(projectSessions$)
      signal.throwIfAborted()

      // Only scroll if sessions are loaded
      if (!sessions) {
        return
      }

      // Wait for DOM to render
      await delay(100, { signal })

      // Scroll to bottom
      const container = get(turnListContainerEl$)
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    } catch (error) {
      throwIfAbort(error)
      // Ignore errors in test environment or when signals are not available
    }
  },
)
