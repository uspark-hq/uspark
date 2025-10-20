import { useLastResolved, useSet } from 'ccstate-react'
import { Folder } from 'lucide-react'
import {
  closeFileTreePopover$,
  fileTreePopoverOpen$,
  setButtonEl$,
  setPopoverEl$,
  setupPopoverClickOutside$,
  toggleFileTreePopover$,
} from '../../signals/project/file-tree-popover'
import { onDomEventFn } from '../../signals/utils'
import { FileTree } from './file-tree'

export function FileTreePopover() {
  const isOpen = useLastResolved(fileTreePopoverOpen$)
  const togglePopover = useSet(toggleFileTreePopover$)
  const closePopover = useSet(closeFileTreePopover$)
  const setButtonEl = useSet(setButtonEl$)
  const setPopoverEl = useSet(setPopoverEl$)
  const setupClickOutside = useSet(setupPopoverClickOutside$)

  return (
    <div className="relative" ref={setupClickOutside}>
      <button
        ref={setButtonEl}
        onClick={onDomEventFn(togglePopover)}
        className="flex items-center gap-2 rounded px-3 py-1.5 text-[14px] text-[#cccccc] transition-colors hover:bg-[#2a2d2e]"
        aria-label="Open file explorer"
      >
        <Folder className="h-4 w-4" />
        <span>specs</span>
      </button>

      {isOpen && (
        <div
          ref={setPopoverEl}
          className="absolute top-full right-0 z-50 mt-1 h-[500px] w-[300px] overflow-hidden rounded border border-[#3e3e42] bg-[#252526] shadow-lg"
          onClick={onDomEventFn(closePopover)}
        >
          <FileTree />
        </div>
      )}
    </div>
  )
}
