/**
 * MYSTIQUE COMPASS — Soul Resonance Engine (compatibility layer)
 *
 * Adds three things the app didn't have before, wired to REAL app data
 * (not placeholder/zeroed structures):
 *  1. A full 12x12 Chinese zodiac relation matrix that distinguishes
 *     Secret Friends, Trines, Six Clashes (六冲) and Six Harms (相害),
 *     instead of only secret-friends/trines.
 *  2. Domain-weighted scoring so Romance / Partnership / Friendship
 *     produce different numbers for the same pair, instead of one
 *     generic score reused three times.
 *  3. A Lo Shu void-fill / amplification overlay and an Alexandrov
 *     psychomatrix 6-line comparison, both built from the app's own
 *     `generateLoShuData` / `calculatePsychomatrix` output.
 *
 * This module is additive: it does not replace `buildRelationshipAnalysis`
 * in engagement-tools.tsx (the narrative/timeline/evidence engine). It is
 * meant to be rendered as an extra section inside the existing
 * SoulResonancePanel.
 */

import { calculatePsyche, calculateDestiny, generateLoShuData } from "@/lib/numerology";
import {
  JOHARI_PSYCHIC_PROFILES,
  getJohariPairCompatibility,
  johariViewOf,
  generateCombinedWeather,
  type JohariPsychicProfile,
  type JohariPairCompat,
  type CombinedWeatherReport,
} from "@/lib/johari-compatibility-data";
import { getLifePathNumber } from "@/lib/numerology/karmic-life-path";
import { computeRawPersonalYear, computeRawPersonalYearClassic, reduceNum, reduceToSingleDigit } from "@/lib/numerology/personal-year-full";
import { lookupCompound } from "@/lib/numerology/chaldean-pyn-compounds";
import { calculatePsychomatrix } from "@/lib/numerology/data/psychomatrixData";
import { getChineseZodiacSign, getWesternZodiacSign } from "@/lib/astrology";
import { famousBirthdays, type FamousPerson } from "@/lib/famous-birthdays";
import { zodiacData } from "@/lib/zodiac";
import { NEW_ASTROLOGY_DATA } from "@/lib/new-astrology";
import { chineseZodiacRelation } from "@/lib/zodiac-relations";
import {
  classifySuzanneWhiteMentions,
  type SuzanneWhiteVerdict,
  type SuzanneWhiteMentionVerdicts,
} from "@/lib/suzanne-white-classifier";

export { classifySuzanneWhiteMentions };
export type { SuzanneWhiteVerdict, SuzanneWhiteMentionVerdicts };

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export interface SoulVitals {
  name: string;
  day: number;
  month: number;
  year: number;
  gender: string;
  psychic: number;
  destiny: number;
  lifePath: number;
  zodiacAnimal: string;
  zodiacElement: string;
  westernSign: string;
  combinedSign: string;
  /** digit -> count, from the app's own Lo Shu grid data */
  loShuCounts: Record<number, number>;
  /** digit -> count, from the app's own Alexandrov psychomatrix data */
  psychomatrixCounts: Record<number, number>;
}

export interface DomainScore {
  romance: number;
  partnership: number;
  friendship: number;
}

export interface ResonanceLayer {
  label: string;
  score: number;
  verdict: string;
  detail: string;
  domainWeights: DomainScore;
}

/** A psychomatrix line comparison that carries NUMBERS, not prose.
 *  The old version returned an English sentence and the caller did
 *  `.includes('leads')` to recover a number from it — reword the sentence and
 *  the compatibility score silently changed. */
export interface PsychomatrixLine {
  a: number;
  b: number;
  delta: number;
  text: string;
}

export interface PsychomatrixComparison {
  willpower: PsychomatrixLine;
  energy: PsychomatrixLine;
  stability: PsychomatrixLine;
  purpose: PsychomatrixLine;
  family: PsychomatrixLine;
  habits: PsychomatrixLine;
}

export interface SoulResonanceReport {
  soulA: SoulVitals;
  soulB: SoulVitals;
  overall: number;
  domains: DomainScore;
  layers: ResonanceLayer[];
  chineseZodiac: { relation: string; score: number; note: string };
  loShuOverlay: {
    voidFill: { numbers: number[]; narrative: string; score: number };
    amplification: { numbers: number[]; narrative: string; score: number };
  };
  psychomatrixComparison: PsychomatrixComparison;
  famousTwins: Array<{ name: string; sharedTrait: string }>;
  reading: string;
  /** Additive: how each soul's current-cycle personal years collide or
   * harmonize with the other's. */
  pyInteraction?: PYInteractionAnalysis;
  johariCompatibility?: {
    profileA: JohariPsychicProfile;
    profileB: JohariPsychicProfile;
    psychicPair: JohariPairCompat | null;
    destinyPair: JohariPairCompat | null;
    crossPairAB: JohariPairCompat | null;
    crossPairBA: JohariPairCompat | null;
    aPsychicViewOfBPsychic: "Friendly" | "Neutral" | "Enemy";
    aDestinyViewOfBDestiny: "Friendly" | "Neutral" | "Enemy";
    aLifePathViewOfBLifePath: "Friendly" | "Neutral" | "Enemy";
    bPsychicViewOfAPsychic: "Friendly" | "Neutral" | "Enemy";
    bDestinyViewOfADestiny: "Friendly" | "Neutral" | "Enemy";
    bLifePathViewOfALifePath: "Friendly" | "Neutral" | "Enemy";
    compositeVerdict: "Strongly Friendly" | "Generally Friendly" | "Mixed" | "Generally Tense" | "Strongly Tense";
    compositeExplanation: string;
    aViewOfB: "Friendly" | "Neutral" | "Enemy";
    bViewOfA: "Friendly" | "Neutral" | "Enemy";
  };
  combinedWeather?: CombinedWeatherReport;
  chineseZodiacCompatText?: string;
  newAstrologyCompat?: {
    aCompatText: string;
    bCompatText: string;
    aAppreciationOfB: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
      evidence: { combined: number; western: number; animal: number };
    };
    aDissatisfactionWithB: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
      evidence: { combined: number; western: number; animal: number };
    };
    bAppreciationOfA: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
      evidence: { combined: number; western: number; animal: number };
    };
    bDissatisfactionWithA: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
      evidence: { combined: number; western: number; animal: number };
    };
  };
}

