# Contexto do projeto — leia antes de qualquer tarefa

## O que é isto

**GastroCuida** — PWA em pt-BR para pacientes com gastrite e refluxo (DRGE).
É o primeiro produto da visão **HealthRelat**: um hub de PWAs white-label por
especialidade médica, vendidos a médicos/clínicas (modelo B2B2C). O dono do
negócio é Daniel (não programador) — explique decisões técnicas em linguagem
simples e em português.

## Arquitetura (proposital e importante)

- **Vanilla HTML/CSS/JS, zero dependências, zero build.** Não introduzir
  frameworks, npm ou bundlers sem o Daniel pedir.
- **Local-first:** dados do paciente só no `localStorage` (chave em
  `BRAND.storageKey`, padrão `gastrocuida:v1`). Isso é argumento de venda
  (LGPD trivial) — não adicionar backend sem decisão explícita (é a "Fase 2").
- **Arquivos planos na raiz** (sem pastas css/js) porque o deploy é GitHub
  Pages e o upload inicial foi manual. Manter assim.
- **White-label via `config.js`:** cada médico cliente = uma cópia do app com
  só esse arquivo alterado (nome, CRM, clínica, WhatsApp, `storageKey`).
- **Service worker (`sw.js`): SEMPRE incrementar `CACHE` (v4 → v5…) ao alterar
  qualquer arquivo do app**, senão usuários existentes não recebem a atualização.
- Relógio sincronizado via worldtimeapi/timeapi com fallback ao relógio local;
  alarmes via Notification API + Web Audio (sem arquivos de som).
- Gráficos: SVG feito à mão seguindo especificação de dataviz (série azul
  #2a78d6 claro / #3987e5 escuro, linhas 2px, pontos com anel, grid hairline,
  rótulos seletivos, tooltip). Validar paleta se mudar cores.

## Mapa do repositório

| Caminho | O quê |
|---|---|
| `index.html`, `app.js`, `data.js`, `styles.css`, `config.js` | O app do paciente (genérico) |
| `data.js` | Conteúdo: ~163 alimentos (FOODS), 57 receitas (RECIPES), safra, dicas, sintomas |
| `medicos.html` | Landing page de venda para médicos |
| `demo/` | Demo de vendas: Dra. fictícia + 5 semanas de dados semeados (`demo/config.js`) |
| `painel/` | Prévia navegável do Painel do Médico (plano Profissional) — só design, sem backend |
| `img/` | Capturas usadas na landing |
| `VISAO.md` | Estratégia HealthRelat, roadmap e preços — ler para decisões de produto |

## Links em produção (GitHub Pages)

- App: https://danielgomes2025.github.io/Refluxo-app/
- Vendas: https://danielgomes2025.github.io/Refluxo-app/medicos.html
- Demo: https://danielgomes2025.github.io/Refluxo-app/demo/
- Painel (prévia): https://danielgomes2025.github.io/Refluxo-app/painel/

## Como testar (obrigatório antes de push)

```bash
node --check app.js data.js config.js          # sintaxe
python3 -m http.server 8080                     # servir
# dirigir com Playwright (chromium em /opt/pw-browsers), viewport 390x844,
# checar: zero pageerror, fluxos tocados de verdade, screenshot das telas novas
```

## Regras de conteúdo (saúde)

- App é **educativo/organizacional** — nunca prometer diagnóstico ou tratamento
  (evita classificação como software médico regulado). Manter avisos médicos.
- Cuidados fixos no conteúdo: hortelã piora refluxo; babosa/aloe vera ingerida
  exige alerta de segurança (Anvisa); espinheira-santa contraindicada para
  gestantes; IBP em jejum. Não remover esses avisos.
- Novo médico cliente: preencher `config.js` (ou criar repositório-cópia),
  nunca hardcodar dados do médico em outros arquivos.

## Fases do negócio (resumo; detalhes em VISAO.md)

1. **Essencial (no ar):** white-label + relatório por WhatsApp/PDF.
2. **Profissional (vendido por prévia):** login do paciente + banco
   multi-tenant (Supabase é o candidato) + painel real do médico. Exige
   consentimento LGPD (dados de saúde = sensíveis), termos e contrato
   médico-controlador/Daniel-operador.
3. **Premium:** assistente de IA respondendo só a partir do conteúdo do guia.
4. **HealthRelat:** replicar o motor para outras especialidades — o core
   (alarmes, diário, relatório, white-label) é comum; muda o pacote de
   conteúdo (`data.js`) e a marca.
