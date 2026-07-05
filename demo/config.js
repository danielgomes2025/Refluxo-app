/* =========================================================
   GastroCuida — VERSÃO DEMONSTRAÇÃO para médicos
   Médica e paciente FICTÍCIOS, com 5 semanas de dados de
   exemplo para mostrar o app "vivido" nas visitas de venda.
   ========================================================= */
const BRAND = {
  appName: "GastroCuida",
  logoEmoji: "🌿",
  doctorName: "Dra. Ana Beltrão",
  crm: "CRM-SP 000000",
  specialty: "Gastroenterologia",
  clinic: "Clínica Exemplo (demonstração)",
  phone: "(11) 0000-0000",
  whatsapp: "",
  welcomeNote: "Este app faz parte do seu tratamento. Registre seus sintomas todos os dias e traga o relatório na próxima consulta.",
  storageKey: "gastrocuida:demo", // não mistura com os dados do app real
};

/* Semeia os dados de exemplo na primeira visita.
   A história: a paciente começou com crises frequentes e foi
   melhorando ao seguir a dieta — é isso que o relatório conta. */
(function seedDemo() {
  try {
    if (localStorage.getItem(BRAND.storageKey)) return;
    const pad = (n) => String(n).padStart(2, "0");
    const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const s = {
      settings: { name: "Maria (exemplo)", sleepTime: "22:30", goalWeight: 79, theme: null, notif: false, onboarded: true },
      meals: [
        { id: "m-cafe", name: "Café da manhã", time: "07:00", alarm: true, icon: "🌅" },
        { id: "m-lanche1", name: "Lanche da manhã", time: "10:00", alarm: true, icon: "🍎" },
        { id: "m-almoco", name: "Almoço", time: "12:30", alarm: true, icon: "🍽️" },
        { id: "m-lanche2", name: "Lanche da tarde", time: "15:30", alarm: true, icon: "🥪" },
        { id: "m-janta", name: "Jantar", time: "19:00", alarm: true, icon: "🌙" },
        { id: "m-ceia", name: "Ceia leve", time: "20:45", alarm: false, icon: "🍵" },
      ],
      meds: [{ id: "med-1", name: "Omeprazol 20 mg", dose: "em jejum, 30 min antes do café", times: ["06:30"], alarm: true }],
      days: {},
      weights: [],
      goals: [
        { id: "g-1", title: "30 dias sem café", checkins: {} },
        { id: "g-2", title: "Jantar 3h antes de dormir", checkins: {} },
      ],
      firedAlarms: {},
    };

    const cafes = ["cuscuz com ovo mexido", "mingau de aveia com maçã", "crepioca de queijo minas", "overnight oats de banana", "tapioca com ricota"];
    const almocos = ["frango grelhado com purê de inhame", "peixe assado com legumes", "bowl de arroz com frango e abobrinha", "escondidinho de aipim", "carne magra com mandioquinha"];
    const jantas = ["sopa de abóbora com gengibre", "canja de galinha", "omelete de forno com legumes", "creme de inhame com frango", "tilápia com purê de baroa"];

    const today = new Date();
    const N = 35;
    for (let i = N - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = key(d);
      const idx = N - 1 - i; // 0 = dia mais antigo
      const day = { meals: {}, symptoms: [], water: 5 + (idx % 4), notes: "", meds: {} };

      day.meals["m-cafe"] = { done: true, note: cafes[idx % cafes.length] };
      day.meals["m-almoco"] = { done: true, note: almocos[idx % almocos.length] };
      day.meals["m-janta"] = { done: idx % 6 !== 0, note: jantas[idx % jantas.length] };

      // sintomas melhorando com o tempo (a curva que o médico quer ver)
      if (idx < 12) {
        if (idx % 2 === 0) day.symptoms.push({ type: "azia", t: "14:00", intensity: idx === 7 ? 3 : 2 });
        if (idx === 7) {
          day.symptoms.push({ type: "refluxo", t: "23:15", intensity: 3 });
          day.meals["m-janta"] = { done: true, note: "pizza, refrigerante e chocolate (festa)" };
        }
        if (idx % 5 === 0) day.symptoms.push({ type: "estufado", t: "20:30", intensity: 2 });
      } else if (idx < 24) {
        if (idx % 4 === 0) day.symptoms.push({ type: "azia", t: "15:00", intensity: 2 });
      } else if (idx % 9 === 0) {
        day.symptoms.push({ type: "azia", t: "16:00", intensity: 1 });
      }

      if (idx % 7 !== 3) day.meds["med-1"] = { "06:30": true };
      if (idx >= N - 16) s.goals[0].checkins[k] = true;   // 16 dias sem café
      if (idx >= N - 9) s.goals[1].checkins[k] = true;    // 9 dias jantando cedo
      if (idx % 5 === 0) s.weights.push({ date: k, kg: Math.round((86.4 - idx * 0.09) * 10) / 10 });

      s.days[k] = day;
    }
    localStorage.setItem(BRAND.storageKey, JSON.stringify(s));
  } catch { /* demo é melhor esforço */ }
})();
