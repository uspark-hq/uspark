import { command } from 'ccstate'
import { createElement } from 'react'
import { ProjectPage } from '../../views/project/project-page'
import { updatePage$ } from '../react-router'
import { detach, Reason } from '../utils'
import { startWatchSession$ } from './project'

export const setupProjectPage$ = command(({ set }, signal: AbortSignal) => {
  signal.throwIfAborted()

  set(updatePage$, createElement(ProjectPage))

  detach(
    set(startWatchSession$, signal),
    Reason.Daemon,
    'Watch session for new blocks',
  )
})
