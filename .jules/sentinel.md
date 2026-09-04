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
