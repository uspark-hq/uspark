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
      // Wait for DOM to render
      await delay(300, { signal })

      // Scroll to bottom
      const container = get(turnListContainerEl$)
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    } catch (error) {
      throwIfAbort(error)
      // Ignore errors if container not available
    }
  },
)