// ---------------------------------------------------------------------
// Soul Weather
// ---------------------------------------------------------------------

export interface PYReading {
  raw: number;
  reduced: number;
  compoundName: string | null;
  isKarmicDebt: boolean;
  isMasterNumber: boolean;
  thesis: string;
  /** The compound's own words, verbatim, for the parts of the reading that
   *  should sound like a teacher quoting the source rather than paraphrasing. */
  quotes: string[];
}

export interface SoulWeatherReport {
  soul: SoulVitals;
  targetYear: number;
  direct: PYReading;
  classic: PYReading;
  age: number | null;
  ageBand: string;
  karmicAlert: string | null;
  masterAlert: string | null;
  famousMatches: Array<{ name: string; score: number; reasons: string[] }>;
  forecast: string;
}

export interface PYInteractionAnalysis {
  aDirect: PYReading;
  aClassic: PYReading;
  bDirect: PYReading;
  bClassic: PYReading;
  interactionType: "harmonious" | "challenging" | "neutral" | "karmic-tension" | "master-amplification";
  narrative: string;
  warning: string | null;
  opportunity: string | null;
}

// ---------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------

const CHEIRO_HARMONY: Record<number, number[]> = {
  1: [1, 4, 8],
  2: [2, 7],
  3: [3, 6, 9],
  4: [4, 1, 8],
  5: [5],
  6: [6, 3, 9],
  7: [7, 2],
  8: [8, 4, 1],
  9: [9, 3, 6],
  11: [2, 7, 11],
  22: [4, 1, 22],
  33: [6, 3, 9, 33],
};

const JOHARI: Record<
  number,
  { planet: string; friends: number[]; neutrals: number[]; growth: number[] }
> = {
  1: { planet: "Sun", friends: [1, 2, 3, 9], neutrals: [5], growth: [4, 6, 7, 8] },
  2: { planet: "Moon", friends: [1, 2, 3], neutrals: [4, 6, 7, 8, 9], growth: [5] },
  3: { planet: "Jupiter", friends: [1, 2, 3, 9], neutrals: [4, 7, 8], growth: [5, 6] },
  4: { planet: "Rahu", friends: [4, 5, 6, 8], neutrals: [3, 7], growth: [1, 2, 9] },
  5: { planet: "Mercury", friends: [1, 3, 5, 6, 9], neutrals: [8], growth: [2, 4, 7] },
  6: { planet: "Venus", friends: [4, 5, 6, 8], neutrals: [3, 7, 9], growth: [1, 2] },
  7: { planet: "Ketu", friends: [1, 2, 4, 7], neutrals: [3, 5, 6, 8, 9], growth: [] },
  8: { planet: "Saturn", friends: [4, 5, 6, 8], neutrals: [3, 7], growth: [1, 2, 9] },
  9: { planet: "Mars", friends: [1, 2, 3, 9], neutrals: [6, 7], growth: [4, 5, 8] },
};

// ---------------------------------------------------------------------
// Soul Weather static reference data
// ---------------------------------------------------------------------

const KARMIC_DEBT_NUMBERS = new Set([13, 14, 16, 19]);
const MASTER_NUMBERS = new Set([11, 22, 33]);

const PY_CORE_THEMES: Record<number, string> = {
  1: "new beginnings and self-directed initiative",
  2: "partnership, patience, and diplomacy",
  3: "expression, socializing, and creative growth",
  4: "foundation-building, discipline, and steady work",
  5: "change, freedom, and unexpected movement",
  6: "responsibility, home, and relationships",
  7: "reflection, study, and inner development",
  8: "power, money, and material reckoning",
  9: "completion, release, and closing a cycle",
  11: "heightened intuition and spiritual illumination",
  22: "master-building on a larger, more structural scale",
  33: "master-level compassionate service and teaching",
};

interface PYArchetype {
  label: string;
  verb: string;
}

const PY_ARCHETYPES: Record<number, PYArchetype> = {
  1: { label: "the initiator", verb: "launches" },
  2: { label: "the diplomat", verb: "cooperates" },
  3: { label: "the expresser", verb: "performs" },
  4: { label: "the builder", verb: "consolidates" },
  5: { label: "the free spirit", verb: "moves" },
  6: { label: "the caretaker", verb: "tends" },
  7: { label: "the seeker", verb: "withdraws" },
  8: { label: "the power-broker", verb: "harvests" },
  9: { label: "the closer", verb: "releases" },
};

function archetypeFor(reduced: number): PYArchetype {
  const base = reduceToSingleDigit(reduced);
  return PY_ARCHETYPES[base] ?? PY_ARCHETYPES[9];
}

function ageBandFor(age: number | null): string {
  if (age === null || Number.isNaN(age)) return "age unavailable";
  if (age < 20) return "formation window";
  if (age <= 35) return "launch window";
  if (age <= 55) return "consolidation window";
  return "legacy window";
}

/**
 * Pull the compound's own quotable lines out of `manifestationPatterns`.
 *
 * The synthesis used to read ONE paragraph of `vibrationalEssence` and ignore
 * the other three fields entirely — including `manifestationPatterns`, which
 * is precisely where the concrete, quotable predictions live. The lines people
 * remember ("loss and renewal that can exhaust even the most resilient
 * spirit", "returns disproportionate to the input") are in there. This is
 * what makes a reading sound like a teacher quoting the source rather than a
 * template paraphrasing it.
 */
