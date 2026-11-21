/**
 * Cyberpunk Theme — NeoLoop CLI
 *
 * Three-family logo palette — warm user, hot badge, deep blue system:
 *
 *   #FFE600  Neon Gold      — logo body █ / user text   (warm, owned by user)
 *   #FF007F  Hot Red        — logo bright connectors ╗╔║ / all badges
 *   #0066FF  Electric Blue  — logo mid-shadow ═╝ / agent text  (deep cool)
 *   #001F7A  Deep Navy      — logo deepest shadow ╚ / dim text  (darkest cool)
 *
 * Classic cyberpunk contrast: WARM user vs COOL system (deep blue, not washed teal).
 */

import { ThemeTokens } from '../types.js';
import { cyberpunkTalk } from './talk.js';

export const cyberpunk: ThemeTokens = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  description: 'Neon Gold + Hot Red + Electric Blue — warm vs cool cyberpunk',

  background: '#040810',
  surface: '#070D1A',
  surfaceElevated: '#0C1830',
  border: '#0A2060',

  text: '#D0E8FF',
  textMuted: '#004499',

  accent:       '#FFE600',   // Neon Gold  (primary — user owns this)
  accentStrong: '#FF007F',   // Hot Red    (badges, borders, prompt)
  secondary:    '#0066FF',   // Electric Blue (system/agent primary)

  // ── Logo — 4-colour depth rendering ─────────────────────────────────────
  logo:       '#FFE600',     // Neon Gold   — solid █ body (front lit face)
  logoGlow:   '#FF007F',     // Hot Red     — bright connectors ╗ ╔ ║ (top/right)
  logoShadow: '#0066FF',     // Elec. Blue  — mid shadow ═ ╝ (horizontal / bottom-right)
  logoDeep:   '#0066FF',     // Electric Blue — deepest ╚ trace (matches mid-shadow)

  // ── Matrix Rain — exact logo colours, no colour washing ──────────────────
  matrixRain:     '#FFE600', // fallback for single-colour mode
  matrixRainHead: '#FFE600', // exact gold (no bleaching)
  rainColors: [
    '#FFE600',   // Neon Gold  — warm user colour
    '#FF007F',   // Hot Red    — badge/glow colour
    '#0066FF',   // Elec. Blue — cool system colour (deep, not washed)
  ],

  // ── Tagline shimmer — blue base → red → gold peak ────────────────────────
  tagline: '#0066FF',        // Electric Blue base (cool system colour)
  shimmer: '#FFFAAA',        // Bright gold peak of sweep

  // ── Input bar ─────────────────────────────────────────────────────────────
  inputBorder:      cyberpunkTalk.user.border,  // Hot Red dashed border
  inputText:        cyberpunkTalk.user.text,    // Neon Gold user text
  inputPlaceholder: '#003399',                  // Dark Blue placeholder
  cursor: '#FFE600',

  selection: '#FF007F',

  // ── Talk colours ──────────────────────────────────────────────────────────
  userTalk: {
    prompt:    cyberpunkTalk.user.prompt,
    text:      cyberpunkTalk.user.text,
    border:    cyberpunkTalk.user.border,
    highlight: cyberpunkTalk.user.highlight,
  },
  agentTalk: {
    badge:  cyberpunkTalk.agent.badge,
    text:   cyberpunkTalk.agent.text,
    dim:    cyberpunkTalk.agent.dim,
    accent: cyberpunkTalk.agent.accent,
  },

  success: '#0066FF',   // Electric Blue — system success
  warning: '#FF007F',   // Hot Red       — warning
  error:   '#FF007F',   // Hot Red       — error
};

export * from './talk.js';
export default cyberpunk;
