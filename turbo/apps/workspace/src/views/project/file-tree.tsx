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
  const indent = level * 16
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
          style={{ paddingLeft: indent }}
          className="cursor-pointer px-2 py-1 hover:bg-gray-100"
        >
          📁 {item.path.split('/').pop()}
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
      style={{ paddingLeft: indent }}
      className={`cursor-pointer px-2 py-1 ${
        isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
      }`}
    >
      📄 {item.path.split('/').pop()}
    </div>
  )
}

export function FileTree() {
  const projectFiles = useLoadable(projectFiles$)

  if (projectFiles.state === 'loading') {
    return <div className="p-4">Loading files...</div>
  }

  if (projectFiles.state === 'hasError' || !projectFiles.data) {
    return <div className="p-4 text-red-600">Error loading files</div>
  }

  return (
    <div className="h-full overflow-y-auto border-r border-gray-200">
      <div className="border-b border-gray-200 p-4 font-semibold">Files</div>
      <div className="py-2">
        {projectFiles.data.files.map((item) => (
          <FileTreeItem key={item.path} item={item} level={0} />
        ))}
      </div>
    </div>
  )
}
