//oxlint-disable jest/no-export
import { Level } from '../log'

export function enableDebugLogger(...loggers: string[]) {
  const config: Record<string, Level> = {}
  for (const logger of loggers) {
    config[logger] = Level.Debug
  }

  return config
}
