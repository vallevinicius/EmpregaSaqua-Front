# CLAUDE.md — empregasaqua-front

## Contexto
Front do EmpregaSaqua (vagas em Saquarema-RJ). Back: NestJS + Prisma 8 em `EmpregaSaqua-Back` (porta 3009).

## Stack
React 19, Vite 8, TypeScript 5 (strict + noUncheckedIndexedAccess), Tailwind v4 (`@tailwindcss/vite`), react-router 7, TanStack Query 5, react-hook-form 7 + zod 4, socket.io-client 4, vitest.

## Convenções
- Toda chamada HTTP passa por `src/api/endpoints.ts` → `src/lib/http.ts`. Nunca `fetch` em componente.
- IDs em path sempre via `seg()`; query via `buildUrl`.
- Texto vindo da API: `<SafeText>` / `<SafeParagraphs>`. Proibido `dangerouslySetInnerHTML`.
- `href`/`src` dinâmicos: só via `safeHttpUrl`, `safeAssetUrl`, `whatsappLink`, `mailtoLink`.
- Schemas zod espelham os DTOs do back (MaxLength, ArrayMaxSize). Ao mudar DTO no back, atualizar aqui.
- Endpoints ainda inexistentes: marcar `@pending` em `endpoints.ts`, tratar 404 com `ErrorState pending={...}` e documentar em `BACKEND_CONTRACT.md`.
- Query keys: `['jobs', ...]`, `['applications', ...]`, `['candidate','me']`, `['company','me']`, `['talent-pool', ...]`, `['analytics', role]`, `['admin', ...]`, `['chat', ...]`.
- Roles: `JOB_SEEKER`, `EMPLOYER`, `ADMIN`. Front nunca envia `ADMIN` no cadastro.

## Env
`VITE_API_URL` (default `/api`), `VITE_WS_URL` (vazio = mesma origem), `BACKEND_URL` (só proxy do Vite). Nada secreto em `VITE_*`.

## Git
Branches `feat/*`, `fix/*`, `refactor/*`. Nunca commitar direto em `main`.
