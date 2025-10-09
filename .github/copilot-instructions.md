# Copilot Instructions for AI Coding Agents

## Project Overview
- **Purpose:** React component library for PDF annotation, built on top of PDF.js.
- **Key Features:**
  - Text and image highlights
  - Popover text for highlights
  - Scroll to highlights
  - Area and text selection
- **Main Example:** See `example/src/App.tsx` for usage patterns and integration.

## Architecture & Key Files
- **Component Structure:**
  - `src/components/` — Core annotation components (e.g., `PdfHighlighter.tsx`, `Highlight.tsx`, `AreaHighlight.tsx`)
  - `src/lib/` — Utility functions for PDF coordinate math, DOM, and image extraction
  - `example/src/` — Example app, including `App.tsx` (main integration point), `Sidebar.tsx`, and demo assets
- **Styling:**
  - CSS modules in `src/style/` and global styles in `example/src/style/`
  - Import `react-pdf-highlighter/dist/style.css` for required styles

## Developer Workflows
- **Install dependencies:**
  - `npm install`
- **Run example app:**
  - `npm start` (runs Vite dev server for the example)
- **Build library:**
  - `npm run build`
- **Test (E2E):**
  - Playwright tests in `e2e/`, run with `npx playwright test`

## Project Conventions
- **Highlight Data:**
  - Highlights are objects with `id`, `position`, `content`, and `comment` fields (see `IHighlight` in `react-pdf-highlighter.ts`)
  - Example highlight data in `example/src/test-highlights.ts`
- **PDF URLs:**
  - Example PDFs are referenced by relative path in `example/src/App.tsx` (see `clientPdfUrls`)
- **Component API:**
  - Main entry: `<PdfHighlighter ... />` with render props for highlight rendering and selection
  - Use `Sidebar` for highlight list and document switching
- **Area Selection:**
  - Hold `Alt` while selecting to create area highlights

## Integration & Extensibility
- **External Dependencies:**
  - Relies on `pdfjs-dist` for PDF rendering
  - Uses Playwright for E2E testing
- **Adding New Features:**
  - Extend components in `src/components/` and update example in `example/src/`
  - Follow the pattern in `App.tsx` for new highlight types or UI features

## References
- See [README.md](../README.md) for install and usage basics
- Example usage: `example/src/App.tsx`
- Component API: `src/components/`

---

**If you add new highlight types, update both the example app and the highlight data structure.**
