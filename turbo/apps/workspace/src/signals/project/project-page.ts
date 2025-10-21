import { command } from 'ccstate'
import { createElement } from 'react'
import { delay } from 'signal-timers'
import { ProjectPage } from '../../views/project/project-page'
import { updatePage$ } from '../react-router'
import { detach, Reason } from '../utils'
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

    // Wait for sessions to load
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
  },
)
