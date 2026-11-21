/**
 * Red Eclipse Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #f2f2f2  Bone white — logo fill, borders, prompt >
 *   LOGO_SHADING #c1121f  Blood red  — logo shadow, placeholder, history
 *   TAGLINE      #ff3b47  Hot red    — tagline, typed text
 *   HEAD         #ffffff  Pure white — rain heads, blinking cursor
 *
 * Aesthetic: stark bone white moon eclipsing a crimson blood-red aura,
 * with vibrant hot-red typed text and razor-sharp pure-white highlights.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const redEclipseTalk: TalkColorTokens = {
  user: {
    prompt:    '#ff3b47',   // Hot red     — '>' prompt symbol      (TAGLINE)
    text:      '#f2f2f2',   // Bone white  — user typed text & log  (LOGO_BODY)
    highlight: '#c1121f',   // Blood red   — selection highlight    (LOGO_SHADING)
    border:    '#ff3b47',   // Hot red     — input bar dashed border (TAGLINE)
  },
  agent: {
    badge:  '#c1121f',      // Blood red   — [neoloop] badge        (LOGO_SHADING)
    text:   '#f2f2f2',      // Bone white  — agent response body    (LOGO_BODY)
    dim:    '#7a0c14',      // Deep crimson — dim / muted agent info
    accent: '#ffffff',      // Pure white  — agent tool/success accent (HEAD)
  },
};

export default redEclipseTalk;
