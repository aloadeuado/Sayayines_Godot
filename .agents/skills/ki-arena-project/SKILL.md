---
name: ki-arena-project
description: Maintain Ki Arena gameplay, Firebase data and environment behavior, Twitch stream integration, and project documentation in this repository.
---

# Ki Arena project maintainer

Use this skill for changes to the Ki Arena game, its Firebase integration, environments, Twitch chat, or project architecture. The repository `AGENTS.md` points here; the current detailed facts live in `KiArena/docs/`.

## Before changing the project

- Read `KiArena/docs/PROJECT_SPEC.md` and `KiArena/docs/CHANGELOG.md`.
- Read `ARCHITECTURE.md`, `FIRESTORE.md`, or `TWITCH_INTEGRATION.md` when the task touches those areas.
- Inspect the current code before relying on the specifications; when they conflict, treat the code as current behavior and reconcile the docs as part of the task.

## Preserve project invariants

- This is a static browser game. Firebase Hosting serves `KiArena/public/`; the gameplay entry is `index.html`, and `ki-arena.html` preserves the older route.
- `dev`, `qa`, and `prod` currently select collection namespaces in the same Firebase project. They are not separate security or billing boundaries.
- Firestore is the persistent source for user profiles, messages, and combat events. Do not add local-storage persistence without an explicit request.
- Keep Twitch credentials out of browser files, Firestore documents, and Git. Twitch chat connection is planned, not implemented.
- Keep gameplay rules out of the Firebase adapter. The current arena code is still a combined game/controller module; extract smaller modules incrementally and verify the old behavior.
- Treat level `N` (1–100) as the source for character combat attributes and active power scaling. Keep each base value and per-level multiplier in the environment's gameplay settings, and display the formula and multiplier in Settings.
- Every implemented/usable power must have its own configurable level-scaling multiplier in Settings. When adding a power, register its formula/defaults in `public/src/config/gameplay-settings.js`, connect combat damage to that setting, render it in Settings, and update the project spec. Catalog ideas that are not implemented must be labeled pending and must not imply they affect combat.
- Settings must list eligible character/race options and allow enabling/disabling each one. Disabled options are excluded only from assignment to newly created users; do not rewrite existing users' saved race or progress.
- Persist gameplay settings in Firestore under the selected environment (`environments/{env}/kiArenaSettings/gameplay`); do not store them in browser-local persistence.

## Keep the project record current

For every new user instruction about this project, append a dated entry to `KiArena/docs/CHANGELOG.md`. Record the request in concise terms, resulting decisions or code/doc files, verification performed, branch/commit when known, and unresolved dependencies. If a request establishes a new product rule or changes a documented fact, update `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `FIRESTORE.md`, or `TWITCH_INTEGRATION.md` as appropriate. Mark unimplemented ideas as planned; never document an intention as a completed feature.

## Finish changes responsibly

- Preserve the branch named by the user; do not merge into `main` unless asked.
- When the user asks for verification, check JavaScript module syntax, static paths/assets, and the browser experience relevant to the change. Avoid commands that mutate live Firebase data for a UI smoke test.
- If a restructure risks deleting working files, preserve a recoverable copy until the new entry point and assets have been verified.
- Report which branch/commit was updated and clearly distinguish GitHub commits from Firebase Hosting deployments.
