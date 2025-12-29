# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Viswave Tutorials is a monorepo for building interactive touch-screen tutorials. It consists of:
- **tutorial-maker**: Web-based authoring tool (React + Vite)
- **tutorial-viewer**: Desktop viewer app (Tauri + Rust)
- **shared**: Common components, hooks, types, and utilities

## Commands

### Development
```bash
npm run dev:maker     # Start tutorial-maker dev server (port 5173)
npm run dev:viewer    # Start tutorial-viewer with Tauri dev mode (port 5174)
```

### Building
```bash
npm run build:maker   # TypeScript check + Vite build for web deployment
npm run build:viewer  # Full Tauri desktop app build (produces exe/dmg/deb)
```

### Formatting
```bash
npm run format        # Prettier formatting across all packages
```

### Testing (tutorial-maker only)
```bash
npm run test          # Run Vitest in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

### Per-Package Commands
```bash
# In packages/tutorial-maker
npm run dev           # Vite dev server
npm run build         # tsc + vite build
npm run preview       # Preview production build
npm run test          # Vitest watch mode
npm run test:run      # Run tests once

# In packages/tutorial-viewer
npm run dev           # tauri dev (includes Vite + Rust)
npm run tauri:build   # Build desktop binary
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
├── tutorial-maker/   # @viswave/tutorial-maker - web authoring tool
│   └── src/
│       ├── pages/               # BuilderPage, ProductPage (preview)
│       ├── components/builder/  # PageEditor, FlowMap, PageList, ButtonEditor
│       ├── hooks/               # useProductProject
│       └── utils/               # mediaStorage, projectExporter, pageValidation
└── tutorial-viewer/  # @viswave/tutorial-viewer - Tauri desktop app
    ├── src/                     # React frontend
    └── src-tauri/               # Rust backend (lib.rs, Cargo.toml)
```

### Data Flow
1. **Builder (tutorial-maker)**: Projects and media stored in IndexedDB
2. **Export**: ZIP file (.tutorial) containing manifest.json, project.json, media/, buttons/, icons/
3. **Viewer (tutorial-viewer)**: Loads .tutorial ZIP files, extracts to Object URLs for playback

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
- **Export format**: ZIP with media blobs in folders
- Position/size stored as percentages for responsive layout

### Validation Rules (pageValidation.ts)
- Every page requires media
- Loop mode pages must have at least one button or touch area (escape route)
- goto actions validated for target page existence

## Tech Stack
- Frontend: React 19, TypeScript 5.9, Tailwind CSS 3.4
- Build: Vite 7.1
- Testing: Vitest (tutorial-maker)
- Desktop: Tauri 2.0 with Rust backend
- Storage: IndexedDB (idb pattern in mediaStorage.ts)
- Export: JSZip for .tutorial files
- Drag/Drop: @dnd-kit for page reordering
