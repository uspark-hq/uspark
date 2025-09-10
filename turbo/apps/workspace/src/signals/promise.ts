import { IN_VITEST } from '../env'
import { logger } from './log'
import { throwIfNotAbort } from './utils'

export enum Reason {
  DomCallback = 'dom_callback',
  Entrance = 'entrance',
  Deferred = 'deferred',
}

const L = logger('Promise')

// eslint-disable-next-line custom/no-package-variable
const collectedPromise = new Set<Promise<unknown>>()
// eslint-disable-next-line custom/no-package-variable
const promiseReason = new Map<Promise<unknown>, Reason>()
// eslint-disable-next-line custom/no-package-variable
const promiseDescription = new Map<Promise<unknown>, string>()

export function detach<T>(
  promise: T | Promise<T>,
  reason: Reason,
  description?: string,
): void {
  L.debug('Detach promise', reason, description)

  const isPromise = promise instanceof Promise
  let silencePromise
  if (isPromise) {
    silencePromise = (async () => {
      try {
        // eslint-disable-next-line custom/signal-check-await
        await promise
        // eslint-disable-next-line custom/no-catch-abort
      } catch (error) {
        throwIfNotAbort(error)
      }
    })()
  }

  if (IN_VITEST && silencePromise) {
    collectedPromise.add(silencePromise)
    promiseReason.set(silencePromise, reason)
    if (description) {
      promiseDescription.set(silencePromise, description)
    }
  }
}

export async function clearAllDetached() {
  if (!IN_VITEST) {
    collectedPromise.clear()
    promiseReason.clear()
    promiseDescription.clear()

    return []
  }

  L.debug('Clear all detached promises')

  const settledResult = []

  L.debugGroup('Detached promises')
  for (const promise of collectedPromise) {
    const reason = promiseReason.get(promise)
    const description = promiseDescription.get(promise)
    L.debug(`Await promise: ${reason ?? 'unknown'} ${description ?? ''}`)
    try {
      // eslint-disable-next-line custom/signal-check-await
      const result = await promise
      settledResult.push({
        promise,
        reason,
        description: promiseDescription.get(promise),
        result,
      })
      // eslint-disable-next-line custom/no-catch-abort
    } catch (error) {
      throwIfNotAbort(error)
      settledResult.push({
        promise,
        reason,
        description: promiseDescription.get(promise),
        error,
      })
    }
  }
  L.debugGroupEnd()

  collectedPromise.clear()
  promiseReason.clear()
  promiseDescription.clear()

  return settledResult
}

export function createDeferredPromise<T>(signal: AbortSignal): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  settled: () => boolean
} {
  let _resolve: ((value: T) => void) | undefined
  let _reject: ((reason?: unknown) => void) | undefined
  let settled = false

  const promise = new Promise<T>((resolve, reject) => {
    _resolve = (value: T) => {
      if (settled) {
        throw new Error('Deferred promise already settled')
      }
      settled = true
      resolve(value)
    }
    _reject = (reason?: unknown) => {
      if (settled) {
        throw new Error('Deferred promise already settled')
      }
      settled = true
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(reason)
    }
  })

  detach(promise, Reason.Deferred)

  signal.addEventListener('abort', () => {
    if (!settled) {
      _reject?.(signal.reason)
    }
  })

  return {
    promise,
    resolve: _resolve as unknown as (value: unknown) => void,
    reject: _reject as unknown as (reason?: unknown) => void,
    settled: () => settled,
  }
}
