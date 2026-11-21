/**
 * Arctic Gold Theme — NeoLoop CLI
 *
 * Four-token warm-meets-arctic palette:
 *
 *   #f5c518  Gold         — LOGO_BODY    — logo fill, borders, prompt >
 *   #6a4f0a  Dark bronze  — LOGO_SHADING — logo shadow, placeholder, history
 *   #9fe7ff  Ice blue     — TAGLINE      — tagline, typed text
 *   #ffffff  White        — HEAD         — rain heads, blinking cursor
 *
 * Gold body sits in front, dark bronze shadow recedes into the black canvas
 * making the logo read as polished metal. Ice blue provides the cool
 * complementary system tone without any green, pink, or violet. White keeps
 * the cursor and rain heads laser-sharp.
 *
 * Premium, calm, no visual noise.
 */

import { ThemeTokens } from '../types.js';
import { arcticGoldTalk } from './talk.js';

export const arcticGold: ThemeTokens = {
  id: 'arctic-gold',
  name: 'Arctic Gold',
  description: 'Gold + dark bronze + ice blue + white — warm metal meets arctic clarity',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#060600',   // Near-black with the faintest warm undertone
  surface:         '#0d0c01',   // Very dark warm-black surface
  surfaceElevated: '#1a1600',   // Slightly lifted — dark amber-black
  border:          '#f5c518',   // Gold border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#f0edd8',         // Warm off-white primary text
  textMuted: '#6a4f0a',         // Dark bronze muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#f5c518',      // Gold primary         (LOGO_BODY)
  accentStrong: '#ffffff',      // White strong accent  (HEAD)
  secondary:    '#9fe7ff',      // Ice blue secondary   (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#f5c518',        // Gold         — solid █ body          LOGO_BODY
  logoGlow:   '#ffffff',        // White        — bright connectors ╗╔║ HEAD
  logoShadow: '#6a4f0a',        // Dark bronze  — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#3d2d04',        // Deeper bronze — deepest corner ╚ trace (further darkened)

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#f5c518',    // Gold        — fallback lane base   (LOGO_BODY)
  matrixRainHead: '#ffffff',    // White       — blazing tip of drops (HEAD)
  rainColors: [
    '#f5c518',   // Gold         — LOGO_BODY    (warm metal column)
    '#6a4f0a',   // Dark bronze  — LOGO_SHADING (deep shadow column)
    '#9fe7ff',   // Ice blue     — TAGLINE      (arctic cool column)
  ],

  // ── Tagline shimmer — ice blue base → gold → white peak ────────────────────
  tagline: '#9fe7ff',           // Ice blue base  (TAGLINE)
  shimmer: '#ffffff',           // White peak     (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      arcticGoldTalk.user.border,       // Gold dashed border
  inputText:        arcticGoldTalk.user.text,         // Ice blue typed text
  inputPlaceholder: '#6a4f0a',                         // Dark bronze placeholder (LOGO_SHADING)
  cursor: '#ffffff',                                   // White blinking cursor (HEAD)

  selection: '#f5c518',         // Gold selection (LOGO_BODY)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    arcticGoldTalk.user.prompt,
    text:      arcticGoldTalk.user.text,
    border:    arcticGoldTalk.user.border,
    highlight: arcticGoldTalk.user.highlight,
  },
  agentTalk: {
    badge:  arcticGoldTalk.agent.badge,
    text:   arcticGoldTalk.agent.text,
    dim:    arcticGoldTalk.agent.dim,
    accent: arcticGoldTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#9fe7ff',           // Ice blue — system success  (TAGLINE)
  warning: '#f5c518',           // Gold     — caution         (LOGO_BODY)
  error:   '#c4950a',           // Darker gold-amber — error (keeps warm family, no pink)
};

export * from './talk.js';
export default arcticGold;
