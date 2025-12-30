# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Viswave Tutorials is a monorepo for building interactive touch-screen tutorials. It consists of:
- **tutorial-maker**: Desktop authoring tool (Tauri + React + Vite) - creates and exports tutorials as standalone executables
  - **player**: Player runtime (Tauri + Rust) - embedded into maker for standalone exports
- **shared**: Common components, hooks, types, and utilities

## Commands

### Development
```bash
npm run dev:maker     # Start tutorial-maker with Tauri dev mode (port 5173)
npm run dev:player    # Start player with Tauri dev mode (port 5174) - for testing
```

### Building
```bash
# IMPORTANT: Build player first, then maker (maker embeds player.exe)
npm run build:player  # Build player runtime
npm run build:maker   # Build maker (embeds player.exe)
```

### Formatting
```bash
npm run format        # Prettier formatting across all packages
```

### Testing
```bash
# In packages/shared or packages/tutorial-maker
npm run test          # Run Vitest in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

### Per-Package Commands
```bash
# In packages/shared
npm run test          # Vitest watch mode (recentFiles, usePageNavigation)
npm run test:run      # Run tests once

# In packages/tutorial-maker
npm run dev           # tauri dev (includes Vite + Rust)
npm run tauri:build   # Build desktop binary (requires viewer built first)
npm run build:vite    # Frontend only (tsc + vite)
npm run test          # Vitest watch mode (pageValidation)
npm run test:run      # Run tests once

# In packages/tutorial-maker/player
npm run dev           # tauri dev (includes Vite + Rust)
npm run tauri:build   # Build player binary
npm run build         # Frontend only (tsc + vite)
```

## Architecture

### Monorepo Structure
```
packages/
├── shared/           # @viswave/shared - reusable code
│   └── src/
│       ├── components/product/  # VideoPlayer, PageButton, TouchAreaComponent
│       ├── hooks/               # usePageNavigation, useTutorialViewer
│       ├── types/               # Project, Page, PageButton, TouchArea
│       └── utils/               # tutorialLoader, recentFiles
└── tutorial-maker/   # @viswave/tutorial-maker - Tauri desktop authoring tool
    ├── src/
    │   ├── pages/               # BuilderPage, ProductPage (preview)
    │   ├── components/builder/  # PageEditor, FlowMap, PageList, ButtonEditor
    │   ├── hooks/               # useProductProject
    │   └── utils/               # mediaStorage, projectExporter, pageValidation
    ├── src-tauri/               # Rust backend (lib.rs, embedded.rs)
    └── player/       # @viswave/tutorial-player - Player runtime
        ├── src/                 # React frontend
        └── src-tauri/           # Rust backend (lib.rs, embedded.rs)
```

### Data Flow
1. **Builder (tutorial-maker)**: Projects and media stored in IndexedDB
2. **Export**: Standalone executable with embedded tutorial data
   - Maker embeds player.exe at build time (via `include_bytes!`)
   - Export appends project JSON, media files, button images, app icon to player binary
   - Uses magic bytes (`VISTUT_V1`) and manifest for data extraction
3. **Player (tutorial-maker/player)**: Reads embedded data from self, extracts to Object URLs for playback

### Key Data Models (packages/shared/src/types/Project.ts)
- `Project`: Container with pages array and settings
- `Page`: Has mediaType (video|image), playType (loop|single), buttons, touchAreas
- `PageButton`/`TouchArea`: Position and size in percentage (0-100), action (next|goto)
- `ProjectSettings`: Window dimensions, fullscreen, exitKey, navigation options

### Navigation System
The `usePageNavigation` hook manages page transitions:
- Preloads current page + all connected pages (next page, goto targets)
- Supports both linear (next) and non-linear (goto specific page) navigation
- loop mode: repeats media infinitely, requires button/touch to navigate
- single mode: plays N times then auto-advances

### Media Storage
- **IndexedDB stores**: projects, mediaFiles, buttonImages, appIcons
- **Export format**: Standalone executable (viewer.exe + appended binary data)
- **Binary structure**: [viewer.exe][media files][buttons][icon][project JSON][manifest JSON][manifest size (8 bytes)][magic bytes]
- Position/size stored as percentages for responsive layout

### Validation Rules (pageValidation.ts)
- Every page requires media
- Loop mode pages must have at least one button or touch area (escape route)
- goto actions validated for target page existence

## Tech Stack
- Frontend: React 19, TypeScript 5.9, Tailwind CSS 3.4
- Build: Vite 7.1
- Testing: Vitest (shared, tutorial-maker)
- Desktop: Tauri 2.0 with Rust backend (maker and player)
- Storage: IndexedDB (idb pattern in mediaStorage.ts)
- Export: Binary embedding (player.exe + appended data with magic bytes)
- Drag/Drop: @dnd-kit for page reordering

## Build Dependencies
- **player must be built before maker**: Maker uses `include_bytes!` to embed player.exe at compile time
- Build order: `npm run build:player` → `npm run build:maker`
