# LPData Dashboard — instruções para agentes

## O que é este repositório

O frontend de gerenciamento do LPData. Leia o [CONTEXT.md](CONTEXT.md) antes de qualquer trabalho de domínio, e os ADRs em [docs/adr/](docs/adr/) antes de qualquer decisão estrutural.

A API que este repositório consome vive em [21fernandinhow/lpdata](https://github.com/21fernandinhow/lpdata). Ela é tratada como contrato fixo: ver [ADR 0002](docs/adr/0002-escopo-limitado-a-superficie-da-api.md).

## Issue tracker

Issues e especificações vivem nas GitHub Issues deste repositório. Veja `docs/agents/issue-tracker.md`.

## A API é um contrato, não um recurso a estender

Nenhuma entrega deste repositório muda a API do LPData. Quando uma necessidade exigir endpoint, campo ou comportamento que não existe, isso não é implementado aqui por aproximação: abre-se uma issue no repositório do LPData e o escopo desta entrega é ajustado. Inventar no cliente o que falta no backend é o erro que esta regra existe para impedir.

## Desenvolvimento orientado a testes

TDD é um pilar deste repositório. Para cada fluxo, escreva primeiro um teste de integração enxuto que defina o contrato daquele fluxo; depois conduza a implementação pelo ciclo red-green-refactor de testes unitários. O teste de integração é a validação final de que o caminho completo funciona.

Aqui, "teste de integração" significa renderizar a rota com a API simulada e exercer o fluxo como o usuário o faria — preencher, clicar, gravar, conferir o que foi enviado. Não é teste de componente isolado, e não sobe navegador.

A pilha é Vitest com Testing Library e jsdom, a mesma já usada em outro projeto da casa, mais MSW para simular a API no nível da rede, de modo que o código sob teste não saiba que está sendo testado. São todas dependências de desenvolvimento: não entram no bundle e, portanto, não ampliam a superfície discutida na [ADR 0003](docs/adr/0003-sessao-com-tokens-no-navegador.md).

Duas coisas que não se testa aqui. O contrato do Documento de Conteúdo é validado pela API e não é reimplementado no cliente ([ADR 0006](docs/adr/0006-validacao-delegada-a-api.md)), então não há validador local a cobrir — o que se testa é que o erro da API chega ao campo certo. E o comportamento de elemento nativo é do navegador: não se escreve teste para o foco preso do `dialog` nem para a tecla `Esc`.

## Estilo e componentes

A interface é construída com SCSS próprio sobre elementos nativos do HTML, sem biblioteca de componentes e sem biblioteca de primitivas. Antes de instalar qualquer dependência de UI, verifique se um elemento nativo resolve — `dialog`, Popover API, `details`, os tipos de `input`. Ver [ADR 0007](docs/adr/0007-interface-artesanal-sobre-elementos-nativos.md).

Cada dependência nova é superfície de ataque para o risco aceito na [ADR 0003](docs/adr/0003-sessao-com-tokens-no-navegador.md), em que o refresh token fica legível por JavaScript. O custo de um pacote não é só o bundle.
