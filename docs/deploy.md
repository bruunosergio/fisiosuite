# Colocar o FisioSuite online (demo para clientes)

## Ambiente atual (Railway)

- **URL:** https://fisiosuite-app-production.up.railway.app
- **Login admin clínica:** `admin@fisiosuite.demo` / `Admin@123`
- **Login fisio:** `paula@fisiosuite.demo` / `Fisio@123`
- **Painel plataforma:** https://fisiosuite-app-production.up.railway.app/platform/login
- Painel Railway: https://railway.com/project/b48c261d-f883-4a35-ac5c-ead1a729e21e

Redeploy após mudanças locais:

```bash
railway up --service fisiosuite-app --detach
```

---

Objetivo: uma URL pública onde a cliente entra, faz login e usa o sistema.

## Opção recomendada: Railway

1. Crie conta em https://railway.app (pode usar GitHub/Google).
2. No projeto local, com a CLI:

```bash
npm i -g @railway/cli
railway login
railway init
railway add --database postgres
railway up
```

3. Configure variáveis no painel Railway (serviço da app):

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | use a URL do Postgres Railway (referência `${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | string longa e aleatória |
| `JWT_EXPIRES_IN` | `12h` |
| `CORS_ORIGIN` | `*` |
| `PORT` | `3001` |
| `WHATSAPP_PROVIDER` | `stub` |
| `PLATFORM_ADMIN_EMAIL` | e-mail do admin da plataforma |
| `PLATFORM_ADMIN_PASSWORD` | senha forte (mín. 8) |
| `PLATFORM_ADMIN_NAME` | nome exibido no painel |

4. Gere domínio público: **Settings → Networking → Generate Domain**.

5. Login demo (após o seed automático no boot):

- `admin@fisiosuite.demo` / `Admin@123`

## Opção local com Docker (VPS / máquina com IP público)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Acesse `http://SEU_IP:8080`.

## Importante

- Não compartilhe a senha demo em canais públicos; troque após a demo.
- O seed só cria dados se o admin ainda não existir.
- Código no Cursor/Git ≠ app online: clientes precisam desta URL hospedada.
