import { command, computed, state } from 'ccstate'

const innerPageSignal$ = state<AbortSignal | undefined>(undefined)

export const pageSignal$ = computed((get) => {
  // eslint-disable-next-line moxt/no-get-signal
  const signal = get(innerPageSignal$)
  if (!signal) {
    throw new Error('No page signal')
  }
  return signal
})

export const setPageSignal$ = command(({ set }, signal: AbortSignal) => {
  set(innerPageSignal$, signal)
})
