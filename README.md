# CodeGrove

The existing CodeGrove learning portal, migrated to React + Node.js + Express + MySQL + Prisma. The original React pages, branding, shared components, assets, and learning content are retained. This project is a small original programming learning library inspired by common tutorial-site navigation patterns.

## Stack and architecture

- React 19, TypeScript and Vite 8 render the existing UI.
- Express 5 on Node.js serves JSON APIs and, after a build, the React static files.
- Prisma 6.19.3 handles all application database access through MySQL.
- Development: the browser uses Vite on port 5173; Vite proxies `/api` to Express on port 3001.
- Production: Express serves both `frontend/dist/` and `/api` on one origin.
- Authentication uses local email/password accounts and database-backed opaque cookie sessions. ChatGPT authentication, Cloudflare Workers, D1 and Drizzle are not required.

## Preserved features

Twenty lessons across eight topics, four courses with enrollment and completion tracking, eight JavaScript exercises with 33 reference test cases, an eight-question quiz with explanations and the latest saved score, search, bookmarks, dashboard, interview preparation, responsive layout, and device-local theme preferences.

The existing playground and exercise runner use an opaque-origin iframe and disposable Worker with a three-second timeout and network restrictions. Execution supports JavaScript. Other language examples remain readable tutorials. Exercise test details appear in the browser; the database stores solved status and the latest quiz score, as before. This migration does not invent historical attempt records, competitive judging, payments, videos, or an admin CMS.

## Requirements

- Node.js 22.13 or newer (verified with Node 24).
- MySQL 8.0 or newer (verified with MySQL 8.0.46).
- pnpm 11.25.0, matching `packageManager` and `pnpm-lock.yaml`.

## Install and configure

From the extracted project folder:

```sh
npx pnpm@11.25.0 install --frozen-lockfile
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env`. Edit `.env` with your local database settings. Do not commit or share that file. npm can run all the scripts below; pnpm is used for installation to preserve the existing dependency lockfile.

Start your local MySQL service. In a MySQL administrator session, create a development user and databases (replace the password placeholder yourself):

```sql
CREATE DATABASE codegrove CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE DATABASE codegrove_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'codegrove_dev'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_YOUR_LOCAL_PASSWORD';
GRANT ALL PRIVILEGES ON codegrove.* TO 'codegrove_dev'@'127.0.0.1';
GRANT ALL PRIVILEGES ON codegrove_shadow.* TO 'codegrove_dev'@'127.0.0.1';
```

Use matching values in `.env`:

```dotenv
DATABASE_URL="mysql://codegrove_dev:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:3306/codegrove"
SHADOW_DATABASE_URL="mysql://codegrove_dev:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:3306/codegrove_shadow"
PORT=3001
HOST=127.0.0.1
APP_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001"
NODE_ENV=development
SESSION_DAYS=7
TRUST_PROXY_HOPS=0
```

URL-encode special characters in database passwords. The shadow URL must point to a separate, disposable database, never the application database. Development migrations may erase the shadow database.

## Google sign-in setup

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), create/select a project. Configure Branding (CodeGrove name, support/contact emails, and your real production homepage/privacy URLs), Audience (External or your Workspace organization), and Data Access for `openid`, `email`, and `profile`. Add test users while the consent app is in Testing; publish/configure verification as required before public use.
2. Create an OAuth client of type **Web application**. Put its real Client ID and Client Secret in server-side `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Never prefix these with `VITE_` or commit them. No credentials are supplied by this project.
3. Register the exact **Authorized redirect URI** for the origin used to open CodeGrove:

   | Environment | Exact callback URI |
   | --- | --- |
   | Vite development (recommended) | `http://localhost:5173/api/auth/google/callback` |
   | Vite via IP, if used | `http://127.0.0.1:5173/api/auth/google/callback` |
   | Express serving a local build | `http://localhost:3001/api/auth/google/callback` |
   | Production | `https://YOUR_REAL_HOST/api/auth/google/callback` |

   The production hostname is deployment-specific: replace `YOUR_REAL_HOST` with your actual host, then register that exact URL. Set `GOOGLE_REDIRECT_URI` to the matching full URL and include its origin in `APP_ORIGINS`. Use the same origin to start and finish sign-in; do not mix localhost, IP, ports or subdomains. Vite proxies `/api` to Express. Production must serve frontend and `/api` on the same HTTPS origin. This server-side flow does not require an Authorized JavaScript Origin.
