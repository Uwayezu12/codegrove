# Source change inventory

Compared with the original CodeGrove source at commit `7740bb5cd44d6d6d1f1f46950c54bb4d30e75b49`. No new commits were made.

The React portal changes only its catalog source and authentication wiring. Original styling is preserved with an appended auth form style. All original content, shared components, hooks, helpers, public assets and vendored files are retained.

Removed paths belonged to the replaced Cloudflare/Vinext/D1 runtime, Drizzle schema/migrations, example D1 application, Next-specific lint/configuration and platform build/install tooling. Their runtime responsibilities are covered by Express, Prisma, Vite and the new scripts. The old hosting descriptor is retained in `migration/previous-hosting.json` as inactive provenance.

## Modified

- `.gitignore`
- `README.md`
- `frontend/app/globals.css`
- `frontend/app/portal.tsx`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `frontend/vite.config.ts`

## Added

- `.env.example`
- `frontend/app/auth-page.tsx`
- `frontend/app/main.tsx`
- `frontend/app/types.ts`
- `backend/app.js`
- `backend/config/env.js`
- `backend/config/prisma.js`
- `backend/controllers/auth.js`
- `backend/controllers/progress.js`
- `backend/middleware/auth.js`
- `backend/middleware/security.js`
- `backend/routes/index.js`
- `backend/server.js`
- `backend/services/auth.js`
- `backend/services/catalog.js`
- `backend/services/password.js`
- `backend/services/progress.js`
- `frontend/index.html`
- `migration/CHANGES.md`
- `migration/REPORT.md`
- `migration/legacy-progress.json`
- `migration/previous-hosting.json`
- `prisma/migrations/20260915000000_mysql/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `scripts/check-db.mjs`
- `scripts/dev.mjs`
- `scripts/import-legacy.mjs`
- `scripts/link-legacy-user.mjs`
- `tests/integration.test.mjs`
- `tests/unit.test.mjs`

## Removed from migrated runtime

- `.openai/hosting.json`
- `app/[[...path]]/page.tsx`
- `app/api/progress/route.ts`
- `app/chatgpt-auth.ts`
- `app/layout.tsx`
- `build/sites-vite-plugin.LICENSE`
- `build/sites-vite-plugin.ts`
- `cloudflare-env.d.ts`
- `db/index.ts`
- `db/progress.ts`
- `db/schema.ts`
- `drizzle.config.ts`
- `drizzle/0000_greedy_meltdown.sql`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/_journal.json`
- `eslint.config.mjs`
- `examples/d1/app/api/notes/route.ts`
- `examples/d1/db/schema.ts`
- `next.config.ts`
- `scripts/build-verified.sh`
- `scripts/execution-profile.mjs`
- `scripts/install-ci.mjs`
- `scripts/install-ci.sh`
- `scripts/install-pnpm.sh`
- `scripts/pnpm-install.mjs`
- `scripts/run-framework.mjs`
- `scripts/sites-env.mjs`
- `scripts/sites-env.sh`
