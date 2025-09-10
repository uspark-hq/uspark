import type { CSSProperties } from 'react'

export const isAbortError = (error: unknown): boolean => {
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

export function throwIfAbort(e: unknown) {
  if (isAbortError(e)) {
    throw e
  }
}

export function throwIfNotAbort(e: unknown) {
  if (!isAbortError(e)) {
    throw e
  }
}

// eslint-disable-next-line moxt/no-package-variable
const _fibCache: number[] = []
export function fibonacci(n: number): number {
  if (_fibCache[n]) {
    return _fibCache[n]
  }

  if (n <= 1) {
    return n
  }

  return fibonacci(n - 1) + fibonacci(n - 2)
}

export function download(dump: Uint8Array, name: string): void {
  const blob = new Blob([dump], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
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
