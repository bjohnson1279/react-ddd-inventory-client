## 2024-05-18 - Auth Token Leaked in URL
**Vulnerability:** Sending auth tokens in URL query strings for SSE endpoints
**Learning:** SSE doesn't support custom headers easily, so it's a common anti-pattern to send tokens in URL parameters where they are logged in access logs, proxies, and browser history.
**Prevention:** Use a secure token exchange mechanism, like setting a secure HttpOnly cookie or using short-lived ticket endpoints specifically for SSE.

## 2025-02-14 - Removed hardcoded passwords in API adapters
**Vulnerability:** API adapters for Express and Laravel used hardcoded default passwords (`Password123!` and `SecurePassword123`) as fallbacks during login if a password was not provided, allowing potential authentication bypass or reliance on easily guessed defaults.
**Learning:** Hardcoded fallback credentials can inadvertently allow empty passwords to authenticate via known default values, particularly when reused during auto-setup blocks in E2E environments.
**Prevention:** Always throw an error if required authentication secrets like passwords are not provided, instead of using fallbacks. Validate parameters early.

## 2025-02-15 - Removed hardcoded API key in UI component
**Vulnerability:** A UI component (`LogisticsErpPanel.tsx`) initialized an `apiKey` state with a hardcoded mock value (`'mock-credential-secret'`) and displayed it in a plain text input field.
**Learning:** Hardcoded credentials in UI components are not only a security risk if the codebase is exposed, but they also encourage bad practices and could be inadvertently submitted if the user doesn't realize it's a mock value. Using a standard text input for API keys allows shoulder-surfing or screen-sharing leaks.
**Prevention:** Always initialize sensitive inputs to empty strings, forcing explicit user action. Use `type="password"` for any input field collecting tokens, API keys, or secrets to mask the input.

## 2026-08-05 - Auth Token Leaked in URL
**Vulnerability:** Sending auth tokens in URL query strings for SSE endpoints via `EventSource`.
**Learning:** SSE natively doesn't support custom headers easily, so it's a common anti-pattern to send tokens in URL parameters where they are logged in access logs, proxies, and browser history.
**Prevention:** Use a `fetch`-based stream reader with `Accept: text/event-stream` and an `Authorization` header to secure the token and read the event stream securely instead of using `EventSource`.

