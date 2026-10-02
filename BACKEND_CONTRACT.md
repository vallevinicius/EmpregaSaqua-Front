# Contrato Front ↔ Back — EmpregaSaqua

Referência: `EmpregaSaqua-Back@6e75ca5` **mais as alterações locais listadas em "Corrigido nesta rodada" (ainda não commitadas no back)**. Este arquivo lista **o que o front já consome**, **o que ele espera e ainda não existe** e **as falhas do back que o front só consegue mitigar, não corrigir**. Ordem: da mais crítica para a menos crítica.

---

## 0. Corrigido nesta rodada (aguardando commit no back)

- **Cadastro cria o perfil.** `UsersService#create` agora cria `CompanyProfile` (EMPLOYER) ou `CandidateProfile` (JOB_SEEKER) na mesma transação do usuário. `CreateUserDto` ganhou `nome_fantasia` (obrigatório p/ empresa), `cnpj`, `endereco`, `telefone`, `full_name` (obrigatório p/ candidato), `address`, `bio`. Migração: `20260924T1747_add_registration_fields` (`candidateProfile.full_name`, `companyProfile.telefone`).
- **`role: ADMIN` recusado no cadastro** (`@IsIn([JOB_SEEKER, EMPLOYER])`). Era a falha #1 abaixo.
- **`GET /candidates/me` e `GET /users/company-profile`** agora existem.
- **`PATCH /users/company-profile`** aceita `cnpj` (14 dígitos) e `telefone`; `PATCH /candidates/profile` aceita `full_name`. O PDF do currículo usa `full_name` (com fallback pro prefixo do e-mail).
- Anonimização de conta (LGPD) também limpa `full_name` e o `telefone` da empresa.
- `db.ts` imprimia a `DATABASE_URL` completa (com senha) no console a cada boot: removido.
- Faltava no Git o snapshot `migrations/snapshots/9fc1c0d0…` (referenciado pela migração `audit_log_schema_update`), o que impedia `migration plan`. Reconstruído.

- **Contas antigas sem perfil:** `GET`/`PATCH` de perfil (candidato e empresa) agora criam a linha vazia sob demanda.
- **Segurança:** `GET /jobs/:id` não devolve mais `password_hash` nem o gabarito (`expected_answer`); vaga em análise/removida só aparece para o dono e o admin (guard opcional `OptionalJwtAuthGuard`); candidaturas e banco de talentos não vazam mais `password_hash`; `JWT_SECRET` é obrigatório (mín. 32 caracteres, o back não sobe sem); candidatura só em vaga ACTIVE, não expirada, e exige resposta a todas as perguntas; editar vaga ACTIVE volta para PENDING; admin não altera/remove a si mesmo.
- **Endpoints novos:** `GET /jobs/mine`, `GET /admin/jobs|companies|users`, `GET /chat/rooms`, `GET /chat/room/:roomId/messages`. Não há mais endpoints pendentes.

**Também em aberto:** a cadeia de migrações commitada não reproduz o schema atual num banco vazio (`db migrate` falha em `MIGRATION.RUNNER_FAILED` com 57 divergências: faltam `applicationAnswer`, `auditLog`, `jobQuestion`, `savedCandidate`, colunas de `job`/`application`). Localmente foi contornado com `db update`; em CI/produção vai quebrar.

---

## 1. Falhas de segurança no back (corrigir antes de produção)

