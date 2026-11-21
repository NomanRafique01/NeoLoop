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
    prompt:    '#f2f2f2',   // Bone white  — '>' prompt symbol      (LOGO_BODY)
    text:      '#ff3b47',   // Hot red     — user typed text & log  (TAGLINE)
    highlight: '#c1121f',   // Blood red   — selection highlight    (LOGO_SHADING)
    border:    '#f2f2f2',   // Bone white  — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#c1121f',      // Blood red   — [neoloop] badge        (LOGO_SHADING)
    text:   '#ff3b47',      // Hot red     — agent response body    (TAGLINE)
    dim:    '#7a0c14',      // Deep crimson — dim / muted agent info
    accent: '#ffffff',      // Pure white  — agent tool/success accent (HEAD)
  },
};

export default redEclipseTalk;
