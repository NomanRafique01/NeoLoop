/**
 * Neon Tokyo Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #ff2e63  Hot red-pink — logo fill, borders, prompt >
 *   LOGO_SHADING #08d9d6  Teal        — logo shadow, placeholder, history
 *   TAGLINE      #ffd460  Warm yellow  — tagline, typed text
 *   HEAD         #f5f5f5  Soft white   — rain heads, blinking cursor
 *
 * Aesthetic contrast: hot red-pink user vs complementary teal system,
 * with warm yellow text punching through the dark canvas.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const neonTokyoTalk: TalkColorTokens = {
  user: {
    prompt:    '#ff2e63',   // Hot red-pink — '>' prompt symbol      (LOGO_BODY)
    text:      '#ffd460',   // Warm yellow  — user typed text & log  (TAGLINE)
    highlight: '#ff2e63',   // Hot red-pink — selection highlight    (LOGO_BODY)
    border:    '#ff2e63',   // Hot red-pink — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#ff2e63',      // Hot red-pink — [neoloop] badge        (LOGO_BODY)
    text:   '#08d9d6',      // Teal         — agent response body    (LOGO_SHADING)
    dim:    '#067a78',      // Deep teal    — dim / muted agent info  (darkened LOGO_SHADING)
    accent: '#f5f5f5',      // Soft white   — agent tool/success accent (HEAD)
  },
};

export default neonTokyoTalk;
