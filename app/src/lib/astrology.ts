// src/lib/astrology.ts
import { CHINESE_CALENDAR } from './new-astrology/chinese-calendar';
import type { AstroInsightOutput } from '@/components/profile-generator/types';
import { zodiacData } from './zodiac';
import { NEW_ASTROLOGY_DATA } from './new-astrology';


// Helper function to get the Western Zodiac sign
export const getWesternZodiacSign = (day: number, month: number): string => {
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  return "Capricorn";
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** ISO date string (YYYY-MM-DD). Compared as text so the result never depends on the device's time zone. */
const isoDate = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;

export const getChineseZodiacSign = (day: number, month: number, year: number) => {
  const birth = isoDate(year, month, day);

  for (const zodiacYear of CHINESE_CALENDAR) {
    if (birth >= zodiacYear.start && birth <= zodiacYear.end) {
      const [element, sign] = zodiacYear.title.split(' ');
      return { sign, element };
    }
  }

  // Outside the 1915–2036 lunar table: use the solar new year (Li Chun, ~4 Feb),
  // the boundary BaZi uses, so January/early-February births fall in the previous year.
  const signs = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
  const elements = ["Wood", "Fire", "Earth", "Metal", "Water"];
  const zodiacYearNum = (month < 2 || (month === 2 && day < 4)) ? year - 1 : year;
  const yearOffset = zodiacYearNum - 1924; // 1924 = Wood Rat
  const signIndex = ((yearOffset % 12) + 12) % 12;
  const elementIndex = Math.floor((((yearOffset % 10) + 10) % 10) / 2);

  return { sign: signs[signIndex], element: elements[elementIndex] };
};

/**
 * Sun-sign boundaries move by about a day from year to year. When a birthday is
 * within one day of a boundary, return the neighbouring sign so the UI can say
 * "born on the cusp".
 */
export const getWesternCusp = (day: number, month: number): string | null => {
  const sign = getWesternZodiacSign(day, month);
  const prev = new Date(Date.UTC(2001, month - 1, day - 1));
  const next = new Date(Date.UTC(2001, month - 1, day + 1));
  const before = getWesternZodiacSign(prev.getUTCDate(), prev.getUTCMonth() + 1);
  const after = getWesternZodiacSign(next.getUTCDate(), next.getUTCMonth() + 1);
  if (before !== sign) return before;
  if (after !== sign) return after;
  return null;
};

export async function getAstroInsight(input: { name: string; day: number; month: number; year: number; gender: string }): Promise<AstroInsightOutput> {
    const { year, month, day, name, gender } = input;
    
    const western_sign = getWesternZodiacSign(day, month);
    const { sign, element } = getChineseZodiacSign(day, month, year);
    
    // Data for the Chinese Zodiac sub-tabs
    const signDataForZodiac = zodiacData[sign as keyof typeof zodiacData] || {};
    
    // Data for the "New Astrology" combined sign modal
    const newAstrologySignKey = `${western_sign}/${sign}`;
    const signDataForNewAstrology = NEW_ASTROLOGY_DATA[newAstrologySignKey as keyof typeof NEW_ASTROLOGY_DATA] || {};

    return {
        name,
        western_sign,
        western_cusp: getWesternCusp(day, month),
        sign,
        element,
        month,
        year,
        gender,
        new_astrology_sign: newAstrologySignKey,
        zodiacData: signDataForZodiac,
        signData: signDataForNewAstrology,
    };
}
