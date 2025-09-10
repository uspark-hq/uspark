import { command } from 'ccstate'
import { createElement } from 'react'
import { WorkspacePage } from '../../views/workspace/workspace-page'
import { updatePage$ } from '../react-router'

export const setupWorkspacePage$ = command(
  async ({ set }, signal: AbortSignal) => {
    signal.throwIfAborted()

    set(updatePage$, createElement(WorkspacePage))
  },
)
