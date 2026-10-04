# SPA em Vite e React, sem servidor próprio

O dashboard é uma aplicação de página única construída com Vite, React e TypeScript, publicada como build estático na Vercel. Não existe servidor próprio: o navegador fala diretamente com a API do LPData em `api.lpdata.io`. Esse é o desenho que a [ADR 0008 do LPData](https://github.com/21fernandinhow/lpdata/blob/main/docs/adr/0008-acesso-pelo-navegador-restrito-ao-dashboard.md) previu ao autorizar `dashboard.lpdata.io` como origem de navegador em `LPDATA_CORS_ORIGINS`.

Next.js foi considerado e descartado. O que justifica um framework com servidor — renderização no servidor, acesso a banco de dados, SEO, esconder segredos do cliente — não existe aqui: o dashboard inteiro vive atrás de login, não há banco a acessar, e a única credencial em jogo é a do próprio usuário. Um servidor seria um repassador de chamadas com custo de manutenção e sem contrapartida.

A única coisa que um servidor próprio traria é guardar o refresh token em cookie `httpOnly`, fora do alcance do JavaScript. A [ADR 0003](0003-sessao-com-tokens-no-navegador.md) registra por que isso não foi feito agora e por que, quando for feito, não exigirá um servidor.