const QUOTE_ANCHORS = [
  /\b(loss and renewal[^.]*\.)/i,
  /\b(effortless success[^.]*\.)/i,
  /\b(returns disproportionate[^.]*\.)/i,
  /\b(opposition and competition[^.]*\.)/i,
  /\b(danger of loss through law[^.]*\.)/i,
  /\b(begin life['\u2019]s road over[^.]*\.)/i,
  /\b(what practitioners have called[^.]*\.)/i,
  /\b(the individual who[^.]*\.)/i,
  /\b(the period['\u2019]s[^.]*\.)/i,
  /\b(often report[^.]*\.)/i,
  /\b(tend toward[^.]*\.)/i,
  /\b(rarely mediocrity[^.]*\.)/i,
];

function pullQuotes(text: string, limit = 2): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const re of QUOTE_ANCHORS) {
    const m = text.match(re);
    if (m) {
      const q = m[1].trim();
      if (!seen.has(q)) {
        seen.add(q);
        out.push(q);
      }
    }
    if (out.length >= limit) break;
  }
  return out;
}

function buildPYReading(raw: number): PYReading {
  const reduced = reduceNum(raw);
  const compound = lookupCompound(raw);
  const isKarmicDebt = KARMIC_DEBT_NUMBERS.has(raw) || !!compound?.isKarmicDebt;
  const isMasterNumber = MASTER_NUMBERS.has(reduced) || !!compound?.isMasterNumber;
  const thesis = compound
    ? compound.vibrationalEssence.split(/\n\n/)[0]
    : `A ${reduced}-vibration personal year: ${PY_CORE_THEMES[reduced] ?? "a rhythm shaped by that number's own pattern."}`;
  return {
    raw,
    reduced,
    compoundName: compound?.name ?? null,
    isKarmicDebt,
    isMasterNumber,
    thesis,
    quotes: compound ? pullQuotes(compound.manifestationPatterns) : [],
  };
}

function karmicAlertText(reading: PYReading, who: string): string | null {
  if (!reading.isKarmicDebt) return null;
  return `${who} personal year carries karmic-debt voltage (${reading.raw}/${reading.reduced}${reading.compoundName ? ` — ${reading.compoundName}` : ""}). This is not a punishment; it is unfinished business surfacing for resolution, and it rewards structure over improvisation.`;
}

function masterAlertText(reading: PYReading, who: string): string | null {
  if (!reading.isMasterNumber) return null;
  return `${who} personal year resolves to a master number (${reading.reduced}). Expect heightened intensity, more symbolic events, and a lower tolerance for anything half-hearted.`;
}

// ---------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------

function reduceSingle(n: number): number {
  let v = Math.abs(n);
  while (v > 9) v = String(v).split("").reduce((a, d) => a + Number(d), 0);
  return v || 9;
}

function cheiroHarmony(a: number, b: number): { score: number; label: string } {
  const ra = reduceSingle(a);
  const rb = reduceSingle(b);
  if (ra === rb) return { score: 90, label: "identical vibration" };
  const friends = CHEIRO_HARMONY[ra] || [];
  if (friends.includes(rb)) return { score: 85, label: "interchangeable harmony" };
  const trinities = [[1, 4, 8], [2, 7], [3, 6, 9], [5]];
  for (const t of trinities) if (t.includes(ra) && t.includes(rb)) return { score: 80, label: "trinitarian affinity" };
  return { score: 55, label: "neutral field" };
}

function johariRelation(a: number, b: number): { score: number; label: string; note: string } {
  const x = reduceSingle(a);
  const y = reduceSingle(b);
  const ax = JOHARI[x];
  const by = JOHARI[y];
  if (!ax || !by) return { score: 50, label: "unknown", note: "Insufficient data" };
  if (x === y) return { score: 86, label: "same-number mirror", note: `Both carry ${ax.planet}. Similarity creates recognition, but can become passive without shared aims.` };
  const friend = ax.friends.includes(y) || by.friends.includes(x);
  const growth = ax.growth.includes(y) || by.growth.includes(x);
  const neutral = ax.neutrals.includes(y) || by.neutrals.includes(x);
  if (friend) return { score: 82, label: "friendly planets", note: `${ax.planet} and ${by.planet} are friendly. Ease and affection; caution: relaxation without progress.` };
  if (growth) return { score: 74, label: "growth tension", note: `${ax.planet} and ${by.planet} create alertness — useful for growth, keeps both improving.` };
  if (neutral) return { score: 58, label: "neutral planets", note: `${ax.planet} and ${by.planet} neither feed nor provoke. Workable, but needs conscious purpose.` };
  return { score: 48, label: "challenging field", note: `${ax.planet} and ${by.planet} are in tension. Requires maturity and clear agreements.` };
}

// ---------------------------------------------------------------------
// Building blocks that consume REAL app data
// ---------------------------------------------------------------------

export function buildSoulVitals(input: { name: string; day: number; month: number; year: number; gender: string }): SoulVitals {
  const day = Number(input.day);
  const month = Number(input.month);
  const year = Number(input.year);
  const psychic = calculatePsyche(day);
  const destiny = calculateDestiny(day, month, year);
  const lifePath = getLifePathNumber(day, month, year).number;
  const { sign: zodiacAnimal, element: zodiacElement } = getChineseZodiacSign(day, month, year);
  const westernSign = getWesternZodiacSign(day, month, year);

  const loShuNumberCounts = generateLoShuData({ name: input.name, day, month, year, gender: input.gender }).numberCounts;
  const loShuCounts: Record<number, number> = {};
  for (const [digitStr, count] of Object.entries(loShuNumberCounts)) loShuCounts[Number(digitStr)] = count;

  const psychomatrixCounts = calculatePsychomatrix(day, month, year).counts;

  return {
    name: input.name || "Unknown",
    day, month, year, gender: input.gender || "male",
    psychic, destiny, lifePath,
    zodiacAnimal, zodiacElement, westernSign,
    combinedSign: `${westernSign}/${zodiacAnimal}`,
    loShuCounts,
    psychomatrixCounts,
  };
}

function analyzeLoShuOverlay(a: SoulVitals, b: SoulVitals) {
  const aPresent = Object.keys(a.loShuCounts).map(Number).filter((n) => a.loShuCounts[n] > 0);
  const bPresent = Object.keys(b.loShuCounts).map(Number).filter((n) => b.loShuCounts[n] > 0);
  const aVoids = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !aPresent.includes(n));
  const bVoids = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !bPresent.includes(n));
  const aFillsB = aPresent.filter((n) => bVoids.includes(n));
  const bFillsA = bPresent.filter((n) => aVoids.includes(n));
  const shared = aPresent.filter((n) => bPresent.includes(n));

  const voidNarrative =
    aFillsB.length > 0 && bFillsA.length > 0
      ? `${a.name}'s ${aFillsB.join(", ")} ${aFillsB.length === 1 ? "fills" : "fill"} ${b.name}'s empty ${aFillsB.length === 1 ? "space" : "spaces"}, and ${b.name}'s ${bFillsA.join(", ")} ${bFillsA.length === 1 ? "fills" : "fill"} ${a.name}'s — mutual completion in both directions.`
      : aFillsB.length > 0
        ? `${a.name}'s ${aFillsB.join(", ")} ${aFillsB.length === 1 ? "fills" : "fill"} ${b.name}'s empty ${aFillsB.length === 1 ? "space" : "spaces"} — karmic completion.`
        : bFillsA.length > 0
          ? `${b.name}'s ${bFillsA.join(", ")} ${bFillsA.length === 1 ? "fills" : "fill"} ${a.name}'s empty ${bFillsA.length === 1 ? "space" : "spaces"} — karmic completion.`
          : "No void-filling between these grids — both are self-contained.";
  const ampNarrative =
    shared.length > 0
      ? `Shared ${shared.join(", ")} — common ground, ${shared.length > 3 ? "amplified strength" : "balanced presence"}.`
      : "No shared numbers — complementary but foreign territories.";

  return {
    voidFill: { numbers: [...aFillsB, ...bFillsA], narrative: voidNarrative, score: aFillsB.length > 0 || bFillsA.length > 0 ? 85 : 55 },
    amplification: { numbers: shared, narrative: ampNarrative, score: shared.length > 3 ? 75 : shared.length > 0 ? 65 : 50 },
  };
}

