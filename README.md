# NeoLoop

> **THINK. CODE. EXECUTE.**

Terminal-native AI coding agent CLI built with [Ink](https://github.com/vadimdemedes/ink) + TypeScript.

---

## Project Structure

```
neoloop/
├── neoloop.tsx          # Main entrypoint — bootstrap, App component, keyboard handler
├── src/
│   ├── core/
│   │   ├── splash.ts    # Raw-ANSI splash screen: matrix rain + ASCII logo + shimmer
│   │   └── clipboard.ts # Cross-platform clipboard & OSC 52 integration
│   ├── theme/
│   │   ├── types.ts     # Strong TypeScript definitions for theme tokens
│   │   ├── themes.ts    # Central registry importing all theme packages
│   │   ├── manager.ts   # Active theme state, color math & rain/shimmer generators
│   │   ├── context.tsx  # React Ink ThemeProvider and useTheme() hook
│   │   ├── commands.ts  # Slash command dispatcher (/theme, /themes, /help)
│   │   ├── phantom/     # Phantom theme directory
│   │   ├── akira/       # Akira theme directory (Crimson Protocol)
│   │   ├── matrix/      # Matrix theme directory
│   │   ├── cyberpunk/   # Cyberpunk theme directory
│   │   ├── dracula/     # Dracula theme directory
│   │   └── index.ts     # Single unified export barrel
│   └── ui/
│       └── WelcomeScreen.tsx  # Terminal input bar + history (Ink/React)
├── package.json
├── tsconfig.json
└── .gitignore
```

## Getting Started

```bash
npm install
npm start          # run with splash screen
npm run dev        # alias for start
npm run typecheck  # TypeScript check without emitting
```

### Flags

| Flag | Effect |
|------|--------|
| `--no-splash` | Skip the matrix splash screen |
| `NO_COLOR=1`  | Same as `--no-splash` |

## Theme System & Slash Commands

NeoLoop includes a centralized design token system. Every component—the ANSI digital rain simulation, ASCII block typography, continuous tagline shimmer, input bar, selection highlight, and React Ink widgets—renders directly from active theme tokens.

### Active Theme: **Phantom** (Default)

The **Phantom** theme is a Spectral Ghost Protocol aesthetic featuring hyper-luminous spectral mint typography against an abyssal void, paired with cascading ultraviolet matrix rain and solar amber highlights:

```ts
const phantom = {
  name: "Phantom",

  background: "#05060A",
  surface: "#0B0D14",
  surfaceElevated: "#121624",
  border: "#202738",

  text: "#EDF2F7",
  textMuted: "#7989A0",

  accent: "#00FFA3",
  accentStrong: "#A855F7",
  secondary: "#FFB703",

  logo: "#00FFA3",
  logoGlow: "#007A4D",

  matrixRain: "#A855F7",
  matrixRainHead: "#F3E8FF",

  tagline: "#FFB703",
  shimmer: "#FFFFFF",

  inputText: "#EDF2F7",
  inputPlaceholder: "#4A576D",
  cursor: "#00FFA3",

  selection: "#2D154B",

  success: "#00FFA3",
  warning: "#FFB703",
  error: "#FF2A6D"
};
```

### Slash Commands

Users can inspect and switch themes live without restarting:

- `/theme` or `/themes`: View active theme, descriptions, and list of available themes.
- `/theme phantom`: Switch to the flagship Phantom theme (Spectral Mint + Ultraviolet Rain).
- `/theme akira`: Switch to Akira (Crimson Red + Molten Amber Rain + Cyan).
- `/theme matrix`: Switch to classic phosphor green Matrix theme.
- `/theme cyberpunk`: Switch to high-voltage neon gold and synthwave magenta.
- `/theme dracula`: Switch to vampire purple and lilac.
- `/help`: Display available slash commands.

### Using Theme Tokens in UI Components

When adding any UI component in NeoLoop:

```tsx
import { useTheme } from '../theme/index.js';

export function MyWidget() {
  const theme = useTheme();

  return (
    <Box borderStyle="single" borderColor={theme.border}>
      <Text color={theme.accent}>Active: </Text>
      <Text color={theme.text}>Hello NeoLoop</Text>
    </Box>
  );
}
```

## Mouse & Clipboard Actions

NeoLoop features an interactive, floating cyberpunk Clipboard & Action Window:

- **Click Input Bar**: Automatically positions the cursor and opens the Clipboard Matrix above the input bar.
- **Click `[ 📋 Menu ]`**: Toggles the custom copy window.
- **Right-Click Anywhere**: Grabs the target line under your cursor (logs, prompt, or terminal screen) and opens the custom copy window directly at the mouse coordinates.
- **Text Inspector Mode**: Hover and click any terminal line to copy it directly to your OS clipboard.

| Option | Shortcut | Action |
|--------|----------|--------|
| `[1]` Cut Input | `Ctrl+X` | Cut input bar text to clipboard |
| `[2]` Copy Input | `Ctrl+C` | Copy input bar text to clipboard |
| `[3]` Paste | `Ctrl+V` | Paste OS clipboard into input bar at cursor |
| `[4]` Copy Clicked Line | `Enter` / Click | Copy line targeted by right-click |
| `[5]` Copy All Logs | `Logs` | Copy all terminal logs and command history |
| `[6]` Copy Terminal Screen | `Screen` | Copy full visible screen text without ANSI codes |
| `[7]` Select & Copy Any Line | `Pick` | Interactive line picker mode |
| `[8]` Clear Input | `Esc` | Clear the input bar |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Any printable key | Append to input |
| `Backspace` / `Delete` | Remove character before/at cursor |
| `Left` / `Right` / `Home` / `End` | Navigate cursor without pausing animation |
| `Ctrl-V` | Paste from OS clipboard directly into input bar |
| `Ctrl-X` | Cut input bar text directly to OS clipboard |
| `Ctrl-C` | Copy input (or press again within 1.5s to exit) |
| `F2` / `Alt-C` | Toggle Custom Clipboard Window |
| `Enter` | Submit command to agent execution flow / execute selected menu item |
| `Esc` | Close clipboard window / clear input |
