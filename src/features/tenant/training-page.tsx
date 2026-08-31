import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** Página de treinamento em web — mesmo conteúdo do "Manual do Corretor" em
 * PDF, reorganizado como página navegável por capítulo (nav lateral fixa +
 * âncoras). Habilitada por tenant em Identidade Visual → Página pública →
 * "Habilitar página de treinamento pra equipe" (tenant.training_enabled).
 * Conteúdo estático, autoral — não vem do banco. */

const CHAPTERS = [
  { id: 'bem-vindo', num: '01', title: 'Bem-vindo' },
  { id: 'primeiro-acesso', num: '02', title: 'Primeiro acesso' },
  { id: 'painel', num: '03', title: 'Painel' },
  { id: 'leads', num: '04', title: 'Leads' },
  { id: 'negociacoes', num: '05', title: 'Negociações' },
  { id: 'reservas', num: '06', title: 'Reservas' },
  { id: 'propostas', num: '07', title: 'Propostas' },
  { id: 'vendas', num: '08', title: 'Vendas' },
  { id: 'comissoes', num: '09', title: 'Comissões' },
  { id: 'anuncios', num: '10', title: 'Anúncios' },
  { id: 'perfil-publico', num: '11', title: 'Seu perfil público' },
  { id: 'boas-praticas', num: '12', title: 'Boas práticas' },
  { id: 'referencia', num: '13', title: 'Referência rápida' },
]

