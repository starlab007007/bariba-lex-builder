import { useEffect } from 'react';
import DunyaVoiceWeb from '@/components/dunya/DunyaVoiceWeb';
import { useSideMenu } from './FitilaApp';
import apprendreData from '@/data/apprendre_v2.json';
import scenesData from '@/data/scenes_v2.json';
import dictionaryData from '@/assets/bariba_dictionary.json';
import { audit, ensureDunyaFoundation } from '@/lib/dunya/localStore';

function normalize(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ɔɛãĩũõñœ\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectText(value: unknown, path = '', out: { text: string; title: string; ref?: string }[] = []) {
  if (!value) return out;
  if (typeof value === 'string') {
    if (value.trim().length >= 12) out.push({ text: value.trim(), title: path || 'Ressource FITILA' });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectText(v, `${path} #${i + 1}`, out));
    return out;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const title = String(o.title_fr || o.title || o.name || o.word || o.ba || o.fr || path || 'Ressource FITILA');
    const ref = typeof o.ref === 'string' ? o.ref : typeof o.src === 'string' ? o.src : undefined;
    for (const [k, v] of Object.entries(o)) {
      if (['id', 'icon', 'version', 'order'].includes(k)) continue;
      collectText(v, title, out);
    }
  }
  return out;
}

const LOCAL_KNOWLEDGE = [
  ...collectText(dictionaryData, 'DUNYA Dictionnaire'),
  ...collectText(apprendreData, 'DUNYA Apprendre'),
  ...collectText(scenesData, 'DUNYA Apprendre · Scènes'),
];

function localAnswer(query: string) {
  const q = normalize(query);
  const terms = q.split(' ').filter((x) => x.length > 2);
  const ranked = LOCAL_KNOWLEDGE
    .map((item) => {
      const text = normalize(item.text);
      let score = 0;
      if (q && text.includes(q)) score += 12;
      for (const term of terms) if (text.includes(term)) score += 2;
      return { ...item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!ranked.length) {
    return {
      content:
        "Je n’ai pas trouvé de source locale suffisamment pertinente dans les ressources FITILA embarquées. DUNYA reste hors ligne et préfère ne pas inventer une réponse sans source.",
      sources: [] as { title: string; ref?: string; text?: string }[],
    };
  }

  const lead = ranked[0];
  const excerpt = lead.text.length > 520 ? `${lead.text.slice(0, 520)}…` : lead.text;
  return {
    content: `Voici ce que je trouve dans les ressources locales FITILA :\n\n${excerpt}`,
    sources: ranked.map(({ title, ref, text }) => ({ title, ref, text })),
  };
}

export default function FitilaDunyaIA() {
  const { open } = useSideMenu();

  useEffect(() => {
    void ensureDunyaFoundation()
      .then(() => audit('dunya_opened', { surface: 'web', voice: true }))
      .catch(() => undefined);
  }, []);

  return <DunyaVoiceWeb onOpenMenu={open} offlineAnswer={(q) => localAnswer(q).content} />;
}
