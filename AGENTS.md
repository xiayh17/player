# Repository Guidelines

## Project Structure & Module Organization

`player/` is a Tauri 2 desktop app with a Vue 3 frontend. `src/` contains application code: `pages/` for routed screens, `components/` for shared UI, `stores/` for Pinia state, `features/` for domain logic, `router/` for navigation, `locales/` for i18n, and `styles/` for global CSS. `src-tauri/` contains the Rust backend, including Tauri commands under `src-tauri/src/commands/`. `scripts/` stores Node helpers used by the Tauri scripts. `docs/plans/` is for design and implementation notes, not runtime code.

## Build, Test, and Development Commands

Run all commands from `player/`:

- `pnpm install`: install frontend dependencies.
- `pnpm dev`: start the Vite frontend only.
- `pnpm tauri:dev`: launch the full desktop app with the Rust backend.
- `pnpm build`: run `vue-tsc --noEmit` and produce the frontend build in `dist/`.
- `pnpm tauri:build`: create a production desktop build.
- `pnpm type-check`: run TypeScript checks without bundling.

Use `pnpm tauri:dev` for feature work that touches filesystem access, dialogs, or Rust commands.

## Coding Style & Naming Conventions

Match the existing style. Vue and TypeScript files use 2-space indentation and double quotes. Keep Vue SFCs in PascalCase, composables in `useXxx.ts`, and stores in `src/stores/`. Prefer `script setup` for Vue components and keep route pages under `src/pages/`. Reuse the `@/` path alias instead of deep relative imports. For Rust changes, keep modules small, place new commands in `src-tauri/src/commands/`, and format with `cargo fmt`.

## Testing Guidelines

There is no dedicated automated test suite configured yet. Before opening a PR, run `pnpm type-check`, `pnpm build`, and validate the target flow in `pnpm tauri:dev`. For backend changes, exercise the related Tauri command from the UI. For editor or protocol work, test with representative sample files rather than empty-state smoke checks only.

## Commit & Pull Request Guidelines

Recent history mixes plain subjects with conventional prefixes, but `feat:`, `fix:`, `chore:`, and `init:` are the clearest pattern to follow. Keep commit messages short and imperative, for example `feat: add protocol navigator filters`. PRs should describe the user-visible change, list validation commands, link the relevant issue, and include screenshots for UI updates.
