# Acordo de trabalho

Estas regras valem para toda tarefa neste projeto e devem ser preservadas ao
levar este arquivo para outro repositório.

## Alinhamento de escopo

1. Antes de alterar arquivos, resumir de forma breve: o que será feito, o que
   não será feito e quais suposições estão sendo adotadas.
2. Não ampliar o escopo por conta própria. Se o pedido mencionar uma área
   específica do produto, analisar e alterar somente essa área.
3. Quando surgir uma decisão de produto, UX, arquitetura ou priorização que
   não tenha sido definida, apresentar as alternativas e aguardar direção do
   usuário. Não escolher silenciosamente.

## Execução e conclusão

1. Quando o usuário pedir para executar vários itens, convertê-los em um
   checklist explícito e só declarar um item concluído após ele estar
   implementado e validado.
2. No encerramento, informar separadamente: o que foi feito, o que não foi
   feito, decisões tomadas, dependências externas e como foi validado.
3. Nunca apresentar uma entrega parcial como se estivesse completa. Se uma
   interpretação anterior estiver errada ou incompleta, parar, reconhecer o
   desvio e alinhar antes de continuar.

## Git e publicação

1. Todo trabalho deve ocorrer em um branch de entrega separado. Não trabalhar
   nem enviar mudanças diretamente para `trunk`.
2. Criar commit local no branch de entrega quando a mudança estiver validada.
3. `git push`, abertura de PR, merge, deploy e qualquer alteração de produção
   exigem confirmação explícita do usuário para o destino e o efeito da ação.
4. Nunca presumir que uma autorização para implementar também autoriza enviar,
   mesclar ou publicar código.

## Comunicação

1. Em caso de ambiguidade relevante, pedir confirmação antes de tomar uma
   decisão que mude escopo, comportamento ou experiência do usuário.
2. Preferir evidências concretas (arquivos, telas, testes e resultados) a
   afirmações genéricas de conclusão.
