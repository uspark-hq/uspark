import { command, computed, state } from 'ccstate'
import { shareFile$ } from '../external/project-detail'
import { pathParams$ } from '../route'
import { selectedFileItem$ } from './project'

/**
 * Share URL and popover visibility state
 */
const shareUrl$ = state<string | null>(null)
const isSharePopoverOpen$ = state(false)

/**
 * Public computed signals for reading state
 */
export const shareUrlValue$ = computed((get) => get(shareUrl$))
export const isSharePopoverOpenValue$ = computed((get) =>
  get(isSharePopoverOpen$),
)

/**
 * Generate share link for the currently selected file
 */
export const generateShareLink$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const selectedFile = await get(selectedFileItem$)
    signal.throwIfAborted()
    const pathParams = get(pathParams$)
    const projectId = pathParams?.projectId as string | undefined

    if (!selectedFile || !projectId) {
      return
    }

    // Call share API to generate link
    const result = await set(
      shareFile$,
      {
        projectId,
        filePath: selectedFile.path,
      },
      signal,
    )
    signal.throwIfAborted()

    // Store the share URL and open popover
    set(shareUrl$, result.url)
    set(isSharePopoverOpen$, true)
  },
)

/**
 * Close the share popover
 */
export const closeSharePopover$ = command(({ set }) => {
  set(isSharePopoverOpen$, false)
})
