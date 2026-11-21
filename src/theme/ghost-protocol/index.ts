/**
 * Ghost Protocol Theme — NeoLoop CLI
 *
 * Four-token stealth spy-tool palette:
 *
 *   #8fa3b8  Steel blue-gray — LOGO_BODY    — logo fill, borders, prompt >
 *   #2f3d4f  Gunmetal        — LOGO_SHADING — logo shadow, placeholder, muted text
 *   #5eead4  Ice teal        — TAGLINE      — tagline, typed text, selection highlight, agent badge
 *   #e8f1fa  Frost white     — HEAD         — rain heads, cursor, glow connectors, shimmer
 *
 * Near-monochrome brushed steel aesthetic with a cool ice-teal accent.
 * The steel blue-gray logo and gunmetal shadow evoke precision-machined metal,
 * while the ice-teal tagline and typed text cut cleanly through the stealth canvas.
 */

import { ThemeTokens } from '../types.js';
import { ghostProtocolTalk } from './talk.js';

export const ghostProtocol: ThemeTokens = {
  id: 'ghost-protocol',
  name: 'Ghost Protocol',
  description: 'Steel blue-gray + gunmetal + ice teal + frost white — stealth spy-tool aesthetic',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#08090a',   // Matte dark stealth canvas
  surface:         '#111315',   // Deep slate surface
  surfaceElevated: '#1a1d21',   // Elevated dark metal container
  border:          '#8fa3b8',   // Steel blue-gray border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#e8f1fa',         // Crisp frost white primary text (HEAD)
  textMuted: '#2f3d4f',         // Gunmetal muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#8fa3b8',      // Steel blue-gray primary  (LOGO_BODY)
  accentStrong: '#e8f1fa',      // Frost white strong       (HEAD)
  secondary:    '#5eead4',      // Ice teal secondary       (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#8fa3b8',        // Steel blue-gray — solid █ body          LOGO_BODY
  logoGlow:   '#e8f1fa',        // Frost white     — bright connectors ╗╔║ HEAD
  logoShadow: '#2f3d4f',        // Gunmetal        — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#1b2531',        // Dark slate-navy — deepest corner ╚ trace

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#8fa3b8',    // Steel blue-gray fallback lane base (LOGO_BODY)
  matrixRainHead: '#e8f1fa',    // Frost white sharp drop tips (HEAD)
  rainColors: [
    '#8fa3b8',   // Steel blue-gray — LOGO_BODY    (stealth metallic column)
    '#2f3d4f',   // Gunmetal        — LOGO_SHADING (shadow column)
    '#5eead4',   // Ice teal        — TAGLINE      (ice pulse column)
  ],

  // ── Tagline shimmer — ice teal base → steel blue-gray → frost white peak ───
  tagline: '#5eead4',           // Ice teal base (TAGLINE)
  shimmer: '#e8f1fa',           // Frost white peak (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      ghostProtocolTalk.user.border,       // Steel blue-gray dashed border (LOGO_BODY)
  inputText:        ghostProtocolTalk.user.text,         // Ice teal typed text (TAGLINE)
  inputPlaceholder: '#2f3d4f',                         // Gunmetal placeholder (LOGO_SHADING)
  cursor:           '#e8f1fa',                         // Frost white blinking cursor (HEAD)

  selection: '#5eead4',         // Ice teal selection highlight (TAGLINE)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    ghostProtocolTalk.user.prompt,
    text:      ghostProtocolTalk.user.text,
    border:    ghostProtocolTalk.user.border,
    highlight: ghostProtocolTalk.user.highlight,
  },
  agentTalk: {
    badge:  ghostProtocolTalk.agent.badge,
    text:   ghostProtocolTalk.agent.text,
    dim:    ghostProtocolTalk.agent.dim,
    accent: ghostProtocolTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#8fa3b8',           // Steel blue-gray — clean confirmation (LOGO_BODY)
  warning: '#5eead4',           // Ice teal        — alert / caution    (TAGLINE)
  error:   '#5eead4',           // Ice teal        — error              (TAGLINE)
};

export * from './talk.js';
export default ghostProtocol;
