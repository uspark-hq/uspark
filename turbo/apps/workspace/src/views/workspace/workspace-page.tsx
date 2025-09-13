import { useLastResolved } from 'ccstate-react'
import { user$ } from '../../signals/auth'

export function WorkspacePage() {
  const user = useLastResolved(user$)
  const email = user?.emailAddresses.at(0)?.emailAddress

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">Workspace</h1>
        {user ? (
          <div className="flex items-center gap-4">
            {user.imageUrl && (
              <img
                src={user.imageUrl}
                alt={user.fullName ?? user.username ?? 'User'}
                className="h-10 w-10 rounded-full"
              />
            )}
            <div>
              <p className="text-lg font-medium">
                Welcome, {user.fullName ?? user.username ?? email ?? 'User'}!
              </p>
              {email && <p className="text-sm text-gray-600">{email}</p>}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading user information...</p>
        )}
      </div>
      <div className="border-t pt-4">
        <p className="text-gray-600">
          Your workspace content will appear here.
        </p>
      </div>
    </div>
  )
}