// Mirrors the app's own psychomatrix line groupings from
// calculatePsychomatrix (row_1/2/3, col_1/2/3 in psychomatrixData.ts):
// willpower=1,4,7 · energy=2,5,8 · stability=3,6,9 · purpose=1,2,3 ·
// family=4,5,6 · habits=7,8,9.
function comparePsychomatrixLines(a: SoulVitals, b: SoulVitals): PsychomatrixComparison {
  const ac = a.psychomatrixCounts;
  const bc = b.psychomatrixCounts;
  const sum = (c: Record<number, number>, digits: number[]) => digits.reduce((t, d) => t + (c[d] || 0), 0);
  const line = (digits: number[], label: string): PsychomatrixLine => {
    const av = sum(ac, digits);
    const bv = sum(bc, digits);
    const delta = av - bv;
    const text =
      Math.abs(delta) <= 1
        ? `${label}: equal — shared ${label.toLowerCase()} intensity.`
        : `${label}: ${delta > 0 ? a.name : b.name} leads by ${Math.abs(delta)} — ${delta > 0 ? b.name : a.name} is supported.`;
    return { a: av, b: bv, delta, text };
  };
  return {
    willpower: line([1, 4, 7], "Willpower"),
    energy: line([2, 5, 8], "Energy"),
    stability: line([3, 6, 9], "Stability"),
    purpose: line([1, 2, 3], "Purpose"),
    family: line([4, 5, 6], "Family/Health"),
    habits: line([7, 8, 9], "Habits/Talent"),
  };
}

export function getFamousTwins(a: SoulVitals, b: SoulVitals): Array<{ name: string; sharedTrait: string }> {
  const twins: Array<{ name: string; sharedTrait: string }> = [];
  const isSelf = (p: FamousPerson, s: SoulVitals) => p.day === s.day && p.month === s.month && p.year === s.year;
  const sameDay = famousBirthdays.filter((p) => p.day === a.day && p.month === a.month && !isSelf(p, a) && !isSelf(p, b));
  sameDay.slice(0, 3).forEach((p) => twins.push({ name: p.name, sharedTrait: `Born ${a.day}/${a.month} — shares your birth day` }));
  const sameAnimal = famousBirthdays.filter((p) => getChineseZodiacSign(p.day, p.month, p.year).sign === a.zodiacAnimal && !isSelf(p, a) && !isSelf(p, b));
  sameAnimal.slice(0, 3).forEach((p) => twins.push({ name: p.name, sharedTrait: `Chinese ${a.zodiacAnimal} — same zodiac animal` }));
  return twins.slice(0, 5);
}

// ---------------------------------------------------------------------
// Personal Year interaction
// ---------------------------------------------------------------------

function pyInteractionNarrative(aName: string, aArch: PYArchetype, bName: string, bArch: PYArchetype): string {
  if (aArch === bArch) {
    return `${aName} and ${bName} are both moving as ${aArch.label} this year — energizing when your aims align, competitive when you both insist on setting the pace.`;
  }
  return `${aName} is moving as ${aArch.label} this year (${aArch.verb}), while ${bName} is moving as ${bArch.label} (${bArch.verb}). The pairing works best when each role is consciously divided rather than silently assumed.`;
}

