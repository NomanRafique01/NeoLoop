/**
 * Cyberpunk Theme — User & Agent Conversation Styling
 *
 * Three-family logo palette:
 *   WARM  — User   : Neon Gold  #FFE600 (typed text, prompt)
 *   HOT   — Badges : Hot Red    #FF007F (all [bracket] badges)
 *   COOL  — Agent  : Electric Teal family — agent body, system output, dim
 *
 * Classic cyberpunk contrast: warm user vs cool system.
 */

export interface TalkColorTokens {
  /** User conversation styling */
  user: {
    /** Prompt symbol '>' and user badge */
    prompt: string;
    /** User speech text in input bar and chat log */
    text: string;
    /** User selection or active highlight */
    highlight: string;
    /** Input bar decorative dashed border */
    border: string;
  };
  /** Agent conversation styling */
  agent: {
    /** Agent identity badge / prefix ('[neoloop]', 'agent:') */
    badge: string;
    /** Primary agent message / response text */
    text: string;
    /** Agent thinking / reasoning / step label */
    dim: string;
    /** Agent tool execution or success accent */
    accent: string;
  };
}

export const cyberpunkTalk: TalkColorTokens = {
  user: {
    prompt:    '#FFE600',   // Neon Gold  — '>' prompt symbol
    text:      '#FFE600',   // Neon Gold  — user typed text & chat log
    highlight: '#FF007F',   // Hot Red    — selection highlight
    border:    '#FF007F',   // Hot Red    — input bar dashed border
  },
  agent: {
    badge:  '#FF007F',      // Hot Red       — [neoloop] badge (pops hard)
    text:   '#3399FF',      // Bright Blue   — agent response body (readable deep blue)
    dim:    '#004499',      // Dark Navy Blue — dim / secondary / muted agent info
    accent: '#0066FF',      // Electric Blue  — agent tool / success accent
  },
};

export default cyberpunkTalk;
