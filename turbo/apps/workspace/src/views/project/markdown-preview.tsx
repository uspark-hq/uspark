import { useLastResolved, useSet } from 'ccstate-react'
import {
  mountFileContentContainer$,
  selectedFileContentHtml$,
} from '../../signals/project/project'

export function MarkdownPreview() {
  const sanitizedHtml = useLastResolved(selectedFileContentHtml$)
  const mountContainer = useSet(mountFileContentContainer$)

  if (!sanitizedHtml) {
    return null
  }

  return (
    <div className="h-full overflow-auto bg-[#1e1e1e] p-4" ref={mountContainer}>
      <div
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  )
}
