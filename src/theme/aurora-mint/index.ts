/**
 * Aurora Mint Theme — NeoLoop CLI
 *
 * Four-token cool-meets-warm aurora palette:
 *
 *   #5eead4  Mint teal         — LOGO_BODY    — logo fill, borders, prompt >
 *   #0f4c5c  Deep petrol blue  — LOGO_SHADING — logo shadow, placeholder, history
 *   #fb923c  Soft orange       — TAGLINE      — tagline, typed text
 *   #f0fdfa  Frosted white     — HEAD         — rain heads, blinking cursor
 *
 * Cool mint and deep petrol blue make the logo look icy and clean, while
 * the soft orange tagline provides warm contrast so text stands out.
 * Frosted white keeps the cursor and rain heads razor-sharp.
 */

import { ThemeTokens } from '../types.js';
import { auroraMintTalk } from './talk.js';

export const auroraMint: ThemeTokens = {
  id: 'aurora-mint',
  name: 'Aurora Mint',
  description: 'Mint teal + deep petrol blue + soft orange + frosted white — icy clean aurora',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#030708',   // Near-black with deep petrol undertone
  surface:         '#071418',   // Dark petrol surface
  surfaceElevated: '#0e242b',   // Slightly lifted — dark teal-black
  border:          '#5eead4',   // Mint teal border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#e6fffa',         // Crisp frosted mint primary text
  textMuted: '#0f4c5c',         // Deep petrol blue muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#5eead4',      // Mint teal primary       (LOGO_BODY)
  accentStrong: '#f0fdfa',      // Frosted white strong    (HEAD)
  secondary:    '#fb923c',      // Soft orange secondary   (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#5eead4',        // Mint teal        — solid █ body          LOGO_BODY
  logoGlow:   '#f0fdfa',        // Frosted white    — bright connectors ╗╔║ HEAD
  logoShadow: '#0f4c5c',        // Deep petrol blue — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#082c35',        // Midnight petrol  — deepest corner ╚ trace (receding depth)

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#5eead4',    // Mint teal fallback lane base (LOGO_BODY)
  matrixRainHead: '#f0fdfa',    // Frosted white blazing drop tips (HEAD)
  rainColors: [
    '#5eead4',   // Mint teal         — LOGO_BODY    (cool ice column)
    '#0f4c5c',   // Deep petrol blue  — LOGO_SHADING (deep abyssal column)
    '#fb923c',   // Soft orange       — TAGLINE      (warm aurora ember column)
  ],

  // ── Tagline shimmer — soft orange base → mint teal → frosted white peak ───
  tagline: '#fb923c',           // Soft orange base  (TAGLINE)
  shimmer: '#f0fdfa',           // Frosted white peak (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      auroraMintTalk.user.border,       // Mint teal dashed border
  inputText:        auroraMintTalk.user.text,         // Soft orange typed text
  inputPlaceholder: '#0f4c5c',                         // Deep petrol blue placeholder (LOGO_SHADING)
  cursor: '#f0fdfa',                                  // Frosted white blinking cursor (HEAD)

  selection: '#5eead4',         // Mint teal selection (LOGO_BODY)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    auroraMintTalk.user.prompt,
    text:      auroraMintTalk.user.text,
    border:    auroraMintTalk.user.border,
    highlight: auroraMintTalk.user.highlight,
  },
  agentTalk: {
    badge:  auroraMintTalk.agent.badge,
    text:   auroraMintTalk.agent.text,
    dim:    auroraMintTalk.agent.dim,
    accent: auroraMintTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#5eead4',           // Mint teal    — system success (LOGO_BODY)
  warning: '#fb923c',           // Soft orange  — caution        (TAGLINE)
  error:   '#f87171',           // Soft coral   — error
};

export * from './talk.js';
export default auroraMint;
