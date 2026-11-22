# FisioSuite

SaaS de gestão para clínicas de fisioterapia: agenda recorrente, pacotes de sessões, prontuário, financeiro e repasses.

## Stack

- **API:** NestJS + Hexagonal (`domain` / `api` / `infra`) + Prisma + PostgreSQL + JWT
- **Web:** React + Vite + TypeScript + Tailwind + React Query
- **Monorepo:** npm workspaces (`apps/api`, `apps/web`)

## Pré-requisitos

- Node.js 20+
- Docker (PostgreSQL)

## Subir o ambiente (local)

```bash
# 1. Banco (PostgreSQL na porta 5433 — evita conflito com outros containers locais)
npm run db:up

# 2. Dependências
npm install

# 3. Variáveis da API
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Migração + seed (clínica demo)
cd apps/api && npx prisma migrate dev && npm run seed && cd ../..

# 5. API (http://localhost:3001 — rotas em /api/*)
npm run dev:api

# 6. Web (http://localhost:5173)
npm run dev:web
```

### Login demo (seed)

- **E-mail:** `admin@fisiosuite.demo`
- **Senha:** `Admin@123`

### Painel admin da plataforma

- URL: `/platform/login`
- Credenciais via env: `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` (ver `apps/api/.env.example`)
- Local padrão: `platform@fisiosuite.admin` / `Platform@123`

## Hospedagem

Guia completo: [`docs/deploy.md`](docs/deploy.md). ADR do piloto: [`docs/adr/0001-hospedagem-piloto-vercel-neon-render.md`](docs/adr/0001-hospedagem-piloto-vercel-neon-render.md).

| Trilha | Stack | Uso |
|--------|--------|-----|
| **Demo** | Railway (Docker monólito) | Mostrar para clientes — já no ar |
| **Piloto** | Vercel (web) + Render (API) + Neon (DB) | Mesmo padrão do meu-copiloto |

Docker local/VPS:

```bash
docker compose -f docker-compose.prod.yml up -d --build
# http://localhost:8080
```


## O que o MVP resolve

| Dor | Capacidade |
|-----|------------|
| Faltas | Lembrete/confirmação via porta WhatsApp (stub + pronto para provedor) |
| Pacotes | Saldo, baixa na presença, política de faltas, alerta de renovação |
| Agenda | Série recorrente, salas, remarcação |
| Prontuário | Avaliação + evolução por sessão |
| Repasse | Motor de regras (falta / reposição) |

## Arquitetura da API

```
apps/api/src
  domain/     entidades, ports (input/output), usecases, failures, Result
  api/        controllers REST, DTOs, guards (driving adapters)
  infra/      Prisma, repos, security, WhatsApp stub (driven adapters)
  config/     composition root (modules Nest)
```
