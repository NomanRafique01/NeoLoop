/**
 * Neon Tokyo Theme — NeoLoop CLI
 *
 * Four-token clash palette — complementary hues, maximum pop:
 *
 *   #ff2e63  Hot red-pink — LOGO_BODY    — logo fill, borders, prompt >
 *   #08d9d6  Teal         — LOGO_SHADING — logo shadow, placeholder, history
 *   #ffd460  Warm yellow  — TAGLINE      — tagline, typed text
 *   #f5f5f5  Soft white   — HEAD         — rain heads, blinking cursor
 *
 * Red-pink and teal are near-complements → logo body clashes against its
 * own shadow in a visually electric way. Yellow tagline adds a third bright
 * tone that pops cleanly on a black terminal. Soft-white keeps cursor &
 * rain heads razor-sharp.
 *
 * Deep shadow variant (tighter logo depth): swap LOGO_SHADING to #067a78.
 */

import { ThemeTokens } from '../types.js';
import { neonTokyoTalk } from './talk.js';

export const neonTokyo: ThemeTokens = {
  id: 'neon-tokyo',
  name: 'Neon Tokyo',
  description: 'Hot red-pink + teal + warm yellow + soft white — maximum neon clash',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#05050a',   // Near-black with the faintest blue undertone
  surface:         '#0a0a12',   // Deep dark surface
  surfaceElevated: '#13131f',   // Slightly lifted card — dark purple-black
  border:          '#ff2e63',   // Hot red-pink border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#f0f0f0',         // Near-white primary text (close to HEAD)
  textMuted: '#067a78',         // Deep teal muted text (darkened LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#ff2e63',      // Hot red-pink primary  (LOGO_BODY)
  accentStrong: '#ffd460',      // Warm yellow strong    (TAGLINE)
  secondary:    '#08d9d6',      // Teal secondary        (LOGO_SHADING)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#ff2e63',        // Hot red-pink — solid █ body          LOGO_BODY
  logoGlow:   '#f5f5f5',        // Soft white   — bright connectors ╗╔║ HEAD
  logoShadow: '#08d9d6',        // Teal         — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#067a78',        // Deep teal    — deepest corner ╚ trace (intentionally deeper)

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#ff2e63',    // Hot red-pink — fallback lane base   (LOGO_BODY)
  matrixRainHead: '#f5f5f5',    // Soft white   — blazing tip of drops (HEAD)
  rainColors: [
    '#ff2e63',   // Hot red-pink  — LOGO_BODY    (hot clash column)
    '#08d9d6',   // Teal          — LOGO_SHADING (cool complement column)
    '#ffd460',   // Warm yellow   — TAGLINE      (electric mid column)
  ],

  // ── Tagline shimmer — yellow base → red-pink → soft-white peak ─────────────
  tagline: '#ffd460',           // Warm yellow base  (TAGLINE)
  shimmer: '#f5f5f5',           // Soft white peak   (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      neonTokyoTalk.user.border,       // Hot red-pink dashed border
  inputText:        neonTokyoTalk.user.text,         // Warm yellow typed text
  inputPlaceholder: '#067a78',                        // Deep teal placeholder (LOGO_SHADING darkened)
  cursor: '#f5f5f5',                                  // Soft white blinking cursor (HEAD)

  selection: '#ff2e63',         // Hot red-pink selection (LOGO_BODY)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    neonTokyoTalk.user.prompt,
    text:      neonTokyoTalk.user.text,
    border:    neonTokyoTalk.user.border,
    highlight: neonTokyoTalk.user.highlight,
  },
  agentTalk: {
    badge:  neonTokyoTalk.agent.badge,
    text:   neonTokyoTalk.agent.text,
    dim:    neonTokyoTalk.agent.dim,
    accent: neonTokyoTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#08d9d6',           // Teal    — system success  (LOGO_SHADING)
  warning: '#ffd460',           // Yellow  — caution         (TAGLINE)
  error:   '#ff2e63',           // Red-pink — error          (LOGO_BODY)
};

export * from './talk.js';
export default neonTokyo;
