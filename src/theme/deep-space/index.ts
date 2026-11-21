/**
 * Deep Space Theme — NeoLoop CLI
 *
 * Four-token cosmic palette:
 *
 *   #7c9cff  Periwinkle blue — LOGO_BODY    — logo fill, borders, prompt >
 *   #2a2f6b  Midnight navy   — LOGO_SHADING — logo shadow, placeholder, history
 *   #ffcf5c  Starlight gold  — TAGLINE      — tagline, typed text
 *   #f4f6ff  Cold white      — HEAD         — rain heads, blinking cursor
 *
 * The periwinkle logo has a soft glow, like light from a distant star.
 * The navy shadow sinks into the black background, and the gold tagline
 * reads like a single bright star against the dark sky. Calmer than
 * Neon Tokyo and more colorful than Ghost Protocol.
 */

import { ThemeTokens } from '../types.js';
import { deepSpaceTalk } from './talk.js';

export const deepSpace: ThemeTokens = {
  id: 'deep-space',
  name: 'Deep Space',
  description: 'Periwinkle blue + midnight navy + starlight gold + cold white — cosmic deep space',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#05060f',   // Deep cosmic void with faint navy undertone
  surface:         '#0a0d1f',   // Dark deep space surface
  surfaceElevated: '#121735',   // Elevated dark navy container
  border:          '#7c9cff',   // Periwinkle blue border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#eef1ff',         // Soft cold white readable text (close to HEAD)
  textMuted: '#2a2f6b',         // Midnight navy muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#7c9cff',      // Periwinkle blue primary   (LOGO_BODY)
  accentStrong: '#f4f6ff',      // Cold white strong accent  (HEAD)
  secondary:    '#ffcf5c',      // Starlight gold secondary  (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#7c9cff',        // Periwinkle blue — solid █ body          LOGO_BODY
  logoGlow:   '#f4f6ff',        // Cold white      — bright connectors ╗╔║ HEAD
  logoShadow: '#2a2f6b',        // Midnight navy   — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#161942',        // Deep abyss navy — deepest corner ╚ trace

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#7c9cff',    // Periwinkle blue fallback lane base (LOGO_BODY)
  matrixRainHead: '#f4f6ff',    // Cold white blazing drop tips (HEAD)
  rainColors: [
    '#7c9cff',   // Periwinkle blue — LOGO_BODY    (cosmic starlight column)
    '#2a2f6b',   // Midnight navy   — LOGO_SHADING (deep void shadow column)
    '#ffcf5c',   // Starlight gold  — TAGLINE      (stellar pulse column)
  ],

  // ── Tagline shimmer — gold base → periwinkle → cold white peak ─────────────
  tagline: '#ffcf5c',           // Starlight gold base (TAGLINE)
  shimmer: '#f4f6ff',           // Cold white peak (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      deepSpaceTalk.user.border,       // Periwinkle blue dashed border
  inputText:        deepSpaceTalk.user.text,         // Starlight gold typed text
  inputPlaceholder: '#2a2f6b',                       // Midnight navy placeholder (LOGO_SHADING)
  cursor: '#f4f6ff',                                 // Cold white blinking cursor (HEAD)

  selection: '#7c9cff',         // Periwinkle blue selection (LOGO_BODY)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    deepSpaceTalk.user.prompt,
    text:      deepSpaceTalk.user.text,
    border:    deepSpaceTalk.user.border,
    highlight: deepSpaceTalk.user.highlight,
  },
  agentTalk: {
    badge:  deepSpaceTalk.agent.badge,
    text:   deepSpaceTalk.agent.text,
    dim:    deepSpaceTalk.agent.dim,
    accent: deepSpaceTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#7c9cff',           // Periwinkle blue — system success (LOGO_BODY)
  warning: '#ffcf5c',           // Starlight gold  — caution        (TAGLINE)
  error:   '#ff6b8b',           // Soft cosmic crimson — error
};

export * from './talk.js';
export default deepSpace;
