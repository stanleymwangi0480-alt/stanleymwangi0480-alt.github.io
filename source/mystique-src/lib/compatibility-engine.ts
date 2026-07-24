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
  psychomatrixComparison: {
    willpower: string;
    energy: string;
    stability: string;
    purpose: string;
    family: string;
    habits: string;
  };
  famousTwins: Array<{ name: string; sharedTrait: string }>;
  reading: string;
  /** Additive: how each soul's current-cycle personal years collide or
   * harmonize with the other's. Optional so existing consumers that were
   * built before this field existed keep compiling and rendering unchanged. */
  pyInteraction?: PYInteractionAnalysis;
  /**
   * Rich Johari compatibility data: full psychic profiles for both souls
   * and all four directional pair readings (psychic↔psychic,
   * destiny↔destiny, psychic-A↔destiny-B, psychic-B↔destiny-A), plus the
   * friend/enemy view each number holds of the other.
   */
  johariCompatibility?: {
    profileA: JohariPsychicProfile;
    profileB: JohariPsychicProfile;
    psychicPair: JohariPairCompat | null;
    destinyPair: JohariPairCompat | null;
    crossPairAB: JohariPairCompat | null;  // A's psychic ↔ B's destiny
    crossPairBA: JohariPairCompat | null;  // B's psychic ↔ A's destiny
    aViewOfB: "Friendly" | "Neutral" | "Enemy";
    bViewOfA: "Friendly" | "Neutral" | "Enemy";
  };
  /**
   * Soul Weather combined personal-year analysis. Populated from the
   * real personal-year numbers so callers don't have to recompute them.
   */
  combinedWeather?: CombinedWeatherReport;
  /**
   * Full verbatim Chinese zodiac compatibility paragraph for the
   * animal pair, sourced from Suzanne White's zodiacData. E.g. the
   * Dog entry's compatibilities["Rat"] paragraph placed here
   * verbatim (no edits, no summary).
   */
  chineseZodiacCompatText?: string;
  /**
   * Codified Western/Chinese (New Astrology) compatibility analysis:
   * each soul's Suzanne White compatibilities paragraph plus structured
   * appreciation/dissatisfaction indicators derived from whether the
   * partner's actual Western sign and Chinese animal appear in the
   * positive or avoidance portions of the paragraph.
   */
  newAstrologyCompat?: {
    aCompatText: string;
    bCompatText: string;
    aAppreciationOfB: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
    };
    aDissatisfactionWithB: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
    };
    bAppreciationOfA: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
    };
    bDissatisfactionWithA: {
      westernSignMatch: boolean;
      chineseAnimalMatch: boolean;
      combinedSignMatch: boolean;
      details: string;
    };
  };
}

// ---------------------------------------------------------------------
// Soul Weather: Direct + Classic personal-year readings with karmic/master
// awareness, wired to the app's own compound dictionary and famous-birthday
// bank instead of surfacing a bare "PY {number}".
// ---------------------------------------------------------------------

