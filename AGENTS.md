# Agent / contributor notes

- **English-first:** README, docs under `docs/`, UI chrome defaults, commit messages, PR text, and new comments are written in English.
- **Locales:** Runtime translations live in `js/i18n/` and lazy packs under `data/locales/`. Do not reintroduce Chinese as the default shell language.
- **Catalog:** Source entries may still carry Chinese `name`/`description`; prefer extending locale packs (`npm run gen:model-locales`) over duplicating sidebar clones.
- **Tests:** `npm test` must stay green before push.
