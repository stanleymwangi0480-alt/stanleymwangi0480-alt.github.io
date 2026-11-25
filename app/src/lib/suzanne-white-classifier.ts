/**
 * MYSTIQUE COMPASS — Suzanne White Classifier
 *
 * Parses Suzanne White's New Astrology compatibility paragraphs and decides,
 * for a given partner sign, whether the source recommends or cautions it.
 *
 * What the previous version got wrong
 * ─────────────────────────────────
 * 1. `sentence.indexOf(token)` found only the FIRST mention per sentence. A
 *    line like "No Virgo/Rats or Virgo/Roosters for you, but do prefer the
 *    solid Aries/Ox" had its second verdict never evaluated.
 * 2. The combined sign was matched literally as "aries/ox". White writes
 *    "Aries Ox", "the Aries/Ox", "Aries-Ox". Combined detection therefore
 *    failed silently for most of the corpus and fell back to `unstated`.
 * 3. The `too\s+[a-z-]+...to\b|[,.!]` alternative in CLEAR_AVOID_PATTERN
 *    matched "not too bad," and "too good to miss," — flagging praise as
 *    avoidance. It is now a closed list of genuinely negative constructions.
 * 4. `^no\b` was applied with /gi but no /m, so `^` anchored to the whole
 *    string rather than the sentence. It worked only because the caller
 *    happened to pass one sentence at a time. Now explicit.
 */

export type SuzanneWhiteVerdict = 'positive' | 'avoid' | 'mixed' | 'unstated';

export interface SuzanneWhiteMentionVerdicts {
  combined: SuzanneWhiteVerdict;
  western: SuzanneWhiteVerdict;
  animal: SuzanneWhiteVerdict;
  details: {
    combined: string;
    western: string;
    animal: string;
  };
  /** How many sentences actually carried a decisive marker for this pair.
   *  Low counts mean the verdict rests on thin evidence and the UI should
   *  say so rather than presenting it as settled. */
  evidence: { combined: number; western: number; animal: number };
}

// ── POSITIVE ────────────────────────────────────────────────────────────────
const POSITIVE_OVERRIDE_PATTERN =
  /can[\u2019']t go wrong|won[\u2019']t be disappointed|won[\u2019']t regret|won[\u2019']t have any trouble|particularly happy|you[\u2019']ll find a good|you[\u2019']ll find happiness|best bet|ideal match|great couple|perfect mate|blissfully|harmonious|recommended match|advised to seek|i see you with|you get on with|you get on especially well|you get along with|normally you get along with|should be compatible|good match|fine mate|happy alliance|harmony incarnate|sound love|durable|solid relationship|enduring love|great passion|not to be excluded|can[\u2019']t resist|you[\u2019']ll be particularly|excellent|will be happy|in your future|make sure you choose|prefer the solid|why not invite|will enhance your existence|crushes on|will make you laugh|pep up your|stay close to|don[\u2019']t hesitate to choose|don[\u2019']t forget that|who adore you|don[\u2019']t be surprised if|you[\u2019']re fond of|fond of|you[\u2019']ll fall for|fall for|work well|winner mates|swell bedfellows|bedfellows|are cute|cute, too|excite you|attract you|stand by you|please you|confront well|for your pleasure|advise you to look into|bring you joy|bring you their|make you happy, too|a wide choice/gi;

// ── NEGATIVE ────────────────────────────────────────────────────────────────
// `too X` is now a CLOSED LIST of genuinely negative constructions. The old
// open-ended `too\s+[a-z-]+` alternative matched "not too bad," and flagged
// compliments as cautions.
const CLEAR_AVOID_PATTERN =
  /stay away|avoid|shun|steer clear|steer around|give wide berth|wide berth|flee|poison|disastrous|don[\u2019']t pick|don[\u2019']t marry|don[\u2019']t go getting|don[\u2019']t bother with|don[\u2019']t go getting yourself involved|refrain|leave[^.]{0,40}alone|leave[^.]{0,40}if you can|too like you[^.]{0,40}too[^.]{0,40}different|worse than[^.]{0,30}bark|bite is worse|won[\u2019']t last|won[\u2019']t work|never work|dissonance|ugly duo|no marriage|not for you|not really suited|ill-suited|don[\u2019']t see eye to eye|polarized outlooks|too cool to keep[^.]{0,40}fascinated|exasperate you|unnerve you|unnerve[^.]{0,30}the most|annoy you|frustrate you|irritat|you[^.]{0,20}hate|they[^.]{0,20}hate|hate inertia|disappointments aplenty|disappointment[^.]{0,20}await|not much love|boredom|stodgy|gloomy|killjoy|beware|watch out for|nix\b|except,? perhaps|erase[^.]{0,40}from your mind|forget about|give up on|get on your nerves|never get on with|never ideal|don[\u2019']t make it for you|don[\u2019']t get along with|do not get along|don[\u2019']t get on with|don[\u2019']t get much out of|don[\u2019']t have much affinity|don[\u2019']t hang around with|don[\u2019']t be led down the aisle by|don[\u2019']t be flattered by|don[\u2019']t trifle with|don[\u2019']t set your heart on|don[\u2019']t try coupling with|don[\u2019']t take up with|don[\u2019']t be in a hurry to marry|don[\u2019']t promote any long-standing relationships with|don[\u2019']t even think about marrying|don[\u2019']t even entertain the thought|don[\u2019']t get caught up in|don[\u2019']t get involved with|don[\u2019']t get mixed up with|don[\u2019']t chase after|don[\u2019']t go getting involved with|don[\u2019']t get tangled up in|don[\u2019']t bank on|i don[\u2019']t advise|i don[\u2019']t vote for|i don[\u2019']t see you taking up with|i don[\u2019']t believe you can be happy forever with|i[\u2019']d leave|i would leave|you are advised to forget|incompatible signs|don[\u2019']t always have[^.]{0,40}best interests|stay clear|stay out of the way of|you clash with|clash with your own|you don[\u2019']t seem to think alike|less compatible|i warn you|make yourself scarce|give you trouble|overpower you|drive you mad|drive you crazy|demand too much|demand far too much|far too much stability|too much of a challenge|too tightly|for the pig[\u2019']s own good|not funky enough|too harsh|too\s+(?:much|many|few|little|cold|hot|harsh|rigid|controlling|jealous|possessive|selfish|distant|different|alike|intense|demanding|critical)\b/gi;

const SENTENCE_ANCHORED_AVOID = /^(?:no|nor|not so)\b/i;

// ── NORMALISATION ───────────────────────────────────────────────────────────
// White writes the same combined sign several ways. Normalise every form so a
// match is a match.
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/\bthe\b/g, ' ')
    .replace(/[\/\-\u2013\u2014]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** All start indices of `needle` in `hay`, allowing overlapping matches. */
function allIndices(hay: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at === -1) break;
    out.push(at);
    from = at + 1;
  }
  return out;
}

