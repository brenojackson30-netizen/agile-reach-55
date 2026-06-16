## Painéis separados para Admin e Usuário

### Estrutura de rotas

```text
/auth                         → login (público)
/admin/*                      → área do administrador
  /admin/dashboard            → visão geral global
  /admin/clientes             → gestão de clientes (cadastrar, editar, atribuir)
  /admin/clientes/:id         → detalhe do cliente
  /admin/agenda               → agenda geral
  /admin/equipe               → gestão de funcionários e atribuições
  /admin/configuracoes        → configurações globais

/app/*                        → área do usuário (funcionário)
  /app/agenda                 → tela inicial: posts do dia dele
  /app/clientes               → clientes atribuídos a ele
  /app/clientes/:id           → detalhe (somente do que tem acesso)
  /app/perfil                 → configurações pessoais
```

### Redirecionamento por papel

- Após login (ou ao acessar `/`):
  - `admin` → `/admin/dashboard`
  - demais papéis → `/app/agenda`
- Não-admin tentando `/admin/*` → vai para `/app/agenda`.
- Admin tentando `/app/*` → vai para `/admin/dashboard`.
- URLs antigas (`/dashboard`, `/clientes`...) redirecionam para a área certa.

### Layouts

- **Admin**: sidebar com Dashboard, Clientes, Agenda, Equipe, Configurações. Etiqueta "Admin" visível.
- **Usuário**: sidebar/tab bar enxuta com Agenda, Clientes, Perfil. Sem ações de cadastro global.
- Botão "Atualizar" continua nos dois.

### Tela inicial do usuário (/app/agenda)

- Posts agendados para HOJE, filtrados pelos clientes atribuídos.
- Cada item: horário, cliente, plataforma, legenda, botão "Marcar como publicado".
- Estado vazio: "Nada agendado para hoje".

### Migração

- Mover telas atuais para `/admin/*`.
- Criar telas de `/app/*` reaproveitando componentes com queries filtradas por funcionário.

### Segurança

- Políticas atuais filtram por papel/atribuição; nada será afrouxado.
- Vou corrigir o erro de permissão que escondia clientes (função das políticas estava sem permissão de execução para usuários logados).
- Só admin cadastra/edita clientes e funcionários.

### Fora do escopo

- Sem mudanças de tema/visual.
- Sem novos campos de cadastro.
- Sem alterar integrações externas.