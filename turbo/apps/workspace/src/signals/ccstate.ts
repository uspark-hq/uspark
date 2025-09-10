import { command, type Command } from 'ccstate'
import type { SyntheticEvent } from 'react'
import { detach, Reason } from './promise'

function onDomEvent<T extends Element, E extends Event, Args extends unknown[]>(
  command$: Command<void | Promise<void>, [E, AbortSignal, ...Args]>,
) {
  return command(
    ({ set }, e: SyntheticEvent<T, E>, signal: AbortSignal, ...args: Args) => {
      detach(set(command$, e.nativeEvent, signal, ...args), Reason.DomCallback)
    },
  )
}

export function onPointerEvent<T extends Element, Args extends unknown[]>(
  command$: Command<void | Promise<void>, [PointerEvent, AbortSignal, ...Args]>,
) {
  return onDomEvent<T, PointerEvent, Args>(command$)
}

export function onDomEventFn<T>(callback: (e: T) => void | Promise<void>) {
  return function (e: T) {
    detach(callback(e), Reason.DomCallback)
  }
}
