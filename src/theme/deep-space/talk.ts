/**
 * Deep Space Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #7c9cff  Periwinkle blue — logo fill, borders, prompt >
 *   LOGO_SHADING #2a2f6b  Midnight navy   — logo shadow, placeholder, history
 *   TAGLINE      #ffcf5c  Starlight gold  — tagline, typed text
 *   HEAD         #f4f6ff  Cold white      — rain heads, blinking cursor
 *
 * Aesthetic: soft periwinkle starlight glow against deep midnight navy shadows,
 * with warm starlight gold text reading like a bright star in the dark cosmic sky.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const deepSpaceTalk: TalkColorTokens = {
  user: {
    prompt:    '#7c9cff',   // Periwinkle blue — '>' prompt symbol      (LOGO_BODY)
    text:      '#ffcf5c',   // Starlight gold  — user typed text & log  (TAGLINE)
    highlight: '#7c9cff',   // Periwinkle blue — selection highlight    (LOGO_BODY)
    border:    '#7c9cff',   // Periwinkle blue — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#7c9cff',      // Periwinkle blue — [neoloop] badge        (LOGO_BODY)
    text:   '#ffcf5c',      // Starlight gold  — agent response body    (TAGLINE)
    dim:    '#2a2f6b',      // Midnight navy   — dim / muted agent info (LOGO_SHADING)
    accent: '#f4f6ff',      // Cold white      — agent tool/success accent (HEAD)
  },
};

export default deepSpaceTalk;
