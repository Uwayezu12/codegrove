# Authentication and account experience

Updated the existing React/Express/Prisma application in place. No database migration, dependency change, OAuth replacement, or `.env` edit was needed.

## Changes

- Login and registration use centered, responsive cards with the existing CodeGrove homepage behind an inert overlay, labeled inputs, password visibility controls, keyboard focus containment, Escape/close behavior, and inline errors. Switching between the two modes uses browser history without reloading the page and preserves the safe return destination.
- Google retains the existing authorization and explicit account-linking flow. Facebook, LinkedIn, and GitHub appear as disabled buttons. Password recovery explains that no reset service exists.
- The shared header shows the signed-in user's initials and an accessible dropdown containing My Profile, My Courses, Edit Profile, and Logout. Logout calls the original POST endpoint; the duplicate dashboard sign-out control was removed. The existing direct sign-out page remains available.
- `/profile` displays database-backed name, email, join date, and sign-in methods. `/profile/edit` saves the name through `PATCH /api/profile`, then refreshes the visible name/avatar. Email, password, and provider identity are not editable through this API.
- `/my-courses` reuses the existing My learning dashboard, enrollment records, completion records, and course catalog. Enrolled courses show completion counts, progress bars, and status.
- Private profile endpoints use `authenticate` and `requireUser`. Updates preserve the existing JSON/origin write protection, derive ownership from the session, and reject unknown fields. Private frontend routes redirect signed-out visitors to login.
- Existing theme variables style the new account pages, menu, fields, and feedback in light and dark modes.

## Reference availability

The requested `login-reference.png`, `register-reference.png`, and `authenticated-menu-reference.png` do not exist in `references/`. The available `gfg-login-current.png.png` and `gfg-register-current.png.png` were inspected and used instead. The account menu follows the written specification because no corresponding screenshot was available. Reference images are not imported or served by the application.

The actual schema supports name and email, without username, institution, organization, or avatar fields. Registration retains its existing required fields. Initials provide the avatar fallback without adding unnecessary database columns.

## Verification

- `npm run build`: passed (existing large-bundle advisory remains).
- `npm test`: all 14 tests passed.
- `npm run test:integration`: passed against the configured disposable `_test` database. Includes profile validation, ownership isolation, protected fields, persisted name updates for local and Google-only users, preserved Google subjects, session revocation, and existing catalog/progress/OAuth checks.
- `npm run test:browser:types`: passed.
- `npm run test:browser -- tests/browser/account.spec.ts`: all 6 tests passed across desktop, tablet, and mobile Chromium. Covers both themes, no horizontal overflow, real registration/profile/course persistence, menu keyboard navigation, disabled providers, auth switching, Google cancellation feedback, and private routes after logout.
- `npm run test:browser -- tests/browser/acceptance.spec.ts --project=desktop-chromium`: all 5 existing acceptance tests passed. Covers the full learning journey, navigation, theme, exercise runner, progress retries, authentication errors, and user isolation. Updated stale auth selectors and confirmed that dropdown logout waits for the complete server response before navigating.
- Screenshots: `outputs/account-ux/` (local ignored artifacts).

Google configuration presence and the expected localhost callback were checked without printing credential values. Automated OAuth tests use a mock provider with the real OIDC verification library; live Google consent was not exercised. Password reset remains unavailable because the existing application has no reset backend.
