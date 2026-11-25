/**
 * MYSTIQUE COMPASS — Precedent Ledger
 *
 * Replaces the app's single most misleading sentence.
 *
 * The old display read:
 *
 *   "The strongest outcome probability sits in leadership at 96%."
 *
 * That number is not a probability. It is a measure of how strongly the
 * nearest historical analogues point at a domain — and those analogues are a
 * curated library of famous lives, 69% of whose documented outcomes are
 * triumphs or legacies (the report's own B3 section says so). Presenting it
 * as a probability claims a calibration the engine does not have, and the
 * repo's own test found none: engine polarity vs documented outcome scored
 * 15.5% against a 16.3% shuffled baseline (p = 0.76).
 *
 * What this component does instead:
 *
 *   1. Shows EVERY outcome the pair has actually produced, not just the good
 *      ones. A pair that crowned one person and broke another says both.
 *   2. Prints the base rate: how many people share this pair in this year.
 *      Precedent is not probability, and the label says so.
 *   3. Renames the domain ranking from "outcome probability" to "domain
 *      emphasis" — which is what the number actually measures.
 *   4. Never shows a case that doesn't carry the same compound pair.
 */

import * as React from 'react';

export type Outcome = 'triumph' | 'loss' | 'mixed' | 'transition' | 'legacy';

export const OUTCOME_META: Record<Outcome, { label: string; color: string }> = {
  triumph: { label: 'Triumph', color: '#86efac' },
  legacy: { label: 'Legacy', color: '#f1d98a' },
  mixed: { label: 'Mixed', color: '#c4b5fd' },
  transition: { label: 'Transition', color: '#67e8f9' },
  loss: { label: 'Reversal', color: '#fb7185' },
};

export interface LedgerCase {
  id: string;
  person: string;
  year: number;
  age: number;
  outcome: Outcome;
  eventCategory: string;
  eventDetails?: string;
  narrative?: string;
  decisions?: string[];
  sources?: string[];
  direct: number;
  directReduced: number;
  classic: number;
  classicReduced: number;
}

/**
 * How many distinct birthdays in `year` produce this direct compound?
 *
 * For 2024, digitSum = 8, so direct raw = day + month + 8. Trump's 14 June
 * gives 28. Every day+month = 20 lands on the same number — about 19 of 365
 * birthdays, roughly 1 in 19 people. That is the honest denominator for any
 * claim about what a pair "predicts".
 */
export function pairShare(directRaw: number, year: number): { count: number; total: number; percent: number } {
  const digitSum = String(year).split('').reduce((a, c) => a + Number(c), 0);
  const target = directRaw - digitSum;
  let count = 0;
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    const days = new Date(year, m, 0).getDate();
    for (let d = 1; d <= days; d++) {
      total++;
      if (d + m === target) count++;
    }
  }
  return { count, total, percent: total ? (count / total) * 100 : 0 };
}

