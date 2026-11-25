# Mystique Compass

Free numerology, psychomatrix and astrology profile generator (PWA).
Live: https://mystique-compass.pages.dev

## Develop
```bash
npm install --legacy-peer-deps
npm run dev        # local dev server
npm test           # engine unit tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run validate   # unit tests + predictive guard + compat guard + accuracy sweep
npm run build      # production build + static SEO pages into dist/
```

## Deploy

Every push to `main` — and every pull request against it — runs the full gate:

typecheck → unit tests → full validation → build → deploy

The workflow lives at `.github/workflows/deploy-cloudflare.yml`. It needs two
repository secrets: `CLOUDFLARE_API_TOKEN` (Pages: Edit) and
`CLOUDFLARE_ACCOUNT_ID`. Without them the tests still run and the deploy step
is skipped.

Manual deploy: `npx wrangler pages deploy dist --project-name=mystique-compass --branch=main`

## Rollback

Cloudflare Pages keeps every deployment: Dashboard → Pages → mystique-compass →
Deployments → pick the previous one → "Rollback to this deployment".

## Layout

- `src/lib/` deterministic engines and interpretation data
- `src/lib/zodiac-relations.ts` the single Chinese-zodiac scale
- `src/lib/suzanne-white-classifier.ts` the single New Astrology classifier
- `src/lib/numerology/synthesis-voice.ts` varied prose for the dual-essence synthesis
- `src/components/profile-generator/` UI; `results-display` and the engines are lazy-loaded
- `scripts/build-seo-pages.ts` static /life-path, /psychic-number, /chinese-zodiac pages + sitemap
- `public/` static files (_headers, manifest, icons, /stats dashboard)

## Accuracy

The celebrity accuracy harness is `scripts/validate-celebrity-accuracy.ts`, run
by `npm run validate`. The last full audit is in
`IMPROVEMENTS_AND_ACCURACY_REPORT.md` at the repo root — including the honest
finding that the personal-year engine shows no predictive skill against a
shuffled baseline (p = 0.76). Read it before making any predictive claim in the
copy.
