# Dois modos de edição do Documento de Conteúdo

O Documento de Conteúdo é editado em dois modos sobre o mesmo Documento em Edição mantido em memória.

O Modo Formulário apresenta cada Campo Editável pelo editor correspondente ao seu `type` e altera somente `value`. A estrutura é imutável nele: não cria chave, não renomeia, não muda tipo, não aninha e não mexe em arrays. O Modo Raw apresenta o documento como JSON e é o único lugar onde a estrutura muda.

Essa fronteira existe porque a estrutura do documento é um contrato com código que o dashboard não enxerga. Quem renomeia uma chave quebra a Aplicação Consumidora que a lê, e nada no LPData avisa. Separar os modos faz com que o modo seja o modelo de permissão antes de existir permissão: hoje o dono do projeto usa os dois; quando houver cliente não técnico, ele recebe o formulário e não consegue quebrar a página.

Se o JSON do Modo Raw estiver inválido, o Modo Formulário fica indisponível, com a mensagem do erro. Tentar renderizar formulário sobre documento quebrado é onde esse tipo de editor vira fonte inesgotável de bug.
