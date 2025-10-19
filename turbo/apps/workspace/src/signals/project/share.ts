import { command } from 'ccstate'
import { toast } from 'sonner'
import { shareFile$ } from '../external/project-detail'
import { pathParams$ } from '../route'
import { selectedFileItem$ } from './project'

/**
 * Share the currently selected file and copy the share link to clipboard
 */
export const shareCurrentFile$ = command(
  async ({ get, set }, signal: AbortSignal) => {
    const selectedFile = await get(selectedFileItem$)
    signal.throwIfAborted()
    const pathParams = get(pathParams$)
    const projectId = pathParams?.projectId as string | undefined

    if (!selectedFile || !projectId) {
      return
    }

    // Call share API
    const result = await set(
      shareFile$,
      {
        projectId,
        filePath: selectedFile.path,
      },
      signal,
    )
    signal.throwIfAborted()

    // Copy to clipboard
    await navigator.clipboard.writeText(result.url)
    signal.throwIfAborted()

    // Show success toast
    toast.success('Share link copied to clipboard', {
      description: selectedFile.path,
    })
  },
)