export function TrainingPage() {
  return (
    <div className="mx-auto flex max-w-6xl gap-10">
      <nav className="sticky top-4 hidden h-fit w-52 shrink-0 flex-col gap-0.5 lg:flex">
        <p className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wide uppercase">
          Manual do Corretor
        </p>
        {CHAPTERS.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
          >
            <span className="text-primary font-mono text-xs font-bold">{c.num}</span>
            {c.title}
          </a>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Manual do Corretor</h1>
          <p className="text-muted-foreground mt-1">
            Guia completo, passo a passo: leads, negociações, propostas, reservas, vendas,
            comissões e anúncios.
          </p>
        </div>

        <Chapter id="bem-vindo" num="01" title="Bem-vindo ao PlaceHub">
          <p>
            O PlaceHub organiza todo o seu trabalho comercial — do primeiro contato de um cliente
            até a venda fechada e sua comissão paga. Este manual segue a jornada de um atendimento
            real, na ordem em que ela normalmente acontece:
          </p>
          <p className="text-primary text-center text-base font-semibold">
            Lead → Negociação → Reserva → Proposta → Venda → Comissão
          </p>
          <p>
            Cada capítulo mostra telas reais do sistema, com um exemplo completo — uma cliente
            fictícia chamada <b>Mariana Ferreira Souza</b>, que acompanhamos do primeiro contato
            até a venda fechada. Os campos e botões que você vai usar no dia a dia são exatamente
            os mesmos.
          </p>
          <Callout label="Importante">
            O que você vê no seu sistema pode ter menos itens no menu do que este manual mostra —
            cada corretor tem acesso apenas aos módulos que o administrador da imobiliária liberou
            pra ele. Se algum menu não aparecer pra você, fale com o administrador.
          </Callout>
        </Chapter>

        <Chapter id="primeiro-acesso" num="02" title="Primeiro acesso">
          <Steps
            items={[
              <>Abra o link de acesso da sua imobiliária no navegador (funciona em computador e celular, sem instalar nada).</>,
              <>Informe o <b>e-mail</b> e a <b>senha</b> cadastrados pelo administrador.</>,
              <>Clique em <b>Entrar</b>.</>,
            ]}
          />
          <Callout label="Esqueceu a senha?" tone="warn">
            Não existe "esqueci minha senha" no login — peça pro administrador cadastrar uma nova
            senha pra você em <b>Administração → Usuários</b>.
          </Callout>
          <Callout label="Dica" tone="tip">
            O botão de sol/lua no canto superior direito alterna entre tema claro e escuro. Use o
            que for mais confortável.
          </Callout>
        </Chapter>

        <Chapter id="painel" num="03" title="Painel">
          <p>Sua tela inicial — um resumo rápido de como está o seu mês.</p>
          <Shot src="/training/01-dashboard.png" caption="Painel do corretor: métricas do período, próximos contatos e atividades recentes." />
          <h3>O que cada número significa</h3>
          <RefTable
            rows={[
              ['Leads', 'Quantos leads chegaram pra você no período, e qual % já virou venda.'],
              ['Negociações ativas', 'Quantas negociações suas ainda estão em andamento.'],
              ['Propostas', 'Quantas propostas você registrou, e qual % foi aceita.'],
              ['Vendas', 'Quantas vendas você fechou e o valor total vendido.'],
              ['Sua comissão', 'O valor que cabe a você (não o total da imobiliária) no período.'],
            ]}
          />
          <Callout label="Dica" tone="tip">
            Comece o dia pelo Painel — os "Próximos contatos" atrasados são a lista de prioridades
            mais confiável que você tem.
          </Callout>
        </Chapter>

        <Chapter id="leads" num="04" title="Leads">
          <p>Um <b>lead</b> é qualquer pessoa que demonstrou interesse em algum imóvel — o primeiro passo de todo atendimento.</p>
          <h3>Criando um novo lead</h3>
          <Steps
            items={[
              <>Vá em <b>Leads</b> no menu superior.</>,
              <>Clique em <b>Novo lead</b>.</>,
              <>Preencha os dados do cliente.</>,
              <>Clique em <b>Criar lead</b>.</>,
            ]}
          />
          <Shot src="/training/02-novo-lead-form.png" caption='Formulário "Novo lead" preenchido com um exemplo completo.' />
          <RefTable
            rows={[
              ['Nome', 'Obrigatório.'],
              ['Telefone', 'Com DDD — o sistema formata sozinho.'],
              ['E-mail', 'Opcional.'],
              ['Origem', 'Manual, WhatsApp, Portal, Telefone, E-mail ou Outro.'],
              ['Corretor', 'Deixe em branco pra entrar na fila de leads sem corretor — qualquer um pode assumir depois.'],
              ['Observações', 'Detalhes do primeiro contato.'],
            ]}
          />
          <Callout label="Quem vê o quê">
            Você só enxerga os leads atribuídos a você, mais os que ainda não têm corretor
            definido (a "fila"). Leads de outros corretores não aparecem pra você.
          </Callout>

          <h3>Acompanhando um lead</h3>
          <Shot src="/training/03-lead-detalhe.png" caption="Tela de detalhe do lead — dados editáveis e status no topo." />
          <p>Edite qualquer dado a qualquer momento (clique em <b>Salvar</b>) e mude o status pelo seletor:</p>
          <div className="flex flex-wrap gap-1.5">
            {['Novo', 'Contatado', 'Qualificado', 'Em negociação', 'Convertido', 'Perdido'].map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>

          <h3>Agenda e follow-ups</h3>
          <p>Um <b>follow-up</b> é um lembrete de contato futuro. Clique em <b>Agendar</b> no card "Follow-ups" da tela do lead:</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Shot src="/training/04-agendar-followup.png" caption="Agendando um follow-up." />
            <Shot src="/training/05-lead-com-followup.png" caption="Resultado na tela do lead." />
          </div>
          <p>
            Depois que a data passa, o follow-up vira <Badge>Atrasado</Badge> até você clicar em{' '}
            <b>Concluir</b> (ícone de check) e registrar o que aconteceu. Dá pra <b>Reagendar</b>{' '}
            (ícone de relógio) se precisar mudar a data.
          </p>
          <p>
            A aba <b>Agenda</b> mostra os follow-ups de <i>todos</i> os seus leads juntos, com
            filtros <Badge>Em aberto</Badge> <Badge>Atrasados</Badge> <Badge>Concluídos</Badge>{' '}
            <Badge>Todos</Badge> — é a visão mais rápida pra saber quem ligar hoje.
          </p>
        </Chapter>

        <Chapter id="negociacoes" num="05" title="Negociações">
          <p>A tela mais importante do sistema — onde o lead se conecta a um imóvel específico, e onde reserva, proposta e venda acontecem.</p>
          <h3>Criando uma negociação</h3>
          <Steps
            items={[
              <>Vá em <b>Comercial → Negociações</b>.</>,
              <>Clique em <b>Nova negociação</b>.</>,
              <>Selecione o <b>Lead</b> (obrigatório).</>,
              <>Selecione o <b>Anúncio</b> — o imóvel negociado com esse cliente.</>,
              <>Confirme o <b>Corretor</b> e, se quiser, um <b>Próximo contato</b>.</>,
              <>Clique em <b>Criar negociação</b>.</>,
            ]}
          />
          <Shot src="/training/06-nova-negociacao-form.png" caption='Nova negociação ligando a lead Mariana Ferreira Souza ao imóvel "Casa 03 Quartos".' />
          <h3>A tela de detalhe</h3>
          <Shot src="/training/07-negociacao-detalhe.png" caption="Negociação recém-criada — ainda sem reserva nem proposta." />
          <h3>Status da negociação</h3>
          <RefTable
            rows={[
              ['Em atendimento', 'Início — organizando o contato.'],
              ['Visita', 'Cliente visitando o imóvel.'],
              ['Proposta', 'Já tem proposta — muda sozinho ao criar a primeira.'],
              ['Negociação', 'Ajustando valores e condições.'],
              ['Ganha', 'Venda fechada — muda sozinho ao fechar a venda.'],
              ['Perdida', 'Não seguiu adiante — o sistema pergunta o motivo.'],
            ]}
          />
          <Callout label="Dica" tone="tip">
            Você não precisa ficar mudando o status manualmente o tempo todo — criar a primeira
            proposta e fechar a venda já atualizam o status sozinhos.
          </Callout>
        </Chapter>

        <Chapter id="reservas" num="06" title="Reservas">
          <p>Reservar um imóvel "segura" ele pra um cliente por um tempo, tirando ele de circulação pros outros corretores.</p>
          <p>Duas formas de abrir a reserva: pelo botão <b>Reservar imóvel</b> na negociação (já vem com cliente e corretor preenchidos), ou pelo ícone de calendário na lista de <b>Anúncios</b>, em qualquer imóvel Publicado.</p>
          <Shot src="/training/08-reservar-form.png" caption="Formulário de reserva preenchido." />
          <RefTable
            rows={[
              ['Cliente', 'Obrigatório — o nome capitaliza automaticamente.'],
              ['Telefone / E-mail', 'Opcionais.'],
              ['Válida até', 'Obrigatório. Padrão de 3 dias — depois a reserva expira sozinha.'],
              ['Corretor', 'Quem está atendendo.'],
            ]}
          />
          <Shot src="/training/09-negociacao-reservada.png" caption='Negociação mostrando "Imóvel reservado até..." depois de confirmar.' />
          <Callout label="Atenção ao prazo" tone="warn">
            Passado o prazo, a reserva expira automaticamente e o imóvel volta a ficar disponível
            pra qualquer corretor. Renove antes de vencer se o cliente ainda estiver decidindo.
          </Callout>
          <p>Pra cancelar: lista de <b>Reservas</b> → <b>Cancelar reserva</b> na linha (o sistema pede um motivo, opcional).</p>
        </Chapter>

        <Chapter id="propostas" num="07" title="Propostas">
          <p>A proposta registra formalmente um valor oferecido pelo cliente — e é a partir de uma proposta aceita que a venda é fechada.</p>
          <Callout label="Onde encontrar">
            Propostas não têm tela própria no menu — ficam dentro da negociação, no card
            "Propostas".
          </Callout>
          <h3>Criando uma proposta</h3>
          <Steps
            items={[
              <>Na negociação, clique em <b>Nova proposta</b>.</>,
              <>Informe o <b>Valor</b> oferecido.</>,
              <>Se quiser, defina até quando a proposta é <b>Válida</b>.</>,
              <>Descreva <b>Condições de pagamento</b> e <b>Observações</b>.</>,
              <>Clique em <b>Criar proposta</b> — entra como Rascunho.</>,
            ]}
          />
          <Shot src="/training/10-nova-proposta-form.png" caption="Nova proposta de R$ 580.000,00, com condições de pagamento." />
          <h3>Status de uma proposta</h3>
          <RefTable
            rows={[
              ['Rascunho', 'Registrada, ainda não enviada ao cliente.'],
              ['Enviada', 'Com o cliente pra análise.'],
              ['Contraproposta', 'Sugeriram outro valor/condição.'],
              ['Aceita', 'Fechou acordo — libera o botão de fechar venda.'],
              ['Recusada', 'O cliente não aceitou.'],
              ['Expirada', 'Passou da validade sem decisão.'],
              ['Cancelada', 'Cancelada manualmente.'],
            ]}
          />
          <h3>Aceitando uma proposta</h3>
          <p>Não existe um botão "Aceitar" separado:</p>
          <Steps
            items={[
              <>Clique no ícone de lápis (<b>Editar</b>) na linha da proposta.</>,
              <>Mude o <b>Status</b> para <b>Aceita</b>.</>,
              <>Clique em <b>Salvar</b>.</>,
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Shot src="/training/12-editar-proposta-aceita.png" caption="Editando a proposta, status Aceita." />
            <Shot src="/training/13-proposta-aceita-fechar-venda.png" caption='Botão "Fechar venda" aparece após salvar.' />
          </div>
        </Chapter>

        <Chapter id="vendas" num="08" title="Vendas">
          <p>Fechar a venda é o passo que confirma o negócio — e gera automaticamente a sua comissão.</p>
          <p>Só é possível a partir de uma proposta <Badge>Aceita</Badge>, clicando em <b>Fechar venda</b> na negociação (não existe "Nova venda" separada).</p>
          <Shot src="/training/14-fechar-venda-form.png" caption="Formulário completo: entrada, parcelas, financiamento e comissão." />
          <RefTable
            rows={[
              ['Entrada', 'Valor pago à vista/de entrada.'],
              ['Financiamento (estimado)', 'Calculado sozinho: venda − entrada − bens em pagamento.'],
              ['Parcelas da entrada', 'Até 6 parcelas — a soma precisa bater exatamente com a entrada.'],
              ['Bens em pagamento', 'Carro, outro imóvel etc. dado como parte do pagamento.'],
              ['Comissão (%)', 'Percentual total (padrão 5%). Seu corte é o menor entre esse % e o seu % individual.'],
            ]}
          />
          <Callout label="Atenção" tone="warn">
            Se a soma das parcelas de entrada não bater com o valor da entrada, o sistema não
            deixa salvar. Confira antes de clicar em "Fechar venda".
          </Callout>
          <p>Depois de fechar: a negociação vira <Badge>Ganha</Badge>, o anúncio vira <Badge>Vendido</Badge>, e a comissão nasce sozinha.</p>
          <Shot src="/training/16-venda-detalhe.png" caption="Detalhe da venda, com parcelas e link direto pra comissão." />

          <h3>Recebendo uma parcela</h3>
          <p>Registre em <b>Receber parcela</b> (ícone de carteira, na linha da parcela):</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Shot src="/training/17-receber-parcela-form.png" caption="Confirmando o recebimento via Pix." />
            <Shot src="/training/18-venda-parcela-recebida.png" caption='Parcela vira "Recebida" e a comissão passa a "A receber".' />
          </div>
          <Callout label="Cancelamento">
            Só o administrador da imobiliária pode cancelar uma venda já concluída.
          </Callout>
        </Chapter>

        <Chapter id="comissoes" num="09" title="Comissões">
          <p>Toda comissão é gerada automaticamente ao fechar uma venda — você nunca cria uma manualmente.</p>
          <Shot src="/training/20-comissoes-lista.png" caption="Lista de comissões — só as suas, nunca as de outros corretores." />
          <h3>Entendendo o cálculo</h3>
          <Shot src="/training/19-comissao-detalhe.png" caption="Percentual total, valor bruto e o corte de cada parte." />
          <RefTable
            rows={[
              ['Percentual total', '5% — definido ao fechar a venda.'],
              ['Valor bruto', 'R$ 29.000,00 — 5% sobre R$ 580.000,00.'],
              ['Corretor (3%)', 'R$ 17.400,00 — o que cabe a você.'],
              ['Imobiliária', 'O restante fica com a agência.'],
            ]}
          />
          <Callout label="Por que meu percentual é diferente do total?" tone="tip">
            Seu corte é sempre o <i>menor</i> valor entre o percentual da venda e o percentual
            individual configurado no seu cadastro de corretor.
          </Callout>
          <h3>O fluxo de repasse — o que você faz</h3>
          <Steps
            items={[
              <>Você fecha a venda → a comissão nasce automaticamente.</>,
              <>O cliente paga → você registra o recebimento → a parcela vira "Recebida do cliente".</>,
              <>O <b>administrador</b> transfere seu repasse e clica em <b>Registrar repasse</b>, anexando comprovante.</>,
              <>A parcela vira <b>"Aguardando confirmação"</b> — sua única ação nessa tela.</>,
              <>Você confere o comprovante e clica em <b>Confirmar recebimento</b>.</>,
            ]}
          />
          <Callout label="Confira antes de confirmar" tone="warn">
            "Confirmar recebimento" garante que o repasse realmente caiu na sua conta. Confira o
            comprovante antes — depois de confirmado, não tem como desfazer.
          </Callout>
        </Chapter>

        <Chapter id="anuncios" num="10" title="Anúncios">
          <p>O catálogo de imóveis da imobiliária — o que aparece no site público e o que você usa nas suas negociações.</p>
          <Shot src="/training/26-anuncios-lista.png" caption="Lista de anúncios, com filtro por status e ações rápidas." />
          <Callout label="Quem pode cadastrar">
            Se você tem acesso ao módulo "Anúncios", pode criar, editar e excluir livremente. O
            cadastro só fica completo depois de salvo pelo menos uma vez.
          </Callout>

          <h3>Aba 1 — Dados básicos</h3>
          <Shot src="/training/21-anuncio-dados-basicos.png" caption="Aba Dados básicos de um anúncio já publicado." />
          <RefTable
            rows={[
              ['Título / Subtítulo', 'Título obrigatório; subtítulo aparece em destaque no site.'],
              ['Tipo de imóvel', 'Terreno, Casa, Apartamento, Chácara/Fazenda, Comercial, Lançamento, Cessão (Ágio).'],
              ['Preço / Promocional', 'O promocional precisa ser ≤ preço normal — aparece riscado no site.'],
              ['Empreendimento / Parceiro / Proprietário / Corretor', 'Opcionais, cada um com botão "+" pra cadastrar sem sair da tela.'],
            ]}
          />
          <Callout label="O link não muda" tone="warn">
            O endereço público do anúncio é gerado a partir do título na criação e não muda depois
            — pense bem no título antes de criar, se for compartilhar o link.
          </Callout>

          <div className="grid gap-4 sm:grid-cols-2">
            <Shot src="/training/22-anuncio-endereco.png" caption="Aba Endereço — CEP preenche o resto sozinho." />
            <Shot src="/training/23-anuncio-caracteristicas.png" caption="Aba Características — quartos, banheiros, áreas." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Shot src="/training/24-anuncio-amenidades.png" caption="Aba Amenidades — salva sozinha ao marcar." />
            <Shot src="/training/25-anuncio-midia.png" caption="Aba Mídia — upload de fotos." />
          </div>
          <Callout label="Dica" tone="tip">
            A primeira foto enviada vira a capa automaticamente. Pra trocar, passe o mouse sobre
            outra foto e clique na estrela. Até 5 MB por foto, em PNG, JPEG ou WEBP.
          </Callout>

          <h3>Status do anúncio</h3>
          <RefTable
            rows={[
              ['Rascunho', 'Recém-criado, ainda não aparece no site.'],
              ['Publicado', 'Visível no site, disponível pra reserva.'],
              ['Reservado', 'Tem uma reserva ativa no momento.'],
              ['Vendido', 'Muda sozinho ao fechar a venda.'],
              ['Inativo', 'Fora do ar, sem estar vendido.'],
            ]}
          />
        </Chapter>

        <Chapter id="perfil-publico" num="11" title="Seu perfil público">
          <p>
            Todo corretor cadastrado pode ter uma página pública — a "vitrine" que os clientes
            veem no site da imobiliária, em <b>[site]/corretores/[seu-nome]</b>, com foto, nome,
            CRECI, biografia, botão de WhatsApp e os imóveis vinculados a você.
          </p>
          <Callout label="Importante">
            Essa página vem do <b>cadastro de Corretor</b> da imobiliária — não é algo que você
            edita pelo seu login. Só quem tem acesso ao módulo "Corretores" (geralmente o
            administrador) atualiza essas informações.
          </Callout>
          <p>
            Fale com o administrador pra manter foto, biografia e telefone sempre atualizados — e
            divulgue o link nas suas redes e no WhatsApp. É uma forma direta de captar leads novos.
          </p>
        </Chapter>

        <Chapter id="boas-praticas" num="12" title="Boas práticas">
          <ul className="flex flex-col gap-2.5">
            {[
              ['Comece pelo Painel.', 'Os "Próximos contatos" atrasados são sua lista de prioridades do dia.'],
              ['Sempre agende o próximo passo.', 'Depois de qualquer contato, crie ou reagende um follow-up — não confie na memória.'],
              ['Reserve cedo, mas com prazo curto.', 'Protege o imóvel sem travar a venda pros outros corretores.'],
              ['Registre a proposta assim que tiver um valor concreto.', 'Mesmo como Rascunho — fica tudo documentado.'],
              ['Confira a soma das parcelas antes de fechar a venda.', 'É a causa mais comum de erro nessa etapa.'],
              ['Confira o comprovante antes de confirmar o recebimento da comissão.', 'Essa ação não pode ser desfeita.'],
              ['Mantenha seu perfil público em dia.', 'Peça pro administrador atualizar foto e bio sempre que precisar.'],
              ['Use as Observações a seu favor.', 'Quanto mais contexto registrado, mais fácil retomar um atendimento depois.'],
            ].map(([title, desc]) => (
              <li key={title} className="flex gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>
                  <b>{title}</b> {desc}
                </span>
              </li>
            ))}
          </ul>
        </Chapter>

        <Chapter id="referencia" num="13" title="Referência rápida de status">
          <p className="text-muted-foreground">Todos os status do sistema, reunidos numa consulta rápida.</p>
          <StatusGroup title="Lead" items={['Novo', 'Contatado', 'Qualificado', 'Em negociação', 'Convertido', 'Perdido']} />
          <StatusGroup title="Negociação" items={['Em atendimento', 'Visita', 'Proposta', 'Negociação', 'Ganha', 'Perdida']} />
          <StatusGroup title="Reserva" items={['Ativa', 'Expirada', 'Cancelada', 'Convertida em venda']} />
          <StatusGroup title="Proposta" items={['Rascunho', 'Enviada', 'Contraproposta', 'Aceita', 'Recusada', 'Expirada', 'Cancelada']} />
          <StatusGroup title="Venda" items={['Concluída', 'Cancelada']} />
          <StatusGroup title="Parcela da entrada" items={['Pendente', 'Recebida']} />
          <StatusGroup title="Comissão" items={['Prevista', 'A receber', 'Recebida', 'Paga', 'Cancelada']} />
          <StatusGroup title="Anúncio" items={['Rascunho', 'Publicado', 'Reservado', 'Vendido', 'Inativo']} />

          <Callout label="Dúvidas?">
            Este manual cobre o fluxo padrão do corretor. Se algo na sua tela for diferente, fale
            com o administrador da sua imobiliária — permissões variam de corretor pra corretor.
          </Callout>
        </Chapter>
      </div>
    </div>
  )
}

function Chapter({
  id,
  num,
  title,
  children,
}: {
  id: string
  num: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t pt-10 first:border-t-0 first:pt-4">
      <p className="text-primary text-xs font-bold tracking-wide uppercase">Capítulo {num}</p>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Callout({
  label,
  tone = 'default',
  children,
}: {
  label: string
  tone?: 'default' | 'tip' | 'warn'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'bg-muted/50 rounded-r-md border-l-4 p-3 text-sm',
        tone === 'default' && 'border-primary',
        tone === 'tip' && 'border-accent-foreground/40',
        tone === 'warn' && 'border-destructive',
      )}
    >
      <p
        className={cn(
          'mb-1 text-xs font-bold tracking-wide uppercase',
          tone === 'warn' ? 'text-destructive' : 'text-primary',
        )}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Shot({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="overflow-hidden rounded-lg border shadow-sm">
        <img src={src} alt={caption} loading="lazy" className="w-full" />
      </div>
      <figcaption className="text-muted-foreground text-xs italic">{caption}</figcaption>
    </figure>
  )
}

function RefTable({ rows }: { rows: [string, string][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campo</TableHead>
          <TableHead>Detalhe</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell className="font-medium whitespace-nowrap align-top">{k}</TableCell>
            <TableCell className="text-muted-foreground">{v}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="bg-accent text-accent-foreground inline-block rounded-full px-2 py-0.5 text-xs font-medium">
      {children}
    </span>
  )
}

function StatusGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2 border-b pb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
      </div>
    </div>
  )
}