## 2025-02-28 - Replaced Math.random() with crypto.randomUUID()
**Vulnerability:** Weak random ID generation using `Math.random().toString(36).substring(7)` and `Math.floor(1000 + Math.random() * 9000)` in React components and ERP hooks.
**Learning:** `Math.random()` is not cryptographically secure and predictable. Generating IDs or tracking tokens using `Math.random()` can lead to collisions or ID-guessing attacks, even in optimistic state updates.
**Prevention:** Always use `crypto.randomUUID()` when generating unique identifiers or tokens on the client-side, avoiding `Math.random()`.
## 2024-05-24 - Hardcoded Auth Tokens
**Vulnerability:** Found hardcoded test tokens (`Bearer test-token`) being used in API requests in `src/components/ApprovalWorkflowPanel.tsx` and `src/components/ApprovalInboxPanel.tsx`.
**Learning:** Hardcoded secrets and tokens, even if intended for testing, can be easily leaked or merged into production, exposing the application to unauthorized access.
**Prevention:** Always retrieve authentication tokens dynamically from secure storage (e.g., `localStorage.getItem("auth_token")`) instead of hardcoding them into the components.
## 2026-08-25 - Insecure Target Attribute Fix
**Vulnerability:** The application contained an anchor tag with `target="_blank"` but lacking `noopener` in its `rel` attribute, which could allow a newly opened tab to potentially execute malicious JavaScript against the originating page via `window.opener`.
**Learning:** Always use `noopener` in combination with `noreferrer` when using `target="_blank"` to prevent tabnabbing attacks.
**Prevention:** Ensure `rel="noopener noreferrer"` is added whenever `target="_blank"` is used in anchor tags.
## 2025-02-28 - Auth Token Leaked in WebSocket URL
**Vulnerability:** Sending auth tokens in URL query strings for native WebSocket endpoints or leaving WebSocket connections entirely unauthenticated.
**Learning:** Native `WebSocket` API does not support custom headers, making it tempting to pass tokens via query parameters (which leaks them in logs and history) or via the `protocols` array (which fails if the server doesn't negotiate it).
**Prevention:** To securely authenticate native WebSockets in this project, send a JSON message containing the token (e.g., `JSON.stringify({ type: 'authenticate', token: activeToken })`) immediately within the WebSocket's `onopen` event handler, avoiding token leakage in URL query strings.
## 2026-08-31 - Password Validation Missing in API Adapters
**Vulnerability:** Missing explicit password validation in API adapters (like GraphQL) could allow authentication bypass via missing or empty passwords.
**Learning:** API adapters must explicitly validate and demand authentication secrets, rather than passing them optionally or failing silently, especially in dynamic environments where parameter omission might occur.
**Prevention:** Always use an explicit guard clause (e.g., `if (!password) throw new Error(...)`) at the beginning of authentication adapter functions to strictly enforce credential requirements.
## 2026-08-31 - Redundant WebSocket Token Payload Initialization
**Vulnerability:** Hardcoded tokens or overwritten authentication assignment callbacks missing validation (`readyState === WebSocket.OPEN`) when dealing with `onopen`.
**Learning:** Duplicate assignments to the same event handler property (`ws.onopen`) overwrite previous logic, potentially overriding important authentication closures, bypassing explicit checks or falling back to undesired behavior. Sending tokens before the socket is explicitly verified as OPEN can fail silently.
**Prevention:** Always combine multiple setup logic pieces into a single explicit assignment for standard DOM handlers (e.g., `onopen`), and defensively check `readyState` before emitting messages over the socket to prevent unexpected unready state errors.

## Prevention Directives for Automated Refactoring
- **Never Overwrite Complete Files**: Always use range-scoped replacement chunks (`StartLine`/`EndLine`) for edits to `schema.prisma`, `index.ts`, `public/index.php`, or DDL SQL scripts.
- **Do Not Remove Core Declarations**: Do not delete existing route registrations or database DDL tables.
- **Environment Isolation Compatibility**: When replacing fallback secrets, preserve test environment execution via `!getenv('APP_ENV')` or `getenv('APP_ENV') === 'testing'`.
- **No Scratch Files**: Never stage or commit `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `test.js` files to git.
- **No Unresolved Conflict Markers**: Never stage or commit files containing Git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`, `|||||||`). Always resolve conflicts cleanly before committing.

## Hallucinatory Task & Empty PR Directives
- **Zero-Diff Task Termination**: If the requested optimization, refactor, or fix is ALREADY natively present in the target branch, DO NOT create an empty pull request or commit an acknowledgment PR. Exit the task cleanly without opening a PR.
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.


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
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.
## 2023-10-27 - Security Headers missing from Nginx Server Block
**Vulnerability:** Standard NGINX configurations generated or used for static site serving often miss basic security headers.
**Learning:** These headers are not injected by Vite or the React application layer by default, leaving them missing entirely unless explicitly added to the proxy configuration.
**Prevention:** Include a standard block of security headers in all Nginx webserver templates going forward.
## 2025-02-27 - Fix WebSocket URL Injection Vulnerability
**Vulnerability:** Unencoded `tenantId` parameters in WebSocket connection URLs could allow URL injection or manipulation.
**Learning:** String interpolation for URLs using untrusted or dynamic parameters without encoding is a common source of injection risks.
**Prevention:** Always use `encodeURIComponent` when embedding dynamic variables as query parameters in URLs.
## 2025-02-28 - Avoid Security Theater on Dummy Links
**Vulnerability:** Attempted to add `rel="noopener noreferrer"` to a dummy placeholder link (`href="#"`) and incorrectly modified it to a dummy external URL.
**Learning:** Forcing a fix on an invalid target (e.g. `href="#"`) or modifying the link's behavior to make it fit a security narrative creates a functional UX regression and represents "security theater."
**Prevention:** Only apply targeted security fixes to legitimate, applicable targets. If none exist, implement a completely different, valid security enhancement rather than modifying intended functionality.

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

