import { useGet } from 'ccstate-react'
import { page$ } from '../../signals/react-router'

export function Router() {
  return useGet(page$)
}
