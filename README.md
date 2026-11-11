# LPData Dashboard

Aplicação web onde o dono do conteúdo edita o Documento de Conteúdo e os assets de suas landing pages no [LPData](https://github.com/21fernandinhow/lpdata), sem terminal e sem conhecer a API.

O LPData é uma aplicação exclusivamente API e não tem frontend próprio. Este repositório é a Aplicação Consumidora de gerenciamento prevista por aquela decisão: consome a API de fora, e alterá-lo não muda a API.

## Estado

Em desenvolvimento. A fundação (#10) está pronta: projeto, casca, identidade visual e pilha de testes, sem nenhuma tela de produto. As decisões estruturais estão registradas em [docs/adr/](docs/adr/) e a sequência de desenvolvimento está dividida nas issues deste repositório, com a ordem na #18.

## Stack

Vite, React e TypeScript, SCSS próprio sobre elementos nativos do HTML, publicado como build estático na Vercel. Sem servidor próprio: o navegador fala diretamente com `api.lpdata.io`.

As razões de cada escolha estão nos ADRs, em especial a [0001](docs/adr/0001-spa-em-vite-e-react-sem-servidor-proprio.md) e a [0007](docs/adr/0007-interface-artesanal-sobre-elementos-nativos.md).

## Relação com a API

A API é tratada como contrato fixo. O dashboard faz tudo o que ela suporta e nada além disso — ver [ADR 0002](docs/adr/0002-escopo-limitado-a-superficie-da-api.md). Quando algo exigir endpoint ou campo que não existe, abre-se issue no repositório do LPData em vez de contornar no cliente.

A documentação pública da API, em português e inglês, está em [lpdata.io](https://lpdata.io).

## Configuração

O dashboard precisa saber onde a API está:

```text
VITE_LPDATA_API_URL=https://api.lpdata.io
```

Em desenvolvimento, aponte para a instância local do LPData e inclua a origem do dashboard em `LPDATA_CORS_ORIGINS`, do lado da API. Sem a variável, o dashboard usa `https://api.lpdata.io`, que é a API de produção, e avisa no console.

Copie o exemplo para começar:

```sh
cp .env.example .env
```

A origem padrão do Vite é `http://localhost:5173`. Se essa porta estiver ocupada, o Vite sobe em outra, e a API recusa a origem nova.

## Desenvolvimento

```sh
npm install
npm run dev          # servidor local
npm run build        # build estático em dist/
npm test             # testes, uma vez
npm run test:watch   # testes em modo observação
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier
```

Não há integração contínua: rode `npm test`, `npm run lint` e `npm run typecheck` antes de commitar.

## Identidade visual

O dashboard é a extensão da [documentação da API](https://lpdata.io) e copia o visual dela: a paleta monocromática loblolly, a fonte Inter, os breakpoints e os dois temas. Os tokens ficam em `src/styles/utils/variables.scss`. A documentação usa a fonte monoespaçada Paper Mono, que é do Mintlify e não é redistribuível, então o dashboard usa a cadeia de reserva que a própria documentação declara.
