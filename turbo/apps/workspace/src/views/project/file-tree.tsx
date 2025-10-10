import type { FileItem } from '@uspark/core/yjs-filesystem'
import { useLastResolved, useLoadable, useSet } from 'ccstate-react'
import {
  projectFiles$,
  selectedFileItem$,
  selectFile$,
} from '../../signals/project/project'

interface FileTreeItemProps {
  item: FileItem
  level: number
}

function FileTreeItem({ item, level }: FileTreeItemProps) {
  const indent = level * 12
  const selectFile = useSet(selectFile$)
  const selectedFile = useLastResolved(selectedFileItem$)
  const isSelected = selectedFile?.path === item.path

  const handleClick = () => {
    if (item.type === 'file') {
      selectFile(item.path)
    }
  }

  if (item.type === 'directory') {
    return (
      <div>
        <div
          style={{ paddingLeft: indent + 8 }}
          className="cursor-pointer pr-2 py-0.5 text-[#cccccc] hover:bg-[#2a2d2e] transition-colors flex items-center overflow-hidden"
        >
          <span className="mr-1.5 text-[#c5c5c5] text-xs flex-shrink-0">📁</span>
          <span className="text-[13px] truncate">{item.path.split('/').pop()}</span>
        </div>
        {item.children?.map((child) => (
          <FileTreeItem key={child.path} item={child} level={level + 1} />
        ))}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      style={{ paddingLeft: indent + 8 }}
      className={`cursor-pointer pr-2 py-0.5 text-[13px] transition-colors flex items-center overflow-hidden ${
        isSelected
          ? 'bg-[#37373d] text-[#ffffff] border-l border-[#007acc]'
          : 'text-[#cccccc] hover:bg-[#2a2d2e]'
      }`}
    >
      <span className="mr-1.5 text-[#c5c5c5] text-xs flex-shrink-0">📄</span>
      <span className="truncate">{item.path.split('/').pop()}</span>
    </div>
  )
}

export function FileTree() {
  const projectFiles = useLoadable(projectFiles$)

  if (projectFiles.state === 'loading') {
    return (
      <div className="h-full bg-[#252526]">
        <div className="px-3 py-2 text-[#969696] text-[13px]">Loading files...</div>
      </div>
    )
  }

  if (projectFiles.state === 'hasError' || !projectFiles.data) {
    return (
      <div className="h-full bg-[#252526]">
        <div className="px-3 py-2 text-[#f48771] text-[13px]">Error loading files</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#252526]">
      <div className="border-b border-[#3e3e42] px-3 py-1.5 font-semibold text-[#cccccc] text-[11px] uppercase tracking-wide">
        Explorer
      </div>
      <div className="py-0.5">
        {projectFiles.data.files.map((item) => (
          <FileTreeItem key={item.path} item={item} level={0} />
        ))}
      </div>
    </div>
  )
}
