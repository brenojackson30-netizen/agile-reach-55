Plano para resolver a tela vazia de Clientes:

1. Corrigir o bloqueio do banco
- O preview está recebendo erro de permissão ao ler/cadastrar clientes: o banco bloqueou a execução das funções usadas pelas regras de acesso.
- Vou ajustar as permissões das funções de acesso (`is_global_admin` e `has_client_access`) para que usuários autenticados consigam passar pelas políticas de segurança sem abrir os dados para usuários anônimos.
- Isso deve fazer os clientes já existentes aparecerem para o admin e para usuários atribuídos.

2. Melhorar a tela de Clientes quando houver erro
- Hoje a tela engole o erro e mostra “Nenhum cliente encontrado”, dando a impressão de que não existe nada.
- Vou mostrar uma mensagem clara quando o carregamento falhar, com botão para tentar novamente.

3. Adicionar cadastro de novo cliente
- Adicionar botão “Novo cliente” no topo da tela de Clientes, visível para admin.
- Abrir um modal simples com campos iniciais: nome, categoria, iniciais, cor e status.
- Ao salvar, inserir o cliente no Supabase, atualizar a lista automaticamente e mostrar confirmação.

4. Manter segurança e escopo
- O cadastro continuará restrito pelas políticas existentes: apenas admin poderá criar clientes.
- Não vou tornar clientes públicos nem remover RLS.
- Não vou alterar outras telas além do necessário para a tela de Clientes funcionar e cadastrar novos clientes.