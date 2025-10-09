export function retrieveRelevant(knowledge, query, limit = 6) {
  const haystack = [];

  (knowledge.faqs || []).forEach(f => {
    haystack.push({ type: "faq", text: `${f.q} ${f.a}`, data: f });
  });

  (knowledge.products || []).forEach(p => {
    haystack.push({
      type: "product",
      text: `${p.title} ${p.category} ${(p.use_cases || []).join(" ")} ${p.dosage_note || ""}`,
      data: p
    });
  });

  if (knowledge.policies) {
    const policiesText = JSON.stringify(knowledge.policies);
    haystack.push({ type: "policies", text: policiesText, data: knowledge.policies });
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = haystack.map(item => {
    const t = item.text.toLowerCase();
    const score = terms.reduce((acc, term) => acc + (t.includes(term) ? 1 : 0), 0);
    return { ...item, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}