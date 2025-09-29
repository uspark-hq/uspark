import { useLoadable } from 'ccstate-react'
import { projectFiles$ } from '../../signals/project/project'
import { Link } from '../router/navigate'

export function ProjectPage() {
  const projectFiles = useLoadable(projectFiles$)
  if (projectFiles.state === 'loading') {
    return <div>Loading...</div>
  }

  if (projectFiles.state === 'hasError' || !projectFiles.data) {
    return <div>Error loading project files</div>
  }

  return (
    <>
      <div>Project Page</div>
      <pre>{JSON.stringify(projectFiles.data)}</pre>
      <Link pathname="/">Go to Workspace</Link>
    </>
  )
}
