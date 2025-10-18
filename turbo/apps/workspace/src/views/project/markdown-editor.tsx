import { useGet, useLastResolved, useSet } from 'ccstate-react'
import { pageSignal$ } from '../../signals/page-signal'
import { editorStateConfig$, mountEditor$ } from '../../signals/project/editor'
import { selectedFileItem$ } from '../../signals/project/project'
import { detach, Reason } from '../../signals/utils'

export function MarkdownEditor() {
  const stateConfig = useLastResolved(editorStateConfig$)
  const selectedFile = useLastResolved(selectedFileItem$)
  const signal = useGet(pageSignal$)
  const mountEditor = useSet(mountEditor$)

  // ref callback: 挂载时调用 mountEditor$ command
  const handleEditorRef = (element: HTMLDivElement | null) => {
    if (element) {
      detach(mountEditor(element, signal), Reason.DomCallback)
    }
    // 卸载时不需要处理，signal abort 会自动清理
  }

  if (!stateConfig) {
    return null
  }

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      {/* 文件名标题栏 */}
      <div className="flex h-8 items-center border-b border-[#3e3e42] px-3">
        <span className="text-[13px] text-[#cccccc]">
          {selectedFile?.path.split('/').pop()}
        </span>
      </div>

      {/* 编辑器容器 - 使用 key 确保文件切换时重建 DOM */}
      <div
        key={selectedFile?.path}
        ref={handleEditorRef}
        className="flex-1 overflow-auto"
      />
    </div>
  )
}
