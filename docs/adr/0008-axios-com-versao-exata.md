# Axios como cliente HTTP, com versão exata

O dashboard fala com a API do LPData pelo axios, numa instância central que fixa a URL base, manda `Accept: application/json` em toda requisição e põe o `Authorization: Bearer` quando há access token. As chamadas de autenticação — login, cadastro, renovação e saída — usam uma instância irmã, com a mesma base e sem a renovação automática, para que a renovação nunca dispare outra renovação. A versão é fixada sem faixa — `"axios": "1.21.0"`, sem `^` — e só muda por decisão explícita.

É uma exceção consciente a duas regras da casa. O [AGENTS.md](../../AGENTS.md) manda verificar o nativo antes de instalar dependência, e o `fetch` resolveria as requisições. A [ADR 0003](0003-sessao-com-tokens-no-navegador.md) aponta a dependência comprometida como o vetor realista contra o refresh token guardado no `localStorage`, e cada pacote a mais aumenta essa superfície.

O que pesou a favor foi o ciclo de vida da sessão, que é a parte de infraestrutura que não se quer refazer. Diante de um 401, o cliente renova a sessão e repete a requisição original uma vez, com as requisições simultâneas esperando a mesma renovação. Os interceptadores de requisição e de resposta do axios são exatamente esse ponto de extensão, e a requisição repetida sai da mesma configuração da original. Com `fetch`, esse invólucro seria escrito e mantido aqui, e é nele que um erro custa uma sessão derrubada ou um laço de renovação.

A mitigação é a versão exata. Uma faixa como `^1.21.0` aceitaria em silêncio a próxima versão publicada, inclusive uma versão maliciosa publicada por uma conta de mantenedor comprometida, que é o cenário da ADR 0003. Com a versão exata e o `package-lock.json`, o que entra no build é o que foi revisto. A versão adotada já estava publicada havia mais de duas semanas, tempo para um pacote adulterado ser descoberto e retirado. Atualizar é editar a versão à mão, olhando o que mudou.

A decisão não muda a ADR 0007: o axios cobre transporte, não interface. A regra de verificar o nativo primeiro continua valendo para cada dependência nova.
