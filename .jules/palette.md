## 2024-08-01 - Dynamic Alert ARIA Roles
**Learning:** Found that dynamically injected alert notifications (e.g., success/error messages in `alert-box`) lacked the `role="alert"` attribute, meaning screen readers wouldn't automatically announce them when they appear.
**Action:** Ensure any conditionally rendered alert components include `role="alert"` and make sure dismiss buttons have clear `aria-label` attributes.
## 2024-05-18 - Keyboard Navigability in Custom Components
 **Learning:** Standard `div` elements acting as interactive components (like collapsible cards) are not natively keyboard accessible or screen reader friendly. They require explicit `role="button"`, `tabIndex={0}`, `aria-expanded`, and manual event handling for `Enter` and `Space` keys to behave like native buttons.
 **Action:** Always ensure that custom interactive components have equivalent keyboard access and ARIA roles applied if native HTML interactive elements (like `<button>` or `<a>`) cannot be used.

## 2024-05-24 - Missing Input Labels in React App
**Learning:** React form inputs without matching `id` and `htmlFor` attributes on their adjacent `<label>` elements break accessibility and screen reader support, even if wrapped properly visually. Relying on `aria-label` when a visible label exists is an anti-pattern as it does not allow users to click the label to focus the input.
**Action:** Always ensure every form `<input>` and `<select>` component in the codebase has a unique `id` attribute corresponding to the `htmlFor` property of its `<label>`.
## 2024-08-09 - Ensure Temporary Files Are Not Committed
**Learning:** Found that running scripts and package managers can leave artifacts that accidentally get added to commits. This clutters up pull requests and violates constraints (e.g. max lines).
**Action:** Make sure to run `git rm -f` on any created scratch scripts or lockfiles that shouldn't be added.
## 2026-08-17 - Adding aria-labels to buttons
**Learning:** Found multiple instances where buttons had actions like "Delete" or "Copy cURL" but no specific `aria-label` to identify what item they applied to. This is especially important for repeated items in lists or tables, where a screen reader user might encounter multiple "Delete" buttons without knowing which item each deletes.
**Action:** Always include an `aria-label` on repeated action buttons (like delete or edit) that includes a unique identifier or name for the item being acted upon (e.g., `aria-label="Delete warehouse location ${loc.id}"`).
## 2024-05-15 - Missing ARIA Labels on Dismiss Buttons
**Learning:** Found multiple instances where error alerts had functional elements but lacked accessible "Dismiss" actions. Icon-only buttons used to dismiss alerts must always carry descriptive `aria-label` attributes to ensure screen readers can announce their purpose clearly.
**Action:** Always ensure that dynamically generated alerts feature a dismiss mechanism and that any icon-only actions within these alerts include explicit ARIA labels.
## 2024-08-25 - Explicit Button Types in Forms
**Learning:** Found that injecting generic `<button>` elements (such as dismiss icons in alert banners) inside or near form components defaults to `type="submit"`. Clicking them will accidentally submit the form and refresh the page, creating a confusing UX.
**Action:** Always explicitly define `type="button"` on interactive `<button>` elements that are not intended to trigger form submissions.
## 2026-08-26 - Proper association of labels to selects and tracking loading state for a11y\n**Learning:** In React components like `RFIDBulkScannerView.tsx`, it's important to associate `label`s with `select` or `input` components via `htmlFor` and `id` attributes instead of just relying on text proximity. Async `button`s should also track `aria-busy` to announce the loading state to screen readers and explicitly state `type="button"` to prevent implicit form submissions.\n**Action:** When evaluating forms or settings panels, explicitly check that each `label` has an `htmlFor` paired with an `id` on its input. Always attach `aria-busy` to buttons when a loading state exists.
## 2024-08-27 - Loading Buttons without aria-busy
**Learning:** Found multiple instances where buttons that trigger async operations (like form submissions or data fetching) had `disabled={loading}` but lacked `aria-busy={loading}`. Screen readers rely on `aria-busy` to announce that the system is processing something, which is a critical piece of feedback for accessibility.
**Action:** Always ensure that buttons triggering async actions have both `disabled={loading}` and `aria-busy={loading}` attributes applied to provide clear feedback to assistive technologies.
## 2026-09-01 - Accessible Inputs
**Learning:** Found inputs lacking an associated label or `aria-label` making it difficult for screen readers to interpret context. Added an `aria-label` for a visually hidden label, and associated it.
**Action:** Always verify inputs have a valid `id` and `label` or `aria-label`.
## 2024-05-16 - Dynamic ARIA Labels in Lists
**Learning:** Found that generic `aria-label="Mark as read"` on repeated list items leaves screen reader users without context about which specific item they are acting upon.
**Action:** Always use template literals to inject unique item identifiers (e.g., IDs or names) into `aria-label` attributes for repeated action buttons in lists.
## 2024-05-18 - Missing Explicit button types and standard labels
**Learning:** Dismiss buttons on dynamically rendered alert messages often unintentionally trigger form submissions when placed near `<form>` elements because they lack `type="button"`. Furthermore, they often omit screen-reader friendly identifiers.
**Action:** When creating or modifying dynamic alert/error banner components, always include `role="alert"` and `aria-live="assertive"` for screen reader announcements. Additionally, explicitly set `type="button"` and an appropriate `aria-label` (e.g., 'Dismiss error') on dismiss buttons to prevent unintended form submissions and improve accessibility.
## 2024-05-16 - Context-Specific Accessible Labels in Lists
**Learning:** Generic icon-only or ambiguous text buttons (like "Approve" or "Delete") in data tables/lists fail WCAG guidelines without context. Furthermore, to satisfy the WCAG "Label in Name" criterion, the dynamic `aria-label` applied to an element must contain the exact visible text of that element.
**Action:** When adding `aria-label`s to disambiguate repeated buttons, use template literals to include the unique identifier (e.g., `aria-label={"Send PO ${po.id}"}`) while strictly ensuring the visible text ("Send PO") is a substring of the accessible name.
## 2026-09-13 - Missing label associations in custom dashboards
**Learning:** Found multiple instances where form inputs (`type="file"`, etc.) had visual labels without programmatic associations (missing `htmlFor` and `id`). This prevents users from clicking the label to trigger the file picker, limiting accessibility for users with motor impairments.
**Action:** When designing or updating custom form panels, always ensure `htmlFor` and `id` attributes explicitly link `<label>` elements to their corresponding `<input>` components.
## 2026-09-17 - Precision of aria-busy Binding
**Learning:** Found that when buttons had complex `disabled` logic (e.g., `disabled={loading || locations.length === 0}`), blindly copying that entire expression into `aria-busy` created an accessibility bug. `aria-busy` indicates active background processing, so applying it when a button is merely disabled due to missing input tells the screen reader the element is perpetually "loading".
**Action:** When adding `aria-busy` states to existing buttons, specifically isolate the variable representing the async loading state (e.g., `aria-busy={loading}`) rather than blindly mirroring the `disabled` property.

