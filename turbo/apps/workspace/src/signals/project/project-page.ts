import { command } from 'ccstate'
import { createElement } from 'react'
import { ProjectPage } from '../../views/project/project-page'
import { updatePage$ } from '../react-router'

export const setupProjectPage$ = command(
  async ({ set }, signal: AbortSignal) => {
    signal.throwIfAborted()

    set(updatePage$, createElement(ProjectPage))
  },
)