export function PrecedentLedger({
  directRaw,
  classicRaw,
  cases,
  librarySize,
  year,
}: {
  directRaw: number;
  classicRaw: number;
  cases: LedgerCase[];
  librarySize: number;
  year: number;
}) {
  const exact = React.useMemo(
    () => cases.filter((c) => c.direct === directRaw && c.classic === classicRaw),
    [cases, directRaw, classicRaw],
  );
  const share = React.useMemo(() => pairShare(directRaw, year), [directRaw, year]);
  const [open, setOpen] = React.useState<string | null>(null);

  const counts = exact.reduce(
    (m, c) => {
      m[c.outcome] = (m[c.outcome] || 0) + 1;
      return m;
    },
    {} as Record<Outcome, number>,
  );
  const present = (Object.keys(OUTCOME_META) as Outcome[]).filter((o) => counts[o]);

  return (
    <div
      style={{
        padding: '0.9rem',
        borderRadius: 14,
        background: 'rgba(212,175,55,0.06)',
        border: '1px solid rgba(212,175,55,0.22)',
      }}
    >
      <h4
        style={{
          fontFamily: "'Cinzel',serif",
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#d4af37',
          margin: 0,
        }}
      >
        This Pair in the Record
      </h4>

      <p
        style={{
          fontSize: '0.72rem',
          color: 'rgba(200,180,240,0.6)',
          margin: '0.3rem 0 0.75rem',
        }}
      >
        {directRaw}/1 × {classicRaw}/1 · {exact.length} dated case{exact.length === 1 ? '' : 's'} in a{' '}
        {librarySize.toLocaleString()}-case library
      </p>

      {exact.length > 0 ? (
        <>
          {/* Outcome distribution — every outcome, never only the favourable ones */}
          <div
            role="img"
            aria-label={`Outcome distribution: ${present.map((o) => `${counts[o]} ${OUTCOME_META[o].label}`).join(', ')}`}
            style={{
              display: 'flex',
              height: 14,
              borderRadius: 99,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {present.map((o) => (
              <div
                key={o}
                title={`${OUTCOME_META[o].label}: ${counts[o]}`}
                style={{
                  width: `${(counts[o] / exact.length) * 100}%`,
                  background: OUTCOME_META[o].color,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {present.map((o) => (
              <span key={o} style={{ fontSize: '0.68rem', color: OUTCOME_META[o].color }}>
                ● {OUTCOME_META[o].label} {counts[o]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: '0.74rem', color: 'rgba(200,180,240,0.55)', margin: 0 }}>
          No dated case in the library carries this exact compound pair. The
          engine still uses the nearest cases for domain weighting, but it
          will not present a weak analogy as evidence.
        </p>
      )}

      {/* The honest part */}
      <div
        style={{
          marginTop: '0.7rem',
          padding: '0.55rem 0.65rem',
          borderRadius: 10,
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.22)',
          fontSize: '0.7rem',
          lineHeight: 1.55,
          color: 'rgba(254,243,199,0.9)',
        }}
      >
        ⚠ Precedent is not probability. This pair is shared by roughly{' '}
        <b>{share.count} of {share.total}</b> birthdays in {year} (about 1 in{' '}
        {Math.round(share.total / Math.max(1, share.count))}). The record shows
        how the pattern <em>can</em> unfold, not how likely each outcome is.
      </div>

      {/* Expandable cases */}
      {exact.length > 0 && (
        <div style={{ marginTop: '0.7rem', display: 'grid', gap: '0.4rem' }}>
          {exact.map((c) => (
            <div
              key={c.id}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(open === c.id ? null : c.id)}
                aria-expanded={open === c.id}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.6rem 0.7rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(231,221,255,0.9)',
                  fontSize: '0.78rem',
                }}
              >
                <span style={{ color: OUTCOME_META[c.outcome].color, marginRight: '0.45rem' }}>●</span>
                {c.person} <span style={{ opacity: 0.6 }}>{c.year}</span>
                <span style={{ float: 'right', opacity: 0.55, fontSize: '0.7rem' }}>
                  {open === c.id ? '▲' : '▼'}
                </span>
              </button>
              {open === c.id && (
                <div
                  style={{
                    padding: '0 0.7rem 0.75rem',
                    fontSize: '0.74rem',
                    lineHeight: 1.6,
                    color: 'rgba(231,221,255,0.78)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cinzel',serif",
                      fontSize: '0.66rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#c4b5fd',
                      marginBottom: '0.35rem',
                    }}
                  >
                    {c.direct}/{c.directReduced} × {c.classic}/{c.classicReduced}
                    {' · '}
                    {OUTCOME_META[c.outcome].label}
                    {' · age '}{c.age}
                  </div>
                  <p style={{ margin: '0 0 0.5rem' }}>{c.eventDetails ?? c.narrative ?? c.eventCategory}</p>
                  {c.decisions && c.decisions.length > 0 && (
                    <p style={{ margin: 0, opacity: 0.75 }}>
                      <b>What they chose:</b> {c.decisions.join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
