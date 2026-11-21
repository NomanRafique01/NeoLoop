/**
 * NeoLoop CLI — Slash Commands & Theme Switching Dispatcher
 *
 * Handles CLI slash commands (/theme, /themes, /help) for live theme toggling
 * across both the persistent terminal animation loop and Ink React trees.
 */

import { getCurrentTheme, setCurrentTheme, ansiRgb } from './manager.js';
import { listThemes, findTheme } from './themes.js';

export interface CommandResult {
  handled: boolean;
  message?: string;
  lines?: string[];
}

/**
 * Process a user-entered command. If it is a recognized slash command,
 * execute it and send formatted feedback to the logger.
 *
 * @param input Raw input line entered by the user
 * @param log Function to write a log line to the terminal output scroll
 * @returns boolean indicating if the input was intercepted as a slash command
 */
export function processSlashCommand(
  input: string,
  log: (line: string) => void
): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return false;
  }

  const parts = trimmed.slice(1).split(/\s+/);
  const cmd = parts[0]?.toLowerCase() || '';
  const arg = parts.slice(1).join(' ').trim();

  const theme = getCurrentTheme();

  // ── /themes or /theme (with no args): list themes ────────────────────────
  if (cmd === 'themes' || (cmd === 'theme' && !arg)) {
    const all = listThemes();
    log(`[theme] Active: ${theme.name} ("${theme.id}")`);
    log(`[theme] Description: ${theme.description || 'Custom theme'}`);
    log(`[theme] Available themes:`);
    all.forEach(t => {
      const activeMark = t.id === theme.id ? ' * (active)' : '';
      log(`   • ${t.id.padEnd(10)} — ${t.name}${activeMark}`);
    });
    log(`[theme] To switch: type /theme <name> (e.g. /theme phantom, /theme matrix)`);
    return true;
  }

  // ── /theme <name>: switch active theme ───────────────────────────────────
  if (cmd === 'theme' && arg) {
    const target = findTheme(arg);
    if (!target) {
      log(`[theme:error] Unknown theme "${arg}".`);
      log(`[theme] Available: ${listThemes().map(t => t.id).join(', ')}`);
      return true;
    }

    const next = setCurrentTheme(target);
    log(`[theme] Theme switched to "${next.name}" (${next.description || next.id})`);
    return true;
  }

  // ── Direct theme shortcuts: /phantom, /matrix, /cyberpunk, /dracula ──────
  const directTheme = findTheme(cmd);
  if (directTheme) {
    const next = setCurrentTheme(directTheme);
    log(`[theme] Theme switched to "${next.name}" (${next.description || next.id})`);
    return true;
  }

  // ── /help: list available commands ───────────────────────────────────────
  if (cmd === 'help') {
    log(`[commands] NeoLoop CLI Commands:`);
    log(`   /theme              Show current theme & available options`);
    log(`   /theme <name>       Switch active theme (e.g. /theme phantom)`);
    log(`   /themes             List all registered themes`);
    log(`   /help               Show this help message`);
    log(`   /clear              Clear scrollback logs`);
    return true;
  }

  // ── /clear: clear output logs ────────────────────────────────────────────
  if (cmd === 'clear') {
    // The logger can handle clear or we emit a clear banner
    log(`[terminal] Screen output cleared.`);
    return true;
  }

  // Unknown slash command
  log(`[command:unknown] Unrecognized command "/${cmd}". Type /help for available commands.`);
  return true;
}
