# 🌿 GastroCuida — App de dieta para gastrite & refluxo

Aplicativo web (PWA) em português para quem foi diagnosticado com **gastrite** e/ou
**refluxo (DRGE)** e ficou perdido na hora de comer. Ele organiza a parte mais
difícil e mais importante da recuperação: **a alimentação e a rotina**.

Funciona no celular e no computador, direto no navegador, **offline** e com todos
os dados guardados apenas no seu aparelho.

## ✨ O que o app faz

| Área | O que você encontra |
|---|---|
| 🥗 **Guia de alimentos** | Mais de 150 itens classificados em **Pode ✅ / Moderação ⚠️ / Evitar 🚫 / Cautela ❗** com explicação de preparo: carnes e peixes, ovo de várias formas (cozido, pochê, mexido, omelete, crepioca), frutas, verduras, **raízes (aipim, inhame, cará, batata-doce, mandioquinha)**, grãos (cuscuz, aveia, tapioca), laticínios, bebidas, temperos e doces. Com busca e filtros. |
| 🍵 **Chás & ervas** | Espinheira-santa (com preparo correto e contraindicações), camomila, erva-doce, melissa, boldo, gengibre — e um alerta de segurança importante sobre **babosa/aloe vera**. Explica também por que **hortelã piora** o refluxo. |
| 🍳 **57 receitas leves e modernas** | Café da manhã, almoço, jantar e lanches, com busca por nome e ingrediente: crepioca, cuscuz com ovo cremoso, overnight oats, congee de crise, frango na airfryer, peixe no vapor com gengibre, macarrão ao molho de abóbora ("fake tomate"), strogonoff leve, canjiquinha, caldo verde sem linguiça, homus suave, chips de batata-doce… com tempo, porções, passo a passo e dicas. |
| ⏰ **Horários & alarmes** | Refeições a cada ~3h com **alarme sonoro + notificação + vibração**. Relógio **sincronizado com o horário oficial pela internet** (com fallback para o relógio do aparelho). Aviso automático se o jantar estiver a menos de 3h do horário de dormir. |
| 💊 **Lembrete de remédios** | Cadastre nome, observação (ex.: "em jejum, 30 min antes do café") e horários — o app avisa e você marca como tomado. |
| 📔 **Diário** | Tabela diária: refeições feitas + o que comeu, sintomas (azia, refluxo, dor, náusea, estufamento, garganta) com hora e intensidade, copos de água e anotações. Gráfico dos sintomas dos últimos 7 dias para **descobrir seus gatilhos**. |
| ⚖️ **Peso & metas** | Registro de peso com gráfico de evolução, meta de peso, e **desafios com sequência** (🔥 "30 dias sem café", "jantar 3h antes de dormir"…). |
| 💡 **Dicas** | 15 orientações práticas: elevar a cabeceira, dormir do lado esquerdo, mastigação, roupas, estresse, sinais de alerta… |
| 🧺 **Produtos da estação** | Frutas e legumes da safra de cada mês (calendário aproximado, base CEAGESP). |
| 🌗 **Extra** | Tema claro/escuro, exportar/importar dados (JSON), instalável na tela inicial (PWA), 100% offline. |

## 🩺 Para médicos (white-label)

O app pode ser personalizado com a marca de um médico ou clínica editando apenas o
arquivo `config.js` (nome, CRM, especialidade, WhatsApp, mensagem de boas-vindas).

- **Página de apresentação para médicos:** [`medicos.html`](https://danielgomes2025.github.io/Refluxo-app/medicos.html)
- **Demonstração com médica fictícia e 5 semanas de dados:** [`demo/`](https://danielgomes2025.github.io/Refluxo-app/demo/)
- **Relatório para a consulta:** o paciente gera um resumo de 7/30/90 dias
  (sintomas, gatilhos, peso, adesão à medicação) e leva impresso, em PDF ou
  envia por WhatsApp.

## 🚀 Como usar

### Opção 1 — GitHub Pages (recomendado)
1. No repositório: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
2. Acesse **<https://danielgomes2025.github.io/Refluxo-app/>** no celular.
3. No navegador, toque em **⋮ → Adicionar à tela inicial** para instalar como app.

### Opção 2 — Local
```bash
# qualquer servidor estático serve; por exemplo:
python3 -m http.server 8000
# e abra http://localhost:8000
```

> Os alarmes tocam com o app aberto (ou instalado e em segundo plano, conforme o
> aparelho). Para nunca perder um horário, instale o app na tela inicial e
> permita notificações quando o app pedir.

## 🛠️ Tecnologia

- HTML + CSS + JavaScript puros — **zero dependências**.
- PWA: `manifest.webmanifest` + service worker com cache offline.
- Dados no `localStorage` do navegador (nada sai do aparelho).
- Som de alarme gerado por Web Audio API (sem arquivos de áudio).
- Sincronização de horário: worldtimeapi.org → timeapi.io → relógio local.

## ⚠️ Aviso importante

Este aplicativo tem caráter **educativo e organizacional**. Ele **não substitui**
consulta com médico gastroenterologista nem com nutricionista. Não inicie, troque
ou interrompa medicamentos ou fitoterápicos (incluindo espinheira-santa e babosa)
por conta própria. Em caso de dor intensa, vômito persistente, sangramento,
dificuldade para engolir ou perda de peso sem explicação, procure atendimento
médico imediatamente.
