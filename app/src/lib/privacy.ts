/**
 * MYSTIQUE COMPASS — Privacy Policy
 *
 * The app sends a persistent device UUID plus IP-derived country to a
 * third-party worker while the analytics dashboard advertises "no personal
 * data collected". Under GDPR and Kenya's Data Protection Act 2019 that is
 * pseudonymous personal data, not anonymous. This page states what is
 * actually collected, why, and how to stop it.
 */

export const PRIVACY_LAST_UPDATED = '2026-11-25';

export const PRIVACY_SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: 'What we collect',
    body:
      'Three event types: app install, share, and session start. Each carries a ' +
      'timestamp and a randomly generated device identifier (a UUID created on ' +
      'first launch and stored in your browser\'s localStorage). Country is ' +
      'derived server-side from the request IP. No name, email, phone number, ' +
      'birth date or reading content is ever transmitted.',
  },
  {
    title: 'Why it is not anonymous',
    body:
      'A persistent identifier combined with IP-derived location is pseudonymous ' +
      'personal data under GDPR and Kenya\'s Data Protection Act 2019. We are ' +
      'saying so plainly because calling it "anonymous" would be inaccurate. ' +
      'It cannot identify you by name, but it can distinguish your device from ' +
      'others over time.',
  },
  {
    title: 'Why we collect it',
    body:
      'To know whether the app is being installed, opened and shared, and which ' +
      'countries it reaches — nothing more. Your numerology inputs are computed ' +
      'entirely on your device and are never sent anywhere.',
  },
  {
    title: 'Retention',
    body:
      'Raw event batches are retained for 90 days, after which only aggregated ' +
      'counts (installs, sessions, shares, per-country totals) are kept. The ' +
      'device identifier is never joined to any other dataset.',
  },
  {
    title: 'How to opt out',
    body:
      'Clear this site\'s localStorage (the key `mystique-device-id`) and block ' +
      'requests to mystique-analytics.sksalemking.workers.dev in your browser. ' +
      'Both stop all future events. Nothing already sent can be withdrawn, ' +
      'which is another reason we keep the payload minimal.',
  },
  {
    title: 'Your rights',
    body:
      'Under GDPR Articles 15-20 and the Kenyan DPA you may request access to, ' +
      'correction of, or erasure of the data linked to your device identifier. ' +
      'Because we hold no name or contact details, requests must include the ' +
      'identifier itself so we can find the record.',
  },
  {
    title: 'Third parties',
    body:
      'Events are processed by a Cloudflare Worker. Wikipedia\'s API is called ' +
      'directly from your browser when you search for a person, subject to ' +
      'Wikimedia\'s privacy policy. No analytics or advertising SDKs are ' +
      'present.',
  },
];