export function analyzePYInteraction(a: SoulVitals, b: SoulVitals, targetYear = new Date().getFullYear()): PYInteractionAnalysis {
  const aDirect = buildPYReading(computeRawPersonalYear(a.day, a.month, targetYear));
  const aClassic = buildPYReading(computeRawPersonalYearClassic(a.day, a.month, targetYear));
  const bDirect = buildPYReading(computeRawPersonalYear(b.day, b.month, targetYear));
  const bClassic = buildPYReading(computeRawPersonalYearClassic(b.day, b.month, targetYear));

  const aArch = archetypeFor(aDirect.reduced);
  const bArch = archetypeFor(bDirect.reduced);
  const narrative = pyInteractionNarrative(a.name, aArch, b.name, bArch);

  const karmicHits = [aDirect, aClassic, bDirect, bClassic].filter((r) => r.isKarmicDebt);
  const masterHits = [aDirect, aClassic, bDirect, bClassic].filter((r) => r.isMasterNumber);

  let interactionType: PYInteractionAnalysis["interactionType"];
  let warning: string | null = null;
  let opportunity: string | null = null;

  if (karmicHits.length > 0) {
    interactionType = "karmic-tension";
    warning = `${karmicHits.length > 1 ? "Both of you carry" : "One of you carries"} a karmic-debt personal year this cycle (${karmicHits.map((r) => `${r.raw}/${r.reduced}`).join(", ")}). Old, unfinished patterns are likely to resurface in this relationship until they are consciously addressed rather than avoided.`;
  } else if (masterHits.length > 0) {
    interactionType = "master-amplification";
    opportunity = `${masterHits.length > 1 ? "Both of you carry" : "One of you carries"} a master-number personal year this cycle (${masterHits.map((r) => r.reduced).join(", ")}). Anything you build together now has higher-than-usual potential to become significant, provided it is backed by real follow-through rather than only inspiration.`;
  } else {
    const aBase = reduceToSingleDigit(aDirect.reduced);
    const bBase = reduceToSingleDigit(bDirect.reduced);
    const distance = Math.abs(aBase - bBase);
    if (distance <= 2) interactionType = "harmonious";
    else if (distance >= 6) interactionType = "challenging";
    else interactionType = "neutral";
  }

  if (interactionType === "challenging") {
    warning = `${a.name} is running a ${aDirect.raw}/${aDirect.reduced} year while ${b.name} is running a ${bDirect.raw}/${bDirect.reduced} year — the two rhythms are pulling in fairly different directions this cycle, so timing and pacing need to be discussed openly rather than assumed.`;
  }
  if (interactionType === "harmonious") {
    opportunity = `${a.name}'s ${aDirect.raw}/${aDirect.reduced} year and ${b.name}'s ${bDirect.raw}/${bDirect.reduced} year are moving in a compatible rhythm this cycle, which makes shared plans easier to time well.`;
  }

  return { aDirect, aClassic, bDirect, bClassic, interactionType, narrative, warning, opportunity };
}

// ---------------------------------------------------------------------
// Suzanne White codification
// ---------------------------------------------------------------------

function codifySuzanneWhite(
  sourceText: string,
  partnerCombinedSign: string,
  partnerWestern: string,
  partnerAnimal: string,
) {
  const v = classifySuzanneWhiteMentions(sourceText, partnerCombinedSign, partnerWestern, partnerAnimal);

  const isAppreciated = (verdict: SuzanneWhiteVerdict) => verdict === "positive" || verdict === "mixed";
  const isCautioned = (verdict: SuzanneWhiteVerdict) => verdict === "avoid" || verdict === "mixed";

  return {
    appreciation: {
      westernSignMatch: isAppreciated(v.western),
      chineseAnimalMatch: isAppreciated(v.animal),
      combinedSignMatch: isAppreciated(v.combined),
      details: [v.details.western, v.details.animal, v.details.combined].filter((s) => !s.startsWith("No explicit")).join("; ") || "No explicit recommendation in this sign's paragraph.",
      evidence: v.evidence,
    },
    dissatisfaction: {
      westernSignMatch: isCautioned(v.western),
      chineseAnimalMatch: isCautioned(v.animal),
      combinedSignMatch: isCautioned(v.combined),
      details: [v.details.western, v.details.animal, v.details.combined].filter((s) => !s.startsWith("No explicit")).join("; ") || "No explicit caution in this sign's paragraph.",
      evidence: v.evidence,
    },
  };
}

// ---------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------

