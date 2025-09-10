import { command, state, type Command } from 'ccstate'
import type { CSSProperties, SyntheticEvent } from 'react'
import { detach, Reason } from './promise'

const isAbortError = (error: unknown): boolean => {
  if (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === 'AbortError'
  ) {
    return true
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'reason' in error &&
    error.reason instanceof Error &&
    error.reason.name === 'AbortError'
  ) {
    return true
  }

  return false
}

export function throwIfNotAbort(e: unknown) {
  if (!isAbortError(e)) {
    throw e
  }
}

type GeometryStyle = Pick<
  CSSProperties,
  | 'width'
  | 'height'
  | 'left'
  | 'top'
  | 'right'
  | 'bottom'
  | 'maxWidth'
  | 'maxHeight'
  | 'minWidth'
  | 'minHeight'
  | 'transform'
>

export function geometryStyle(geometry: {
  width?: number
  height?: number
  left?: number
  top?: number
  right?: number
  bottom?: number
  maxWidth?: number
  maxHeight?: number
  minWidth?: number
  minHeight?: number
  scale?: number
}): GeometryStyle {
  const ret: GeometryStyle = {}

  if (geometry.width !== undefined) {
    ret.width = `${String(geometry.width)}px`
  }
  if (geometry.height !== undefined) {
    ret.height = `${String(geometry.height)}px`
  }
  if (geometry.left !== undefined) {
    ret.left = `${String(geometry.left)}px`
  }
  if (geometry.top !== undefined) {
    ret.top = `${String(geometry.top)}px`
  }
  if (geometry.right !== undefined) {
    ret.right = `${String(geometry.right)}px`
  }
  if (geometry.bottom !== undefined) {
    ret.bottom = `${String(geometry.bottom)}px`
  }
  if (geometry.maxWidth !== undefined) {
    ret.maxWidth = `${String(geometry.maxWidth)}px`
  }
  if (geometry.maxHeight !== undefined) {
    ret.maxHeight = `${String(geometry.maxHeight)}px`
  }
  if (geometry.minWidth !== undefined) {
    ret.minWidth = `${String(geometry.minWidth)}px`
  }
  if (geometry.minHeight !== undefined) {
    ret.minHeight = `${String(geometry.minHeight)}px`
  }
  if (geometry.scale !== undefined) {
    ret.transform = `scale(${String(geometry.scale)})`
  }

  return ret
}

export function onDomEventFn<T>(callback: (e: T) => void | Promise<void>) {
  return function (e: T) {
    detach(callback(e), Reason.DomCallback)
  }
}

export function resetSignal(): Command<AbortSignal, AbortSignal[]> {
  const controller$ = state<AbortController | undefined>(undefined)

  return command(({ get, set }, ...signals: AbortSignal[]) => {
    get(controller$)?.abort()
    const controller = new AbortController()
    set(controller$, controller)

    return AbortSignal.any([controller.signal, ...signals])
  })
}
