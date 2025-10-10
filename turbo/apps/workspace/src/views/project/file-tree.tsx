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
          className="flex cursor-pointer items-center overflow-hidden py-0.5 pr-2 text-[#cccccc] transition-colors hover:bg-[#2a2d2e]"
        >
          <span className="truncate text-[13px]">
            {item.path.split('/').pop()}
          </span>
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
      className={`flex cursor-pointer items-center overflow-hidden py-0.5 pr-2 text-[13px] transition-colors ${
        isSelected
          ? 'border-l border-[#007acc] bg-[#37373d] text-[#ffffff]'
          : 'text-[#cccccc] hover:bg-[#2a2d2e]'
      }`}
    >
      <span className="truncate">{item.path.split('/').pop()}</span>
    </div>
  )
}

export function FileTree() {
  const projectFiles = useLoadable(projectFiles$)

  if (projectFiles.state === 'loading') {
    return (
      <div className="h-full bg-[#252526]">
        <div className="px-3 py-2 text-[13px] text-[#969696]">
          Loading files...
        </div>
      </div>
    )
  }

  if (projectFiles.state === 'hasError' || !projectFiles.data) {
    return (
      <div className="h-full bg-[#252526]">
        <div className="px-3 py-2 text-[13px] text-[#f48771]">
          Error loading files
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#252526]">
      <div className="border-b border-[#3e3e42] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#cccccc] uppercase">
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
