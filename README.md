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
│   │   └── index.ts
│   └── ui/
│       ├── WelcomeScreen.tsx  # Terminal input bar + history (Ink/React)
│       └── index.ts
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

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Any printable key | Append to input |
| `Backspace` / `Delete` | Remove last character |
| `Enter` | Submit to agent execution flow |
| `Ctrl-C` | Exit |
