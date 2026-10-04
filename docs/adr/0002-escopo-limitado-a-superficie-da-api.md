# Escopo limitado à superfície da API

O dashboard faz tudo o que a API atual do LPData suporta, e nada além disso. Ele não se antecipa a endpoints que não existem nem simula no cliente comportamento que o backend não oferece.

A superfície é esta: cadastro, login, logout, renovação de sessão e dados do usuário autenticado; criar, listar, abrir, atualizar e apagar landing pages, com os atributos que o filtro de atributos aceita — `name`, `current_data` e `allowed_hosts`; enviar, listar, abrir e apagar assets, sem atualização, porque a API não a tem; e a leitura pública do Documento de Conteúdo por `public_id`.

A regra decide sozinha várias coisas que a [issue #21 do LPData](https://github.com/21fernandinhow/lpdata/issues/21) havia deixado em aberto. Pré-visualização renderizada da landing page fica de fora, porque não há API para isso e a apresentação pertence à Aplicação Consumidora; o que cabe é mostrar o JSON público. O metadado `dashboard_config` fica de fora, porque a API não o interpreta, de modo que o Modo Formulário é dirigido apenas pelo `type`. Emissão e revogação de tokens de API ficam de fora, porque ainda não existem. Compartilhamento de landing page entre usuários e recuperação de senha ficam de fora pelo mesmo motivo.

Quando uma necessidade real exigir algo que a API não tem, a resposta é abrir issue no repositório do LPData, não contornar no cliente.
