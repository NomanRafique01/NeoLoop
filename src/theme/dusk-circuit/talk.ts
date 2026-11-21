/**
 * Dusk Circuit Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #ff6b35  Orange      — logo fill, borders, prompt >
 *   LOGO_SHADING #1e4fa3  Deep blue   — logo shadow, placeholder, history
 *   TAGLINE      #00d4ff  Cyan        — tagline, typed text
 *   HEAD         #ffe8a3  Pale gold   — rain heads, blinking cursor
 *
 * Aesthetic contrast: warm dusk orange user vs cool circuit-blue system.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const duskCircuitTalk: TalkColorTokens = {
  user: {
    prompt:    '#ff6b35',   // Orange     — '>' prompt symbol (LOGO_BODY)
    text:      '#00d4ff',   // Cyan       — user typed text & chat log (TAGLINE)
    highlight: '#ff6b35',   // Orange     — selection highlight (LOGO_BODY)
    border:    '#ff6b35',   // Orange     — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#ff6b35',      // Orange      — [neoloop] badge (LOGO_BODY)
    text:   '#00d4ff',      // Cyan        — agent response body (TAGLINE)
    dim:    '#1e4fa3',      // Deep Blue   — dim / muted agent info (LOGO_SHADING)
    accent: '#ffe8a3',      // Pale Gold   — agent tool / success accent (HEAD)
  },
};

export default duskCircuitTalk;
