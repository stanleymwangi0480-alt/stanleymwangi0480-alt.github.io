/**
 * MYSTIQUE COMPASS — Chinese Zodiac Relations (single source of truth)
 *
 * The app had two incompatible scales for the same 12x12 matrix:
 *
 *   relation        ZODIAC_RELATIONS (engine)   chineseZodiacScore (engagement-tools)
 *   secret friend   92                           94
 *   six clash       35                           24
 *   trine           88                           86
 *   neutral         50                           55
 *
 * A Rat/Horse pair therefore rendered as "35 — Six Clash" in one card and
 * "24 — opposition pair" in another, inside the same panel. This module is
 * the only scale; both call sites must import from it.
 */

export type ZodiacRelation =
  | 'same'
  | 'secret-friend'
  | 'trine'
  | 'six-clash'
  | 'six-harm'
  | 'neutral'
  | 'unknown';

export interface ZodiacRelationInfo {
  relation: ZodiacRelation;
  score: number;
  note: string;
}

/** One scale, used everywhere. */
export const ZODIAC_SCALE: Record<ZodiacRelation, number> = {
  same: 72,
  'secret-friend': 92,
  trine: 88,
  'six-harm': 40,
  'six-clash': 35,
  neutral: 55,
  unknown: 55,
};

export const ZODIAC_RELATION_LABELS: Record<ZodiacRelation, string> = {
  same: 'Same Animal',
  'secret-friend': 'Secret Friends (六合)',
  trine: 'Trine Allies (三合)',
  'six-clash': 'Six Clash (六冲)',
  'six-harm': 'Six Harms (相害)',
  neutral: 'Neutral',
  unknown: 'Unknown',
};

const SECRET_FRIENDS: Record<string, string> = {
  Rat: 'Ox', Ox: 'Rat',
  Tiger: 'Pig', Pig: 'Tiger',
  Rabbit: 'Dog', Dog: 'Rabbit',
  Dragon: 'Rooster', Rooster: 'Dragon',
  Snake: 'Monkey', Monkey: 'Snake',
  Horse: 'Goat', Goat: 'Horse',
};

const CLASH: Record<string, string> = {
  Rat: 'Horse', Horse: 'Rat',
  Ox: 'Goat', Goat: 'Ox',
  Tiger: 'Monkey', Monkey: 'Tiger',
  Rabbit: 'Rooster', Rooster: 'Rabbit',
  Dragon: 'Dog', Dog: 'Dragon',
  Snake: 'Pig', Pig: 'Snake',
};

const HARM: Record<string, string> = {
  Rat: 'Goat', Goat: 'Rat',
  Ox: 'Horse', Horse: 'Ox',
  Tiger: 'Snake', Snake: 'Tiger',
  Rabbit: 'Dragon', Dragon: 'Rabbit',
  Monkey: 'Pig', Pig: 'Monkey',
  Rooster: 'Dog', Dog: 'Rooster',
};

const TRIANGLES = [
  new Set(['Rat', 'Dragon', 'Monkey']),
  new Set(['Ox', 'Snake', 'Rooster']),
  new Set(['Tiger', 'Horse', 'Dog']),
  new Set(['Rabbit', 'Goat', 'Pig']),
];

export function chineseZodiacRelation(a: string, b: string): ZodiacRelationInfo {
  if (!a || !b) return { relation: 'unknown', score: ZODIAC_SCALE.unknown, note: 'No zodiac data for this pairing.' };
  if (a === b) {
    return {
      relation: 'same',
      score: ZODIAC_SCALE.same,
      note: `Chinese zodiac: both are ${a}. They understand each other's rhythm, but may double the same blind spot.`,
    };
  }
  if (SECRET_FRIENDS[a] === b) {
    return {
      relation: 'secret-friend',
      score: ZODIAC_SCALE['secret-friend'],
      note: `Chinese zodiac: ${a} and ${b} are secret friends (六合), a private support bond with unusually natural trust.`,
    };
  }
  if (CLASH[a] === b) {
    return {
      relation: 'six-clash',
      score: ZODIAC_SCALE['six-clash'],
      note: `Chinese zodiac: ${a} and ${b} are a Six Clash pair (六冲). Attraction may exist, but life rhythm and priorities clash unless both are mature.`,
    };
  }
  if (HARM[a] === b) {
    return {
      relation: 'six-harm',
      score: ZODIAC_SCALE['six-harm'],
      note: `Chinese zodiac: ${a} and ${b} form a Six Harm pair (相害) — friction that wears rather than collides.`,
    };
  }
  if (TRIANGLES.some((t) => t.has(a) && t.has(b))) {
    return {
      relation: 'trine',
      score: ZODIAC_SCALE.trine,
      note: `Chinese zodiac: ${a} and ${b} share an affinity trine (三合), giving common instinct and easier collaboration.`,
    };
  }
  return {
    relation: 'neutral',
    score: ZODIAC_SCALE.neutral,
    note: `Chinese zodiac: no secret-friend, trine, clash or harm signature between ${a} and ${b}; judge by the numerology and lived behaviour.`,
  };
}
