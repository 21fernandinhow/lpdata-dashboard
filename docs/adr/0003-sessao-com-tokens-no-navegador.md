# Sessão com tokens no navegador

O access token vive apenas em memória, em uma variável do aplicativo, e nunca é persistido. O refresh token é guardado no `localStorage`, que é o que permite a sessão sobreviver ao recarregamento da página. Ao iniciar, o dashboard tenta renovar a sessão; se a renovação falhar, apresenta a tela de login.

O risco aceito é que qualquer JavaScript executando na página lê o `localStorage`. O vetor realista não é injeção de conteúdo, já que o React escapa por padrão, e sim uma dependência comprometida, que entra pelo build e é servida pelo próprio domínio. Como cada renovação emite um refresh token novo de trinta dias, um token vazado não concede trinta dias de acesso: concede acesso permanente, até revogação manual.

A decisão foi tomada sabendo disso, porque o primeiro usuário do dashboard é o dono do projeto e o raio de alcance é a própria conta dele. A alternativa — cookie `httpOnly` — não exige servidor próprio, porque `api.lpdata.io` e `dashboard.lpdata.io` compartilham o domínio registrável e o cookie seria first-party; exige, sim, uma mudança aditiva na API do LPData. Isso muda a severidade de um comprometimento, não a probabilidade: com cookie, um XSS ainda usa a sessão enquanto a aba está aberta, mas não leva a credencial embora.

A migração está registrada como issue e deve acontecer antes de o dashboard ter usuários além do dono.
