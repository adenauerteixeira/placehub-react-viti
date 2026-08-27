import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import changelogRaw from '../../../CHANGELOG.md?raw'

// Renderiza o CHANGELOG.md do repositório direto no app — mesmo texto que o
// time de desenvolvimento mantém a cada sessão (linguagem técnica, nomes de
// arquivo/migration inclusos), decisão consciente do usuário: reaproveitar
// o arquivo existente em vez de manter um changelog separado curado só pra
// usuário final.
export function ChangelogPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Changelog</CardTitle>
        <CardDescription>Histórico de mudanças do sistema PlaceHub.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-3xl">
          <ReactMarkdown
            components={{
              // O "# Changelog" do arquivo já é redundante com o CardTitle acima.
              h1: () => null,
              h2: (props) => (
                <h2
                  className="border-border mt-8 border-b pb-2 text-xl font-semibold first:mt-0"
                  {...props}
                />
              ),
              h3: (props) => <h3 className="mt-6 text-base font-semibold" {...props} />,
              p: (props) => <p className="text-muted-foreground mt-3 text-sm leading-relaxed" {...props} />,
              ul: (props) => <ul className="mt-3 list-disc space-y-2 pl-5" {...props} />,
              li: (props) => (
                <li className="text-muted-foreground text-sm leading-relaxed" {...props} />
              ),
              strong: (props) => <strong className="text-foreground font-medium" {...props} />,
              a: (props) => (
                <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
              ),
              code: (props) => (
                <code className="bg-muted rounded px-1 py-0.5 text-xs" {...props} />
              ),
            }}
          >
            {changelogRaw}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}
