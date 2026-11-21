/**
 * Ghost Protocol Theme — NeoLoop CLI
 *
 * Four-token stealth spy-tool palette:
 *
 *   #e5e7eb  Light silver — LOGO_BODY    — logo fill, borders, prompt >
 *   #374151  Charcoal     — LOGO_SHADING — logo shadow, placeholder, history
 *   #ef4444  Signal red   — TAGLINE      — tagline, typed text
 *   #ffffff  Pure white   — HEAD         — rain heads, blinking cursor
 *
 * Near-monochrome brushed steel aesthetic with a single stark signal-red accent.
 * The silver logo and charcoal shadow look like precision-machined metal,
 * while the red tagline and typed text cut cleanly through the gray canvas.
 */

import { ThemeTokens } from '../types.js';
import { ghostProtocolTalk } from './talk.js';

export const ghostProtocol: ThemeTokens = {
  id: 'ghost-protocol',
  name: 'Ghost Protocol',
  description: 'Light silver + charcoal + signal red + pure white — stealth spy-tool aesthetic',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#08090a',   // Matte dark stealth canvas
  surface:         '#111315',   // Deep slate surface
  surfaceElevated: '#1a1d21',   // Elevated dark metal container
  border:          '#e5e7eb',   // Light silver border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#f3f4f6',         // Crisp light silver primary text
  textMuted: '#374151',         // Charcoal muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#e5e7eb',      // Light silver primary     (LOGO_BODY)
  accentStrong: '#ffffff',      // Pure white strong        (HEAD)
  secondary:    '#ef4444',      // Signal red secondary     (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#e5e7eb',        // Light silver — solid █ body          LOGO_BODY
  logoGlow:   '#ffffff',        // Pure white   — bright connectors ╗╔║ HEAD
  logoShadow: '#374151',        // Charcoal     — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#1f2937',        // Dark slate   — deepest corner ╚ trace

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#e5e7eb',    // Light silver fallback lane base (LOGO_BODY)
  matrixRainHead: '#ffffff',    // Pure white sharp drop tips (HEAD)
  rainColors: [
    '#e5e7eb',   // Light silver — LOGO_BODY    (stealth metallic column)
    '#374151',   // Charcoal     — LOGO_SHADING (shadow column)
    '#ef4444',   // Signal red   — TAGLINE      (pulse alert column)
  ],

  // ── Tagline shimmer — signal red base → silver → pure white peak ───────────
  tagline: '#ef4444',           // Signal red base (TAGLINE)
  shimmer: '#ffffff',           // Pure white peak (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      ghostProtocolTalk.user.border,       // Light silver dashed border
  inputText:        ghostProtocolTalk.user.text,         // Signal red typed text
  inputPlaceholder: '#374151',                         // Charcoal placeholder (LOGO_SHADING)
  cursor: '#ffffff',                                   // Pure white blinking cursor (HEAD)

  selection: '#ef4444',         // Signal red selection highlight (TAGLINE)

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
  success: '#e5e7eb',           // Light silver — clean confirmation
  warning: '#ef4444',           // Signal red   — alert / caution
  error:   '#ef4444',           // Signal red   — error
};

export * from './talk.js';
export default ghostProtocol;
