/**
 * Red Eclipse Theme — NeoLoop CLI
 *
 * Four-token contrast palette:
 *
 *   #f2f2f2  Bone white — LOGO_BODY    — logo fill, borders, prompt >
 *   #c1121f  Blood red  — LOGO_SHADING — logo shadow, placeholder, history
 *   #ff3b47  Hot red    — TAGLINE      — tagline, typed text
 *   #ffffff  Pure white — HEAD         — rain heads, blinking cursor
 *
 * A bone-white logo with a vivid blood-red shadow behind it, looking like
 * a white moon eclipsing a red glow. Red acts as the electric aura accent
 * against the pitch canvas while white provides luminous clarity.
 */

import { ThemeTokens } from '../types.js';
import { redEclipseTalk } from './talk.js';

export const redEclipse: ThemeTokens = {
  id: 'red-eclipse',
  name: 'Red Eclipse',
  description: 'Bone white + blood red + hot red + pure white — lunar red eclipse',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#080405',   // Deep obsidian with faint crimson undertone
  surface:         '#12080a',   // Dark bloodstone surface
  surfaceElevated: '#1c0c10',   // Elevated dark crimson container
  border:          '#ff3b47',   // Hot red border (TAGLINE)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#f5f5f5',         // Crisp off-white primary text
  textMuted: '#c1121f',         // Blood red muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#ff3b47',      // Hot red primary accent   (TAGLINE)
  accentStrong: '#ffffff',      // Pure white strong accent (HEAD)
  secondary:    '#f2f2f2',      // Bone white secondary     (LOGO_BODY)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#f2f2f2',        // Bone white — solid █ body          LOGO_BODY
  logoGlow:   '#ffffff',        // Pure white — bright connectors ╗╔║ HEAD
  logoShadow: '#c1121f',        // Blood red  — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#7a0c14',        // Deep crimson — deepest corner ╚ trace

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#f2f2f2',    // Bone white fallback lane base (LOGO_BODY)
  matrixRainHead: '#ffffff',    // Pure white blazing drop tips (HEAD)
  rainColors: [
    '#f2f2f2',   // Bone white — LOGO_BODY    (lunar white column)
    '#c1121f',   // Blood red  — LOGO_SHADING (blood shadow column)
    '#ff3b47',   // Hot red    — TAGLINE      (hot red flare column)
  ],

  // ── Tagline shimmer — hot red base → bone white → pure white peak ─────────
  tagline: '#ff3b47',           // Hot red base (TAGLINE)
  shimmer: '#ffffff',           // Pure white peak (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      redEclipseTalk.user.border,       // Hot red dashed border
  inputText:        redEclipseTalk.user.text,         // Bone white typed text
  inputPlaceholder: '#a0a0a0',                         // Soft white placeholder
  cursor: '#ffffff',                                   // Pure white blinking cursor (HEAD)

  selection: '#c1121f',         // Blood red selection (LOGO_SHADING)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    redEclipseTalk.user.prompt,
    text:      redEclipseTalk.user.text,
    border:    redEclipseTalk.user.border,
    highlight: redEclipseTalk.user.highlight,
  },
  agentTalk: {
    badge:  redEclipseTalk.agent.badge,
    text:   redEclipseTalk.agent.text,
    dim:    redEclipseTalk.agent.dim,
    accent: redEclipseTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#ff3b47',           // Hot red   — confirmation (TAGLINE)
  warning: '#ff3b47',           // Hot red   — caution      (TAGLINE)
  error:   '#c1121f',           // Blood red — error        (LOGO_SHADING)
};

export * from './talk.js';
export default redEclipse;
