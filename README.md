<div align="center">

# EmpregaSaqua — Web

**Job board for Saquarema, Brazil: candidates, employers and moderation in one SPA.**

🇧🇷 [Leia em português](README.pt-BR.md)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white) ![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest&logoColor=white)

</div>

## About

Single-page app for EmpregaSaqua, a local job board. Job seekers search openings, apply and manage their résumé; employers publish jobs, review candidates and browse a talent pool; admins moderate content and users. Candidates and employers can chat in real time.

The API is a separate NestJS + Prisma service (EmpregaSaqua-Back, default port 3009).

## Areas

| Role | Routes |
|---|---|
| Public | `/` (jobs + filters in the URL), `/vagas/:id`, `/entrar`, `/cadastro` |
| Candidate | `/candidato/candidaturas`, `/candidato/perfil` (résumé + PDF + delete account), `/mensagens` |
| Employer | `/empresa` (dashboard), `/empresa/vagas` (+ `nova`, `:id/editar`, `:id/candidatos`), `/empresa/talentos`, `/empresa/banco-de-talentos`, `/empresa/perfil`, `/mensagens` |
| Admin | `/admin`, `/admin/moderacao`, `/admin/usuarios` |

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, Vite 8, TypeScript 5 (`strict` + `noUncheckedIndexedAccess`), Tailwind CSS 4 |
| Routing / data | React Router 7, TanStack Query 5 |
| Forms | React Hook Form 7 + Zod 4 (limits mirror the API DTOs) |
| Real time | socket.io-client 4 |
| Tests | Vitest |

## Architecture

```
src/
  api/          types.ts (mirrors the API contract) · endpoints.ts (the only API access layer)
  auth/         session.ts (token + expiry) · useAuth · route guards (UX only)
  lib/          http.ts (fetch with timeout/errors) · safe.ts (URLs/entities) · format.ts
  components/   ui/ (design system) · feedback (errors, toasts, safe text) · inputs · charts · layout
  features/     public · auth · candidate · employer · admin · chat
```

- **Server state** with TanStack Query (cache, `keepPreviousData` on pagination, retries only on 5xx/network with backoff).
- **Forms** with React Hook Form + Zod.
- **Code splitting** per page (`React.lazy`).

## Security decisions (and what each one costs)

| Decision | Why | Cost |
|---|---|---|
| JWT in memory + `sessionStorage` | Smaller window than `localStorage` (tab scope); survives F5. | XSS can still read it. The real fix is an HttpOnly cookie on the API. |
| No `dangerouslySetInnerHTML`; `SafeText` decodes entities and renders text | The API returns text passed through `sanitize-html`. | No rich formatting in descriptions. |
| `safeHttpUrl` / `safeAssetUrl` / `whatsappLink` / `mailtoLink` on every dynamic `href`/`src` | React escaping does not cover `javascript:` URLs in attributes. | Résumé links must be http(s). |
| Same-origin proxy (dev and prod) | Removes the dependency on the API's `CORS *`; enables `SameSite=Strict` cookies later. | Requires a reverse proxy in production. |
| Strict CSP without `unsafe-inline` (preview/prod) | Defense in depth against XSS. | No CSP in `npm run dev` (HMR needs inline). |
| WebSocket authenticated via `handshake.auth`, websocket transport only | Token never goes to query strings/logs. | No long-polling fallback. |
| Validated post-login redirect (`safeRedirect`) | Prevents open redirect via `state.from`. | — |
| Upload: type/size + PDF magic number checked on the client | Immediate feedback. | Does not replace API validation. |
| Profile PATCH sends only changed fields | The API **replaces** `experiences/educations` when sent; an empty form would wipe data. | — |
| Route guards | UX only. Authorization belongs to the API. | — |

## Getting started

**Prerequisites:** Node.js 20+, the API running on port 3009

```bash
cp .env.example .env        # adjust BACKEND_URL if the API is not on :3009
npm ci
npm run dev                 # http://localhost:5173 (proxies /api, /uploads and /socket.io → API)
```

### Environment variables

`.env.example` — nothing secret belongs in `VITE_*` variables.

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base path (default `/api`) |
| `VITE_WS_URL` | WebSocket URL (empty = same origin) |
| `BACKEND_URL` | Target of the Vite dev proxy only |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with proxy |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the build with the production CSP headers |
| `npm test` | Vitest (security utilities) |
| `npm run audit` | `npm audit` on production dependencies |

## Design

Tokens in `src/index.css` (ocean/sand palette, WCAG AA in light and dark via `prefers-color-scheme`), system font (no external requests), visible focus, skip link, `aria-live` on lists and chat, responsive from 360px.

## Team

- [Vinicius do Valle](https://github.com/vallevinicius)
- [Vinícius Diller](https://github.com/viniciusdiller)
