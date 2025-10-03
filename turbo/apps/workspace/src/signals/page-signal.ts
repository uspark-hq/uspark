import { command, computed, state } from 'ccstate'

const innerPageSignal$ = state<AbortSignal | undefined>(undefined)

export const setPageSignal$ = command(({ set }, signal: AbortSignal) => {
  set(innerPageSignal$, signal)
})

export const pageSignal$ = computed((get) => {
  // global page signal should export by get
  // eslint-disable-next-line custom/no-get-signal
  const signal = get(innerPageSignal$)
  if (!signal) {
    throw new Error('page signal not set')
  }
  return signal
})