## Prevention Directives for Automated Refactoring
- **Never Overwrite Complete Files**: Always use range-scoped replacement chunks for edits to `schema.prisma`, `index.ts`, `public/index.php`, `db/schema.rb`, or DDL SQL scripts.
- **Do Not Remove Core Declarations**: Do not delete existing route registrations or database DDL tables.
- **Environment Isolation Compatibility**: When replacing fallback secrets, preserve test environment execution via `!getenv('APP_ENV')` or `getenv('APP_ENV') === 'testing'`.
- **No Scratch Files**: Never stage or commit `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `test.js` files to git.
- **No Unresolved Conflict Markers**: Never stage or commit files containing Git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`, `|||||||`). Always resolve conflicts cleanly before committing.

## Completeness & Verification Directives
- **Explicit Parameter & Contract Validation**: When creating or modifying API endpoints (Express, Fastify, Rails, Laravel), always implement explicit parameter and request body validation schemas (e.g. `z.string().uuid()`) to prevent unhandled 404/500 fallthroughs.
- **Database Indexing for Queries**: When addressing query bottlenecks or adding query lookup filters, always implement native database index migrations rather than loading collections into memory and performing array filtering (`.filter()`, `.select`).
- **Co-Occurring Dependency Auditing**: When bumping any dependency version, verify that other transitive dependencies do not carry high/critical security advisories (e.g. run `bundler-audit`, `npm audit`). Never introduce a version bump that breaks underlying framework APIs.
- **Self-Verification Before Commit**: Always run syntax checks (`bash -n` for shell scripts, `tsc --noEmit` for TypeScript, linter checks) and targeted test runners locally before opening or updating a PR.