export interface PYReading {
  raw: number;
  reduced: number;
  compoundName: string | null;
  isKarmicDebt: boolean;
  isMasterNumber: boolean;
  thesis: string;
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
 
// Full 12x12 relation matrix: same-animal, secret friend (六合), trine (三合),
// six clash (六冲) and six harm (相害), plus a neutral fallback.
const ZODIAC_RELATIONS: Record<
  string,
  Record<string, { relation: string; score: number; note: string }>
> = {
  Rat: { Rat: { relation: "same", score: 72, note: "Understand each other's rhythm, but may double weaknesses" }, Ox: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — natural allies, complementary strengths" }, Tiger: { relation: "neutral", score: 65, note: "Different paces; Tiger acts, Rat plans" }, Rabbit: { relation: "neutral", score: 60, note: "Rabbit's caution meets Rat's opportunism" }, Dragon: { relation: "trine", score: 88, note: "Trine allies (三合) — Rat's cunning + Dragon's vision" }, Snake: { relation: "neutral", score: 58, note: "Snake's secrecy unsettles Rat's networking" }, Horse: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — direct opposition. Rat builds, Horse gallops away" }, Goat: { relation: "neutral", score: 55, note: "Goat's dreaminess frustrates Rat's pragmatism" }, Monkey: { relation: "trine", score: 88, note: "Trine allies (三合) — two tricksters, strong team" }, Rooster: { relation: "neutral", score: 62, note: "Rooster's precision irritates Rat's flexibility" }, Dog: { relation: "neutral", score: 60, note: "Dog's loyalty grounds Rat, but Rat feels judged" }, Pig: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Pig's generosity feeds Rat's schemes" } },
  Ox: { Rat: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Rat's agility + Ox's stamina" }, Ox: { relation: "same", score: 72, note: "Double stubbornness; shared values but slow progress" }, Tiger: { relation: "neutral", score: 55, note: "Tiger challenges Ox's routine" }, Rabbit: { relation: "neutral", score: 58, note: "Rabbit's diplomacy softens Ox, but Ox seems dull" }, Dragon: { relation: "neutral", score: 50, note: "Dragon's flash unsettles Ox's earthiness" }, Snake: { relation: "trine", score: 88, note: "Trine allies (三合) — Snake's wisdom + Ox's labor" }, Horse: { relation: "neutral", score: 52, note: "Horse's freedom threatens Ox's security needs" }, Goat: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Ox builds walls, Goat wanders" }, Monkey: { relation: "neutral", score: 60, note: "Monkey's tricks exhaust Ox's patience" }, Rooster: { relation: "trine", score: 88, note: "Trine allies (三合) — Rooster's show + Ox's substance" }, Dog: { relation: "neutral", score: 65, note: "Dog's vigilance + Ox's steadiness" }, Pig: { relation: "neutral", score: 70, note: "Pig's ease softens Ox; comfortable but unexciting" } },
  Tiger: { Rat: { relation: "neutral", score: 65, note: "Rat strategizes, Tiger executes" }, Ox: { relation: "neutral", score: 55, note: "Ox's slowness frustrates Tiger's urgency" }, Tiger: { relation: "same", score: 72, note: "Two tigers share courage but compete for dominance" }, Rabbit: { relation: "neutral", score: 62, note: "Tiger protects Rabbit, but Rabbit fears Tiger's temper" }, Dragon: { relation: "neutral", score: 68, note: "Dragon's ambition matches Tiger's, but both want to lead" }, Snake: { relation: "six-harm", score: 40, note: "Six Harms (相害) — mutual suspicion" }, Horse: { relation: "trine", score: 88, note: "Trine allies (三合) — speed + courage" }, Goat: { relation: "neutral", score: 58, note: "Goat's gentleness confuses Tiger's directness" }, Monkey: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Monkey outsmarts Tiger; Tiger feels mocked" }, Rooster: { relation: "neutral", score: 55, note: "Rooster's criticism wounds Tiger's pride" }, Dog: { relation: "trine", score: 88, note: "Trine allies (三合) — Dog's loyalty + Tiger's bravery" }, Pig: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Pig's warmth tames Tiger's fierceness" } },
  Rabbit: { Rat: { relation: "neutral", score: 60, note: "Rat's hustle overwhelms Rabbit's need for peace" }, Ox: { relation: "neutral", score: 58, note: "Ox's heaviness crushes Rabbit's delicacy" }, Tiger: { relation: "neutral", score: 62, note: "Tiger's protectiveness comforts Rabbit, but power imbalance" }, Rabbit: { relation: "same", score: 72, note: "Gentle harmony, but both avoid necessary conflict" }, Dragon: { relation: "six-harm", score: 40, note: "Six Harms (相害) — Dragon's dominance silences Rabbit" }, Snake: { relation: "neutral", score: 55, note: "Snake's intensity frightens Rabbit's softness" }, Horse: { relation: "neutral", score: 58, note: "Horse's restlessness unsettles Rabbit's nest" }, Goat: { relation: "trine", score: 88, note: "Trine allies (三合) — artistic, gentle harmony" }, Monkey: { relation: "neutral", score: 52, note: "Monkey's chaos disrupts Rabbit's order" }, Rooster: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Rooster's sharpness pierces Rabbit's vulnerability" }, Dog: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Dog's devotion shelters Rabbit" }, Pig: { relation: "trine", score: 88, note: "Trine allies (三合) — domestic bliss, shared comfort" } },
  Dragon: { Rat: { relation: "trine", score: 88, note: "Trine allies (三合) — visionary + tactical" }, Ox: { relation: "neutral", score: 50, note: "Ox's skepticism dampens Dragon's dreams" }, Tiger: { relation: "neutral", score: 68, note: "Two alphas; respect if territory is divided" }, Rabbit: { relation: "six-harm", score: 40, note: "Six Harms (相害) — Dragon's fire scorches Rabbit's garden" }, Dragon: { relation: "same", score: 72, note: "Double majesty; magnificent but combustible" }, Snake: { relation: "neutral", score: 65, note: "Snake's subtlety complements Dragon's grandeur" }, Horse: { relation: "neutral", score: 62, note: "Horse's independence challenges Dragon's command" }, Goat: { relation: "neutral", score: 55, note: "Goat's passivity disappoints Dragon's ambition" }, Monkey: { relation: "trine", score: 88, note: "Trine allies (三合) — Monkey executes Dragon's visions" }, Rooster: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Rooster's precision polishes Dragon's gold" }, Dog: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Dog's honesty exposes Dragon's illusions" }, Pig: { relation: "neutral", score: 60, note: "Pig's contentment baffles Dragon's striving" } },
  Snake: { Rat: { relation: "neutral", score: 58, note: "Rat's chatter disturbs Snake's meditation" }, Ox: { relation: "trine", score: 88, note: "Trine allies (三合) — Ox's patience + Snake's cunning" }, Tiger: { relation: "six-harm", score: 40, note: "Six Harms (相害) — Tiger's openness exposes Snake's plots" }, Rabbit: { relation: "neutral", score: 55, note: "Rabbit's innocence bores Snake's sophistication" }, Dragon: { relation: "neutral", score: 65, note: "Dragon's showmanship embarrasses Snake's subtlety" }, Snake: { relation: "same", score: 72, note: "Deep mutual understanding, but trust is slow" }, Horse: { relation: "neutral", score: 58, note: "Horse's gallop leaves Snake's coils behind" }, Goat: { relation: "neutral", score: 62, note: "Goat's art + Snake's depth = cultural power" }, Monkey: { relation: "six-harm", score: 40, note: "Six Harms (相害) — Monkey's tricks enrage Snake's dignity" }, Rooster: { relation: "trine", score: 88, note: "Trine allies (三合) — Rooster's display + Snake's strategy" }, Dog: { relation: "neutral", score: 55, note: "Dog's loyalty baffles Snake's self-interest" }, Pig: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Pig's naivety vs Snake's calculation" } },
  Horse: { Rat: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Horse's flight vs Rat's burrow" }, Ox: { relation: "neutral", score: 52, note: "Ox's barn confines Horse's prairie" }, Tiger: { relation: "trine", score: 88, note: "Trine allies (三合) — speed + courage" }, Rabbit: { relation: "neutral", score: 58, note: "Rabbit's caution reins Horse's wildness" }, Dragon: { relation: "neutral", score: 62, note: "Dragon's throne bores Horse's wanderlust" }, Snake: { relation: "neutral", score: 58, note: "Snake's stillness vs Horse's motion" }, Horse: { relation: "same", score: 72, note: "Two free spirits; magnificent but directionless together" }, Goat: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Goat's art + Horse's passion" }, Monkey: { relation: "neutral", score: 60, note: "Monkey's mischief spooks Horse's sincerity" }, Rooster: { relation: "neutral", score: 55, note: "Rooster's order cramps Horse's style" }, Dog: { relation: "trine", score: 88, note: "Trine allies (三合) — Dog's faithfulness + Horse's loyalty" }, Pig: { relation: "neutral", score: 65, note: "Pig's comfort attracts Horse's exhaustion" } },
  Goat: { Rat: { relation: "neutral", score: 55, note: "Rat's ambition exploits Goat's generosity" }, Ox: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Ox's discipline vs Goat's dreaminess" }, Tiger: { relation: "neutral", score: 58, note: "Tiger's force overwhelms Goat's gentleness" }, Rabbit: { relation: "trine", score: 88, note: "Trine allies (三合) — aesthetic soulmates" }, Dragon: { relation: "neutral", score: 55, note: "Dragon's demands exhaust Goat's reserves" }, Snake: { relation: "neutral", score: 62, note: "Snake's intensity intrigues Goat's mystery" }, Horse: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Horse carries Goat to dreams" }, Goat: { relation: "same", score: 72, note: "Double sensitivity; beautiful but fragile" }, Monkey: { relation: "neutral", score: 58, note: "Monkey's chaos disrupts Goat's peace" }, Rooster: { relation: "neutral", score: 55, note: "Rooster's criticism wounds Goat's softness" }, Dog: { relation: "neutral", score: 60, note: "Dog's protectiveness comforts Goat" }, Pig: { relation: "trine", score: 88, note: "Trine allies (三合) — domestic paradise" } },
  Monkey: { Rat: { relation: "trine", score: 88, note: "Trine allies (三合) — two strategists" }, Ox: { relation: "neutral", score: 60, note: "Ox's slowness bores Monkey's quickness" }, Tiger: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Monkey mocks Tiger's dignity" }, Rabbit: { relation: "neutral", score: 52, note: "Rabbit's fear triggers Monkey's cruelty" }, Dragon: { relation: "trine", score: 88, note: "Trine allies (三合) — Dragon's vision + Monkey's execution" }, Snake: { relation: "six-harm", score: 40, note: "Six Harms (相害) — Snake's dignity vs Monkey's mockery" }, Horse: { relation: "neutral", score: 60, note: "Horse's sincerity baffles Monkey's irony" }, Goat: { relation: "neutral", score: 58, note: "Goat's vulnerability makes Monkey uncomfortable" }, Monkey: { relation: "same", score: 72, note: "Double mischief; fun but untrustworthy" }, Rooster: { relation: "neutral", score: 62, note: "Rooster's vanity amuses Monkey" }, Dog: { relation: "neutral", score: 55, note: "Dog's honesty exposes Monkey's tricks" }, Pig: { relation: "neutral", score: 58, note: "Pig's simplicity baffles Monkey's complexity" } },
  Rooster: { Rat: { relation: "neutral", score: 62, note: "Rat's flexibility undermines Rooster's rules" }, Ox: { relation: "trine", score: 88, note: "Trine allies (三合) — Rooster's show + Ox's work" }, Tiger: { relation: "neutral", score: 55, note: "Tiger's sloppiness offends Rooster's precision" }, Rabbit: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Rooster's sharp tongue wounds Rabbit" }, Dragon: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Rooster's detail completes Dragon" }, Snake: { relation: "trine", score: 88, note: "Trine allies (三合) — Snake's depth + Rooster's display" }, Horse: { relation: "neutral", score: 55, note: "Horse's rebellion vs Rooster's order" }, Goat: { relation: "neutral", score: 55, note: "Goat's dreaminess frustrates Rooster's efficiency" }, Monkey: { relation: "neutral", score: 62, note: "Monkey's chaos disrupts Rooster's schedule" }, Rooster: { relation: "same", score: 72, note: "Double perfectionism; excellent or explosive" }, Dog: { relation: "neutral", score: 58, note: "Dog's bluntness + Rooster's bluntness" }, Pig: { relation: "neutral", score: 60, note: "Pig's messiness offends Rooster" } },
  Dog: { Rat: { relation: "neutral", score: 60, note: "Rat's self-interest troubles Dog's loyalty" }, Ox: { relation: "neutral", score: 65, note: "Ox's steadiness + Dog's vigilance" }, Tiger: { relation: "trine", score: 88, note: "Trine allies (三合) — Tiger's courage + Dog's faith" }, Rabbit: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Dog protects, Rabbit nourishes" }, Dragon: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Dog's truth vs Dragon's myth" }, Snake: { relation: "neutral", score: 55, note: "Snake's secrecy alarms Dog's transparency" }, Horse: { relation: "trine", score: 88, note: "Trine allies (三合) — Horse's freedom + Dog's devotion" }, Goat: { relation: "neutral", score: 60, note: "Goat's neediness exhausts Dog's reserves" }, Monkey: { relation: "neutral", score: 55, note: "Monkey's dishonesty triggers Dog's judgment" }, Rooster: { relation: "neutral", score: 58, note: "Rooster's criticism wounds Dog's sensitivity" }, Dog: { relation: "same", score: 72, note: "Double loyalty; faithful but both brood" }, Pig: { relation: "neutral", score: 70, note: "Pig's optimism lifts Dog's pessimism" } },
  Pig: { Rat: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Rat's cleverness + Pig's generosity" }, Ox: { relation: "neutral", score: 70, note: "Ox's labor + Pig's enjoyment" }, Tiger: { relation: "secret-friend", score: 92, note: "Secret friends (六合) — Pig's warmth tames Tiger" }, Rabbit: { relation: "trine", score: 88, note: "Trine allies (三合) — domestic bliss" }, Dragon: { relation: "neutral", score: 60, note: "Dragon's ambition overwhelms Pig's contentment" }, Snake: { relation: "six-clash", score: 35, note: "Six Clash (六冲) — Snake's calculation vs Pig's trust" }, Horse: { relation: "neutral", score: 65, note: "Horse's travel tempts Pig from home" }, Goat: { relation: "trine", score: 88, note: "Trine allies (三合) — artistic, sensual, peaceful" }, Monkey: { relation: "neutral", score: 58, note: "Monkey's tricks exploit Pig's trust" }, Rooster: { relation: "neutral", score: 60, note: "Rooster's criticism hurts Pig's softness" }, Dog: { relation: "neutral", score: 70, note: "Dog's protection + Pig's nourishment" }, Pig: { relation: "same", score: 72, note: "Double indulgence; blissful but potentially lazy" } },
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
 
function chineseZodiacRelation(aAnimal: string, bAnimal: string): { score: number; relation: string; note: string } {
  return ZODIAC_RELATIONS[aAnimal]?.[bAnimal] || { score: 50, relation: "unknown", note: "No specific relation data for this pairing" };
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
  const westernSign = getWesternZodiacSign(day, month);
 
  // Reuse the app's own Lo Shu grid generator (numerology.ts) rather than
  // re-deriving the digit algorithm here, so this stays in sync with any
  // future changes to the Lo Shu methodology.
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
    aFillsB.length > 0
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
function comparePsychomatrixLines(a: SoulVitals, b: SoulVitals) {
  const ac = a.psychomatrixCounts;
  const bc = b.psychomatrixCounts;
  const sum = (c: Record<number, number>, digits: number[]) => digits.reduce((t, d) => t + (c[d] || 0), 0);
  const compare = (aVal: number, bVal: number, label: string): string => {
    const diff = aVal - bVal;
    if (Math.abs(diff) <= 1) return `${label}: Equal — shared ${label.toLowerCase()} intensity.`;
    const leader = diff > 0 ? a.name : b.name;
    const follower = diff > 0 ? b.name : a.name;
    return `${label}: ${leader} leads with ${Math.abs(diff)} more — ${follower} is supported.`;
  };
  return {
    willpower: compare(sum(ac, [1, 4, 7]), sum(bc, [1, 4, 7]), "Willpower"),
    energy: compare(sum(ac, [2, 5, 8]), sum(bc, [2, 5, 8]), "Energy"),
    stability: compare(sum(ac, [3, 6, 9]), sum(bc, [3, 6, 9]), "Stability"),
    purpose: compare(sum(ac, [1, 2, 3]), sum(bc, [1, 2, 3]), "Purpose"),
    family: compare(sum(ac, [4, 5, 6]), sum(bc, [4, 5, 6]), "Family/Health"),
    habits: compare(sum(ac, [7, 8, 9]), sum(bc, [7, 8, 9]), "Habits/Talent"),
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
// Personal Year interaction: how two people's current-cycle personal
// years collide or harmonize, with explicit karmic-debt / master-number
// awareness (previously absent from the relationship engine entirely).
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
// Main entry point
// ---------------------------------------------------------------------
 
// ---------------------------------------------------------------------
// Codify Suzanne White: parse the compatibilities paragraph to detect
// whether a partner's actual Western sign and Chinese animal appear in
// the positive (appreciation) or negative (dissatisfaction/avoidance)
// portion of the text.
// ---------------------------------------------------------------------
// Avoidance keywords — Suzanne White data uses curly apostrophes (U+2019)
// so both variants are included. The approach is sentence-level: each
// sentence is checked individually for avoidance language, and sign
// mentions within that sentence are classified accordingly.
const AVOID_SENTENCE_PATTERN = /stay away|avoid|leave|wide berth|poison|don\u2019t|don't|shun|refrain|give.*(?:slip|berth)|flee|disastrous|bother with|not to be|too.*(?:cool|much|heady)|unnerve|exasperate|overpower|won\u2019t|won't|can\u2019t|can't|shouldn\u2019t|shouldn't|mustn\u2019t|mustn't|wouldn\u2019t|wouldn't|don\u2019t pick|don't pick|don\u2019t marry|don't marry|don\u2019t go|don't go|don\u2019t bother|don't bother|not to be trusted/gi;

function codifySuzanneWhite(
  sourceText: string,
  partnerCombinedSign: string,
  partnerWestern: string,
  partnerAnimal: string,
): {
  appreciation: { westernSignMatch: boolean; chineseAnimalMatch: boolean; combinedSignMatch: boolean; details: string };
  dissatisfaction: { westernSignMatch: boolean; chineseAnimalMatch: boolean; combinedSignMatch: boolean; details: string };
} {
  const lower = sourceText.toLowerCase();
  const lowerCombined = partnerCombinedSign.toLowerCase();
  const lowerWestern = partnerWestern.toLowerCase();
  const lowerAnimal = partnerAnimal.toLowerCase();

  // Split text into sentences for per-sentence classification.
  // This avoids the fundamental flaw of splitting at a single
  // boundary point — a sign can appear in a positive sentence
  // AND a negative sentence in the same paragraph.
  const sentences = lower.match(/[^.!?]+[.!?]+/g) || [lower];

  let appreciationWestern = false;
  let appreciationAnimal = false;
  let appreciationCombined = false;
  let dissatisfactionWestern = false;
  let dissatisfactionAnimal = false;
  let dissatisfactionCombined = false;
  const appreciationDetails: string[] = [];
  const dissatisfactionDetails: string[] = [];

  for (const sentence of sentences) {
    const hasAvoid = AVOID_SENTENCE_PATTERN.test(sentence);
    // Reset lastIndex for each iteration (gi flag)
    AVOID_SENTENCE_PATTERN.lastIndex = 0;

    const hasCombined = sentence.includes(lowerCombined);
    const hasWestern = sentence.includes(lowerWestern);
    const hasAnimal = sentence.includes(lowerAnimal);

    if (!hasWestern && !hasAnimal && !hasCombined) continue;

    if (hasAvoid) {
      // This sentence contains avoidance/caution language AND mentions
      // the partner's sign(s) → classified as dissatisfaction
      if (hasCombined) {
        dissatisfactionCombined = true;
        dissatisfactionDetails.push(`${partnerCombinedSign} is discouraged ("${sentence.trim().slice(0, 60)}…")`);
      } else {
        if (hasWestern) {
          dissatisfactionWestern = true;
          dissatisfactionDetails.push(`${partnerWestern} appears in a caution sentence ("${sentence.trim().slice(0, 60)}…")`);
        }
        if (hasAnimal) {
          dissatisfactionAnimal = true;
          dissatisfactionDetails.push(`${partnerAnimal} appears in a caution sentence ("${sentence.trim().slice(0, 60)}…")`);
        }
      }
    } else {
      // This sentence has NO avoidance language AND mentions the
      // partner's sign(s) → classified as appreciation
      if (hasCombined) {
        appreciationCombined = true;
        appreciationDetails.push(`${partnerCombinedSign} is recommended ("${sentence.trim().slice(0, 60)}…")`);
      } else {
        if (hasWestern) {
          appreciationWestern = true;
          appreciationDetails.push(`${partnerWestern} appears in a recommendation ("${sentence.trim().slice(0, 60)}…")`);
        }
        if (hasAnimal) {
          appreciationAnimal = true;
          appreciationDetails.push(`${partnerAnimal} appears in a recommendation ("${sentence.trim().slice(0, 60)}…")`);
        }
      }
    }
  }

  if (appreciationDetails.length === 0)
    appreciationDetails.push(`No explicit recommendation found for ${partnerCombinedSign}`);
  if (dissatisfactionDetails.length === 0)
    dissatisfactionDetails.push(`No explicit caution found for ${partnerCombinedSign}`);

  return {
    appreciation: {
      westernSignMatch: appreciationWestern,
      chineseAnimalMatch: appreciationAnimal,
      combinedSignMatch: appreciationCombined,
      details: appreciationDetails.join("; "),
    },
    dissatisfaction: {
      westernSignMatch: dissatisfactionWestern,
      chineseAnimalMatch: dissatisfactionAnimal,
      combinedSignMatch: dissatisfactionCombined,
      details: dissatisfactionDetails.join("; "),
    },
  };
}

export function generateSoulResonance(a: SoulVitals, b: SoulVitals, targetYear = new Date().getFullYear()): SoulResonanceReport {
  const psychicHarmony = cheiroHarmony(a.psychic, b.psychic);
  const destinyHarmony = cheiroHarmony(a.destiny, b.destiny);
  const lifePathHarmony = cheiroHarmony(a.lifePath, b.lifePath);
  const johari = johariRelation(a.psychic, b.psychic);
  const chinese = chineseZodiacRelation(a.zodiacAnimal, b.zodiacAnimal);
  const loShu = analyzeLoShuOverlay(a, b);
  const psychoCompare = comparePsychomatrixLines(a, b);
  const pyInteraction = analyzePYInteraction(a, b, targetYear);

  // ── Johari rich compatibility (new) ────────────────────────────────
  const johariCompat = (() => {
    const profileA = JOHARI_PSYCHIC_PROFILES[reduceSingle(a.psychic)];
    const profileB = JOHARI_PSYCHIC_PROFILES[reduceSingle(b.psychic)];
    if (!profileA || !profileB) return undefined;
    return {
      profileA,
      profileB,
      psychicPair: getJohariPairCompatibility(a.psychic, b.psychic),
      destinyPair: getJohariPairCompatibility(a.destiny, b.destiny),
      crossPairAB: getJohariPairCompatibility(a.psychic, b.destiny),
      crossPairBA: getJohariPairCompatibility(b.psychic, a.destiny),
      aViewOfB: johariViewOf(reduceSingle(a.psychic), reduceSingle(b.psychic)),
      bViewOfA: johariViewOf(reduceSingle(b.psychic), reduceSingle(a.psychic)),
    };
  })();

  // ── Combined Soul Weather (new) ─────────────────────────────────────
  const aPY = reduceNum(computeRawPersonalYear(a.day, a.month, targetYear));
  const bPY = reduceNum(computeRawPersonalYear(b.day, b.month, targetYear));
  const combinedWeather = generateCombinedWeather(aPY, bPY);
 
  const romanceScore = Math.round(
    psychicHarmony.score * 0.30 + loShu.voidFill.score * 0.25 + chinese.score * 0.20 + johari.score * 0.15 + psychicHarmony.score * 0.10,
  );
  const partnershipScore = Math.round(
    destinyHarmony.score * 0.30 + (psychoCompare.willpower.includes("leads") ? 75 : 65) * 0.20 + chinese.score * 0.15 + lifePathHarmony.score * 0.20 + loShu.amplification.score * 0.15,
  );
  const friendshipScore = Math.round(
    johari.score * 0.30 + lifePathHarmony.score * 0.20 + (a.combinedSign === b.combinedSign ? 90 : 60) * 0.15 + psychicHarmony.score * 0.15 + loShu.voidFill.score * 0.20,
  );
  const overall = Math.round((romanceScore + partnershipScore + friendshipScore) / 3);
 
  const layers: ResonanceLayer[] = [
    { label: "Psychic Vibration", score: psychicHarmony.score, verdict: psychicHarmony.label, detail: `Birth-day resonance: ${a.psychic} and ${b.psychic} — ${psychicHarmony.label}.`, domainWeights: { romance: 30, partnership: 15, friendship: 15 } },
    { label: "Destiny Vibration", score: destinyHarmony.score, verdict: destinyHarmony.label, detail: `Life-purpose resonance: ${a.destiny} and ${b.destiny} — ${destinyHarmony.label}.`, domainWeights: { romance: 10, partnership: 30, friendship: 10 } },
    { label: "Life Path", score: lifePathHarmony.score, verdict: lifePathHarmony.label, detail: `Journey resonance: ${a.lifePath} and ${b.lifePath}.`, domainWeights: { romance: 10, partnership: 20, friendship: 20 } },
    { label: "Vedic Johari", score: johari.score, verdict: johari.label, detail: johari.note, domainWeights: { romance: 15, partnership: 10, friendship: 30 } },
    { label: "Chinese Zodiac", score: chinese.score, verdict: chinese.relation, detail: chinese.note, domainWeights: { romance: 20, partnership: 15, friendship: 15 } },
    { label: "Lo Shu Void Fill", score: loShu.voidFill.score, verdict: loShu.voidFill.numbers.length > 0 ? "karmic completion" : "self-contained", detail: loShu.voidFill.narrative, domainWeights: { romance: 25, partnership: 5, friendship: 20 } },
    { label: "Lo Shu Amplification", score: loShu.amplification.score, verdict: loShu.amplification.numbers.length > 0 ? "shared power" : "complementary", detail: loShu.amplification.narrative, domainWeights: { romance: 5, partnership: 15, friendship: 5 } },
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
    // ── Chinese Zodiac Compatibility Text (verbatim) ────────────────
    chineseZodiacCompatText:
      zodiacData[a.zodiacAnimal]?.compatibilities?.[b.zodiacAnimal] ||
      zodiacData[b.zodiacAnimal]?.compatibilities?.[a.zodiacAnimal] ||
      "",
    // ── New Astrology Codified Compatibility ─────────────────────────
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
 
// Lazily built + memoized: buildSoulVitals() runs a Lo Shu grid pass and a
// psychomatrix pass per person, so eagerly mapping this over the full
// ~1,650-entry famous-birthdays bank at module-import time would spend that
// cost on every screen that merely imports this module, even ones that
// never touch the famous-birthday features. Computing it once, on first
// actual use, keeps import-time cost at zero while still only paying the
// full cost a single time for the lifetime of the session.
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
  const subjectWestern = getWesternZodiacSign(subject.day, subject.month);
 
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
// Soul Weather report: turns the raw PY numbers into a full forecast with
// compound naming, karmic/master alerts, age band, and famous year-mates —
// so the dashboard has something richer than "PY {number}" to render.
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