import { useLastResolved } from 'ccstate-react'
import { selectedFileContentHtml$ } from '../../signals/project/project'

export function MarkdownPreview() {
  const sanitizedHtml = useLastResolved(selectedFileContentHtml$)

  if (!sanitizedHtml) {
    return null
  }

  return (
    <div className="h-full overflow-auto bg-[#1e1e1e] p-4">
      <div
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  )
}
