import type { ErrorInfo } from 'react'

interface ErrorFallbackProps {
  error: Error
  errorInfo: ErrorInfo
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DefaultErrorFallback(_: ErrorFallbackProps) {
  return (
    <div className="bg-moxt-fill-white flex h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="mt-12">
          <div className="text-16 text-moxt-text-1 w-80 text-center font-semibold">
            Something went wrong.
          </div>

          <div className="text-13 text-moxt-text-2 mt-2 w-80 text-center">
            Please try again or get in touch with our team for further help.
          </div>
        </div>
      </div>
    </div>
  )
}
