# ADR-0001 — Hospedagem do piloto: Vercel + Neon + Render (Railway como demo)

**Status:** Aceito (2026-11-22)

## Contexto

O FisioSuite nasceu com deploy monólito no Railway (Docker: Nest + SPA + Postgres) para demo rápida com clientes. O produto irmão **meu-copiloto** já opera em Vercel + Neon + Render na camada gratuita. Para padronizar operação e custo zero no piloto, o FisioSuite passa a ter a mesma stack — **sem derrubar** o demo Railway.

## Decisão

| Peça | Serviço | Papel |
|------|---------|--------|
| Frontend (`apps/web`) | **Vercel** | SPA Vite; `VITE_API_URL` → API Render |
| API (`apps/api`) | **Render** | Nest + Prisma; `migrate deploy` no start |
| Banco | **Neon** | Postgres serverless (`DATABASE_URL`) |
| Demo comercial | **Railway** | Continua no ar (Docker monólito + Postgres próprio) |

Dois ambientes, dois bancos: dados da demo Railway **não** misturam com o piloto Neon.

## Alternativas

- **Só Railway:** DX simples, mas custo por uso even idle e fora do padrão do copiloto.
- **Postgres free do Render:** descartado (expira ~90 dias) — mesmo motivo do ADR-0006 do copiloto.
- **API na Vercel serverless:** exigiria reescrever o Nest hexagonal — fora de escopo.

## Consequências

- Positiva: custo ~US$0 no free tier; mesmo mental model do meu-copiloto; demo Railway intacta.
- Negativa: cold start no Render free (~15 min idle) — mitigado por `.github/workflows/keep-alive.yml`.
- Quando houver cliente pagante de uso diário, considerar Render pago (~US$7) ou revisitar ADR.
