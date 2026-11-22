# Colocar o FisioSuite online

Há **duas trilhas** de hospedagem. Escolha conforme o objetivo.

---

## 1) Demo comercial — Railway (monólito)

URL única (API + front no mesmo domínio). Ideal para mostrar o produto rápido.

- **URL:** https://fisiosuite-app-production.up.railway.app
- **Login admin clínica:** `admin@fisiosuite.demo` / `Admin@123`
- **Login fisio:** `paula@fisiosuite.demo` / `Fisio@123`
- **Painel plataforma:** https://fisiosuite-app-production.up.railway.app/platform/login
- Painel Railway: https://railway.com/project/b48c261d-f883-4a35-ac5c-ead1a729e21e

Redeploy:

```bash
railway up --service fisiosuite-app --detach
```

Variáveis no serviço Railway:

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Postgres Railway (`${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | string longa |
| `JWT_EXPIRES_IN` | `12h` |
| `CORS_ORIGIN` | `*` |
| `PORT` | `3001` |
| `WHATSAPP_PROVIDER` | `stub` |
| `PLATFORM_ADMIN_EMAIL` / `PASSWORD` / `NAME` | admin da plataforma |

Build Docker define `VITE_API_URL=/api` (mesmo domínio).

---

## 2) Piloto padronizado — Vercel + Neon + Render

Mesma stack do **meu-copiloto**. Banco **separado** do Railway.

Ver ADR: [`docs/adr/0001-hospedagem-piloto-vercel-neon-render.md`](adr/0001-hospedagem-piloto-vercel-neon-render.md).

### 2.1 Neon (Postgres)

1. Crie projeto em https://console.neon.tech
2. Copie a connection string (`DATABASE_URL`, preferir pooled + `?sslmode=require`)
3. (Opcional local) migrate/seed apontando para Neon:

```bash
cd apps/api
# DATABASE_URL=postgresql://...@....neon.tech/neondb?sslmode=require
npx prisma migrate deploy
npm run seed
```

### 2.2 Render (API Nest)

Blueprint: [`render.yaml`](../render.yaml) na raiz **ou** Web Service manual:

| Campo | Valor |
|-------|--------|
| Repo | `bruunosergio/fisiosuite` |
| Root Directory | *(vazio — raiz do monorepo)* |
| Build | `npm ci && npm run prisma:generate -w @fisiosuite/api && npm run build -w @fisiosuite/api` |
| Start | `cd apps/api && npx prisma migrate deploy && node dist/main.js` |
| Health | `/api/health` |

Env vars:

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | string Neon |
| `JWT_SECRET` | string longa |
| `JWT_EXPIRES_IN` | `12h` |
| `CORS_ORIGIN` | URL da Vercel (ex. `https://fisiosuite-web.vercel.app`) |
| `PORT` | `3001` |
| `WHATSAPP_PROVIDER` | `stub` |
| `PLATFORM_ADMIN_*` | igual ao Railway / `.env.example` |

### 2.3 Vercel (SPA)

1. Importar o mesmo repo no Vercel
2. **Root Directory:** `apps/web`
3. Build: `npm run build` (ou default Vite)
4. Output: `dist`
5. Env: `VITE_API_URL=https://SEU-SERVICO.onrender.com/api`
6. `vercel.json` já faz rewrite SPA

Após o primeiro deploy, atualize `CORS_ORIGIN` no Render com a URL real da Vercel e faça redeploy da API.

### 2.4 Keep-alive

Workflow [`.github/workflows/keep-alive.yml`](../.github/workflows/keep-alive.yml) pinga `/api/health`.

Configure o secret do repo: `RENDER_API_URL` = `https://seu-servico.onrender.com`

### 2.5 Logins (após seed no Neon)

- Clínica: `admin@fisiosuite.demo` / `Admin@123`
- Plataforma: `/platform/login` + `PLATFORM_ADMIN_*`

---

## Docker local / VPS

```bash
docker compose -f docker-compose.prod.yml up -d --build
# http://localhost:8080
```

## Importante

- Não compartilhe senhas demo em canais públicos.
- Código no Git ≠ app online: clientes precisam da URL hospedada.
- Railway (demo) e Neon (piloto) são bancos **independentes**.
