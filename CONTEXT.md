# LPData Dashboard

O LPData Dashboard é a aplicação web onde o dono do conteúdo edita o Documento de Conteúdo e os assets de suas landing pages, sem terminal, sem conhecer a API e sem depender de um desenvolvedor.

Ele é a Aplicação Consumidora de gerenciamento prevista pela [ADR 0005 do LPData](https://github.com/21fernandinhow/lpdata/blob/main/docs/adr/0005-aplicacao-exclusivamente-api.md), que decidiu que o LPData não teria frontend próprio. O dashboard vive em repositório separado, consome a API de fora, e alterá-lo não muda a API.

## Linguagem

O vocabulário do domínio — Usuário, Landing Page, Documento de Conteúdo, Campo Editável, Asset, Referência Externa, Aplicação Consumidora, Identificador Público — é definido pelo [CONTEXT.md do LPData](https://github.com/21fernandinhow/lpdata/blob/main/CONTEXT.md) e não se repete aqui. O LPData é a fonte de verdade desses termos.

Os termos abaixo pertencem ao dashboard.

**Modo Formulário**:
Visão do Documento de Conteúdo em que cada Campo Editável é apresentado pelo editor correspondente ao seu `type`. Edita somente `value`; a estrutura é imutável nesse modo.
_Evite_: Editor visual, builder, formulário dinâmico

**Modo Raw**:
Visão do Documento de Conteúdo como JSON, editável diretamente. É o único lugar onde a estrutura do documento muda — criar chave, renomear, alterar `type`, aninhar, adicionar item a array.
_Evite_: Modo avançado, modo desenvolvedor, modo JSON

**Documento em Edição**:
Cópia do `current_data` mantida em memória pelo dashboard enquanto a landing page está aberta. Os dois modos são projeções dele, e é ele que é gravado por inteiro ao salvar.
_Evite_: Rascunho, versão local, estado do formulário

**Sessão**:
Par de tokens obtido no login. O access token vive apenas em memória; o refresh token é persistido para que a sessão sobreviva ao recarregamento da página.
_Evite_: Login salvo, cookie de sessão