export function generateSoulResonance(a: SoulVitals, b: SoulVitals, targetYear = new Date().getFullYear()): SoulResonanceReport {
  const psychicHarmony = cheiroHarmony(a.psychic, b.psychic);
  const destinyHarmony = cheiroHarmony(a.destiny, b.destiny);
  const lifePathHarmony = cheiroHarmony(a.lifePath, b.lifePath);
  const johari = johariRelation(a.psychic, b.psychic);
  const chinese = chineseZodiacRelation(a.zodiacAnimal, b.zodiacAnimal);
  const loShu = analyzeLoShuOverlay(a, b);
  const psychoCompare = comparePsychomatrixLines(a, b);
  const pyInteraction = analyzePYInteraction(a, b, targetYear);

  // ── Johari rich compatibility ────────────────────────────────────────
  const johariCompat = (() => {
    const profileA = JOHARI_PSYCHIC_PROFILES[reduceSingle(a.psychic)];
    const profileB = JOHARI_PSYCHIC_PROFILES[reduceSingle(b.psychic)];
    if (!profileA || !profileB) return undefined;

    const aPsyViewBPsy = johariViewOf(reduceSingle(a.psychic), reduceSingle(b.psychic));
    const bPsyViewAPsy = johariViewOf(reduceSingle(b.psychic), reduceSingle(a.psychic));
    const aDestViewBDest = johariViewOf(reduceSingle(a.destiny), reduceSingle(b.destiny));
    const bDestViewADest = johariViewOf(reduceSingle(b.destiny), reduceSingle(a.destiny));
    const aLPViewBLP = johariViewOf(reduceSingle(a.lifePath), reduceSingle(b.lifePath));
    const bLPViewALP = johariViewOf(reduceSingle(b.lifePath), reduceSingle(a.lifePath));

    const allViews = [aPsyViewBPsy, bPsyViewAPsy, aDestViewBDest, bDestViewADest, aLPViewBLP, bLPViewALP];
    const friendlyCount = allViews.filter((v) => v === "Friendly").length;
    const enemyCount = allViews.filter((v) => v === "Enemy").length;
    const neutralCount = allViews.filter((v) => v === "Neutral").length;

    let compositeVerdict: "Strongly Friendly" | "Generally Friendly" | "Mixed" | "Generally Tense" | "Strongly Tense";
    let compositeExplanation: string;

    if (friendlyCount >= 5) {
      compositeVerdict = "Strongly Friendly";
      compositeExplanation = `${friendlyCount} of 6 number dimensions show mutual friendliness — ${profileA.planet} (${a.psychic}/${a.destiny}/${a.lifePath}) and ${profileB.planet} (${b.psychic}/${b.destiny}/${b.lifePath}) are naturally drawn to each other across almost every dimension. A deeply supportive bond.`;
    } else if (friendlyCount >= 3 && enemyCount <= 1) {
      compositeVerdict = "Generally Friendly";
      compositeExplanation = `${friendlyCount} friendly, ${neutralCount} neutral, ${enemyCount} tense dimensions. The bond has a natural warmth in most areas, with only minor friction points that conscious effort can smooth over.`;
    } else if (enemyCount >= 5) {
      compositeVerdict = "Strongly Tense";
      compositeExplanation = `${enemyCount} of 6 number dimensions show mutual tension — ${profileA.planet} and ${profileB.planet} energies clash across psychic, destiny and life path. This demands significant awareness and compromise to sustain.`;
    } else if (enemyCount >= 3) {
      compositeVerdict = "Generally Tense";
      compositeExplanation = `${enemyCount} tense, ${neutralCount} neutral, ${friendlyCount} friendly dimensions. The relationship encounters structural resistance in key areas. Areas of friendliness exist but need active cultivation.`;
    } else {
      compositeVerdict = "Mixed";
      compositeExplanation = `${friendlyCount} friendly, ${neutralCount} neutral, ${enemyCount} tense dimensions across psychic (${aPsyViewBPsy}/${bPsyViewAPsy}), destiny (${aDestViewBDest}/${bDestViewADest}) and life path (${aLPViewBLP}/${bLPViewALP}). Neither naturally harmonious nor inherently hostile — the outcome depends on conscious effort and mutual respect.`;
    }

    return {
      profileA,
      profileB,
      psychicPair: getJohariPairCompatibility(a.psychic, b.psychic),
      destinyPair: getJohariPairCompatibility(a.destiny, b.destiny),
      crossPairAB: getJohariPairCompatibility(a.psychic, b.destiny),
      crossPairBA: getJohariPairCompatibility(b.psychic, a.destiny),
      aPsychicViewOfBPsychic: aPsyViewBPsy,
      aDestinyViewOfBDestiny: aDestViewBDest,
      aLifePathViewOfBLifePath: aLPViewBLP,
      bPsychicViewOfAPsychic: bPsyViewAPsy,
      bDestinyViewOfADestiny: bDestViewADest,
      bLifePathViewOfALifePath: bLPViewALP,
      compositeVerdict,
      compositeExplanation,
      aViewOfB: aPsyViewBPsy,
      bViewOfA: bPsyViewAPsy,
    };
  })();

  // ── Combined Soul Weather ─────────────────────────────────────────────
  const aPY = reduceNum(computeRawPersonalYear(a.day, a.month, targetYear));
  const bPY = reduceNum(computeRawPersonalYear(b.day, b.month, targetYear));
  const combinedWeather = generateCombinedWeather(aPY, bPY);

  // ── Domain scores ─────────────────────────────────────────────────────
  // THE FIX: psychicHarmony was weighted 0.30 + 0.10 = 0.40 in romance while
  // the layer card advertised 30. The duplicate term is replaced by destiny
  // harmony, which is what a romance score should actually carry. Weights now
  // sum to 1.00 and match the displayed domainWeights exactly.
  const romanceScore = Math.round(
    psychicHarmony.score * 0.30 +
    loShu.voidFill.score * 0.25 +
    chinese.score * 0.20 +
    johari.score * 0.15 +
    destinyHarmony.score * 0.10,
  );
  // Partnership reads the psychomatrix NUMBERS now, not an English sentence.
  const partnershipScore = Math.round(
    destinyHarmony.score * 0.30 +
    (Math.abs(psychoCompare.willpower.delta) <= 1 ? 78 : 62) * 0.20 +
    chinese.score * 0.15 +
    lifePathHarmony.score * 0.20 +
    loShu.amplification.score * 0.15,
  );
  const friendshipScore = Math.round(
    johari.score * 0.30 +
    lifePathHarmony.score * 0.20 +
    (a.combinedSign === b.combinedSign ? 90 : 60) * 0.15 +
    psychicHarmony.score * 0.15 +
    loShu.voidFill.score * 0.20,
  );
  const overall = Math.round((romanceScore + partnershipScore + friendshipScore) / 3);

  const layers: ResonanceLayer[] = [
    { label: "Psychic Vibration", score: psychicHarmony.score, verdict: psychicHarmony.label, detail: `Birth-day resonance: ${a.psychic} and ${b.psychic} — ${psychicHarmony.label}.`, domainWeights: { romance: 30, partnership: 0, friendship: 15 } },
    { label: "Destiny Vibration", score: destinyHarmony.score, verdict: destinyHarmony.label, detail: `Life-purpose resonance: ${a.destiny} and ${b.destiny} — ${destinyHarmony.label}.`, domainWeights: { romance: 10, partnership: 30, friendship: 0 } },
    { label: "Life Path", score: lifePathHarmony.score, verdict: lifePathHarmony.label, detail: `Journey resonance: ${a.lifePath} and ${b.lifePath}.`, domainWeights: { romance: 0, partnership: 20, friendship: 20 } },
    { label: "Vedic Johari", score: johari.score, verdict: johari.label, detail: johari.note, domainWeights: { romance: 15, partnership: 0, friendship: 30 } },
    { label: "Chinese Zodiac", score: chinese.score, verdict: chinese.relation, detail: chinese.note, domainWeights: { romance: 20, partnership: 15, friendship: 0 } },
    { label: "Lo Shu Void Fill", score: loShu.voidFill.score, verdict: loShu.voidFill.numbers.length > 0 ? "karmic completion" : "self-contained", detail: loShu.voidFill.narrative, domainWeights: { romance: 25, partnership: 0, friendship: 20 } },
    { label: "Lo Shu Amplification", score: loShu.amplification.score, verdict: loShu.amplification.numbers.length > 0 ? "shared power" : "complementary", detail: loShu.amplification.narrative, domainWeights: { romance: 0, partnership: 15, friendship: 5 } },
  ];

  const parts: string[] = [];
  parts.push(`Overall Resonance: ${overall}/100.`);
  parts.push(
    romanceScore >= 80 ? "Romance carries strong voltage — the psychic numbers harmonize and the zodiac supports attraction." : romanceScore >= 60 ? "Romance is present but needs cultivation — the foundation exists." : "Romantic friction is significant; this needs conscious work and clear agreements.",
  );
  parts.push(
    partnershipScore >= 80 ? "Excellent business pairing — complementary destinies and aligned willpower create productive synergy." : partnershipScore >= 60 ? "A workable partnership with defined roles; clarify who leads which domain." : "Partnership faces structural tension — consider advisory roles rather than co-leadership.",
  );
  parts.push(
    friendshipScore >= 80 ? "Natural friendship — shared rhythms and easy trust." : friendshipScore >= 60 ? "Friendship grows with shared experience; not instant, but durable." : "Friendship needs active maintenance — different wavelengths that can harmonize with effort.",
  );
  parts.push(loShu.voidFill.narrative);
  parts.push(loShu.amplification.narrative);
  parts.push(pyInteraction.narrative);
  if (pyInteraction.warning) parts.push(pyInteraction.warning);
  if (pyInteraction.opportunity) parts.push(pyInteraction.opportunity);

  return {
    soulA: a, soulB: b, overall,
    domains: { romance: romanceScore, partnership: partnershipScore, friendship: friendshipScore },
    layers,
    chineseZodiac: chinese,
    loShuOverlay: { voidFill: loShu.voidFill, amplification: loShu.amplification },
    psychomatrixComparison: psychoCompare,
    famousTwins: [],
    reading: parts.join(" "),
    pyInteraction,
    johariCompatibility: johariCompat,
    combinedWeather,
    chineseZodiacCompatText:
      zodiacData[a.zodiacAnimal]?.compatibilities?.[b.zodiacAnimal] ||
      zodiacData[b.zodiacAnimal]?.compatibilities?.[a.zodiacAnimal] ||
      "",
    newAstrologyCompat: (() => {
      const aText = NEW_ASTROLOGY_DATA[a.combinedSign]?.compatibilities || "";
      const bText = NEW_ASTROLOGY_DATA[b.combinedSign]?.compatibilities || "";
      if (!aText && !bText) return undefined;
      const aCodify = codifySuzanneWhite(aText, b.combinedSign, b.westernSign, b.zodiacAnimal);
      const bCodify = codifySuzanneWhite(bText, a.combinedSign, a.westernSign, a.zodiacAnimal);
      return {
        aCompatText: aText,
        bCompatText: bText,
        aAppreciationOfB: aCodify.appreciation,
        aDissatisfactionWithB: aCodify.dissatisfaction,
        bAppreciationOfA: bCodify.appreciation,
        bDissatisfactionWithA: bCodify.dissatisfaction,
      };
    })(),
  };
}

