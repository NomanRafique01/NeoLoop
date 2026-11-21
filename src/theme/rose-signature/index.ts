/**
 * Rose Signature Theme — NeoLoop CLI
 *
 * Four-token polished rose palette:
 *
 *   #ff2d95  Hot pink       — LOGO_BODY    — logo fill, borders, prompt >
 *   #8f2a5c  Deep rosewood  — LOGO_SHADING — logo shadow, placeholder, history
 *   #f9c6d9  Baby pink      — TAGLINE      — tagline, typed text
 *   #fff5f9  Pearl white    — HEAD         — rain heads, blinking cursor
 *
 * The hot pink logo acts as a bold focal point, while baby pink makes
 * the tagline and typed text gentle and easy to read. Deep rosewood shadow
 * anchors the layered bevel without disappearing into black, reading
 * as refined and luxurious rather than childish.
 */

import { ThemeTokens } from '../types.js';
import { roseSignatureTalk } from './talk.js';

export const roseSignature: ThemeTokens = {
  id: 'rose-signature',
  name: 'Rose Signature',
  description: 'Hot pink + deep rosewood + baby pink + pearl white — refined luxury rose',

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background:      '#090407',   // Deep rose-tinted dark velvet canvas
  surface:         '#140910',   // Dark rosewood surface
  surfaceElevated: '#1f0e19',   // Elevated rose container
  border:          '#ff2d95',   // Hot pink border (LOGO_BODY)

  // ── Typography ─────────────────────────────────────────────────────────────
  text:      '#fff5f9',         // Pearl white primary text
  textMuted: '#8f2a5c',         // Deep rosewood muted text (LOGO_SHADING)

  // ── Accents ────────────────────────────────────────────────────────────────
  accent:       '#ff2d95',      // Hot pink primary         (LOGO_BODY)
  accentStrong: '#fff5f9',      // Pearl white strong       (HEAD)
  secondary:    '#f9c6d9',      // Baby pink secondary      (TAGLINE)

  // ── Logo — 4-colour depth rendering ────────────────────────────────────────
  logo:       '#ff2d95',        // Hot pink       — solid █ body          LOGO_BODY
  logoGlow:   '#fff5f9',        // Pearl white    — bright connectors ╗╔║ HEAD
  logoShadow: '#8f2a5c',        // Deep rosewood  — mid shadow ═╝         LOGO_SHADING
  logoDeep:   '#4a142e',        // Dark rosewood  — deepest corner ╚ trace

  // ── Matrix Rain ─────────────────────────────────────────────────────────────
  matrixRain:     '#ff2d95',    // Hot pink fallback lane base (LOGO_BODY)
  matrixRainHead: '#fff5f9',    // Pearl white glowing drop tips (HEAD)
  rainColors: [
    '#ff2d95',   // Hot pink       — LOGO_BODY    (vibrant rose column)
    '#8f2a5c',   // Deep rosewood  — LOGO_SHADING (shadow column)
    '#f9c6d9',   // Baby pink      — TAGLINE      (soft pastel column)
  ],

  // ── Tagline shimmer — baby pink base → hot pink → pearl white peak ─────────
  tagline: '#f9c6d9',           // Baby pink base (TAGLINE)
  shimmer: '#fff5f9',           // Pearl white peak (HEAD)

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBorder:      roseSignatureTalk.user.border,       // Hot pink dashed border
  inputText:        roseSignatureTalk.user.text,         // Baby pink typed text
  inputPlaceholder: '#8f2a5c',                         // Deep rosewood placeholder (LOGO_SHADING)
  cursor: '#fff5f9',                                   // Pearl white blinking cursor (HEAD)

  selection: '#ff2d95',         // Hot pink selection (LOGO_BODY)

  // ── Talk colours ───────────────────────────────────────────────────────────
  userTalk: {
    prompt:    roseSignatureTalk.user.prompt,
    text:      roseSignatureTalk.user.text,
    border:    roseSignatureTalk.user.border,
    highlight: roseSignatureTalk.user.highlight,
  },
  agentTalk: {
    badge:  roseSignatureTalk.agent.badge,
    text:   roseSignatureTalk.agent.text,
    dim:    roseSignatureTalk.agent.dim,
    accent: roseSignatureTalk.agent.accent,
  },

  // ── Semantic status ─────────────────────────────────────────────────────────
  success: '#f9c6d9',           // Baby pink — confirmation
  warning: '#ff2d95',           // Hot pink  — caution
  error:   '#ff2d95',           // Hot pink  — error
};

export * from './talk.js';
export default roseSignature;
