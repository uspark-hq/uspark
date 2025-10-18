import { useLastResolved } from 'ccstate-react'
import {
  selectedFileContent$,
  selectedFileItem$,
} from '../../signals/project/project'
import { MarkdownEditor } from './markdown-editor'

export function FileContent() {
  const fileContent = useLastResolved(selectedFileContent$)
  const selectedFile = useLastResolved(selectedFileItem$)

  if (!fileContent) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-[#969696]">
        <div className="text-center">
          <div className="text-[13px]">Select a file to view its content</div>
        </div>
      </div>
    )
  }

  // 只渲染 markdown 文件
  const isMarkdown = selectedFile?.path.endsWith('.md') ?? false

  if (isMarkdown) {
    return <MarkdownEditor />
  }

  // 非 markdown 文件不显示内容
  return null
}
