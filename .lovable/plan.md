## Botão "Atualizar preview"

Adicionar um botão fixo no topo de todas as telas autenticadas que recarrega os dados do Supabase sem precisar dar F5.

### O que vai ser feito

1. **Editar `src/routes/_authenticated/route.tsx`**
   - Adicionar uma barra superior (topbar) acima do `<Outlet />`, alinhada à direita
   - Incluir um botão "Atualizar" com ícone de refresh (lucide `RefreshCw`)
   - Ao clicar:
     - Chama `queryClient.invalidateQueries()` (invalida TODAS as queries do React Query — clientes, agenda, dashboard, etc.)
     - Mostra ícone girando enquanto `isFetching > 0`
     - Toast verde "Dados atualizados" ao concluir

2. **Comportamento**
   - Botão visível em todas as rotas internas: `/dashboard`, `/clientes`, `/agenda`, `/equipe`, `/configuracoes`
   - Não recarrega a página (mantém estado de UI, modais, scroll)
   - Usa o `QueryClient` já existente via `useQueryClient()`

### Detalhes técnicos

- Componente novo inline na topbar usando `Button` do shadcn (`variant="ghost"`, `size="sm"`)
- Hook `useIsFetching()` do `@tanstack/react-query` para animar o ícone (`animate-spin` quando > 0)
- `toast.success("Dados atualizados")` via sonner (já instalado)
- Sem alterações em queries existentes — apenas invalidação global

### Escopo

- Não mexe em RLS, schema, ou edge functions
- Não cria realtime subscriptions (pedido foi botão manual)
