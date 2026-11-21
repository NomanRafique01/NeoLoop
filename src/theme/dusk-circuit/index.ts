/**
 * Dusk Circuit Theme — NeoLoop CLI
 *
 * Four-token sunset-meets-circuitboard palette:
 *
 *   #ff6b35  Orange     — LOGO_BODY    — logo fill, borders, prompt >
 *   #1e4fa3  Deep Blue  — LOGO_SHADING — logo shadow, placeholder, history
 *   #00d4ff  Cyan       — TAGLINE      — tagline, typed text
 *   #ffe8a3  Pale Gold  — HEAD         — rain heads, blinking cursor
 *
 * Aesthetic: warm dusk-orange user energy vs cool circuit-blue system depth.
 * The pale-gold HEAD blazes atop every rain column like a last ember at dusk.
 */

import { ThemeTokens } from '../types.js';
import { duskCircuitTalk } from './talk.js';

export const duskCircuit: ThemeTokens = {
  id: 'dusk-circuit',
  name: 'Dusk Circuit',
  description: 'Sunset orange + circuit blue + cyan + pale gold — warm dusk vs cool silicon',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#06080f',   // Near-black with a hint of deep navy
  surface:         '#0b1120',   // Dark blue-black surface
  surfaceElevated: '#111d38',   // Elevated card — mid deep-blue tone
  border:          '#ff6b35',   // Orange — LOGO_BODY (live borders pop warm)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#cce8ff',         // Soft sky-blue readable text
  textMuted: '#1e4fa3',         // Deep Blue muted — LOGO_SHADING

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#ff6b35',      // Orange     — primary (LOGO_BODY)
  accentStrong: '#ffe8a3',      // Pale Gold  — strong accent flash (HEAD)
  secondary:    '#00d4ff',      // Cyan       — secondary system accent (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#ff6b35',        // Orange     — solid █ body (front-lit face)   LOGO_BODY
  logoGlow:   '#ffe8a3',        // Pale Gold  — bright connectors ╗ ╔ ║ (top/right)  HEAD
  logoShadow: '#1e4fa3',        // Deep Blue  — mid shadow ═ ╝ (horizontal/bottom-right)  LOGO_SHADING
  logoDeep:   '#1e4fa3',        // Deep Blue  — deepest corner ╚ trace  LOGO_SHADING

  // ── Matrix Rain — exact token colours ──────────────────────────────────────
  matrixRain:     '#ff6b35',    // Orange — fallback / lane base (LOGO_BODY)
  matrixRainHead: '#ffe8a3',    // Pale Gold head blazes at the tip (HEAD)
  rainColors: [
    '#ff6b35',   // Orange     — LOGO_BODY  (warm dusk column)
    '#1e4fa3',   // Deep Blue  — LOGO_SHADING (cool circuit column)
    '#00d4ff',   // Cyan       — TAGLINE    (electric pulse column)
  ],

  // ── Tagline shimmer — cyan base → orange → pale-gold peak ──────────────────
  tagline: '#00d4ff',           // Cyan base (TAGLINE)
  shimmer: '#ffe8a3',           // Pale Gold peak of sweep (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      duskCircuitTalk.user.border,       // Orange dashed border
  inputText:        duskCircuitTalk.user.text,         // Cyan typed text
  inputPlaceholder: '#1e4fa3',                         // Deep Blue placeholder (LOGO_SHADING)
  cursor: '#ffe8a3',                                   // Pale Gold blinking cursor (HEAD)

  selection: '#ff6b35',         // Orange selection highlight (LOGO_BODY)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    duskCircuitTalk.user.prompt,
    text:      duskCircuitTalk.user.text,
    border:    duskCircuitTalk.user.border,
    highlight: duskCircuitTalk.user.highlight,
  },
  agentTalk: {
    badge:  duskCircuitTalk.agent.badge,
    text:   duskCircuitTalk.agent.text,
    dim:    duskCircuitTalk.agent.dim,
    accent: duskCircuitTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#00d4ff',           // Cyan   — system success (TAGLINE)
  warning: '#ff6b35',           // Orange — caution/warning (LOGO_BODY)
  error:   '#ff6b35',           // Orange — error (LOGO_BODY)
};

export * from './talk.js';
export default duskCircuit;
