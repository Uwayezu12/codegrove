# CodeGrove visible interaction audit

Source reviewed 2026-09-21. Browser execution remains blocked by Work's ERR_BLOCKED_BY_CLIENT. This inventory maps all authored visible control categories, including controls repeated for catalog rows. Shared UI primitives are inspected where used, not counted as standalone product pages.

| Surface | Controls | Source/API conclusion | Local browser coverage |
| --- | --- | --- | --- |
| Global | Brand, main navigation, quick topics, footer links | Valid catalog/static destinations; 1,654 rendered anchors checked | Route inventory + full journey |
| Global | Skip link, theme, account, mobile menu | Real target, storage-tolerant state, correct auth destination, aria-expanded/controls | Theme/menu plus rendered links; keyboard skip target source checked |
| Home | Search submit, popular topics, topic/article/course cards, daily practice, quiz banner | Real form/destinations; no fake clickable cards | Journey + route inventory |
| Tutorials | Topic chips and lesson links | Catalog validated; unknown topic now missing view | Journey + all topic routes |
| Lesson | Sidebar, browse topics, containing-course backlinks, next lesson | All valid catalog references | Route inventory and journey |
| Lesson | Copy, bookmark toggle, completion toggle | Clipboard catch visible; authenticated load gating; retryable writes/removal | Clipboard failure, save/complete journey; deletion in API tests |
| Courses | Cards, enrollment, curriculum | Prisma-backed; idempotent enrollment; loading/busy/enrolled disabled states | Journey and persistence |
| Search | Text entry/submit/results | Multiple terms, topic labels, URL query, per-type counts and empty states | Journey + empty search |
| Practice | Search, difficulty select, problem rows | Stateful Radix select and combined filters; valid links; empty feedback | Journey |
| Problem | Problem/Hint/Solution tabs, solution copy | Real tab content; shared copy implementation | Journey; clipboard failure shared component |
| Problem | Editor, reset, Run, Submit, result feedback | Execution/save busy gating; errors release controls; solved persistence | Journey + failure/timeout controls |
| Compiler | Editor, Run, Reset, output | Working reset; busy gating and finally recovery | Journey + timeout |
| Interview | Five accordion questions, checklist, practice and quiz links | Real Radix expanded state and valid destinations | First accordion and quiz link; all authored entries source reviewed |
| Quiz | Radio choices, answer progress, submit, try again, save retry, guest sign-in | Requires all answers; score/explanations retained; retry avoids duplicate action ambiguity | Submission, disabled incomplete submit, explanations, retry/persistence; Try again handler source reviewed |
| Dashboard | Course/saved/completed/solved tabs, cards, empty-state links, sign out | Progress-derived values/valid links; retry loading | Journey and load failure |
| Authentication | Fields, register/login/logout submits, auth-switch/back links | Form submit handlers, safe local return path, server errors/busy states; atomic registration/session | Register/login/logout journey; invalid/expired credentials in API tests |
| Error/missing | Initial load retry, profile load retry, failed-write retry, home link | All actionable; no empty handlers | Profile/quiz retries and invalid-route recovery; generic initial retry source reviewed |

## Scan and verification boundaries

`tests/routes.test.tsx` rejects dead/empty hrefs, javascript:void(0), empty click handlers and TODO/FIXME markers in active application code. It server-renders all 49 portal routes, validates every rendered anchor and checks seven invalid-route variants. The four auth routes are separately covered by server/API checks and the browser journey. `#content` is intentional and resolves to the focusable content container.

Manual source review found no unused visible control, fake clickable card or placeholder action. Buttons without their own click handlers are either form submit buttons or stateful Radix controls; these are intentional. Input placeholder text and learning starter code are not placeholder functionality. Static sections/cards without click affordances remain explanatory content.

Automated source checks are not a replacement for browser interaction or visual review. Browser cases are configured and discoverable but have not been executed in Work. Not every repeated accordion/lesson button is individually clicked by the browser suite; shared implementations and catalog relations are exhaustively source-checked, and representative controls are exercised in the local journey.
