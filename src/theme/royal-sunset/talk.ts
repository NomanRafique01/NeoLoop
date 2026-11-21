/**
 * Royal Sunset Theme — User & Agent Conversation Styling (v3 — Ocean Sunset)
 *
 * Four-token palette:
 *   LOGO_BODY    #ff5e3a  Vermilion        — logo fill, borders, prompt >
 *   LOGO_SHADING #0e4d64  Deep ocean teal  — logo shadow, placeholder, history
 *   TAGLINE      #f9c74f  Saffron          — tagline, typed text
 *   HEAD         #fff4e0  Warm cream       — rain heads, blinking cursor
 *
 * Aesthetic: sunset over the sea — warm vermilion sun glowing over deep
 * ocean-teal shadows, with golden saffron text and soft warm-cream highlights.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const royalSunsetTalk: TalkColorTokens = {
  user: {
    prompt:    '#ff5e3a',   // Vermilion        — '>' prompt symbol      (LOGO_BODY)
    text:      '#f9c74f',   // Saffron          — user typed text & log  (TAGLINE)
    highlight: '#ff5e3a',   // Vermilion        — selection highlight    (LOGO_BODY)
    border:    '#ff5e3a',   // Vermilion        — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#ff5e3a',      // Vermilion        — [neoloop] badge        (LOGO_BODY)
    text:   '#f9c74f',      // Saffron          — agent response body    (TAGLINE)
    dim:    '#0e4d64',      // Deep ocean teal  — dim / muted agent info (LOGO_SHADING)
    accent: '#fff4e0',      // Warm cream       — agent tool/success accent (HEAD)
  },
};

export default royalSunsetTalk;
