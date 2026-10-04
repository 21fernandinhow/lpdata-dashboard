# Validação delegada à API

O contrato do Documento de Conteúdo é definido pelo `ContentDocumentValidator` do LPData e pela [ADR 0006 de lá](https://github.com/21fernandinhow/lpdata/blob/main/docs/adr/0006-contrato-do-documento-de-conteudo.md). O dashboard não o reimplementa. A API é a única fonte de verdade sobre o que é um documento válido, e a validação acontece no servidor, na gravação.

Reimplementar o validador em TypeScript criaria duas verdades em linguagens diferentes, divergindo em silêncio a cada mudança de um dos lados. O custo de não reimplementar é uma ida ao servidor para descobrir um erro que poderia ser visto antes — custo baixo, já que gravar é uma ação deliberada e pouco frequente.

Há uma assimetria que torna isso barato. No Modo Formulário o documento sai correto por construção, porque o editor é gerado a partir do `type`: um campo numérico não produz texto, um toggle não produz string. É no Modo Raw que o usuário consegue escrever qualquer coisa, e lá a única verificação local é a que o cliente precisa fazer de qualquer jeito para montar a requisição: se o texto é JSON parseável.

Os erros da API trazem o caminho do campo, no formato `$.hero.title`, o que permite ligar a mensagem ao campo correspondente na interface em vez de exibir um aviso genérico.
