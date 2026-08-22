import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold">PlaceHub</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Fundação do projeto pronta</CardTitle>
            <CardDescription>
              Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui, com tema claro/escuro.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            As próximas fases (autenticação, plataforma, tenants) estão descritas em{' '}
            <code className="text-foreground">ROADMAP.md</code>.
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
