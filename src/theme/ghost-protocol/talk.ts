/**
 * Ghost Protocol Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #8fa3b8  Steel blue-gray — logo fill, borders, prompt >
 *   LOGO_SHADING #2f3d4f  Gunmetal        — logo shadow, placeholder, muted text
 *   TAGLINE      #5eead4  Ice teal        — tagline, typed text, selection, badge
 *   HEAD         #e8f1fa  Frost white     — rain heads, cursor, glow connectors, shimmer
 *
 * Aesthetic: cool stealth gray-blue with an ice teal accent.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const ghostProtocolTalk: TalkColorTokens = {
  user: {
    prompt:    '#8fa3b8',   // Steel blue-gray — '>' prompt symbol      (LOGO_BODY)
    text:      '#5eead4',   // Ice teal        — user typed text & log  (TAGLINE)
    highlight: '#5eead4',   // Ice teal        — selection highlight    (TAGLINE)
    border:    '#8fa3b8',   // Steel blue-gray — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#5eead4',      // Ice teal        — [neoloop] badge        (TAGLINE)
    text:   '#8fa3b8',      // Steel blue-gray — agent response body    (LOGO_BODY)
    dim:    '#2f3d4f',      // Gunmetal        — dim / muted agent info (LOGO_SHADING)
    accent: '#e8f1fa',      // Frost white     — agent tool/success accent (HEAD)
  },
};

export default ghostProtocolTalk;
