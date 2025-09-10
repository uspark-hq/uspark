// eslint-disable no-console
import { DEBUG } from '../env'

// 日志级别常量定义
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  TRACE: 'trace',
  FATAL: 'fatal',
} as const

// 日志级别优先级映射
const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.DEBUG]: 0,
  [LOG_LEVELS.TRACE]: 1,
  [LOG_LEVELS.INFO]: 2,
  [LOG_LEVELS.WARN]: 3,
  [LOG_LEVELS.ERROR]: 4,
  [LOG_LEVELS.FATAL]: 5,
} as const

interface ConsoleLogger {
  readonly debug: typeof console.log
  readonly debugGroup: typeof console.group
  readonly debugGroupEnd: typeof console.groupEnd
  readonly debugGroupCollapsed: typeof console.groupCollapsed
  readonly debugTable: typeof console.table

  readonly info: typeof console.info
  readonly infoGroup: typeof console.group
  readonly infoGroupEnd: typeof console.groupEnd
  readonly infoGroupCollapsed: typeof console.groupCollapsed
  readonly infoTable: typeof console.table

  readonly warn: typeof console.warn
  readonly warnGroup: typeof console.group
  readonly warnGroupEnd: typeof console.groupEnd
  readonly warnGroupCollapsed: typeof console.groupCollapsed
  readonly warnTable: typeof console.table

  readonly error: typeof console.error

  readonly trace: typeof console.trace
  readonly traceGroup: typeof console.group
  readonly traceGroupEnd: typeof console.groupEnd
  readonly traceGroupCollapsed: typeof console.groupCollapsed
  readonly traceTable: typeof console.table

  readonly fatal: typeof console.error
  readonly shouldLog: (level: Level) => boolean
  level: Level
}

export enum Level {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Trace = 'trace',
  Fatal = 'fatal',
}

// eslint-disable-next-line moxt/no-package-variable
const LOGGERS: Partial<Record<string, ConsoleLogger>> = {}

/**
 * 创建一个日志记录器
 * @param name 日志记录器名称
 * @returns 日志记录器实例
 */
export function logger(name: string): ConsoleLogger {
  if (LOGGERS[name]) {
    return LOGGERS[name]
  }

  const logger: ConsoleLogger = {
    level: DEBUG.includes(name) ? Level.Debug : Level.Info,
    shouldLog(level: Level): boolean {
      return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[logger.level]
    },
    debug: wrapMethod((...args: unknown[]) => {
      console.log(...args)
    }, Level.Debug),
    debugGroup: wrapMethod((...args: unknown[]) => {
      console.group(...args)
    }, Level.Debug),
    debugGroupEnd: wrapMethod(() => {
      console.groupEnd()
    }, Level.Debug),
    debugGroupCollapsed: wrapMethod((...args: unknown[]) => {
      console.groupCollapsed(...args)
    }, Level.Debug),
    debugTable: wrapMethod(
      (...args: unknown[]) => {
        console.table(...args)
      },
      Level.Debug,
      false,
    ),

    info: wrapMethod((...args: unknown[]) => {
      console.info(...args)
    }, Level.Info),
    infoGroup: wrapMethod((...args: unknown[]) => {
      console.group(...args)
    }, Level.Info),
    infoGroupEnd: wrapMethod(() => {
      console.groupEnd()
    }, Level.Info),
    infoGroupCollapsed: wrapMethod((...args: unknown[]) => {
      console.groupCollapsed(...args)
    }, Level.Info),
    infoTable: wrapMethod(
      (...args: unknown[]) => {
        console.table(...args)
      },
      Level.Info,
      false,
    ),

    warn: wrapMethod((...args: unknown[]) => {
      console.warn(...args)
    }, Level.Warn),
    warnGroup: wrapMethod((...args: unknown[]) => {
      console.group(...args)
    }, Level.Warn),
    warnGroupEnd: wrapMethod(() => {
      console.groupEnd()
    }, Level.Warn),
    warnGroupCollapsed: wrapMethod((...args: unknown[]) => {
      console.groupCollapsed(...args)
    }, Level.Warn),
    warnTable: wrapMethod(
      (...args: unknown[]) => {
        console.table(...args)
      },
      Level.Warn,
      false,
    ),

    error: wrapMethod((...args: unknown[]) => {
      console.error(...args)
    }, Level.Error),

    trace: wrapMethod((...args: unknown[]) => {
      console.trace(...args)
    }, Level.Trace),
    traceGroup: wrapMethod((...args: unknown[]) => {
      console.group(...args)
    }, Level.Trace),
    traceGroupEnd: wrapMethod(() => {
      console.groupEnd()
    }, Level.Trace),
    traceGroupCollapsed: wrapMethod((...args: unknown[]) => {
      console.groupCollapsed(...args)
    }, Level.Trace),
    traceTable: wrapMethod(
      (...args: unknown[]) => {
        console.table(...args)
      },
      Level.Trace,
      false,
    ),

    fatal: wrapMethod((...args: unknown[]) => {
      console.error(...args)
    }, Level.Fatal),
  }

  function wrapMethod<ARGS extends unknown[]>(
    method: (...args: ARGS) => void,
    level: Level,
    autoAppendName = true,
  ): (...args: ARGS) => void {
    return function (...args: ARGS) {
      if (!logger.shouldLog(level)) {
        return
      }

      if (autoAppendName) {
        if (args.length > 0) {
          args = [`[${level.toUpperCase()[0]}][${name}]`, ...args] as ARGS
        }
      }
      method(...args)
    }
  }

  LOGGERS[name] = logger

  return logger
}

export function resetLoggerForTest() {
  for (const key in LOGGERS) {
    if (LOGGERS[key]) {
      LOGGERS[key].level = DEBUG.includes(key) ? Level.Debug : Level.Info
    }
  }
}

export function listLoggers() {
  return Object.keys(LOGGERS)
}
