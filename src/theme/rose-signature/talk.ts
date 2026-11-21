/**
 * Rose Signature Theme — User & Agent Conversation Styling
 *
 * Four-token palette:
 *   LOGO_BODY    #ff2d95  Hot pink       — logo fill, borders, prompt >
 *   LOGO_SHADING #8f2a5c  Deep rosewood  — logo shadow, placeholder, history
 *   TAGLINE      #f9c6d9  Baby pink      — tagline, typed text
 *   HEAD         #fff5f9  Pearl white    — rain heads, blinking cursor
 *
 * Aesthetic: polished luxury rose — hot pink bold focal point, soft baby-pink text,
 * balanced by deep rosewood shadow and pearl-white highlights.
 */

import { TalkColorTokens } from '../cyberpunk/talk.js';
export type { TalkColorTokens };

export const roseSignatureTalk: TalkColorTokens = {
  user: {
    prompt:    '#ff2d95',   // Hot pink       — '>' prompt symbol      (LOGO_BODY)
    text:      '#f9c6d9',   // Baby pink      — user typed text & log  (TAGLINE)
    highlight: '#ff2d95',   // Hot pink       — selection highlight    (LOGO_BODY)
    border:    '#ff2d95',   // Hot pink       — input bar dashed border (LOGO_BODY)
  },
  agent: {
    badge:  '#ff2d95',      // Hot pink       — [neoloop] badge        (LOGO_BODY)
    text:   '#f9c6d9',      // Baby pink      — agent response body    (TAGLINE)
    dim:    '#8f2a5c',      // Deep rosewood  — dim / muted agent info (LOGO_SHADING)
    accent: '#fff5f9',      // Pearl white    — agent tool/success accent (HEAD)
  },
};

export default roseSignatureTalk;
