Você tem razão. Vamos usar o Supabase, não Lovable Emails.

## Plano corrigido

### O que será usado

- `SUPABASE_SERVICE_ROLE_KEY`, que você já configurou
- Supabase Auth Admin para enviar convite por email
- Função já existente de convite via `inviteUserByEmail`

Não vou configurar domínio de email do Lovable nem infraestrutura de email do Lovable.

### O que vou ajustar

1. Conferir o fluxo atual em `/admin/equipe`, que já chama a função de criar funcionário.

2. Garantir que a função server-side use somente Supabase Admin com `SUPABASE_SERVICE_ROLE_KEY` para enviar o convite.

3. Manter a validação de admin antes de enviar convite, para ninguém sem permissão conseguir convidar funcionários.

4. Se o erro atual estiver vindo do Supabase Auth, ajustar a mensagem exibida para ficar clara em português.

5. Confirmar que o convite redireciona para a página correta de definição de senha.

## Resultado esperado

Ao clicar em “Enviar convite”, o Supabase envia o email de convite para o funcionário usando o sistema de Auth do próprio Supabase.