## Hallucinatory Task & Empty PR Directives
- **Zero-Diff Task Termination**: If the requested optimization, refactor, or fix is ALREADY natively present in the target branch, DO NOT create an empty pull request or commit an acknowledgment PR. Exit the task cleanly without opening a PR.
- **No Journal-Only PRs**: Never open a pull request that only contains updates to .jules/*.md files without corresponding functional code changes and tests.
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.

## Assertiveness, Decisive PR Execution & Comparative Recommendations
- **Proactive & Decisive PR Submission**: Do NOT repeatedly pause to ask permission to open a pull request (e.g., avoid "Would you like me to open a PR for this?", "Can I submit the PR?", "Should I go ahead and create the PR?"). When an optimization, fix, or feature satisfies requirements, passes local test runners/linters, and preserves architectural invariants, proceed decisively to create and submit the Pull Request with a clear, structured summary and rationale.
- **Explicit Recommendations on Options**: When presenting multiple implementation strategies or architecture options (e.g., Option A vs. Option B), NEVER leave the choice open-ended or passive. Always make an explicit, reasoned recommendation (prefixed with `(Recommended)`) based on **overall technical effectiveness**:
  1. *Algorithmic & Complexity Gains*: Time and space complexity impact (O(N*M) -> O(N+M), reduction of nested scans).
  2. *Resource Overhead*: Heap allocations, memory pressure, and GC pause reduction.
  3. *Domain & Architecture Invariants*: Strict backward compatibility, contract stability, and prevention of regression risks.
  4. *Security & Reliability*: Input validation, cryptographic safety, and concurrency safety.
- **Lead with Recommended Path**: State clearly why the recommended solution delivers the highest net value and immediately execute or propose it as the primary course of action rather than asking open-ended questions.

## Scope Verification, Minimal Churn & CI Protection Directives
- **Scope Verification Before Variable Binding**: When adding interactive states or accessibility attributes (e.g. `disabled={loading}`, `aria-busy={loading}`, `isSubmitting`), NEVER assume a variable identifier exists. Always inspect component props, local state hooks (`useState`), or declaration scope first. If not defined, declare the state hook or reuse an existing scope variable. Never introduce TS2304 / TS2552 ("Cannot find name") compile errors.
- **Surgical Edits Only (No Whole-File Formatting)**: Never run whole-file code formatters (Prettier, Black, Pint, rustfmt) across unmodified lines. Changes must be strictly range-scoped and limited to the minimal AST block needed. Avoid noisy quote/whitespace churn that masks real logic changes and causes merge conflicts. Verify with `git diff -w` that non-functional churn is zero.
- **Zero Scratch File Commits**: Never stage or commit ad-hoc verification, patch, or debug scripts (`test.cjs`, `fix_*.cjs`, `fix_*.php`, `patch_*.py`, `patch_*.sh`, `scratch_*`). Execute checks via the project's native test commands (`npm test`, `pytest`, `phpunit`, etc.) and delete temporary scripts before creating git commits.
- **Never Weaken CI Workflows**: Do not modify `.github/workflows/**` to bypass failures (e.g. adding `|| true`, setting `continue-on-error: true`, or commenting out assertions). Always resolve the defect in the source code or test fixture.
- **Explicit Parameter & Variable Types**: In TypeScript files, avoid implicit `any` by always providing explicit types on functions, parameters, and arrow callbacks (e.g. `(id: string) => ...`). Verify zero type errors with `tsc --noEmit` before committing.

## 2026-09-29 - Scope Verification for Async Loading Attributes
**Learning:** Blindly injecting `disabled={loading}` or `aria-busy={loading}` into JSX/TSX buttons causes fatal TypeScript compilation errors (`TS2304: Cannot find name 'loading'`) when `loading` is not declared in component props, state hooks (`useState`), or mutation results. Furthermore, using temporary patch scripts (`fix_*.cjs`) to manipulate source code pollutes the git index.
**Action:** Before referencing any state identifier (such as `loading`, `isSubmitting`, `isPending`) in `disabled` or `aria-busy`, inspect the component scope. If no loading state is tracked, define it using `useState(false)` or check existing query/mutation hooks. Never bind undeclared variables. Always run `tsc --noEmit` locally and never commit temporary fix scripts.

## 2026-10-01 - Missing aria-busy on Custom Async States
**Learning:** Found instances where custom loading states (e.g., `loadingSlotting`, `verifyingLedger`, `reconstructingState`, `replayingAudit`) were bound to the `disabled` property of buttons to prevent duplicate submission, but the corresponding `aria-busy` attribute was omitted. Without `aria-busy`, assistive technologies fail to notify users that an async background operation is currently processing, reducing context and interactivity feedback.
**Action:** When introducing or modifying custom async state hooks that control the interactivity of a submit or action button, ensure both `disabled` and `aria-busy` are bound to that specific state identifier.

## Additive Documentation & Scratch Cleanliness Directives
- **Strictly Additive Journal Updates**: When updating `.jules/*.md`, strictly append new dated entries (`## YYYY-MM-DD - Title`). NEVER delete, truncate, or overwrite historical learnings or previous entries.
- **Substantive Code Diff Requirement**: Pull requests must include substantive code changes in `src/`, `app/`, `lib/`, or `tests/`. Never open PRs that modify only `.jules/*.md` journals or root scratch scripts.
- **Zero Scratch File Commits**: Never commit `*.diff`, `*.patch`, `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `patch_*.py` files. Always remove temporary debugging or verification scripts prior to committing.