| # | Sev. | Onde | Problema | Correção |
|---|------|------|----------|----------|
| 1 | ✅ | `users/dtos/create-user.dto.ts` | ~~`POST /auth/register` aceita `role: "ADMIN"`~~ **Corrigido** (ver seção 0). | — |
| 2 | ✅ | `jobs/repositories/prisma-jobs.repository.ts#findById` | `include('employer', e => e.include('company_profile'))` devolve o **User completo, com `password_hash`**, no endpoint público `GET /jobs/:id`. | `e.select('id').include('company_profile', cp => cp.select('nome_fantasia','logo_url','verification_status'))`. |
| 3 | ✅ | `findById` e `findAllPublic` | `questions` devolve `expected_answer` (gabarito do knockout) publicamente. | `q.select('id','question_text')` nas rotas públicas. |
| 4 | ✅ | `applications/repositories/...#findByJob`, `talent-pool/...#findByEmployer` | `include('applicant' / 'candidate')` sem `select` → `password_hash` do candidato vai para a empresa. | `u.select('id','email').include('candidate_profile')`. |
| 5 | 🔴 | `app.module.ts` (ServeStatic `/uploads`) | Documentos de CNPJ/contrato social ficam **públicos** em `/uploads/DocumentosEmpresas/*`. | Salvar fora de `uploads/` servido e expor `GET /admin/companies/:id/verification-document` (ADMIN, stream). O `deploy/nginx.conf` bloqueia o path como paliativo. |
| 6 | ✅ | `auth.module.ts`, `jwt.strategy.ts` | Fallback `JWT_SECRET \|\| 'secretKey'` — sem env, tokens são forjáveis. | Falhar no boot se `JWT_SECRET` ausente/curto (`ConfigModule` com `validationSchema`). |
| 7 | ✅ | `applications.service.ts#applyForJob` | Knockout só é avaliado se `answers` vier no body: omitir `answers` pula a triagem. Também aceita candidatura em vaga `PENDING`. | Se a vaga tem perguntas, exigir resposta para todas; aceitar só `ACTIVE` e não expirada. |
| 8 | ✅ | `jobs.controller.ts#findOne` | `GET /jobs/:id` público devolve vagas `PENDING/REJECTED` e soft-deletadas. O front esconde, mas o dado vaza. | Público: só `ACTIVE && deleted_at IS NULL`; dono/admin via rota autenticada. |
| 9 | ✅ | `jobs.service.ts#updateEmployerJob` | Employer edita vaga `ACTIVE` sem voltar para `PENDING` → burla a moderação. | Ao editar campos de conteúdo, `status = PENDING`. |
| 10 | 🟠 | `main.ts`, `chat.gateway.ts` | CORS `'*'` com `credentials: true` em dev; gateway WS `origin: '*'` sempre. | Allowlist por env (`CORS_ORIGINS`). Em prod o front roda same-origin (ver `deploy/nginx.conf`). |
| 11 | 🟠 | `chat.gateway.ts` | Mensagens de erro internas (`error.message`) vão para o cliente via `WsException`. Sem validação de DTO no payload (`roomId`, `content` sem limite de tamanho). | `ValidationPipe` no gateway, `content` com `MaxLength(2000)`, erro genérico ao cliente. |
| 12 | 🟡 | `candidates/dtos/update-candidate-profile.dto.ts` | `@Sanitize()` em `skills` (array) não sanitiza nada (só trata `string`); nenhum campo tem `MaxLength`. `create-application.dto.ts#cover_letter` também sem limite. | Sanitizar cada item; adicionar `MaxLength`/`ArrayMaxSize` (o front já aplica: bio 2000, skills 30×50, cover 3000). |
| 13 | 🟡 | `create-user.dto.ts` | Senha mínima 6. Front exige 8 + letra + número; back deveria exigir o mesmo e `MaxLength(72)` (limite do bcrypt). | — |
| 14 | 🟡 (parcial: auto-remoção bloqueada; hard delete continua) | `admin.service.ts` | Admin pode remover/rebaixar a si mesmo (front bloqueia, back não). `deleteUser` faz hard delete direto, sem confirmação por e-mail (diferente do fluxo de auto-exclusão do usuário, que agora é hard delete com confirmação — ver seção 3). | Bloquear `id === req.user.id`. |
| 15 | 🟡 | Auth | JWT em `Authorization` obriga o front a guardar o token em JS (hoje `sessionStorage`). | Ideal: cookie `HttpOnly; Secure; SameSite=Strict` + CSRF token + refresh token. |

