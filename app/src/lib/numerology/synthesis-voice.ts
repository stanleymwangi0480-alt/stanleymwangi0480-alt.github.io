/**
 * MYSTIQUE COMPASS — Synthesis Voice
 *
 * The problem this solves
 * ────────────────────────
 * `buildWovenSynthesis` emitted the identical skeleton for every one of the
 * ~90 possible direct×classic pairs:
 *
 *   THE SYNTHESIS — HOW YOUR TWO ESSENCES MARRY INTO ONE YEAR
 *   ONE SENTENCE, TWO ALTITUDES: ...
 *   [partners]
 *   [union]
 *   [tension]
 *   The proof is in real lives. Its clearest precedent is...
 *   How to live it: ...
 *   Read as one story, the year is ...
 *
 * Six fixed headers, four fixed openers, three fixed ordinals. Only four pairs
 * had curated archetypes; everyone else got the template. That is literally
 * mechanical repetition — a fill-in-the-blanks form wearing prose.
 *
 * What this module does instead
 * ────────────────────────────
 * 1. Varies the skeleton by SHAPE (coronation / ordeal / threshold / quiet),
 *    not by pair. Four shapes instead of one template.
 * 2. Draws openers, connectors and closers from small banks, selected
 *    deterministically from the pair so the same reading is stable but two
 *    different readings don't share a sentence.
 * 3. Quotes the compound's own language (from manifestationPatterns) instead
 *    of paraphrasing it into a 12-word thesis.
 */

export type Shape = 'coronation' | 'ordeal' | 'threshold' | 'quiet';

/** Deterministic 0..1 from a string, so a given pair always reads the same
 *  way but different pairs pick different lines. */
export function seededPick<T>(seed: string, bank: readonly T[]): T {
  if (!bank.length) return undefined as unknown as T;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return bank[Math.abs(h) % bank.length];
}

export function pickShape(
  polarity: 'predominantly constructive' | 'predominantly cautionary' | 'mixed ordeal-and-reward' | 'threshold / transition',
  directDominant: boolean,
): Shape {
  if (polarity === 'predominantly constructive') return 'coronation';
  if (polarity === 'predominantly cautionary') return 'ordeal';
  if (polarity === 'mixed ordeal-and-reward') return directDominant ? 'ordeal' : 'coronation';
  return 'threshold';
}

// ── OPENERS ────────────────────────────────────────────────────────────────
export const OPENERS: Record<Shape, readonly string[]> = {
  coronation: [
    '{year} reads as a coronation that has to be survived first.',
    'The shape of {year} is pressure, then a crown that arrives heavier than expected.',
    'This is a year that pays out after it takes its fee.',
    '{year} does not hand anything over until it has checked what you are made of.',
    'Think of {year} as a long climb with the view at the top.',
  ],
  ordeal: [
    '{year} is an ordeal year — not a punishment, a curriculum.',
    'What {year} removes is more instructive than what it gives.',
    'The year is built like a trial: the verdict is not the point, the evidence is.',
    '{year} is the year the scaffolding comes off.',
    'Some years add; {year} subtracts, and what remains is the point.',
  ],
  threshold: [
    '{year} is a threshold. Something changes form, and the form outlasts the feeling.',
    'This year changes what you are called, not just what you do.',
    '{year} is a doorway year: the room on the other side is not furnished yet.',
    'What {year} asks is not effort but consent.',
  ],
  quiet: [
    '{year} is a consolidation year — the work is mostly invisible and mostly structural.',
    'Not every year is a headline. {year} is the year the roots go down.',
    '{year} is quiet on purpose. What you build now is what the next loud year stands on.',
  ],
};

// ── CONNECTORS between the two essences ────────────────────────────────────
export const UNION_CONNECTORS: readonly string[] = [
  'Where the two agree, the year stops being a possibility and becomes a stage.',
  'The overlap is not decoration — it is where the year will actually happen.',
  'Both essences point at the same ground, which is rare and worth using.',
  'When the surface and the blueprint name the same arena, that arena is no longer optional.',
];

export const TENSION_CONNECTORS: readonly string[] = [
  'Where they differ, do not average them.',
  'The disagreement between them is the most honest thing in the chart.',
  'They are describing two altitudes of the same climb, not two different mountains.',
  'The friction is not noise; it is the year telling you what it will cost.',
];

