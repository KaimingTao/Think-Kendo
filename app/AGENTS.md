# Repository Guidelines

## Project Structure & Module Organization
- `index.html` is the entry point; it loads the responsive card grid and modal logic.
- `src/` holds modular scripts (`src/cards.js`, `src/modal.js`) and shared utilities.
- `data/cards.json` stores card metadata (`id`, `title`, `summary`, `details`, `tags`).
- `assets/styles/` contains compiled CSS; author SCSS in `assets/styles/scss/`.
- `assets/images/` keeps optimized `.webp` thumbnails referenced by card entries.
- `docs/` mirrors the production-ready bundle pushed to GitHub Pages (built from `dist/`).

## Build, Test, and Development Commands
- `npm install` bootstraps dependencies (Vite, ESLint, Stylelint, Prettier).
- `npm run dev` starts the Vite dev server with hot reload at `http://localhost:5173`.
- `npm run build` emits an optimized `dist/` bundle ready for GitHub Pages.
- `npm run preview` serves the production build locally for sanity checks.
- `npm run deploy` syncs `dist/` to `docs/` and updates the `gh-pages` branch.

## Coding Style & Naming Conventions
- Use 2-space indentation, trailing commas in multi-line arrays/objects, and single quotes.
- Favor semantic HTML; every card uses `.card` with modifiers like `.card--featured`.
- JavaScript variables/functions use `camelCase`; exported modules use `PascalCase`.
- CSS classes are `kebab-case`; keep layout utilities in `utilities.css`.
- Run `npm run lint` (ESLint + Stylelint + Prettier) before committing.

## Testing Guidelines
- Unit tests live in `tests/` with filenames `*.spec.js`; execute via `npm run test` (Vitest).
- Interaction smoke tests go in `tests/e2e/` using Playwright triggered by `npm run test:e2e`.
- Add snapshots or DOM assertions for modal behavior and responsive breakpoints (≥2 cards per row).

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Example: `feat: add keyboard focus trap to card modal`.
- Keep PRs focused; include summary, testing notes, linked issues, and desktop/tablet/mobile screenshots for UI changes.
- Ensure `npm run lint` and relevant tests pass; update `docs/` from the latest `dist/` before merging.

## Content Workflow
- Add new cards via `data/cards.json`, keeping body text Markdown-friendly for future parsing.
- Store supporting assets under `assets/images/` and reference them in the card entry.
- Validate copy for accessibility (clear titles, concise summaries) and include `alt` text for every image.