function markerIndices(re: RegExp, sentence: string): number[] {
  re.lastIndex = 0;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    out.push(m.index);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

/** Verdict for ONE occurrence of a token, by nearest marker (ties → positive). */
function verdictAt(sentence: string, at: number, posIdx: number[], avoidIdx: number[]): 'positive' | 'avoid' | null {
  let verdict: 'positive' | 'avoid' | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const p of posIdx) {
    const d = Math.abs(p - at);
    if (d < best) { best = d; verdict = 'positive'; }
  }
  for (const a of avoidIdx) {
    const d = Math.abs(a - at);
    if (d < best || (d === best && verdict === 'avoid')) { best = d; verdict = 'avoid'; }
  }
  return verdict;
}

/** EVERY occurrence in the sentence, not just the first. */
function sentenceMentionVerdicts(sentence: string, token: string): Array<'positive' | 'avoid'> {
  const hay = normalise(sentence);
  const needle = normalise(token);
  if (!needle) return [];

  // Sentence-anchored negation ("No Virgo/Rats for you.") applies to the
  // whole sentence, not just the token that happens to sit at index 0.
  const anchoredAvoid = SENTENCE_ANCHORED_AVOID.test(hay);
  const posIdx = markerIndices(POSITIVE_OVERRIDE_PATTERN, hay);
  const avoidIdx = markerIndices(CLEAR_AVOID_PATTERN, hay);
  if (anchoredAvoid) avoidIdx.push(0);

  const out: Array<'positive' | 'avoid'> = [];
  for (const at of allIndices(hay, needle)) {
    const v = verdictAt(hay, at, posIdx, avoidIdx);
    if (v) out.push(v);
  }
  return out;
}

function aggregate(verdicts: Array<'positive' | 'avoid'>): SuzanneWhiteVerdict {
  if (!verdicts.length) return 'unstated';
  const hasPos = verdicts.includes('positive');
  const hasAvoid = verdicts.includes('avoid');
  if (hasPos && hasAvoid) return 'mixed';
  return hasPos ? 'positive' : 'avoid';
}

function quote(s: string, max = 78): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1) + '\u2026';
}

/**
 * Single source of truth for Suzanne White classification.
 */
export function classifySuzanneWhiteMentions(
  sourceText: string,
  partnerCombinedSign: string,
  partnerWestern: string,
  partnerAnimal: string,
): SuzanneWhiteMentionVerdicts {
  const sentences = (sourceText.match(/[^.!?]+[.!?]+/g) || [sourceText])
    .map((s) => s.trim())
    .filter(Boolean);

  const collect = (token: string) =>
    sentences.flatMap((s) => sentenceMentionVerdicts(s, token).map((v) => ({ v, s })));

  const c = collect(partnerCombinedSign);
  const w = collect(partnerWestern);
  const a = collect(partnerAnimal);

  const describe = (
    rows: Array<{ v: 'positive' | 'avoid'; s: string }>,
    label: string,
  ): string => {
    if (!rows.length) return `No explicit mention of ${label} found in this sign's paragraph.`;
    const pos = rows.filter((r) => r.v === 'positive');
    const neg = rows.filter((r) => r.v === 'avoid');
    return [
      ...pos.slice(0, 2).map((r) => `${label} is recommended ("${quote(r.s)}")`),
      ...neg.slice(0, 2).map((r) => `${label} is cautioned against ("${quote(r.s)}")`),
    ].join('; ');
  };

  return {
    combined: aggregate(c.map((r) => r.v)),
    western: aggregate(w.map((r) => r.v)),
    animal: aggregate(a.map((r) => r.v)),
    details: {
      combined: describe(c, partnerCombinedSign),
      western: describe(w, partnerWestern),
      animal: describe(a, partnerAnimal),
    },
    evidence: { combined: c.length, western: w.length, animal: a.length },
  };
}