// ---------------------------------------------------------------------
// Famous-person birthday bank integration
// ---------------------------------------------------------------------

export interface FamousSoulVitals extends SoulVitals {
  id: string;
  tags: string[];
  source: "famous-birthdays";
}

export interface FamousPersonalYearMatch {
  soul: FamousSoulVitals;
  score: number;
  reasons: string[];
  directRaw: number;
  directReduced: number;
  classicRaw: number;
  classicReduced: number;
  directName: string;
  classicName: string;
}

function famousId(p: FamousPerson): string {
  return `famous:${p.name}:${p.day}-${p.month}-${p.year}`;
}

let famousSoulCache: FamousSoulVitals[] | null = null;

export function getFamousSoulBank(): FamousSoulVitals[] {
  if (!famousSoulCache) {
    famousSoulCache = famousBirthdays.map((p) => ({
      ...buildSoulVitals({ name: p.name, day: p.day, month: p.month, year: p.year, gender: p.gender }),
      id: famousId(p),
      tags: p.tags || [],
      source: "famous-birthdays" as const,
    }));
  }
  return famousSoulCache;
}

function compoundLabel(raw: number): string {
  const c = lookupCompound(raw);
  const reduced = reduceNum(raw);
  return c ? `${raw}/${reduced} ${c.name}` : `${raw}/${reduced}`;
}