## 2026-09-29 - Non-Destructive Security Patching & CI Protection
**Learning:** Security patches must never weaken CI workflow files (`.github/workflows/**`) by appending `|| true` or `continue-on-error: true` to suppress test/build failures. Furthermore, when adding defensive type assertions or input validators in TypeScript, omitting explicit types can introduce `TS7006: Parameter implicitly has an 'any' type`.
**Action:** Never modify CI workflow definitions to bypass test failures; resolve the underlying issue in source code or test fixtures. Always provide explicit types on newly introduced parameters and helper functions. Ensure zero scratch scripts (`fix_*.php`, `test_*.js`) are committed.
## 2026-10-15 - Unbiased Secure Random Generation
**Vulnerability:** Biased distribution of random numbers when applying modulo or division to `window.crypto.getRandomValues()` output.
**Learning:** Using raw division or modulo on crypto random numbers introduces a slight distribution bias because the range of `Uint32` is rarely perfectly divisible by arbitrary numbers, triggering CodeQL security warnings.
**Prevention:** Use a rejection sampling loop (e.g. `do { ... } while(val >= maxValid)`) to discard values in the remainder range, guaranteeing perfectly unbiased selection within target bounds.

## Additive Documentation & Scratch Cleanliness Directives
- **Strictly Additive Journal Updates**: When updating `.jules/*.md`, strictly append new dated entries (`## YYYY-MM-DD - Title`). NEVER delete, truncate, or overwrite historical learnings or previous entries.
- **Substantive Code Diff Requirement**: Pull requests must include substantive code changes in `src/`, `app/`, `lib/`, or `tests/`. Never open PRs that modify only `.jules/*.md` journals or root scratch scripts.
- **Zero Scratch File Commits**: Never commit `*.diff`, `*.patch`, `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `patch_*.py` files. Always remove temporary debugging or verification scripts prior to committing.

## Scope Quarantine, Journaling & Security Test Invariants
- **Strictly Append-Only Journaling**: When adding learnings to `.jules/*.md`, append strictly at the end of the file. Do not rewrite, deduplicate, or remove lines beginning with `## YYYY-MM-DD`.
- **Surgical Scope Quarantine**: Modify only the files directly involved in the issue and their corresponding test fixtures. Do not delete, rename, or perform drive-by cleanups of unrelated root-level scripts or legacy files.
- **Coupled Test Fixture Awareness for Security Invariants**: When changing fail-open fallback behavior (such as hardening decryption to fail closed), always update upstream test mocks that rely on plaintext credentials or mock values.

## 2024-05-24 - API Token Auto-fill Prevention
**Vulnerability:** Password inputs for sensitive API tokens used `autoComplete="off"`, which modern browsers and password managers often ignore.
**Learning:** This can lead to them auto-filling user login passwords into API token fields, or incorrectly prompting to save API tokens as user passwords, leaking secrets or confusing users.
**Prevention:** Use `autoComplete="new-password"` for sensitive API token inputs (that are not user login passwords) to reliably disable password manager interference.

## 2025-05-18 - Fix Hardcoded Unauthenticated GraphQL Calls in CVGatewayDashboard
**Vulnerability:** Unauthenticated API call in CVGatewayDashboard allowing missing authorization in GraphQL mutation fetches.
**Learning:** Fetch requests in frontend components targeting sensitive GraphQL operations must read and attach the user's `auth_token` from `localStorage` in the `Authorization` header.
**Prevention:** Standardize request options in UI components to consistently include `Authorization: Bearer ${activeToken}` for all authenticated backend endpoints.
