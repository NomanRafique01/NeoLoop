/**
 * Aurora Mint Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #5eead4  Mint teal         — logo fill, borders, prompt >
 *   LOGO_SHADING #0f4c5c  Deep petrol blue  — logo shadow, placeholder, history
 *   TAGLINE      #fb923c  Soft orange       — tagline, typed text
 *   HEAD         #f0fdfa  Frosted white     — rain heads, blinking cursor
 *
 * Aesthetic: cool mint teal energy vs deep petrol blue depth,
 * accented with warm soft orange text that pops cleanly on a dark canvas.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const auroraMintTalk: TalkColorTokens = {
  user: {
    prompt:    '#5eead4',   // Mint teal         — '>' prompt symbol      (LOGO_BODY)
    text:      '#fb923c',   // Soft orange       — user typed text & log  (TAGLINE)
    highlight: '#5eead4',   // Mint teal         — selection highlight    (LOGO_BODY)
    border:    '#5eead4',   // Mint teal         — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#5eead4',      // Mint teal         — [neoloop] badge        (LOGO_BODY)
    text:   '#fb923c',      // Soft orange       — agent response body    (TAGLINE)
    dim:    '#0f4c5c',      // Deep petrol blue  — dim / muted agent info (LOGO_SHADING)
    accent: '#f0fdfa',      // Frosted white     — agent tool/success accent (HEAD)
  },
};

export default auroraMintTalk;
