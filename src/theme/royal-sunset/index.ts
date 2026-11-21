/**
 * Royal Sunset Theme — NeoLoop CLI (v3 — Ocean Sunset)
 *
 * Four-token sunset-over-sea palette:
 *
 *   #ff5e3a  Vermilion        — LOGO_BODY    — logo fill, borders, prompt >
 *   #0e4d64  Deep ocean teal  — LOGO_SHADING — logo shadow, placeholder, history
 *   #f9c74f  Saffron          — TAGLINE      — tagline, typed text
 *   #fff4e0  Warm cream       — HEAD         — rain heads, blinking cursor
 *
 * A dramatic sunset over open water. The vermilion sun sits forward against
 * deep ocean teal-blue shadows, while saffron text radiates a warm golden glow.
 * Zero pink, purple, or indigo — pure oceanic twilight with warm cream accents.
 */

import { ThemeTokens } from '../types.js';
import { royalSunsetTalk } from './talk.js';

export const royalSunset: ThemeTokens = {
  id: 'royal-sunset',
  name: 'Royal Sunset',
  description: 'Vermilion + deep ocean teal + saffron + warm cream — sunset over the ocean',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#040a0e',   // Dark nocturnal ocean canvas
  surface:         '#08151c',   // Deep marine surface
  surfaceElevated: '#10222d',   // Elevated marine container
  border:          '#ff5e3a',   // Vermilion border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#fef3e2',         // Warm cream-tinted white primary text
  textMuted: '#0e4d64',         // Deep ocean teal muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#ff5e3a',      // Vermilion primary       (LOGO_BODY)
  accentStrong: '#fff4e0',      // Warm cream strong      (HEAD)
  secondary:    '#f9c74f',      // Saffron secondary      (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#ff5e3a',        // Vermilion        — solid █ body          LOGO_BODY
  logoGlow:   '#fff4e0',        // Warm cream       — bright connectors ╗╔║ HEAD
  logoShadow: '#0e4d64',        // Deep ocean teal  — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#072b38',        // Abyssal teal     — deepest corner ╚ trace

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#ff5e3a',    // Vermilion fallback lane base (LOGO_BODY)
  matrixRainHead: '#fff4e0',    // Warm cream drop tips (HEAD)
  rainColors: [
    '#ff5e3a',   // Vermilion        — LOGO_BODY    (sunset horizon column)
    '#0e4d64',   // Deep ocean teal  — LOGO_SHADING (deep water column)
    '#f9c74f',   // Saffron          — TAGLINE      (golden glow column)
  ],

  // ── Tagline shimmer — saffron base → vermilion → warm cream peak ───────────
  tagline: '#f9c74f',           // Saffron base (TAGLINE)
  shimmer: '#fff4e0',           // Warm cream peak (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      royalSunsetTalk.user.border,       // Vermilion dashed border
  inputText:        royalSunsetTalk.user.text,         // Saffron typed text
  inputPlaceholder: '#0e4d64',                         // Deep ocean teal placeholder (LOGO_SHADING)
  cursor: '#fff4e0',                                   // Warm cream blinking cursor (HEAD)

  selection: '#ff5e3a',         // Vermilion selection (LOGO_BODY)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    royalSunsetTalk.user.prompt,
    text:      royalSunsetTalk.user.text,
    border:    royalSunsetTalk.user.border,
    highlight: royalSunsetTalk.user.highlight,
  },
  agentTalk: {
    badge:  royalSunsetTalk.agent.badge,
    text:   royalSunsetTalk.agent.text,
    dim:    royalSunsetTalk.agent.dim,
    accent: royalSunsetTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#f9c74f',           // Saffron   — system success (TAGLINE)
  warning: '#f9c74f',           // Saffron   — caution        (TAGLINE)
  error:   '#ff5e3a',           // Vermilion — error          (LOGO_BODY)
};

export * from './talk.js';
export default royalSunset;
