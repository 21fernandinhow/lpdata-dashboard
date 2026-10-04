# Substituição integral do documento, sem controle de concorrência

Toda gravação do Documento de Conteúdo envia o documento inteiro. Os dois modos de edição operam sobre o mesmo Documento em Edição, e salvar transmite esse documento completo, não um conjunto de alterações. Isso acompanha a [ADR 0004 do LPData](https://github.com/21fernandinhow/lpdata/blob/main/docs/adr/0004-documento-atual-sem-historico-no-mvp.md), que não guarda histórico, e também resolve a preocupação de perder alterações de campos que não estão na tela: não existe campo fora da tela, o documento inteiro está no cliente.

A tabela `landing_pages` não tem coluna de trava otimista, e a API não expõe atualização condicional. A consequência é que duas edições simultâneas — duas abas, ou o dashboard e o servidor MCP ao mesmo tempo — terminam com a última gravação vencendo, em silêncio, sem que ninguém seja avisado.

Isso é aceito por ora. Com um único usuário, o cenário real é esquecer uma aba aberta. Quando houver mais de uma pessoa editando, a mitigação possível sem mudar a API é reler a landing page antes de gravar e comparar `updated_at`, avisando quando o registro tiver mudado desde que foi aberto.

O PATCH aceita atualização parcial por chave, então alterar apenas `name` ou apenas `allowed_hosts` não precisa reenviar o documento.
