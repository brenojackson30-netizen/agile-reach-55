## Problema

O preview está em branco porque `src/integrations/supabase/client.ts` referencia `localStorage` no escopo do módulo:

```ts
auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
```

TanStack Start faz SSR — `localStorage` não existe no servidor — então o app quebra antes de montar (`ReferenceError: localStorage is not defined`), por isso `/clientes`, `/agenda`, etc. ficam vazios.

## Correção

Guardar o acesso a `localStorage` por ambiente em `src/integrations/supabase/client.ts`:

```ts
const isBrowser = typeof window !== "undefined";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: isBrowser ? window.localStorage : undefined,
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
  },
});
```

No SSR o cliente fica stateless; no browser a sessão persiste normalmente via `localStorage`.

## Verificação

- Recarregar `/` — deve renderizar.
- Abrir `/auth`, logar, e checar `/dashboard`, `/clientes`, `/agenda`, `/equipe`, `/configuracoes`.
- Confirmar que o erro `localStorage is not defined` sumiu dos logs.

## Próximo passo

Esse fix de 1 arquivo desbloqueia o preview. Assim que voltar a renderizar, eu consigo ver o que ainda falta em cada tela e abro um plano específico por funcionalidade pendente — qualquer trabalho de UI/feature está bloqueado por esse erro de SSR agora.