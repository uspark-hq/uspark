import { command } from 'ccstate'
import { createElement } from 'react'
import { delay } from 'signal-timers'
import { ProjectPage } from '../../views/project/project-page'
import { updatePage$ } from '../react-router'
import { detach, Reason, throwIfAbort } from '../utils'
import { startWatchSession$, turnListContainerEl$ } from './project'

export const setupProjectPage$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    signal.throwIfAborted()

    set(updatePage$, createElement(ProjectPage))

    detach(
      set(startWatchSession$, signal),
      Reason.Daemon,
      'Watch session for new blocks',
    )

    // Scroll to bottom after initial render
    try {
      // Wait for DOM container to be available (poll with exponential backoff)
      let container = get(turnListContainerEl$)
      let attempts = 0
      const maxAttempts = 10

      while (!container && attempts < maxAttempts) {
        await delay(0, { signal }) // Wait for next tick
        container = get(turnListContainerEl$)
        attempts++
      }

      // Scroll to bottom if container is available
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    } catch (error) {
      throwIfAbort(error)
      // Ignore errors if container not available
    }
  },
)