## 2. Bugs de fluxo que quebram o front

| Problema | Efeito | Correção |
|----------|--------|----------|
| `POST /uploads/logo` e `/uploads/verification-document` não gravam a URL no perfil. | Logo não aparece; admin nunca sabe que o documento foi enviado. | Atualizar `logo_url` / `verification_document_url` (+ `verification_status = PENDING`) após salvar. |
| `GET /applications` não inclui a vaga. | O front faz N requisições `GET /jobs/:id`. | `include('job', j => j.select('id','title','employer_id').include(...company_profile))`. |

## 3. Endpoints que o front já chama e ainda NÃO existem

Nenhum. (`@pending` em `endpoints.ts` só volta a ser usado quando surgir um novo.)

### Novo no back, ainda não consumido pelo front: alertas de vaga

`POST /job-alerts` (role `JOB_SEEKER`) — cria um alerta. Body: `{ keyword?, address?, work_model?, contract_type?, is_pcd? }` (todos opcionais, combinam em E; alerta sem nenhum critério nunca casa com nada).
`GET /job-alerts/mine` (role `JOB_SEEKER`) — lista os alertas da pessoa logada.
`DELETE /job-alerts/:id` (role `JOB_SEEKER`, dono do alerta) — remove um alerta.

Disparo: ao aprovar uma vaga (`PATCH /admin/jobs/:id/approve`), o back varre os alertas existentes, casa por keyword (no título)/address/work_model/contract_type/is_pcd e manda e-mail (SMTP, best-effort — falha de e-mail não derruba a aprovação) para cada candidato que casar.

### Novo no back: exclusão de conta com confirmação por e-mail (substitui `DELETE /users/account`)

`DELETE /users/account` **foi removido**. O fluxo agora é em duas etapas — a pessoa nunca exclui a conta com um clique só:

`POST /users/account/request-deletion` (autenticado, role `EMPLOYER` ou `JOB_SEEKER`) — gera um token, salva em `User.deletion_token`/`deletion_token_expires_at` (expira em 1h) e manda um e-mail com o link `{FRONTEND_URL}/excluir-conta/confirmar?token=...`. Não exclui nada ainda.
`POST /users/account/confirm-deletion` (**público**, sem `JwtAuthGuard` — quem clica no link do e-mail pode não ter sessão válida no navegador) — body `{ token }`. Valida o token e a expiração; se ok, **apaga a linha do `User` de verdade** (hard delete). Todo o resto (vagas, candidaturas, perfil, mensagens, salas de chat, banco de talentos, alertas de vaga) some junto por `onDelete: Cascade` no schema — não é mais anonimização (`anon_*@deleted.local`), é exclusão completa e definitiva.

### Novo no back: os 3 templates de e-mail que já existiam em `src/mail/templates/email/` agora são disparados

Nenhum endpoint novo — são e-mails automáticos ligados a ações que o front já chama:

- **`boas-vindas`** — disparado em `AuthService#register` (`POST /auth/register`), best-effort, para candidato e empresa (texto/CTA mudam pelo `role`).
- **`empresa-aprovada`** / **`empresa-reprovada`** — disparados em `AdminService#approveCompany`/`rejectCompany` (`PATCH /admin/companies/:id/approve|reject`). `reject` agora aceita body opcional `{ reason?: string }` (até 500 chars, sanitizado) que vira o motivo no e-mail; sem `reason`, o e-mail sai sem motivo.
- **`status-candidatura`** — disparado em `ApplicationsService#updateApplicationStatus` (`PATCH /applications/:id/status`) toda vez que a empresa muda o status (em análise/entrevista/contratado/não selecionado).

