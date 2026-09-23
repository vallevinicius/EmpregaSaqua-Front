# Contrato Front ↔ Back — EmpregaSaqua

Referência: `EmpregaSaqua-Back@6e75ca5`. Este arquivo lista **o que o front já consome**, **o que ele espera e ainda não existe** e **as falhas do back que o front só consegue mitigar, não corrigir**. Ordem: da mais crítica para a menos crítica.

---

## 1. Falhas de segurança no back (corrigir antes de produção)

| # | Sev. | Onde | Problema | Correção |
|---|------|------|----------|----------|
| 1 | 🔴 | `users/dtos/create-user.dto.ts` | `POST /auth/register` aceita `role: "ADMIN"` → qualquer pessoa vira admin. O front nunca envia ADMIN, mas isso **não protege nada**. | Trocar por `@IsIn(['JOB_SEEKER','EMPLOYER'])` ou DTO próprio sem `ADMIN`. |
| 2 | 🔴 | `jobs/repositories/prisma-jobs.repository.ts#findById` | `include('employer', e => e.include('company_profile'))` devolve o **User completo, com `password_hash`**, no endpoint público `GET /jobs/:id`. | `e.select('id').include('company_profile', cp => cp.select('nome_fantasia','logo_url','verification_status'))`. |
| 3 | 🔴 | `findById` e `findAllPublic` | `questions` devolve `expected_answer` (gabarito do knockout) publicamente. | `q.select('id','question_text')` nas rotas públicas. |
| 4 | 🔴 | `applications/repositories/...#findByJob`, `talent-pool/...#findByEmployer` | `include('applicant' / 'candidate')` sem `select` → `password_hash` do candidato vai para a empresa. | `u.select('id','email').include('candidate_profile')`. |
| 5 | 🔴 | `app.module.ts` (ServeStatic `/uploads`) | Documentos de CNPJ/contrato social ficam **públicos** em `/uploads/DocumentosEmpresas/*`. | Salvar fora de `uploads/` servido e expor `GET /admin/companies/:id/verification-document` (ADMIN, stream). O `deploy/nginx.conf` bloqueia o path como paliativo. |
| 6 | 🔴 | `auth.module.ts`, `jwt.strategy.ts` | Fallback `JWT_SECRET \|\| 'secretKey'` — sem env, tokens são forjáveis. | Falhar no boot se `JWT_SECRET` ausente/curto (`ConfigModule` com `validationSchema`). |
| 7 | 🟠 | `applications.service.ts#applyForJob` | Knockout só é avaliado se `answers` vier no body: omitir `answers` pula a triagem. Também aceita candidatura em vaga `PENDING`. | Se a vaga tem perguntas, exigir resposta para todas; aceitar só `ACTIVE` e não expirada. |
| 8 | 🟠 | `jobs.controller.ts#findOne` | `GET /jobs/:id` público devolve vagas `PENDING/REJECTED` e soft-deletadas. O front esconde, mas o dado vaza. | Público: só `ACTIVE && deleted_at IS NULL`; dono/admin via rota autenticada. |
| 9 | 🟠 | `jobs.service.ts#updateEmployerJob` | Employer edita vaga `ACTIVE` sem voltar para `PENDING` → burla a moderação. | Ao editar campos de conteúdo, `status = PENDING`. |
| 10 | 🟠 | `main.ts`, `chat.gateway.ts` | CORS `'*'` com `credentials: true` em dev; gateway WS `origin: '*'` sempre. | Allowlist por env (`CORS_ORIGINS`). Em prod o front roda same-origin (ver `deploy/nginx.conf`). |
| 11 | 🟠 | `chat.gateway.ts` | Mensagens de erro internas (`error.message`) vão para o cliente via `WsException`. Sem validação de DTO no payload (`roomId`, `content` sem limite de tamanho). | `ValidationPipe` no gateway, `content` com `MaxLength(2000)`, erro genérico ao cliente. |
| 12 | 🟡 | `candidates/dtos/update-candidate-profile.dto.ts` | `@Sanitize()` em `skills` (array) não sanitiza nada (só trata `string`); nenhum campo tem `MaxLength`. `create-application.dto.ts#cover_letter` também sem limite. | Sanitizar cada item; adicionar `MaxLength`/`ArrayMaxSize` (o front já aplica: bio 2000, skills 30×50, cover 3000). |
| 13 | 🟡 | `create-user.dto.ts` | Senha mínima 6. Front exige 8 + letra + número; back deveria exigir o mesmo e `MaxLength(72)` (limite do bcrypt). | — |
| 14 | 🟡 | `admin.service.ts` | Admin pode remover/rebaixar a si mesmo (front bloqueia, back não). `deleteUser` faz hard delete, contrariando a regra de soft delete do `AGENTS.md`. | Bloquear `id === req.user.id`; reutilizar `UsersService.deleteAccount`. |
| 15 | 🟡 | Auth | JWT em `Authorization` obriga o front a guardar o token em JS (hoje `sessionStorage`). | Ideal: cookie `HttpOnly; Secure; SameSite=Strict` + CSRF token + refresh token. |

