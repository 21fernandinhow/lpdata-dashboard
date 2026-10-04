# Interface artesanal sobre elementos nativos

A interface é escrita com SCSS próprio sobre elementos nativos do HTML. Não há biblioteca de componentes, nem framework de CSS utilitário, nem biblioteca de primitivas sem estilo.

A decisão tem duas metades. O visual é artesanal por escolha: é onde mora a identidade do produto, e é trabalho que não se terceiriza. O comportamento é nativo porque a plataforma passou a cobri-lo. O elemento `dialog` com `showModal()` entrega foco preso, `Esc` para fechar, fundo inerte, `::backdrop` e top layer. A Popover API é Baseline desde abril de 2025. O CSS Anchor Positioning fechou Baseline em 2026, e era justamente ele o motivo de existir a camada de posicionamento sobre a qual as bibliotecas de primitivas foram construídas. O elemento `details` cobre a navegação de estrutura aninhada com a semântica correta de disclosure.

Bibliotecas como Base UI, Radix e React Aria se justificam por componentes que não têm equivalente nativo: combobox, multi-select, seletor de data, tabela de dados, menu aninhado. O escopo fixado pela [ADR 0002](0002-escopo-limitado-a-superficie-da-api.md) não tem nenhum deles — os sete tipos de Campo Editável mapeiam quase um a um em elementos nativos.

Isso não é porta fechada. Primitiva se adota por componente, não por projeto: se um dia surgir um componente que o nativo não resolve, instala-se a primitiva daquele componente e o resto segue nativo. A regra é verificar o nativo primeiro.

Duas consequências conhecidas. O elemento `dialog` não trava a rolagem do corpo da página, o que se resolve no CSS. Estilizar `select` cross-browser continua sendo o furo da plataforma: `appearance: base-select` ainda não é Baseline, e o caminho é aceitar o fallback nativo como progressive enhancement.

Menos dependência também é menos superfície para o risco aceito na [ADR 0003](0003-sessao-com-tokens-no-navegador.md), em que uma dependência comprometida é o vetor realista contra o token guardado no navegador.