Todos são best-effort (nunca derrubam a ação que dispara) e reaproveitam `MailService#renderTemplate` (mesmo padrão de `nova-vaga`, com escape automático de HTML).

### Novo no back: área da vaga/candidato, foto de perfil, idiomas, chat direto (banco de talentos)

- **`JobArea`** (enum novo: `ADMINISTRACAO`, `TI`, `SAUDE`, `EDUCACAO`, `COMERCIO_VENDAS`, `ALIMENTACAO`, `CONSTRUCAO`, `LIMPEZA_SERVICOS_GERAIS`, `LOGISTICA_TRANSPORTE`, `TURISMO_HOTELARIA`, `OUTROS`). `Job.area` e `CandidateProfile.area` são **opcionais** — um valor `null` em qualquer um dos dois lados significa "sem restrição".
- **Bloqueio por área**: `POST /jobs/:jobId/applications` agora retorna **403** com `"Essa vaga é de uma área diferente da área de atuação do seu perfil."` quando `job.area` e `candidate.area` estão **ambos** preenchidos e são diferentes. `CreateJobDto`/`UpdateJobDto` ganharam `area?: JobArea`; `UpdateCandidateProfileDto` também.
- **Foto de perfil**: `POST /uploads/avatar` (role `JOB_SEEKER`, mesmo padrão de `/uploads/logo` — JPEG/PNG/WebP/GIF até 2MB, convertida pra WebP) já salva a URL em `CandidateProfile.avatar_url` (diferente de `/uploads/logo`, que só devolve a URL e deixa o front gravar à parte — ver item #1 da tabela de problemas).
- **Idiomas**: `CandidateProfile.languages: string[]` (igual a `skills`, lista de texto livre tipo `"Inglês - Avançado"`). `UpdateCandidateProfileDto.languages?: string[]`.
- **Chat direto (banco de talentos)**: `ChatRoom.job_id` agora é **opcional** — sem vaga associada, é uma conversa direta entre empresa e candidato (tipo mensagem de LinkedIn), sem precisar de candidatura. No gateway, `joinRoom` aceita o payload sem `jobId`; o front chama isso a partir de "Buscar talentos"/"Banco de talentos". `GET /chat/rooms` devolve `job_id: null` e `job_title: "Conversa direta"` para essas salas.

O front precisa de uma rota `/excluir-conta/confirmar` que lê `?token=` da URL e chama `confirm-deletion`.

`Paginated<T> = { data: T[], meta: { total_items, total_pages, current_page, per_page } }` (mesmo formato de `GET /jobs`).
Observação: `GET /candidates` devolve `{data,total,page,limit,totalPages}` — formato diferente; o front trata os dois, mas vale padronizar.

## 4. Endpoints existentes consumidos

`POST /auth/login`, `POST /auth/register`, `GET /jobs`, `GET /jobs/:id`, `POST/PATCH/DELETE /jobs/:id`, `POST/GET /jobs/:jobId/applications`, `GET /applications`, `PATCH /applications/:id/status`, `DELETE /applications/:id`, `GET /candidates`, `GET /candidates/me`, `PATCH /candidates/profile`, `GET /candidates/me/resume/pdf`, `GET /users/company-profile`, `PATCH /users/company-profile`, `POST /users/account/request-deletion`, `POST /users/account/confirm-deletion`, `POST /uploads/logo`, `POST /uploads/verification-document`, `GET/POST /talent-pool`, `DELETE /talent-pool/:id`, `GET /analytics/admin`, `GET /analytics/employer`, `PATCH /admin/companies/:id/(approve|reject)`, `PATCH /admin/jobs/:id/(approve|reject)`, `PATCH|DELETE /admin/jobs/:id`, `PATCH /admin/users/:id/role`, `DELETE /admin/users/:id`, `GET /chat/unread-count`, `PATCH /chat/room/:roomId/read`, `GET /cep/:cep`, WS `joinRoom` / `sendMessage` / `newMessage`.
