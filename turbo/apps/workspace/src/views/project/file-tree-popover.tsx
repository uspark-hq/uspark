import { useLastResolved, useSet } from 'ccstate-react'
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
        className="flex items-center gap-2 rounded px-3 py-1.5 text-[13px] text-[#cccccc] transition-colors hover:bg-[#2a2d2e]"
        aria-label="Open file explorer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
        <span>Files</span>
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
