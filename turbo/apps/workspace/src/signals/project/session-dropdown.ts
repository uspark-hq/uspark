import { command, computed, state } from 'ccstate'
import { onRef } from '../utils'

/**
 * Signals for managing session dropdown state
 */

// Internal state
const internalDropdownOpen$ = state(false)
const internalDropdownEl$ = state<HTMLDivElement | null>(null)
const internalButtonEl$ = state<HTMLButtonElement | null>(null)

// Public computed state
export const sessionDropdownOpen$ = computed((get) =>
  get(internalDropdownOpen$),
)

// Toggle dropdown
export const toggleSessionDropdown$ = command(({ get, set }) => {
  const isOpen = get(internalDropdownOpen$)
  set(internalDropdownOpen$, !isOpen)
})

// Close dropdown
export const closeSessionDropdown$ = command(({ set }) => {
  set(internalDropdownOpen$, false)
})

// Handle click outside to close dropdown
const internalSetupClickOutside$ = command(
  ({ get, set }, _el: HTMLDivElement, signal: AbortSignal) => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdownEl = get(internalDropdownEl$)
      const buttonEl = get(internalButtonEl$)

      if (
        dropdownEl &&
        !dropdownEl.contains(event.target as Node) &&
        buttonEl &&
        !buttonEl.contains(event.target as Node) &&
        get(internalDropdownOpen$)
      ) {
        set(internalDropdownOpen$, false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && get(internalDropdownOpen$)) {
        set(internalDropdownOpen$, false)
        const buttonEl = get(internalButtonEl$)
        buttonEl?.focus()
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

export const setupDropdownClickOutside$ = onRef(internalSetupClickOutside$)

export const setDropdownEl$ = command(
  ({ set }, el: HTMLDivElement | null) => {
    set(internalDropdownEl$, el)
  },
)

export const setButtonEl$ = command(({ set }, el: HTMLButtonElement | null) => {
  set(internalButtonEl$, el)
})
