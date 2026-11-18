# Roteiro de demonstração — FisioSuite

**Duração sugerida:** 12–15 minutos  
**URL:** https://fisiosuite-app-production.up.railway.app  
**Login:** `admin@fisiosuite.demo` / `Admin@123`

Use o modo anônimo ou uma janela limpa. Faça login **antes** da reunião começar.

---

## Antes de começar (2 min, sozinho)

1. Abrir a URL e logar como admin.
2. Conferir: Dashboard, Agenda com sessões, Pacientes, Equipe, Pacotes.
3. Ter à mão o celular (só para falar de WhatsApp — hoje o lembrete cai no log do servidor; não prometa envio real ainda).
4. Frase de abertura:

> “A fisioterapia não é consulta avulsa: é série de sessões. O FisioSuite organiza agenda recorrente, pacotes com saldo, prontuário e repasse num só lugar — para a clínica não depender de planilha e WhatsApp solto.”

---

## Ato 1 — O problema (1 min)

Pergunte (ou confirme com a cliente):

- Quantas faltas por semana?
- Como controla “sessão 7 de 10”?
- Como fecha o repasse dos profissionais no fim do mês?

Transição:

> “Vou mostrar exatamente essas três dores resolvidas no sistema.”

---

## Ato 2 — Agenda + pacote (5 min) — o coração da demo

### 2.1 Agenda
1. Menu **Agenda**.
2. Mostre a semana com as sessões do João já cadastradas.
3. Destaque: série recorrente (não é marcar um por um).

### 2.2 Pacotes
1. Menu **Pacotes**.
2. Mostre o plano “Pacote 10 sessões” e o pacote vendido ao João.
3. Diga: “Cada presença baixa o saldo. Falta segue a regra da clínica.”

### 2.3 Baixa na presença (momento “uau”)
1. Volte à **Agenda**.
2. Pegue uma sessão futura/próxima do João.
3. Marque como **Concluída** (ou Complete / presença).
4. Volte em **Pacotes** → mostre o saldo (ex.: 1/10 usado).

Frase:

> “A recepção não precisa anotar no caderno. Agenda e financeiro do pacote falam entre si.”

### 2.4 Falta (opcional, se sobrar 1 min)
1. Em outra sessão, marque **Falta**.
2. Explique: avisada vs. não avisada; a clínica configura se desconta sessão.

---

## Ato 3 — Equipe e repasse (2 min)

1. Menu **Equipe** → mostre Paula (fisioterapeuta, comissão 40%).
2. “Novo membro” (não precisa salvar de novo): nome, e-mail, senha, papel, %.
3. Menu **Financeiro** → relatório de comissão (escolha Paula + período).

Frase:

> “A regra de falta/reposição evita pagar o profissional duas vezes sem querer — o erro clássico de clínica com pacote.”

---

## Ato 4 — Prontuário (2 min)

1. Menu **Prontuário**.
2. Selecione o paciente João.
3. Crie uma avaliação rápida: queixa + escala de dor + plano.
4. (Se der tempo) evolução SOAP ligada a uma sessão.

Frase:

> “Documentação clínica junto do atendimento — não é um Word à parte.”

---

## Ato 5 — Fechamento comercial (2–3 min)

### O que enfatizar
| Dor dela | O que viu |
|----------|-----------|
| Faltas / no-show | Confirmação (WhatsApp preparado; hoje stub) + status na agenda |
| Pacote bagunçado | Saldo automático na presença |
| Agenda recorrente | Série 2ª/4ª/6ª sem retrabalho |
| Repasse | % por profissional com regra clara |
| Tudo espalhado | Um sistema, um login |

### O que **não** prometer ainda
- NFS-e automática (roadmap)
- WhatsApp oficial com botão Confirmar/Remarcar em produção (porta pronta; integrar provedor)
- Convênio TISS completo
- App do paciente

### Perguntas de fechamento
1. “Se você usasse só agenda + pacote na próxima semana, o que mudaria na recepção?”
2. “Quantos profissionais atendem hoje / pretende ter em 6 meses?” (ajuda a precificar)
3. “Quer que eu deixe um usuário só para a clínica de vocês, separado deste ambiente de demo?”

### CTA sugerido
> “Posso liberar um piloto de 30 dias com a operação de vocês (pacientes e agenda reais). A gente mede faltas e tempo da recepção antes/depois.”

---

## Plano B (se algo falhar)

| Problema | Ação |
|----------|------|
| Site fora | Abrir painel Railway / explicar “estou subindo de novo” e mostrar prints/vídeo gravado |
| Login falha | Recarregar; senha `Admin@123`; criar conta nova em “Cadastrar clínica” se precisar |
| Sem sessões na agenda | Em Pacotes/Pacientes, refazer: paciente → pacote → Agenda → nova série |

---

## Checklist impresso (1 página)

- [ ] Login admin ok  
- [ ] Agenda com sessões do João  
- [ ] Marcar 1 presença → saldo do pacote muda  
- [ ] Equipe com Paula 40%  
- [ ] Prontuário: 1 avaliação  
- [ ] Perguntar piloto 30 dias  
- [ ] Anotar dúvidas dela para o pós-reunião  

---

## Pós-demo (você, depois)

1. Anotar dores que ela citou e que o produto ainda não cobre.
2. Se avançar piloto: criar clínica nova (Register) ou usuário dedicado — **não** misturar com a demo pública.
3. Trocar senhas da demo se a URL circular demais.