## 2. Bugs de fluxo que quebram o front

| Problema | Efeito | Correção |
|----------|--------|----------|
| `register` não cria `CompanyProfile` / `CandidateProfile`. | Employer novo: `PATCH company-profile` → 404, uploads → 404, `VerifiedEmployerGuard` → 403 para sempre. Candidato novo: `PATCH candidates/profile` → 404. | Criar o perfil vazio na mesma transação do usuário (employer com `nome_fantasia` obrigatório no DTO de registro). |
| `POST /uploads/logo` e `/uploads/verification-document` não gravam a URL no perfil. | Logo não aparece; admin nunca sabe que o documento foi enviado. | Atualizar `logo_url` / `verification_document_url` (+ `verification_status = PENDING`) após salvar. |
| `GET /applications` não inclui a vaga. | O front faz N requisições `GET /jobs/:id`. | `include('job', j => j.select('id','title','employer_id').include(...company_profile))`. |

## 3. Endpoints que o front já chama e ainda NÃO existem

Enquanto não existirem, respondem 404 e a UI mostra um aviso "indisponível" — nada quebra.

| Método | Rota | Role | Resposta esperada | Usado em |
|---|---|---|---|---|
| GET | `/jobs/mine?page&limit&status` | EMPLOYER | `Paginated<Job>` (todos os status, sem soft-deleted) | Minhas vagas |
| GET | `/candidates/me` | JOB_SEEKER | `CandidateProfile` com `user{id,email}`, `experiences`, `educations` | Meu currículo |
| GET | `/users/company-profile` | EMPLOYER | `CompanyProfile` (sem `verification_document_url` público) | Perfil da empresa, banner de verificação |
| GET | `/chat/rooms` | JOB_SEEKER, EMPLOYER | `ChatRoomSummary[]` — `{id, job_id, candidate_id, employer_id, job_title, counterpart_name, last_message:{content,created_at,sender_id}\|null, unread_count}` | Lista de conversas |
| GET | `/chat/room/:roomId/messages` | participante | `ChatMessage[]` ordenado por `created_at` (paginar por cursor quando crescer) | Histórico do chat (`ChatService.getRoomMessages` já existe, falta o controller) |
| GET | `/admin/jobs?status&page&limit` | ADMIN | `Paginated<Job>` com `employer.company_profile.nome_fantasia` | Fila de moderação |
| GET | `/admin/companies?status&page&limit` | ADMIN | `Paginated<CompanyProfile & {user:{id,email}}>` | Fila de verificação |
| GET | `/admin/users?role&page&limit` | ADMIN | `Paginated<{id,email,role,created_at,deleted_at}>` | Usuários |

`Paginated<T> = { data: T[], meta: { total_items, total_pages, current_page, per_page } }` (mesmo formato de `GET /jobs`).
Observação: `GET /candidates` devolve `{data,total,page,limit,totalPages}` — formato diferente; o front trata os dois, mas vale padronizar.

## 4. Endpoints existentes consumidos

`POST /auth/login`, `POST /auth/register`, `GET /jobs`, `GET /jobs/:id`, `POST/PATCH/DELETE /jobs/:id`, `POST/GET /jobs/:jobId/applications`, `GET /applications`, `PATCH /applications/:id/status`, `DELETE /applications/:id`, `GET /candidates`, `PATCH /candidates/profile`, `GET /candidates/me/resume/pdf`, `PATCH /users/company-profile`, `DELETE /users/account`, `POST /uploads/logo`, `POST /uploads/verification-document`, `GET/POST /talent-pool`, `DELETE /talent-pool/:id`, `GET /analytics/admin`, `GET /analytics/employer`, `PATCH /admin/companies/:id/(approve|reject)`, `PATCH /admin/jobs/:id/(approve|reject)`, `PATCH|DELETE /admin/jobs/:id`, `PATCH /admin/users/:id/role`, `DELETE /admin/users/:id`, `GET /chat/unread-count`, `PATCH /chat/room/:roomId/read`, `GET /cep/:cep`, WS `joinRoom` / `sendMessage` / `newMessage`.
