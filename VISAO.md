# 🌐 HealthRelat — a visão

> Um hub de PWAs de acompanhamento de pacientes, white-label, um por
> especialidade médica. Começamos pela gastro (GastroCuida). Pensado grande,
> construído enxuto.

## A tese

Todo médico enfrenta o mesmo problema: **o tratamento acontece em casa, entre
as consultas, onde ele não enxerga nada**. E todo paciente enfrenta o espelho
disso: sai da consulta com orientações demais e apoio de menos. Um PWA com a
marca do médico resolve os dois lados — e PWA é a tecnologia certa: sem loja
de aplicativos, sem taxa da Apple/Google, instala pelo link, atualiza sozinho,
funciona offline e custa quase zero para replicar.

## O motor é um só (o segredo do império)

O que construímos no GastroCuida **não é um app de gastrite — é um motor**:

| Peça do motor | Reaproveitável? |
|---|---|
| Alarmes de refeição/medicação com relógio sincronizado | ✅ 100% |
| Diário de sintomas com intensidade + gráficos | ✅ muda só a lista de sintomas |
| Peso, metas e sequências (gamificação leve) | ✅ 100% |
| Relatório para a consulta (7/30/90 dias, PDF/WhatsApp) | ✅ 100% |
| White-label por `config.js` | ✅ 100% |
| Guia de alimentos/conteúdo + receitas | 🔁 é o "cartucho" que muda por especialidade |
| Landing de vendas + demo semeada + prévia do painel | ✅ muda texto e dados de exemplo |

**Lançar uma especialidade nova = escrever um novo `data.js` + marca.**
O custo marginal é conteúdo, não tecnologia.

## A linha de produtos (candidatas, em ordem de aderência ao motor)

1. **GastroCuida** (gastrite/refluxo) — no ar. Prova o modelo.
2. **GlicoCuida** (endocrino/diabetes) — diário de glicemia no lugar de sintomas,
   mesmas refeições/alarmes/relatório. Mercado gigante e médico já pede diário.
3. **PressoCuida** (cardio/hipertensão) — diário de pressão arterial + sal na
   dieta + medicação. Encaixe perfeito no motor.
4. **RenalCuida** (nefro) — dieta restrita (potássio/fósforo/sódio) + líquidos.
5. **ColoCuida** (intestino irritável/SII) — diário alimentar + sintomas; primo
   direto do GastroCuida (reaproveita 80% do conteúdo).
6. **NutriCuida** (nutricionistas, genérico) — o mesmo motor vendido à maior
   categoria compradora em volume.

Critério para escolher a próxima: doença **crônica**, manejada por
**comportamento diário** (dieta/medida/remédio), com consulta de **retorno
frequente**. É onde o relatório vale ouro.

## Estrutura do hub

- **Marca-mãe:** HealthRelat (site institucional simples listando os produtos,
  quando houver 2+ produtos — antes disso é distração).
- **Um repositório-template do motor**; cada especialidade é um repositório
  derivado; cada médico cliente é uma cópia com `config.js` próprio (Fase 1)
  ou um tenant no portal (Fase 2).
- **Fase 2 (portal):** UM sistema multi-tenant (candidato: Supabase — login,
  Postgres, isolamento por médico via RLS). NÃO criar um banco por médico.
  O painel já está desenhado em `painel/` — construir o backend embaixo do
  design aprovado.
- **LGPD na Fase 2:** dados de saúde são sensíveis (art. 11). Checklist:
  consentimento explícito no cadastro, termos de uso, política de privacidade,
  contrato definindo médico = controlador / HealthRelat = operador, criptografia,
  direito de exclusão. Fazer ANTES do primeiro paciente real logar.

## Modelo comercial (definido em 05/07/2026)

| Plano | Implantação | Mensal | Entrega |
|---|---|---|---|
| Essencial | R$ 1.497 | R$ 297 | App white-label + relatório WhatsApp/PDF |
| Profissional | R$ 2.497 | R$ 497–597 | + login, nuvem, painel do médico |
| Premium (futuro) | — | R$ 697+ | + assistente de IA (responde só pelo guia) |

- Anual = 12 pelo preço de 10. Clínicas: desconto a partir do 2º médico.
- Fundadores (3 primeiros): R$ 197/mês travado em troca de depoimento.
- Âncoras de venda: 1 consulta particular (R$ 300–600) paga o mês; software de
  agenda custa R$ 150–400/mês; o app fideliza e diferencia.

## Roteiro de venda (funciona hoje)

1. `medicos.html` — o pitch.
2. `demo/` — o app na mão do médico (paciente fictícia com 5 semanas de dados;
   ir em **Mais → Relatório** — é o momento da venda).
3. `painel/` — o upsell do plano Profissional.
4. Preço, fechamento, `config.js` preenchido no mesmo dia.

## Princípios (não negociáveis)

1. **Educativo, nunca diagnóstico** — mantém fora da regulação de software
   médico e protege médico e empresa.
2. **Local-first por padrão** — nuvem só com consentimento e propósito.
3. **Simplicidade técnica** — vanilla JS, zero dependências; a velocidade de
   replicação É o negócio.
4. **Conteúdo com fontes e avisos de segurança** (babosa, hortelã,
   espinheira-santa etc.) — credibilidade é o ativo.
5. **Vender antes de construir** — prévia navegável primeiro (como fizemos com
   o painel), backend depois do primeiro pagante.