4. Run `npm run prisma:generate` and `npm run db:deploy` to add the Google identity/attempt tables without altering existing account data. Restart Express after changing credentials. In production set `NODE_ENV=production` and configure `TRUST_PROXY_HOPS` for your actual reverse proxy.

Google registration and sign-in share the authorization-code flow. `openid-client` validates Google tokens on the server with signature, issuer, audience, expiry and nonce checks; attempts use state, PKCE and a short-lived HTTP-only browser cookie backed by MySQL. Google subjects identify accounts. If an email already belongs to a local account, sign in with its password first, then explicitly choose **Link Google account** on `/signin`; the same authenticated session must finish linking. Email matching never links accounts automatically. Tokens are not stored or sent to the frontend. Cancelling returns to the original auth mode with a retry message and safe local destination.

Without credentials, email/password authentication remains available and Google reports that configuration is required. See [Google's OpenID Connect setup](https://developers.google.com/identity/openid-connect/openid-connect) for consent and client configuration. After configuration, manually check consent, cancellation, first signup, repeat login, and linking with a Google test user; automated checks mock the provider and do not contact Google.

## Initialize the database

```sh
npx prisma generate
npx prisma validate
npx prisma migrate deploy
npm run db:seed
npm run db:import
npm run db:check
```

`migrate deploy` applies the included migration. The seed inserts the exact original catalog from `frontend/app/data.ts` without overwriting existing content or user progress. The importer preserves the five original progress records from `migration/legacy-progress.json`, including values and timestamps. Both commands can be rerun without duplicating data. Imported records are intentionally not assigned to a new person automatically.

For future schema changes during development:

```sh
npx prisma migrate dev --name describe_your_change
npx prisma generate
npx prisma studio
```

Inspect and retain the resulting `prisma/migrations/` directory. Use `npx prisma migrate deploy` for existing migrations in deployed environments; do not use `migrate dev` there. The existing migration uses binary string collation to preserve case-sensitive identifiers from SQLite. Prisma 6 is pinned; the CLI's warning about `package.json#prisma` deprecation concerns a future Prisma 7 upgrade, not a failed generation or migration.

## Run locally

```sh
npm run dev
```

Open `http://localhost:5173`. This starts both Express and Vite. Alternatively, run `npm run dev:server` and `npm run dev:client` in separate terminals. Do not open the HTML file directly.

For a production build and local production-server check:

```sh
npm run build
npm start
```

Open `http://localhost:3001`. `npm start` serves the existing build; it does not run migrations, seed data, or rebuild. For an actual deployment, set `NODE_ENV=production`, serve through HTTPS, configure `APP_ORIGINS` to the public origin, and set `HOST` and `TRUST_PROXY_HOPS` for your hosting environment. Secure session cookies require HTTPS in production. Keep the frontend and API on the same public origin. The legacy published Site is unchanged; this standalone Node app needs a Node-capable host and MySQL.

## Accounts and existing progress

Visit `/register`, create a local account, and sign in at `/signin`. Passwords must be 12–128 characters. Passwords use salted scrypt; only a hash of each random session token is stored in MySQL. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Logout revokes the session. Expired sessions are rejected. There is no JWT or shared authentication secret to configure. Email verification and password recovery were not part of the original project and are not added here.

The original five records used an internal ChatGPT user ID, with no email/password identity mapping in the source database. Import creates a preserved, non-login legacy account. After independently verifying who owns it, an administrator can link it to that person's registered local account:

```sh
npm run db:link-user -- LEGACY_USER_ID REGISTERED_EMAIL
```

Use the original ID in `migration/legacy-progress.json`. Never infer ownership from a new account's display name. This is a local administrator command, not a public API. It preserves newer progress on duplicate keys, transfers the other records transactionally, and prevents reassigning an already linked identity. Back up your database before administrative changes. The snapshot contains historical user progress and should be shared only with developers authorized to access it.

## APIs and data model

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Real MySQL connection check |
| `GET /api/catalog` | Ordered topics, lessons, courses, exercises and quiz questions |
| `POST /api/auth/register` | `{name,email,password}` → new account and session |
| `POST /api/auth/login` | `{email,password}` → session |
| `POST /api/auth/logout` | Revoke session and clear cookie; send `{}` |
| `GET /api/auth/me` | Current public user or `null` |
| `GET /api/profile` | Authenticated user's name, email, join date and sign-in methods |
| `PATCH /api/profile` | `{name}` → update the authenticated user's display name |
| `GET /api/progress` | Authenticated user's saved records |
| `POST /api/progress` | `{kind,item,value?,remove?}` → updated records |

Writes require `Content-Type: application/json` and an `Origin` in `APP_ORIGINS`. Progress kinds are `bookmark`, `complete`, `enroll`, `solved`, and `quiz`. The backend checks referenced content, validates input, and scopes access to the authenticated user. Client-supplied ChatGPT identity headers have no authority. Dashboard and course completion are derived from the same records as before.

The shared header's avatar menu provides **My Profile** (`/profile`), **My Courses** (`/my-courses`), **Edit Profile** (`/profile/edit`), and **Logout**. My Courses reuses the My learning dashboard and its existing enrollment/completion records. Profile editing accepts only a display name of 1–100 characters; email, passwords, and Google identities cannot be changed through this endpoint. Both profile endpoints use the existing session middleware and write protections. Logout calls the existing POST endpoint and revokes the database session.

Authentication cards use the available `references/gfg-login-current.png.png` and `references/gfg-register-current.png.png` as visual references only. Google is the only enabled social provider; Facebook, LinkedIn and GitHub are visibly disabled. Password recovery displays an availability explanation because this project has no reset backend. Profile avatars use initials because the current schema does not store images. No schema migration is needed for these account pages.

Prisma models: `User`, `Session`, `LearningProgress`, `Topic`, `Lesson`, `Course`, `CourseLesson`, `Exercise`, `Quiz`. `LearningProgress` retains the original `(user_id, kind, item)` composite key. Topics/lessons/courses have explicit relations; `CourseLesson` preserves curriculum order. JSON fields retain original content shapes without rewriting lessons or exercises.

## Environment variables

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | Required MySQL connection URL |
| `SHADOW_DATABASE_URL` | Separate MySQL database for development migrations; set in local configuration |
| `PORT` | Express port, default 3001 |
| `HOST` | Express bind address, default 127.0.0.1 |
| `APP_ORIGINS` | Comma-separated exact browser origins allowed to write |
| `NODE_ENV` | `development` locally; `production` for HTTPS deployments |
| `SESSION_DAYS` | Session lifetime, integer 1–30; default 7 |
| `TRUST_PROXY_HOPS` | Number of trusted proxy hops, default 0 |
| `TEST_DATABASE_URL` | Optional separate disposable MySQL database ending in `_test` |

## Tests

```sh
npm test
npm run build
```

The eight unit/source tests cover password hashing, progress validation, all 33 original coding reference cases, the serialized sandbox worker, all 49 portal routes and 1,654 rendered anchors, invalid routes, dead-control scans, and search/theme helpers. The build includes TypeScript checking. No standalone lint configuration is present; the old Next-specific lint configuration was removed with that runtime.

For MySQL integration tests, create `codegrove_test`, grant the development user access, and set `TEST_DATABASE_URL` in `.env`. Use only a disposable test database, never real user data:

```sql
CREATE DATABASE codegrove_test CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
GRANT ALL PRIVILEGES ON codegrove_test.* TO 'codegrove_dev'@'127.0.0.1';
```

```sh
npm run test:integration
```

The suite applies migrations, seeds twice, tests authentication and user isolation, compares the entire API catalog to the original content, exercises every progress kind and API validation, and checks import/linking and timestamp preservation. It also checks oversized requests, sign-in rate limiting and account rollback while the disposable session table is unavailable. It removes test-created users on completion; seeded content and migrations remain. See `CODEGROVE_FINAL_ACCEPTANCE.md` for current verification results and limitations; `migration/REPORT.md` records the earlier migration.

## Folder layout

```text
frontend/              React/Vite frontend and frontend-specific configuration
  app/                 Original React portal/content/styles; entry and local auth
  components/ui/       Existing shared UI components
  hooks/               Existing React hooks
  lib/                 Existing UI helpers
  public/              Existing assets
  index.html           Vite entry document
  vite.config.ts       React build and development API proxy
  postcss.config.mjs   Tailwind/PostCSS configuration
  components.json      Existing UI component configuration
  vendor/              Existing shadcn/Tailwind stylesheet and license
  dist/                Generated production frontend build (ignored)
backend/
  app.js               Express app and static/SPA routing
  server.js            Database connection and server lifecycle
  config/              Environment and Prisma client
  controllers/         Authentication and progress handlers
  middleware/          Session authentication and request protection
  routes/              Express API endpoints
  services/            Catalog, progress, passwords and sessions
prisma/
  schema.prisma        MySQL models
  migrations/          Checked-in SQL migration and provider lock
  seed.ts              Idempotent original-content seed
migration/             Original progress snapshot, provenance, audit/change reports
scripts/               Dev runner, DB check, legacy import and account linking
tests/                 Unit/source, MySQL integration, HTTP and browser tests
  browser/             Full V1 Playwright journey and failure scenarios
playwright.config.ts   Desktop/mobile Chromium acceptance configuration
tsconfig.browser.json  Browser-suite TypeScript check
package.json           Dependencies and executable scripts
pnpm-lock.yaml         Dependency lockfile
pnpm-workspace.yaml    Existing install policy
tsconfig.json          Shared TypeScript configuration and frontend aliases
.env.example           Non-secret environment template
CODEGROVE_IMPLEMENTATION_STATUS.md  Current implementation status
CODEGROVE_FINAL_ACCEPTANCE.md       Evidence and exact Windows acceptance steps
SOURCE_FILE_MANIFEST.txt            Complete exported source inventory
README.md              This guide
```

## Troubleshooting

- Connection refused / Prisma P1001: start MySQL and check host, port and database URL. Inside containers, use the database service hostname rather than localhost.
- Authentication/permission errors: confirm the MySQL account host and database grants. URL-encode the password in the connection URL.
- Missing catalog / HTTP 503: run migrations and `npm run db:seed`, then check server output.
- HTTP 403 on writes: use a browser origin listed exactly in `APP_ORIGINS`; restart the server after changes.
- Sign-in works but cookies are absent over HTTP: use development mode locally; production requires HTTPS.
- Missing production UI: run `npm run build` before `npm start`.
- Legacy progress not visible: import it, then perform administrator ownership verification and account linking.
- Changed catalog seed does not overwrite DB content: this is intentional data preservation; apply reviewed content changes separately.
- Vite reports a chunk over 500 kB: the production build still succeeds. Existing UI dependencies are preserved.

The source export excludes dependencies, generated build/client files, credentials and Git history. Install dependencies and generate Prisma Client after extraction. Do not expect an already running database inside the ZIP.

## Browser acceptance (Windows / local Codex)

Work could not open localhost because of `ERR_BLOCKED_BY_CLIENT`; this is an environment limitation, not an application defect. The local suite is ready, type-checked and discoverable; browser execution has not been claimed. Complete Windows/MySQL setup instructions and evidence are in `CODEGROVE_FINAL_ACCEPTANCE.md`. After configuring the disposable `TEST_DATABASE_URL` and generating Prisma Client:

```sh
npm run build
npm run test:browser:types
npm run test:browser:list
npx playwright install chromium
npm run test:browser
```

Playwright starts its own server on port 3101, migrates/seeds only the `_test` database, and runs the journey and failure scenarios on desktop/mobile Chromium. Do not run another server on 3101 or concurrent tests against that database. Use `npm run test:browser:headed` for an interactive desktop run and `npx playwright show-report` afterward. Synthetic browser accounts remain in the disposable test database for inspection. Browser output and dependencies are not exported.

`tests/http-smoke.mjs` also provides reproducible production-server/API checks: against your disposable verification environment, start the server, then run `node --env-file=.env tests/http-smoke.mjs` in another terminal. `DATABASE_URL` must match the server database; optional `HTTP_BASE_URL` defaults to `http://127.0.0.1:3001`. It creates and removes only its own synthetic account.