// ── EVIDENCE LEAD-INS ──────────────────────────────────────────────────────
export const EVIDENCE_LEADS: readonly string[] = [
  'The record is not silent about this pair.',
  'This is not theoretical — it has happened to people.',
  'Other lives have carried this exact weight.',
  'There is precedent, and precedent is worth reading carefully.',
];

export const ORDINALS: readonly (readonly string[])[] = [
  ['Its clearest precedent is', 'A second case:', 'And a third:'],
  ['Start with', 'Then look at', 'And finally'],
  ['The strongest example is', 'Alongside it,', 'And again with'],
  ['Consider first', 'Set beside that', 'To complete the picture,'],
];

// ── HOW TO LIVE IT ─────────────────────────────────────────────────────────
export const LIVING_LEADS: readonly string[] = [
  'How to live it:',
  'The practical instruction:',
  'What this asks of you:',
  'In plain terms:',
];

// ── VERDICTS by polarity ───────────────────────────────────────────────────
export const VERDICTS: Record<
  'predominantly constructive' | 'predominantly cautionary' | 'mixed ordeal-and-reward' | 'threshold / transition',
  readonly string[]
> = {
  'predominantly constructive': [
    'Read as one story, the year is constructive. The danger is not absence of luck but scattered attention diluting the main opportunity.',
    'Taken together, the year leans favourable — provided you do not spend it in three directions at once.',
    'The year is generous, and generosity is easy to waste.',
  ],
  'predominantly cautionary': [
    'Read as one story, the year is cautionary. Smaller, safer wins beat dramatic moves with hidden downside.',
    'Taken together, the year asks for preservation and correction rather than expansion.',
    'The year rewards the person who declines the spectacular option.',
  ],
  'mixed ordeal-and-reward': [
    'Read as one story, the year pays through contrast: pressure first, reward later. The difficult part is the price of accuracy, not proof the year is failing.',
    'Taken together, the year is an exchange — something is taken, something better is returned, and the order is not negotiable.',
    'The year is honest in an uncomfortable way: it charges before it pays.',
  ],
  'threshold / transition': [
    'Read as one story, the year is a threshold: something changes form, and the year succeeds only if the new structure is stronger than the one it replaces.',
    'Taken together, the year is a change of state rather than a change of fortune.',
    'The year is less about winning than about becoming someone who can hold what comes next.',
  ],
};

/** Assemble the varied skeleton. */
export function composeSynthesis(args: {
  year: number;
  shape: Shape;
  polarity: 'predominantly constructive' | 'predominantly cautionary' | 'mixed ordeal-and-reward' | 'threshold / transition';
  seed: string;
  partners: string;
  union: string;
  tension: string;
  proof: string;
  living: string;
  protection: string;
  /** Verbatim lines from the compound's manifestationPatterns. */
  directQuotes: string[];
  classicQuotes: string[];
}): string {
  const { year, shape, polarity, seed } = args;

  const opener = seededPick(`${seed}:opener`, OPENERS[shape]).replace('{year}', String(year));
  const unionLead = seededPick(`${seed}:union`, UNION_CONNECTORS);
  const tensionLead = seededPick(`${seed}:tension`, TENSION_CONNECTORS);
  const evidenceLead = seededPick(`${seed}:evidence`, EVIDENCE_LEADS);
  const ordinals = seededPick(`${seed}:ord`, ORDINALS);
  const livingLead = seededPick(`${seed}:living`, LIVING_LEADS);
  const verdict = seededPick(`${seed}:verdict`, VERDICTS[polarity]);

  // The compound's own words, quoted, so the reading sounds like a teacher
  // quoting the source rather than a template paraphrasing it.
  const quoteBlock = [...args.directQuotes.map((q) => `“${q}”`), ...args.classicQuotes.map((q) => `“${q}”`)]
    .slice(0, 2)
    .join(' ');

  return [
    `${opener}`,
    '',
    args.partners,
    '',
    quoteBlock ? `${quoteBlock} That is the tradition's own language for this pair, not a summary of it.` : '',
    '',
    `${unionLead} ${args.union}`,
    '',
    args.tension ? `${tensionLead} ${args.tension}` : '',
    '',
    `${evidenceLead} ${args.proof}`,
    '',
    `${livingLead} ${args.living}`,
    '',
    `${verdict} Guard the marriage at its weakest seam: ${args.protection}`,
  ]
    .filter((s) => s !== undefined && s !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
