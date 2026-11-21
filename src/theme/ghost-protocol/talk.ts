/**
 * Ghost Protocol Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #e5e7eb  Light silver — logo fill, borders, prompt >
 *   LOGO_SHADING #374151  Charcoal     — logo shadow, placeholder, history
 *   TAGLINE      #ef4444  Signal red   — tagline, typed text
 *   HEAD         #ffffff  Pure white   — rain heads, blinking cursor
 *
 * Aesthetic: stealth spy-tool monochrome with a single blazing signal red accent.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const ghostProtocolTalk: TalkColorTokens = {
  user: {
    prompt:    '#e5e7eb',   // Light silver — '>' prompt symbol      (LOGO_BODY)
    text:      '#ef4444',   // Signal red   — user typed text & log  (TAGLINE)
    highlight: '#ef4444',   // Signal red   — selection highlight    (TAGLINE)
    border:    '#e5e7eb',   // Light silver — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#ef4444',      // Signal red   — [neoloop] badge        (TAGLINE - pops against silver)
    text:   '#e5e7eb',      // Light silver — agent response body    (LOGO_BODY)
    dim:    '#374151',      // Charcoal     — dim / muted agent info (LOGO_SHADING)
    accent: '#ffffff',      // Pure white   — agent tool/success accent (HEAD)
  },
};

export default ghostProtocolTalk;
