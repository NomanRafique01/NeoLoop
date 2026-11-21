/**
 * NeoLoop CLI — Slash Commands Registry
 *
 * Defines the registered slash commands, their descriptions, and execution handlers.
 */

export interface CommandContext {
  openThemePicker: () => void;
  showHelp: () => void;
  clearLogs: () => void;
  exit: () => void;
  log: (msg: string) => void;
}

export interface SlashCommand {
  name: string;
  description: string;
  run: (ctx: CommandContext) => void | Promise<void>;
}

export const COMMAND_REGISTRY: SlashCommand[] = [
  {
    name: '/theme',
    description: 'Change color theme',
    run: (ctx) => {
      ctx.openThemePicker();
    },
  },
  {
    name: '/help',
    description: 'Show commands and shortcuts',
    run: (ctx) => {
      ctx.showHelp();
    },
  },
  {
    name: '/clear',
    description: 'Clear the output log',
    run: (ctx) => {
      ctx.clearLogs();
    },
  },
  {
    name: '/exit',
    description: 'Quit NeoLoop',
    run: (ctx) => {
      ctx.exit();
    },
  },
];
