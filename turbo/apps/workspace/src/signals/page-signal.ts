import { command, state } from 'ccstate'

const innerPageSignal$ = state<AbortSignal | undefined>(undefined)

export const setPageSignal$ = command(({ set }, signal: AbortSignal) => {
  set(innerPageSignal$, signal)
})
