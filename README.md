# EmpregaSaqua — Front

SPA em React 19 + Vite + TypeScript + Tailwind v4 para o [EmpregaSaqua-Back](https://github.com/viniciusdiller/EmpregaSaqua-Back).

## Rodando

```bash
cp .env.example .env        # ajuste BACKEND_URL se o back não estiver em :3009
npm ci
npm run dev                 # http://localhost:5173 (proxy /api, /uploads e /socket.io → back)
```

Outros scripts: `npm run build` (typecheck + build), `npm test` (testes dos utilitários de segurança), `npm run preview` (build com os headers de CSP de produção), `npm run audit`.

> Leia **BACKEND_CONTRACT.md** antes de subir para produção: há falhas críticas no back (escalada para ADMIN no registro, `password_hash` vazando em includes, documentos de CNPJ públicos) e endpoints que o front já consome mas que ainda não existem.

## Áreas

| Perfil | Rotas |
|---|---|
| Público | `/` (vagas + filtros na URL), `/vagas/:id`, `/entrar`, `/cadastro` |
| Candidato | `/candidato/candidaturas`, `/candidato/perfil` (currículo + PDF + excluir conta), `/mensagens` |
| Empresa | `/empresa` (painel), `/empresa/vagas` (+ `nova`, `:id/editar`, `:id/candidatos`), `/empresa/talentos`, `/empresa/banco-de-talentos`, `/empresa/perfil` (dados, logo, documento), `/mensagens` |
| Admin | `/admin`, `/admin/moderacao`, `/admin/usuarios` |

## Arquitetura

```
src/
  api/          types.ts (espelha contract.prisma) · endpoints.ts (única camada de acesso à API)
  auth/         session.ts (token + expiração) · useAuth · guards (UX, não segurança)
  lib/          http.ts (fetch com timeout/erros) · safe.ts (URLs/entidades) · format.ts
  components/   ui/ (design system) · feedback (erros, toasts, texto seguro) · inputs · charts · layout
  features/     public · auth · candidate · employer · admin · chat
```

- **Estado de servidor**: TanStack Query (cache, `keepPreviousData` na paginação, retry só em 5xx/rede com backoff).
- **Formulários**: react-hook-form + zod, com limites espelhando os DTOs do back.
- **Code-splitting** por página (`React.lazy`).

## Decisões de segurança (e o que cada uma piora)

| Decisão | Por quê | Custo |
|---|---|---|
| JWT em memória + `sessionStorage` | Menor janela que `localStorage` (escopo da aba); sobrevive a F5. | XSS ainda lê o token. Solução real é cookie HttpOnly no back. |
| Nenhum `dangerouslySetInnerHTML`; `SafeText` decodifica entidades e renderiza como texto | O back devolve texto passado por `sanitize-html` (entidades codificadas). | Nenhuma formatação rica em descrições. |
| `safeHttpUrl` / `safeAssetUrl` / `whatsappLink` / `mailtoLink` em todo `href`/`src` dinâmico | O escape do React não cobre `javascript:` em atributos. | Links de currículo só http(s). |
| `sanitizeJob` descarta `expected_answer` e `password_hash` | Não propagar dado sensível em estado/devtools. | Mitigação: o dado ainda trafega na rede até o back corrigir. |
| Proxy same-origin (dev e prod) | Elimina dependência do CORS `*` do back; cookies futuros com `SameSite=Strict`. | Exige reverse proxy (exemplo em `deploy/nginx.conf`). |
| CSP estrita sem `unsafe-inline` (preview/prod) | Barreira de defesa em profundidade contra XSS. | Em `npm run dev` não há CSP (HMR precisa de inline). |
| WS autenticado via `handshake.auth`, só transporte websocket | Token não vai para query string/logs. | Sem fallback para long-polling. |
| Redirect pós-login validado (`safeRedirect`) | Evita open redirect via `state.from`. | — |
| Upload: tipo/tamanho + magic number do PDF no cliente | Feedback imediato. | Não substitui a validação do back. |
| PATCH de perfis envia só campos alterados | O back **substitui** `experiences/educations` quando enviados; sem `GET /me` um form vazio apagaria dados. | — |
| Guards de rota | Só UX. Autorização é do back. | — |

## Design

Tokens em `src/index.css` (paleta oceano/areia, WCAG AA em light e dark via `prefers-color-scheme`), fonte do sistema (zero request externo), foco visível, skip-link, `aria-live` em listas/chat, layout responsivo a partir de 360px.
