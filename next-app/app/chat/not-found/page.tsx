import { Suspense } from 'react'
import ClientNotFound from './client-not-found'

export default function NotFound() {
  return (
    <Suspense fallback="Loading...">
      <ClientNotFound />
    </Suspense>
  )
}
