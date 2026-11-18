# Arquitetura FisioSuite

Hexagonal (ports & adapters), no mesmo padrão do Meu Copiloto / INBORDAL.

## Camadas (`apps/api`)

| Pasta | Responsabilidade |
|-------|------------------|
| `domain/` | Entidades, `Result`/`Failure`, ports input/output, use cases puros (sem Nest decorators) |
| `api/` | Controllers REST, DTOs, JWT guard (driving adapters) |
| `infra/` | Prisma repos, bcrypt/JWT, WhatsApp stub (driven adapters) |
| `config/modules/` | Composition root — `useFactory` instancia use cases |

## Multi-tenant

Todo dado de negócio carrega `clinicId`. O JWT inclui `clinicId` e os use cases sempre filtram por ele.

## Regras de negócio críticas

- **Pacote:** presença ou falta (conforme política da clínica) debita saldo uma única vez (`packageDebited`).
- **Agenda:** série recorrente por dias da semana; conflito de profissional/sala bloqueia criação.
- **Repasse:** % do profissional × preço implícito da sessão (`priceCents / totalSessions`), respeitando flags `commissionOnNoShow` / `commissionOnMakeup`.
- **WhatsApp:** porta `WhatsAppGateway` — stub em log; trocar implementação sem tocar no domínio.

## Web (`apps/web`)

React + Vite + Tailwind + React Query. Consome a API via axios com Bearer token.
