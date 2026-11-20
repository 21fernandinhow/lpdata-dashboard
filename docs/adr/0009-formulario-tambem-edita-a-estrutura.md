---
status: accepted
---

# O Modo Formulário também edita a estrutura

O Modo Formulário passa a criar seções e campos, adicionar item a array, renomear chave, remover campo ou seção e mudar o `type` de um campo. Isso substitui a fronteira da [ADR 0004](0004-dois-modos-de-edicao-do-documento.md), em que só o Modo Raw mudava a estrutura.

A fronteira existia como modelo de permissão antes de existir permissão: um cliente não técnico receberia só o formulário e não conseguiria quebrar a Aplicação Consumidora. Na prática, o que ela produzia era o dono do projeto escrevendo JSON à mão para criar cada campo, e o formulário servindo só para trocar textos. Ficou decidido que montar a estrutura pelo formulário vale mais que essa proteção, que hoje protege um usuário que ainda não existe.

O custo fica registrado. Renomear ou remover uma chave quebra, sem aviso do LPData, a Aplicação Consumidora que a lê; a interface avisa isso antes de confirmar, mas não impede. Quando houver usuário além do dono, separar quem edita valores de quem edita estrutura volta a ser necessário, e terá de ser feito por permissão, não por modo.

Os dois modos continuam projeções do mesmo Documento em Edição. Trocar um valor muda só o trecho dele no texto, preservando a formatação do Modo Raw. Mudar a estrutura reescreve o documento formatado, com dois espaços de indentação. Mudar o `type` zera o `value` para o vazio do tipo novo (`""`, `0` ou `false`), para que os dois nunca fiquem incompatíveis.
