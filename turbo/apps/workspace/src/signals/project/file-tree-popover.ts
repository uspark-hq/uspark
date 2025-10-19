import { command, computed, state } from 'ccstate'
import { onRef } from '../utils'

const internalPopoverOpen$ = state(false)
const internalPopoverEl$ = state<HTMLDivElement | null>(null)
const internalButtonEl$ = state<HTMLButtonElement | null>(null)

export const fileTreePopoverOpen$ = computed((get) => get(internalPopoverOpen$))

export const toggleFileTreePopover$ = command(({ get, set }) => {
  const isOpen = get(internalPopoverOpen$)
  set(internalPopoverOpen$, !isOpen)
})

export const closeFileTreePopover$ = command(({ set }) => {
  set(internalPopoverOpen$, false)
})

// Handle click outside to close popover
const internalSetupClickOutside$ = command(
  ({ get, set }, _el: HTMLDivElement, signal: AbortSignal) => {
    const handleClickOutside = (event: MouseEvent) => {
      const popoverEl = get(internalPopoverEl$)
      const buttonEl = get(internalButtonEl$)

      if (
        popoverEl &&
        !popoverEl.contains(event.target as Node) &&
        buttonEl &&
        !buttonEl.contains(event.target as Node) &&
        get(internalPopoverOpen$)
      ) {
        set(internalPopoverOpen$, false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && get(internalPopoverOpen$)) {
        set(internalPopoverOpen$, false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    signal.addEventListener('abort', () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    })
  },
)

export const setupPopoverClickOutside$ = onRef(internalSetupClickOutside$)

export const setPopoverEl$ = command(({ set }, el: HTMLDivElement | null) => {
  set(internalPopoverEl$, el)
})

export const setButtonEl$ = command(({ set }, el: HTMLButtonElement | null) => {
  set(internalButtonEl$, el)
})
