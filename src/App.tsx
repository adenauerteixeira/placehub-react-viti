import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from '@/app/app-shell'
import { AppErrorBoundary } from '@/components/app-error-boundary'
import { FullscreenSpinner } from '@/components/fullscreen-state'

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Suspense fallback={<FullscreenSpinner />}>
          <AppShell />
        </Suspense>
      </AppErrorBoundary>
    </BrowserRouter>
  )
}

export default App
