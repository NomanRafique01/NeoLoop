/**
 * Arctic Gold Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #f5c518  Gold         — logo fill, borders, prompt >
 *   LOGO_SHADING #6a4f0a  Dark bronze  — logo shadow, placeholder, history
 *   TAGLINE      #9fe7ff  Ice blue     — tagline, typed text
 *   HEAD         #ffffff  White        — rain heads, blinking cursor
 *
 * Aesthetic: warm gold user energy vs cool ice-blue system depth,
 * anchored by dark bronze shadow that makes the gold read as metal.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const arcticGoldTalk: TalkColorTokens = {
  user: {
    prompt:    '#f5c518',   // Gold        — '>' prompt symbol      (LOGO_BODY)
    text:      '#9fe7ff',   // Ice blue    — user typed text & log  (TAGLINE)
    highlight: '#f5c518',   // Gold        — selection highlight    (LOGO_BODY)
    border:    '#f5c518',   // Gold        — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#f5c518',      // Gold        — [neoloop] badge        (LOGO_BODY)
    text:   '#9fe7ff',      // Ice blue    — agent response body    (TAGLINE)
    dim:    '#6a4f0a',      // Dark bronze — dim / muted agent info (LOGO_SHADING)
    accent: '#ffffff',      // White       — agent tool/success accent (HEAD)
  },
};

export default arcticGoldTalk;