export function getFamousPersonalYearMatches(
  subject: { day: number; month: number; year: number; name?: string },
  targetYear = new Date().getFullYear(),
  limit = 12,
): FamousPersonalYearMatch[] {
  const directRaw = computeRawPersonalYear(subject.day, subject.month, targetYear);
  const classicRaw = computeRawPersonalYearClassic(subject.day, subject.month, targetYear);
  const directReduced = reduceNum(directRaw);
  const classicReduced = reduceNum(classicRaw);
  const subjectLifePath = getLifePathNumber(subject.day, subject.month, subject.year).number;
  const subjectAnimal = getChineseZodiacSign(subject.day, subject.month, subject.year).sign;
  const subjectWestern = getWesternZodiacSign(subject.day, subject.month, subject.year);

  return getFamousSoulBank().map((s) => {
    const fDirectRaw = computeRawPersonalYear(s.day, s.month, targetYear);
    const fClassicRaw = computeRawPersonalYearClassic(s.day, s.month, targetYear);
    const fDirectReduced = reduceNum(fDirectRaw);
    const fClassicReduced = reduceNum(fClassicRaw);
    const reasons: string[] = [];
    let score = 0;
    if (fDirectRaw === directRaw) { score += 34; reasons.push(`same Direct personal-year compound ${compoundLabel(directRaw)}`); }
    if (fClassicRaw === classicRaw) { score += 34; reasons.push(`same Classic personal-year compound ${compoundLabel(classicRaw)}`); }
    if (fDirectReduced === directReduced) { score += 8; reasons.push(`same Direct root ${directReduced}`); }
    if (fClassicReduced === classicReduced) { score += 8; reasons.push(`same Classic root ${classicReduced}`); }
    if (s.lifePath === subjectLifePath) { score += 5; reasons.push(`same life path ${subjectLifePath}`); }
    if (s.zodiacAnimal === subjectAnimal) { score += 4; reasons.push(`same Chinese animal ${subjectAnimal}`); }
    if (s.westernSign === subjectWestern) { score += 3; reasons.push(`same Western sign ${subjectWestern}`); }
    if (s.day === subject.day && s.month === subject.month) { score += 6; reasons.push("same birthday"); }
    return {
      soul: s,
      score: Math.min(100, score),
      reasons,
      directRaw: fDirectRaw,
      directReduced: fDirectReduced,
      classicRaw: fClassicRaw,
      classicReduced: fClassicReduced,
      directName: compoundLabel(fDirectRaw),
      classicName: compoundLabel(fClassicRaw),
    };
  })
    .filter((m) => m.score >= 34)
    .sort((a, b) => b.score - a.score || a.soul.name.localeCompare(b.soul.name))
    .slice(0, limit);
}

export function getFamousSoulWeather(
  subject: { day: number; month: number; year: number; name?: string },
  targetYear = new Date().getFullYear(),
  limit = 8,
): FamousPersonalYearMatch[] {
  return getFamousPersonalYearMatches(subject, targetYear, limit);
}

// ---------------------------------------------------------------------
// Soul Weather report
// ---------------------------------------------------------------------

export function buildSoulWeatherReport(soul: SoulVitals, targetYear = new Date().getFullYear()): SoulWeatherReport {
  const direct = buildPYReading(computeRawPersonalYear(soul.day, soul.month, targetYear));
  const classic = buildPYReading(computeRawPersonalYearClassic(soul.day, soul.month, targetYear));
  const age = typeof soul.year === "number" && !Number.isNaN(soul.year) ? targetYear - soul.year : null;
  const band = ageBandFor(age);
  const karmicAlert = karmicAlertText(direct, `${soul.name}'s Direct`) ?? karmicAlertText(classic, `${soul.name}'s Classic`);
  const masterAlert = masterAlertText(direct, `${soul.name}'s Direct`) ?? masterAlertText(classic, `${soul.name}'s Classic`);
  const famousMatches = getFamousPersonalYearMatches({ day: soul.day, month: soul.month, year: soul.year, name: soul.name }, targetYear, 5)
    .map((m) => ({ name: m.soul.name, score: m.score, reasons: m.reasons }));

  const forecast = [
    `${soul.name}'s ${targetYear} personal year runs ${direct.raw}/${direct.reduced}${direct.compoundName ? ` (${direct.compoundName})` : ""} on the surface and ${classic.raw}/${classic.reduced}${classic.compoundName ? ` (${classic.compoundName})` : ""} underneath, in the ${band}.`,
    direct.thesis,
    ...direct.quotes.map((q) => `“${q}”`),
    karmicAlert ?? "",
    masterAlert ?? "",
  ].filter(Boolean).join(" ");

  return {
    soul,
    targetYear,
    direct,
    classic,
    age,
    ageBand: band,
    karmicAlert,
    masterAlert,
    famousMatches,
    forecast,
  };
}

export function getCosmicTwinsForSoul(soul: SoulVitals, limit = 10): Array<{ name: string; born: string; score: number; sharedTrait: string; tags: string[] }> {
  return getFamousSoulBank()
    .filter((p) => !(p.day === soul.day && p.month === soul.month && p.year === soul.year))
    .map((p) => {
      let score = 0;
      const reasons: string[] = [];
      if (p.day === soul.day && p.month === soul.month) { score += 55; reasons.push("same birthday"); }
      if (p.lifePath === soul.lifePath) { score += 18; reasons.push(`same life path ${soul.lifePath}`); }
      if (p.psychic === soul.psychic) { score += 12; reasons.push(`same psychic ${soul.psychic}`); }
      if (p.zodiacAnimal === soul.zodiacAnimal) { score += 10; reasons.push(`same Chinese ${soul.zodiacAnimal}`); }
      if (p.westernSign === soul.westernSign) { score += 7; reasons.push(`same ${soul.westernSign}`); }
      if (p.destiny === soul.destiny) { score += 8; reasons.push(`same destiny ${soul.destiny}`); }
      return { name: p.name, born: `${p.day}/${p.month}/${p.year}`, score: Math.min(100, score), sharedTrait: reasons.join(" · "), tags: p.tags };
    })
    .filter((p) => p.score >= 20)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}
