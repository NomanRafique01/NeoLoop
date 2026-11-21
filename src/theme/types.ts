/**
 * NeoLoop CLI — Theme Token System Types
 *
 * Defines the contract for all color tokens and semantic UI styling.
 * Every UI component (raw ANSI differential renderer and Ink/React widgets)
 * derives all visual styling from these tokens.
 */

export interface ThemeTokens {
  /** Unique theme identifier (e.g. "phantom", "matrix") */
  id: string;

  /** Display name of the theme */
  name: string;

  /** Optional descriptive summary of the aesthetic */
  description?: string;

  // ── Surfaces & Structural Geometry ─────────────────────────────────────────
  /** Base canvas / terminal background color */
  background: string;

  /** Elevated container / popup surface color */
  surface: string;

  /** Higher elevation surface (active selection, header cards) */
  surfaceElevated: string;

  /** Border rules, dividers, and decorative bounding lines */
  border: string;

  // ── Typography & Reading Contrast ──────────────────────────────────────────
  /** Primary high-contrast text color */
  text: string;

  /** Muted secondary text, labels, and timestamps */
  textMuted: string;

  // ── Accents & Brand Energy ─────────────────────────────────────────────────
  /** Primary neon accent (prompt symbols, active borders, highlights) */
  accent: string;

  /** Deeper, stronger accent variant for glows and gradient stops */
  accentStrong: string;

  /** Secondary complementary color for badges and auxiliary accents */
  secondary: string;

  // ── ASCII Logo & Typography Animation ──────────────────────────────────────
  /** Main solid body fill for block font letters ('█') */
  logo: string;

  /** Shading and bevel outlines for block font glyphs — bright connector chars (╗ ╔ ║) */
  logoGlow: string;

  /** Mid-shadow layer — horizontal/bottom connector chars (═ ╝) */
  logoShadow?: string;

  /** Deepest shadow layer — bottom-left corner char (╚) and trailing trace */
  logoDeep?: string;

  // ── Matrix Digital Rain Simulation ─────────────────────────────────────────
  /** Base hue for cascading digital code streams */
  matrixRain: string;

  /** Bright glowing head char color of falling drops (defaults to crisp white/glow) */
  matrixRainHead?: string;

  /**
   * Optional multi-colour rain — each drop lane picks a colour from this list randomly.
   * Falls back to [matrixRain] when absent (single-colour behaviour).
   */
  rainColors?: string[];

  // ── Tagline & Sweep Shimmer ────────────────────────────────────────────────
  /** Base quiescent color of the centered tagline text */
  tagline: string;

  /** Peak highlight sweep color passing across the tagline */
  shimmer: string;

  // ── Live Input Bar & Interactive Cursor ────────────────────────────────────
  /** Text color while typing in the active input bar */
  inputText: string;

  /** Placeholder hint text color when input bar is empty */
  inputPlaceholder: string;

  /** Blinking block cursor color */
  cursor: string;

  /** Background highlight color for selected text range (e.g. Ctrl+A) */
  selection: string;

  /** Decorative dashed border lines for the input bar (e.g. synthwave magenta in Cyberpunk) */
  inputBorder?: string;

  // ── Conversation Talk Colors (User & Agent) ────────────────────────────────
  /** Styling tokens for user commands and talk */
  userTalk?: {
    prompt: string;
    text: string;
    border?: string;
    highlight?: string;
  };

  /** Styling tokens for agent messages and responses */
  agentTalk?: {
    badge: string;
    text: string;
    dim?: string;
    accent?: string;
  };

  // ── Semantic Status & Agent Feedback ───────────────────────────────────────
  /** Success status, completed steps, valid commands */
  success: string;

  /** Warning status, rate limit alerts, cautions */
  warning: string;

  /** Error status, failed commands, exceptions */
  error: string;
}

export type ThemeListener = (theme: ThemeTokens) => void;
